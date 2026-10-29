#!/usr/bin/env node
/**
 * buyer.mjs — minimal, dependency-light x402 buyer for Bounty Scout.
 * Usage: node sdk/buyer.mjs <base-url> <path>
 * Prints the 402 challenge; if a private key is present (BUYER_PK) it will
 * attempt EIP-3009 TransferWithAuthorization signing and retry.
 *
 * Flow documented inline so any agent can reimplement it:
 *   1. GET path -> 402 + body.accepts = [{scheme,network,asset,maxAmountRequired,payTo,...}]
 *   2. Sign USDC.transferWithAuthorization(from,to,value,validAfter,validBefore,nonce)
 *   3. POST/GET the same path with header  X-PAYMENT: base64(json{auth...})
 */
const [,, baseUrl, pathName="/feed"] = process.argv;
if(!baseUrl){console.error("usage: node sdk/buyer.mjs <base-url> <path>");process.exit(1);}
const url = baseUrl.replace(/\/$/,"")+pathName;
const r = await fetch(url);
console.log("status:", r.status);
if(r.status===402){
  const j = await r.json();
  const a = j.accepts?.[0];
  console.log("x402 challenge:");
  console.log(JSON.stringify({network:a?.network, asset:a?.asset, amount:a?.maxAmountRequired, payTo:a?.payTo, scheme:a?.scheme}, null, 2));
  console.log("\nTo pay: sign an EIP-3009 TransferWithAuthorization for", a?.maxAmountRequired, "USDC to", a?.payTo,
    "\nand retry with header X-PAYMENT: <base64 json>.");
}else{
  console.log(JSON.stringify(await r.json()).slice(0,600));
}
