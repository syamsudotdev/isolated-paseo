# Isolated Paseo with Pi

This setup installs Paseo `0.10.2` and Pi `1.0.0` on `node:24-bookworm-slim`.
Node 24 meets Pi's requirement of Node >=22.19.
Paseo uses its native Pi provider to connect to Pi.
The Paseo server package includes the web user interface (UI).
`tini` runs as process 1 and starts `paseo daemon run`.

## Start

The host is the computer that runs Docker.
The defaults allow 12 CPUs and 20 GiB of memory.
One GiB equals 1073741824 bytes.
The 28 GiB memory-plus-swap limit includes memory and swap.
It does not provide 28 GiB of additional swap.
Swap is memory storage on disk.
Its availability depends on the host.

1. Install Docker with Docker Compose on the host.
2. Check that the host has sufficient resources.
3. Run the following commands from this project directory.
4. Copy `.env.example` to `.env`.
5. Replace `PASEO_PASSWORD` with a long random password.
6. Reduce the limits in `.env` if necessary.
7. Create the four host directories.

```sh
cp .env.example .env
# Edit .env. Replace PASEO_PASSWORD with a long random password.
mkdir -p workspace cache config data
```

The service runs as the `node` user.
Its user ID (UID) and group ID (GID) are `1000:1000`.
A bind mount makes a host directory available at a container path.
If you change the bind mount paths in `.env`, use those host directories instead.

**Warning:** The ownership command below changes the owners of the four directories.
Use it only for new, empty directories.
Do not recursively change ownership of existing files without checking their contents and users.

1. Check ownership of all four host directories.
2. Set their owner to `1000:1000` only if they are new and empty.

```sh
ls -ldn workspace cache config data
sudo chown 1000:1000 workspace cache config data
```

Keep `.env` private.
The `.gitignore` rules allow Git to track only the approved project files.
These rules exclude local credentials and state directories.
This setup adds no API credentials.

1. Validate the Compose configuration.
2. Build the image.
3. Start the service.
4. Run the smoke check.

```sh
docker compose config --quiet
docker compose build
docker compose up -d
bash scripts/smoke-check.sh
```

1. Open `http://127.0.0.1:6767` on the Docker host.
2. Select the local UI direct connection.
3. Enter the password from `.env`.
4. Use `PASEO_PORT` instead of 6767 if you changed the daemon port.

The ports use loopback, the host's local-only network interface.
Ports 3000, 3001, 5173, and 8080 support workspace applications.
Port 6767 supports Paseo by default.
These ports can conflict with other host services.
Start application servers on `0.0.0.0` inside the container to make them accessible through the published ports.
The setup excludes port 19432, fixed host mappings, ADB settings, and Plannotator settings.

## State and login

A named volume is storage that Docker manages separately from the container.
It retains files after the container stops.

| Storage | Container path | Purpose |
| --- | --- | --- |
| Named `paseo_home` volume | `/home/node` | General home files |
| `./cache` bind mount | `/home/node/.cache` | Cache, including npm cache |
| `./workspace` bind mount | `/workspace` | Project files |
| `./config` bind mount | `/home/node/.pi/agent` | Pi settings, credentials, and sessions |
| `./data` bind mount | `/home/node/.paseo` | Paseo state |

These paths are not OpenCode configuration paths.
You can change each bind mount path in `.env`.
Bind mounts hide the image directories at their container paths.
Host directory permissions must allow user and group IDs `1000:1000` to write.

The image prepares home directories owned by the `node` user.
Docker copies image files into a new, empty named home volume.

1. Check ownership after the first start.
2. Check write access to the listed paths.
3. Start Pi interactively as the configured `node` user.

```sh
docker compose exec -T paseo sh -c 'id; ls -ldn /home/node /home/node/.cache /home/node/.pi/agent /home/node/.paseo; for path in /home/node /home/node/.cache /home/node/.pi/agent /home/node/.paseo /workspace; do test -w "$path" || exit 1; done'
docker compose exec paseo pi
```

1. Complete Pi's interactive login procedure.
2. Work in `/workspace`.
3. Create a session to test saved state.
4. Run `docker compose restart`.
5. Check that login and the saved session still work.

`docker compose down` preserves saved state.
**Warning:** `docker compose down -v` deletes the named home volume and its files.
It does not delete the host bind mount directories.

### Manual migration from the previous layout

The previous image used `/home/paseo`.
This image uses `/home/node` and separate Pi and Paseo bind mounts.
The setup does not migrate existing state automatically.

**Warning:** Do not delete or reuse the old volume before checking its contents and ownership.
Keep the backup until login and saved-session checks pass.

1. Stop the old service.
2. Locate its actual named volume.
3. Back up that volume.
4. Back up existing host state.
5. Copy the old `.pi/agent` contents into the configured `config` host directory.
6. Copy the old `.paseo` contents into the configured `data` host directory.
7. Copy required cache files into `cache`.
8. Preserve other required home files separately.
9. Check ownership of the copied files.
10. Check permissions of the copied files.
11. Verify login with the new setup.
12. Verify the saved sessions before deleting any old state.

### Existing home volume owned by root

The root user has user ID 0.
Image build-time ownership does not repair an existing named volume.
The repair below changes ownership only inside the named home volume.
It excludes the nested host bind mounts.
A Linux capability is a kernel permission.
This repair temporarily adds capabilities to change ownership.

**Warning:** Use this repair only for a home volume owned by root.
Inspect the volume before changing ownership.
The repair does not fix host `cache`, `config`, or `data` ownership.
It does not repair the workspace.

