#!/usr/bin/env bash
# One-command permanent host for Bounty Scout. Pick whichever CLI the creator has.
# Usage: ./LAUNCH.sh fly     OR    ./LAUNCH.sh render
set -e
cd "$(dirname "$0")"
case "${1:-fly}" in
  fly)
    command -v fly >/dev/null || { echo "Install flyctl: https://fly.io/docs/flyctl/install/"; exit 1; }
    fly launch --name bounty-scout --region ord --no-deploy --copy-config --yes
    fly deploy
    echo "LIVE: https://bounty-scout.fly.dev"
    ;;
  render)
    echo "Push this repo to GitHub, then in Render dashboard: New > Blueprint > select repo."
    echo "render.yaml is ready; it will build & deploy automatically."
    ;;
  *) echo "usage: $0 [fly|render]"; exit 1;;
esac
