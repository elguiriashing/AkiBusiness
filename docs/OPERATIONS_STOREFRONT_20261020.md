# Approved operating toolbox storefront

Status: implemented and locally tested; merge and production acceptance remain release gates.

The AkiBusiness membership page now describes the approved operating-location packages:

| Package | Monthly EUR | Active tools | Replacements per monthly rotation |
| --- | ---: | ---: | --- |
| Básico | 24.99 | 4 of 12 | 1 |
| Standard | 44.99 | 8 of 12 | 2 |
| Pro | 64.99 | All 12 | Unrestricted; no selection needed |

The annual comparison retains the existing storefront's 20% comparison policy: monthly price × 12 × 0.8, rounded once to EUR cents. Displayed annual totals are EUR 239.90, 431.90 and 623.90. This comparison does not create annual Stripe prices or promise annual checkout availability. Approved monthly prices do not imply an approved tax treatment.

The canonical parent catalogue is `crm`, `inbox`, `tasks`, `calendar`, `inventory`, `pos`, `sales`, `marketing`, `automation`, `collaboration`, `employees`, `knowledge`. Support, sites and social CRM remain subtools rather than additional selectable tools.

The page explains active versus saved next toolboxes, replacement differences measured against active tools, monthly rotation for annual subscriptions, confirmed upgrades, effective-date downgrades, retained data and immediately adjustable staff delegation within licensed location scope. These descriptions do not substitute for backend entitlement enforcement.

There is one neutral account-management handoff to `https://akipasa.com/{locale}/account/subscription/operations`. It carries only a single syntactically valid optional `workspace` and a valid public referral code through the shared navigation contract. Arbitrary redirects, tokens, tier and interval parameters are not forwarded. The destination must authenticate locally, validate ownership and enforce its own billing, merchant and tax readiness gates. This static page has no checkout form, payment API call or purchase button. AkiHQ remains free and listing/personal Premium remains separate.

## Validation

- `node --test tests/membership-toolbox.test.mjs tests/membership-navigation.test.mjs tests/product-release.test.mjs`: 16 passed.
- `BROWSER_PATH=/tmp/akisuite-chromium node tests/membership-browser.cjs`: 16 real Chromium cases; EN/ES, light/dark, 360×800, 768×1024, 1024×768 and 1440×900. Checked exact prices, annual totals, tool counts, keyboard controls, bounded navigation, no horizontal overflow, no page errors and no external requests. Screenshots are generated locally under ignored `test-results/membership-toolbox`.
- Run `npm run check` in `cloudflare` as the full gateway release gate.

Source service-worker cache 130 and paid-role cache 131 invalidate the changed membership assets. Both isolated release modes are covered by the existing product-release tests. No production settings, subscriptions, Stripe objects, database records or live payments are changed by this patch.

## Rollback

Revert this commit and rebuild the appropriate isolated role release using the normal deployment pipeline. Advance the service-worker cache if deploying a rollback after clients have installed cache 131. This is a presentation-only change; no financial or database rollback is needed. Production billing activation and live customer journey acceptance remain separate gates owned by the billing release.
