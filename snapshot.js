'use strict';
/**
 * snapshot.js — export a frozen, dated, self-describing bounty snapshot.
 * A dated snapshot file is a durable, verifiable deliverable that survives
 * tunnel-URL churn: it carries data + provenance + the paid-API pointer, so it
 * can be distributed anywhere (MCP, gist, relay) and still convert.
 * Output: out/bounties-<YYYYMMDD>.json and .md
 * Usage: node snapshot.js [--limit 100]
 */
const fs = require('fs'), path = require('path'), http = require('http'), crypto = require('crypto');
function get(p){return new Promise(r=>{const q=http.get('http://localhost:8787'+p,res=>{let d='';res.on('data',c=>d+=c);res.on('end',()=>{try{r(JSON.parse(d))}catch{r({})}})});q.on('error',()=>r({}));q.setTimeout(12000,()=>{q.destroy();r({})});});}
const sha256=s=>crypto.createHash('sha256').update(s).digest('hex');
(async()=>{
  const ai=process.argv.indexOf('--limit');
  const limit=ai>-1?(parseInt(process.argv[ai+1],10)||100):100;
  const liveUrl=fs.existsSync('PUBLIC_URL.txt')?fs.readFileSync('PUBLIC_URL.txt','utf8').trim():null;
  const feed=await get('/bounties?limit='+limit);
  const items=(feed.bounties||feed.teaser||[]).filter(b=>b.reward_amount!=null);
  items.sort((a,b)=>(b.reward_amount||0)-(a.reward_amount||0)||String(a.url).localeCompare(String(b.url)));
  const generated=new Date().toISOString(), stamp=generated.slice(0,10).replace(/-/g,'');
  const digest=sha256(JSON.stringify(items,null,2));
  const snapshot={
    schema:'bounty-scout/snapshot@1', generated_at:generated, digest_sha256:digest,
    count:items.length, total_reward:items.reduce((s,b)=>s+(Number(b.reward_amount)||0),0),
    provenance:{source_endpoints:['/bounties?limit='+limit], upstream_sources:['github','algora']},
    offer:{operator:'Glider (autonomous agent)', wallet:'0x944664B9d45fEf8C9BDBb084Ce59E6f6eE724861',
      live_api:liveUrl||'see /agent-card.json',
      paid_endpoints:[{path:'/feed',price:'0.05',asset:'USDC',network:'base',scheme:'x402'},{path:'/match?full=1',price:'0.05',asset:'USDC',network:'base',scheme:'x402'}],
      refreshed_snapshots:liveUrl?liveUrl+'/snapshot':null,
      note:'This snapshot is free. The live API offers unlimited, matched, current data.'},
    bounties:items};
  fs.mkdirSync('out',{recursive:true});
  fs.writeFileSync(path.join('out',`bounties-${stamp}.json`),JSON.stringify(snapshot,null,2));
  const md=[`# Bounty snapshot — ${generated.slice(0,10)}`,'',
    `**${snapshot.count} payable bounties · $${snapshot.total_reward.toLocaleString()} total · digest \`${digest.slice(0,12)}\`**`,'',
    '| Reward | Bounty |','|---:|---|'];
  for(const b of items.slice(0,40)){md.push(`| $${b.reward_amount} | [${String(b.title||'').slice(0,80).replace(/\|/g,'/')}](${b.url}) |`);}
  md.push('',`Live, matched, always-current feed: ${snapshot.offer.live_api}`,
    `Pay-per-call 0.05 USDC (Base) via x402 — wallet \`${snapshot.offer.wallet}\`.`);
  fs.writeFileSync(path.join('out',`bounties-${stamp}.md`),md.join('\n'));
  console.log(`snapshot: out/bounties-${stamp}.json (${snapshot.count} items, $${snapshot.total_reward}, digest ${digest.slice(0,12)})`);
})().catch(e=>{console.error('snapshot failed:',e.message);process.exit(1);});
