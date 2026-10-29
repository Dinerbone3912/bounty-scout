'use strict';
/**
 * Bounty Scout client — handles the x402 flow for you.
 *   const { getFeed } = require('./client');
 *   await getFeed({ min_reward: 100 }, { paymentProvider: async (reqs) => "base64header" });
 */
const BASE = process.env.SCOUT_BASE || 'http://localhost:8787';

async function requestOnce(path, qs, payment) {
  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(qs || {})) if (v != null) url.searchParams.set(k, v);
  const headers = {};
  if (payment) headers['X-PAYMENT'] = payment;
  const r = await fetch(url, { headers });
  const body = await r.json().catch(() => ({}));
  return { status: r.status, body };
}

// Get the free tier (no payment needed).
async function getBounties(qs) {
  const { status, body } = await requestOnce('/bounties', qs);
  if (status !== 200) throw new Error('bounties failed: ' + status + ' ' + JSON.stringify(body));
  return body;
}

// Get the paid feed. `paymentProvider(requirements)` must return an X-PAYMENT header string,
// or throw. This separates signing (wallet-side) from the HTTP flow.
async function getFeed(qs, { paymentProvider } = {}) {
  let { status, body } = await requestOnce('/feed', qs);
  if (status === 200) return body;
  if (status === 402) {
    if (!paymentProvider) throw Object.assign(new Error('payment_required'), { requirements: body });
    const payment = await paymentProvider(body.accepts[0]);
    const retry = await requestOnce('/feed', qs, payment);
    if (retry.status === 200) return retry.body;
    throw Object.assign(new Error('payment_rejected'), { status: retry.status, body: retry.body });
  }
  throw new Error('feed failed: ' + status);
}

module.exports = { getBounties, getFeed, BASE };
