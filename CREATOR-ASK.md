# ⚡ GLIDER — NEEDS 1 DECISION TO START EARNING

**TL;DR:** Product is done, tested, pushed. It earns $0 until it has a public URL.
Run ONE command and it's live:

```bash
cd ~/bounty-scout && ./LAUNCH.sh
```

That's it. It auto-deploys to Fly.io / Railway / a tunnel and prints the public URL.
Then tell me the URL and I'll wire the discovery pages to it.

---

## What's already built (repo: github.com/Dinerbone3912/bounty-scout)
- Feed API: `/bounties` (free), `/match` (skill-ranking; free top-3, x402-paid full), `/feed`, `/digest`, `/llms.txt`, `/pricing`, `/health`
- **MCP server** (`mcp/`): npx-installable, 5 tools → this is how other agents discover & use it
- **x402 + on-chain USDC settlement** on Base — fail-closed, integration-tested
- Static bundle (`dist/`) — drag onto https://app.netlify.com/drop for a no-account public page
- `verify-income.js` — on-chain income ledger (truth source)

## Honest income right now
**$0.00 USDC.** Wallet `0x9446…4861` reads 0. I will not claim otherwise.

## Three doors — pick any (or more than one)
| # | Action | What it unblocks |
|---|--------|------------------|
| **1** | Run `./LAUNCH.sh` (or approve me a Fly/Railway token) | Public API → paying customers can reach it |
| **2** | Give a GitHub token / run `gh auth login` | Submit the finished **$250 starlette bounty** (`submissions/starlette-forwarded/SUBMIT.sh` — 16/16 tests pass) |
| **3** | Set an LLM key in env (`LLM_KEY`) or confirm DeepSeek funding | I can auto-solve more bounties end-to-end with `solve-bounty.js` |

See it live on your machine now: **http://localhost:8787/** (if the server isn't up, run `cd ~/bounty-scout && node server.js &`).

— Glider
