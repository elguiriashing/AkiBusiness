# AkiHQ / AkiBusiness brand-and-host swap (no database migration)

Scope: AkiBusiness management code becomes free AkiHQ at https://akihq.app; legacy AkiHQ operations code becomes AkiBusiness at https://akibusiness.com. Maintain existing shared Supabase project, user IDs, workspace IDs, entitlement and Stripe IDs. Do not enable new paid catalogue, organisation/location onboarding, independent accommodations or rental backend features as part of this release. Those remain separate behind readiness flags.

Release source must be extracted from the reviewed role-swap implementation, without merging the dependent migration PRs wholesale. Keep historical identifiers inside authorization and billing unchanged. The two original serving deployments and distinct domain mappings remain rollback targets.

Gates before moving domains: (1) inspect both role-swapped build artifacts, (2) record verified Supabase callback allowlist and same-origin login/recovery on the two final domains, (3) verify anonymous, owner and other-tenant permissions, (4) confirm production Stripe subscriptions are untouched, (5) document exact Cloudflare Worker/Pages bindings and routes, (6) move management to akihq.app and operations to akibusiness.com as coordinated switch, (7) verify both origins on desktop/mobile with source stamps, (8) preserve previous deployments for restoration.

Caution: akihq.app is presently connected as a Cloudflare Pages custom domain on the existing operations project, while akibusiness.com is presently connected to a Worker serving the management code. Never perform a blind hostname swap with a single DNS change. Domain moves must be coordinated with the distinct Pages/Worker deployment types. No paid Supabase project or new DB DDL is required for this scope.

## Pre-cutover observed infrastructure (2026-10-17)

Verified through connected Cloudflare account API and Cloudflare Browser Rendering:
- Present `akihq.app`: custom domain on **Pages project `akihq`**, canonical production deployment `52a4d216-4610-499d-99d0-c312e8929ac5`, apex CNAME `akihq.pages.dev` (DNS ID `b08480a915d9fc6adb69a404a8917d09`), zone `fc17e8a781d7837c53aed4039fa3b7dd`. Keep `crm.akipasa.com` on the old Pages project as compatibility fallback.
- Present `akibusiness.com`: custom Worker domain on **`akibusiness-preview`**, Worker domain ID `0f46fb4a57ede7209a2a6a23565228185541cfee`, current Worker deployment `0372ad5d-1f59-45a9-a120-eee633f745f3` using version `b10756d9-b505-4e30-b8bf-51c3e5e6cfcc`; proxied apex AAAA `100::` (DNS ID `d6a8252743ba66fe133b1bbe20b31969`), zone `2c5349c106ec722dd13ff6d2f06c4e62`.
- Ready **management** role: Worker `akihq-management-preview`, deployment `0d87b3c1-5474-4a51-bd77-e5a66ba7975f` (version `66edd765-6e3e-41ba-8dd6-af017e1af1de`), health returns `role:management`, `publicProduct:AkiHQ`, `roleSwapEnabled:true`, source `d470fa19830283cedadc00e453d5cd6dde12f49f`.
- Ready **operations** role: Pages project `akibusiness-operations-preview`, successful production-type manual deployment `ef2ceac6-274f-4250-b7a2-ede189230de6`; release source `29dd9a4cffed7137473761808c51b7c24621ae14`, `sourceTreeDirty:false`, `roleSwap:true`, `product:AkiBusiness`, `canonicalOrigin:https://akibusiness.com`.

Both new homepage previews returned HTTP 200. These checks do **not** establish a successful authenticated owner/tenant journey or OAuth callback allowlist. Supabase project and Stripe live subscriptions must stay unchanged.

Coordinated route migration:
1. Remove `akihq.app` from Pages project `akihq`, remove only the old apex CNAME if it remains, attach `akihq.app` Worker custom domain to `akihq-management-preview`.
2. Remove `akibusiness.com` from Worker `akibusiness-preview`, remove only the former apex AAAA if it remains, add `akibusiness.com` as custom domain to Pages project `akibusiness-operations-preview`.
3. Verify both public products, exact source stamps, TLS, login, permission denials and fallback origins. Do not create catch-all cross-domain redirects or alter the legacy `crm.akipasa.com` fallback.
4. Rollback both together if any protected route or identity flow fails: restore `akihq.app` as custom domain on Pages `akihq` and `akibusiness.com` as Worker custom domain on `akibusiness-preview`, with the original DNS record types and verified original deployments. Confirm their source roles after restoration.

Do not merge unrelated accommodation/organisation migration PRs for this route swap; migration and new checkout/readiness switches remain separately gated.

## Live Cloudflare routing verification (2026-10-17)

Both domains have been switched via the Cloudflare API while retaining the existing Supabase database and Stripe billing:
- **akihq.app** is now a Worker custom domain on `akihq-management-preview` (domain ID `646caf95c8be19998a392aea0991f3bd71a68a96`). Public `/api/health` returns `status:ok, role:management, publicProduct:AkiHQ, roleSwapEnabled:true` and `/release-source.json` reports `d470fa19830283cedadc00e453d5cd6dde12f49f`. EN/ES public home pages returned AkiHQ branding.
- **akibusiness.com** is now a Pages custom domain on `akibusiness-operations-preview`, serving the manual release `ef2ceac6-274f-4250-b7a2-ede189230de6`. Zone apex CNAME ID `43488136733c2b3606d69f30ca33dbfe` points to `akibusiness-operations-preview.pages.dev`. Cloudflare Pages validation became **active**; public `/release-source.json` reports source `29dd9a4cffed7137473761808c51b7c24621ae14`, `roleSwap:true`, `product:AkiBusiness`, `sourceTreeDirty:false`. Public homepage has title `AkiBusiness`.
- The old Pages project `akihq` still serves the operations fallback at `crm.akipasa.com`. Original canonical Pages deployment `52a4d216-4610-499d-99d0-c312e8929ac5` and original Worker `akibusiness-preview` deployment `0372ad5d-1f59-45a9-a120-eee633f745f3` were not deleted.
- An initial Cloudflare Pages validation and 522 during activation resolved; subsequent Pages validation showed `active` and public exact-source Browser Rendering requests returned valid documents.

Release state: **domain role cutover deployed and anonymously smoke-tested**. The authenticated Google login, owner/staff/other-tenant/RLS journeys, printer and protected PoS actions still need real-user acceptance; do not claim them verified. The consumer AkiDuermo and AkiCoches old management links must be updated in separate safe releases; AkiCoches targeted PR #9 exists.

Do not change Stripe customer pricing, independent property migrations, old gateway mappings or legacy entitlement keys to 'complete' the brand swap. Keep the previous domain/Worker/Pages bindings above available for coordinated rollback if a critical authenticated journey fails.
