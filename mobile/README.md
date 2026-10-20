# AkiBusiness mobile store preparation

Status: preparation only. This directory does not contain or claim a shippable
Android App Bundle or iOS archive.

The historical preparation lived in `elguiriashing/akihq#37`. It was transferred
here because the paid PoS and operations product is owned by this repository.
Production currently serves `AkiBusiness/main` through Cloudflare Pages project
`akibusiness-selfowned-staging`; do not package the free AkiHQ application.

Before either store submission:

1. Finalise the Android application ID and iOS bundle ID before creating records.
2. Choose and review the native architecture. A thin website shell is not assumed
   to satisfy store review or the PoS hardware/offline requirements.
3. Keep signing keys, certificates, provisioning profiles, reviewer passwords and
   store API credentials outside Git.
4. Test sign-in, Google OAuth, password recovery, logout, deep links, EN/ES,
   accessibility, tablet landscape, offline recovery, printer/KDS handoff and
   subscription rules on signed physical-device builds.
5. Generate domain association files only with the final Play App Signing
   fingerprint and Apple team ID. Catch-all Universal Links are rejected.
6. Complete in-app and public account-deletion paths, privacy/data-safety answers,
   screenshots from real builds, age/content declarations and reviewer access.
7. Set a gate true only with linked evidence. `--ship` must stay red until every
   gate passes and status is `READY_FOR_INTERNAL_REVIEW`.

Run `node mobile/validate-store-release.mjs` for metadata validation. The strict
`--ship` mode is deliberately failing while external and native acceptance remain.

