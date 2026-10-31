# AkiBusiness other tools: release review (31 October 2026)

**Candidate status:** PR #68, draft; no production deployment or customer-data changes. This is an engineering review, not a blanket commercial or legal certification. All external-provider, fiscal, payment, hardware and employer-specific obligations require independent verification.

## Ownership and release coordination

This non-PoS work belongs to `elguiriashing/AkiBusiness`, independent of AkiHQ business-management onboarding. The previous printer PR #66 and fiscal/refund PR #67 must be integrated intentionally, with fresh CI, migration review and staging acceptance. Do not silently merge a branch into another release candidate or promote it to live without checks.

## Tool-by-tool results and follow-up

| Area | Candidate improvement / current functionality | Important remaining acceptance |
| --- | --- | --- |
| CRM, leads, contacts, companies, deals | Bounded CSV import with strict escaping and 1000-row limit, review modal, invalid/duplicate triage, rechecked actor/workspace, and all-or-nothing local batch insertion. Relationship and pipeline workflows retained. | Confirm database sync durability after a reload, row-level authorization, real source-file variants, lawful data provenance and data-subject rights; imported contacts never grant marketing consent. |
| Inbox / business email | Existing Google/Microsoft authorization, read/reply and separate internal notes preserved. | Configure and approve provider OAuth application credentials, real sent/received messages, bounce/uncertain delivery, tenant disconnect/revocation, unsubscribe and processor notices. Cannot call a message delivered merely from local status. |
| Projects and tasks | Preserved linked tasks on project edits, task search/triage and source-linked follow-ups. | Browser multi-device conflict, assignee permissions, timezone-aware deadlines and staff notifications; custom automation doesn't run in the background. |
| Calendar | Valid 09:00 to 10:00 event defaults from tapped month days, including on populated days. Existing search/agenda retained. | Verify locale/IANA timezone and DST roundtrips, mobile keyboard/accessibility and overlapping meetings. This is a workspace calendar, not verified Google Calendar sync. |
| Inventory | Archived/draft or digital SKUs never appear as physical reorder suggestions. Forecast labels identify planning estimates rather than confirmed demand. | Supplier purchase orders, recipes/lot tracing where required, stock valuation, inventory tax treatments and multi-location concurrency. No automated order placement. |
| PoS and hospitality | Separate draft PR #67 and printer PR #66 contain ongoing fiscal, cash, refund, statement and printing work. | AEAT SIF/VERI*FACTU go-live, real terminal refunds and settlement, physical printers/devices and accountant acceptance: still gated. |
| Sales and billing | Manual Paid statuses no longer labelled verified collected revenue. Paid quotes, drafts, negative totals excluded from legacy paid figures. | Actual fiscally issued documents and signed payment capture, ERP/a3/Sage imports, accounts receivable allocation and actual bank reconciliation. |
| Marketing | Campaign status now labelled plan, manually recorded counters not represented as real-time delivery. Existing consent-checked sending remains gated. | Provider authorization and actual delivery, validated consent/LSSI notice, unsubscribe and suppression acceptance, channel-specific metrics. |
| Websites and forms | Planned page/form statuses and recorded counters explicitly distinguished from real published URLs and live submissions. | Public publishing system, collection, privacy notices, consent, rate limiting, accessible form output and receipt evidence. |
| Automation | Existing preview-then-create supported overdue/low-stock tasks retained. No false unattended execution promise. | Background executor and authorization at execution time, idempotent scheduling, audit and failure recovery before advertising hands-off automation. |
| Team Chat | Existing workspace/channel/DM controls and message-to-task handoff retained. | Live revocation and cross-tenant isolation, attachments, privacy/retention, mobile access and worker transparency. |
| People and rotas | No phantom online staff from recently edited contacts; scope counts to the workspace, distinguish directory records from authenticated access. Existing rota schedule/timezone editor preserved. | Employee invitations and revocation, legal time recording if offered, 4-year record preservation where applicable, working-time rules, worker privacy; rotas alone aren't statutory attendance. |
| Knowledge | Review article can create a linked task with original article ID; search/review-date remains. | Versioning, approval, review status, media permission checks, access after role revocation, supported retention. |
| Analytics, dashboard and settings | Clear distinction between operational status and settlement; commercial About identity; privacy notice that browser snapshot isn't a database backup. | Real reconciliation back to source ledgers, consent-aware measurement, durable restore drills, documented processing/retention and admin access. |

## Safe release checklist

1. Source tests and production-transformed role-swap artifact must build with the exact, pinned manifest, `node --check`, full Cloudflare `npm run check`, and the browser matrix at phone, tablet and desktop in EN/ES, dark/light.
2. CRM CSV imports: malformed and formula-bearing data, mixed encodings, large files, duplicate contacts, stale preview, switched workspace, revoked permission and sync-conflict handling.
3. Calendar: no zero-duration events, working day selection, correct local date and DST test cases.
4. Inventory: archived/digital exclusions, optimistic concurrency, no phantom "live forecast", no duplicate stock movements.
5. Test cross-workspace and staff/admin permissions for Inbox, CRM, Projects, Team Chat, People and Knowledge.
6. Verify operational labels/copy against actual provider and database states; do not equate paid document status with bank collection.
7. Re-check all open PRs for conflicts, migration ordering and Cloudflare resource bindings. Reserve deployment for a reviewed release with rollback IDs and live smoke checks.
8. Separately complete legal requirements for RGPD/LOPDGDD, LSSI, business invoices, Spanish working-time records, accessibility where applicable and processor contracts; product code alone does not certify compliance.

**Do not merge automatically while PR #66 and #67 are active or a review/CI gate is unresolved.**
