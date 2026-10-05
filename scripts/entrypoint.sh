#!/usr/bin/env bash
set -euo pipefail
export HOME=/home/node PASEO_HOME=/home/node/.paseo
export MISE_CONFIG_DIR=/opt/toolchain MISE_DATA_DIR=/opt/toolchain/mise MISE_CACHE_DIR=/home/node/.cache/toolchain/mise
export ANDROID_HOME=/opt/toolchain/android-sdk ANDROID_USER_HOME=/home/node/.local/share/toolchain/android
export CARGO_HOME=/home/node/.local/share/toolchain/cargo RUSTUP_HOME=/opt/toolchain/rustup
export GOPATH=/home/node/.local/share/toolchain/go GOCACHE=/home/node/.cache/toolchain/go UV_CACHE_DIR=/home/node/.cache/toolchain/uv
export LANG=C.UTF-8 LC_ALL=C.UTF-8
export PATH=/opt/toolchain/bin:/opt/toolchain/apps/node_modules/.bin:/opt/toolchain/android-sdk/platform-tools:/opt/toolchain/android-sdk/cmdline-tools/23.0/bin:/opt/toolchain/android-sdk/build-tools/37.0.0:$PATH
mkdir -p "$XDG_CONFIG_HOME" "$MISE_CACHE_DIR" "$ANDROID_USER_HOME" "$CARGO_HOME" "$GOPATH" "$GOCACHE" "$UV_CACHE_DIR"
# Serialize entrypoint initialization; manual edits and direct initializer calls do not use this lock.
# The subshell closes the lock descriptor before daemon execution.
(
	/usr/bin/flock --exclusive 9
	# Validate all existing entries before creating image-owned Rust launcher links.
	mkdir -p "$CARGO_HOME/bin"
	for source in /opt/toolchain/cargo/bin/*; do
		launcher="$CARGO_HOME/bin/${source##*/}"
		if [[ -e "$launcher" || -L "$launcher" ]]; then
			if [[ ! -L "$launcher" || "$(readlink -- "$launcher")" != "$source" ]]; then
				printf 'Rust launcher conflict: %s\n' "$launcher" >&2
				exit 1
			fi
		fi
	done
	for source in /opt/toolchain/cargo/bin/*; do
		launcher="$CARGO_HOME/bin/${source##*/}"
		if [[ ! -e "$launcher" && ! -L "$launcher" ]]; then ln -s -- "$source" "$launcher"; fi
	done
	# mise exec applies configured tools to initialization, the daemon, and its agent children.
	/opt/toolchain/bin/mise -C /opt/toolchain exec -- /opt/toolchain/scripts/init-defaults.sh
) 9>>"$HOME/.local/share/toolchain/initialization.lock"
# shellcheck disable=SC2016 # Expand the child PATH in the child shell.
exec /opt/toolchain/bin/mise -C /opt/toolchain exec -- bash -c 'export PATH=/opt/toolchain/bin:$PATH; exec "$@"' bash "$@"
