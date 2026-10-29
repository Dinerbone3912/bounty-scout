'use strict';
/**
 * find-workable.js — scan the live feed for bounties that are (a) payable,
 * (b) tied to a single GitHub issue/PR I could actually patch, and (c) small/
 * self-contained enough to solve locally without a maintainer relationship.
 * Output: workable.json ranked by (reward desc, difficulty asc heuristic).
 */
const http = require('http');
function get(p){return new Promise(r=>{const q=http.get('http://localhost:8787'+p,res=>{let d='';res.on('data',c=>d+=c);res.on('end',()=>{try{r(JSON.parse(d))}catch{r({})}})});q.on('error',()=>r({}));q.setTimeout(8000,()=>{q.destroy();r({})});});}
(async()=>{
  const feed = await get('/bounties?limit=150');
  const items = feed.bounties || feed.teaser || [];
  const workable = items.filter(b=>{
    if (b.reward_amount==null) return false;
    if (!/github\.com/i.test(b.url||'')) return false;
    if (b.trust && b.trust.trusted===false) return false;
    return true;
  }).map(b=>{
    // difficulty heuristic from title keywords
    const t=(b.title||'').toLowerCase();
    let diff=5;
    if(/typo|doc|readme|comment|string|log|message|error message/.test(t)) diff=2;
    else if(/bug|fix|refactor|test|rename/.test(t)) diff=3;
    else if(/feature|implement|add support|api/.test(t)) diff=6;
    else if(/protocol|consensus|security|crypto|compiler/.test(t)) diff=8;
    return { title:b.title, url:b.url, reward:b.reward_amount, source:b.source, tags:b.tags||[], difficulty:diff, score:+(b.reward_amount/diff).toFixed(2) };
  }).sort((a,b)=>b.score-a.score);
  require('fs').writeFileSync('workable.json', JSON.stringify({generated:new Date().toISOString(), count:workable.length, items:workable},null,2));
  console.log(`workable: ${workable.length} payable GitHub bounties`);
  workable.slice(0,8).forEach(w=>console.log(`  $${w.reward} d${w.difficulty}\t${w.title.slice(0,60)}\t${w.url}`));
})();
