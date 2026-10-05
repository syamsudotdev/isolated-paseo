import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm, symlink, readlink, lstat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const read = path => readFile(join(root, path), 'utf8');

test('FFF uses the pinned Pi extension rather than nonexistent command binaries', async () => {
  const apps = JSON.parse(await read('defaults/apps/package.json'));
  const lock = JSON.parse(await read('defaults/apps/package-lock.json'));
  const settings = JSON.parse(await read('defaults/pi/settings.json'));
  assert.equal(apps.dependencies['@ff-labs/pi-fff'], '0.11.0');
  assert.equal(lock.packages['node_modules/@ff-labs/pi-fff'].version, '0.11.0');
  assert.ok(settings.extensions.includes('/opt/toolchain/apps/node_modules/@ff-labs/pi-fff/src/index.ts'));
});

test('pi-lens and language servers use reviewed immutable pins', async () => {
  const apps = JSON.parse(await read('defaults/apps/package.json'));
  const lock = JSON.parse(await read('defaults/apps/package-lock.json'));
  const settings = JSON.parse(await read('defaults/pi/settings.json'));
  const dockerfile = await read('Dockerfile');
  const installer = await read('scripts/install-language-servers.sh');
  const npmPins = {
    'pi-lens': '4.3.0',
    'typescript-language-server': '6.0.1',
    typescript: '7.0.2',
    pyright: '1.1.414',
    'bash-language-server': '5.8.1',
    'yaml-language-server': '1.24.0',
    'vscode-langservers-extracted': '4.10.0',
    '@ast-grep/cli': '0.45.3',
  };
  for (const [name, version] of Object.entries(npmPins)) {
    assert.equal(apps.dependencies[name], version);
    assert.equal(lock.packages[`node_modules/${name}`].version, version);
  }
  assert.ok(settings.packages.includes('/opt/toolchain/apps/node_modules/pi-lens'), 'Load both extension and skills through Pi local-package discovery');
  assert.match(dockerfile, /install-language-servers\.sh/);
  for (const library of ['libedit2', 'libffi8', 'libxml2', 'libz3-4', 'libzstd1', 'zlib1g']) assert.ok(dockerfile.includes(library), `Install clangd runtime dependency ${library} before pinned packages`);
  for (const pin of ['23.1.2', '2026-02-08', '0.10.0', '2026-09-28', '1.61.0', '263.6379.0', 'v1.30.0', 'v0.1.56']) assert.ok(installer.includes(pin), `Missing native pin ${pin}`);
  assert.match(installer, /jdtls\/bin\/jdtls --jvm-arg="-Duser\.home=\$HOME"/, 'Keep JDTLS Java home and Equinox state in writable HOME storage');
  assert.match(installer, /intellij-server --stdio/, 'Use the image-owned Kotlin standard input and output wrapper');
  assert.match(installer, /scripts\/typescript-language-server\.sh/, 'Route the global fallback through native TypeScript 7');
  assert.equal((installer.match(/tar --no-same-owner/g) ?? []).length, 3, 'Extract native archives with image ownership under rootless Docker');
  assert.ok(!installer.includes('apt-get'), 'Do not add an APT repository or force dependency installation');
  assert.match(installer, /sha256sum -c -/);
});

test('TypeScript launcher selects the native language server and preserves arguments', async () => {
  const temp = await mkdtemp(join(tmpdir(), 'paseo-typescript-wrapper-'));
  try {
    const tsc = join(temp, 'apps/node_modules/.bin/tsc');
    const classic = join(temp, 'apps/node_modules/.bin/typescript-language-server');
    await mkdir(dirname(tsc), { recursive: true });
    await writeFile(tsc, `#!${process.execPath}\nconsole.log(JSON.stringify(process.argv.slice(2)));\n`, { mode: 0o755 });
    await writeFile(classic, `#!${process.execPath}\nconsole.log('6.0.1');\n`, { mode: 0o755 });
    const wrapper = join(temp, 'typescript-language-server.sh');
    await writeFile(wrapper, (await read('scripts/typescript-language-server.sh')).replaceAll('/opt/toolchain', temp), { mode: 0o755 });
    const result = spawnSync(wrapper, ['--stdio', '--log-level', '4'], { encoding: 'utf8', timeout: 5000 });
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), ['--lsp', '--stdio', '--log-level', '4']);
    const version = spawnSync(wrapper, ['--version'], { encoding: 'utf8', timeout: 5000 });
    assert.equal(version.status, 0, version.stderr);
    assert.equal(version.stdout, '6.0.1\n');
  } finally { await rm(temp, { recursive: true, force: true }); }
});

