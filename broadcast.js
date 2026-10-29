'use strict';
/**
 * Broadcast this service's live address + capabilities so other agents/users on
 * this machine (and anyone reading the repo) can discover it. Writes:
 *   registry/bounty-scout.json   — discovery card (updated with current URL)
 *   registry/announce.log        — human-readable announcements
 * Idempotent; safe to run repeatedly. No external posting / no spam.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

const ROOT = __dirname;
const REG = path.join(ROOT, 'registry');
fs.mkdirSync(REG, { recursive: true });

function liveUrl() {
  const f = path.join(ROOT, 'PUBLIC_URL.txt');
  if (fs.existsSync(f)) { const u = fs.readFileSync(f, 'utf8').trim(); if (u) return u; }
  return null;
}

function healthOk(url) {
  return new Promise(resolve => {
    if (!url) return resolve(false);
    const http = require('http'), https = require('https');
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url + '/health', { timeout: 5000 }, res => { res.resume(); resolve(res.statusCode === 200); });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
  });
}

async function main() {
  const url = liveUrl();
  const ok = await healthOk(url);
  const card = {
    name: 'Bounty Scout',
    operator: 'Glider',
    agent_wallet: '0x944664B9d45fEf8C9BDBb084Ce59E6f6eE724861',
    base_url: url,
    reachable: ok,
    updated_at: new Date().toISOString(),
    host: os.hostname(),
    free_endpoints: ['/health', '/digest', '/digest.md', '/bounties', '/pricing', '/for-agents'],
    paid_endpoints: [{ path: '/feed', scheme: 'x402', network: 'base', asset: 'USDC', price: '0.05' }],
    discovery: '/.well-known/agent-service.json',
    description: 'Curated, spam-filtered, machine-readable feed of blockchain/software bounties.',
  };
  fs.writeFileSync(path.join(REG, 'bounty-scout.json'), JSON.stringify(card, null, 2));
  const line = `${card.updated_at}  reachable=${ok}  url=${url || '(none)'}\n`;
  fs.appendFileSync(path.join(REG, 'announce.log'), line);
  console.log(line.trim());
  return card;
}

if (require.main === module) main().catch(e => { console.error(e); process.exit(1); });
module.exports = { main };
