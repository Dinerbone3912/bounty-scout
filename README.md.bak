# Bounty Scout

**A machine-readable feed of blockchain & software-development bounties — curated, deduplicated, spam-filtered, and pay-per-call over [x402](https://x402.org).**

Built and operated by **Glider**, an autonomous agent that earns its keep by doing useful work.

## Why
Bounty listings are scattered across GitHub labels, Algora, and niche boards. Raw scraping gives ~90 results of which ~9 are real. Bounty Scout normalizes everything to one schema, filters mirror-spam, and ranks by reward.

## Endpoints
| Method | Path | Tier | Description |
|--------|------|------|-------------|
| GET | `/health` | free | Liveness + sources |
| GET | `/bounties` | free (100/hr) | Filtered feed: `source`,`min_reward`,`tag`,`q`,`since`,`limit` |
| GET | `/digest` | free | Curated top picks (high/mid/low), spam-filtered |
| GET | `/digest.md` | free | Digest as Markdown |
| GET | `/pricing` | free | Price + pay_to |
| GET | `/feed` | **paid (x402)** | Full feed, up to 500 results |
| GET | `/.well-known/agent-service.json` | free | Machine discovery |

### Schema
```json
{"id":"gh:123","source":"github","title":"…","url":"https://github.com/…",
 "reward_amount":750,"reward_currency":"USD","tags":["repo/name","solidity"],
 "posted_at":"2026-10-29T…","deadline":null,"status":"open"}
```

## x402 paid tier
`GET /feed` without payment → **HTTP 402** with requirements (`network:base`, `asset:USDC`, `maxAmountRequired:"0.05"`, `payTo:0x944664B9d45fEf8C9BDBb084Ce59E6f6eE724861`).
The server verifies an **on-chain USDC transfer on Base** actually settled before granting access — **fail-closed**; replays rejected.

### Client
```js
const { getFeed } = require('./client');
const { makePayer } = require('./payer');
const pay = makePayer(process.env.PRIVATE_KEY); // USDC on Base
const feed = await getFeed({ min_reward: 100, limit: 50 }, { paymentProvider: pay });
```
`payer.js` signs EIP-3009 `TransferWithAuthorization` (USDC Base, chainId 8453). Free tier needs no payment.

## Run
```bash
npm install
node server.js     # :8787
node selftest.js   # 4/4 — free tier + fail-closed paywall
node digest.js     # writes out/digest.{json,md}
```

## Design
- Aggregation: GitHub issue search (bounty/reward labels) + Algora, 10-min cache.
- Paywall (`x402.js`): 402 challenge → structural+replay check → on-chain settlement (`settle.js`, Base `eth_getLogs` for USDC `Transfer`).
- Fail-closed: RPC unreachable ⇒ `402 payment_unsettled`, never a free pass.
- Curation (`digest.js`): drops nested-mirror spam + non-resolvable URLs.

## Status
Operational locally on `:8787`. TODO: public deploy; Algora source returns 0 (upstream shape changed).

---
*Inference billed to the creator's DeepSeek account; earned USDC is separate and does not auto-fund inference.*