test('JDTLS launcher selects writable Java home and preserves arguments', async () => {
  const temp = await mkdtemp(join(tmpdir(), 'paseo-jdtls-wrapper-'));
  try {
    const server = join(temp, 'language-servers/jdtls/bin/jdtls');
    const home = join(temp, 'home');
    await mkdir(dirname(server), { recursive: true });
    await writeFile(server, `#!${process.execPath}\nconsole.log(JSON.stringify({ args: process.argv.slice(2), home: process.env.HOME }));\n`, { mode: 0o755 });
    const installer = await read('scripts/install-language-servers.sh');
    const wrapperSource = installer.match(/cat > "\$bin\/jdtls" <<'EOF'\n([\s\S]*?)\nEOF/)?.[1];
    assert.ok(wrapperSource, 'Installer must contain the JDTLS wrapper body');
    const wrapper = join(temp, 'jdtls');
    await writeFile(wrapper, wrapperSource.replaceAll('/opt/toolchain', temp), { mode: 0o755 });
    const result = spawnSync(wrapper, ['-data', 'a path with spaces'], { encoding: 'utf8', timeout: 5000, env: { ...process.env, HOME: home } });
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), { args: [`--jvm-arg=-Duser.home=${home}`, '-data', 'a path with spaces'], home });
  } finally { await rm(temp, { recursive: true, force: true }); }
});

test('Kotlin launcher selects standard input and output transport and preserves arguments', async () => {
  const temp = await mkdtemp(join(tmpdir(), 'paseo-kotlin-wrapper-'));
  try {
    const server = join(temp, 'language-servers/kotlin-lsp/bin/intellij-server');
    await mkdir(dirname(server), { recursive: true });
    await writeFile(server, `#!${process.execPath}\nconsole.log(JSON.stringify(process.argv.slice(2)));\n`, { mode: 0o755 });
    const wrapper = join(temp, 'kotlin-lsp');
    const installer = await read('scripts/install-language-servers.sh');
    const wrapperSource = installer.match(/cat > "\$bin\/kotlin-lsp" <<'EOF'\n([\s\S]*?)\nEOF/)?.[1];
    assert.ok(wrapperSource, 'Installer must contain the Kotlin wrapper body');
    await writeFile(wrapper, wrapperSource.replaceAll('/opt/toolchain', temp), { mode: 0o755 });
    const result = spawnSync(wrapper, ['--system-path', 'a path with spaces'], { encoding: 'utf8', timeout: 5000 });
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), ['--stdio', '--system-path', 'a path with spaces']);
  } finally { await rm(temp, { recursive: true, force: true }); }
});

test('Android entry points verify the full payload and use the no-metrics wrapper', async t => {
  const dockerfile = await read('Dockerfile');
  const payload = `#!${process.execPath}\nconsole.log(JSON.stringify(process.argv.slice(2)));\n`;
  const fixtureHash = createHash('sha256').update(payload).digest('hex');
  for (const scenario of ['valid', 'corrupt']) await t.test(scenario, async () => {
    const temp = await mkdtemp(join(tmpdir(), 'paseo-android-wrapper-'));
    try {
      const bin = join(temp, 'mise/installs/android-cli/1.0.16500706');
      const mock = join(temp, 'mock');
      for (const directory of [bin, mock, join(temp, 'bin'), join(temp, 'scripts')]) await mkdir(directory, { recursive: true });
      const launcher = '#!/bin/sh\nprintf launcher-invoked\n';
      await writeFile(join(bin, 'android'), launcher, { mode: 0o755 });
      await writeFile(join(mock, 'curl'), `#!${process.execPath}\nimport assert from 'node:assert/strict';import {writeFileSync} from 'node:fs';const args=process.argv.slice(2);assert.ok(args.includes('--compressed'));assert.ok(args.includes('https://dl.google.com/android/cli/1.0.16500706/linux_x86_64/android-cli'));assert.equal(args.at(-2),'-o');writeFileSync(args.at(-1),${JSON.stringify(payload + (scenario === 'corrupt' ? '# corrupted publisher payload\n' : ''))});\n`, { mode: 0o755 });
      await writeFile(join(temp, 'scripts/android.sh'), (await read('scripts/android.sh')).replaceAll('/opt/toolchain', temp));
      const installation = dockerfile.slice(dockerfile.indexOf('RUN chmod 755'), dockerfile.indexOf('\nRUN /opt/toolchain/bin/mise -C /opt/toolchain exec'))
        .replace(/^RUN /, '').replaceAll('/opt/toolchain', temp)
        .replace('508840c2a9ce8768a9246ec7962834713967b46dd0cf0dad80fcde3d444947c0', fixtureHash);
      const installed = spawnSync('sh', ['-c', installation], { encoding: 'utf8', env: { ...process.env, PATH: `${mock}:${process.env.PATH}` } });
      assert.equal(await readFile(join(bin, 'android.launcher'), 'utf8'), launcher, 'Preserve the original launcher without using it as the real payload');
      if (scenario === 'corrupt') {
        assert.notEqual(installed.status, 0, 'A changed publisher payload must stop image initialization');
        assert.match(installed.stderr, /did NOT match/);
        assert.equal((await lstat(join(bin, 'android.real'))).mode & 0o111, 0, 'Reject the payload before making it executable');
        await assert.rejects(lstat(join(temp, 'bin/android')), { code: 'ENOENT' });
        return;
      }
      assert.equal(installed.status, 0, installed.stderr);
      for (const command of [join(temp, 'bin/android'), join(bin, 'android')]) {
        const result = spawnSync(command, ['docs', 'a path with spaces'], { encoding: 'utf8', timeout: 5000 });
        assert.equal(result.status, 0, result.stderr);
        assert.deepEqual(JSON.parse(result.stdout), ['--no-metrics', 'docs', 'a path with spaces']);
      }
    } finally { await rm(temp, { recursive: true, force: true }); }
  });
});

