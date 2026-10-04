# Isolated Paseo with Pi

This image selects the toolchain in `defaults/mise.toml` and `defaults/mise.lock`. It installs locked npm applications from `defaults/apps/package-lock.json`. The selected Pi version is 1.0.2. The selected Paseo version is 0.10.3. The image has one repository, one container, and two Figma MCP account entries.

## Private host setup

Use rootless Docker. Keep the named `paseo_home` volume and the existing `workspace`, `cache`, `config`, and `data` bind mounts. The root filesystem is read-only. The container has no Docker socket, no added capabilities, and no privileged mode. Published ports use the host loopback interface.

Create `~/.config/isolated-paseo/secrets` with mode 0700. Copy the three examples in `defaults/secrets/` to that directory without the `.example` suffix. Put real values in those files. Set each file to mode 0600. Use exactly one of `FIGMA_API_KEY` and `FIGMA_OAUTH_TOKEN` in each Figma file. Both account credentials are accessible to every agent in this container. Account names do not isolate credentials.

Copy `.env.example` to `.env`. Set absolute private file paths for `PASEO_PASSWORD_ENV_FILE`, `FIGMA_WORKPLACE_A_SECRET_FILE`, and `FIGMA_WORKPLACE_B_SECRET_FILE`. Set `.env` to mode 0600. The password is still visible to host operators who can inspect container environment variables. Do not put credential values in `.env` or the repository. Set the four bind paths to the existing host directories before replacing an installation.

Run `docker compose config --quiet` on the host. Do not print a resolved Compose configuration with credentials. Check rootless Docker access, file permissions, and real bind path identities. Back up Pi, Paseo, GitHub CLI, Azure CLI, and home state before deployment. Preserve the previous image and configuration for rollback. Then build the image with `docker compose build`. Do not recreate a live container until deployment is approved.

After approval, use `docker compose up -d` and `bash scripts/smoke-check.sh`. Do not run `docker compose down -v`. A container recreation interrupts running agents, although saved state persists in the mounts. The Docker host must verify image installation and actual runtime behavior. An Android project must pass its Gradle wrapper checks with Java 25 before Android build compatibility is claimed.

## Defaults and migration

The entrypoint installs missing reviewed defaults into `/home/node/.pi/agent`, `/home/node/.agents/skills`, and `/home/node/.gradle`. It does not replace existing files. It merges the two Figma entries into an existing MCP configuration without replacing other servers. It preserves authentication, sessions, agent records, models, and supervision runtime state. The supervision extension still activates only for its specified parent agent. Existing customized files need manual review and explicit replacement if you want template updates. In particular, the old supervision `monitor.mjs` imports Paseo 0.10.2 from the old global npm path and rejects 0.10.3. Before deployment, back up `config/supervision/monitor.mjs` and `config/supervision/delivery.test.mjs`. Compare each file with `defaults/pi/supervision/`. Install the reviewed versions only after explicit operator approval. Do not replace `config/supervision/state/` or the restricted extension. Inspect and merge `config/settings.json` and `config/mcp.json` instead of overwriting them. The checked-in skill set contains text assets only. The upstream binary trace processor is not copied.

Pi starts the two Figma MCP servers with `--no-telemetry`, `--skip-image-downloads`, and an explicit `--env` path. The account secret files are mounted at `/run/secrets/figma-workplace-a` and `/run/secrets/figma-workplace-b`. This does not prove Figma authorization. Validate each account using a known file that account can read. The Android CLI must run with `--no-metrics` on its first invocation. Do not run `android init` while `/root` is read-only.

The selected Android SDK includes command-line tools 23.0, platform tools, Android platform 37.2, and build tools 37.0.0. No Android Studio, emulator, system image, or global Gradle is installed. Run each project's Gradle wrapper.

## Host user service

The unit template is `defaults/systemd/isolated-paseo.service`. Its private environment template is `defaults/systemd/service.env.example`. Verify that host `/usr/bin/docker`, Compose, rootless Docker access, the actual `cf tunnels run` executable, the Cloudflare credential location, and mise shims work without shell activation. Configure `DOCKER_HOST` when the rootless daemon requires it. Use absolute values in `service.env`. The tunnel UUID is an identifier, not a credential.

Install the unit into `~/.config/systemd/user` only after separate deployment approval. Do not enable or start it without that approval. The unit couples container and tunnel lifetimes: stopping it runs `docker compose down`; tunnel failure can interrupt agents during recovery. Five failed starts hit the configured limit. Validate the unit with host `systemd-analyze --user verify` and test startup and recovery under the host user manager. Changing lingering needs separate approval.

## Acceptance and rollback

Container-side syntax, isolated dependency, and synthetic-secret checks are not substitutes for Docker and host checks. On the host, run the smoke check, inspect actual mounts and daemon environment, verify the selected CLI and SDK versions, test a new Paseo agent's environment, and resume an existing Pi session. Verify provider login, saved agents, both Figma accounts, and actual Cloudflare tunnel operation. Preserve initial state, exact actions, expected observable results, and failure conditions for each manual check. Record actual results.

Before each host test, record the active image ID and the existing session and agent counts. After an approved recreation, run `docker compose config --quiet`, `bash scripts/smoke-check.sh`, and `docker compose exec -T paseo /opt/toolchain/bin/mise -C /opt/toolchain exec -- sh -c 'test -d "$JAVA_HOME" && test "$ANDROID_HOME" = /opt/toolchain/android-sdk && command -v java && command -v cargo'`. A failure is any missing key, wrong path, failed smoke assertion, or lost saved session. Start a disposable new agent. Confirm that it can run `java -version`, `cargo --version`, and `pi --version` without shell activation. Record output and stop the disposable agent. For each Figma entry, request the same known permitted file through the MCP connection and record whether it returns that file. Any authorization error or wrong account response is a failure. Do not print token values. On the host, check `systemd-analyze --user verify ~/.config/systemd/user/isolated-paseo.service`. After separate activation approval, start and stop the user service, verify rootless Docker access and `cf tunnels run`, and record the container and tunnel status. Failure includes an unavailable daemon, failed tunnel, or unexpected container shutdown. Check logout and reboot only if lingering is approved.

For rollback, stop the new service only with deployment approval. Restore the previous Compose configuration and image. Run `docker compose up -d` without `-v`. Do not replace or delete private volumes or host state. Verify login and saved sessions again.

## Known installation gates

The `fffind` and `ffgrep` implementation and an authoritative RTK skill source have not been identified. Do not replace them with other search commands or claim they work. Azure CLI 2.90.0 and its isolated Python 3.14.8 environment passed an isolated version check. Rust 1.99.0 installed with rustup 1.29.1 in a temporary installation. Its behavior with image-managed read-only rustup state, and the full image build, remain host acceptance gates until verified. The runtime image keeps image-managed Rust toolchains under `/opt/toolchain/rustup`; do not update rustup inside the running read-only container.
