# Isolated Paseo with Pi

This portable setup follows the [reference at commit `aa346ff3095d6a4061906174508ac3feda8454d9`](https://github.com/syamsudotdev/openchamber-isolated/tree/aa346ff3095d6a4061906174508ac3feda8454d9). It installs Paseo `0.10.2` and Pi `1.0.0` on `node:24-bookworm-slim`. Node 24 meets Pi's requirement of Node >=22.19. Paseo uses its native Pi provider. Its server package bundles the web UI. `tini` runs as process 1 and starts `paseo daemon run`.

## Start

Install Docker with Docker Compose on the host. The defaults allow 12 CPUs and 20 GiB of memory. Use a host with sufficient resources, or reduce the limits in `.env`. The 28 GiB memory-plus-swap limit is a total limit, not 28 GiB of additional swap. Swap availability depends on the host.

Run these commands from this directory:

```sh
cp .env.example .env
# Edit .env. Replace PASEO_PASSWORD with a long random password.
mkdir -p workspace cache config data
```

The service runs as `node`, with UID/GID `1000:1000`. Check ownership of all four host directories. For new, empty directories, explicitly set their owner:

```sh
ls -ldn workspace cache config data
sudo chown 1000:1000 workspace cache config data
```

If you change the bind paths in `.env`, create and check those paths instead. Do not recursively change ownership of existing host files without checking their contents and users. Keep `.env` private. The Git whitelist excludes credentials and all local state directories. No API credentials are added.

```sh
docker compose config --quiet
docker compose build
docker compose up -d
bash scripts/smoke-check.sh
```

Open `http://127.0.0.1:6767` on the Docker host. Use the local UI direct connection and the password from `.env`. Use `PASEO_PORT` if you change the daemon port.

Ports 3000, 3001, 5173, and 8080 also bind to host loopback for workspace applications. These ports can conflict with other host services. Start application servers on `0.0.0.0` inside the container so the published ports can reach them. No port 19432, fixed host mapping, ADB setting, or Plannotator setting is included.

## State and login

| Storage | Container path | Purpose |
| --- | --- | --- |
| Named `paseo_home` volume | `/home/node` | General home files |
| `./cache` bind | `/home/node/.cache` | Cache, including npm cache |
| `./workspace` bind | `/workspace` | Project files |
| `./config` bind | `/home/node/.pi/agent` | Pi settings, credentials, and sessions |
| `./data` bind | `/home/node/.paseo` | Paseo state |

These paths are not OpenCode configuration paths. Each bind path is configurable in `.env`. Bind mounts hide the corresponding image directories. Their host ownership must permit UID/GID `1000:1000` to write.

The image prepares node-owned home directories. A fresh named home volume uses normal Docker copy-up. Verify ownership and writable paths after the first start:

```sh
docker compose exec -T paseo sh -c 'id; ls -ldn /home/node /home/node/.cache /home/node/.pi/agent /home/node/.paseo; for path in /home/node /home/node/.cache /home/node/.pi/agent /home/node/.paseo /workspace; do test -w "$path" || exit 1; done'
docker compose exec paseo pi
```

Use Pi's interactive login flow. Work in `/workspace`. Verify that a real session survives `docker compose restart`. `docker compose down` preserves state. `docker compose down -v` deletes the named home volume, but does not delete host bind directories.

### Manual migration from the previous layout

The previous image used `/home/paseo`. This image uses `/home/node` and separate Pi and Paseo binds. There is no automatic migration. Stop the old service before migration. Back up its named volume and existing host state. Locate the actual old volume before any change.

Copy the old `.pi/agent` contents into the configured `config` host directory. Copy the old `.paseo` contents into the configured `data` host directory. Copy any required cache files into `cache`. Preserve other required home files separately. Check ownership and permissions of the copied files. Keep the backup until login and session checks pass. Do not delete the old volume or reuse it without inspecting its contents and ownership.

### Existing root-owned home volume

Build-time ownership does not repair an existing named volume. For a root-owned volume, stop the service. The following explicit repair changes only the named home volume. It excludes the nested host binds:

```sh
docker compose stop paseo
docker compose run --rm --no-deps --user 0:0 --cap-add CHOWN --cap-add DAC_OVERRIDE --entrypoint sh paseo -c 'find /home/node -path /home/node/.cache -prune -o -path /home/node/.pi/agent -prune -o -path /home/node/.paseo -prune -o -exec chown -h 1000:1000 {} +'
docker compose up -d
```

This repair temporarily adds capabilities. Host `cache`, `config`, and `data` ownership requires a separate, explicit host action. It does not repair the workspace. Repeat the ownership and writable-path checks above.

## Gradle settings

The image includes `defaults/gradle.properties` at `/home/node/.gradle/gradle.properties`. It copies this container's three settings but omits `-Djava.io.tmpdir` so Java uses its default temporary directory. A fresh named home volume receives this node-owned file through normal copy-up. Rebuilding does not update an existing home volume. The smoke check requires a readable settings file and a writable `.gradle` directory. It permits customized settings.

For an existing home, back up its current settings before replacement. Do not run the replacement command until you have checked the backup and chosen to replace the settings. Run the following command from this project directory. It creates `.gradle` and writes the file as the configured nonroot user:

```sh
docker compose exec -T paseo sh -c 'mkdir -p "$HOME/.gradle" && cat > "$HOME/.gradle/gradle.properties"' < defaults/gradle.properties
```

This command overwrites existing settings. If ownership prevents writing, inspect and repair the home ownership first. Do not replace personalized settings unless you intend to discard them.

Gradle has a 10 GiB heap limit. The Kotlin daemon has a 4 GiB heap limit. Each also has a 1 GiB metaspace limit. Native memory, Pi, and Paseo need additional memory within the container's 20 GiB limit. Adjust these settings or the container memory limits for your workload. This setup adds configuration only. It does not install Java or Gradle. No Gradle build has been verified.

### Test process settings

The image also includes the unchanged `defaults/init.d/test-forks.gradle` at `/home/node/.gradle/init.d/test-forks.gradle`. Gradle automatically loads scripts in the user home's `.gradle/init.d` directory. This script configures each `Test` task with `maxParallelForks = 1` and `forkEvery = 2`. Each task uses at most one parallel test process and replaces that process after two test classes.

Only a fresh named home volume receives the image's script through copy-up. An existing volume remains unchanged. To install it in an existing home, first back up any existing script at that path. Check the backup and explicitly choose to install or replace the script before running this command from the project directory:

```sh
docker compose exec -T paseo sh -c 'mkdir -p "$HOME/.gradle/init.d" && cat > "$HOME/.gradle/init.d/test-forks.gradle"' < defaults/init.d/test-forks.gradle
```

This command writes as the configured nonroot user and overwrites an existing file. The smoke check requires a readable script and a writable `init.d` directory. It permits customized script contents. Test execution remains unverified.

## Isolation limits

The image filesystem is read-only. The home volume, four scoped host binds, `/tmp`, and `/run` remain writable. All Linux capabilities are dropped. `no-new-privileges` is enabled. The container has an interactive terminal. CPU, memory, total memory-plus-swap, process count, and tmpfs sizes have configurable finite limits. Only `/tmp` explicitly enables execution.

The `/tmp` default is 12 GiB. It matches the current container's measured capacity of 12884901888 bytes, not its free space (1 GiB = 1073741824 bytes). The `/run` default remains 1 GiB from the reference. A tmpfs size is a maximum, not reserved memory.

The tmpfs size limits apply only to `/tmp` and `/run`. There is no general workspace disk quota. Named volumes and host binds can fill their host filesystem.

There is no Docker socket mount, privileged mode, or wide host mount. An agent can read, change, or delete files in the mounted directories. Pi credentials and Paseo state are sensitive. Mount only the intended project. Internet egress remains enabled. Container isolation is not a complete security boundary against hostile code.

## Verification status

The smoke check validates Compose configuration, UID/GID, Pi version, writable state paths, actual isolation settings, exact published ports, configured bind sources, resource limits, and the HTTP root UI. It does not use an undocumented health endpoint.

Docker is unavailable in the implementation environment. Build success, installed package behavior, fresh-volume ownership, and all runtime checks remain pending. Manually verify Pi login, native provider discovery, the `get_state` RPC, and session persistence. RPC and provider-inspection commands remain outside the automated script.

## Sources

- [Reference isolation setup at the selected commit](https://github.com/syamsudotdev/openchamber-isolated/tree/aa346ff3095d6a4061906174508ac3feda8454d9)
- [Paseo source](https://github.com/getpaseo/paseo/tree/v0.10.2)
- [Paseo Docker documentation](https://paseo.sh/docs/docker)
- [Pi quickstart](https://pi.dev/docs/latest/quickstart)