test('Android full payload is pinned in the immutable toolchain before execution', async () => {
  const dockerfile = await read('Dockerfile');
  const mise = await read('defaults/mise.toml');
  const url = 'https://dl.google.com/android/cli/1.0.16500706/linux_x86_64/android-cli';
  assert.ok(dockerfile.includes(`curl -fsSL --compressed ${url}`), 'Download the versioned full executable, not only its launcher');
  assert.ok(dockerfile.includes('508840c2a9ce8768a9246ec7962834713967b46dd0cf0dad80fcde3d444947c0  /opt/toolchain/mise/installs/android-cli/1.0.16500706/android.real'));
  assert.ok(dockerfile.includes('/opt/toolchain/mise/installs/android-cli/1.0.16500706/android.launcher'));
  assert.ok(dockerfile.indexOf('508840c2a9ce8768a9246ec7962834713967b46dd0cf0dad80fcde3d444947c0') < dockerfile.indexOf('&& chmod 755 /opt/toolchain/mise/installs/android-cli/1.0.16500706/android.real'), 'Verify the publisher payload before making it executable');
  assert.match(mise, /^ANDROID_CLI_DOWNLOAD_URL = "https:\/\/dl.google.com\/android\/cli\/1\.0\.16500706\/linux_x86_64\/android-cli"$/m);
  assert.ok(mise.includes("android --sdk=/opt/toolchain/android-sdk sdk install 'platforms/android-37.2@1'"), 'SDK installation must use the verified no-metrics executable');
});

test('image separates build-time and runtime Cargo homes', async () => {
  const dockerfile = await read('Dockerfile');
  const homes = [...dockerfile.matchAll(/^\s*(?:ENV )?CARGO_HOME=(\S+)/gm)];
  assert.equal(homes[0]?.[1], '/opt/toolchain/cargo', 'Tool installation must keep its build-time Cargo home');
  assert.equal(homes.at(-1)?.[1], '/home/node/.local/share/toolchain/cargo', 'Direct Docker execution must use the same writable Cargo home as daemon startup');
  assert.ok(homes.at(-1).index > dockerfile.lastIndexOf('RUN '), 'Runtime Cargo home must be set after all build commands');
});

test('mise uses the populated image SDK instead of the command-line-only installation', async () => {
  const mise = await read('defaults/mise.toml');
  assert.match(mise, /^\[env\]\nANDROID_HOME = "\/opt\/toolchain\/android-sdk"$/m, 'Configuration must override the Android SDK backend environment for every mise caller');
});

test('image exposes installed app commands to direct execution', async () => {
  const dockerfile = await read('Dockerfile');
  const paths = [...dockerfile.matchAll(/^\s*(?:ENV )?PATH=(\S+)/gm)];
  assert.ok(paths.at(-1)?.[1].split(':').includes('/opt/toolchain/apps/node_modules/.bin'), 'Direct mise execution must find installed Pi and Paseo commands');
  assert.ok(paths.at(-1).index > dockerfile.lastIndexOf('RUN '), 'Runtime tool paths must be set after build commands');
});

