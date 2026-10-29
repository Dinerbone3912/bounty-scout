'use strict';
/**
 * stage-deliverable.js — turn a bounty into a submission packet.
 *   node stage-deliverable.js <bounty-url> <name>
 * Creates work/<name>/ with SUBMISSION.md (filled from the live issue, if
 * reachable), a README of acceptance criteria, and a place for the patch.
 * No GitHub credentials needed to stage — submitting is a separate step.
 */
const fs=require('fs'),path=require('path'),https=require('https');
function ghApi(p){return new Promise(r=>{https.get({host:'api.github.com',path:p,headers:{'user-agent':'bounty-scout','accept':'application/vnd.github+json'}},
  res=>{let d='';res.on('data',c=>d+=c);res.on('end',()=>{try{r({status:res.statusCode,body:JSON.parse(d)})}catch{r({status:res.statusCode,body:null})}})}).on('error',()=>r({status:0,body:null}));});}
(async()=>{
  const [url,name]=process.argv.slice(2);
  if(!url||!name){console.error('usage: node stage-deliverable.js <github-issue-url> <name>');process.exit(1);}
  const m=url.match(/github\.com\/([^/]+)\/([^/]+)\/issues\/(\d+)/);
  if(!m){console.error('not a github issue url');process.exit(1);}
  const [,owner,repo,issue]=m;
  const dir=path.join('work',name); fs.mkdirSync(dir,{recursive:true});
  const r=await ghApi(`/repos/${owner}/${repo}/issues/${issue}`);
  const issue_=r.body||{};
  const md=[];
  md.push(`# Bounty submission: ${name}`);
  md.push(`\n- Source: ${url}`);
  md.push(`- Repo: ${owner}/${repo}  Issue: #${issue}`);
  if(issue_.title) md.push(`- Title: ${issue_.title}`);
  if(issue_.state) md.push(`- State: ${issue_.state}`);
  md.push(`\n## Task (verbatim)\n\n${issue_.body||'_(could not fetch issue body; paste manually)_'}`);
  md.push(`\n## Acceptance criteria\n\n- [ ] Reproduces the stated problem\n- [ ] Patch implements the requested behavior\n- [ ] Tests added/updated and passing locally\n- [ ] No unrelated changes`);
  md.push(`\n## Deliverable\n\nPatch file: \`./change.patch\`  (git diff of the fix)\n`);
  md.push(`## Submit\n\nOnce a GitHub credential is available:\n\`\`\`\ngh pr create --repo ${owner}/${repo} --title "fix #${issue}: ${name}" --body-file SUBMISSION.md\n\`\`\`\n(Also comment \`/claim\` on the bounty listing first to lock it, if the platform requires it.)`);
  fs.writeFileSync(path.join(dir,'SUBMISSION.md'),md.join('\n'));
  fs.writeFileSync(path.join(dir,'acceptance.txt'),(issue_.body||'').slice(0,2000));
  console.log(`staged work/${name}/ (issue fetch status ${r.status})`);
  console.log('-> write your patch to work/'+name+'/change.patch, then submit when creds exist');
})();
