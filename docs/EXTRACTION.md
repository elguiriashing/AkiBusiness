# AkiBusiness extraction acceptance

Source: `080ea0ffb2dd6612436acd04c25b4daf8ff71129` from AkiPasa master.
`EXTRACTION_SOURCE_GRAPH.json` records static source imports; this is dependency
evidence, not proof of production runtime acceptance. All selected paths were
copied from Git-tracked blobs; no `.env.local`, credentials, build output or Git
history was imported. Native source migrations are immutable reference history.

Management graph: business home -> memberships/tenant guards -> venue workspace
-> profile/media/catalogue/event/booking/team server actions -> Supabase RPC/RLS
and storage; mobility -> company/fleet/availability/rate/request actions -> shared
rental tables/RLS. Claim picker uses claim-search, claim-map and map-tile; media
uses same-origin multipart venue-media. Shared support uses the tenant-scoped
AkiHQ gateway. Auth callback exchange, password/recovery and Terms run locally.
Consumer account/subscription pages remain central at AkiPasa.

Static extraction removes unrelated route pages and unused shared modules. Shared
server modules required by support retain their authorization and provider-boundary
checks. This deployment owns no scheduler, Stripe webhook or schema rollout.
UI links use canonical suite domains; database IDs remain unchanged.

Required hosted acceptance remains pending: Supabase configuration/redirect allowlist,
authenticated EN/ES roles and mutations, business/HQ service permission boundaries,
media uploads, room-night/fleet concurrent booking behavior, sandbox subscription
access, mobile/desktop screenshots, actual preview and canonical TLS, canonical
redirects, exact deployed commit and monitoring. Local tests cannot stand in for
these gates. No production routing change is safe until they pass.

Local verification: `npm ci` passed with checksum/TLS protections; MapLibre patch
verified. Formatting, ESLint and TypeScript passed. 99 scoped tests passed across
14 files, including real business home/team permissions, 33 venue workspace cases,
booking manager, accommodation management, structured claims, auth recovery,
origin rejection and product boundaries. Production Next build passed. Chromium
local smoke passed 8 combinations (EN/ES, 390/1440 px, light/dark), checking anonymous
business-to-auth, brand/language/no overflow, recovery task retention, manifest,
health and rejected webhook mutation. Screenshots remain ignored test artifacts.
These cases use build-only public placeholders and perform no live customer writes.
Initial OpenNext skip-build attempt failed because ordinary Next build omitted
standalone output; full supported OpenNext build is required and tracked separately.

The full supported OpenNext Cloudflare build subsequently passed for implementation
commit `5686c900d1a7b939ce6435e2c7fe47bfb95ad9db`, with verified standalone output.
Remote main's concurrent groundwork/auth allowlist document is retained through a
merge, without replacing its history. Final follow-up changes only contributor,
environment documentation, browser harness and independent CI; runtime sources
remain identical to that compiled implementation. Final adapter repackaging uses
that valid standalone build and stamps the final source commit.

The final candidate permits HTTPS media/connect and WSS only for the two exact
known Supabase hosts (`akipasa.supabase.co` and the retained project reference).
Their provider alias equivalence remains a live verification gate. Next config
changed for this boundary, so the earlier standalone artifact is invalidated and
a full clean-commit OpenNext rebuild is required before final packaging.

## Preview release workflow (2026-10-15)

`preview-release.yml` is manually dispatched, build-only by default. It requires
successful product CI for an exact source SHA, validates the confirmed public
Supabase key/project, builds the actual app and retains compiled artifacts plus
checksums. Optional deployment requires the preview environment's scoped
Cloudflare token. It targets only `akibusiness-preview` in the confirmed account,
rejects custom domains and cron bindings, and verifies the deployed source over
HTTPS. Closed billing flags remain enforced. This workflow does not constitute
authenticated or production acceptance; deployment secrets are still unavailable
in the terminal.
