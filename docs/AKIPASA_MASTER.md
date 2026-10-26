
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
