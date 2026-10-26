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
