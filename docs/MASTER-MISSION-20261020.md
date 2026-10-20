# AkiSuite mission checkpoint — 20 October 2026

## Authorisation and commercial contract

Alex explicitly authorised implementation, tested merges, safe production deployment and existing-customer migration. Follow-up confirmed the new monthly operating-location prices: Básico €24.99 (4/12 tools, one monthly replacement); Standard €44.99 (8/12, two); Pro €64.99 (12/12). No immediate charges, payouts, physical orders or destructive migrations are authorised. Existing media and operating data must survive entitlement removal. Customer billing changes require validated scope and acceptance, not permanent grandfathering by default. Alex subsequently chose ALL three legacy business/business_pro customers to move to Básico operations (€24.99 per location) at renewal, with free listings; personal Premium is not an operations customer.

## Verified starting state

- AkiBusiness main `6c95f206d748f5682b15c6b0d82a909afd5f1eab`, own Pages project `akibusiness-selfowned-staging`, production deployment `38532b4f-ad34-4a3a-8ffa-eb3b7f7b71a1`, production branch main, canonical akibusiness.com. Historical role reversal must not return.
- AkiHQ domain routes to `akihq-management-preview`, latest Worker deployment `d85179f7-4942-482f-9d9a-8d294838c896` / version `0036d383-35b0-4d0f-9f4a-80ce53f66a1e`.
- AkiPasa latest Worker deployment `01516376-bb75-4f2a-a2bb-5e566d292edb`; AkiDuermo `1a2257c6-72b5-4896-a18c-bc5b83d27bb9`; AkiCoches `6c171812-13a0-42c5-955a-649f75e7b802`. These are baseline observations, not new-feature production verification.
- Shared Supabase `vhpbvcfkcteswlsdjrfl`: existing crm_tool_catalog, role templates, workspace entitlements and organisation/location relations. Legacy billing ledger has four active subscriptions (2 business, 1 premium, 1 business_pro). New AkiSuite billing ledger absent.
- Live Stripe account AkiPasa Marketing S.L. has the historical offers and lacks new operations prices at mission start.
- No operating workspace is owned by any of the four subscription profiles. One legacy business subscription profile has one owner venue; two business subscription profiles have no owner venue. Do not infer an operating location or fabricate a venue just to reprice these contracts.
- Existing open PR search: legal review AkiPasa #8; none returned for the four sibling applications. Exact PR and branch refresh required again before merging.

## Canonical toolbox contract

Twelve operating tools reuse existing keys: crm, inbox, tasks, calendar, inventory, pos, sales, marketing, automation, collaboration, employees, knowledge. Existing dependent keys map to a parent only for licensing: crm-social → crm; support → inbox; sites → marketing. Role grants still use their existing identifiers. Dashboard/integrations/analytics/admin shell are not selectable tools. Platform-only AI/Telegram are not granted by a paid toolbox.

The toolbox adds an authoritative licence intersection to existing role/membership/RLS checks. Each row is scoped to an existing crm_workspace. There is no automatic enrolment or live access revocation in the migration. Subscription binding is explicit and service-only. Individual restrictions narrow the role's permissions and never override it; role editing remains immediate through existing team administration.

UTC anniversaries are computed from the original Stripe anchor, clamping to month-end and restoring the original day in later months. Annual subscriptions rotate monthly. Row locks and unique history constraints prevent duplicate rotations. Missed months recover once without accruing extra swaps. Draft saves compare against active selection, use optimistic revision checks and cannot race an already-due rotation.

Paid-through time is explicit: active/trialing/past_due require a still-valid paid/trial/grant expiry. Unpaid, paused, incomplete and canceled deny access. Trials/admin/promotional/grandfathered grants require explicit service evidence and expiry. No implicit payment grace is invented. Effective upgrades/downgrades are service-side operations after billing confirmation; selection remains sized to the effective tier. No data is deleted. Rebinding an anchor/subscription needs a reviewed migration.

## Status matrix

| Deliverable | Status | Evidence / next gate |
|---|---|---|
| Architecture/billing baseline | Tested read-only | Cloudflare, Stripe, Supabase observations above |
| Canonical toolbox storage and RPCs | Implemented | additive migration 20261020170509; no live application |
| Rotation and entitlement intersection | Tested locally | eight disposable PostgreSQL integration scenarios pass; hosted concurrency/RLS pending |
| Staff individual restrictions | Tested locally | immediate revoke/grant, role intersection, removed-member and location isolation tests |
| Owner toolbox/delegation UI | Implemented | fullscreen bilingual standalone page; browser acceptance pending |
| Cron reconciliation | Implemented | flag off, verified scope and paid invoice period required; lifecycle adapter tests pending |
| New operating monthly Stripe prices | Implemented, inactive | IDs below; no subscriptions modified |
| Existing-customer migration | In progress | requires explicit per-customer operating/listing scope and deployment acceptance |
| Listing limits | In progress | isolated listing-entitlement branch; 8/250 and retained Madrid monthly quota ledger tested |
| Cross-product language | In progress | isolated branches, navigation tests passing |
| Referrals | In progress | isolated branch, payments/payouts disabled |
| Onboarding/age | In progress | isolated branch, cohort flag off |
| AkiPulse/conversion | In progress | isolated branch; real bounded data, no synthetic metrics |
| Passport prestige | In progress | isolated branch; eligibility capacity analysis shows launch prerequisites missing |
| Merge and production activation | Not started | exact-commit CI, migration prerequisite validation, browser flows and rollback required |

