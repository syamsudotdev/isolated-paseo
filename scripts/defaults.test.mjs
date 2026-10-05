import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const script = join(root, 'scripts/init-defaults.sh');
test('initializes empty MCP configuration without fixed Figma accounts', async () => {
  const temp = await mkdtemp(join(tmpdir(), 'paseo-fresh-defaults-'));
  try {
    const agent = join(temp, 'agent');
    execFileSync('bash', [script], { env: { ...process.env, DEFAULTS_DIR: join(root, 'defaults'), PI_AGENT_DIR: agent, SKILLS_DIR: join(temp, 'skills'), GRADLE_DIR: join(temp, 'gradle') } });
    assert.deepEqual(JSON.parse(await readFile(join(agent, 'mcp.json'), 'utf8')), { mcpServers: {} });
    assert.equal((await stat(join(agent, 'mcp.json'))).mode & 0o777, 0o600);
  } finally { await rm(temp, { recursive: true, force: true }); }
});
test('initializes missing defaults and preserves customized settings and MCP servers', async () => {
  const temp = await mkdtemp(join(tmpdir(), 'paseo-defaults-'));
  const agent = join(temp, 'agent');
  const skills = join(temp, 'skills');
  const gradle = join(temp, 'gradle');
  try {
    await mkdir(agent);
    await writeFile(join(agent, 'settings.json'), '{"defaultModel":"custom"}\n');
    const original = { mcpServers: { local: { command: 'true' }, 'figma-my-company': { command: 'custom' } } };
    await writeFile(join(agent, 'mcp.json'), JSON.stringify(original));
    const env = { ...process.env, DEFAULTS_DIR: join(root, 'defaults'), PI_AGENT_DIR: agent, SKILLS_DIR: skills, GRADLE_DIR: gradle };
    execFileSync('bash', [script], { env });
    execFileSync('bash', [script], { env });
    assert.equal((await readFile(join(agent, 'settings.json'), 'utf8')), '{"defaultModel":"custom"}\n');
    assert.deepEqual(JSON.parse(await readFile(join(agent, 'mcp.json'), 'utf8')), original, 'Initialization must not add fixed Figma accounts');
    const source = join(temp, 'accounts.json');
    await writeFile(source, JSON.stringify({ mcpServers: {
      'figma-my-company': { command: 'do-not-overwrite' },
      'figma-other-company': { command: 'figma-developer-mcp', args: ['--stdio', '--no-telemetry', '--skip-image-downloads', '--env', '/run/secrets/figma/other-company.env'] },
      'figma-third-company': { command: 'figma-developer-mcp', args: ['--stdio', '--no-telemetry', '--skip-image-downloads', '--env', '/run/secrets/figma/third-company.env'] }
    } }));
    for (let i = 0; i < 2; i++) execFileSync('node', [join(root, 'scripts/merge-mcp.mjs'), source, join(agent, 'mcp.json')]);
    const mcp = JSON.parse(await readFile(join(agent, 'mcp.json'), 'utf8'));
    assert.deepEqual(Object.keys(mcp.mcpServers).sort(), ['figma-my-company', 'figma-other-company', 'figma-third-company', 'local']);
    assert.equal(mcp.mcpServers.local.command, 'true');
    assert.equal(mcp.mcpServers['figma-my-company'].command, 'custom');
    assert.deepEqual(mcp.mcpServers['figma-other-company'].args, ['--stdio', '--no-telemetry', '--skip-image-downloads', '--env', '/run/secrets/figma/other-company.env']);
    assert.deepEqual(mcp.mcpServers['figma-third-company'].args, ['--stdio', '--no-telemetry', '--skip-image-downloads', '--env', '/run/secrets/figma/third-company.env']);
    assert.equal((await stat(join(agent, 'mcp.json'))).mode & 0o777, 0o600);
    await stat(join(agent, 'AGENTS.md'));
    await stat(join(skills, 'android-cli/SKILL.md'));
    await stat(join(gradle, 'init.d/test-forks.gradle'));
  } finally { await rm(temp, { recursive: true, force: true }); }
});
