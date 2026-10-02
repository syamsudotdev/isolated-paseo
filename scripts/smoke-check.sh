#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

docker compose config --quiet
container=$(docker compose ps -q paseo)
[[ -n "$container" ]] || { echo 'Paseo is not running.' >&2; exit 1; }
[[ "$(docker compose exec -T paseo id -u)" == 1000 ]]
[[ "$(docker compose exec -T paseo id -g)" == 1000 ]]
version=$(docker compose exec -T paseo pi --version)
[[ "$version" == '1.0.0' ]] || { echo "Unexpected Pi version: $version" >&2; exit 1; }
docker compose exec -T paseo sh -c 'for path in /home/node /home/node/.cache /home/node/.pi/agent /home/node/.paseo /workspace; do test -w "$path" || exit 1; done'
docker compose exec -T paseo sh -c 'test -d "$HOME/.gradle" && test -w "$HOME/.gradle" && test -f "$HOME/.gradle/gradle.properties" && test -r "$HOME/.gradle/gradle.properties"'
docker compose exec -T paseo sh -c 'test -d "$HOME/.gradle/init.d" && test -w "$HOME/.gradle/init.d" && test -f "$HOME/.gradle/init.d/test-forks.gradle" && test -r "$HOME/.gradle/init.d/test-forks.gradle"'

# Use Node from the image. No host JSON parser is required.
expected=$(docker compose config --format json | docker compose exec -T paseo node -e '
let input = "";
process.stdin.on("data", chunk => input += chunk);
process.stdin.on("end", () => {
  const config = JSON.parse(input);
  const service = config.services.paseo;
  const targets = ["/home/node/.cache", "/workspace", "/home/node/.pi/agent", "/home/node/.paseo"];
  const binds = {};
  for (const target of targets) {
    const mount = service.volumes.find(m => m.target === target);
    if (mount?.type !== "bind" || !mount.source || mount.read_only) throw new Error("Invalid bind: " + target);
    binds[target] = mount.source;
  }
  const home = service.volumes.find(m => m.target === "/home/node");
  if (service.volumes.length !== 5 || home?.type !== "volume" || home.source !== "paseo_home" || home.volume?.nocopy) throw new Error("Invalid home volume or mount scope");
  const daemon = service.ports.find(p => p.target === 6767);
  if (!daemon?.published) throw new Error("Missing daemon port");
  console.log(JSON.stringify({ binds, home: config.volumes.paseo_home.name, port: String(daemon.published) }));
});')

docker inspect "$container" | docker compose exec -T -e SMOKE_EXPECTED="$expected" paseo node -e '
let input = "";
process.stdin.on("data", chunk => input += chunk);
process.stdin.on("end", () => {
  const [c] = JSON.parse(input);
  const expected = JSON.parse(process.env.SMOKE_EXPECTED);
  const h = c.HostConfig;
  const check = (ok, message) => { if (!ok) throw new Error(message); };
  check(c.State.Running, "Container is not running");
  check(c.Config.User === "node", "Unexpected configured user");
  check(c.Config.WorkingDir === "/workspace", "Unexpected working directory");
  check(c.Config.OpenStdin && c.Config.Tty, "Missing interactive terminal");
  check(h.ReadonlyRootfs, "Root filesystem is writable");
  check(!h.Privileged, "Privileged mode is enabled");
  check(h.CapDrop?.includes("ALL") && !h.CapAdd?.length, "Unexpected capabilities");
  check(h.SecurityOpt?.some(x => /^no-new-privileges(?::true)?$/.test(x)), "Missing no-new-privileges");
  check(h.Memory > 0 && h.MemorySwap >= h.Memory && h.NanoCpus > 0 && h.PidsLimit > 0, "Invalid resource limits");
  const ports = { "3000/tcp": "3000", "3001/tcp": "3001", "5173/tcp": "5173", "8080/tcp": "8080", "6767/tcp": expected.port };
  check(Object.keys(h.PortBindings || {}).length === 5, "Unexpected published ports");
  for (const [port, host] of Object.entries(ports)) {
    const bindings = h.PortBindings[port];
    check(bindings?.length === 1 && bindings[0].HostIp === "127.0.0.1" && bindings[0].HostPort === host, "Unexpected binding: " + port);
    const active = c.NetworkSettings.Ports[port];
    check(active?.length === 1 && active[0].HostIp === "127.0.0.1" && active[0].HostPort === host, "Unexpected active binding: " + port);
  }
  const home = c.Mounts.find(m => m.Destination === "/home/node");
  check(home?.Type === "volume" && home.RW && home.Name === expected.home, "Unexpected named home volume");
  for (const [target, source] of Object.entries(expected.binds)) {
    const mount = c.Mounts.find(m => m.Destination === target);
    check(mount?.Type === "bind" && mount.RW && mount.Source === source, "Unexpected bind: " + target);
  }
  const targets = ["/home/node", ...Object.keys(expected.binds), "/tmp", "/run"];
  check(c.Mounts.every(m => targets.includes(m.Destination)), "Unexpected mount destination");
  check(Object.keys(h.Tmpfs || {}).length === 2, "Unexpected tmpfs mounts");
  for (const target of ["/tmp", "/run"]) {
    const options = (h.Tmpfs[target] || "").split(",");
    check(["rw", "nosuid", "nodev"].every(x => options.includes(x)), "Unsafe tmpfs: " + target);
    check(options.some(x => /^size=[1-9][0-9]*[kKmMgG]?$/.test(x)), "Invalid tmpfs size: " + target);
    check(target === "/tmp" ? options.includes("exec") && !options.includes("noexec") : !options.includes("exec"), "Unexpected execution option: " + target);
  }
  console.log("Container isolation checks passed.");
});'

docker compose exec -T paseo node -e '
fetch("http://127.0.0.1:6767/", { signal: AbortSignal.timeout(10000) })
  .then(response => { if (!response.ok) throw new Error("HTTP root returned " + response.status); console.log("HTTP root UI responded."); })
  .catch(error => { console.error(error.message); process.exitCode = 1; });'
echo 'Smoke checks passed. Manual RPC, provider, login, and session checks remain pending.'
