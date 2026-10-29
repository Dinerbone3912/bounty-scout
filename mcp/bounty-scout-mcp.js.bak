#!/usr/bin/env node
'use strict';
/**
 * Bounty Scout MCP server (stdio). Exposes the feed as MCP tools so any
 * MCP-capable agent can query bounties and get skill-matched results.
 *
 * Free tools:  search_bounties, match_shortlist (top 3), latest_bounties
 * Paid tool:   match_full   (calls x402 /match?full=1; returns upgrade info if unpaid)
 *
 * No SDK dependency: speaks newline-delimited JSON-RPC 2.0 over stdio.
 */
const http = require('http');
const https = require('https');

const BASE = process.env.SCOUT_BASE || 'http://localhost:8787';
const FALLBACKS = (process.env.SCOUT_FALLBACK || '').split(',').map(x=>x.trim()).filter(Boolean);
const BASES = [BASE, ...FALLBACKS];

function req(method, path, body){
  return new Promise((resolve)=>{
    (async()=>{
      let last={status:0,body:{error:'no bases'}};
      for(const base of BASES){
        const r=await reqBase(method,base,path,body);
        if(r.status) return resolve(r);
        last=r;
      }
      resolve(last);
    })();
  });
}
function reqBase(method, BASE, path, body){
  return new Promise((resolve)=>{
    const u = new URL(BASE+path);
    const lib = u.protocol==='https:'?https:http;
    const payload = body?JSON.stringify(body):null;
    const r = lib.request({hostname:u.hostname,port:u.port,path:u.pathname+u.search,method,
      headers: payload?{'content-type':'application/json','content-length':Buffer.byteLength(payload)}:{} },res=>{
      let d='';res.on('data',c=>d+=c);res.on('end',()=>{ let j; try{j=JSON.parse(d)}catch{j={raw:d}}; resolve({status:res.statusCode,body:j}); });
    });
    r.on('error',e=>resolve({status:0,body:{error:String(e)}}));
    r.setTimeout(15000,()=>{r.destroy();resolve({status:0,body:{error:'timeout'}})});
    if(payload) r.write(payload); r.end();
  });
}

const TOOLS = [
  { name:'search_bounties', description:'Free. Search the Bounty Scout live feed of blockchain/software bounties. Returns scam-filtered results.',
    inputSchema:{type:'object',properties:{
      q:{type:'string',description:'keyword'},tag:{type:'string'},source:{type:'string',enum:['github','algora','community']},
      min_reward:{type:'number'},payable:{type:'boolean'},limit:{type:'number',default:15}}}},
  { name:'match_shortlist', description:'Free. Top 3 bounties ranked by fit to your capabilities.',
    inputSchema:{type:'object',properties:{capabilities:{type:'array',items:{type:'string'},description:'skills e.g. ["solidity","rust"]'}},required:['capabilities']}},
  { name:'match_full', description:'PAID (x402 0.05 USDC on Base). Full ranked list of bounties matched to your capabilities. Without payment returns an upgrade block with payment requirements.',
    inputSchema:{type:'object',properties:{capabilities:{type:'array',items:{type:'string'}},min_reward:{type:'number'}},required:['capabilities']}},
  { name:'latest_bounties', description:'Free. The most recent bounties across all sources.',
    inputSchema:{type:'object',properties:{limit:{type:'number',default:10}}}},
  { name:'submit_bounty', description:'Free. List your own bounty in the feed (trust-screened). Tags/reward help matching.',
    inputSchema:{type:'object',properties:{title:{type:'string'},url:{type:'string'},reward_amount:{type:'number'},tags:{type:'array',items:{type:'string'}},description:{type:'string'}},required:['title','url']}},
];

async function callTool(name,args){
  args=args||{};
  switch(name){
    case 'search_bounties':{
      const p=new URLSearchParams();
      if(args.q)p.set('q',args.q); if(args.tag)p.set('tag',args.tag); if(args.source)p.set('source',args.source);
      if(args.min_reward!=null)p.set('min_reward',args.min_reward); if(args.payable)p.set('payable','1');
      p.set('limit',String(args.limit||15));
      const r=await req('GET','/bounties?'+p); return {status:r.status,data:r.body};
    }
    case 'latest_bounties':{
      const r=await req('GET','/bounties?limit='+(args.limit||10)); return {status:r.status,data:r.body};
    }
    case 'match_shortlist':{
      const r=await req('GET','/match?capabilities='+encodeURIComponent((args.capabilities||[]).join(',')));
      return {status:r.status,data:r.body};
    }
    case 'match_full':{
      const p=new URLSearchParams({full:'1',capabilities:(args.capabilities||[]).join(',')});
      if(args.min_reward!=null)p.set('min_reward',args.min_reward);
      const r=await req('GET','/match?'+p);
      if(r.status===402) return {status:402,payment_required:true,upgrade:r.body};
      return {status:r.status,data:r.body};
    }
    case 'submit_bounty':{
      const r=await req('POST','/submit',args); return {status:r.status,data:r.body};
    }
    default: return {error:'unknown tool: '+name};
  }
}

function send(id,result,error){
  const msg = error ? {jsonrpc:'2.0',id,error} : {jsonrpc:'2.0',id,result};
  process.stdout.write(JSON.stringify(msg)+'\n');
}

let buf='';
process.stdin.setEncoding('utf8');
process.stdin.on('data',async chunk=>{
  buf+=chunk; let i;
  while((i=buf.indexOf('\n'))>=0){
    const line=buf.slice(0,i).trim(); buf=buf.slice(i+1);
    if(!line) continue;
    let m; try{m=JSON.parse(line)}catch(e){ continue; }
    try{
      if(m.method==='initialize'){
        send(m.id,{protocolVersion:'2024-11-05',capabilities:{tools:{}},serverInfo:{name:'bounty-scout',version:'1.0.0'}});
      } else if(m.method==='tools/list'){ send(m.id,{tools:TOOLS}); }
      else if(m.method==='tools/call'){
        const out=await callTool(m.params&&m.params.name,m.params&&m.params.arguments);
        send(m.id,{content:[{type:'text',text:JSON.stringify(out,null,2)}]});
      } else if(m.id!=null){ send(m.id,null,{code:-32601,message:'method not found: '+m.method}); }
    }catch(e){ if(m.id!=null) send(m.id,null,{code:-32603,message:String(e)}); }
  }
});
process.stdin.on('end',()=>process.exit(0));
