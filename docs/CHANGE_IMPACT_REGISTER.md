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


## 2026-10-25 | Login stylesheet cache continuity

Live release verification found returning browsers could reuse the previous
version of the brand stylesheet under its unchanged asset URL. Advance the
login stylesheet revision to v2 so the existing home/language/theme controls
receive their 44px target and surface styling. Applies to EN/ES guest login,
light/dark, desktop/mobile. No auth, billing, tenant or data changes. Rollback
is a source revert; exact-source production visual verification follows CI.


## 2026-10-25 | AkiSelector workspace login integration

Alex explicitly selected the existing private lab's AkiSelector for the public
login workspace chooser. All five apps appear: Pasa orange, Duermo teal,
Coches red/burgundy, HQ yellow/space grey and Business purple. Reuse the
engine's card scene, swipe, keyboard navigation and reduced-motion behavior
in a compact sign-in adapter. Previewing an app never submits, navigates or
replaces a login form; opening another app is an explicit localized action
with only the bounded referral code passed across origins. Current product
is selected initially. Mobile keeps the chooser after the sign-in fields.
The static operating app uses a DOM adapter and the same scene styles, with
no framework runtime or third-party dependency added. The private lab keeps
its administrator-only route. No pricing, session, tenant, permissions or
provider setting changes. Source revert is rollback. Source, responsive
browser, exact live source and physical device acceptance remain distinct.
