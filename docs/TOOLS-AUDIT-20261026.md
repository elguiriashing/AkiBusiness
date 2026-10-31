# AkiBusiness tools audit and modernization

Base: `c374a42` on GitHub main. Working branch: `audit/business-tools-modernization-20261026`.
No production deployment or customer-data writes are authorized by this review.

## Plan and acceptance

1. Trace all thirteen working areas from first interaction through persistence, permissions and recovery. Twelve subscription keys remain unchanged; Rotas uses People.
2. Repair confirmed workflow and data defects. Add useful search, triage, first-use actions and validation using existing persistence contracts.
3. Modernize the operational shell and tools with compact surfaces, clear hierarchy, accessible controls and responsive layouts. Preserve the recent public landing/login changes.
4. Second pass: executable regressions, full project checks, production artifact build and isolated browser journeys at phone, tablet and desktop sizes in English/Spanish and both themes.
5. Record exact changes, evidence, outstanding provider/hardware acceptance and a numbered live approval checklist. Do not merge or deploy before the owner's final approval.

## First-pass findings

- CRM: entity configuration dereferences a missing pipeline even for unrelated forms.
- Inbox: ordinary business workspaces have no external delivery connection and no first-record creation path; internal notes must never masquerade as delivered messages.
- Tasks: editing any project clears its task associations.
- Calendar: no agenda view; event start/end are not validated together.
- Inventory: new-item saves silently replace entered safety stock and supplier lead time with defaults; updates replace valid zero values.
- POS: existing stock/payment idempotency, printer and recovery contracts require regression checks and physical-device acceptance.
- Sales: quotes and cancelled records inflate receivables; overdue count depends on manually edited status.
- Marketing: records are planning-only; manually stored counters are described as tracked delivery.
- Automation: edit/toggle activity is incorrectly called execution history. No tenant executor exists.
- Team chat: channel search exists; message search and contextual task handoff need review.
- People: directory and membership changes must preserve tenant roles; Rotas manual profiles must not grant access.
- Knowledge: no local content/category search or review-date workflow.
- Rotas: existing publication, conflict, timezone and staff visibility contracts require second-pass regression coverage.

## External dependencies

Business email delivery requires a selected tenant connection model, verified sender and provider setup. Fiscal issuance remains explicitly gated. Real payment terminals, printers, native-device login and production provider acceptance cannot be certified from local fixtures.

## Implemented review, by working area

