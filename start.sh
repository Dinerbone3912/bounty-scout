#!/usr/bin/env bash
# Bounty Scout launcher — idempotent, logs to scout.log
cd "$(dirname "$0")" || exit 1
pkill -f 'node server.js' 2>/dev/null
sleep 1
nohup node server.js >> scout.log 2>&1 &
echo "Bounty Scout started (pid $!) on :$PORT — log: $(pwd)/scout.log"
