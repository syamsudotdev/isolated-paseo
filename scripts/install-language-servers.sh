#!/bin/bash
set -euo pipefail

bin=/opt/toolchain/bin
native=/opt/toolchain/language-servers
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

fetch() {
  local url=$1 hash=$2 output=$3
  curl -fsSL "$url" -o "$output"
  echo "$hash  $output" | sha256sum -c -
}

mkdir -p "$native" "$work/debs"
ln -s /opt/toolchain/scripts/typescript-language-server.sh "$bin/typescript-language-server"

apt_base=https://apt.llvm.org/bookworm
clang_version='23.1.2~++20260920033443+85ac56026243-1~exp1~20260920033605.79'
fetch "$apt_base/pool/main/l/llvm-toolchain-23/clangd-23_${clang_version}_amd64.deb" 53022fbde33eb84fdbb45b343463c02460b9cf5693c090c710e154a4ee79fd8b "$work/debs/clangd.deb"
fetch "$apt_base/pool/main/l/llvm-toolchain-23/libclang-cpp23_${clang_version}_amd64.deb" 4766d3030edc3f6eea6d265e8098f707151053651d786f21001e58dc5c478724 "$work/debs/libclang-cpp.deb"
fetch "$apt_base/pool/main/l/llvm-toolchain-23/libllvm23_${clang_version}_amd64.deb" c837304a819437e9d2e65b4ebb48be0f013e89082bfa83e0c77e216a7f23f754 "$work/debs/libllvm.deb"
fetch "$apt_base/pool/main/l/llvm-toolchain-23/libclang-common-23-dev_${clang_version}_amd64.deb" 7c20611076a11851c8133e4da3b5743d41a3081289967f7991d96888a35b62e6 "$work/debs/libclang-common.deb"
dpkg -i "$work/debs/libllvm.deb" "$work/debs/libclang-cpp.deb" "$work/debs/libclang-common.deb" "$work/debs/clangd.deb"
ln -s /usr/bin/clangd-23 "$bin/clangd"

fetch https://github.com/artempyanykh/marksman/releases/download/2026-02-08/marksman-linux-x64 be5098e8213219269c47fc0d916a66fa31ce0602ec967475c722260aabf26087 "$bin/marksman"
fetch https://github.com/tamasfe/taplo/releases/download/0.10.0/taplo-linux-x86_64.gz 8fe196b894ccf9072f98d4e1013a180306e17d244830b03986ee5e8eabeb6156 "$work/taplo.gz"
gzip -dc "$work/taplo.gz" > "$bin/taplo"
fetch https://github.com/rust-lang/rust-analyzer/releases/download/2026-09-28/rust-analyzer-x86_64-unknown-linux-gnu.gz 23f711d86b5f826e22886f01d7355dc01e0f4c1357dafa29710a95b903b48c85 "$work/rust-analyzer.gz"
gzip -dc "$work/rust-analyzer.gz" > "$bin/rust-analyzer"
fetch https://github.com/opengrep/opengrep/releases/download/v1.30.0/opengrep_manylinux_x86 35779bdd72e92129c8df2a77f0c55e8c08356801ea92591ef32108d6b28d564c "$bin/opengrep"
fetch https://github.com/tekumara/typos-lsp/releases/download/v0.1.56/typos-lsp-v0.1.56-x86_64-unknown-linux-gnu.tar.gz 48e841ddd9a4ac6997a49aee99629a72c1f427bfe614fe4b52f719caaa2718b4 "$work/typos-lsp.tar.gz"
tar --no-same-owner -xzf "$work/typos-lsp.tar.gz" -C "$bin" typos-lsp

fetch https://download.eclipse.org/jdtls/milestones/1.61.0/jdt-language-server-1.61.0-202609031315.tar.gz 338e7e73d61836651ba2453919a0d34fa763eb4e7c03342092309bffb8934c64 "$work/jdtls.tar.gz"
mkdir "$native/jdtls"
tar --no-same-owner -xzf "$work/jdtls.tar.gz" -C "$native/jdtls"
cat > "$bin/jdtls" <<'EOF'
#!/bin/sh
exec /opt/toolchain/language-servers/jdtls/bin/jdtls --jvm-arg="-Duser.home=$HOME" "$@"
EOF

fetch https://download.jetbrains.com/language-server/kotlin-server/263.6379.0/kotlin-server-263.6379.0.tar.gz ab8ca4455dc2fc5fe1a24db2bccc46c104254d2c465155c4251ee65df8f3f7cc "$work/kotlin-lsp.tar.gz"
mkdir "$native/kotlin-lsp"
tar --no-same-owner -xzf "$work/kotlin-lsp.tar.gz" -C "$native/kotlin-lsp" --strip-components=1
cat > "$bin/kotlin-lsp" <<'EOF'
#!/bin/sh
exec /opt/toolchain/language-servers/kotlin-lsp/bin/intellij-server --stdio "$@"
EOF

chmod 755 "$bin/marksman" "$bin/taplo" "$bin/rust-analyzer" "$bin/opengrep" "$bin/typos-lsp" "$bin/jdtls" "$bin/kotlin-lsp"
