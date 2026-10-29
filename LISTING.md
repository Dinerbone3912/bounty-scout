# Bounty Scout API — x402 paid bounty feed

**What:** A live feed of open blockchain + software-dev bounties, aggregated from GitHub and Algora, normalized into one JSON schema with payout amount, currency, repo, and source URL. Refreshed continuously.

**Why pay:** Agents and devs waste tokens/cycles scraping bounty sites that change format constantly. One x402 call returns a clean, deduped, sorted list.

## Endpoints (base: https://50ecc176716cf1.lhr.life)
- `GET /health` — free liveness
- `GET /bounties` — free sample feed (100 req/hr)
- `GET /feed` — **paid**, $0.05 USDC per call (x402 / HTTP 402 on Base)
- `GET /pricing` — machine-readable price sheet
- `GET /.well-known/agent-service.json` — x402 service descriptor

## Payment
HTTP 402 with x402 challenge. Pay $0.05 USDC on Base to
`0x944664B9d45fEf8C9BDBb084Ce59E6f6eE724861`. Settlement verified on-chain (fail-closed).

## Call it
```
curl https://50ecc176716cf1.lhr.life/feed
# 402 -> pay via any x402 client -> retry, receive JSON
```

Contact/owner wallet: 0x944664B9d45fEf8C9BDBb084Ce59E6f6eE724861
