# AkiBusiness · Independent operations suite

Canonical website: **https://akibusiness.com** · Source owner: **elguiriashing/AkiBusiness**.

This repository contains the standalone AkiBusiness operations application, including its static app, PoS, kitchen/bar queues, printers, inventory, CRM, staff and multi-tenant workflows. The original operational system was transferred from the historical `akihq` source branch and lives in this isolated migration branch pending acceptance.

## Running and testing

Serve this directory as static assets (for example `python3 -m http.server 8080`). The application uses `index.html` with `assets/`, `config.js`, `manifest.webmanifest` and `sw.js`. Use `config.example.js` for local public Supabase client configuration. Do not commit production secrets. The Cloudflare integration gateway lives in `cloudflare/` and uses its own tests.

The original repository is retained in Git history; no runtime GitHub checkout or frontend proxy to AkiHQ is required. AkiHQ's free management hub is a separate product in `elguiriashing/akihq`. Both may use the existing Supabase backend and authorized cross-product navigation.

The recovered PoS stack and its immutable upstream heads are recorded in
[`docs/POS-RECOVERY-20261019.md`](docs/POS-RECOVERY-20261019.md). Its local plan
catalogue is informational and deliberately has no checkout or payment capture;
prices and activation remain staged pending an approved commercial release.

## Deployment separation

Target: existing Cloudflare Pages project **akibusiness-operations-preview**, whose custom domain currently serves **akibusiness.com**. Its current GitHub source is the historical `akihq` repository; reconnect to `elguiriashing/AkiBusiness` `main` only after verified CI/preview acceptance. Cloudflare Pages build command should remain empty and output directory the repository root.

Release gates: static asset/deep-link checks; sign-in, Google OAuth and redirects; PoS checkout, table transfer, printer handling, offline/retry, tenant isolation, inventory and staff permissions, EN/ES, mobile/tablet layout, and rollback. Spanish invoicing/tax features are **not** represented as certified until independent compliance approval. Preserve all existing production data and settings.

## Staging (19 October 2026)

Cloudflare Pages staging project `akibusiness-selfowned-staging` reads **this repository** directly from `migration/standalone-akibusiness-operations-20261019`; it does not serve any production hostname. Preview at `https://akibusiness-selfowned-staging.pages.dev` after the first successful Cloudflare build. Keep the old production project and custom domain unchanged until independent acceptance and rollback readiness.
