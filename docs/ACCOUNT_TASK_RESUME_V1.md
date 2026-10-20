# Account task resume contract v1

Implemented, tested locally; merge and production acceptance remain pending.

AkiPasa is the sole completion authority. The local account-resume endpoint first
requires identity and reads the caller-only onboarding state. Pending and underage
sessions return to completion. Complete and grandfathered accounts may resume an
allowlisted product/relative task at its fixed canonical origin. EN/ES is retained
using the suite-navigation format, including `locale` for static AkiBusiness.
No token, PKCE code, email, auth cookie or arbitrary external URL crosses domains.
Each destination still requires its host-local session and existing tenant checks.

Only explicit account/business/booking/discovery task paths and bounded task query
keys survive. Encoded controls, fragments, traversal, scheme-relative URLs,
unknown products, auth/onboarding loops and nested redirects are rejected or
replaced with the product's account landing. Completion envelopes remain local
`next` values through password and Google/email callbacks; they grant no access.

The existing readiness switches and central cohort remain disabled. Ship all five
consumers and central endpoint before enabling enrollment. Existing users, paid
features, data and identity are preserved. Rollback before enrollment is source
only; after enrollment retain compatible guards and stop new enrollment first.

Verification includes the five-product/both-language URL matrix, hostile paths,
duplicate/secret query removal, email/OAuth completion-envelope roundtrip, direct
pending/underage resume denial and complete/exempt resume. Real provider sessions
and five-domain deployment acceptance remain release requirements.

## 2026-10-20 | Validated referral task completion

Account completion preserves a single public referral code matching the existing
uppercase alphanumeric 8–24 character navigation bound. The canonical public
`/{locale}/referrals?ref=CODE` task returns to AkiPasa's explicit confirmation page;
other allowed product tasks retain their validated code and EN/ES choice through
the same fixed-origin resume envelope. Duplicate, URL-shaped, lowercase and
out-of-range codes are discarded. Direct unprefixed AkiPasa referral completion
uses this same sanitizer rather than falling back to Account.

This changes navigation only: pending/underage restrictions, legal and tracking
choices, first-attribution immutability and the explicit confirmation action remain
authoritative. No automatic attribution, referral cookie, identity transfer, schema,
financial incentive or production write is introduced. Shared contract copies and
role-controller regressions cover all five products and both languages. Hosted CI
and exact-source release checks remain required; unit fixtures do not establish
authenticated production browser acceptance.

Static navigation asset2 and eligibility asset3 share the existing referral sanitizer. Source cache140/paid141 invalidates prior helpers. Existing read-only reader activation and all backend financial/delivery flags remain unchanged.
