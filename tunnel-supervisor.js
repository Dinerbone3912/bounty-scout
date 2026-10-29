#!/usr/bin/env node
'use strict';
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const DIR = __dirname;
const URL_FILE = path.join(DIR, 'PUBLIC_URL.txt');
const LOG = path.join(DIR, 'tunnel.log');
const LOCAL_PORT = process.env.SCOUT_PORT || '8787';
let child = null, backoff = 2000; const MAX_BACKOFF = 60000;
function log(l){ try{ fs.appendFileSync(LOG, `[${new Date().toISOString()}] ${l}\n`);}catch(_){} }
function writeUrl(u){ try{ const p=fs.existsSync(URL_FILE)?fs.readFileSync(URL_FILE,'utf8').trim():''; if(p!==u){fs.writeFileSync(URL_FILE,u); log(`PUBLIC_URL -> ${u}`);} }catch(e){log(`writeUrl fail: ${e.message}`);} }
function start(){
  log('dialing tunnel...');
  child = spawn('ssh',['-o','StrictHostKeyChecking=no','-o','ServerAliveInterval=20','-o','ServerAliveCountMax=3','-o','ExitOnForwardFailure=yes','-R',`80:localhost:${LOCAL_PORT}`,'nokey@localhost.run'],{stdio:['ignore','pipe','pipe']});
  let sawUrl=false;
  const scan=(d)=>{const t=d.toString();const m=t.match(/https:\/\/[a-z0-9]+\.lhr\.life/);if(m){sawUrl=true;backoff=2000;writeUrl(m[0]);}else if(/error|fail|denied/i.test(t))log(`ssh: ${t.trim().slice(0,200)}`);};
  child.stdout.on('data',scan); child.stderr.on('data',scan);
  child.on('exit',(code)=>{log(`tunnel exited code=${code} sawUrl=${sawUrl}`);child=null;const wait=sawUrl?2000:backoff;if(!sawUrl)backoff=Math.min(backoff*2,MAX_BACKOFF);log(`redial in ${wait}ms`);setTimeout(start,wait);});
  child.on('error',(e)=>{log(`spawn error: ${e.message}`);backoff=Math.min(backoff*2,MAX_BACKOFF);setTimeout(start,backoff);});
}
function shutdown(s){log(`shutting down (${s})`);if(child)try{child.kill('SIGTERM');}catch(_){}process.exit(0);}
process.on('SIGINT',()=>shutdown('SIGINT')); process.on('SIGTERM',()=>shutdown('SIGTERM'));
if(require.main===module)start();
module.exports={start};
