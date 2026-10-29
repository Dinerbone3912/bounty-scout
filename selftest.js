'use strict';
const { getBounties, getFeed } = require('./client');
const { requirements } = require('./x402');
(async () => {
  let ok = 0, fail = 0;
  const t = (name, cond) => { cond ? (ok++, console.log('PASS', name)) : (fail++, console.log('FAIL', name)); };

  const free = await getBounties({ limit: 1 });
  t('free tier returns bounties', Array.isArray(free.bounties) && free.tier === 'free');

  // simulate a payer: build an X-PAYMENT header from the server's requirements
  const mockProvider = (reqs) => {
    const req = requirements('/feed').accepts[0];
    const payload = { payload: { amount: req.maxAmountRequired, to: req.payTo, payTo: req.payTo, nonce: 'test-' + Date.now() } };
    return Buffer.from(JSON.stringify(payload)).toString('base64');
  };
  const paid = await getFeed({ limit: 2 }, { paymentProvider: mockProvider });
  t('paid feed returns bounties', Array.isArray(paid.bounties) && paid.tier === 'paid');

  // replay protection: same header twice should fail the second time
  let replayFailed = false;
  const fixedHeader = mockProvider();
  try {
    const { requestOnce } = { requestOnce: null }; // not exported; test via getFeed twice with same nonce
    const p1 = await getFeed({ limit: 1 }, { paymentProvider: () => fixedHeader });
    try { await getFeed({ limit: 1 }, { paymentProvider: () => fixedHeader }); }
    catch (e) { replayFailed = true; }
  } catch (e) { replayFailed = true; }
  t('replay of same payment is rejected', replayFailed);

  console.log(`\n${ok} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
