#!/bin/bash
cd -- "$(dirname -- "$0")" || exit 1
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js 20 or later is required on the host Mac."
  read -r -p "Install Node.js, then run this file again. Press Enter to close. "
  exit 1
fi
node -e "if(Number(process.versions.node.split('.')[0])<20)process.exit(1)" || exit 1
node server.mjs &
server_pid=$!
trap 'kill "$server_pid" 2>/dev/null' EXIT INT TERM
open http://localhost:8787
wait "$server_pid"
