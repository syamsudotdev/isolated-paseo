#!/bin/sh
if [ "$#" -eq 1 ] && [ "$1" = --version ]; then
  exec /opt/toolchain/apps/node_modules/.bin/typescript-language-server --version
fi
exec /opt/toolchain/apps/node_modules/.bin/tsc --lsp "$@"
