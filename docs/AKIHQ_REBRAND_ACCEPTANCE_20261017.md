# AkiHQ brand acceptance checkpoint

Blue/gold HQ mark, favicon, 180/192/512 PNG icons and maskable variants are generated from the source-controlled blue/gold SVG. The AkiHQ management experience uses the existing shared backend, historical authorisation and billing keys. This release changes no Supabase schema or Stripe configuration.

Exact-head CI must pass including Next/OpenNext bundle, role-swapped route acceptance and Wrangler deploy dry-run. Confirm `roleSwapEnabled:true` and `publicProduct:AkiHQ` on the canonical `/api/health`, then verify header, icon files, manifest and source stamp after publishing a validated release to the existing AkiHQ Worker. Preserve its previous version for rollback.
