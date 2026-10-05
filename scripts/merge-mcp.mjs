import { readFile, writeFile, rename, lstat } from 'node:fs/promises';
import { dirname, basename } from 'node:path';
import { randomUUID } from 'node:crypto';

const [source, target] = process.argv.slice(2);
if (!source || !target) throw new Error('Expected source and target paths.');
const defaults = JSON.parse(await readFile(source, 'utf8'));
let current;
try {
  const stat = await lstat(target);
  if (!stat.isFile()) throw new Error('MCP target must be a regular file.');
  current = JSON.parse(await readFile(target, 'utf8'));
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
  current = {};
}
if (current.mcpServers != null && (typeof current.mcpServers !== 'object' || Array.isArray(current.mcpServers))) {
  throw new Error('Invalid existing MCP server configuration.');
}
const servers = { ...current.mcpServers };
let changed = current.mcpServers == null;
for (const [name, value] of Object.entries(defaults.mcpServers)) {
  if (!Object.hasOwn(servers, name)) { servers[name] = value; changed = true; }
}
if (changed) {
  const temporary = `${dirname(target)}/.${basename(target)}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, JSON.stringify({ ...current, mcpServers: servers }, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
    await rename(temporary, target);
  } catch (error) {
    const { rm } = await import('node:fs/promises');
    await rm(temporary, { force: true });
    throw error;
  }
}