test('Rust launchers align with writable Cargo storage without replacing user files', async t => {
  const dockerfile = await read('Dockerfile');
  const linkCommand = dockerfile.match(/ln -sfnT \/home\/node\/\.local\/share\/toolchain\/cargo\/bin \/opt\/toolchain\/mise\/installs\/rust\/1\.99\.0/);
  assert.ok(linkCommand, 'The image Rust installation must select the runtime Cargo launcher directory');
  for (const scenario of ['fresh', 'populated', 'file conflict', 'directory conflict', 'dangling symlink conflict']) {
    await t.test(scenario, async () => {
      const temp = await mkdtemp(join(tmpdir(), 'paseo-rust-launchers-'));
      try {
        const image = join(temp, 'toolchain');
        const home = join(temp, 'home');
        const cargo = join(home, '.local/share/toolchain/cargo');
        const imageBin = join(image, 'cargo/bin');
        const install = join(image, 'mise/installs/rust/1.99.0');
        const trace = join(temp, 'trace');
        for (const path of [imageBin, dirname(install), join(image, 'bin'), join(image, 'scripts'), join(cargo, 'bin')]) await mkdir(path, { recursive: true });
        for (const name of ['cargo', 'rustc', 'rustup']) await writeFile(join(imageBin, name), '#!/bin/sh\nexit 0\n', { mode: 0o755 });
        await symlink(imageBin, install);
        const linked = spawnSync('bash', ['-c', linkCommand[0].replaceAll('/opt/toolchain', image).replaceAll('/home/node', home)], { encoding: 'utf8' });
        assert.equal(linked.status, 0, linked.stderr);
        await writeFile(join(image, 'bin/mise'), `#!/bin/bash\nset -eu\ntest "$CARGO_HOME/bin" -ef '${install}'\nfor name in cargo rustc rustup; do test -x "$CARGO_HOME/bin/$name"; done\nprintf 'mise\\n' >> '${trace}'\nshift 4\nexec "$@"\n`, { mode: 0o755 });
        await writeFile(join(image, 'scripts/init-defaults.sh'), '#!/bin/sh\nexit 0\n', { mode: 0o755 });
        const unrelated = join(cargo, 'bin/user-tool');
        await writeFile(unrelated, '#!/bin/sh\nprintf user-tool\n', { mode: 0o755 });
        const conflict = join(cargo, 'bin/rustup');
        if (scenario === 'populated') await symlink(join(imageBin, 'cargo'), join(cargo, 'bin/cargo'));
        if (scenario === 'file conflict') await writeFile(conflict, 'user-owned launcher');
        if (scenario === 'directory conflict') await mkdir(conflict);
        if (scenario === 'dangling symlink conflict') await symlink(join(temp, 'missing-user-tool'), conflict);
        const entrypoint = join(temp, 'entrypoint.sh');
        await writeFile(entrypoint, (await read('scripts/entrypoint.sh')).replaceAll('/opt/toolchain', image).replaceAll('/home/node', home));
        const config = join(temp, 'config');
        const run = () => spawnSync('bash', [entrypoint, 'true'], { env: { ...process.env, XDG_CONFIG_HOME: config }, encoding: 'utf8', timeout: 5000 });
        const result = run();
        assert.ok((await lstat(config)).isDirectory(), 'The configuration directory must stay inside the disposable fixture');
        if (scenario.includes('conflict')) {
          assert.notEqual(result.status, 0, 'A conflicting launcher must stop initialization');
          assert.match(result.stderr, /Rust launcher conflict:/);
          await assert.rejects(readFile(trace), { code: 'ENOENT' });
          await assert.rejects(lstat(join(cargo, 'bin/cargo')), { code: 'ENOENT' }, 'Preflight must not create launchers before rejecting a later conflict');
          if (scenario === 'file conflict') assert.equal(await readFile(conflict, 'utf8'), 'user-owned launcher');
          if (scenario === 'directory conflict') assert.ok((await lstat(conflict)).isDirectory());
          if (scenario === 'dangling symlink conflict') assert.equal(await readlink(conflict), join(temp, 'missing-user-tool'));
        } else {
          assert.equal(result.status, 0, result.stderr);
          const repeated = run();
          assert.equal(repeated.status, 0, repeated.stderr);
          assert.equal(await readFile(trace, 'utf8'), 'mise\nmise\nmise\nmise\n', 'Both mise exec calls must work on first and repeated startup');
          for (const name of ['cargo', 'rustc', 'rustup']) assert.equal(await readlink(join(cargo, 'bin', name)), join(imageBin, name));
        }
        assert.equal(await readFile(unrelated, 'utf8'), '#!/bin/sh\nprintf user-tool\n');
        assert.equal((await lstat(unrelated)).mode & 0o777, 0o755);
      } finally { await rm(temp, { recursive: true, force: true }); }
    });
  }
});