## New Stripe records

Prices are inactive and tax behaviour is unspecified pending merchant treatment verification; no tax assumption is made. Stripe's create wrapper returned an archive error after creating each inactive object; subsequent direct list reads confirmed all three exist. Never retry creation blindly.

| Tier | Monthly amount | Stripe price |
|---|---:|---|
| Básico | €24.99 | price_1USgZRGfzDhsgsQZaZYnAjZC |
| Standard | €44.99 | price_1USgZhGfzDhsgsQZBLuFFQ3c |
| Pro | €64.99 | price_1USgZiGfzDhsgsQZYEgPv3HL |

Annual-price objects have not been created. Confirm exact cents and preserve existing paid-through periods before migration schedules. Root-domain shared identity is not evidence of shared browser cookies.

## Release / rollback

Run integration-gateway npm run check, standalone SQL tests, bilingual mobile/tablet browser acceptance, clean product release generation and hosted exact-commit CI. Apply only additive migrations after validating live prerequisites. Keep toolbox enrollment and cron flags disabled until a specific scope and tested price mapping is ready. Restore previous Pages/Worker deployment IDs on application regression. Do not delete new history, retained data, existing memberships or entitlement rows as rollback.

Customer move must have a dry-run manifest, one reviewed target scope for each subscription, effective renewal time, no duplicate subscription, no immediate invoice/proration and tested webhook reconciliation. Ambiguous scope is a concrete migration blocker, not permission to choose a random first venue.

## Verified delivery checkpoint — 17:38 UTC

- AkiCoches navigation PR #28 merged `e13ee3a35b0d68620a9c35e5497562baf6b8e7c9`; exact head and merged-head CI passed. Cloudflare build `15a92535-3d4a-4aa1-83a7-d310833596ae` built that commit successfully, deployment `326583b1-2dc3-46c5-9278-cb6e15329db5` / version `ac061c31-60dc-4f5e-b423-e36127d7002e`. Fresh HTTP EN and ES page bodies contain the correct HQ and operations locale URLs. Local real selector browser acceptance passed sixteen combinations. Live browser navigation from this environment failed with ERR_EMPTY_RESPONSE despite successful curl, so full interactive live acceptance is not claimed. Reactive same-layout referral-code follow-up is Coches #30.
- AkiDuermo navigation #24 merged `40d8924f46039a9649c913eb158aa2e0a8462c5a`; merged-head app CI passed. First Cloudflare build failed because EXPECTED_SOURCE_SHA was still pinned to the previous main commit. Updated only that non-secret expected SHA after validation and retriggered exact commit: build `c43a9a45-3dc5-428e-828b-5fe83ff1831c`; production verification pending. Reactive referral follow-up #26.
- AkiHQ navigation #51 merged `685151309b5cdde9fc5d20615b28c360bfc2eb15`; exact-head CI and sixteen local browser combinations passed; production Worker build reported success. Merged-head verification and HTTP smoke pending. Reactive referral follow-up #55.
- AkiBusiness toolbox #29 head `928d0cfc675624e568bf0210c2fc611e3df547ad`, tree `519d51feb3d4c48061bcb04a29aabda149badc78`: nine SQL + ten billing adapter scenarios pass, sixteen real browser combinations pass. New hosted toolbox browser job, real PostgreSQL concurrent rotations/saves and full gateway verify passed. Remaining pre-existing POS workflow matrix jobs queued. No merge/schema application/enrollment yet.
- Independent toolbox review found starvation after one hundred permanently failing due rows; fixed with bounded retry backoff and a 101-workspace regression. Pending cancellation/refund/upgrade lifecycle handler remains mandatory before activation.
- Confirmed customer decision: ALL three old business/business_pro subscriptions become monthly Básico operations at their paid-through renewal, free listings. Personal Premium untouched. Migration provisioning/checkout/lifecycle implementation is in the billing workstream; no subscription has changed.
- Other review branches: AkiPasa conversion #211, onboarding #212, referrals #213, language #214, listing limits #215; AkiHQ Pulse #50, listing compatibility #52, onboarding #53, analytics grants #54; AkiDuermo CTA #23/onboarding #25; AkiCoches CTA #27/onboarding #29; Business navigation #30/onboarding #31. Refresh exact heads, several are still changing.
- Narrow analytics privilege repair identified actual default TRUNCATE privilege on analytics_events for anon/authenticated; forward repair and actual-role regression tests prepared in HQ #54, not applied. RLS is enabled with member/admin SELECT policy. Service ingestion remains authorised through its existing functions.
- Enforced high-resolution upload path is being completed rather than activating browser-only processing. Existing media read/delete/data must remain intact.
