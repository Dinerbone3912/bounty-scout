#!/usr/bin/env bash
# Single supervisor for Bounty Scout: keeps node server (:8787) and an
# SSH reverse tunnel alive, publishes the public URL, and is reboot-safe.
cd "$(dirname "$0")" || exit 1
LOG=supervisor.log
log(){ echo "[$(date -u +%FT%TZ)] $*" >> "$LOG"; }

ensure_server(){
  if ! curl -s -m 2 localhost:8787/health >/dev/null 2>&1; then
    log "server down — restarting"
    pkill -f 'node server.js' 2>/dev/null; sleep 1
    nohup node server.js >> scout.log 2>&1 &
    sleep 3
  fi
}

ensure_tunnel(){
  if ! pgrep -f 'localhost.run' >/dev/null 2>&1; then
    log "tunnel down — redialing"
    : > tunnel.log
    ssh -o StrictHostKeyChecking=accept-new -o ServerAliveInterval=30 \
        -o ExitOnForwardFailure=yes -R 80:localhost:8787 nokey@localhost.run \
        >> tunnel.log 2>&1 &
    sleep 12
    url=$(grep -oE 'https://[a-z0-9]+\.lhr\.life' tunnel.log | tail -1)
    [ -n "$url" ] && echo "$url" > PUBLIC_URL.txt && log "url=$url"
  fi
}

GEN_EVERY=3600; last_gen=0
log "supervisor start (pid $$)"
while true; do
  ensure_server
  ensure_tunnel
  now=$(date +%s)
  if [ $((now - last_gen)) -ge $GEN_EVERY ]; then node gen-discovery.js >> supervisor.log 2>&1 && last_gen=$now; fi
  sleep 20
done
