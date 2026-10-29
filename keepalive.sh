#!/usr/bin/env bash
# keepalive.sh — ensure server + tunnel are up, propagate URL, export snapshot.
# Designed to be run every minute by cron/launchd. Idempotent, self-healing.
set -u
cd "$(dirname "$0")"
LOG=out/keepalive.log
mkdir -p out
now(){ date -u +%FT%TZ; }
up(){ curl -sf -m 4 http://localhost:8787/health >/dev/null 2>&1; }

if ! up; then
  echo "$(now) server down -> restarting" >>"$LOG"
  (curl -sf -m 3 http://localhost:8787/health >/dev/null 2>&1) || { nohup node server.js >>out/server.log 2>&1 & sleep 2; }
fi

# tunnel: if public URL dead, run supervisor
if [ -f PUBLIC_URL.txt ]; then
  PU=$(cat PUBLIC_URL.txt)
  if ! curl -sf -m 6 "$PU/health" >/dev/null 2>&1; then
    echo "$(now) tunnel dead ($PU) -> restarting supervisor" >>"$LOG"
    pgrep -f tunnel-supervisor.js >/dev/null || nohup node tunnel-supervisor.js >>out/tunnel.log 2>&1 &
    sleep 6
  fi
fi

node refresh-url.js >>"$LOG" 2>&1
# refresh snapshot at most hourly (cheap guard)
if [ ! -f out/.last_snap ] || [ $(( $(date +%s) - $(cat out/.last_snap) )) -gt 3600 ]; then
  node snapshot.js --limit 120 >>"$LOG" 2>&1 && date +%s > out/.last_snap
fi
echo "$(now) keepalive ok: $(cat PUBLIC_URL.txt 2>/dev/null)" >>"$LOG"
