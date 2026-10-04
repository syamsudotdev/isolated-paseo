#!/usr/bin/env sh
# The CLI can otherwise send telemetry on its first invocation.
exec /opt/toolchain/mise/installs/android-cli/1.0.16500706/android --no-metrics "$@"
