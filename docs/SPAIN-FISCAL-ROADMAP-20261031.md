# AkiBusiness fiscal / payments release gate — 31 October 2026

**STATUS: DRAFT. NOT CERTIFIED. FISCAL ISSUANCE AND AEAT SUBMISSION REMAIN DISABLED.**

This is an engineering acceptance plan, not legal advice, an AEAT approval, a producer's declaration of conformity or authority to release. Never market a partially supported jurisdiction as compliant.

## Two distinct Spanish rulesets

1. RRSIF under RD 1007/2023 as amended: Corporation Tax taxpayers in scope adapt by **1 January 2027**, other affected taxpayers by **1 July 2027**. VERI*FACTU versus non-VERI*FACTU requirements are different. AkiBusiness plans a VERI*FACTU-only common-territory issuer.
2. B2B electronic invoicing under RD 238/2026 / Orden HAC/1028/2026: turnover above €8m in previous-year VAT (IVA) reference period **6 October 2027**; remaining affected issuers **6 October 2028**; the staged payment-status reporting obligation for certain individuals and attribution-of-income entities **6 October 2029**.
3. SII and Basque/Navarra foral tax systems need separate treatment; common-territory IVA configuration is not a substitute for TicketBAI/Batuz. Canarias (IGIC) and Ceuta/Melilla (IPSI) need their own tax adapters. VAT special cases, foreign tax registrations, international operations, multi-currency, B2G and B2B recipient obligations remain unsupported and must fail closed.

**Authoritative references:** [AEAT RRSIF](https://sede.agenciatributaria.gob.es/Sede/iva/sistemas-informaticos-facturacion-verifactu.html), [AEAT scope FAQ](https://sede.agenciatributaria.gob.es/Sede/iva/sistemas-informaticos-facturacion-verifactu/preguntas-frecuentes/cuestiones-generales-ambitos-aplicacion.html), [AEAT B2B timetable](https://sede.agenciatributaria.gob.es/Sede/iva/factura-electronica/calendario-implantacion.html), [BOE RD 1007/2023](https://www.boe.es/buscar/act.php?id=BOE-A-2023-24840). Recheck consolidated amendments and AEAT technical documentation before go-live.

## Implemented candidate in PR #67

- Fail-closed Spanish entity, territory, SII, VAT-regime and turnover classification with 2027–2029 milestone display and direct AEAT references.
- Immutable workspace-scoped manager refund records tied to the original closed sale and tender UUID. Strict reason, integer cents, cumulative refund cap, unique external provider refund reference, and explicit operator confirmation that real cash or terminal payout already happened.
- Lost response recovery uses the original durable request UUID. Never automatically pay twice.
- Cash refund subtracts from the **trading day of physical payout**; original gross sales and fiscal documents are unchanged. Reconciliations retain counted-versus-expected difference and history.
- Read-only manager-only external payment/refund feed and local CSV comparison with provider statement. Flags missing, duplicate, mismatched, unposted and unrectified records without claiming bank settlement. Imported provider CSV stays on-device.
- SQL fix for a pre-existing active trading-day reporting expression.
- Scoped unit, database and responsive UI regression tests; actual CI, staging and physical-merchant acceptance still required.

## Fiscal release blockers

**F1. Issuer/producer readiness:** legal identity, compliant SIF version/installation metadata, signed producer declaration for the actual shipping build, formal adviser review and operational retention/access controls.

**F2. Atomic hospitality bridge:** one posted sale to one numbered fiscal document; stable tax/series/customer snapshots; cash, split bills, partial payments, discounts, tips, mixed IVA, simplified-invoice eligibility and date/timezone; no double stock, no retrospective guesswork. Unsupported taxable cases block issuance.

**F3. AEAT adapter:** guarded outbox, per-issuer hash chain and certified schema, required QR and printed legend, secure representative certificate/mTLS outside repo/browser, authentic test/production endpoints, acknowledgements and CSV, accepted-with-errors, duplicates, rejection and rate-limit handling, unknown outcomes and archival. Reconcile with AEAT before retrying uncertain submissions.

**F4. Corrections:** fiscal rectificativas numbered and linked to originals; persistent signed tax delta; never edit/delete previously issued documents. Separate merchant refund, inventory restock and fiscal correction events with complete audit.

**F5. Different tax systems:** SII, foral, IGIC/IPSI, exports and special operations must use validated separate adapters; do not silently apply 21% IVA to everything.

**F6. B2B electronic invoice:** verify official structured format, recipients, exchange channel and public solution, mandatory payment-status notices, revisions and access. A VERI*FACTU record is not a substitute for B2B compliance.

## Payments release blockers

**P1. Real terminal processor:** certified merchant/PSP integrations, signed provider callbacks, idempotent capture and refund lifecycle, stable provider IDs; never collect PAN/PIN. Manual PoS reference is only operator attestation.

**P2. Settlement:** reconcile provider transaction history, refunds, chargebacks, fees and payouts to the **real bank deposit**. Matching imported CSV references is not proof of bank settlement or payment capture.

**P3. Physical acceptance:** card terminal, cash drawer, printer, two simultaneous staff devices, power failure/paper outage, overnight service, historic refunds, language and accessible mobile layouts.

**P4. Compliance/finance sign-off:** accountant, fiscal counsel, company controller and controlled pilot with permanent audit and no unsupported promise.

## Deployment sequence

1. Full CI and reproducible isolated PostgreSQL concurrency/race tests.
2. Review SQL diffs against the current shared production schema; additive ordered staging migrations, ACL/RLS/security lint and performance.
3. Browser checks for payment/refund replay, cross-tenant isolation, invalid amounts, manager-only controls and offline recovery.
4. Provider sandbox + real low-volume acceptance, independent bank reconciliation, actual physical printer and device tests.
5. AEAT official environment acceptance, complete supplier producer declaration and counsel approval.
6. Only then activate the fiscal issuer; pilot by jurisdiction/feature gate. No automatic general all-Spain release.

**Track:** [fiscal issue #22](https://github.com/elguiriashing/AkiBusiness/issues/22) · [payments issue #23](https://github.com/elguiriashing/AkiBusiness/issues/23) · [candidate PR #67](https://github.com/elguiriashing/AkiBusiness/pull/67).

## 2026-10-31 | Preserve shared account eligibility in refund candidate

Read-only production metadata exposed a regression in PR67: replacing
crm_pos_cash_overview removed the deployed account_features_allowed guard
(definition MD5 d0e1a019464e8287d9175d05a1a105d3). The private hospitality
guard checks tool/workspace access but has no direct account-completion guard.
All five affected public cash/ledger/refund/settlement RPCs now explicitly
reject missing identity or false/unknown account eligibility. Each candidate
migration checks for the existing shared helper before changing any object.
Manager checks also treat NULL as denial. No production SQL was executed.

Seven actual PGlite suites pass, including original immutable sales, partial
refund/idempotency/caps, manager/tenant isolation and statement limitations,
plus false and unknown eligibility across all five public RPCs. This fixture
is not genuine GoTrue authentication or independent PostgreSQL concurrency.
The statutory dates were checked against current primary AEAT/BOE sources;
this does not certify an issuer, bank settlement or payment-provider operation.
Fresh hosted CI, shared-schema staging, independent-connection races and the
existing provider/fiscal/physical gates remain required before this draft can
activate or be published. PR56/66 source merges do not waive those gates.

Primary-source readback: https://sede.agenciatributaria.gob.es/Sede/todas-noticias/2026/octubre/7/solucion-publica-facturacion-electronica.html and https://boe.es/diario_boe/txt.php?id=BOE-A-2025-24446.
