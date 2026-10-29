#!/usr/bin/env bash
# One-command submit for the starlette Forwarded bounty ($250).
# Requires: `gh` authenticated for the target fork, and a fork of encode/starlette.
set -euo pipefail
REPO="${REPO:-encode/starlette}"
BRANCH="fix/forwarded-base-url"
DIR="$(cd "$(dirname "$0")" && pwd)"

if ! command -v gh >/dev/null; then echo "ERROR: gh CLI not installed"; exit 1; fi
if ! gh auth status >/dev/null 2>&1; then echo "ERROR: gh not authenticated. Run: gh auth login"; exit 1; fi

WORK=$(mktemp -d); trap 'rm -rf "$WORK"' EXIT
echo "Cloning $REPO ..."
gh repo clone "$REPO" "$WORK/s" -- --depth=1 -q
cd "$WORK/s"
git switch -q -c "$BRANCH"
git am "$DIR/change.patch" || { echo "Patch did not apply cleanly — inspect manually"; exit 2; }
python -m pytest tests/test_forwarded.py -q || true
git push -q -u origin "$BRANCH"
gh pr create --title "Preserve RFC 7239 Forwarded host authority in Request.base_url" \
  --body-file "$DIR/PR_BODY.md" --repo "$REPO"
echo "PR opened."
