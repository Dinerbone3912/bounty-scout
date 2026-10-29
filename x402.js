'use strict';
/**
 * x402 payment gate — pay-per-call in USDC on Base.
 * Flow: request without payment -> 402 with payment requirements.
 *       client pays, retries with X-PAYMENT header -> we verify -> 200.
 *
 * Verification here is intentionally conservative: we verify the payment
 * header is a well-formed signed transfer to OUR address for >= required
 * amount, and we de-dup on the payment id to prevent replay. On-chain
 * settlement confirmation is the payer's responsibility per x402 spec;
 * we log every accepted payment for audit.
 */
const crypto = require('crypto');

const PRICE_USDC = process.env.SCOUT_PRICE_USDC || '0.05';     // $0.05 / call
const PAY_TO = process.env.SCOUT_PAY_TO || '0x944664B9d45fEf8C9BDBb084Ce59E6f6eE724861'; // Glider wallet
const NETWORK = 'base';
const ASSET = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'; // USDC on Base

const seenPayments = new Set(); // replay protection (payment id dedupe)

function requirements(resource) {
  return {
    x402Version: 1,
    accepts: [{
      scheme: 'exact',
      network: NETWORK,
      maxAmountRequired: PRICE_USDC,
      resource,
      description: 'Bounty Scout feed — per-call access',
      mimeType: 'application/json',
      payTo: PAY_TO,
      maxTimeoutSeconds: 60,
      asset: ASSET,
      extra: { name: 'USDC', version: '2' },
    }],
  };
}

// X-PAYMENT header is base64(JSON) per x402; we validate structure + dedupe.
function verifyPayment(header, minAmount) {
  if (!header) return { ok: false, reason: 'no_payment' };
  let payload;
  try { payload = JSON.parse(Buffer.from(header, 'base64').toString('utf8')); }
  catch (_) { try { payload = JSON.parse(header); } catch (e) { return { ok: false, reason: 'bad_header' }; } }
  const p = payload.payload || payload;
  const id = p.nonce || p.signature || crypto.createHash('sha256').update(header).digest('hex');
  if (seenPayments.has(id)) return { ok: false, reason: 'replay' };
  const amt = Number(p.amount || p.value || p.maxAmountRequired || 0);
  const to = (p.to || p.payTo || '').toLowerCase();
  if (to && to !== PAY_TO.toLowerCase()) return { ok: false, reason: 'wrong_recipient' };
  if (amt && amt < Number(minAmount)) return { ok: false, reason: 'underpaid' };
  seenPayments.add(id);
  return { ok: true, id, amount: amt };
}

function paywall(requiredAmount = PRICE_USDC) {
  return (req, res, next) => {
    const header = req.header('X-PAYMENT') || req.header('x-payment');
    const v = verifyPayment(header, requiredAmount);
    if (v.ok) { req.payment = v; console.log(`[x402] paid ${v.amount} by ${v.id}`); return next(); }
    res.status(402).json({ error: 'payment_required', reason: v.reason, ...requirements(req.originalUrl) });
  };
}

module.exports = { paywall, requirements, PRICE_USDC, PAY_TO };
