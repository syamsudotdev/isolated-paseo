import test from 'node:test';
import assert from 'node:assert/strict';
import { assess, advisoryDue } from './policy.mjs';

const start = 1_000_000;
const agent = { id: 'child', status: 'running', activeTurn: { turnId: 'run-1', startedAt: new Date(start).toISOString() }, pendingPermissions: [] };
const row = (seconds, item, turnId = 'run-1') => ({ timestamp: new Date(start + seconds * 1000).toISOString(), item, turnId });
// Fixed requirements, not production-derived expected values. Each case names its fault.
const cases = [
  ['first-output timeout at 30s; exposes missing startup timeout', agent, [], 30, true, true],
  ['29.999s is not due; exposes early advice', agent, [], 29.999, true, false],
  ['text output resets silence; exposes ignored text chunks', agent, [row(20, { type: 'assistant_message', text: 'x' })], 40, true, false],
  ['thinking resets silence; exposes ignored reasoning chunks', agent, [row(20, { type: 'reasoning', text: 'x' })], 40, true, false],
  ['30s after a chunk is due; exposes timer based only on startup', agent, [row(20, { type: 'assistant_message', text: 'x' })], 50, true, true],
  ['running tool blocks advice; exposes cancellation during tools', agent, [row(5, { type: 'tool_call', callId: 'a', status: 'running' })], 50, true, false],
  ['completed tool does not block advice; exposes sticky tool state', agent, [row(5, { type: 'tool_call', callId: 'a', status: 'running' }), row(10, { type: 'tool_call', callId: 'a', status: 'completed' })], 50, true, true],
  ['permission blocks advice; exposes cancellation of permission wait', { ...agent, pendingPermissions: [{ id: 'p' }] }, [], 50, true, false],
  ['idle blocks advice; exposes cancellation of finished run', { ...agent, status: 'idle' }, [], 50, true, false],
  ['observation gap blocks advice; exposes false stall after disconnect', agent, [], 50, false, false],
  ['old turn output cannot reset new run; exposes cross-run leakage', agent, [row(20, { type: 'assistant_message', text: 'x' }, 'old')], 40, true, true],
  ['missing start is Unknown; exposes fabricated timeout', { ...agent, activeTurn: { turnId: 'run-1', startedAt: null } }, [], 50, true, false],
];
for (const [name, snapshot, entries, seconds, complete, expected] of cases) {
  test(name, () => assert.equal(assess(snapshot, entries, start + seconds * 1000, complete).suspectedStall, expected));
}
test('same silence episode is advised once; exposes repeated advisory flooding', () => {
  const state = { id: 'child', turnId: 'run-1', status: 'running', observation: 'healthy', startedAt: start, lastOutputAt: null, suspectedStall: true };
  assert.equal(advisoryDue(state, start + 40_000, { stallAnchor: start, reviewAt: start + 30_000 }), null);
});
test('role metadata is carried unchanged; exposes missing or invented specialist identity', () => {
  const state = assess({ ...agent, provider: 'pi', title: 'Reviewer — bounded audit',
    labels: { 'paseo.role': 'reviewer' }, model: 'configured-model',
    runtimeInfo: { model: 'effective-model' } }, [], start + 30_000);
  assert.deepEqual({ role: state.role, title: state.title, agent: state.agent, model: state.model },
    { role: 'reviewer', title: 'Reviewer — bounded audit', agent: 'pi', model: 'effective-model' });
  const unknown = assess(agent, [], start + 30_000);
  assert.deepEqual([unknown.role, unknown.title, unknown.agent, unknown.model],
    ['Unknown', 'Unknown', 'Unknown', 'Unknown']);
});
test('legacy-only role metadata is Unknown; exposes legacy label fallback', () => {
  const legacyOnly = { id: 'legacy-child', labels: { 'paseo-slim.role': 'reviewer' } };
  assert.equal(assess(legacyOnly, [], start).role, 'Unknown');
});
test('direction review at three minutes; exposes absent periodic review', () => {
  const state = { id: 'child', turnId: 'run-1', status: 'running', observation: 'healthy', startedAt: start, suspectedStall: false };
  assert.equal(advisoryDue(state, start + 180_000)?.reason, 'direction-review');
});
