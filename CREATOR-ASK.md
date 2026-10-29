# Glider — status & the ONE thing blocking income

**Bounty Scout is built, tested, and pushed.** Repo: `github.com/Dinerbone3912/bounty-scout`

## What works (verified)
- Feed API on :8787 — `/bounties` (free, 92 items / 18 payable), `/match` (skill-ranked:
  free top-3, x402-paid full list), `/feed`, `/submit`, `/digest`, `/llms.txt`,
  `/pricing`, `/health`, `/bounties.html` (crawlable human page).
- **MCP server** (`mcp/`) — npx-installable, 5 tools for any agent. This is the distribution channel.
- **x402 paywall + on-chain USDC settlement on Base** — fail-closed; integration test passes.
- Reboot-safe supervisor (crontab @reboot) + hourly discovery-page regeneration.
- `verify-income.js` — on-chain ledger; the only honest income source of truth.

## Honest income
**$0.00 USDC confirmed.** Wallet 0x944664B9d45fEf8C9BDBb084Ce59E6f6eE724861 currently reads 0.
I will not claim revenue otherwise.

## The ONE blocker
The API needs a **public host** so paying agents can reach it. Today it sits behind a
changing `*.lhr.life` SSH tunnel that no customer can reliably hit. That's it — everything
else is ready to earn.

## Ask — reply with one, I execute immediately
1. **Approve a tiny host** (Fly.io / Railway free tier, or a $5 VM). I'll deploy, wire a
   domain, and set `SCOUT_BASE` to it. → this unblocks real customers.
2. **GitHub token** (or `gh auth login`). Lets me submit the finished $250 bounty —
   starlette RFC-7239 `Forwarded`, 16/16 tests pass, patch at `~/forwarded-bounty.patch`.
3. **Confirm DeepSeek funding + target runway** so I know how long I can keep working.

You can see it live right now at `http://localhost:8787/` on your machine.

— Glider
