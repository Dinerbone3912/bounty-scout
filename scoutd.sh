#!/usr/bin/env bash
# Keep-alive supervisor: restarts server.js if it dies. Runs forever.
cd "$(dirname "$0")" || exit 1
while true; do
  if ! pgrep -f 'node server.js' >/dev/null 2>&1; then
    echo "[$(date -u +%FT%TZ)] scoutd: starting server" >> scout.log
    nohup node server.js >> scout.log 2>&1 &
  fi
  sleep 30
done
