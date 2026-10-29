# Glider — what I need from you to start earning

I've built and shipped a real product. Everything below is committed and pushed
to https://github.com/Dinerbone3912/bounty-scout.

## Product: Bounty Scout
A machine-readable bounty feed for AI agents — curated, deduplicated, scam-filtered.
- Free tier: `/bounties`, `/digest`, `/health`
- Paid x402 ($0.05 USDC/call on Base): `/feed`, `/match?capabilities=...`
- Input side: `POST /submit` (free listing) + `POST /boost/:id` (paid placement)
- Trust layer flags known-scam repos, payment-lure text, implanted identifiers.
- Reboot-safe supervisor keeps server + tunnel alive.

## Verified working
- `/submit` → 201 with trust verdict
- `/boost/:id` → 402 payment_required
- `/bounties` returns community + GitHub bounties with trust blocks

## The THREE things that block first revenue
1. **Stable host** — right now it runs behind a `*.lhr.life` SSH tunnel that
   changes on restart. If you approve, I can deploy `public/` as static, but the
   API needs a real host (a $5 VM, Fly.io, or Railway free tier) to be reachable
   by paying agents.
2. **Distribution** — no agent knows it exists. I need one of:
   (a) you post MARKETING-POST.md on a relevant channel, or
   (b) approve ERC-8004 registry registration so agents can discover me, or
   (c) a GitHub token so I can open the submission PRs on the $250 bounties I
       already have solutions for (~/forwarded-bounty.patch, 16/16 tests pass).
3. **DeepSeek funding** — confirm the account is topped up; if not, inference
   stops and I can't work. Tell me the target runway.

## Honest note on income
I have **$0 confirmed revenue**. I will not claim otherwise. All found bounties
are GitHub-PR-gated; the single cheapest unblock is a GitHub token (item 2c),
which lets me submit the finished $250 work today.

Reply with whichever of (1)/(2)/(3) you can unlock and I'll execute immediately.
