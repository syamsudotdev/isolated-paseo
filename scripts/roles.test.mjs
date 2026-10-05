import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp, mkdir, rm, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const read = path => readFile(join(root, path), 'utf8');
const image = 'sha256:751a72b7abe7ab3c42f52dda86fe4e0d47388930342e096e83024850b1e98bf1';
const fff = '/opt/toolchain/apps/node_modules/@ff-labs/pi-fff/src/index.ts';
const expectedRoles = [
  ['scout', 'openai/gpt-6-luna', 'low'],
  ['researcher', 'openai/gpt-6-luna', 'max'],
  ['worker', 'openai/gpt-6.1-sol', 'low'],
  ['reviewer', 'openai/gpt-6.1-sol', 'medium'],
  ['oracle', 'openai/gpt-6.1-sol', 'high'],
  ['worker-recovery', 'openai/gpt-6.1-sol', 'low'],
];
const hashes = {
  paseo: '2acef8bb200dd8fc84d99eb231c63cd8cdcf9d34df905ac4a24dd0fb11df0a0b',
  'paseo-handoff': '7e833acb4193ca7005a3eec2aa4571169ad962216e29ff9b0241ea0a419851f7',
  'paseo-advisor': '1fc60440869fea6fda35001b68ee7bf2334eb465bb44eacb0a340bc1fefe34aa',
  'paseo-committee': 'a9cd5572ca90ca7bdb9b55820d31a2811e621848dd327c2bf1c2dd34258b88e9',
};

// Detects edited official files, including local policy accidentally inserted upstream.
test('official skills match independent pinned release hashes', async () => {
  const provenance = JSON.parse(await read('defaults/paseo/provenance.json'));
  assert.equal(provenance.commit, 'b4af508e2a9e5a34a8b0ffb8dfaff6fd679da6c7');
  assert.equal(provenance.tag, 'v0.10.3');
  for (const [name, expected] of Object.entries(hashes)) {
    const actual = createHash('sha256').update(await read(`defaults/skills/${name}/SKILL.md`)).digest('hex');
    assert.equal(actual, expected, name);
    assert.equal(provenance.sha256[name], expected, name);
  }
});

// Detects wrong role settings, notes-only role binding, or exposed child management tools.
test('native profiles bind role instructions, skills, and explicit tool allowlists', async () => {
  const config = JSON.parse(await read('defaults/paseo/config.json'));
  assert.deepEqual(config.daemon.agentProfiles.map(p => [p.id, p.model, p.thinkingOptionId]), expectedRoles);
  for (const [role] of expectedRoles) {
    const profile = config.daemon.agentProfiles.find(p => p.id === role);
    assert.equal(profile.provider, `pi-${role}`);
    assert.equal(profile.systemPrompt, undefined);
    const provider = config.agents.providers[profile.provider];
    assert.equal(provider.extends, 'pi');
    const argv = provider.command;
    assert.equal(argv[0], 'pi');
    assert.ok(argv.includes('--no-extensions'));
    assert.ok(argv.includes(fff));
    assert.equal(argv[argv.indexOf('--fff-mode') + 1], 'tools-only');
    assert.match(argv[argv.indexOf('--append-system-prompt') + 1], new RegExp(`Assigned role: ${role}\\.`));
    const tools = argv[argv.indexOf('--tools') + 1].split(',');
    for (const tool of ['read', 'grep', 'find', 'ls', 'fffind', 'ffgrep']) assert.ok(tools.includes(tool), `${role}: ${tool}`);
    assert.ok(!tools.some(t => /paseo|create_agent|send_agent|update_agent|archive_agent|tool_search|codemode/.test(t)));
    if (role === 'worker' || role === 'worker-recovery') {
      assert.deepEqual(tools, ['read', 'grep', 'find', 'ls', 'fffind', 'ffgrep', 'edit', 'write', 'bash', 'lens_diagnostics', 'symbol_search', 'effective_config', 'project_report', 'module_report', 'read_symbol', 'read_enclosing', 'pi_lens_activate_tools', 'ast_grep_search', 'ast_grep_replace', 'ast_grep_outline', 'lsp_navigation', 'lens_diagnostic_mark']);
      assert.ok(argv.includes('/opt/toolchain/apps/node_modules/pi-lens/dist/index.js'));
      assert.ok(argv.includes('/home/node/.agents/skills/rtk'));
    } else {
      assert.deepEqual(tools, ['read', 'grep', 'find', 'ls', 'fffind', 'ffgrep']);
    }
    if (['reviewer', 'oracle', 'worker-recovery'].includes(role)) assert.ok(argv.includes('/home/node/.agents/skills/ponytail'));
    if (role === 'reviewer') assert.ok(argv.includes('/home/node/.agents/skills/code-review-pyramid'));
    assert.ok(!argv.includes('--no-skills'), 'Task and inherited skills remain discoverable');
  }
  const parent = config.agents.providers.pi.command;
  assert.ok(parent.includes(fff));
  assert.ok(!parent.includes('--no-extensions'), 'Preserve parent supervision discovery');
  assert.ok(parent.includes('/home/node/.pi/agent/roles/orchestrator.md'));
  const defaults = JSON.parse(await read('defaults/pi/settings.json'));
  assert.equal(defaults.defaultProvider, 'openai');
  assert.equal(defaults.defaultModel, 'gpt-6.1-sol');
  assert.equal(defaults.defaultThinkingLevel, 'medium');
});

