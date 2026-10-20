# Paid operational analytics — 20 October 2026 candidate

Status: implemented and locally tested; not merged, migrated or production verified.
AkiHQ remains the free management/discovery overview. AkiBusiness owns these paid
operating reports. Analytics is a shell, not a thirteenth selectable toolbox tool.

## Sources and permission contract

`public.crm_operational_analytics(workspace, days, through, export)` is a
security-invoker wrapper around the guarded private
`akihq_security.operational_analytics` implementation. It requires a current
identity, accessible active/trial location and the existing authoritative
`akihq_security.can_tool` intersection for each source:

| Section               | Required source tool                              | Actual records                                                                    |
| --------------------- | ------------------------------------------------- | --------------------------------------------------------------------------------- |
| Recorded sales        | `pos`                                             | `crm_pos_sales`, completed/voided/refunded states                                 |
| Historical stock/cost | `inventory`                                       | Existing `crm_inventory_valuation` RPC and immutable `crm_inventory_value_events` |
| Team actions          | `employees` **and** each contributing source tool | Immutable hospitality events and inventory operations                             |

The existing `can_export` helper is checked separately on every export request.
An Employees grant alone cannot expose PoS or stock activity. A PoS-only user
cannot retrieve inventory cost or staff identity through a direct RPC. Removed
members, disabled source tools and changed role delegation are rechecked for each
request. These checks inherit the monthly active-toolbox engine once that
migration is accepted; there is no independent `analytics` entitlement or price.

The migration adds two query indexes and two explicitly granted RPCs. It creates
no tables and changes no source-table RLS or grants. No new raw access to the
private hospitality schema is granted. SQL uses a fixed empty search path.

## Meaning of the numbers

Sales use one `crm_pos_sales` record per completed sale and its recorded
`total_cents`, grouped by stored currency. They never join payment splits or item
lines into duplicated revenue. Voided/refunded records are counted separately.
No net-of-tax revenue, settlement proof, tips, margin, profit, MRR, ROI or sitewide
Google impressions are invented. In particular the actual sales schema has no
separate tips field; an older fixture's invented field is not used.

Period comparisons use equal counts of location-local calendar days. End dates
are inclusive to the user and converted into half-open timestamp windows on the
server. The default ends yesterday, avoiding partial/current-day comparison.
A requested current day is explicitly marked partial. Spring/autumn DST, leap
day and month-end boundaries are tested. UTC is used for stored instants.

Stock opening, previous opening and closing values reuse the existing historical
valuation, subtracting one PostgreSQL microsecond at exclusive boundaries.
Unknown legacy costs and pretracking quantities remain unknown. The UI shows the
known subtotal and missing-evidence counts; a complete stock total remains null
when any row is unknown. Recorded consumption and waste cost are separate source
facts, not a profitability calculation or reconstructed general ledger.

Staff reports count recorded actions, not hours or productivity. Each contributing
source requires its own access. Names are drawn from profiles associated with the
same workspace; no Auth emails or unrelated-customer information is read. The
first 50 actors are displayed with an explicit truncation indicator; totals retain
all actors in the authorized range. If no source is permitted, action figures are
withheld in the UI rather than presenting an apparent measured zero.

## Bounds and UI

Each report spans 1–366 days plus one equal comparison period, with an explicit
historical date bound. Currency groups are capped; excessive fanout fails
explicitly. Timestamp indexes support the workspace/time filters. Daily records
are bounded to the period/currency shape; the UI progressively shows the latest
30 rows. No nationwide or organisation-wide scan is performed from a location
report. The selected existing workspace is the location filter.

EN/ES tabs provide sales, stock/cost and team detail, date/period controls, loading,
permission and unavailable states, keyboard controls and responsive light/dark
presentation. Amount rendering uses BigInt and preserves currency precision;
unknown amounts never become zero. JSON export calls the server again with export
mode, retains fractional-cent source strings, and cannot fall back to displayed
or localStorage data. The stable SQL aggregate is one statement-level snapshot.

Request versions and user/workspace/period keys discard delayed responses and
hide old figures immediately after scope changes. Failed export authorization
invalidates displayed cached access. No report data is persisted to localStorage.
Platform administrator recommendation/advertising analytics remain separate and
unchanged. Existing operational overview behaviour is preserved while rollout is
disabled.

## Rollout and evidence

- Gate: `AKIHQ_CONFIG.OPERATIONAL_ANALYTICS_ENABLED`, defaults `false` in actual
  and example configuration. This is presentation rollout only; the backend still
  authorizes every source independently.
- Migration: `20261020173202_operational_analytics.sql`, generated with Supabase
  CLI; requires the existing security, inventory valuation and hospitality schema.
- Before activation, accept the root subscription toolbox migration so source
  tools intersect the canonical active 4/8/12 catalogue, and verify live helper
  definitions against the confirmed shared project.
- Locally passed: 14 PGlite SQL/role/permission/date/source tests; 13 module,
  rendered EN/ES, request-race, precision, export and app-loader tests; existing
  nine tenant-boundary tests and three product-release tests. Syntax checks pass.
- Existing tenant source assertions were retained unchanged. The new operational
  branch is nested inside the existing non-platform branch; platform requests
  remain administrator-only.
- A dedicated exact-head CI workflow runs those focused checks and a 16-case real
  Chromium component matrix: EN/ES × light/dark × mobile/tablet portrait/tablet
  landscape/desktop. The browser fixture is explicitly synthetic and blocks all
  production/provider actions. Locally passed all 16 Chromium combinations using Playwright and Chromium 143;
  screenshots and evidence are recorded under `artifacts/operational-analytics/`.
  These are real-component synthetic tests, not authenticated production acceptance.

Remaining gates: hosted migration/advisors and query-plan evidence with realistic
large tenants; exact-head hosted CI/browser artifacts; authenticated owner/staff/denied
preview acceptance, tool rotation/revocation and location switching; correct
production release ownership and exact-source smoke. PGlite is not proof of live
RLS or billing configuration. No migration, subscription, financial transaction,
email, deployment or feature activation was performed.

No employee payroll or general-ledger expense data is present, so profitability
remains unavailable. Organisation-wide aggregation belongs to an explicitly
scoped future endpoint; the free AkiHQ overview must not mislabel these location
records as organisation totals.

Rollback: disable the presentation gate and revert source. Keep the compatible
read-only RPC/index migration unless a reviewed forward migration removes its
execute grants. Never delete or alter sales, cost evidence or staff events.