test('concurrent entrypoints serialize initialization and release the lock before commands', async () => {
  const temp = await mkdtemp(join(tmpdir(), 'paseo-initialization-lock-'));
  try {
    const image = join(temp, 'toolchain');
    const home = join(temp, 'home');
    const agent = join(temp, 'agent');
    const config = join(temp, 'config');
    for (const path of [join(image, 'bin'), join(image, 'scripts'), join(image, 'cargo/bin'), agent]) await mkdir(path, { recursive: true });
    for (const name of ['cargo', 'rustc', 'rustup']) await writeFile(join(image, 'cargo/bin', name), '#!/bin/sh\nexit 0\n', { mode: 0o755 });
    const settings = '{"defaultModel":"custom"}\n';
    const mcp = '{"mcpServers":{"user-account":{"command":"user-command"}}}\n';
    await writeFile(join(agent, 'settings.json'), settings);
    await writeFile(join(agent, 'mcp.json'), mcp);
    await writeFile(join(image, 'bin/mise'), '#!/bin/bash\nshift 4\nexec "$@"\n', { mode: 0o755 });
    // Observe acquisition attempts, but delegate locking to the real native command.
    const observedFlock = join(image, 'bin/observed-flock');
    await writeFile(observedFlock, `#!/bin/bash\nset -eu\nif [[ "$INIT_FIRST" = 0 ]]; then printf 'lock-request\\n' > '${temp}/events'; fi\nexec /usr/bin/flock "$@"\n`, { mode: 0o755 });
    await writeFile(join(image, 'scripts/init-defaults.sh'), `#!/bin/bash\nset -eu\nif ! mkdir '${temp}/active'; then printf 'overlap\\n' > '${temp}/events'; exit 73; fi\ntrap "rmdir '${temp}/active'" EXIT\nif [[ "$INIT_FIRST" = 1 ]]; then printf 'entered\\n' > '${temp}/events'; IFS= read -r release < '${temp}/release'; fi\nbash '${root}/scripts/init-defaults.sh'\n`, { mode: 0o755 });
    const entrypoint = join(temp, 'entrypoint.sh');
    await writeFile(entrypoint, (await read('scripts/entrypoint.sh')).replaceAll('/opt/toolchain', image).replaceAll('/home/node', home).replaceAll('/usr/bin/flock', observedFlock));
    const command = `test ! -e /proc/$$/fd/9; if [[ "$INIT_FIRST" = 1 ]]; then printf "running\\n" > "${temp}/daemon-started"; IFS= read -r release < "${temp}/daemon-release"; fi`;
    const runner = join(temp, 'run.sh');
    await writeFile(runner, `#!/bin/bash\nset -eu\nmkfifo '${temp}/events' '${temp}/release' '${temp}/daemon-started' '${temp}/daemon-release'\nINIT_FIRST=1 bash '${entrypoint}' bash -c '${command}' > '${temp}/first.log' 2>&1 &\nfirst=$!\nIFS= read -r event < '${temp}/events'\ntest "$event" = entered\nINIT_FIRST=0 bash '${entrypoint}' bash -c '${command}' > '${temp}/second.log' 2>&1 &\nsecond=$!\nIFS= read -r event < '${temp}/events'\nprintf 'release\\n' > '${temp}/release'\nIFS= read -r command_state < '${temp}/daemon-started'\ntest "$command_state" = running\nset +e\nwait "$second"; second_status=$?\n/usr/bin/flock --nonblock '${home}/.local/share/toolchain/initialization.lock' true; lock_status=$?\nprintf 'release\\n' > '${temp}/daemon-release'\nwait "$first"; first_status=$?\nset -e\nprintf 'event=%s first=%s second=%s lock=%s\\n' "$event" "$first_status" "$second_status" "$lock_status"\ntest "$event" = lock-request\ntest "$first_status" = 0\ntest "$second_status" = 0\ntest "$lock_status" = 0\n`);
    const result = spawnSync('timeout', ['10s', 'bash', runner], {
      encoding: 'utf8', timeout: 15000,
      env: { ...process.env, XDG_CONFIG_HOME: config, DEFAULTS_DIR: join(root, 'defaults'), PI_AGENT_DIR: agent, SKILLS_DIR: join(temp, 'skills'), GRADLE_DIR: join(temp, 'gradle') },
    });
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.equal(result.stdout, 'event=lock-request first=0 second=0 lock=0\n', 'Initialization must be serialized, while a running command must not retain the lock');
    assert.equal(await readFile(join(agent, 'settings.json'), 'utf8'), settings);
    assert.equal(await readFile(join(agent, 'mcp.json'), 'utf8'), mcp);
    assert.ok((await lstat(config)).isDirectory(), 'Startup must create the configured writable configuration directory');
    assert.equal(await readFile(join(temp, 'skills/android-cli/SKILL.md'), 'utf8'), await read('defaults/skills/android-cli/SKILL.md'));
    for (const name of ['cargo', 'rustc', 'rustup']) assert.equal(await readlink(join(home, '.local/share/toolchain/cargo/bin', name)), join(image, 'cargo/bin', name));
  } finally { await rm(temp, { recursive: true, force: true }); }
});

