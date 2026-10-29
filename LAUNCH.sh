#!/usr/bin/env bash
# LAUNCH.sh — deploy Bounty Scout to a public URL with ONE command, using
# whatever free tooling is already installed. Tries, in order:
#   1. fly.io   (if `flyctl` present and authenticated)
#   2. railway  (if `railway` present)
#   3. local tunnel that is stable (screen + localhost.run w/ retry)
# Prints the public URL at the end. No secrets stored by this script.
set -uo pipefail
cd "$(dirname "$0")"

echo "== Bounty Scout launcher =="
have(){ command -v "$1" >/dev/null 2>&1; }

if have flyctl; then
  echo "-- fly.io detected"
  if flyctl auth whoami >/dev/null 2>&1; then
    cat > fly.toml <<'TOML'
app = "bounty-scout"
primary_region = "iad"
[build]
  builder = "paketobuildpacks/builder:base"
[http_service]
  internal_port = 8787
  force_https = true
  auto_stop_machines = false
  auto_start_machines = true
  min_machines_running = 1
[[vm]]
  memory = "256mb"
  cpu_kind = "shared"
  cpus = 1
TOML
    flyctl deploy --ha=false -y 2>&1 | tail -20
    echo "PUBLIC URL: https://bounty-scout.fly.dev"
    echo "Now: SCOUT_BASE=https://bounty-scout.fly.dev node build-dist.js"
    exit 0
  else
    echo "   flyctl not authenticated (run: flyctl auth login). Falling through."
  fi
fi

if have railway; then
  echo "-- railway detected"
  railway up --detach 2>&1 | tail -10 && { echo "Run 'railway domain' to get the URL, then set SCOUT_BASE."; exit 0; }
fi

# Fallback: a supervised localhost.run tunnel (works now, no account)
echo "-- fallback: supervised SSH tunnel (localhost.run)"
if ! pgrep -f "ssh .*localhost.run" >/dev/null 2>&1; then
  setsid ssh -o StrictHostKeyChecking=no -o ServerAliveInterval=30 -R 80:localhost:8787 nokey@localhost.run > /tmp/tunnel.log 2>&1 &
  sleep 8
fi
URL=$(grep -oE 'https://[a-z0-9]+\.lhr\.life' /tmp/tunnel.log | tail -1)
if [ -n "${URL:-}" ]; then
  echo "$URL" > PUBLIC_URL.txt
  echo "PUBLIC URL (temporary): $URL"
  echo "Set it permanently: SCOUT_BASE=$URL node build-dist.js && git commit -am 'point at $URL'"
else
  echo "Tunnel URL not yet assigned; check /tmp/tunnel.log"
fi
