import { mkdir, readFile, writeFile, rename, rm } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { DaemonClient } from '/opt/toolchain/apps/node_modules/@getpaseo/client/dist/daemon-client.js';
import { assess, advisoryDue, POLL_MS } from './policy.mjs';

const parent = process.argv[2];
if (!/^[a-zA-Z0-9-]+$/.test(parent ?? '')) throw new Error('A parent agent ID is required.');
const root = join(dirname(fileURLToPath(import.meta.url)), 'state', parent);
await mkdir(root, { recursive: true, mode: 0o700 });
const lock = join(root, 'lock');
try { await mkdir(lock, { mode: 0o700 }); }
catch (error) {
  if (error.code !== 'EEXIST') throw error;
  const pid = Number(await readFile(join(lock, 'pid'), 'utf8').catch(() => '0'));
  if (pid > 0) { try { process.kill(pid, 0); process.exit(0); } catch (e) { if (e.code !== 'ESRCH') throw e; } }
  // An incomplete lock can belong to a starting process. Do not steal it.
  if (!pid) process.exit(0);
  await rm(lock, { recursive: true });
  await mkdir(lock, { mode: 0o700 });
}
await writeFile(join(lock, 'pid'), String(process.pid), { mode: 0o600 });
const atomic = async (name, value) => {
  const temporary = join(root, `${name}.${process.pid}.${randomUUID()}.tmp`);
  await writeFile(temporary, JSON.stringify(value), { mode: 0o600 });
  await rename(temporary, join(root, name));
};
const load = async name => JSON.parse(await readFile(join(root, name), 'utf8'));
const version = JSON.parse(await readFile('/opt/toolchain/apps/node_modules/@getpaseo/client/package.json', 'utf8')).version;
if (version !== '0.10.3') throw new Error('Monitor requires the inspected Paseo client version 0.10.3.');
const client = new DaemonClient({ url: 'ws://127.0.0.1:6767/ws',
  clientId: `supervision-${parent}`, clientType: 'cli', password: process.env.PASEO_PASSWORD,
  reconnect: { enabled: true }, logger: { debug() {}, info() {}, warn() {}, error() {} } });
const children = new Map();
const previous = new Map();
let pending = null;
let interval;
let busy = false;
let shuttingDown = false;
let discoveryTimer;
let observation;
let failures = 0;
let connected = false;
let latestStates = [];
const log = message => console.log(`${new Date().toISOString()} ${message}`);
const stateFile = async () => atomic('status.json', { version: 1, parent, pid: process.pid,
  connected, active: children.size, polling: Boolean(interval), failures,
  pending: pending?.id ?? null, states: latestStates.map(({ recent, ...state }) => state), updatedAt: Date.now() });

