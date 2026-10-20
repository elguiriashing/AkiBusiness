# Shared account eligibility candidate

AkiPasa PR #212 owns the authoritative private cohort and completion functions.
This product adds no age ledger, identity store, legal version or shared migration.

`AKISUITE_ONBOARDING_SCHEMA_READY=true` enables per-request gateway checks using
the caller's own Bearer token and public key. The helper calls
`account_features_allowed()`; it never accepts a submitted profile ID or uses a
service-role key for eligibility. Restricted accounts receive 403; provider or
malformed state fails closed. Health, privacy/support, signed provider intake and
anonymous signed-media paths retain their existing endpoint authorization.
Missing identity still reaches the existing authentication rejection, never an
implicit account grant. Mail and scheduled billing jobs remain unaffected.

The optional browser `ONBOARDING_SCHEMA_READY: true` setting only adds the matching
UX check before workspace/profile queries. It is not a security control. The
account screen provides same-language canonical completion/privacy links and
local sign-out. Password recovery still runs before workspace boot. Cross-domain
sessions remain host-only; a separate AkiPasa sign-in may be needed. No credential,
PKCE code or arbitrary return destination is handed across origins.

Both flags remain absent/off by default. Existing customers are not backfilled,
classified as adults or indiscriminately locked. The rollout must not activate
until all products accept the shared schema/guards, complete direct Supabase
RPC/read/write coverage, legal/retention/appeal review and authenticated privacy,
export/deletion, Google/email and member/tenant acceptance. Direct browser-to-
Supabase operational endpoints remain a release gate; this gateway alone cannot
claim to protect requests that bypass it. No production configuration changed.

The new static helper is packaged with assets and cached by the service worker.
The role-specific release transformer retains its audited source matches, advances
the operations artifact app/cache versions and never reverses HQ/Business roles.
Rollback before enrolment is source-only; after enrolment retain eligibility-
compatible enforcement and stop new cohorts rather than deleting customer data.

## Local checkpoint

Seven new gateway/browser/actual-bootstrap tests and eight existing suite-controls
checks pass (15 total). Static operational packaging passed with the new helper
included and exact role transformations retained. Worker/app/helper syntax checks
passed. Full gateway CI, production clean-source artifact, direct Supabase
operational coverage and authenticated browser/tenant acceptance remain required.
