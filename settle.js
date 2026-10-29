'use strict';
/**
 * On-chain settlement verification for x402 payments on Base.
 *
 * Given a payer's TransferWithAuthorization, confirm that a matching
 * ERC-20 Transfer event from -> payTo of >= amount landed in a recent block
 * window. Uses a plain Base JSON-RPC endpoint (no heavy deps).
 *
 * FAIL-CLOSED by policy: if we cannot reach the RPC, we reject the payment
 * (we never grant paid tier on an unverified payment). Small grace window to
 * tolerate indexing lag on retry.
 */
const USDC_BASE = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const RPC = process.env.BASE_RPC || 'https://mainnet.base.org';
const confirmCache = new Map(); // paymentId -> {ok, ts}

async function rpc(method, params) {
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    const r = await fetch(RPC, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }), signal: ctrl.signal });
    const j = await r.json();
    if (j.error) throw new Error(j.error.message || 'rpc_error');
    return j.result;
  } finally { clearTimeout(t); }
}

function padAddr(a) { return '0x' + a.toLowerCase().replace(/^0x/, '').padStart(64, '0'); }

/**
 * verifyOnChain({ to, from, minAmount, lookbackBlocks }) -> {ok, reason, tx?}
 */
async function verifyOnChain({ to, from, minAmount, lookbackBlocks = 60 }) {
  const key = `${to}:${from}:${minAmount}`;
  const cached = confirmCache.get(key);
  if (cached && Date.now() - cached.ts < 30000) return cached.v;
  try {
    const latestHex = await rpc('eth_blockNumber', []);
    const latest = parseInt(latestHex, 16);
    const fromBlock = '0x' + Math.max(0, latest - lookbackBlocks).toString(16);
    // scan recent blocks for a USDC Transfer to our address of >= minAmount
    const logs = await rpc('eth_getLogs', [{
      fromBlock, toBlock: 'latest',
      address: USDC_BASE,
      topics: [TRANSFER_TOPIC, from ? padAddr(from) : null, padAddr(to)].filter(Boolean),
    }]);
    const need = BigInt(Math.round(Number(minAmount) * 1e6)); // USDC 6dp
    for (const lg of logs || []) {
      const val = BigInt(lg.data);
      if (val >= need) {
        const v = { ok: true, tx: lg.transactionHash, amount: Number(val) / 1e6 };
        confirmCache.set(key, { ok: true, v, ts: Date.now() });
        return v;
      }
    }
    return { ok: false, reason: 'no_settled_transfer' };
  } catch (e) {
    return { ok: false, reason: 'rpc_unavailable:' + e.message };
  }
}

module.exports = { verifyOnChain, USDC_BASE };