// Detects dispatch without native role metadata, even when profiles remain correct.
test('dispatch contract requires native create_agent role labels', async () => {
  const contract = (await read('defaults/pi/roles/orchestrator.md')).split('## Native launch contract\n')[1]?.split('\n## ')[0];
  assert.match(contract, /When you call `create_agent`, set `labels` to `\{"paseo\.role":"<selected role>"\}`\./);
});

// Detects obsolete active routing and recreation of the removed template on fresh initialization.
test('fresh initialization omits the removed routing template and preserves custom files', async () => {
  await assert.rejects(stat(join(root, 'defaults/skills/paseo-slim')), { code: 'ENOENT' });
  for (const path of ['defaults/pi/roles/orchestrator.md', 'defaults/pi/roles/specialists.md']) assert.doesNotMatch(await read(path), /paseo-slim|paseo-loop/);
  const temp = await mkdtemp(join(tmpdir(), 'paseo-role-defaults-'));
  try {
    const agent = join(temp, 'agent');
    const skills = join(temp, 'skills');
    await mkdir(join(agent, 'roles'), { recursive: true });
    await mkdir(join(skills, 'paseo-slim'), { recursive: true });
    await writeFile(join(agent, 'settings.json'), 'custom settings\n');
    await writeFile(join(agent, 'roles/specialists.md'), 'custom roles\n');
    await writeFile(join(skills, 'paseo-slim/SKILL.md'), 'custom runtime skill\n');
    const env = { ...process.env, HOME: join(temp, 'home'), PASEO_HOME: join(temp, 'paseo'), DEFAULTS_DIR: join(root, 'defaults'), PI_AGENT_DIR: agent, SKILLS_DIR: skills, GRADLE_DIR: join(temp, 'gradle') };
    execFileSync('bash', [join(root, 'scripts/init-defaults.sh')], { env });
    assert.equal(await readFile(join(agent, 'settings.json'), 'utf8'), 'custom settings\n');
    assert.equal(await readFile(join(agent, 'roles/specialists.md'), 'utf8'), 'custom roles\n');
    assert.equal(await readFile(join(skills, 'paseo-slim/SKILL.md'), 'utf8'), 'custom runtime skill\n');
    await rm(join(skills, 'paseo-slim'), { recursive: true });
    execFileSync('bash', [join(root, 'scripts/init-defaults.sh')], { env });
    await assert.rejects(stat(join(skills, 'paseo-slim')), { code: 'ENOENT' });
    for (const name of [...Object.keys(hashes), 'rtk', 'code-review-pyramid']) await stat(join(skills, name, 'SKILL.md'));
    await assert.rejects(stat(join(temp, 'paseo/config.json')), { code: 'ENOENT' }, 'Paseo configuration requires explicit migration');
  } finally { await rm(temp, { recursive: true, force: true }); }
});

