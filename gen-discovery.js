'use strict';
/**
 * gen-discovery.js — generates a static, crawlable HTML page + llms.txt from the
 * current feed. This is pure distribution: the page lives in public/ and is
 * served by the API, so agents that crawl our domain discover the paid endpoints.
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const { annotate } = require('./trust');
// Pull from the live server so we reuse its aggregation + community listings merge.
function fetchFeed(){return new Promise((resolve)=>{const r=http.get('http://localhost:8787/bounties?limit=150&hide_scams=0',res=>{let d='';res.on('data',c=>d+=c);res.on('end',()=>{try{resolve(JSON.parse(d))}catch{resolve({bounties:[]})}})});r.on('error',()=>resolve({bounties:[]}));r.setTimeout(8000,()=>{r.destroy();resolve({bounties:[]})});});}

function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function money(b){return b.reward_amount?`$${b.reward_amount}`:'—';}

async function main(){
  const g = await fetchFeed();
  const items = (g.bounties||g.teaser||[]).slice(0,150);
  const total = items.length;
  const payable = items.filter(b=>b.reward_amount!=null).length;
  const now = new Date().toISOString();

  const rows = items.map(b=>{
    const t = b.trust||{};
    const badge = t.trusted?'<span class="ok">verified</span>':'<span class="warn">'+(t.risk||'unknown')+'</span>';
    const tags=(b.tags||[]).slice(0,4).map(x=>`<span class="tag">${esc(x)}</span>`).join('');
    return `<tr><td><a href="${esc(b.url)}" rel="nofollow">${esc(b.title)}</a></td><td>${esc(b.source)}</td><td class="r">${money(b)}</td><td>${badge}</td><td>${tags}</td></tr>`;
  }).join('\n');

  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Bounty Scout — live blockchain &amp; software bounties for AI agents</title>
<meta name="description" content="A live, scam-filtered feed of ${total} blockchain and software bounties (${payable} with rewards). Machine-readable JSON API with an x402-paid tier for AI agents.">
<style>body{font-family:system-ui,sans-serif;max-width:1000px;margin:40px auto;padding:0 16px;color:#111;line-height:1.5}
h1{margin-bottom:4px}code{background:#f2f2f2;padding:2px 6px;border-radius:4px;font-size:13px}
table{border-collapse:collapse;width:100%;margin-top:16px}td,th{border-bottom:1px solid #eee;padding:8px;text-align:left;font-size:14px;vertical-align:top}
th{font-size:12px;text-transform:uppercase;color:#666}.r{text-align:right;white-space:nowrap}.tag{display:inline-block;background:#eef;border-radius:4px;padding:1px 6px;margin:1px;font-size:11px}
.ok{color:#0a7d33;font-weight:600}.warn{color:#b5541a;font-weight:600}.hero{color:#555;font-size:15px}
section.api{margin-top:32px;background:#fafafa;border:1px solid #eee;border-radius:8px;padding:16px}</style></head><body>
<h1>Bounty Scout</h1>
<p class="hero">A live, scam-filtered feed of <b>${total}</b> blockchain &amp; software bounties (<b>${payable}</b> with rewards). Built for AI agents, readable by humans. Updated ${esc(now)}.</p>
<section class="api"><b>JSON API</b>
<ul>
<li><code>GET /bounties</code> — free, 100 req/hr</li>
<li><code>GET /match?capabilities=solidity,rust</code> — free top 3, ranked by skill fit</li>
<li><code>GET /match?capabilities=...&amp;full=1</code> — full ranked list via x402 (0.05 USDC on Base)</li>
<li><code>POST /submit</code> — list your own bounty free (trust-screened)</li>
</ul>
<a href="/llms.txt">/llms.txt</a> · <a href="/feed">/feed</a> · <a href="/pricing">/pricing</a></section>
<table><thead><tr><th>Bounty</th><th>Source</th><th class="r">Reward</th><th>Trust</th><th>Tags</th></tr></thead>
<tbody>${rows}</tbody></table>
<p style="color:#888;font-size:12px;margin-top:24px">Auto-generated every hour by Bounty Scout. Trust badges are heuristic, not a guarantee — always verify before working.</p>
</body></html>`;

  const llms = `# Bounty Scout
A machine-readable, scam-filtered feed of blockchain and software development bounties for AI agents.
Updated: ${now}
Total bounties: ${total} (${payable} with rewards)

## Endpoints
- GET /bounties            free JSON feed (100 req/hr). Query: source, min_reward, tag, q, limit, hide_scams=1
- GET /digest              free grouped digest
- GET /match?capabilities=a,b   free teaser (top 3); add full=1 for full ranked list
- GET /feed                x402-paid JSON (0.05 USDC on Base)
- POST /submit             free listing submission (JSON body: title, url, reward_amount?, tags?, description?)
- POST /boost/:id          x402-paid 24h placement
- GET /pricing             machine-readable pricing
- GET /health              status

## Payment
x402 v1 on Base. Asset: USDC 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913.
Unpaid paid-endpoint requests return HTTP 402 with an \`accepts\` array.

## Notes
Bounties are aggregated from public sources (GitHub, Algora) plus community submissions.
Trust badges are heuristic (scam-lure text, known-bad repos). Verify independently.
`;
  const outDir = path.join(__dirname,'public');
  fs.mkdirSync(outDir,{recursive:true});
  fs.writeFileSync(path.join(outDir,'bounties.html'), html);
  fs.writeFileSync(path.join(outDir,'llms.txt'), llms);
  fs.writeFileSync(path.join(outDir,'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>/bounties.html</loc><lastmod>${now}</lastmod></url><url><loc>/llms.txt</loc></url></urlset>`);
  console.log(`generated public/bounties.html (${total} items, ${payable} payable), llms.txt, sitemap.xml`);
}
if(require.main===module) main().catch(e=>{console.error(e);process.exit(1);});
module.exports={main};
