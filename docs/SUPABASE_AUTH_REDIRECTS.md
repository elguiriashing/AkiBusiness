# Supabase authentication redirect migration — AkiSuite

Status: **allowlist change required in the hosted Supabase dashboard**. Repository changes do **not** modify the hosted auth configuration.

Project: `vhpbvcfkcteswlsdjrfl`
Dashboard: https://supabase.com/dashboard/project/vhpbvcfkcteswlsdjrfl/auth/url-configuration

## Preserve the current Site URL

Leave the existing Supabase **Site URL** as it is until the centralized authentication design has been verified. Do **not** replace it with an individual new product domain; it is the fallback destination for emails that omit a redirect URL.

## Add to the existing Additional Redirect URLs (do not replace existing entries)

The current AkiPasa Next.js login uses locale-specific callbacks on the origin:

```text
https://akibusiness.com/en/auth/callback
https://akibusiness.com/es/auth/callback
https://akiduermo.com/en/auth/callback
https://akiduermo.com/es/auth/callback
https://akicoches.com/en/auth/callback
https://akicoches.com/es/auth/callback
```

These entries are **preparatory**: each new app must implement the exact route and PKCE exchange before sign-in will work. AkiHQ uses a separate standalone SPA: first inspect its _actual_ OAuth/magic-link/recovery redirect target, then allowlist that precise URL under `https://akihq.app`. Do not guess the AkiHQ callback path or enable `https://*.com/**`.

Keep all existing AkiPasa and legacy-domain callback URLs. In the future, add staging/preview callback hosts only if they are fixed and trusted; avoid blanket wildcards on production hosts.

## Codex implementation checklist

- [ ] Inspect Supabase Authentication > URL Configuration's current Site URL and **existing Additional Redirect URLs**. Preserve every currently needed URL.
- [ ] Append the six production entries above in the hosted Supabase dashboard or using an authorized management API credential with the correct endpoint, then read back settings to verify.
- [ ] Inspect standalone AkiHQ auth flows, determine its exact new callback URL(s), append only those URLs, and verify.
- [ ] Update each extracted application's allowlisted server origin validation (the old shared `src/lib/public-request-origin.ts` only trusts old hosts).
- [ ] Keep existing origin-specific safe auth destinations and avoid open redirects; rewrite domain-specific return handling.
- [ ] Verify signup confirmation, magic link, OAuth PKCE, password recovery, sign-out and account continuity per domain and both locales.
- [ ] Update the external OAuth identity provider's authorized redirect URI only if the Supabase provider callback URL itself changes (normally it remains `https://vhpbvcfkcteswlsdjrfl.supabase.co/auth/v1/callback`).
- [ ] Don't deploy old-domain 301/308 redirects that swallow auth codes before the new callbacks are working.
- [ ] Never attempt to set hosted GoTrue configuration through direct Postgres SQL.

Reference: https://supabase.com/docs/guides/auth/redirect-urls
