'use strict';
/**
 * Real x402 payer: signs an EIP-3009 TransferWithAuthorization for USDC on Base.
 * Produces the X-PAYMENT header the server's /feed endpoint accepts.
 *
 * Usage:
 *   const { makePayer } = require('./payer');
 *   const pay = makePayer(process.env.PRIVATE_KEY);         // wallet with USDC on Base
 *   const feed = await getFeed({min_reward:100}, {paymentProvider: pay});
 */
const { Wallet, Contract, parseUnits } = require('ethers');

const USDC_BASE = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const CHAIN_ID = 8453; // Base mainnet
const DOMAIN_NAME = 'USD Coin';
const DOMAIN_VERSION = '2';

// EIP-712 domain for FiatTokenV2 (USDC) TransferWithAuthorization
function transferAuthDomain() {
  return { name: DOMAIN_NAME, version: DOMAIN_VERSION, chainId: CHAIN_ID, verifyingContract: USDC_BASE };
}

function transferAuthTypes() {
  return {
    TransferWithAuthorization: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'validAfter', type: 'uint256' },
      { name: 'validBefore', type: 'uint256' },
      { name: 'nonce', type: 'bytes32' },
    ],
  };
}

/**
 * Build a payment provider bound to a private key.
 * paymentProvider(requirements) -> base64(JSON) X-PAYMENT header.
 */
function makePayer(privateKey) {
  const wallet = new Wallet(privateKey);
  return async function pay(accepts) {
    const value = parseUnits(String(accepts.maxAmountRequired || '0.05'), '0'); // USDC is 6dp but x402 uses decimal string
    const usdc = new Contract(USDC_BASE, ['function balanceOf(address) view returns (uint256)'], wallet.provider || undefined);

    const now = Math.floor(Date.now() / 1000);
    const auth = {
      from: wallet.address,
      to: accepts.payTo,
      value: value.toString(),
      validAfter: now - 60,
      validBefore: now + (accepts.maxTimeoutSeconds || 3600),
      nonce: require('crypto').randomBytes(32).toString('hex').replace(/^/, '0x'),
    };

    const signature = await wallet.signTypedData(transferAuthDomain(), transferAuthTypes(), auth);
    const payload = {
      x402Version: 1,
      scheme: 'exact',
      network: 'base',
      payload: {
        signature,
        authorization: auth,
        // mirror fields the server checks
        amount: accepts.maxAmountRequired,
        to: accepts.payTo,
        payTo: accepts.payTo,
        nonce: auth.nonce,
        from: wallet.address,
      },
    };
    return Buffer.from(JSON.stringify(payload)).toString('base64');
  };
}

module.exports = { makePayer, transferAuthDomain, transferAuthTypes, USDC_BASE, CHAIN_ID };