| Area | Changes / review result | Second-pass evidence |
| --- | --- | --- |
| 1. CRM | Fixed the Companies create button's invalid `companie` entity. Empty pipelines now have a working setup action; unrelated forms tolerate missing/incomplete stages. Added record search and contextual follow-up tasks. Removed platform catalogue-publishing controls from business company rows and drawers. | Executed real form configuration/setup handlers, company CTA and follow-up defaults; browser layouts and first-pipeline creation. |
| 2. Inbox | Added each business's own Gmail/Google Workspace or Microsoft 365/Outlook connection, recent inbox messages, plain-text reading, explicit replies, disconnect and setup/error states. Added first internal-conversation creation; internal notes remain clearly separate from external email. | OAuth state/PKCE/replay, encrypted credentials, tenant and role checks, duplicate send, uncertain-send recovery; connected mailbox browser reading/reply/back-navigation and escaped message content. Providers are mocked. |
| 3. Tasks/projects | Fixed project edits detaching tasks. Project deletion now removes obsolete links. Added search and All/Mine/Overdue/Open filters, record-to-task and chat-to-task handoff with retained source context. | Real save handler preserves project/task association; filters select actual records; reviewed automation tasks persist through existing snapshot contract. |
| 4. Calendar | Added searchable month/agenda views, keyboard-accessible day cells, start/end validation and a sensible one-hour default duration. | Agenda browser interaction and invalid-date regression. Browser/local timezone display remains the existing Calendar behavior; Rotas keeps its own explicit IANA timezone. |
| 5. Inventory | Fixed ignored safety-stock and supplier-lead-time inputs on creation and valid zero values on update. Added duplicate SKU validation before writes. | Real creation payload assertions; existing inventory ledger, receipt, transfer, stock-count, valuation and retry tests. |
| 6. POS | Preserved register/service behavior while refreshing the surrounding shell. Audited payment, stock, printer, course, kitchen, cash and retry paths through the established suite. | Existing checkout, immutable-price, stock, idempotency, printer transport emulator, KDS/service and fiscal-gate regressions. No real terminal or printer claim. |
| 7. Sales | Receivables now exclude quotes, drafts, paid and cancelled documents. Overdue derives from due date. Added searchable receivables/overdue views, unique references, tax/total/date validation and follow-up tasks. | Executed totals/filtering and validation tests. Operational documents remain explicitly distinct from certified fiscal issuance. |
| 8. Marketing | Added subject/content authoring, review screen and explicit one-recipient send through the business's connected mailbox. Reuses server consent, suppression, verified-sender, controller identity and unsubscribe checks. Sender setup works with Marketing alone; no Inbox slot is needed, and no mailbox-reading access is granted. Removed the inaccessible platform-only Media tab from ordinary business navigation. | Consent rejection prevents transport; accepted send includes identity/unsubscribe and deduplicates its reference. Setup/reading separation tested. Live delivery remains off until operator acceptance. Historic counters are labelled recorded values. |
| 9. Automation | Added two real, explicitly reviewed rules: overdue-work follow-up and low-stock follow-up. Preview shows exactly which tasks will be created; changed sources require another preview. Rule/source/day deduplication uses persisted task references. Editing activity is no longer represented as an execution log. | Executed preview/create/deduplication and permission tests. Existing optimistic workspace revision checks protect simultaneous snapshot writes. Custom notes are documentation, never executable code. No background scheduler or external sends. |
| 10. Team Chat | Added message-to-task handoff with author, text, channel and message reference. Preserved channel/DM authorization and existing reply/reaction/delete behavior. | Existing team-chat role/isolation regressions; desktop/tablet/phone rendering and new handoff path. |
| 11. People | Added directory search by name, email, department and role. Preserved database-backed invitations/memberships and the distinction between team access and manual rota profiles. | Existing tenant role, seat-limit and staff authorization tests; directory rendering in all layout combinations. |
| 12. Knowledge | Added content/category search, review dates and a review-due filter; improved no-match handling. Mobile article navigation remains visible. | Actual search selection, guide coverage and existing durable-record, escaping and role tests. Review dates are reminders in the UI, not an assertion that an article has been formally approved. |
| 13. Rotas | Included in the refreshed shell and bilingual quick guides; preserved its specialized editor and entitlement mapping to People. | Existing draft/publish, overlap, overnight, copy/template, staff visibility, CSV/ICS/print, stale-revision and permission regressions. |

## Visual overhaul

`assets/business-workspace.css` is scoped to operational screens. It adds a narrower sidebar, smaller header, tighter panel/table/card spacing, consistent action/filter/search controls, quieter surfaces, keyboard focus states and reduced-motion behavior. Mobile actions wrap rather than clipping the primary create button; top-bar icons have explicit dimensions. Knowledge navigation remains accessible on phones. The recently updated public landing page and login opening stories are preserved.

The paid-release cache and runtime versions advance together, including deployment/review workflow assertions. The release builder now handles Windows CRLF checkouts while retaining exact-once transformation checks.

## Verification and evidence

- Full sequential suite: **733 passed, 0 failed, 1 skipped** (734 tests). The skipped test needs the external 107,357-row workbook fixture. No customer spreadsheet was opened or modified.
- Final focused pass after the last permission/first-use refinements: **38 passed**. Additional provider and workflow tests cover consent refusal, Microsoft account isolation and Marketing-only access.
- Browser matrix: **156 route/layout cases**, all thirteen areas at 390/768/1440px, EN/ES and dark/light. No document overflow or runtime errors. Interactive checks include search, agenda, empty-pipeline setup and connected email reading/reply/mobile navigation. Synthetic fixtures replace authentication and remote data.
- Production-transformed static artifact builds locally. Gateway `wrangler deploy --dry-run` completes and recognizes the new Durable Object binding. Nothing is uploaded by this command.
- Repeated the full 156-case browser matrix against the final AkiBusiness production-transformed artifact: zero failures. Evidence: `../business-product-browser.log`, `../business-approval-browser/results.json` and screenshots in that folder. Final mailbox refinements fix controls remaining disabled during deferred rendering and isolate reply drafts by message/send state.
- Workspace evidence: `../business-audit-regression.log`, `../business-final-focused.log`, `../business-gateway-final.log`, `../business-audit-browser/results.json`, and synthetic screenshots in `../business-audit-browser/`. Final production-transformed artifact: `../business-approval-product/`.
- No production credentials, real email, live customer writes, database migrations, merge or deployment were performed.

