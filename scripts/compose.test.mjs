import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, chmod, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawnSync } from 'node:child_process';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
test('mounts any number of named Figma files read-only without per-account variables', async () => {
  const temp = await mkdtemp(join(tmpdir(), 'paseo-compose-'));
  const figma = join(temp, 'figma');
  const password = join(temp, 'password.env');
  const envFile = join(temp, 'compose.env');
  const args = ['compose', '--project-name', 'isolated-paseo', '--env-file', envFile, '-f', join(root, 'compose.yaml'), 'config'];
  const env = { PATH: process.env.PATH, HOME: process.env.HOME };
  try {
    await mkdir(figma, { mode: 0o700 });
    await writeFile(password, 'PASEO_PASSWORD=synthetic-test-only\n', { mode: 0o600 });
    await writeFile(envFile, `PASEO_PASSWORD_ENV_FILE=${password}\nFIGMA_SECRETS_DIR=${figma}\n`, { mode: 0o600 });
    for (const name of ['my-company', 'other-company', 'third-company']) {
      await writeFile(join(figma, `${name}.env`), 'FIGMA_API_KEY=synthetic-test-only\n', { mode: 0o600 });
      const config = JSON.parse(execFileSync('docker', [...args, '--format', 'json'], { env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
      const service = config.services.paseo;
      assert.equal(service.environment.PASEO_HOSTNAMES, '', 'Unset hostnames must preserve default host protection');
      const hostnames = 'paseo.example.test';
      const configured = JSON.parse(execFileSync('docker', [...args, '--format', 'json'], { env: { ...env, PASEO_HOSTNAMES: hostnames }, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
      assert.equal(configured.services.paseo.environment.PASEO_HOSTNAMES, hostnames, 'Compose must forward the supplied hostname without allowing all hosts');
      const mount = service.volumes.find(m => m.target === '/run/secrets/figma');
      assert.ok(mount, 'Figma directory mount is missing');
      assert.equal(mount.type, 'bind');
      assert.equal(mount.source, figma);
      assert.equal(mount.read_only, true, 'Figma credentials must not be writable');
      assert.equal(mount.bind.create_host_path, false, 'Missing credential directories must not be created');
      assert.equal(service.volumes.length, 6);
      assert.equal(service.secrets?.length ?? 0, 0, 'Per-account Compose secrets must not remain');
      assert.equal(config.volumes.paseo_home.name, 'isolated-paseo_paseo_home');
      const smoke = await readFile(join(root, 'scripts/smoke-check.sh'), 'utf8');
      const validator = smoke.split("expected=$(docker compose config --format json | docker compose exec -T paseo node -e '\n")[1].split("\n});')")[0] + '\n});';
      const validate = () => spawnSync(process.execPath, ['-e', validator], { input: JSON.stringify(config), encoding: 'utf8' });
      const valid = validate();
      assert.equal(valid.status, 0, `Smoke validation must accept arbitrary account counts: ${valid.stderr}`);
      assert.equal(JSON.parse(valid.stdout).figma, figma);
      mount.read_only = false;
      assert.notEqual(validate().status, 0, 'Smoke validation must reject a writable credential mount');
    }
    await writeFile(envFile, `PASEO_PASSWORD_ENV_FILE=${password}\n`, { mode: 0o600 });
    const missing = spawnSync('docker', [...args, '--quiet'], { env, stdio: 'pipe' });
    assert.notEqual(missing.status, 0, 'Missing FIGMA_SECRETS_DIR must fail validation');
  } finally { await rm(temp, { recursive: true, force: true }); }
});

test('Figma permission checks reject public files, public directories and symlinks', async () => {
  const temp = await mkdtemp(join(tmpdir(), 'paseo-figma-permissions-'));
  try {
    const smoke = await readFile(join(root, 'scripts/smoke-check.sh'), 'utf8');
    const validator = smoke.split("docker compose exec -T paseo node -e '\n// Check Figma file permissions without reading credentials.\n")[1].split("' /run/secrets/figma")[0];
    const validate = () => spawnSync(process.execPath, ['-e', validator, temp], { stdio: 'pipe' }).status;
    const file = join(temp, 'any-company.env');
    await writeFile(file, 'synthetic-test-only', { mode: 0o600 });
    assert.equal(validate(), 0);
    await chmod(file, 0o644);
    assert.notEqual(validate(), 0, 'Public credential files must fail');
    await chmod(file, 0o600);
    await chmod(temp, 0o755);
    assert.notEqual(validate(), 0, 'Public credential directories must fail');
    await chmod(temp, 0o700);
    await symlink(file, join(temp, 'alias.env'));
    assert.notEqual(validate(), 0, 'Symlinked credential files must fail');
    await rm(join(temp, 'alias.env'));
    assert.equal(validate(), 0);
  } finally { await rm(temp, { recursive: true, force: true }); }
});
