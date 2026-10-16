# AkiHQ / AkiBusiness brand-and-host swap (no database migration)

Scope: AkiBusiness management code becomes free AkiHQ at https://akihq.app; legacy AkiHQ operations code becomes AkiBusiness at https://akibusiness.com. Maintain existing shared Supabase project, user IDs, workspace IDs, entitlement and Stripe IDs. Do not enable new paid catalogue, organisation/location onboarding, independent accommodations or rental backend features as part of this release. Those remain separate behind readiness flags.

Release source must be extracted from the reviewed role-swap implementation, without merging the dependent migration PRs wholesale. Keep historical identifiers inside authorization and billing unchanged. The two original serving deployments and distinct domain mappings remain rollback targets.

Gates before moving domains: (1) inspect both role-swapped build artifacts, (2) record verified Supabase callback allowlist and same-origin login/recovery on the two final domains, (3) verify anonymous, owner and other-tenant permissions, (4) confirm production Stripe subscriptions are untouched, (5) document exact Cloudflare Worker/Pages bindings and routes, (6) move management to akihq.app and operations to akibusiness.com as coordinated switch, (7) verify both origins on desktop/mobile with source stamps, (8) preserve previous deployments for restoration.

Caution: akihq.app is presently connected as a Cloudflare Pages custom domain on the existing operations project, while akibusiness.com is presently connected to a Worker serving the management code. Never perform a blind hostname swap with a single DNS change. Domain moves must be coordinated with the distinct Pages/Worker deployment types. No paid Supabase project or new DB DDL is required for this scope.
