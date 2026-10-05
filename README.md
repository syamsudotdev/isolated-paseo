# Isolated Paseo with Pi

This image selects the toolchain in `defaults/mise.toml` and `defaults/mise.lock`. It installs locked npm applications from `defaults/apps/package-lock.json`. The selected Pi version is 1.0.2. The selected Paseo version is 0.10.3. It loads pi-lens 4.3.0 as a local Pi package, including its extension and skills. It preinstalls the pinned language servers listed in `scripts/install-language-servers.sh`. TypeScript Language Server 6.0.1 remains installed, but the global fallback uses the image-owned adapter for the native TypeScript 7.0.2 language server. The Kotlin server is an Alpha release. The image has one repository and one container. Configure any number of named Figma MCP accounts.

## Private host setup

Use rootless Docker. Keep the named `paseo_home` volume and the existing `workspace`, `cache`, `config`, and `data` bind mounts. The root filesystem is read-only. The container has no Docker socket, no added capabilities, and no privileged mode. Published ports use the host loopback interface.

Create `~/.config/isolated-paseo/secrets` and its `figma` subdirectory with mode 0700. Copy `defaults/secrets/paseo-password.env.example` to the private parent directory as `paseo-password.env`. Copy `defaults/secrets/figma.env.example` into the private `figma` directory once per account. Choose meaningful filenames, such as `my-company.env` and `my-other-company.env`. Put real values in those files. Set each file to mode 0600. Use `FIGMA_API_KEY` for a personal access token. Use `FIGMA_OAUTH_TOKEN` for an OAuth token. Set exactly one of these variables in each Figma file. Use a different regular file for each account. Keep only Figma credential files in the mounted directory. Do not use symlinks. All Figma account credentials are accessible to every agent in this container. Account names do not isolate credentials.

Copy `.env.example` to `.env`. Set `PASEO_PASSWORD_ENV_FILE` to the absolute private password file path. Set `FIGMA_SECRETS_DIR` to the absolute private Figma directory path. Set `.env` to mode 0600. The password is still visible to host operators who can inspect container environment variables. Do not put credential values in `.env` or the repository. Set the four bind paths to the existing host directories before replacing an installation.

Run `docker compose config --quiet` on the host. Do not print a resolved Compose configuration with credentials. Check rootless Docker access, file permissions, and real bind path identities. Back up Pi, Paseo, GitHub CLI, Azure CLI, and home state before deployment. Preserve the previous image and configuration for rollback. Then build the image with `docker compose build`. Do not recreate a live container until deployment is approved.

After approval, use `docker compose up -d` and `bash scripts/smoke-check.sh`. Do not run `docker compose down -v`. A container recreation interrupts running agents, although saved state persists in the mounts. The Docker host must verify image installation and actual runtime behavior. An Android project must pass its Gradle wrapper checks with Java 25 before Android build compatibility is claimed.

## Defaults and migration

The entrypoint installs missing reviewed defaults into `/home/node/.pi/agent`, `/home/node/.agents/skills`, and `/home/node/.gradle`. It does not replace existing files. It preserves existing MCP entries. A fresh MCP configuration has no predefined accounts. It preserves authentication, sessions, agent records, models, and supervision runtime state. The supervision extension still activates only for its specified parent agent. Existing customized files need manual review and explicit replacement if you want template updates. In particular, the old supervision `monitor.mjs` imports Paseo 0.10.2 from the old global npm path and rejects 0.10.3. Before deployment, back up `config/supervision/monitor.mjs` and `config/supervision/delivery.test.mjs`. Compare each file with `defaults/pi/supervision/`. Install the reviewed versions only after explicit operator approval. Do not replace `config/supervision/state/` or the restricted extension. Inspect and merge `config/settings.json` and `config/mcp.json` instead of overwriting them. The checked-in skill set contains text assets only. The upstream binary trace processor is not copied.

## Native roles and official Paseo skills

The four official skills `paseo`, `paseo-handoff`, `paseo-advisor`, and `paseo-committee` are unchanged copies from the Paseo `v0.10.3` release. `defaults/paseo/provenance.json` records the commit and SHA-256 hashes. Official skills define lifecycle semantics. `defaults/pi/roles/orchestrator.md` defines local approval, ownership, task records, retry limits, and review policy. `defaults/pi/roles/specialists.md` defines role duties. There is no custom role extension or second lifecycle manager.

`defaults/paseo/config.json` is a native configuration template, not an automatically installed configuration. After separate configuration approval, use it for a fresh disposable or new installation. For an existing installation, back up the Paseo `config.json`. Review the `agents.providers` and `daemon.agentProfiles` entries manually. Add only the approved missing entries. Preserve existing providers, profiles, authentication, sessions, and state. Do not replace the whole file or automatically merge it. Existing Designer, Observer, and Council profiles remain operator-owned.

