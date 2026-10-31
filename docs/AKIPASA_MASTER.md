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

## 2026-10-26 | Cinematic AkiSelector energy and transitions

The login selector now uses five distinct vector-mask materials: Pasa flame
tongues/cinders, Duermo tidal ribbons, Coches diagonal velocity trails, HQ
precision orbital tracks and Business spectral curtains. The existing generic
effect IDs remain compatible with the private lab. Every activation has a
brief lens flare, dissipating wave and glass reflection. Outgoing artwork stays
mounted for a 650ms opacity decay; incoming energy ramps over 280ms while card
travel eases over 680ms. Interrupted changes converge via CSS transitions,
without JavaScript animation frames or timeouts. Inactive material loops pause.

Mouse hover previews only energy and retains selection, roving focus, current
app and href geometry; pointer exit restores selected energy. Touch/pen retain
swipe browsing and direct icon navigation with the compatibility-click guard.
Keyboard input clears hover preview. EN/ES, referral-only links, preserved
login drafts, mobile placement and administrator-only lab boundaries remain.
Both explicit motion-off and OS reduced motion remove loops/transitions/flare.

Dependencies: shared React engine/CSS in Pasa, Duermo, Coches and HQ; equivalent
DOM adapter and identical CSS in Business. Business engine CSS, adapter CSS and JS URLs advance to
v2/v3/v3 and its effective paid release cache to v156, including release assertions.
No authentication exchange, session, API, tenant/role, database, storage,
analytics, payment, provider configuration or Android binary change. This is
web-delivered presentation. Rollback restores source and advances static asset
versions/cache again. Source and real-browser evidence is recorded in the PR;
full CI, production deployment and physical-device acceptance are separate gates.

## 2026-10-26 | Product-specific AkiSelector opening stories

The five login choices opt into an optional product arrival independently from
the reusable ember/breeze/bloom/solar/aurora idle effect. Pasa drops a discovery
pin and sparks; Duermo rolls and softly lands a suitcase; Coches sends a red
coupe with spinning wheels and a light wake across the foreground; free AkiHQ
gathers locations into a management hub; operations AkiBusiness wakes a till
and prints a receipt. Each decorative vector story plays once over 1.25–1.7s,
then disappears as its material rises into the sustained hovering/orbit phase.
The Coches idle is slower and includes a red orbital arc. Returning to an app
restarts its story; uninterrupted idle does not replay it. Generic lab effects
remain compatible without product stories unless the caller opts in.

Dependencies: AkiSelector option arrival, WorkspaceSelector adapter, shared CSS
and the equivalent static Business DOM adapter. All artwork is inline SVG masks
and CSS; no image/provider calls, animation timers or new packages. Decorative
actors ignore pointer events and are hidden from assistive technology. Direct
links are immediate, with no animation wait; browsing, safe referral/locale
URLs, drafts, keyboard focus, swipe suppression and auth/session/permissions
remain intact. Reduced motion and motion-off hide opening stories and keep
static idle artwork. Business engine CSS v3 / adapter CSS v3 / JS v4 and the
effective release cache v157 advance together with release assertions.

Validation includes all five actual actor animations becoming visible, finishing
once and handing off to full idle opacity, plus source/component/browser parity.
The current report records completed checks and separate broader map acceptance.
No production data, SQL, storage, billing, analytics, provider configuration or
Android binary changes. Source revert plus fresh static versions is rollback.
GitHub publication is still awaiting the explicit authorization requested earlier;
no push, PR, merge or deployment is implied by this design refinement.

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


## 2026-10-26 | Mouse dragging, corner arrows and branded login names

The public login AkiSelector supports primary-button mouse dragging alongside
touch/pen swipes. Cards follow a bounded horizontal pointer offset; capture
starts only after 10px of horizontal intent, leaving ordinary clicks and
vertical touch scrolling intact. Release outside the scene is supported. A
45px horizontal release browses one enabled option, with wraparound; shorter
drags snap back and suppress their compatibility click. Pointer cancellation
and capture loss clear temporary offsets. Modified/right/middle clicks retain
ordinary link behavior, and starting a later pointer/keyboard action clears the
click guard. Native HTML link/image dragging is prevented within the scene.

Two localized, keyboard-accessible 44px circular arrows sit in the lower scene
corners. They browse in place without submitting, navigating or replacing the
login form; the separate footer/caption stays hidden. Generic lab callers opt
in via showBrowseArrows. Names use the individual product accent and self-hosted
Poppins Semibold 600, with a dark label backing for legibility over effects.
The Latin WOFF2 is vendored from @fontsource/poppins 5.3.0 with its SIL OFL;
requests stay on the app's own origin. Existing startup/idle artwork, motion-off,
reduced motion, EN/ES/referral-safe hrefs, current-product semantics, drafts and
auth/session/role behavior remain. No API, database, billing, analytics, provider
or native Android binary change.

Shared React engine, adapter, CSS and font assets are copied across four Next
apps; Business has an equivalent DOM adapter and matching assets. Business
engine/adapter CSS v4, JS v5 and paid release cache v158 include the font and
retain production assertions. Acceptance covers real mouse capture/release
outside the scene, follow-pointer geometry, short-drag suppression, immediate
subsequent clicks, arrows/wraparound/keyboard, touch and cancelled gestures,
loaded font/brand colours and responsive label bounds. Regression evidence is
recorded in the PR; exact-head CI and production verification gate release.
Rollback restores source with fresh static cache/asset versions; no data rollback.

Capture-transfer follow-up: descendant lostpointercapture events are ignored;
only loss on the scene cancels its gesture. Mouse movement with no primary
button held clears a pending gesture after an uncaptured outside release.
Acceptance now uses real Chromium touch input originating on a card descendant,
and covers outside vertical release followed by ordinary mouse hover.

## 2026-10-31 | Complete public privacy and shared deletion access

Integrate PR56 with current main after printer recovery PR66, preserving newer
workspace/account behavior. Add the bilingual anonymous /privacy notice,
shared account export/request links and no-login instructions at AkiPasa's
public account-deletion alias. Human verified-request handling is distinct
from completed deletion. Retention schedules and the unverified backup target
do not certify provider cleanup. Central AkiPasa PR342 repairs the previously
missing alias and must be live before this release. No deletion/customer data,
email, billing, provider, SQL or permission mutation. Printer agent installation
and physical acceptance remain separately recorded in PR66/issue24.

Account asset advances to v5, paid cache160; retain current source cache147,
all existing release transforms and exact cache assertions including production
deployment. Existing EN/ES account tests check fixed shared links and absence
of deletion calls; packaging must include the public notice. Full fresh CI
gates merge and exact live-source verification gates rollout. Source revert
and a new cache/asset version provide rollback; no data rollback.
