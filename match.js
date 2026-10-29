'use strict';
/** /match — capability-aware bounty matching. */
const STOP = new Set(['the','a','an','for','to','of','and','in','on','with','write','build','add','fix','implement','support','issue']);
function tokenize(s){return String(s||'').toLowerCase().split(/[^a-z0-9+#.]+/).filter(t=>t&&t.length>1&&!STOP.has(t));}
function profileTokens(cap,tags){const bag=new Set();for(const c of [].concat(cap||[],tags||[]))for(const t of tokenize(c))bag.add(t);return bag;}
function matchBounties(bounties,opts={}){
  const profile=profileTokens(opts.capabilities,opts.tags);
  const minReward=Number(opts.minReward)||0; const now=Date.now();
  return (bounties||[]).filter(b=>!opts.wantPayable||b.reward_amount!=null).filter(b=>(b.reward_amount||0)>=minReward)
    .map(b=>{
      const text=[b.title,...(b.tags||[])].join(' '); const bt=tokenize(text);
      let overlap=0; const hit=[];
      for(const t of bt) if(profile.has(t)){overlap++; if(hit.length<8&&!hit.includes(t))hit.push(t);}
      const overlapScore=overlap*10;
      const rewardScore=b.reward_amount?Math.log10(b.reward_amount+1)*6:0;
      let recencyScore=0;
      if(b.posted_at){const days=(now-Date.parse(b.posted_at))/86400000; if(!isNaN(days))recencyScore=Math.max(0,20-days);}
      const score=overlapScore+rewardScore+recencyScore;
      const reasons=[]; if(hit.length)reasons.push('matches: '+hit.join(', '));
      if(b.reward_amount)reasons.push('pays '+b.reward_amount+' '+(b.reward_currency||''));
      if(recencyScore>12)reasons.push('recent');
      return {...b,score:Math.round(score*100)/100,reasons};
    }).sort((a,b)=>b.score-a.score);
}
module.exports={matchBounties,tokenize};