The template supplies six profiles. scout uses `openai/gpt-6-luna` with low thinking. researcher uses that model with max thinking. worker and worker-recovery use `openai/gpt-6.1-sol` with low thinking. reviewer uses that model with medium thinking. oracle uses that model with high thinking. The parent keeps the existing Pi model defaults. Profile notes describe selection only. The custom providers extend `pi` and bind role instructions, required skills, and tool allowlists through command argument arrays.

The parent and all six profiles explicitly load the immutable FFF extension with `--fff-mode tools-only`. The parent retains configured extensions, including fixed-parent supervision. Children use `--no-extensions` and explicit FFF loading. Writers also load the installed Lens extension and skills. Native Pi `--tools` filters built-in, extension, and custom tools. Child allowlists exclude Paseo management tools. Read-only roles have inspection tools only. Writer `bash` still permits broad command execution. These allowlists are not an operating-system sandbox. Approval, one writer per workspace, retry counters, and final acceptance are instruction policy. Fork, inherited context, deadlines, and paid model execution are not established by this template.

Inherited and task-specific skills remain discoverable. The parent must supply required skill paths in the task contract and check their compatibility with allowed tools. researcher has local inspection tools but no configured external web tool. Report this gap. Do not claim external research capability until an approved existing web extension and its explicit tool names pass an isolated check.

The removed `paseo-slim` template is not seeded on fresh initialization. Initialization does not delete existing runtime skills. For an existing installation, obtain migration approval, back up its customized `paseo-slim` skill, remove that obsolete runtime skill, and update the role documents after review. Preserve other customized skills. This milestone does not deploy these changes.

The approved pinned Lens 4.3.0 writer contract uses consolidated capabilities. Use `lens_diagnostics({source:"lsp",scope:"paths",paths:["fixture.ts"]})` for an active language-server check. Use `ast_grep_search({dump:true,pattern:"function f() { return 1; }",lang:"typescript"})` for an AST dump. An AST is a syntax tree. The writer allowlists do not include the unavailable legacy names `lsp_diagnostics` and `ast_grep_dump`. No aliases or legacy name parity are claimed. This contract comes from the installed pinned source, not a public release provenance claim.

Run targeted host checks with `node --test scripts/roles.test.mjs scripts/defaults.test.mjs`. Run the isolated native check with `PASEO_ROLE_RUNTIME=1 node --test --test-name-pattern='isolated native' scripts/roles.test.mjs`. It uses the pinned image without a provider prompt, credentials, or network. It checks all seven native launches. For each exact writer profile, it uses the initialized Pi session's wrapped callable tools and session hooks with a synthetic assistant context. It binds the native FFF `tools-only` flag through the SDK extension runtime before session startup. It checks carrier registration, SDK activation and declaration changes, and actual calls. It detects TypeScript error 2322 in a fixed fixture and confirms the restored fixture clean. It rejects timeouts, unconfirmed checks, and navigation-only results. It checks TypeScript grammar nodes in an actual AST dump. Disposable negative controls remove each carrier from each writer allowlist and require target-specific call rejection. FFF fixture searches and rejected child management tools remain checked. Provider turns, general language-server coverage, and deployment remain unverified. No dependency or image change is included. The parent owns full final verification and independent review.

## Named Figma accounts

The private Figma directory mounts read-only at `/run/secrets/figma`. Compose uses one directory variable, regardless of account count. It does not create a missing host directory.

Add an entry to `config/mcp.json` under `mcpServers` for each account. The entry name is the MCP server name in Pi. For example:

```json
{
  "mcpServers": {
    "figma-my-company": {
      "command": "figma-developer-mcp",
      "args": ["--stdio", "--no-telemetry", "--skip-image-downloads", "--env", "/run/secrets/figma/my-company.env"]
    },
    "figma-my-other-company": {
      "command": "figma-developer-mcp",
      "args": ["--stdio", "--no-telemetry", "--skip-image-downloads", "--env", "/run/secrets/figma/my-other-company.env"]
    }
  }
}
```

Merge these entries with existing servers. Do not overwrite the entire configuration. Add more accounts with the same command and flags, a distinct entry name, and their own credential file. No per-account Compose variables are required.

For an existing installation, migrate each old `--env` path into `/run/secrets/figma/<filename>` before an approved deployment. Keep existing MCP names if you want to preserve tool references. Initialization does not rewrite old entries or remove them. Replace the old `FIGMA_WORKPLACE_A_SECRET_FILE` and `FIGMA_WORKPLACE_B_SECRET_FILE` variables with `FIGMA_SECRETS_DIR` in the private host `.env` only after approval.

This configuration does not prove Figma authorization. Validate each account using a known file that account can read. The Android CLI must run with `--no-metrics` on its first invocation. Do not run `android init` while `/root` is read-only.

