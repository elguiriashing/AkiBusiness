# AkiBusiness PoS recovery and ownership

The independent AkiBusiness candidate recovers the complete reviewed historical
PoS stack from `elguiriashing/akihq` without making that repository a runtime or
build dependency.

## Immutable upstream provenance

- Service board and rapid lookup: `akihq#39`, head `6523d3fce17dbb79181eeb22516fa22b3cae263e`.
- Kitchen/bar display: `akihq#40`, head `9750006137770f72135f3690909bdb406d83b1c4`.
- Course holds and firing: `akihq#41`, head `f64eadb22b9a82ae09b0bfe0e10f7e90ee1a3c97`.
- Inventory-backed variants: `akihq#43`, head `6c88a97c3bd118453c3521919fce3f5a6dbb3356`.
- Historical operations baseline: `release/akibusiness-operations-brand-v1`.

The final upstream tree diff was applied in stack order to the self-owned
AkiBusiness migration candidate. The AkiBusiness-only CI, source stamping,
Cloudflare deep-link `<base href="/">` fix and production cutover gates were
retained. The historical repository remains unchanged until this replacement is
verified and its source PRs can be closed by documented supersession.

## Database boundary

The recovered schema additions are additive references:

1. `20261018152924_pos_kitchen_display.sql`
2. `20261018184327_pos_course_control.sql`

They must follow the existing hospitality, print-destination and trading-ledger
chain. They are not automatically applied from this repository. Before any shared
database change, compare migration history, inspect the live function definitions,
run security/performance advisors and test staff/manager/other-tenant access on a
representative branch or staging schema. Do not reset, seed or reapply historical
migrations against the shared project.

## Release boundary

Passing source and browser automation does not establish hardware or fiscal
acceptance. Production still requires authenticated staff and manager devices,
58/80 mm printers, kitchen/bar routing, network-loss recovery, shift/cash checks,
real multi-location permissions, exact source evidence and a recorded Pages
rollback. External tender records remain records only; no card capture is claimed.
No Spanish SIF/VERI*FACTU compliance claim is made.
