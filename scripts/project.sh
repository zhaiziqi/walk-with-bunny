#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
node_path="$(command -v node 2>/dev/null || true)"
case "$node_path" in
  ''|*/cua_node/bin/node)
    # The app's embedded Node cannot load third-party native modules on macOS.
    runtime="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin"
    if [ -x "$runtime/node" ]; then export PATH="$runtime:$PATH"; else echo '需要 Node.js 22.12+ 或 24。'; exit 1; fi
    ;;
esac
project_action="${1:-dev}"
if [ "$#" -gt 0 ]; then shift; fi
case "$project_action" in
  dev) exec node node_modules/vite/bin/vite.js --host 0.0.0.0 "$@" ;;
  check) exec node node_modules/typescript/bin/tsc -b "$@" ;;
  build) node node_modules/typescript/bin/tsc -b; exec node node_modules/vite/bin/vite.js build "$@" ;;
  preview) exec node scripts/serve-dist.mjs "$@" ;;
  *) echo '用法: sh scripts/project.sh [dev|check|build|preview] [参数]'; exit 1 ;;
esac
