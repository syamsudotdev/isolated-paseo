import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const script = join(root, 'scripts/init-defaults.sh');
test('initializes missing defaults and preserves customized settings and MCP servers', async () => {
  const temp = await mkdtemp(join(tmpdir(), 'paseo-defaults-'));
  const agent = join(temp, 'agent');
  const skills = join(temp, 'skills');
  const gradle = join(temp, 'gradle');
  try {
    await mkdir(agent);
    await writeFile(join(agent, 'settings.json'), '{"defaultModel":"custom"}\n');
    await writeFile(join(agent, 'mcp.json'), JSON.stringify({ mcpServers: { local: { command: 'true' }, 'framelink-mcp-workplace-a': { command: 'custom' } } }));
    const env = { ...process.env, DEFAULTS_DIR: join(root, 'defaults'), PI_AGENT_DIR: agent, SKILLS_DIR: skills, GRADLE_DIR: gradle };
    execFileSync('bash', [script], { env });
    execFileSync('bash', [script], { env });
    assert.equal((await readFile(join(agent, 'settings.json'), 'utf8')), '{"defaultModel":"custom"}\n');
    const mcp = JSON.parse(await readFile(join(agent, 'mcp.json'), 'utf8'));
    assert.equal(mcp.mcpServers.local.command, 'true');
    assert.equal(mcp.mcpServers['framelink-mcp-workplace-a'].command, 'custom');
    assert.equal(mcp.mcpServers['framelink-mcp-workplace-b'].command, 'figma-developer-mcp');
    assert.equal((await stat(join(agent, 'mcp.json'))).mode & 0o777, 0o600);
    await stat(join(agent, 'AGENTS.md'));
    await stat(join(skills, 'android-cli/SKILL.md'));
    await stat(join(gradle, 'init.d/test-forks.gradle'));
  } finally { await rm(temp, { recursive: true, force: true }); }
});
