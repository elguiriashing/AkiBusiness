
## 2026-10-26 | Direct workspace icon navigation

Owner-requested sign-in refinement: the five icon cards are the navigation
links themselves. Remove the visible previous/next controls, caption/count and
separate Open/current-workspace row from every public login chooser. Swiping
and Arrow/Home/End browse the carousel without navigation or draft changes;
an explicit tap/click or Enter on an icon follows its canonical localized link.
Suppress the compatibility click after a horizontal swipe so it cannot open an
app accidentally. Current app identity uses aria-current; browsing is distinct
from authorization and never submits the sign-in form. The private lab keeps
its original radio-selection controls by default through an opt-in link mode.

Dependencies: identical React engine/adapter/CSS copies in Pasa, Duermo, Coches
and HQ; equivalent static Business adapter at both guest sign-in entries.
Business selector assets advance to v2 and production offline cache to 155,
with release assertions retained. Existing bounded referral-only href helper,
EN/ES, product icons/palettes, reduced motion, roving focus, 44px active targets
and phone placement after the form remain. No session, permission, identity,
price, tenant, API/provider, database, analytics or customer-data changes.

Validation: destination/keyboard/private-lab regressions plus responsive browser
checks for first-click icon navigation, swipe click suppression, retained draft,
no footer/actions, localized/referral-safe URLs and zero scene scroll. Complete
hosted source/browser/Cloudflare checks and exact live-source verification are
required before release; installed native/device acceptance remains separate.
Rollback is a source revert and renewed Business asset/cache versions.

## 2026-10-26 | Shared business marketing header

Public landing header adopts the same frame and byte-identical stylesheet as
AkiHQ SuiteMarketingHeader: brand, Tools, Pricing, sibling app, language,
appearance, Aki Apps, sign-in. Shared fixed slots and scrollbar gutter align
buttons exactly; brand artwork is 40px and actions are 44px. Responsive two-row
phone controls retain Tools/Pricing, and the Apps menu retains the sibling link
when its direct tablet/phone shortcut is hidden. Original purple branding stays.

The public page now exposes the existing akipasa.theme preference and real light
surface styling, plus a five-app localized menu with outside/Escape dismissal.
Login remains local /login?locale=..., operating plan actions remain /account,
legacy OAuth/hash recovery remains intact, and Apps use fixed canonical origins.
No identity, session, paid access, tenant, RLS, database, payment, analytics,
provider configuration or Android package is changed. Only this public marketing
header uses the new CSS; operations/account chrome is unchanged.

Landing CSS/JS versions advance to v2/v4. The existing legacy source cache146 is
retained; the actual paid-product transform advances cache155 to156 and all
review/deploy workflow cache assertions follow it. New header CSS is precached.
Source revert plus a fresh cache revision is rollback. main and the existing
akibusiness-selfowned-staging target retain production authority; no deployment
is implied by this candidate.

Validation: real Chromium compared HQ/Business header coordinates and dimensions
across 40 surfaces (EN/ES, both themes, 360/600/900/1280/1536px), all within 1px.
Menus, Escape, localized actions, 40px logo, 44px sign-in and overflow passed;
desktop/mobile screenshots inspected. Full static gateway check, transformed
release packaging, hosted CI and exact-source live readback are tracked separately.

Verification update: the complete gateway/static `npm run check` passed712 tests,
with the existing one skipped case. After adding public-header interaction
coverage, all12 focused landing/release/cache tests passed. They execute the
actual landing script in JSDOM and verify EN/ES, local login, theme persistence,
canonical app links, outside/Escape dismissal and focus return. The earlier
cache-workflow assertion failure was corrected by advancing all five existing
review/deployment assertions to the effective paid cache156. No gate was removed.
