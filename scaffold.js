'use strict';
/**
 * scaffold.js — turn a bounty into an actionable work plan.
 * Given a bounty object, emit a structured brief: difficulty estimate, likely
 * repo/language, suggested approach, verification checklist, and a submission
 * checklist. This is the "deep analysis" payload behind the paid /brief tier.
 * No credentials needed — it's pure synthesis from the bounty metadata.
 */
function classify(text) {
  const t = text.toLowerCase();
  const langs = [];
  if (/\bsolidity|smart contract|evm|foundry|hardhat\b/.test(t)) langs.push('solidity');
  if (/\btypescript|ts\b/.test(t)) langs.push('typescript');
  if (/\bjavascript|node|npm\b/.test(t)) langs.push('javascript');
  if (/\bpython|django|flask|starlette|fastapi\b/.test(t)) langs.push('python');
  if (/\brust|cargo\b/.test(t)) langs.push('rust');
  if (/\bgo\b|golang/.test(t)) langs.push('go');
  return langs.length ? langs : ['unknown'];
}

function estimateScope(text) {
  const t = text.toLowerCase();
  let pts = 2;
  if (/refactor|migrate|redesign|architecture/.test(t)) pts += 3;
  if (/test|coverage|fuzz/.test(t)) pts += 1;
  if (/perf|performance|scale|1000|50,?000|optimi/.test(t)) pts += 3;
  if (/security|exploit|vulnerab/.test(t)) pts += 2;
  if (/single file|one line|typo|docs?/.test(t)) pts = 1;
  const level = pts <= 2 ? 'small' : pts <= 4 ? 'medium' : pts <= 6 ? 'large' : 'xl';
  return { points: pts, level };
}

function briefOf(b) {
  const title = b.title || '';
  const tags = (b.tags || []).join(' ');
  const all = title + ' ' + tags;
  const langs = classify(all);
  const scope = estimateScope(all);
  const reward = b.reward_amount || null;
  // rough value density: dollars per effort point
  const density = reward && scope.points ? Math.round((reward / scope.points) * 10) / 10 : null;

  const approach = [];
  if (langs.includes('solidity')) approach.push('Read contract + existing tests; reproduce the vulnerability/gap in a Foundry test first.');
  if (langs.includes('python')) approach.push('Set up venv, install deps, run the failing scenario as a pytest before touching source.');
  if (langs.includes('typescript') || langs.includes('javascript')) approach.push('npm ci, run the test runner; add a failing test that encodes the issue.');
  if (langs.includes('rust')) approach.push('cargo test baseline; write the failing case, then implement.');
  approach.push('Keep the change minimal and scoped to the issue; do not refactor unrelated code.');
  approach.push('Add or update tests that prove the fix and prevent regressions.');

  const verify = [
    'Failing test reproduces the original problem (record it before fixing).',
    'All existing tests still pass (no regressions).',
    'Change reviewed against the issue\'s acceptance criteria line by line.',
    'Commit message references the issue; PR description shows before/after.',
  ];

  const submission = [
    'Fork the repo (or use provided access).',
    'Create a branch named fix/<issue-slug>.',
    'Commit the patch + tests; push.',
    'Open a PR linking the bounty issue; paste test output.',
    'Only count as income once the bounty platform escrow confirms payment.',
  ];

  return {
    id: b.id, source: b.source, title, url: b.url,
    reward: { amount: reward, currency: b.reward_currency || null },
    languages: langs,
    scope, value_density: density,
    approach, verify, submission,
    note: 'Scope and approach are automated estimates — validate before committing time.',
  };
}
module.exports = { briefOf, classify, estimateScope };
