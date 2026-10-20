# AkiBusiness mobile handoff — 20 October 2026

The useful, product-correct preparation from historical `akihq#37` is now owned
by `AkiBusiness`. The receiving implementation preserves the metadata gate,
bilingual listing draft, proposed identifiers and external release checklist.
It also fixes the historical association generator so its reviewed Apple paths
are emitted instead of a catch-all `*` path.

No AkiBusiness native project, signed AAB, IPA, store record, signing secret or
submission exists. The source PR in AkiHQ can be closed as superseded only after
this receiving change is merged; product release issue #27 must remain open for
the genuine native/store work.

The source/live mapping gate is verified against Cloudflare deployment
`71c045c5-b1d3-45f1-b513-19fc5fca5bba` and commit
`cdc763997b0a78b006d5744b495be161d28800b6`. The other eleven gates remain
closed pending native implementation and external acceptance.

Rollback is a source revert. Production web assets, Supabase, Stripe and customer
data are unchanged.
