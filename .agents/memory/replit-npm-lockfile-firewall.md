---
name: Replit npm lockfile firewall URLs
description: npm installs in this workspace can write package-firewall.replit.local URLs into package-lock.json, breaking external CI builds
---
Running `npm install <pkg>` inside this Replit workspace can record resolved URLs like `http://package-firewall.replit.local/npm/...` in `package-lock.json`. External CI (Cloudflare Pages, Render) cannot reach that host, so builds fail.

**Why:** Happened with dompurify in Admin.Web — Cloudflare Pages build broke until the lockfile was rewritten to `https://registry.npmjs.org` (sed replace).

**How to apply:** After any npm install, grep every touched `package-lock.json` for `package-firewall.replit.local` and rewrite to `https://registry.npmjs.org` before committing/pushing.
