# AkiBusiness cash-shift reconciliation

19 October 2026. This release adds manager-controlled opening floats, cash pay-ins, safe drops and counted-drawer closure to the paid AkiBusiness PoS. It is an operational cash-control feature, not payment capture, bookkeeping, invoicing or fiscal issuance.

## Behaviour and accounting boundaries

Starting a trading day creates one workspace-scoped cash shift. A manager records the opening float before the first sale or cash movement. Recorded cash tender from closed PoS bills increases expected physical cash; pay-ins increase it and safe drops decrease it. Neither floats nor movements change sales revenue, recorded tender or stock. Closing requires a physical count and records the discrepancy. Any non-zero discrepancy requires a reason.

The existing trading-day close RPC now refuses to bypass drawer reconciliation. The cash command closes the shift and trading day in the same database transaction, after confirming there are no open bills. Every command includes the trading day reviewed in the manager dialog; a stale dialog cannot modify or close a later shift. Recorded external tender remains evidence of an external payment only; this feature does not claim or perform card capture.

## Integrity and access

The migration adds private `cash_shifts`, `cash_movements` and `cash_commands` tables under `akihq_hospitality`. RLS is enabled and direct table access is revoked from public, anonymous, authenticated and service roles. Authenticated clients use guarded security-definer RPCs that re-check the active workspace membership and manager role, serialize writes with the workspace advisory lock and journal idempotency keys. Reusing a command key with a different payload is rejected.

Cash values are integer cents. Amounts are positive and bounded; free-text reasons are trimmed and bounded. The opening float cannot be rewritten after sales or another drawer movement. Reconciliation evidence remains retained after the day closes. Browser storage retains an unresolved cash command and its idempotency key across ambiguous network failures; the retry control reuses both the key and reviewed trading day. A same-tab in-flight guard and Web Lock prevent rapid duplicate submission.

## Migration, rollout and rollback

Apply `20261019222000_pos_cash_reconciliation.sql` after the existing hospitality and ledger migrations, followed by `20261019224000_pos_cash_command_safety.sql` where the first migration was already installed. Before rollout, confirm there is no active trading day. The migration is additive, but it deliberately changes the legacy trading-day close contract for future active days. Deploy the matching frontend immediately after the migration.

For rollback, revert the frontend while retaining cash evidence. Do not drop tables or truncate the command journal. Because the legacy close path is guarded, a frontend rollback during an active new cash shift requires an administrator-reviewed reconciliation through the cash command rather than a direct trading-day close.

## Verification gates

- Embedded PostgreSQL scenarios verify float plus cash sale plus drop calculations without changing revenue.
- Tests cover idempotent retries, changed-payload conflicts, stale trading-day rejection, discrepancy reasons, legacy-close bypass prevention, tenant isolation, role enforcement and direct ACL denial.
- UI tests cover manager-only controls, pay-in/drop entry, counted closure, durable same-key recovery after an ambiguous response, discrepancy reasons and exact service-worker cache versions.
- Repository-wide checks and the clean release build remain required before merge.
- Staging acceptance still requires two authenticated roles, a real till opening/count/close, revocation, two-device concurrency and network-loss-after-commit exercises.

Physical hardware, printer-drawer integration, fiscal cash-book treatment and accountant-approved exports remain outside this release.
