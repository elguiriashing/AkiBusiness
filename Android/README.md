# AkiBusiness Android Play preparation

Adapted from elguiriashing/akihq Android commit 679c99, retaining navigation tests.
Uses existing AkiBusiness artwork from assets/icons/maskable-512.png.
Hardware/offline PoS, Google OAuth and signed physical-device acceptance remain
unverified. Store-release gates stay false; a build does not establish Play billing compliance.

Package ID: `com.akipasa.business`. Launch URL: https://akibusiness.com/. Native WebView uses external browser for Google OAuth and payment flows. This is an unsigned CI build, not a Play Store-ready signed artifact.

Pending: verified HTTPS Digital Asset Links file for Play's **app-signing** SHA-256 fingerprint, domain OAuth callback return, store listing/privacy/data safety, real-device testing, approved branded icon and separate private upload keystore. Do not upload keystores or passwords to GitHub; do not merge before CI and functional checks pass.