## Approve / deny for live

### Simple business connections — 2026-10-27

- Business Integrations now shows the implemented Google/Microsoft mailbox authorization flow with three setup steps, readable status, administrator guidance and provider connect buttons. Customers do not copy API keys or passwords. OAuth returns to the initiating Integrations, Inbox or Marketing screen; setup screens request status only, not mailbox contents.
- Removed the business-facing catalogue of nonfunctional generic REST/webhook/provider connectors. Platform configuration-note history now says notes were saved, rather than falsely recording a connection. No calendar/contact sync or unimplemented API connectivity is advertised.
- Provider app credentials and approval remain a one-time AkiBusiness operator prerequisite. Business admins then authorize their own account. No live provider configuration or deployment occurred. Focused setup/mail/tenant/workspace tests: 39 passed.
- This refines approval group 5. Updated local production-transformed artifact: `../business-approval-connect-setup/`.
- Final source browser regression: 156 cases passed (`../business-connect-browser-final.log`); production-transformed build succeeded (`../business-connect-build.log`).

### Additional connection pass — 2026-10-27

- Existing record drawers now connect company/contact/deal/sales relationships, project tasks, assigned staff and calendar attendees using actual workspace record IDs. Links are omitted when the record is missing or its tool is unavailable; drawer actions enforce the same check.
- New record follow-ups persist their source record and provide navigation in both directions. Reviewed stock/overdue automation tasks also retain navigable source records. Existing free-text references are preserved without guessing links.
- Existing Inventory → POS item/stock identity, People → Rotas membership, Inbox/Marketing → customer mailbox, and task/project persistence paths were inspected. No duplicate sales/invoice writes or new tools were introduced.
- Removed the generic AkiPasa public-site sidebar shortcut from ordinary business workspaces. Venue/customer website metadata remains optional reference information; no guessed public venue URLs or unsupported analytics links are generated. Platform-only catalogue controls stay platform-only. Corrected ordinary CRM copy that described every company as an AkiPasa venue.
- These additions belong to approval groups 1–2. Updated local AkiBusiness artifact: `../business-approval-connections/`. Connection/tenant/rota regressions: 30 passed (`../business-connections-tests.log`); source browser matrix: 156 passed (`../business-connections-browser.log`). No live changes.

1. **Core data and first-use fixes:** CRM/company/pipeline, project relationships, stock defaults, sales calculations and form validation.
2. **Daily workflows:** search/triage, agenda, follow-up handoffs, Knowledge review dates and internal-conversation creation.
3. **Reviewed automation:** overdue and low-stock task creation, preview and deduplication; no background execution.
4. **Operations UI:** compact responsive shell and all tool surfaces, keyboard/reduced-motion improvements, mobile navigation fixes.
5. **Business email infrastructure:** additive `BusinessMailbox` Durable Object plus Gmail/Microsoft OAuth/read/reply UI. Deploying code alone does not connect a mailbox. Requires the setup and acceptance below.
6. **Marketing email:** composition/review and consent-checked delivery through the customer's mailbox. Keep `BUSINESS_MARKETING_ENABLED` absent/false until sender, consent, unsubscribe and provider acceptance pass.
7. **Release plumbing:** matching offline cache versions, review assertions and Windows-compatible exact-match release generation.

Groups 5–6 can remain inactive while the operational fixes ship. A production rollout must verify the actual source SHA and live release stamp, then test with an authorized business account. This report does **not** certify every live integration or every tool as commercially complete under every business use case.

## Email setup and acceptance before activation

See [BUSINESS-EMAIL-SETUP.md](BUSINESS-EMAIL-SETUP.md). No secrets belong in the repository or browser. The new `business-mail-v1` migration is an additive Cloudflare Durable Object class migration; no Supabase schema changes were made. Existing privacy/consent RPCs must already be installed for marketing; failure is closed if they are absent.
