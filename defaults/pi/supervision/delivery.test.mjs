import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const appRoot = process.env.APP_ROOT ?? '/opt/toolchain/apps';
const { createJiti } = await import(pathToFileURL(join(appRoot, 'node_modules/jiti/lib/jiti.mjs')).href);

const parent = '9567cb97-9b5a-43bf-b2af-41fb0e5b5a7e';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function fixture(idle, fault = '') {
  const home = await mkdtemp(join(tmpdir(), 'supervision-delivery-'));
  const state = join(home, 'state', parent);
  await mkdir(state, { recursive: true });
  let source = await readFile(new URL('../extensions/paseo-supervision.ts', import.meta.url), 'utf8');
  source = source.replace("const HOME = '/home/node/.pi/agent/supervision';", `const HOME = ${JSON.stringify(home)};`)
    .replace(/const child = spawn\([\s\S]*?\n      \}\);/, 'const child = { on() {}, unref() {} };')
    .replace('setInterval(() => void check(), 1000)', 'setInterval(() => void check(), 10)');
  if (fault === 'delivery') source = source.replace("ctx.isIdle() ? 'followUp' : 'steer'", "ctx.isIdle() ? 'steer' : 'followUp'");
  if (fault === 'expiry') source = source.replace('report.expiresAt <= Date.now()', 'false');
  if (fault === 'ack') source = source.replace('if (ack?.id === report.id) return;', 'if (false) return;');
  await writeFile(join(home, 'extension.ts'), source);
  const extension = await createJiti(import.meta.url, { moduleCache: false }).import(join(home, 'extension.ts'), { default: true });
  const handlers = new Map();
  const sent = [];
  const pi = { on: (event, handler) => handlers.set(event, handler), sendMessage: (message, options) => sent.push({ message, options }) };
  process.env.PASEO_AGENT_ID = parent;
  extension(pi);
  const report = { version: 1, parent, id: 'fixed-report', expiresAt: Date.now() + 10_000, states: [], instruction: 'Inspect evidence.' };
  return { state, handlers, sent, report,
    start: async () => { await handlers.get('session_start')({}, { isIdle: () => idle, hasUI: false, ui: { notify() {} } }); await sleep(40); },
    close: async () => { handlers.get('session_shutdown')?.(); await sleep(20); await rm(home, { recursive: true, force: true }); } };
}
const fault = process.env.SUPERVISION_TEST_FAULT ?? '';
for (const idle of [false, true]) {
  test(`${idle ? 'idle delivery starts follow-up' : 'running delivery steers'}; exposes unsafe delivery mode`, async () => {
    const f = await fixture(idle, fault);
    try {
      await writeFile(join(f.state, 'advice.json'), JSON.stringify(f.report));
      await f.start();
      assert.equal(f.sent.length, 1);
      assert.equal(f.sent[0].options.deliverAs, idle ? 'followUp' : 'steer');
      await sleep(30);
      assert.equal(f.sent.length, 1);
    } finally { await f.close(); }
  });
}
test('expired report is withheld; exposes stale delivery after observer failure', async () => {
  const f = await fixture(false, fault);
  try { await writeFile(join(f.state, 'advice.json'), JSON.stringify({ ...f.report, expiresAt: 1 })); await f.start(); assert.equal(f.sent.length, 0); }
  finally { await f.close(); }
});
test('consumption is acknowledged and not redelivered; exposes advisory flooding', async () => {
  const f = await fixture(false, fault);
  try {
    await writeFile(join(f.state, 'advice.json'), JSON.stringify(f.report)); await f.start();
    assert.equal(f.sent.length, 1);
    await f.handlers.get('message_start')({ message: { role: 'custom', customType: 'paseo-supervision-advice', details: { reportId: f.report.id } } });
    assert.equal(JSON.parse(await readFile(join(f.state, 'ack.json'), 'utf8')).id, f.report.id);
    await sleep(40); assert.equal(f.sent.length, 1);
  } finally { await f.close(); }
});
