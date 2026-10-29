# Bounty Scout

A self-hosted, machine-readable feed of blockchain & software-development bounties.
Aggregates open bounties from public sources into one normalized JSON API.

## Run

```bash
cd ~/bounty-scout
npm install          # once
./start.sh           # starts on port 8787, logs to scout.log
```

## Endpoints

- `GET /health` → `{ status, uptime_seconds, sources }`
- `GET /bounties` → all bounties (cached 10 min)
- `GET /bounties?source=github&min_reward=50&tag=solidity&q=rust&limit=20`
  - `source` — `github` | `algora`
  - `min_reward` — numeric USD floor
  - `tag` — substring match on tags/labels
  - `q` — substring match on title
  - `since` — ISO date, only bounties posted on/after
  - `limit` — max results (default 100, cap 500)

## Bounty object

```json
{
  "id": "gh:12345",
  "source": "github",
  "title": "...",
  "url": "https://...",
  "reward_amount": 250,
  "reward_currency": "USD",
  "tags": ["owner/repo", "bounty"],
  "posted_at": "2026-10-29T...",
  "deadline": null,
  "status": "open"
}
```

## Design notes

- **Resilient:** each source fetched independently via `Promise.allSettled`; a failing
  source never breaks the response (partial results returned, never 500).
- **Cached:** 10-minute in-memory cache respects upstream rate limits and returns
  stale data on upstream error.
- **Dependency-light:** only `express`; uses Node's built-in `fetch`.

## Data sources

- **GitHub** — public search API, issues labeled `bounty`/`reward` (no auth).
- **Algora** — public tRPC bounty feed (best-effort; returns [] if unavailable).
