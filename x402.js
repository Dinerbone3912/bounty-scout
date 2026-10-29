'use strict';
/**
 * x402 payment gate — pay-per-call in USDC on Base, with ON-CHAIN settlement.
 *
 * Flow: request without payment -> HTTP 402 with payment requirements.
 *       client pays USDC on Base, retries with X-PAYMENT header carrying the
 *       EIP-3009 authorization + signature -> we verify structure, dedupe the
 *       nonce (replay), then confirm a matching ERC-20 Transfer actually
 *       settled on Base to our address for >= the price -> 200.
 *
 * POLICY: FAIL CLOSED. Unverifiable payment = 402. We never grant paid tier
 * on an unconfirmed payment.
 */
const crypto = require('crypto');
const { verifyOnChain } = require('./settle');

const PRICE_USDC = process.env.SCOUT_PRICE_USDC || '0.05';
const PAY_TO = process.env.SCOUT_PAY_TO || '0x944664B9d45fEf8C9BDBb084Ce59E6f6eE724861';
const NETWORK = 'base';
const ASSET = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

const seenPayments = new Set(); // replay protection (nonce dedupe)

function requirements(resource) {
  return {
    x402Version: 1,
    accepts: [{
      scheme: 'exact', network: NETWORK, maxAmountRequired: PRICE_USDC,
      resource, description: 'Bounty Scout feed — per-call access', mimeType: 'application/json',
      payTo: PAY_TO, maxTimeoutSeconds: 120, asset: ASSET, extra: { name: 'USDC', version: '2' },
    }],
  };
}

function decodePayment(header) {
  try { return JSON.parse(Buffer.from(header, 'base64').toString('utf8')); }
  catch (_) { try { return JSON.parse(header); } catch (e) { return null; } }
}

// Step 1: structural + replay check
function checkPayment(header, minAmount) {
  if (!header) return { ok: false, reason: 'no_payment' };
  const payload = decodePayment(header);
  if (!payload) return { ok: false, reason: 'bad_header' };
  const p = payload.payload || payload;
  const auth = p.authorization || p;
  const id = p.nonce || auth.nonce || crypto.createHash('sha256').update(header).digest('hex');
  if (seenPayments.has(id)) return { ok: false, reason: 'replay' };
  const to = (p.to || p.payTo || auth.to || '').toLowerCase();
  if (to && to !== PAY_TO.toLowerCase()) return { ok: false, reason: 'wrong_recipient' };
  const amt = Number(p.amount || auth.value != null ? (auth.value ? Number(auth.value) / 1e6 : p.amount) : 0) || Number(p.amount || 0);
  if (amt && amt < Number(minAmount)) return { ok: false, reason: 'underpaid' };
  return { ok: true, id, from: auth.from, to, amount: amt || Number(minAmount) };
}

function paywall(requiredAmount = PRICE_USDC) {
  return async (req, res, next) => {
    const header = req.header('X-PAYMENT') || req.header('x-payment');
    const chk = checkPayment(header, requiredAmount);
    if (!chk.ok) return res.status(402).json({ error: 'payment_required', reason: chk.reason, ...requirements(req.originalUrl) });

    // Step 2: on-chain settlement — must see the USDC transfer actually land.
    const settle = await verifyOnChain({ to: PAY_TO, from: chk.from, minAmount: requiredAmount });
    if (!settle.ok) {
      return res.status(402).json({ error: 'payment_unsettled', reason: settle.reason, retry_after_seconds: 15, ...requirements(req.originalUrl) });
    }
    seenPayments.add(chk.id);
    req.payment = { id: chk.id, tx: settle.tx, amount: settle.amount ?? Number(requiredAmount) };
    console.log(`[x402] SETTLED ${req.payment.amount} USDC tx=${settle.tx} nonce=${chk.id}`);
    next();
  };
}

module.exports = { paywall, requirements, PRICE_USDC, PAY_TO };
