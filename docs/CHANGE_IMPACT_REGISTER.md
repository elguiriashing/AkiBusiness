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

### 2026-10-24 — Native journey acceptance follow-up

Workspace picker now rechecks crm_workspace_access and opens the native dashboard directly for authorized operating locations. Unentitled locations remain on native setup; access lookup failures do not navigate. Three focused positive/denial/error cases pass.


### 2026-10-24 — Preserve concurrent staff rotas release

Merged reviewed main 8fa3e279, retaining staff rotas, tool guides and existing operation gates. Resolved version-only overlaps by keeping source cache 144 and advancing paid cache to 146 and paid app asset to 49, beyond the separately released cache 145. Native account/pricing flows and the direct authorized workspace picker remain intact. Full combined operation/release and hosted journey checks are required.


## 2026-10-25 | Shared icon family v3

Owner-requested burgundy Coches (#3B101B) and space-grey HQ (#252830) tiles
are synchronized across all five product selectors, favicons, Apple/PWA and
mobile icon sources. Coches uses the current car-free mark; black artwork has
a fine brand-colour edge for legibility. Pasa, Duermo and the purple AB geometry
are preserved. Default dark canvases match the tiles; light and selected owner
themes remain available. Versioned URLs and the static operating suite cache
refresh remove stale selector artwork. Stable PWA IDs and app identifiers remain.
No roles, links, data, billing, analytics, storage or provider configuration change.
See AKISUITE_ICON_FAMILY.md for dependencies, checks, native rebuild limitations
and source-only rollback. Local visual/asset validation and required CI are
separate from exact-source production and signed native-device acceptance.

## 2026-10-25 | AkiSuite navigation and surface continuity

Owner-authorized tightening preserves identity, tenant permissions, booking and
billing authority. Discovery membership audience now survives explicit Business
handoffs, reload and browser history without enabling checkout. Duermo/Coches
share one desktop rail/mobile dock component where available; Coches membership
retains its product header. Pasa's auth selector uses all five canonical brands
and origins. Duermo auth stays teal; HQ marketing and login use one request
language, keep readable dark-surface text, and expose header controls. Business
login gains local home/language/appearance controls retaining input only in memory.
Each repository carries only its affected subset. No schema, feature activation,
provider setting, customer record or native signing change. Source revert is the
rollback. Full source, browser/CI and exact production checks remain required;
device/authenticated acceptance must not be inferred from fixtures.
