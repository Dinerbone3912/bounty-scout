'use strict';
/** Bounty Scout — aggregates blockchain & software bounties into a clean JSON feed.
 *  Free discovery tier (/bounties, rate-limited) + paid x402 tier (/feed). */
const express = require('express');
const { paywall, PRICE_USDC, PAY_TO } = require('./x402');
const PORT = process.env.PORT || 8787;
const CACHE_TTL_MS = 10 * 60 * 1000;
const UA = 'BountyScout/1.0 (+agent bounty aggregator)';

// ---- free-tier rate limit (per-IP, in-memory) ----
const FREE_LIMIT = 100, WINDOW_MS = 60 * 60 * 1000;
const rl = new Map();
function freeRL(req, res, next) {
  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'x').split(',')[0].trim();
  const now = Date.now(); let e = rl.get(ip);
  if (!e || now > e.reset) { e = { n: 0, reset: now + WINDOW_MS }; rl.set(ip, e); }
  if (e.n >= FREE_LIMIT) return res.status(429).json({ error: 'free_tier_exhausted', upgrade: '/feed', limit: FREE_LIMIT, window_hours: 1 });
  e.n++; res.set('X-Scout-Tier', 'free'); res.set('X-Scout-Free-Remaining', String(FREE_LIMIT - e.n)); next();
}

const cache = new Map();
function cached(key, ttl, fn) {
  const now = Date.now(); const hit = cache.get(key);
  if (hit && now - hit.t < ttl) return Promise.resolve(hit.v);
  return fn().then(v => { cache.set(key, { v, t: Date.now() }); return v; }).catch(e => { if (hit) return hit.v; throw e; });
}
async function jget(url, headers = {}) {
  const ctrl = new AbortController(); const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json', ...headers }, signal: ctrl.signal });
    if (!r.ok) throw new Error(url + ' -> ' + r.status);
    return await r.json();
  } finally { clearTimeout(timer); }
}
async function fetchGithub() {
  const queries = ['label:"bounty" state:open', 'label:"reward" state:open', 'label:"💎 Bounty" state:open'];
  const out = [];
  for (const q of queries) {
    try {
      const data = await jget('https://api.github.com/search/issues?q=' + encodeURIComponent(q) + '&sort=created&order=desc&per_page=30', { Accept: 'application/vnd.github+json' });
      for (const it of data.items || []) {
        const labels = (it.labels || []).map(l => (typeof l === 'string' ? l : l.name));
        const m = (it.title || '').match(/(?:\$|USD\s*)([\d,]+(?:\.\d+)?)|([\d,]+(?:\.\d+)?)\s*(?:USD|USDC|DAI)/i);
        const amount = m ? Number((m[1] || m[2]).replace(/,/g, '')) : null;
        out.push({ id: 'gh:' + it.id, source: 'github', title: it.title, url: it.html_url, reward_amount: amount, reward_currency: amount ? 'USD' : null, tags: [...new Set([...(it.repository_url ? [it.repository_url.split('/').slice(-2).join('/')] : []), ...labels])], posted_at: it.created_at, deadline: null, status: 'open' });
      }
    } catch (e) {}
  }
  return out;
}
async function fetchAlgora() {
  try {
    const data = await jget('https://console.algora.io/api/trpc/bounty.getAll');
    let rows = data; try { rows = data.result.data.json; } catch (_) {}
    if (!Array.isArray(rows)) rows = [];
    return rows.slice(0, 60).map(b => ({ id: 'alg:' + b.id, source: 'algora', title: b.title || (b.issue && b.issue.title) || 'Algora bounty', url: b.url || (b.issue && b.issue.url) || ('https://algora.io/bounties/' + b.id), reward_amount: Number((b.reward && b.reward.amount) || b.amount || 0) || null, reward_currency: (b.reward && b.reward.currency) || b.currency || 'USD', tags: (b.tags || (b.issue && b.issue.labels) || []).map(t => (typeof t === 'string' ? t : t.name)).filter(Boolean), posted_at: b.created_at || b.createdAt || null, deadline: b.deadline || null, status: b.status || 'open' }));
  } catch (e) { return []; }
}
const SOURCES = { github: fetchGithub, algora: fetchAlgora };
async function getAllBounties() {
  return cached('all', CACHE_TTL_MS, async () => {
    const results = await Promise.allSettled(Object.entries(SOURCES).map(([k, fn]) => fn()));
    const all = []; const meta = {};
    Object.keys(SOURCES).forEach((k, i) => { const r = results[i]; if (r.status === 'fulfilled') { all.push(...r.value); meta[k] = r.value.length; } else { meta[k] = 0; } });
    const seen = new Set(); const deduped = all.filter(b => seen.has(b.id) ? false : (seen.add(b.id), true));
    deduped.sort((a, b) => (b.reward_amount || 0) - (a.reward_amount || 0));
    return { bounties: deduped, sourceMeta: meta, fetchedAt: new Date().toISOString() };
  });
}
function applyFilters(list, q) {
  let out = list;
  if (q.source) out = out.filter(b => b.source === q.source);
  if (q.min_reward) { const m = Number(q.min_reward); out = out.filter(b => (b.reward_amount || 0) >= m); }
  if (q.tag) { const t = q.tag.toLowerCase(); out = out.filter(b => (b.tags || []).some(x => String(x).toLowerCase().includes(t))); }
  if (q.q) { const s = q.q.toLowerCase(); out = out.filter(b => (b.title || '').toLowerCase().includes(s)); }
  if (q.since) { const d = Date.parse(q.since); if (!isNaN(d)) out = out.filter(b => !b.posted_at || Date.parse(b.posted_at) >= d); }
  const limit = Math.min(Number(q.limit) || 100, 500);
  return out.slice(0, limit);
}
const app = express();
app.use(express.static("public", { dotfiles: "allow" })); const startedAt = Date.now();
app.get('/health', (_q, res) => res.json({ status: 'ok', uptime_seconds: Math.floor((Date.now() - startedAt) / 1000), sources: Object.keys(SOURCES) }));

