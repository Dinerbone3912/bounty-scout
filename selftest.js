'use strict';
/**
 * Bounty Scout self-test.
 * Validates: free tier serves data; paid tier enforces payment; paid tier fails
 * closed on unsettled payment; replay/structure checks reject malformed input.
 * (Full settled-payment path requires a real funded wallet + live Base RPC and is
 * exercised by the payer.js client in production, not in this offline test.)
 */
const { getBounties, getFeed, BASE } = require('./client');

async function rawFeed(headers = {}) {
  const r = await fetch(BASE + '/feed?limit=1', { headers });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}

(async () => {
  let ok = 0, fail = 0;
  const t = (name, cond, extra) => { cond ? (ok++, console.log('PASS', name)) : (fail++, console.log('FAIL', name, extra || '')); };

  // 1. free tier
  const free = await getBounties({ limit: 1 });
  t('free tier returns bounties', Array.isArray(free.bounties) && free.tier === 'free');

  // 2. paid without payment -> 402 payment_required
  const noPay = await rawFeed();
  t('paid w/o payment -> 402 payment_required', noPay.status === 402 && noPay.body.error === 'payment_required');

  // 3. malformed header -> 402 (structure rejected, fails closed)
  const bad = await rawFeed({ 'X-PAYMENT': 'not-valid-base64-json' });
  t('malformed payment -> 402 (fail-closed)', bad.status === 402);

  // 4. well-formed but unsettled -> 402 payment_unsettled (fail-closed, never grants)
  const crypto = require('crypto');
  const mock = Buffer.from(JSON.stringify({ payload: { amount: '0.05', to: '0x944664B9d45fEf8C9BDBb084Ce59E6f6eE724861', payTo: '0x944664B9d45fEf8C9BDBb084Ce59E6f6eE724861', nonce: '0x' + crypto.randomBytes(32).toString('hex'), from: '0x0000000000000000000000000000000000000001' } })).toString('base64');
  const unsettled = await rawFeed({ 'X-PAYMENT': mock });
  t('well-formed but unsettled -> 402, never 200', unsettled.status === 402, JSON.stringify(unsettled.body));

  console.log(`\n${ok} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