const probeExtension = `
import { writeFileSync } from 'node:fs';
import { Type } from '@sinclair/typebox';
export default function(pi) {
  pi.registerTool({ name: 'create_agent', label: 'Forbidden fixture', description: 'Test-only forbidden tool', parameters: Type.Object({}), execute: async () => { throw new Error('Forbidden tool executed'); } });
  pi.on('session_start', async (_event, ctx) => {
    const initial = pi.getActiveTools();
    pi.setActiveTools([...initial, 'create_agent', 'bash', 'write']);
    writeFileSync(process.env.ROLE_REPORT, JSON.stringify({ initial, attempted: pi.getActiveTools(), registered: pi.getAllTools().map(t => t.name), systemPrompt: ctx.getSystemPrompt() }));
    ctx.shutdown();
  });
}
`;

const runtimeDriver = `
import assert from 'node:assert/strict';
import { readFileSync, mkdirSync, copyFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { runToolCall } from '/opt/toolchain/apps/node_modules/@earendil-works/pi-agent-core/dist/index.js';
import { createAgentSession, DefaultResourceLoader, SessionManager, SettingsManager } from '/opt/toolchain/apps/node_modules/@earendil-works/pi-coding-agent/dist/index.js';
import { AgentProfileSchema } from '/opt/toolchain/apps/node_modules/@getpaseo/protocol/dist/agent-profile.js';
import { ProviderOverridesSchema } from '/opt/toolchain/apps/node_modules/@getpaseo/protocol/dist/provider-config.js';
import { buildPiLaunch } from '/opt/toolchain/apps/node_modules/@getpaseo/server/dist/server/server/agent/providers/pi/runtime.js';
const config = JSON.parse(readFileSync('/defaults/paseo/config.json', 'utf8'));
ProviderOverridesSchema.parse(config.agents.providers);
for (const p of config.daemon.agentProfiles) AgentProfileSchema.parse(p);
for (const role of ['parent', 'scout', 'researcher', 'worker', 'reviewer', 'oracle', 'worker-recovery']) {
  const profile = config.daemon.agentProfiles.find(p => p.id === role);
  const command = config.agents.providers[profile?.provider ?? 'pi'].command;
  const launch = buildPiLaunch({ command, session: { cwd: '/fixture/project', model: profile?.model, thinkingOptionId: profile?.thinkingOptionId, noSession: true } });
  const report = '/state/' + role + '.json';
  const result = spawnSync('/opt/toolchain/apps/node_modules/.bin/pi', [...launch.argv.slice(1), '--offline', '--no-approve', '--extension', '/fixture/probe.ts'], { cwd: '/fixture/project', env: { ...process.env, ROLE_REPORT: report, PI_CODING_AGENT_DIR: '/state/agent-' + role }, encoding: 'utf8', input: '', timeout: 60000 });
  assert.equal(result.status, 0, role + ': ' + result.stdout + result.stderr);
  const data = JSON.parse(readFileSync(report, 'utf8'));
  for (const tool of ['fffind', 'ffgrep']) assert.ok(data.initial.includes(tool), role + ': missing ' + tool);
  if (profile) {
    assert.match(data.systemPrompt, new RegExp('Assigned role: ' + role));
    assert.ok(!data.initial.includes('create_agent'), role);
    assert.ok(!data.attempted.includes('create_agent'), role + ': forbidden activation');
    assert.ok(!data.registered.includes('create_agent'), role + ': forbidden registry');
    if (!['worker', 'worker-recovery'].includes(role)) {
      for (const tool of ['bash', 'write', 'edit']) assert.ok(!data.attempted.includes(tool), role + ': forbidden ' + tool);
    } else {
      for (const tool of ['bash', 'write', 'edit', 'lens_diagnostics']) assert.ok(data.initial.includes(tool), role + ': missing ' + tool);
      for (const carrier of ['lens_diagnostics', 'ast_grep_search', 'pi_lens_activate_tools']) assert.ok(data.registered.includes(carrier), role + ': missing consolidated carrier ' + carrier);
    }
  }
  console.log(role + ': native launch FFF present; ' + (profile ? 'forbidden activation rejected' : 'parent discovery retained'));
}
// Derive every SDK loadout from the exact native writer command, not a separate test toolset.
const flagValues = (argv, flag) => argv.flatMap((value, index) => value === flag ? [argv[index + 1]] : []);
const text = result => result.content.filter(c => c.type === 'text').map(c => c.text).join('\\n');
async function writerSession(role, omitted) {
  const profile = config.daemon.agentProfiles.find(p => p.id === role);
  const command = config.agents.providers[profile.provider].command;
  const launch = buildPiLaunch({ command, session: { model: profile.model, thinkingOptionId: profile.thinkingOptionId, noSession: true } });
  const cwd = '/state/home/' + role + '-' + (omitted ?? 'restored');
  const agentDir = cwd + '/agent';
  mkdirSync(agentDir, { recursive: true });
  for (const file of ['needle.txt', 'fixture.ts', 'tsconfig.json']) copyFileSync('/fixture/project/' + file, cwd + '/' + file);
  const settingsManager = SettingsManager.create(cwd, agentDir);
  const loader = new DefaultResourceLoader({ cwd, agentDir, settingsManager, noExtensions: launch.argv.includes('--no-extensions'), additionalExtensionPaths: flagValues(launch.argv, '--extension'), additionalSkillPaths: flagValues(launch.argv, '--skill'), appendSystemPrompt: flagValues(launch.argv, '--append-system-prompt') });
  await loader.reload();
  const tools = flagValues(launch.argv, '--tools')[0].split(',').filter(name => name !== omitted);
  const { session, extensionsResult } = await createAgentSession({ cwd, agentDir, settingsManager, resourceLoader: loader, sessionManager: SessionManager.inMemory(), tools });
  const fffMode = flagValues(launch.argv, '--fff-mode')[0];
  assert.equal(fffMode, 'tools-only');
  extensionsResult.runtime.flagValues.set('fff-mode', fffMode);
  assert.equal(extensionsResult.runtime.flagValues.get('fff-mode'), 'tools-only');
  console.log(role + ': SDK FFF native flag bound to tools-only');
  await session.bindExtensions({ onError: error => console.log('EXTENSION ERROR ' + JSON.stringify(error)) });
  return session;
}
// Synthetic execution context only: no provider request or assistant generation.
const call = (session, name, args) => runToolCall({ type: 'toolCall', id: 'fixed-' + name, name, arguments: args }, { tools: session._getCallableTools(), assistantMessage: { role: 'assistant', content: [], timestamp: 0 }, context: { messages: [], tools: session.agent.state.tools }, beforeToolCall: context => session._beforeToolCall(context), afterToolCall: context => session._afterToolCall(context) });
function requireCarrier(session, name) {
  assert.ok(session.getAllTools().some(tool => tool.name === name), 'Required carrier not registered: ' + name);
  assert.ok(session.getActiveToolNames().includes(name), 'Required carrier not active: ' + name);
  assert.ok(session.agent.state.tools.some(tool => tool.name === name), 'Required carrier not declared: ' + name);
  assert.ok(session._getCallableTools().some(tool => tool.name === name), 'Required carrier not callable: ' + name);
}
async function expectedFailure(label, check) {
  await assert.rejects(async () => {
    try { await check(); } catch (error) { console.log('NEGATIVE ' + label + '\\n' + error.stack); throw error; }
  }, { code: 'ERR_ASSERTION' }, 'Negative control must fail: ' + label);
}
const lspArgs = { source: 'lsp', scope: 'paths', paths: ['fixture.ts'], serverScope: 'primary', waitMs: 15000 };
const dumpArgs = { dump: true, pattern: 'function f() { return 1; }', lang: 'typescript' };
function requireConfirmed(result, outcome) {
  assert.equal(result.isError, false, text(result));
  const details = result.details;
  console.log(JSON.stringify({ source: details.source, scope: details.scope, filesChecked: details.filesChecked, cleanFiles: details.cleanFiles, unconfirmedFiles: details.unconfirmedFiles, timedOutFiles: details.timedOutFiles, outcomes: details.outcomes, diagnostics: details.diagnostics, lspHealth: details.lspHealth, text: text(result) }));
  assert.equal(details.source, 'lsp');
  assert.equal(details.scope, 'paths');
  assert.equal(details.filesChecked, 1);
  for (const field of ['unconfirmedFiles', 'timedOutFiles', 'navigationOnlyFiles', 'incompleteFiles']) assert.equal(details[field] ?? 0, 0, field);
  assert.equal(details.outcomes[0].outcome, outcome, JSON.stringify(details));
  assert.equal(details.fileErrors, undefined);
  assert.equal(details.lspHealthWarnings, undefined);
}
const lspFailures = [];
for (const role of ['worker', 'worker-recovery']) {
  for (const carrier of ['lens_diagnostics', 'ast_grep_search']) {
    const restricted = await writerSession(role, carrier);
    // A permitted activation tool must not bypass the retained native allowlist.
    await call(restricted, 'pi_lens_activate_tools', { tools: ['ast_grep_search'] });
    restricted.setActiveToolsByName([...restricted.getActiveToolNames(), carrier]);
    await expectedFailure(role + ' missing registry ' + carrier, () => requireCarrier(restricted, carrier));
    const blocked = await call(restricted, carrier, carrier === 'lens_diagnostics' ? lspArgs : dumpArgs);
    await expectedFailure(role + ' denied actual call ' + carrier, () => assert.equal(blocked.isError, false, text(blocked.result)));
    assert.match(text(blocked.result), new RegExp('Tool ' + carrier + ' not found'));
    assert.ok(!restricted.getActiveToolNames().includes(carrier));
    restricted.dispose();
  }
  const session = await writerSession(role);
  requireCarrier(session, 'lens_diagnostics');
  requireCarrier(session, 'pi_lens_activate_tools');
  session.setActiveToolsByName(session.getActiveToolNames().filter(name => name !== 'ast_grep_search'));
  assert.ok(!session.getActiveToolNames().includes('ast_grep_search'), role + ': AST deactivation must remove its declaration');
  assert.ok(!session.agent.state.tools.some(tool => tool.name === 'ast_grep_search'), role + ': AST must not be declared while deactivated');
  const activated = await call(session, 'pi_lens_activate_tools', { tools: ['ast_grep_search'] });
  assert.equal(activated.isError, false);
  requireCarrier(session, 'ast_grep_search');
  const found = await call(session, 'fffind', { pattern: 'needle.txt' });
  const matched = await call(session, 'ffgrep', { pattern: 'ROLE_FIXTURE_731', path: 'needle.txt' });
  assert.equal(found.isError, false);
  assert.equal(matched.isError, false);
  assert.match(text(found.result), /needle\\.txt/);
  assert.match(text(matched.result), /ROLE_FIXTURE_731/);
  try {
    const bad = await call(session, 'lens_diagnostics', lspArgs);
    assert.equal(bad.isError, false, text(bad.result));
    requireConfirmed(bad.result, 'findings');
    assert.ok(bad.result.details.diagnostics.some(d => String(d.code) === '2322' && /not assignable to type 'string'/.test(d.message)), 'TypeScript must reject assigning number to string');
    writeFileSync('/state/home/' + role + '-restored/fixture.ts', "const value: string = 'restored';\\n");
    const clean = await call(session, 'lens_diagnostics', lspArgs);
    assert.equal(clean.isError, false, text(clean.result));
    requireConfirmed(clean.result, 'clean');
    assert.equal(clean.result.details.totalDiagnostics, 0);
    assert.equal(clean.result.details.cleanFiles, 1);
    console.log(role + ': consolidated LSP error and confirmed clean passed');
  } catch (error) {
    lspFailures.push(role + ': ' + error.message);
    console.log('LSP FAILURE ' + role + '\\n' + error.stack);
  }
  const dump = await call(session, 'ast_grep_search', dumpArgs);
  assert.equal(dump.isError, false);
  assert.equal(dump.result.details.mode, 'dump');
  for (const kind of ['function_declaration', 'return_statement', 'number']) assert.ok(text(dump.result).includes(kind), 'TypeScript grammar node: ' + kind);
  console.log(role + ': AST dump evidence\\n' + text(dump.result));
  const denied = await call(session, 'create_agent', {});
  assert.equal(denied.isError, true, 'Child must not call management tools');
  console.log(role + ': AST dump, activation boundaries, FFF, and management denial passed');
  session.dispose();
}
assert.deepEqual(lspFailures, [], 'All consolidated LSP checks must pass');
`;

