#!/usr/bin/env node
'use strict';
/**
 * refresh-url.js — single source of truth for the CURRENT public URL.
 * Reads PUBLIC_URL.txt (written by tunnel-supervisor.js), then propagates it to
 * every surface that must not go stale:
 *   - public/latest-url.txt        (pollable by agents)
 *   - public/.well-known/agent-service.json  (base_url)
 *   - public/sale.html             (rewrite embedded API base)
 *   - AGENTS.md, public/llms.txt   (base URL references)
 * Idempotent; safe to run on a timer. Exit 0 even if nothing changed.
 */
const fs = require('fs');
const path = require('path');
const R = (p) => path.join(__dirname, p);
if (!fs.existsSync(R('PUBLIC_URL.txt'))) { console.log('no PUBLIC_URL.txt yet'); process.exit(0); }
const url = fs.readFileSync(R('PUBLIC_URL.txt'), 'utf8').trim();
if (!/^https:\/\/[a-z0-9.-]+$/i.test(url)) { console.log('invalid url:', url); process.exit(0); }

let changed = 0;
function put(rel, content) {
  const abs = R(rel);
  const prev = fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : null;
  if (prev !== content) { fs.mkdirSync(path.dirname(abs), { recursive: true }); fs.writeFileSync(abs, content); changed++; console.log('updated', rel); }
}

// 1) pollable pointer
put('public/latest-url.txt', url + '\n');

// 2) agent-service.json base_url
try {
  const sw = R('public/.well-known/agent-service.json');
  if (fs.existsSync(sw)) {
    const j = JSON.parse(fs.readFileSync(sw, 'utf8'));
    if (j.base_url !== url) { j.base_url = url; j.updated = new Date().toISOString(); put('public/.well-known/agent-service.json', JSON.stringify(j, null, 2)); }
  }
} catch (e) { console.log('agent-service update skipped:', e.message); }

// 3) sale.html embedded base
try {
  const sp = R('public/sale.html');
  if (fs.existsSync(sp)) {
    let h = fs.readFileSync(sp, 'utf8');
    const nh = h.replace(/https:\/\/[a-z0-9.-]+\.lhr\.life/g, url).replace(/(<b>API base:<\/b> <code>)[^<]*/, `$1${url}`);
    if (nh !== h) put('public/sale.html', nh);
  }
} catch (e) {}

// 4) AGENTS.md + llms.txt (replace any lhr.life / placeholder host)
for (const rel of ['AGENTS.md', 'public/llms.txt']) {
  try {
    const p = R(rel); if (!fs.existsSync(p)) continue;
    let t = fs.readFileSync(p, 'utf8');
    const nt = t.replace(/https:\/\/[a-z0-9.-]+\.lhr\.life/g, url).replace(/https:\/\/YOUR-DEPLOYED-HOST/g, url).replace(/https:\/\/<this-host>/g, url);
    if (nt !== t) put(rel, nt);
  } catch (e) {}
}

console.log(`refresh-url: ${url} (${changed} file(s) updated)`);
