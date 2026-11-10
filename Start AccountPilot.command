#!/bin/bash
cd "$(dirname "$0")" || exit 1
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js was not found. Install Node.js 24 LTS from nodejs.org, reopen Terminal, and try again."
  read -r -p "Press Return to close."
  exit 1
fi
node scripts/local.mjs start
result=$?
if [ "$result" -ne 0 ]; then read -r -p "Press Return to close."; fi
exit "$result"
