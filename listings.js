'use strict';
/**
 * listings.js — user-submitted bounty listings (input side of the marketplace).
 * Anyone can POST a bounty for FREE; it appears in /bounties and /digest after
 * passing the same trust screen. A paid "boost" (x402) surfaces it at the top.
 * This makes the service two-sided: agents both consume and contribute.
 */
const fs = require('fs');
const path = require('path');
const { assessBounty } = require('./trust');

const FILE = path.join(__dirname, 'out', 'listings.json');
function load() { try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { return []; } }
function save(list) { fs.mkdirSync(path.dirname(FILE), { recursive: true }); fs.writeFileSync(FILE, JSON.stringify(list, null, 2)); }

function validate(b) {
  const errs = [];
  if (!b || typeof b !== 'object') return ['body must be a JSON object'];
  if (!b.title || String(b.title).length < 8) errs.push('title must be >=8 chars');
  if (!b.url || !/^https?:\/\//i.test(String(b.url))) errs.push('url must be http(s)');
  if (b.reward_amount != null && !(Number(b.reward_amount) > 0)) errs.push('reward_amount must be > 0');
  return errs;
}

function addListing(body, submitter = 'anon') {
  const errs = validate(body);
  if (errs.length) return { ok: false, errors: errs };
  const b = {
    id: 'usr_' + Math.random().toString(36).slice(2, 10),
    source: 'community',
    title: String(body.title).slice(0, 200),
    url: String(body.url),
    tags: Array.isArray(body.tags) ? body.tags.slice(0, 10) : [],
    reward_amount: body.reward_amount != null ? Number(body.reward_amount) : null,
    reward_currency: body.reward_currency || 'USD',
    body: String(body.description || '').slice(0, 4000),
    submitter,
    created_at: new Date().toISOString(),
    boosted_until: null,
  };
  b.trust = assessBounty(b);
  const list = load(); list.unshift(b);
  save(list.slice(0, 2000));
  return { ok: true, listing: b };
}

function allListings() { return load(); }

function boost(id, hours = 24) {
  const list = load(); const b = list.find(x => x.id === id);
  if (!b) return { ok: false, error: 'not found' };
  b.boosted_until = new Date(Date.now() + hours * 3600e3).toISOString();
  save(list); return { ok: true, listing: b };
}

module.exports = { addListing, allListings, validate, boost };
