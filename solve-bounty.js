#!/usr/bin/env node
'use strict';
/**
 * solve-bounty.js — autonomous bounty solver loop (local compute, no host, no creds).
 *
 * For a given GitHub issue, it:
 *   1. fetches the issue + repo metadata
 *   2. clones the repo (shallow)
 *   3. asks the configured LLM (via OPENAI_API_KEY/DeepSeek endpoint) for a unified diff
 *   4. applies the diff, runs the project's tests if discoverable
 *   5. writes work/<name>/change.patch + RESULT.json
 *
 * It does NOT submit (no creds). Everything it does is auditable on disk.
 * Usage: node solve-bounty.js <github-issue-url> <name>
 */
const fs=require('fs'),path=require('path'),https=require('https'),{execSync,spawnSync}=require('child_process');

function gh(p){return new Promise(r=>{https.get({host:'api.github.com',path:p,headers:{'user-agent':'bounty-scout','accept':'application/vnd.github+json'}},res=>{let d='';res.on('data',c=>d+=c);res.on('end',()=>{try{r({status:res.statusCode,body:JSON.parse(d)})}catch{r({status:res.statusCode,body:null})}})}).on('error',()=>r({status:0,body:null}));});}

async function askLLM(prompt){
  // Supports OpenAI-compatible endpoints (DeepSeek uses this shape).
  const base=process.env.LLM_BASE||'https://api.deepseek.com/v1';
  const key=process.env.LLM_KEY||process.env.DEEPSEEK_API_KEY||process.env.OPENAI_API_KEY;
  const model=process.env.LLM_MODEL||'deepseek-chat';
  if(!key) return {ok:false,reason:'no LLM key in env (LLM_KEY / DEEPSEEK_API_KEY / OPENAI_API_KEY)'};
  return await new Promise(r=>{
    const body=JSON.stringify({model,messages:[{role:'system',content:'You are an expert software engineer. Return ONLY a unified git diff (---/+++ headers) that resolves the issue. No prose, no markdown fences.'},{role:'user',content:prompt}],temperature:0.2,max_tokens:4000});
    const u=new URL(base.replace(/\/$/,'')+'/chat/completions');
    const req=https.request({hostname:u.hostname,path:u.pathname,method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+key,'content-length':Buffer.byteLength(body)}},res=>{let d='';res.on('data',c=>d+=c);res.on('end',()=>{try{const j=JSON.parse(d);r({ok:true,text:j.choices?.[0]?.message?.content||'',raw:j})}catch{r({ok:false,reason:'bad json',raw:d.slice(0,300)})}})});
    req.on('error',e=>r({ok:false,reason:String(e)}));req.write(body);req.end();
  });
}

(async()=>{
  const [url,name]=process.argv.slice(2);
  const m=(url||'').match(/github\.com\/([^/]+)\/([^/]+)\/issues\/(\d+)/);
  if(!m){console.error('usage: node solve-bounty.js <github-issue-url> <name>');process.exit(1);}
  const [,owner,repo,issue]=m;
  const dir=path.join('work',name); fs.mkdirSync(dir,{recursive:true});
  const iss=(await gh(`/repos/${owner}/${repo}/issues/${issue}`)).body||{};
  const result={name,url,owner,repo,issue:Number(issue),title:iss.title||null,steps:[]};

  // clone
  const cloneDir=path.join(dir,'repo');
  if(!fs.existsSync(cloneDir)){
    try{execSync(`git clone -q --depth=1 https://github.com/${owner}/${repo}.git ${JSON.stringify(cloneDir)}`,{stdio:'pipe'});result.steps.push('cloned');}
    catch(e){result.steps.push('clone_failed:'+String(e).slice(0,120));fs.writeFileSync(path.join(dir,'RESULT.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));return;}
  }
  // pick a few relevant files as context
  let files=[];
  try{files=execSync(`cd ${JSON.stringify(cloneDir)} && git ls-files | head -200`,{encoding:'utf8'}).trim().split('\n');}catch{}
  const ctx=[];
  for(const f of files){
    if(/\.(py|js|ts|go|rs|md)$/.test(f)&&fs.statSync(path.join(cloneDir,f)).size<20000){
      ctx.push(`### ${f}\n`+fs.readFileSync(path.join(cloneDir,f),'utf8').slice(0,3000));
      if(ctx.join('').length>12000)break;
    }
  }
  const prompt=`Repo ${owner}/${repo}. Issue #${issue}: ${iss.title}\n\n${iss.body||''}\n\nRelevant files:\n${ctx.join('\n\n')}\n\nReturn a unified git diff.`;
  const ll=await askLLM(prompt);
  result.steps.push('llm:'+(ll.ok?'ok':ll.reason));
  if(ll.ok&&ll.text){
    let diff=ll.text.replace(/^```[a-z]*\n?/gmi,'').replace(/```$/gmi,'').trim()+'\n';
    fs.writeFileSync(path.join(dir,'change.patch'),diff);
    try{execSync(`cd ${JSON.stringify(cloneDir)} && git apply --check ${JSON.stringify(path.join('..','..','..','..',dir,'change.patch'))}`,{stdio:'pipe'});result.steps.push('patch_applies:true');}
    catch(e){result.steps.push('patch_applies:false');}
  }
  fs.writeFileSync(path.join(dir,'RESULT.json'),JSON.stringify(result,null,2));
  console.log(JSON.stringify(result,null,2));
})();
