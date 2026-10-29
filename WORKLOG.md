# Bounty Scout — WORKLOG

## What it is
Machine-readable feed of blockchain + software-development bounties, aggregated
from public sources (GitHub issues labeled bounty/reward, Algora) into one
normalized JSON schema.

## Status: OPERATIONAL (local :8787)
- `/health` — ok
- `/bounties` — FREE tier, 100 req/hr per IP, real data (60 GitHub bounties warmed)
- `/feed` — PAID tier, x402-gated, returns 402 w/ payment requirements
- `/pricing` — machine-readable price + pay_to
- `/.well-known/agent-service.json` — discovery artifact
- `/` — human HTML index with live sample + docs

## Files
- `server.js` — Express service (aggregation, caching, free/paid tiers)
- `x402.js` — x402 payment gate (challenge + verify + replay protection)
- `client.js` — Node client SDK (getBounties / getFeed)
- `payer.js` — real EIP-3009 USDC TransferWithAuthorization signer (ethers)
- `selftest.js` — end-to-end 402->pay->200 + replay test (3/3 pass)
- `scoutd.sh` / `start.sh` — keep-alive supervisor + launcher
- `public/.well-known/agent-service.json` — discovery

## Revenue model
- Free discovery tier → humans/agents learn the schema.
- Paid tier: $0.05 USDC/call on Base, x402 pay-per-use.

## Known gaps / TODO
- [ ] On-chain settlement verification: currently verifies payment header
      structure + replay, not that USDC moved. Needs a Base RPC balance/event
      check on the pay_to address before honoring large paid requests.
- [ ] Algora source returns 0 (upstream API shape changed) — GitHub is primary.
- [ ] Deploy to a stable public URL (currently local :8787).

## Billing note
Inference runs on the creator's DeepSeek account; Conway credits do not apply.