1. Stop the service.
2. Run the explicit home ownership repair.
3. Start the service again.

```sh
docker compose stop paseo
docker compose run --rm --no-deps --user 0:0 --cap-add CHOWN --cap-add DAC_OVERRIDE --entrypoint sh paseo -c 'find /home/node -path /home/node/.cache -prune -o -path /home/node/.pi/agent -prune -o -path /home/node/.paseo -prune -o -exec chown -h 1000:1000 {} +'
docker compose up -d
```

1. Inspect host directory ownership separately.
2. Correct host ownership only after checking the affected files.
3. Repeat the ownership checks above.
4. Repeat the write-access checks above.

## Gradle settings

The image installs `defaults/gradle.properties` at `/home/node/.gradle/gradle.properties`.
It copies the original environment's three settings but omits `-Djava.io.tmpdir`.
Java therefore uses its default temporary directory.
Docker copies this node-owned file into a new, empty named home volume.
Rebuilding does not update an existing home volume.
The smoke check requires a readable settings file and a writable `.gradle` directory.
It permits customized settings.

**Warning:** The following command overwrites existing settings.
Do not replace personalized settings unless you intend to discard them.
If ownership prevents writing, repair home ownership first.

1. Back up existing settings before replacement.
2. Check the backup.
3. Explicitly choose to replace the settings.
4. Run the following command from this project directory.

```sh
docker compose exec -T paseo sh -c 'mkdir -p "$HOME/.gradle" && cat > "$HOME/.gradle/gradle.properties"' < defaults/gradle.properties
```

The command creates `.gradle` and writes the file as the configured `node` user.
The Java heap stores application objects.
Gradle has a 10 GiB heap limit.
The Kotlin daemon has a 4 GiB heap limit.
Java metaspace stores class metadata.
Each process has a 1 GiB metaspace limit.
Native memory, Pi, and Paseo need additional memory within the container's 20 GiB limit.
Adjust these settings or the container memory limits for your workload.
This setup adds configuration only.
It does not install Java or Gradle.
No Gradle build has been verified.

### Test process settings

The image installs the unchanged `defaults/init.d/test-forks.gradle` at `/home/node/.gradle/init.d/test-forks.gradle`.
Gradle automatically loads scripts in the user's `.gradle/init.d` directory.
This script sets `maxParallelForks = 1` and `forkEvery = 2` for each `Test` task.
Each task uses at most one parallel test process.
It replaces that process after two test classes.

Docker copies the script into a new, empty named home volume.
An existing volume remains unchanged.

**Warning:** The following command overwrites an existing script at the target path.

1. Back up any existing script at that path.
2. Check the backup.
3. Explicitly choose to install or replace the script.
4. Run the following command from this project directory.

```sh
docker compose exec -T paseo sh -c 'mkdir -p "$HOME/.gradle/init.d" && cat > "$HOME/.gradle/init.d/test-forks.gradle"' < defaults/init.d/test-forks.gradle
```

The command writes as the configured `node` user.
The smoke check requires a readable script and a writable `init.d` directory.
It permits customized script contents.
Test execution remains unverified.

## Isolation limits

The image filesystem is read-only.
The home volume and four host bind mounts remain writable.
The `/tmp` and `/run` paths also remain writable.
The container drops all Linux capabilities.
It enables `no-new-privileges` to prevent processes from gaining additional privileges.
It provides an interactive terminal.

A tmpfs is a temporary filesystem backed by memory.
Its size limit is a maximum, not reserved memory.
CPU, memory, total memory-plus-swap, process count, and tmpfs sizes have configurable finite limits.
Only `/tmp` explicitly enables execution.

The `/tmp` default is 12 GiB.
This value matches capacity measured in the original implementation environment, not every deployment.
That capacity was 12884901888 bytes, not the measured free space.
The conversion is 1 GiB = 1073741824 bytes.
The `/run` default remains 1 GiB from the reference.

The tmpfs size limits apply only to `/tmp` and `/run`.
There is no general workspace disk quota.
Named volumes and host bind mounts can fill their host filesystem.

The setup does not mount the Docker socket.
It does not use privileged mode or broad host mounts.
An agent can read, change, or delete files in the mounted directories.
Pi credentials and Paseo state are sensitive.
Mount only the intended project.
Outbound internet access remains enabled.
Container isolation does not provide a complete security boundary against hostile code.

## Verification status

The smoke check validates Compose configuration, user and group IDs, Pi version, and write access to state paths.
It checks actual isolation settings, exact published ports, configured bind mount sources, and resource limits.
It also checks the HTTP root UI.
It does not use an undocumented health endpoint.

Docker is unavailable in the implementation environment.
Build success, installed package behavior, new-volume ownership, and all runtime checks remain pending.
RPC means remote procedure call.
Pi login, native provider discovery, RPC behavior, and saved-session persistence remain unverified.

1. Verify Pi login manually.
2. Verify native provider discovery manually.
3. Verify the `get_state` RPC manually.
4. Verify saved-session persistence manually.

The automated script does not include RPC or provider-inspection commands.
Gradle build and test execution also remain unverified.

## Sources

- [Reference isolation setup at the selected commit](https://github.com/syamsudotdev/openchamber-isolated/tree/aa346ff3095d6a4061906174508ac3feda8454d9)
- [Paseo source](https://github.com/getpaseo/paseo/tree/v0.10.2)
- [Paseo Docker documentation](https://paseo.sh/docs/docker)
- [Pi quickstart](https://pi.dev/docs/latest/quickstart)
