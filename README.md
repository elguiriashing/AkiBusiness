# AkiBusiness · Independent operations suite

## 22 October 2026 · Membership scope

The AkiBusiness membership screen lists only Basic, Standard and Pro
operating software (per operating location). Its EN/ES introductory copy
distinguishes this paid software from free AkiHQ listing management and
the separate AkiPasa, AkiDuermo and AkiCoches Premium listing upgrades.
A dedicated AkiHQ membership link now sends users to those listing
choices. No billing logic, prices, entitlements or checkout are changed.
The page and service-worker asset version are updated together. Live
release still requires full checks, host verification and source-SHA proof.


Canonical website: **https://akibusiness.com** · Source owner: **elguiriashing/AkiBusiness**.

This repository contains the standalone AkiBusiness operations application, including its static app, PoS, kitchen/bar queues, printers, inventory, CRM, staff and multi-tenant workflows. The original operational system was transferred from the historical `akihq` source branch; production now reads this repository's `main` branch.

## Running and testing

Serve this directory as static assets (for example `python3 -m http.server 8080`). The application uses `index.html` with `assets/`, `config.js`, `manifest.webmanifest` and `sw.js`. Use `config.example.js` for local public Supabase client configuration. Do not commit production secrets. The Cloudflare integration gateway lives in `cloudflare/` and uses its own tests.

The original repository is retained in Git history; no runtime GitHub checkout or frontend proxy to AkiHQ is required. AkiHQ's free management hub is a separate product in `elguiriashing/akihq`. Both may use the existing Supabase backend and authorized cross-product navigation.

The recovered PoS stack and its immutable upstream heads are recorded in
[`docs/POS-RECOVERY-20261019.md`](docs/POS-RECOVERY-20261019.md). Its local plan
catalogue is informational and deliberately has no checkout or payment capture;
prices and activation remain staged pending an approved commercial release.

## Deployment separation

Verified on 24 October 2026: Cloudflare Pages project **akibusiness-selfowned-staging** serves **akibusiness.com** and **operations.akipasa.com** from **elguiriashing/AkiBusiness `main`**. Despite the historical project name, this is the canonical production target. The old **akibusiness-operations-preview** project is retained as historical infrastructure and is not the deployment target.

The connected build runs `NEXT_PUBLIC_AKISUITE_ROLE_SWAP=true node tools/build-product-release.mjs dist-product`, verifies the clean source stamp against `CF_PAGES_COMMIT_SHA`, and publishes `dist-product`. The manual verified production workflow uses the same existing project and refuses mismatched domain, owner, repository, branch, product or source metadata. Verify `/release-source.json` after every release.

Normal releases use the connected Cloudflare Git deployment. The optional GitHub
fallback runs only through `workflow_dispatch` on `main` and requires an existing
scoped `CLOUDFLARE_API_TOKEN` GitHub Actions secret. The 24 October fallback attempt
stopped before publishing because that optional secret was absent; the connected
production release succeeded independently. Do not trigger a duplicate publisher
on workflow-file pushes or weaken its target/token preflight to conceal missing
configuration. Configure the fallback credential separately only when needed.

Release gates: static asset/deep-link checks; sign-in, Google OAuth and redirects; PoS checkout, table transfer, printer handling, offline/retry, tenant isolation, inventory and staff permissions, EN/ES, mobile/tablet layout, and rollback. Spanish invoicing/tax features are **not** represented as certified until independent compliance approval. Preserve all existing production data and settings.

## Historical staging (19 October 2026)

The project `akibusiness-selfowned-staging` originally read `migration/standalone-akibusiness-operations-20261019` without a production hostname. That staging-only arrangement was superseded by the production mapping recorded above. Do not use the old migration branch or retired project for new production releases.

## 2026-10-24 | Native accounts and shared billing bridge

Routine account/settings/membership screens now belong to each product while
reading and modifying the same authenticated profiles row. AkiBusiness selects
its package and creates a private location locally, without a public-venue claim
or the Pasa→HQ chain. Coches/Duermo free management links target their actual HQ
branch/property tools. The central bearer-only `/api/account/portal` verifies
Supabase identity, eligibility and terms, reads only caller billing, preserves
existing management-only portal configuration and returns Stripe to the fixed
originating product. Customer/profile/return URL inputs are not accepted. No
service key, cross-domain cookie, checkout activation or paid entitlement change.
Bilingual new tests cover native profile forms, role/ID stripping, billing identity
isolation, fixed destinations, partial failures, location idempotency and local
logout. See `CUSTOMER_JOURNEYS_20261024.md` for all eight journeys, dependency/release
order and explicit remaining shared safety/onboarding and provider acceptance.
