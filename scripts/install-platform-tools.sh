#!/usr/bin/env bash
set -euo pipefail
archive=$(mktemp)
trap 'rm -f "$archive"' EXIT
curl -fsSL https://dl.google.com/android/repository/platform-tools_r37.0.1-linux.zip -o "$archive"
echo "d230f13842f60f782a8645f9c813f8f845bf36089ea7289f28c48f17979313f1  $archive" | sha256sum -c -
# mise can override ANDROID_HOME. Keep the image SDK destination explicit.
unzip -q "$archive" -d /opt/toolchain/android-sdk
