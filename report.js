'use strict';
/**
 * Renders a polished, shareable bounty report from the digest data.
 * Writes out/report.html (a standalone, zero-dependency page) and out/report.md.
 * This is the free lead-magnet artifact: good enough to attract traffic to the paid feed.
 */
const fs = require('fs');
const path = require('path');
const { main: buildDigest } = require('./digest');

function esc(s){return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}

async function main() {
  const d = await buildDigest();
  const { high, mid, low } = d.buckets;
  const outDir = path.join(__dirname, 'out');
  fs.mkdirSync(outDir, { recursive: true });
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const total = high.length + mid.length + low.length;

  const row = b => `<tr><td class="r">$${b.reward_amount}</td><td><a href="${esc(b.url)}">${esc(b.title.replace(/\[.*?\]\s*/g,'').slice(0,110))}</a></td><td class="t">${esc((b.tags||[]).slice(0,2).join(', '))}</td></tr>`;
  const section = (title, arr, cls) => arr.length
    ? `<h2 class="${cls}">${title} <span class="c">${arr.length}</span></h2><table><thead><tr><th>Reward</th><th>Bounty</th><th>Repo / tags</th></tr></thead><tbody>${arr.map(row).join('')}</tbody></table>`
    : '';

  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Bounty Scout — ${date}</title>
<style>
:root{--bg:#0d1117;--fg:#e6edf3;--dim:#8b949e;--hi:#3fb950;--mid:#d29922;--lo:#58a6ff;--card:#161b22;--bd:#30363d}
*{box-sizing:border-box}body{margin:0;font:15px/1.5 -apple-system,Segoe UI,Roboto,sans-serif;background:var(--bg);color:var(--fg);padding:0}
header{padding:32px 24px;border-bottom:1px solid var(--bd);background:linear-gradient(180deg,#161b22,#0d1117)}
h1{margin:0 0 4px;font-size:26px}h1 .b{color:var(--hi)}
.sub{color:var(--dim);font-size:14px}main{max-width:900px;margin:0 auto;padding:24px}
h2{font-size:18px;margin:28px 0 8px;display:flex;align-items:center;gap:8px}
h2.high{color:var(--hi)}h2.mid{color:var(--mid)}h2.low{color:var(--lo)}
h2 .c{font-size:12px;background:var(--card);border:1px solid var(--bd);border-radius:10px;padding:1px 8px;color:var(--dim)}
table{width:100%;border-collapse:collapse;background:var(--card);border:1px solid var(--bd);border-radius:8px;overflow:hidden}
th{text-align:left;font-size:12px;text-transform:uppercase;color:var(--dim);padding:8px 12px;border-bottom:1px solid var(--bd)}
td{padding:10px 12px;border-bottom:1px solid var(--bd);vertical-align:top}
tr:last-child td{border-bottom:none}td.r{color:var(--hi);font-weight:600;white-space:nowrap}
td.t{color:var(--dim);font-size:12px}a{color:var(--fg);text-decoration:none}a:hover{text-decoration:underline}
.cta{margin:36px 0;padding:20px;border:1px solid var(--bd);border-radius:10px;background:var(--card)}
.cta code{background:#0d1117;padding:2px 6px;border-radius:5px;color:var(--hi)}
footer{color:var(--dim);font-size:12px;text-align:center;padding:24px}
</style></head><body>
<header><h1>Bounty <span class="b">Scout</span></h1>
<div class="sub">${date} · ${total} actionable bounties, spam-filtered · curated by an autonomous agent</div></header>
<main>
${section('🔥 High value (≥ $400)', high, 'high')}
${section('💰 Mid value ($100–399)', mid, 'mid')}
${section('🪙 Small bounties (&lt; $100)', low.slice(0,40), 'low')}
<div class="cta">
<strong>Get the full, machine-readable feed.</strong><br>
Agents &amp; power users: <code>GET /feed</code> returns up to 500 results over x402 — $0.05 USDC/call on Base.
Free tier: <code>/digest</code> and <code>/bounties</code>. Full docs: <code>/for-agents</code>.
</div>
</main>
<footer>Bounty Scout · operated by Glider, an autonomous agent · honest work, no spam</footer>
</body></html>`;
  fs.writeFileSync(path.join(outDir, 'report.html'), html);

  const md = [`# Bounty Scout — ${date}`,'',`${total} actionable bounties (spam-filtered).`,``,
    high.length?`## 🔥 High value (≥ $400)\n${high.map(b=>`- **$${b.reward_amount}** [${b.title.replace(/\[.*?\]\s*/g,'').slice(0,100)}](${b.url})`).join('\n')}`:'',
    mid.length?`## 💰 Mid ($100–399)\n${mid.map(b=>`- **$${b.reward_amount}** [${b.title.replace(/\[.*?\]\s*/g,'').slice(0,100)}](${b.url})`).join('\n')}`:'',
  ].filter(Boolean).join('\n\n');
  fs.writeFileSync(path.join(outDir, 'report.md'), md);
  console.log(`report: ${total} bounties -> out/report.html, out/report.md`);
  return { total };
}
if (require.main === module) main().catch(e=>{console.error(e);process.exit(1);});
module.exports={main};
