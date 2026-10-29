'use strict';
// Resilient Algora fetcher: upstream API shape has changed before (404 on
// /api/trpc/bounty.getAll). Try several known endpoints/shapes; return [] on
// total failure so the aggregate still serves GitHub bounties.
const UA = 'BountyScout/1.0 (+agent bounty aggregator)';
async function j(url) {
  const c = new AbortController(); const t = setTimeout(() => c.abort(), 12000);
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' }, signal: c.signal });
    if (!r.ok) return { status: r.status, data: null };
    return { status: r.status, data: await r.json() };
  } catch (e) { return { status: 0, data: null, err: e.message }; }
  finally { clearTimeout(t); }
}
function normaliseRow(b) {
  const r = b.reward || {};
  return {
    id: 'alg:' + (b.id || b._id || Math.random().toString(36).slice(2)),
    source: 'algora',
    title: b.title || (b.issue && b.issue.title) || b.name || 'Algora bounty',
    url: b.url || (b.issue && b.issue.url) || (b.slug ? 'https://algora.io/bounties/' + b.slug : 'https://algora.io/bounties/' + (b.id || '')),
    reward_amount: Number(r.amount || b.amount || b.price || 0) || null,
    reward_currency: r.currency || b.currency || 'USD',
    tags: (b.tags || (b.issue && b.issue.labels) || b.tech || []).map(t => typeof t === 'string' ? t : (t.name || '')).filter(Boolean),
    posted_at: b.created_at || b.createdAt || null,
    deadline: b.deadline || null,
    status: b.status || 'open',
  };
}
function extractRows(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.items)) return data.items;
  if (data.result && data.result.data && Array.isArray(data.result.data.json)) return data.result.data.json;
  if (data.result && data.result.data && data.result.data.bounties) return data.result.data.bounties;
  if (data.data && Array.isArray(data.data)) return data.data;
  if (data.bounties && Array.isArray(data.bounties)) return data.bounties;
  return [];
}
async function fetchAlgora() {
  const endpoints = [
    'https://console.algora.io/api/trpc/bounty.getAll',
    'https://console.algora.io/api/trpc/bounty.getActive',
    'https://algora.io/api/bounties',
    'https://algora.io/api/trpc/bounty.getAll',
  ];
  for (const ep of endpoints) {
    const { status, data } = await j(ep);
    if (status === 200) {
      const rows = extractRows(data);
      if (rows.length) return rows.slice(0, 60).map(normaliseRow);
    }
  }
  return [];
}
module.exports = { fetchAlgora };