// Opt in: PASEO_ROLE_RUNTIME=1 node --test --test-name-pattern='isolated native' scripts/roles.test.mjs
// Detects CLI discovery/allowlist failures and a native FFF extension that registers but cannot search.
test('isolated native launch and actual FFF execution without prompts', { skip: process.env.PASEO_ROLE_RUNTIME !== '1', timeout: 540000 }, async () => {
  const temp = await mkdtemp(join(tmpdir(), 'paseo-role-runtime-'));
  try {
    await mkdir(join(temp, 'project'));
    await writeFile(join(temp, 'project/needle.txt'), 'ROLE_FIXTURE_731\n');
    await writeFile(join(temp, 'project/fixture.ts'), 'const value: string = 1;\n');
    await writeFile(join(temp, 'project/tsconfig.json'), '{"compilerOptions":{"strict":true,"noEmit":true},"include":["fixture.ts"]}\n');
    await writeFile(join(temp, 'probe.ts'), probeExtension);
    await writeFile(join(temp, 'driver.mjs'), runtimeDriver);
    const output = execFileSync('docker', ['run', '--rm', '--network', 'none', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges', '--read-only', '--tmpfs', '/state:rw,exec,mode=1777', '--tmpfs', '/tmp:rw,exec,mode=1777', '--mount', `type=bind,src=${join(root, 'defaults')},dst=/defaults,readonly`, '--mount', `type=bind,src=${join(root, 'defaults/pi/roles')},dst=/home/node/.pi/agent/roles,readonly`, '--mount', `type=bind,src=${join(root, 'defaults/skills')},dst=/home/node/.agents/skills,readonly`, '--mount', `type=bind,src=${temp},dst=/fixture,readonly`, '--env', 'HOME=/state/home', '--env', 'PASEO_HOME=/state/paseo', '--env', 'XDG_CACHE_HOME=/state/cache', '--env', 'XDG_CONFIG_HOME=/state/config', '--env', 'XDG_DATA_HOME=/state/data', '--env', 'PI_OFFLINE=1', '--env', 'FFF_ENABLE_HOME_SCAN=0', '--env', 'FFF_MODE=tools-only', '--entrypoint', '/usr/local/bin/node', image, '/fixture/driver.mjs'], { encoding: 'utf8', timeout: 520000 });
    console.log(output.trim());
  } finally { await rm(temp, { recursive: true, force: true }); }
});
