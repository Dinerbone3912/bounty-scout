'use strict';
/**
 * build-dist.js — assembles a self-contained static bundle in ./dist that can be
 * dropped onto ANY static host (GitHub Pages, Netlify Drop, Cloudflare Pages,
 * Vercel) with zero account setup. It contains:
 *   index.html        landing + live bounty table (regenerated at build time)
 *   llms.txt          machine-readable API description
 *   sitemap.xml, robots.txt
 *   api.json          where the JSON API lives (the creator edits this one line)
 *   app.js            a tiny client demo that calls the configured API base
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const API_BASE = process.env.SCOUT_BASE || 'https://YOUR-DEPLOYED-HOST';

function main(){
  fs.mkdirSync('dist', { recursive: true });
  // regenerate discovery first so it's fresh in the bundle
  try { execFileSync('node', ['gen-discovery.js'], {stdio:'inherit'}); } catch(e){ console.error('gen-discovery failed (continuing with existing public/)'); }

  for (const f of ['bounties.html','llms.txt','sitemap.xml']) {
    const src = path.join('public', f);
    if (fs.existsSync(src)) fs.copyFileSync(src, path.join('dist', f));
  }
  // landing page = the generated bounties page, but rewritten to point API links at API_BASE
  if (fs.existsSync('public/bounties.html')) {
    let html = fs.readFileSync('public/bounties.html','utf8');
    // rewrite relative API links to absolute API base
    html = html.replace(/href="\/([a-z0-9.\-]+)"/gi, (m,p)=>`href="${API_BASE}/${p}"`);
    html = html.replace('</body>', `<script src="app.js"></script></body>`);
    fs.writeFileSync('dist/index.html', html);
  }
  fs.writeFileSync(path.join('dist','api.json'), JSON.stringify({ api_base: API_BASE, generated: new Date().toISOString(), endpoints: {
    bounties:'/bounties', match:'/match?capabilities=...', feed:'/feed (x402 0.05 USDC)', pricing:'/pricing', health:'/health', llms:'/llms.txt'
  }}, null, 2));
  fs.writeFileSync(path.join('dist','app.js'), `// Bounty Scout client demo — fetch config then call the API
(async () => {
  try {
    const cfg = await (await fetch('api.json')).json();
    const el = document.querySelector('.api');
    if (el && cfg.api_base) {
      el.insertAdjacentHTML('beforeend',
        '<p><b>API base:</b> <code>' + cfg.api_base + '</code></p>' +
        '<button onclick="(async()=>{const r=await fetch(\\'' + cfg.api_base + '/match?capabilities=solidity\\');const j=await r.json();alert(JSON.stringify(j.teaser||j,null,2));})()">Try /match (top 3 solidity bounties)</button>');
    }
  } catch(e) { console.warn('api.json not found', e); }
})();
`);
  fs.writeFileSync(path.join('dist','robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${API_BASE}/sitemap.xml\n`);
  fs.writeFileSync(path.join('dist','DEPLOY.md'), `# Deploy Bounty Scout (static) in 30 seconds

No account needed for some hosts.

## Netlify Drop (no account)
1. Open https://app.netlify.com/drop
2. Drag the \`dist/\` folder onto the page.
3. Done — you get a public URL instantly.

## GitHub Pages (no extra signup)
\`\`\`bash
git subtree push --prefix dist origin gh-pages
\`\`\`

## Cloudflare Pages / Vercel
Drag \`dist/\` or connect the repo and set the output directory to \`dist\`.

**IMPORTANT:** after you have the API hosted somewhere, edit \`dist/api.json\`
(or set \`SCOUT_BASE\` and re-run \`node build-dist.js\`) so the buttons point at the
real API. The static page alone is a discovery surface; the paid endpoints live on
the API host.
`);
  const n = fs.readdirSync('dist').length;
  console.log(`built dist/ (${n} files). API_BASE=${API_BASE}`);
}
main();
