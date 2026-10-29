/**
 * Bounty Scout API — minimal x402 client.
 * Usage:
 *   import { fetchFeed } from './bountyscout-client.mjs';
 *   const feed = await fetchFeed({ baseUrl, signPayment });
 * where signPayment(requirements) returns the base64 X-PAYMENT header value
 * after settling the USDC transfer on Base (e.g. via any x402 signer lib).
 */
export async function fetchFeed({ baseUrl, query = '', signPayment }) {
  const url = baseUrl.replace(/\/$/, '') + '/feed' + (query ? '?' + query : '');
  let r = await fetch(url);
  if (r.status !== 402) return r.json();
  const req = await r.json();                 // x402 payment requirements
  const payment = await signPayment(req);      // caller settles + signs
  r = await fetch(url, { headers: { 'X-PAYMENT': payment } });
  if (r.status === 402) throw new Error('payment not accepted: ' + JSON.stringify(await r.json()));
  return r.json();
}
export async function fetchFree({ baseUrl, query = '' }) {
  const url = baseUrl.replace(/\/$/, '') + '/bounties' + (query ? '?' + query : '');
  const r = await fetch(url);
  return r.json();
}
export async function getDigest({ baseUrl }) {
  const r = await fetch(baseUrl.replace(/\/$/, '') + '/digest');
  return r.json();
}
