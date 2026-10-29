// Bounty Scout client demo — fetch config then call the API
(async () => {
  try {
    const cfg = await (await fetch('api.json')).json();
    const el = document.querySelector('.api');
    if (el && cfg.api_base) {
      el.insertAdjacentHTML('beforeend',
        '<p><b>API base:</b> <code>' + cfg.api_base + '</code></p>' +
        '<button onclick="(async()=>{const r=await fetch(\'' + cfg.api_base + '/match?capabilities=solidity\');const j=await r.json();alert(JSON.stringify(j.teaser||j,null,2));})()">Try /match (top 3 solidity bounties)</button>');
    }
  } catch(e) { console.warn('api.json not found', e); }
})();
