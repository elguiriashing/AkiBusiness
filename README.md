# akibusiness — AkiSuite product extraction

**Status:** Migration groundwork only. No deployed application yet.

- Canonical domain: `https://akibusiness.com`
- Existing route/legacy host: `https://business.akipasa.com`
- Source of truth for extraction: `elguiriashing/akipasa` (branch `master`)
- Shared backend: existing Supabase project `vhpbvcfkcteswlsdjrfl` (never recreate or reset)

## Migration rules

1. **Keep the original `akipasa` repo and live Worker unchanged.** Copy or extract; do not delete original code.
2. Extract a *working* independently buildable application and its transitive dependencies, not just matching route files.
3. Work in an isolation branch with CI; build and test a preview before production DNS changes.
4. No database schema changes, destructive migrations, auth provider changes, or legacy redirects as part of initial extraction.
5. Never commit secrets or production private keys; use Cloudflare environment secrets.
6. Maintain shared user IDs, business entitlements, RLS policies and booking/claim records.
7. Cross-root-domain SSO must use a proper auth redirect/token exchange; do not assume cookies can be shared.

## Initial source inventory (verify against latest master)

- `src/app/[locale]/business/**`
- `src/app/api/business/**`
- `src/components/Business*.tsx`
- `src/lib/business*.ts`
- `src/lib/supabase/**`

## Product considerations

Own the business management UI, venue claims, event tools and mobility/fleet administration; do not move AkiHQ POS into this repository.

## Definition of ready

- [ ] Independent build, typecheck and product-focused tests pass
- [ ] Pages/Workers preview deployed to an isolated hostname
- [ ] Product login, logout, OAuth callback and password recovery pass
- [ ] Key protected APIs maintain authorization and tenant isolation
- [ ] English and Spanish screens and responsive layouts tested
- [ ] Secret bindings and env vars configured without leaking keys
- [ ] New domain HTTPS validated before cutover
- [ ] Old hostname redirects only after verified replacement
- [ ] Rollback path documented and tested

## Coordination

This repo is a destination for the Codex extraction. The initialization README is a handoff contract, not an implementation. Avoid merging incomplete placeholders as an application release.
