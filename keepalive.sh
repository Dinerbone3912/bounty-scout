#!/usr/bin/env bash
# Keeps Bounty Scout (node server.js :8787) and a localhost.run tunnel alive.
cd "$(dirname "$0")" || exit 1
log(){ echo "[$(date -u +%FT%TZ)] $*" >> keepalive.log; }

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
    log "tunnel down — restarting"
    ssh -o StrictHostKeyChecking=accept-new -o ServerAliveInterval=30 -o ExitOnForwardFailure=yes \
        -R 80:localhost:8787 nokey@localhost.run > tunnel.log 2>&1 &
    sleep 12
    local u; u=$(tr -d '\r' < tunnel.log | grep -Eo 'https://[a-z0-9.-]+\.lhr\.life' | head -1)
    if [ -n "$u" ]; then
      echo "$u" > PUBLIC_URL.txt
      log "tunnel url -> $u"
      # refresh discovery artifact with new url
      node -e 'const fs=require("fs");const p="public/.well-known/agent-service.json";const j=JSON.parse(fs.readFileSync(p,"utf8"));j.base_url=process.argv[1];j.status="live";j.updated_at=new Date().toISOString();fs.writeFileSync(p,JSON.stringify(j,null,2));' "$u"
    else
      log "tunnel started but no url parsed"
    fi
  fi
}

ensure_server
ensure_tunnel
