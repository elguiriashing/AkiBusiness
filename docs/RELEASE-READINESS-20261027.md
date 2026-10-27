# AkiBusiness release readiness — 27 October 2026

Scope: the thirteen AkiBusiness working areas. The owner authorized merge and live deployment on 27 October. This is an engineering release assessment, not a blanket legal certification.

## Available behavior

CRM, internal conversations, tasks/projects, calendar, inventory, operational POS, sales records, campaign planning, reviewed task automation, team chat, People, Knowledge and Rotas use the existing workspace access and persistence contracts. The detailed changes and test matrix are in TOOLS-AUDIT-20261026.md.

## Capabilities that remain gated

- Business Gmail/Microsoft OAuth: backend and user flow implemented, but the live gateway has no BUSINESS_GOOGLE or BUSINESS_MICROSOFT credentials. The UI reports setup pending. AkiBusiness must register its provider apps and complete provider approval; a customer cannot fix this by entering their password.
- Marketing transmission: BUSINESS_MARKETING_ENABLED remains off. Activation requires working mailbox authorization, controller/sender configuration, consent and suppression RPCs, unsubscribe verification and an authorized test recipient. Provider acceptance is not delivery, open or click tracking.
- Fiscal issuance: retain the existing readiness gate. Do not advertise operational sales records as certified Spanish fiscal invoices. The producer's version-specific declaration and applicable technical acceptance must be completed before activation.
- Printer/card-terminal interoperability needs the intended hardware and provider account. Local emulator and controller tests do not establish physical-device acceptance.

## Claims and legal boundaries checked

Public EN/ES tool descriptions now describe implemented behavior and setup dependencies. Removed the website-builder claim from Marketing and narrowed Automation to reviewed overdue-work/low-stock follow-ups. No unimplemented API connectors are offered in business Integrations.

The Spanish government's [LSSI guidance](https://lssi.digital.gob.es/lssi/la-ley/preguntas-frecuentes) requires appropriate authorization or a qualifying existing-customer relationship and a simple free opt-out for commercial email. This implementation deliberately requires recorded consent and suppression checks; address-book membership alone is insufficient.

[AEAT's producer declaration guidance](https://sede.agenciatributaria.gob.es/Sede/iva/sistemas-informaticos-facturacion-verifactu/preguntas-frecuentes/certificacion-sistemas-informaticos-declaracion-responsable.html) requires the declaration to be accessible in the relevant system/version and at acquisition. Passing tests cannot substitute for that declaration.

These checks do not settle every jurisdiction, contractual promise, customer processing agreement or business-specific lawful basis. Do not market the gated capabilities as already activated or certified.

## Deployment controls

Ship the tested source via a reviewed GitHub PR. Preserve the shared gateway's existing bindings, secrets and remote variables. The mailbox Durable Object migration is additive. Verify deployed source stamps and service responses; record actual deployment identifiers before claiming success. Never enable gated transmission or fiscal functions merely to complete a release.

Use `cloudflare/wrangler.business-production.toml` for this shared-gateway release. It retains the live sender allowlist (including Anna), resource bindings and single daily schedule, and keeps remote variables/secrets. The general development config includes an additional unactivated two-minute schedule and must not replace these production settings. Reconcile live configuration again before future deployments.
