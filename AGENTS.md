# Codex migration instructions — AkiBusiness

This repository is being extracted from `elguiriashing/akipasa` at its latest `master`. The existing main production repo and Worker MUST remain functional and unchanged by this extraction.

Canonical domain: `https://akibusiness.com`. Legacy host: `https://business.akipasa.com`.

- Read `README.md` first. Treat it as the product-specific extraction contract.
- Copy the actual application and all necessary transitive dependencies. Do not fabricate replacement functionality or ship placeholders.
- Implement **independent** Next.js/OpenNext Cloudflare build scripts, Wrangler configuration and CI.
- Preserve Supabase user identities, tenancy/RLS protections and business/booking identifiers. Shared project ref: `vhpbvcfkcteswlsdjrfl`.
- Keep real credentials in Cloudflare secrets. No private keys in Git or PRs.
- Cross-domain logins require explicit OAuth redirect allowlists and robust sessions; do not rely on cross-site cookies.
- Build/test and preview before attaching new production hostnames. Do not modify legacy redirects until the new system is verified.
- Write down skipped functionality and risks in the PR; no silent regressions.
- Coordinate with ongoing Codex work to avoid overlapping branches or forced pushes.