The selected Android SDK includes command-line tools 23.0, platform tools 37.0.1, Android platform 37.2, and build tools 37.0.0. Platform tools use Google's versioned Linux archive with SHA-256 verification. Both `/opt/toolchain/bin/android` and the mise-managed Android command use the same `--no-metrics` wrapper. No Android Studio, emulator, system image, or global Gradle is installed. Run each project's Gradle wrapper.

## Host user service

The unit template is `defaults/systemd/isolated-paseo.service`. Its private environment template is `defaults/systemd/service.env.example`. Verify that host `/usr/bin/docker`, Compose, rootless Docker access, the actual `cf tunnels run` executable, the Cloudflare credential location, and mise shims work without shell activation. Configure `DOCKER_HOST` when the rootless daemon requires it. Use absolute values in `service.env`. The tunnel UUID is an identifier, not a credential.

Install the unit into `~/.config/systemd/user` only after separate deployment approval. Do not enable or start it without that approval. The unit couples container and tunnel lifetimes: stopping it runs `docker compose down`; tunnel failure can interrupt agents during recovery. Five failed starts hit the configured limit. Validate the unit with host `systemd-analyze --user verify` and test startup and recovery under the host user manager. Changing lingering needs separate approval.

## Acceptance and rollback

Container-side syntax, isolated dependency, and synthetic-secret checks are not substitutes for Docker and host checks. On the host, run the smoke check, inspect actual mounts and daemon environment, verify the selected CLI and SDK versions, test a new Paseo agent's environment, and resume an existing Pi session. Verify provider login, saved agents, every configured Figma account, and actual Cloudflare tunnel operation. Preserve initial state, exact actions, expected observable results, and failure conditions for each manual check. Record actual results.

Before each host test, record the active image ID and the existing session and agent counts. After an approved recreation, run `docker compose config --quiet`, `bash scripts/smoke-check.sh`, and `docker compose exec -T paseo /opt/toolchain/bin/mise -C /opt/toolchain exec -- sh -c 'test -d "$JAVA_HOME" && test "$ANDROID_HOME" = /opt/toolchain/android-sdk && command -v java && command -v cargo'`. A failure is any missing key, wrong path, failed smoke assertion, or lost saved session. Start a disposable new agent. Confirm that it can run `java -version`, `cargo --version`, and `pi --version` without shell activation. Record output and stop the disposable agent. For each Figma entry, request a known file permitted to that account through the MCP connection and record its returned file identity. Any authorization error or wrong account response is a failure. Do not print token values. On the host, check `systemd-analyze --user verify ~/.config/systemd/user/isolated-paseo.service`. After separate activation approval, start and stop the user service, verify rootless Docker access and `cf tunnels run`, and record the container and tunnel status. Failure includes an unavailable daemon, failed tunnel, or unexpected container shutdown. Check logout and reboot only if lingering is approved.

For rollback, stop the new service only with deployment approval. Restore the previous Compose configuration and image. Run `docker compose up -d` without `-v`. Do not replace or delete private volumes or host state. Verify login and saved sessions again.

## Known installation gates

The `fffind` and `ffgrep` tools come from the Pi extension `@ff-labs/pi-fff@0.11.0`, not separate command binaries. The image installs the locked package. Fresh Pi settings load `/opt/toolchain/apps/node_modules/@ff-labs/pi-fff/src/index.ts`. For an existing installation, explicitly merge that path into the `extensions` array in `config/settings.json` after approval. Preserve existing extensions and model settings. After deployment, test both tools against a known file and known text from a disposable agent. Native library loading and Pi tool registration remain host validation gates.

The local `defaults/skills/rtk/SKILL.md` supplies a minimal command reference for pinned RTK 0.51.0. It is not an upstream runtime skill. The RTK `v0.51.0` source tree at commit `e001f773f80b22b7dc4c7a79521b30e35aaef026` contains Pi integration at `src/hooks/init/pi.rs` and `hooks/pi/rtk.ts`, but no runtime `rtk/SKILL.md`. Explicit role skill loading does not prove that an RTK hook is active. Azure CLI 2.90.0 and its isolated Python 3.14.8 environment passed an isolated version check. Rust 1.99.0 installed with rustup 1.29.1 in a temporary installation. Its behavior with image-managed read-only rustup state, and the full image build, remain host acceptance gates until verified. The runtime image keeps image-managed Rust toolchains under `/opt/toolchain/rustup`; do not update rustup inside the running read-only container. The pi-lens 4.3.0 manifest supports `@earendil-works/pi-tui` 0.84.1 or 0.85.0, while Pi 1.0.2 provides pi-tui 1.0.2. The npm lock also installs pi-tui 0.85.1 for pi-lens. Full image validation must confirm that Pi package module mapping uses a compatible TUI instance before the optional pi-lens interface is accepted.
