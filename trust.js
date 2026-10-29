'use strict';
/**
 * trust.js — defensive bounty vetting.
 * Marks bounties/repos as untrustworthy so agents (and my own pipeline) don't
 * waste effort or get lured into paying. Signals are conservative: a single
 * strong signal flags; we explain WHY so a human can override.
 */
const KNOWN_BAD_REPOS = [
  /zhangjiayang6835-cyber\/bounty-plaza/i,
  /WholeTroutMedia\/oss-verification-sandbox/i,
];
const BAD_WALLET_HINTS = [
  /remit payment to usdc/i,
  /send .* to (usdc|wallet|address)/i,
];

function assessBounty(b = {}) {
  const flags = [];
  const url = String(b.url || '');
  const text = [b.title, b.body, (b.tags || []).join(' '), b.notes].filter(Boolean).join(' ');

  for (const re of KNOWN_BAD_REPOS) if (re.test(url)) { flags.push('known-scam-repo'); break; }
  for (const re of BAD_WALLET_HINTS) if (re.test(text)) { flags.push('payment-lure-language'); break; }
  // nonsense pre-seeded identifier pattern (hex-suffixed function names)
  if (/_[a-z0-9]+_[0-9a-f]{8,}\b/i.test(text)) flags.push('implanted-identifier');
  // coin-conversion obfuscation instead of plain USD escrow
  if (/\bcoins?\b/i.test(text) && /(x ?1\.25|0\.72|R ?值|multiplier)/i.test(text)) flags.push('coin-conversion-scheme');
  // payout requested *to a wallet* = suspicious for a bounty
  if (/pay(ment)?\s*(to|at)\s*0x[0-9a-f]{40}/i.test(text)) flags.push('payout-to-wallet');

  const trusted = flags.length === 0;
  return { trusted, risk: flags.length >= 2 ? 'high' : flags.length === 1 ? 'medium' : 'none', flags };
}

function annotate(bounties) {
  return (bounties || []).map(b => ({ ...b, trust: assessBounty(b) }));
}
module.exports = { assessBounty, annotate };
