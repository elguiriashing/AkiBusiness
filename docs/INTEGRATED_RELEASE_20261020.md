# Integrated AkiBusiness release candidate

This candidate preserves the ancestry of toolbox PR29, shared-account eligibility PR31, operational analytics PR32, approved storefront PR33 and gated operations billing PR34. It is a release integration, not evidence of production activation.

## Integration decisions

- Retained both account eligibility and operational analytics configuration and scripts, loaded before the main application. Existing suite navigation remains intact.
- Retained the authoritative toolbox scheduler and added billing reconciliation adapter. All onboarding, operational analytics, toolbox and billing activation gates retain their existing disabled/default behavior.
- Retained the single account-owned operations checkout handoff; no local purchase flow or financial write was introduced.
- Reconciled source service-worker cache 136 to paid cache 137, paid application asset 47 and the four PoS CI cache assertions. Shared source application asset 43 remains valid because the entire offline cache advances. Both role release modes must build successfully.
- No production database migration, billing configuration, live subscription, payout or fulfilment changed. The billing migration manifest is a prospective sealed review mechanism, including explicit approved monthly metadata; it is not automatically applied.

## Validation

The integrated source passed the actual browser runners for toolbox, operational analytics and storefront: 16 EN/ES/theme/viewport combinations each (48 total). These use inert test data and do not prove live payment or authenticated production acceptance.

Run the full gateway `npm run check` in `cloudflare`, plus `node --test tests/integrated-release.test.mjs`. Hosted exact-head CI remains required. Additional focused checks cover account bootstrap restrictions, billing lifecycle and migration previews, tool rotations, staff delegation, analytics scoping, storefront prices and safe cross-product navigation. Generated screenshots and logs remain excluded from source.

## Release and rollback

Build using `NEXT_PUBLIC_AKISUITE_ROLE_SWAP=true node tools/build-product-release.mjs <new-empty-directory>` from a clean exact commit and verify its `release-source.json`. Confirm this repository's AkiBusiness production mapping before deployment. Database migrations require the separately documented staged acceptance and runtime gates; browser success alone must not enable them.

Rollback the application by redeploying the previous accepted artifact and advancing the offline cache above 137 if needed. Retain historical database data and existing subscription records. Do not reverse database changes destructively or restore obsolete role mappings. Feature-specific rollback details remain in each feature's release document.
