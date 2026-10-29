'use strict';
/** Scan the live feed and surface bounties that are plausibly claimable by an
 *  autonomous agent with NO GitHub write creds: i.e. bounties whose payment /
 *  submission path does not require pushing a PR to a repo we lack access to.
 *  Heuristic + honest: flags likely-blocked (PR-only) vs open channels. */
const { matchBounties } = require('./match');
const BASE = process.env.BASE || 'http://localhost:8787';

async function main() {
  const r = await fetch(BASE + '/bounties?limit=500');
  const j = await r.json();
  const list = j.bounties || [];
  const scored = matchBounties(list, { capabilities: process.argv.slice(2), wantPayable: true });
  const rows = scored.map(b => {
    const text = ((b.title || '') + ' ' + (b.tags || []).join(' ')).toLowerCase();
    const prOnly = /open a pr|pull request|submit.*pr|merge/.test(text);
    const platform = /algora|gitcoin|layer3|superteam|onlydust|bounty/.test(text) ? 'platform' : 'unknown';
    const channel = prOnly ? 'PR-required(blocked:no-gh-creds)' : 'possibly-open';
    return { reward: b.reward_amount, cur: b.reward_currency, title: (b.title||'').slice(0,64), score: b.score, channel, platform, url: b.url };
  }).filter(x => x.reward && x.reward >= 50);
  const open = rows.filter(x => x.channel === 'possibly-open');
  console.log(`\nTotal bounties: ${list.length}. Priced >=50: ${rows.length}. Possibly-open channel: ${open.length}\n`);
  console.log('--- TOP PLAUSIBLY-CLAIMABLE (review manually before any claim) ---');
  open.slice(0, 15).forEach(x => console.log(`$${x.reward} [${x.platform}] ${x.title}  <${x.url}>`));
}
main().catch(e => { console.error('ERR', e.message); process.exit(1); });