test('platform-tools pin survives an ambient SDK override and rejects a bad checksum', async () => {
  const mise = await read('defaults/mise.toml');
  const dockerfile = await read('Dockerfile');
  assert.ok(!/['"]platform-tools['"]/.test(mise + dockerfile), 'sdkmanager must not select floating platform-tools');
  assert.ok(mise.includes('/opt/toolchain/scripts/install-platform-tools.sh'));
  assert.ok(dockerfile.includes('mise -C /opt/toolchain run android-sdk'));
  const temp = await mkdtemp(join(tmpdir(), 'paseo-platform-tools-'));
  try {
    const bin = join(temp, 'bin');
    await mkdir(bin);
    const trace = join(temp, 'trace');
    const stub = `#!${process.execPath}\nimport { appendFileSync, writeFileSync } from 'node:fs';
import { basename } from 'node:path';
const command = basename(process.argv[1]);
const args = process.argv.slice(2);
appendFileSync(process.env.TRACE, JSON.stringify({ command, args }) + '\\n');
if (command === 'curl') writeFileSync(args[args.indexOf('-o') + 1], 'sample archive');
if (command === 'sha256sum') {
  let input = '';
  process.stdin.on('data', c => input += c).on('end', () => {
    if (!input.startsWith('d230f13842f60f782a8645f9c813f8f845bf36089ea7289f28c48f17979313f1  ')) process.exit(2);
    process.exit(process.env.BAD_CHECKSUM === '1' ? 1 : 0);
  });
}\n`;
    for (const command of ['curl', 'sha256sum', 'unzip']) await writeFile(join(bin, command), stub, { mode: 0o755 });
    const sdk = join(temp, 'sdk');
    const env = { ...process.env, PATH: `${bin}:${process.env.PATH}`, TRACE: trace, ANDROID_HOME: join(temp, 'wrong-sdk') };
    const script = join(temp, 'install-platform-tools.sh');
    await writeFile(script, (await read('scripts/install-platform-tools.sh')).replaceAll('/opt/toolchain/android-sdk', sdk));
    const failure = spawnSync('bash', [script], { env: { ...env, BAD_CHECKSUM: '1' }, encoding: 'utf8' });
    assert.notEqual(failure.status, 0, 'Bad checksum must fail');
    let calls = (await readFile(trace, 'utf8')).trim().split('\n').map(JSON.parse);
    assert.deepEqual(calls.map(call => call.command), ['curl', 'sha256sum']);
    await writeFile(trace, '');
    const success = spawnSync('bash', [script], { env: { ...env, BAD_CHECKSUM: '0' }, encoding: 'utf8' });
    assert.equal(success.status, 0, success.stderr);
    calls = (await readFile(trace, 'utf8')).trim().split('\n').map(JSON.parse);
    assert.deepEqual(calls.map(call => call.command), ['curl', 'sha256sum', 'unzip']);
    assert.ok(calls[0].args.includes('https://dl.google.com/android/repository/platform-tools_r37.0.1-linux.zip'));
    assert.deepEqual(calls[2].args.slice(-2), ['-d', sdk], 'Ambient ANDROID_HOME must not redirect the pinned installation');
  } finally { await rm(temp, { recursive: true, force: true }); }
});