// FREE discovery tier
app.get('/bounties', freeRL, async (req, res) => {
  try { const { bounties, sourceMeta, fetchedAt } = await getAllBounties(); const filtered = applyFilters(bounties, req.query); res.json({ tier: 'free', count: filtered.length, fetched_at: fetchedAt, source_meta: sourceMeta, bounties: filtered }); }
  catch (e) { res.status(200).json({ tier: 'free', count: 0, error: 'upstream_unavailable', bounties: [] }); }
});
// PAID tier — x402-gated, full feed, higher limit
app.get('/feed', paywall(), async (req, res) => {
  try { const { bounties, sourceMeta, fetchedAt } = await getAllBounties(); const filtered = applyFilters(bounties, req.query); res.json({ tier: 'paid', count: filtered.length, fetched_at: fetchedAt, source_meta: sourceMeta, bounties: filtered }); }
  catch (e) { res.status(200).json({ tier: 'paid', count: 0, error: 'upstream_unavailable', bounties: [] }); }
});
app.get('/pricing', (_q, res) => res.json({ free: '100 req/hr, no payment', paid: `${PRICE_USDC} USDC per call on Base`, pay_to: PAY_TO, network: 'base', asset: 'USDC' }));

function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
app.get('/', async (_q, res) => {
  let sample = [], meta = {};
  try { const g = await getAllBounties(); sample = g.bounties.slice(0, 10); meta = g.sourceMeta; } catch (_) {}
  const rows = sample.map(b => `<tr><td>${b.source}</td><td><a href="${b.url}">${esc(b.title)}</a></td><td>${b.reward_amount ? '$' + b.reward_amount : '-'}</td><td>${(b.tags || []).slice(0, 4).join(', ')}</td></tr>`).join('');
  res.type('html').send(`<!doctype html><meta charset="utf-8"><title>Bounty Scout API</title><style>body{font-family:system-ui,sans-serif;max-width:940px;margin:40px auto;padding:0 16px;color:#111}code{background:#f2f2f2;padding:2px 6px;border-radius:4px}table{border-collapse:collapse;width:100%}td,th{border-bottom:1px solid #eee;padding:8px;text-align:left;font-size:14px}.tag{display:inline-block;background:#eef;border-radius:4px;padding:2px 6px;margin:2px;font-size:12px}</style>
<h1>Bounty Scout</h1><p>Machine-readable feed of blockchain &amp; software bounties.</p>
<h3>Free tier</h3><ul><li><code>GET /bounties</code> (100 req/hr)</li><li><code>GET /bounties?source=github&min_reward=50&tag=solidity&q=rust&limit=20</code></li></ul>
<h3>Paid tier (x402)</h3><p><code>GET /feed</code> — ${PRICE_USDC} USDC per call on Base. Returns <code>402</code> with payment requirements; pay to <code>${PAY_TO}</code> and retry with <code>X-PAYMENT</code>.</p>
<p>Source counts: ${JSON.stringify(meta)}</p><h3>Live sample</h3>
<table><tr><th>Source</th><th>Title</th><th>Reward</th><th>Tags</th></tr>${rows || '<tr><td colspan=4>warming cache…</td></tr>'}</table>`);
});
app.listen(PORT, () => { console.log('[bounty-scout] listening on :' + PORT); getAllBounties().then(g => console.log('[bounty-scout] warmed: ' + g.bounties.length + ' bounties', g.sourceMeta)).catch(() => {}); });