function startPolling() {
  if (interval || !children.size) return;
  interval = setInterval(() => void tick(), POLL_MS);
  log('Active checks started.');
  void tick();
}
async function stopPolling() {
  if (children.size) return;
  clearInterval(interval); interval = undefined;
  pending = null;
  latestStates = [];
  await rm(join(root, 'advice.json'), { force: true });
  await stateFile();
}
function watch(agent) {
  if (children.has(agent.id) || agent.status !== 'running') return;
  const child = { id: agent.id, lastLiveAt: null, subscription: null };
  children.set(agent.id, child);
  child.subscription = client.subscribeAgentTimeline(agent.id, message => {
    if (message.type === 'agent.timeline.error') { child.ready = false; return; }
    if (message.type === 'agent.timeline.subscription_restored' || message.type === 'agent.timeline.replacement') {
      child.lastLiveAt = null; child.ready = true; return;
    }
    const event = message.payload?.event;
    const item = event?.type === 'timeline' ? event.item : null;
    if (item && ['assistant_message', 'reasoning'].includes(item.type) && item.text?.length) {
      child.lastLiveAt = { turnId: event.turnId, at: Date.now() };
    }
  });
  void child.subscription.ready.then(() => { child.ready = true; }).catch(() => { child.ready = false; });
  startPolling();
}
async function discover() {
  if (shuttingDown || !connected) return;
  try {
    let cursor;
    const seen = new Set();
    do {
      const result = await client.fetchAgents({ filter: { labels: { 'paseo.parent-agent-id': parent } },
        page: { limit: 100, ...(cursor ? { cursor } : {}) } });
      for (const entry of result.entries) watch(entry.agent);
      cursor = result.pageInfo?.hasMore ? result.pageInfo.nextCursor : null;
      if (cursor && seen.has(cursor)) throw new Error('Repeated discovery cursor');
      if (cursor) seen.add(cursor);
    } while (cursor);
  } catch { log('Child discovery failed; observation is Unknown.'); }
}
function scheduleDiscovery() {
  if (discoveryTimer) return;
  discoveryTimer = setTimeout(() => { discoveryTimer = undefined; void discover(); }, 250);
}
async function tick() {
  if (busy || shuttingDown) return;
  busy = true;
  try {
    if (!connected) { await stateFile(); return; }
    const now = Date.now();
    const states = [];
    for (const [id, child] of children) {
      try {
        const response = await client.fetchAgentTimeline(id, { limit: 1000, timeout: 5000 });
        const agent = response.agent;
        if (!agent || agent.labels?.['paseo.parent-agent-id'] !== parent) {
          child.subscription?.(); children.delete(id); continue;
        }
        if (['idle', 'error', 'closed'].includes(agent.status) && !agent.activeTurn && agent.pendingPermissions.length === 0) {
          child.subscription?.(); children.delete(id); continue;
        }
        const rows = [...response.entries].sort((a, b) => a.seqStart - b.seqStart);
        const complete = !response.hasOlder || rows.some(row => row.turnId && row.turnId !== agent.activeTurn?.turnId);
        const state = assess(agent, rows, now, complete && child.ready !== false);
        if (child.lastLiveAt?.turnId === state.turnId && child.lastLiveAt.at > (state.lastOutputAt ?? 0)) {
          state.lastOutputAt = child.lastLiveAt.at;
          state.silenceMs = Math.max(0, now - state.lastOutputAt);
          state.suspectedStall = state.suspectedStall && state.silenceMs >= 30_000;
        }
        states.push(state);
      } catch { states.push({ id, observation: 'Unknown', status: 'unknown' }); }
    }
    latestStates = states;
    if (!children.size) { await stopPolling(); return; }
    if (pending) {
      const ack = await load('ack.json').catch(() => null);
      if (ack?.id === pending.id) pending = null;
    }
    const due = states.flatMap(state => {
      const key = `${state.id}:${state.turnId}`;
      const decision = advisoryDue(state, now, previous.get(key));
      return decision ? [{ state, decision }] : [];
    });
    if (!pending && due.length) {
      pending = { id: randomUUID(), createdAt: now,
        reasons: due.map(({ state, decision }) => ({ child: state.id, turnId: state.turnId,
          reason: decision.reason, silenceMs: state.silenceMs, tools: state.tools.length })) };
      log(`Advisory queued: ${JSON.stringify(pending.reasons)}`);
      for (const { decision } of due) previous.set(decision.identity,
        { ...previous.get(decision.identity), reviewAt: now,
          ...(decision.stallAnchor !== undefined ? { stallAnchor: decision.stallAnchor } : {}) });
    }
    if (pending) {
      await atomic('advice.json', { version: 1, parent, ...pending, updatedAt: now,
        expiresAt: now + 25_000, states,
        instruction: 'Inspect recent child activity against the approved objective. Steer only when evidence shows off-course work. For running children with >=30 seconds of observed output silence, no active tool, and no permission wait, assess suspected stall and decide whether to cancel the CURRENT run. Recheck run identity before action. Unknown observation is not evidence of a stall. This monitor never steers or cancels children.' });
    } else await rm(join(root, 'advice.json'), { force: true });
    failures = 0;
    await stateFile();
  } catch {
    failures += 1;
    log('Monitor check failed; no new advisory was generated.');
    await rm(join(root, 'advice.json'), { force: true }).catch(() => {});
    if (failures >= 3) { clearInterval(interval); interval = undefined; log('Checks stopped after three failures. A new child launch can restart them.'); }
  } finally { busy = false; }
}
async function close() {
  if (shuttingDown) return;
  shuttingDown = true;
  clearInterval(interval); clearTimeout(discoveryTimer);
  for (const child of children.values()) child.subscription?.();
  await observation?.release().catch(() => {});
  await client.close();
  await rm(join(root, 'advice.json'), { force: true });
  await rm(lock, { recursive: true, force: true });
  process.exit(0);
}
process.on('SIGTERM', () => void close());
process.on('SIGINT', () => void close());
client.subscribeConnectionStatus(status => {
  connected = status.status === 'connected';
  if (!connected) {
    for (const child of children.values()) { child.ready = false; child.lastLiveAt = null; }
    void rm(join(root, 'advice.json'), { force: true }).catch(() => {});
  } else scheduleDiscovery();
  void stateFile().catch(() => {});
});
try {
  await client.connect();
  connected = true;
  observation = client.observeAgents({ filter: { labels: { 'paseo.parent-agent-id': parent } }, page: { limit: 100 } });
  observation.subscribe({ snapshot: result => { for (const entry of result.entries) watch(entry.agent); },
    update: scheduleDiscovery, error: () => { connected = false; log('Discovery observation failed.'); } });
  await observation.ready;
  await discover();
  await stateFile();
  log('Launch listener ready.');
} catch {
  log('Monitor startup failed.');
  await close();
}
