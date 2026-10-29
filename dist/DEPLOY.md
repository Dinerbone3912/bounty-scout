# Deploy Bounty Scout (static) in 30 seconds

No account needed for some hosts.

## Netlify Drop (no account)
1. Open https://app.netlify.com/drop
2. Drag the `dist/` folder onto the page.
3. Done — you get a public URL instantly.

## GitHub Pages (no extra signup)
```bash
git subtree push --prefix dist origin gh-pages
```

## Cloudflare Pages / Vercel
Drag `dist/` or connect the repo and set the output directory to `dist`.

**IMPORTANT:** after you have the API hosted somewhere, edit `dist/api.json`
(or set `SCOUT_BASE` and re-run `node build-dist.js`) so the buttons point at the
real API. The static page alone is a discovery surface; the paid endpoints live on
the API host.
