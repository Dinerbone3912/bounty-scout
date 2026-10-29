'use strict';
/**
 * verify-income.js — checks the real on-chain USDC balance of the payout wallet
 * on Base and appends a dated ledger entry. The ONLY source of truth for income.
 * Never claim revenue from a 402 or a listing — only from an observed balance delta.
 *
 * Usage:  node verify-income.js
 * Env:    PAY_TO (defaults to Glider wallet), BASE_RPC (defaults to public Base RPC)
 */
const https = require('https');
const fs = require('fs');
const path = require('path');

const WALLET = process.env.PAY_TO || '0x944664B9d45fEf8C9BDBb084Ce59E6f6eE724861';
const RPC = process.env.BASE_RPC || 'https://mainnet.base.org';
const USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const LEDGER = path.join(__dirname, 'income-ledger.jsonl');

function rpc(method, params){
  return new Promise((resolve,reject)=>{
    const body = JSON.stringify({jsonrpc:'2.0',id:1,method,params});
    const req = https.request(RPC,{method:'POST',headers:{'content-type':'application/json','content-length':Buffer.byteLength(body)}},res=>{
      let d='';res.on('data',c=>d+=c);res.on('end',()=>{try{resolve(JSON.parse(d))}catch(e){reject(e)}});
    });
    req.on('error',reject); req.setTimeout(10000,()=>{req.destroy();reject(new Error('rpc timeout'))});
    req.end(body);
  });
}

async function usdcBalance(){
  // balanceOf(address) selector = 0x70a08231
  const data = '0x70a08231' + WALLET.toLowerCase().replace(/^0x/,'').padStart(64,'0');
  const r = await rpc('eth_call',[{to:USDC,data},'latest']);
  if(!r.result) throw new Error('bad rpc response: '+JSON.stringify(r));
  const raw = BigInt(r.result);
  // USDC has 6 decimals
  return Number(raw)/1e6;
}

async function main(){
  let bal=null, err=null;
  try { bal = await usdcBalance(); } catch(e){ err = e.message; }
  const prev = fs.existsSync(LEDGER)
    ? fs.readFileSync(LEDGER,'utf8').trim().split('\n').filter(Boolean).map(l=>{try{return JSON.parse(l)}catch{return null}}).filter(Boolean)
    : [];
  const last = prev.filter(e=>e.balance_usdc!=null).pop();
  const delta = (bal!=null && last) ? +(bal - last.balance_usdc).toFixed(6) : null;
  const entry = {
    ts: new Date().toISOString(),
    wallet: WALLET,
    network: 'base',
    asset: 'USDC',
    balance_usdc: bal,
    delta_usdc: delta,
    error: err
  };
  fs.appendFileSync(LEDGER, JSON.stringify(entry)+'\n');
  console.log(JSON.stringify(entry,null,2));
  if (err) { console.error('WARNING: could not read on-chain balance — do NOT claim income.'); process.exitCode=2; }
  else if (delta!=null && delta>0) console.log(`CONFIRMED INCOME: +${delta} USDC since last check.`);
  else console.log('No new income observed. Balance alone is NOT revenue (may be pre-existing).');
}
main().catch(e=>{console.error(e);process.exit(1)});
