// Explicit disposable-agent verification; never run automatically.
import { readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
const [parent, child, pidText] = process.argv.slice(2);
if (!parent || !child || !/^\d+$/.test(pidText ?? '')) throw Error('Usage: node verify-live.mjs <parent> <disposable-child> <pid>');
const pid = Number(pidText);
const environment = (await readFile(`/proc/${pid}/environ`, 'utf8')).split('\0');
assert.ok(environment.includes(`PASEO_AGENT_ID=${child}`), 'PID must belong to the disposable child');
const root = `/home/node/.pi/agent/supervision/state/${parent}`;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const state = async () => JSON.parse(await readFile(`${root}/status.json`, 'utf8'));
const waitFor = async (predicate, timeout) => {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) { const value = await state(); if (predicate(value)) return value; await sleep(500); }
  throw Error('Expected observable state did not occur before the test deadline');
};
const initial = await state();
assert.equal(initial.active, 0, 'Initial monitor must have no active children');
assert.equal(initial.polling, false, 'Initial monitor must not poll');
console.log('Initial state: listener connected, polling stopped, disposable child idle.');
console.log('Actions: start a no-tool output run; pause only the verified child PID; observe advisory; restore child; cancel test run.');
console.log('Expected: polling restarts; >=30s output silence with no tool produces advice; monitor never cancels; polling stops after explicit cancellation.');
console.log('Failure: missing advice, advice before 30s, active tool, monitor cancellation, or polling remains active after completion.');
const send = spawnSync('paseo', ['send', child, '--no-wait', '--json',
  'Approved disposable monitor verification. Do not use tools, edit files, or delegate. Output 1000 numbered short arithmetic facts. A controlled pause will test stream silence.'], { encoding: 'utf8' });
assert.equal(send.status, 0, 'Test prompt must be accepted');
await waitFor(s => s.states?.some(c => c.id === child && c.lastOutputAt !== null && c.tools.length === 0), 45_000);
let paused = false;
try {
  process.kill(pid, 'SIGSTOP'); paused = true;
  const pausedAt = Date.now();
  const advisoryState = await waitFor(s => s.pending && s.states?.some(c => c.id === child && c.suspectedStall), 50_000);
  const observed = advisoryState.states.find(c => c.id === child);
  assert.equal(observed.status, 'running');
  assert.equal(observed.observation, 'healthy');
  assert.equal(observed.tools.length, 0);
  assert.ok(observed.silenceMs >= 30_000);
  const advice = JSON.parse(await readFile(`${root}/advice.json`, 'utf8'));
  assert.ok(advice.reasons.some(reason => reason.child === child && reason.reason === 'suspected-stall'));
  console.log('Actual evidence:', JSON.stringify({ pausedAt, monitorPid: advisoryState.pid, polling: advisoryState.polling,
    child: observed.id, turnId: observed.turnId, status: observed.status, silenceMs: observed.silenceMs,
    activeTools: observed.tools.length, reportId: advice.id }));
  await writeFile(`${root}/live-verification.json`, JSON.stringify({ passed: true, at: Date.now(), observed, reportId: advice.id }), { mode: 0o600 });
} finally {
  if (paused) process.kill(pid, 'SIGCONT');
  const stop = spawnSync('paseo', ['stop', child, '--json'], { encoding: 'utf8', timeout: 20_000 });
  assert.equal(stop.status, 0, 'Explicit test cancellation must succeed');
}
await waitFor(s => s.active === 0 && s.polling === false && s.pending === null, 25_000);
console.log('Restoration evidence: child resumed; main test operator cancelled its run; active checks stopped; listener remains connected.');
