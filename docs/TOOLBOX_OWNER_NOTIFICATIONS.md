# Owner toolbox notifications and entitlement compatibility

Status: implemented and locally tested; production notification activation remains gated.

Read-only inspection of the shared Supabase schema on 20 October 2026 found no general public notifications table. AkiBusiness already has a notification bell combining mail, support and workspace activity. This change extends that bell using a private durable recipient inbox rather than misusing customer mail or exposing the service outbox.

Each new toolbox history event captures the staff impact from active location membership, role tool grants and individual restrictions. Delivery inserts one inbox row per active owner containing the new active tools, removed tools and affected staff, and marks the outbox delivered in the same transaction. Unique history/recipient keys prevent duplicates. Failures retain the outbox, increment attempts and retry through the existing gateway cron. SKIP LOCKED and bounded batches support concurrent workers. No active owner is a retryable failure, never delivery to staff. Historical rows without a staff snapshot explicitly show unknown impact.

The client fetches at most 30 owner messages, refreshes at most every 30 seconds, and discards results after a user or location switch. Existing bell read markers and settings navigation are reused. EN/ES messages list active tools and affected staff. Content remains escaped plain text. Notification controls support keyboard activation and the dropdown fits phone and tablet widths.

## Activation and access

All three layers default off: database `toolbox_notification_settings.enabled`, gateway `AKIBUSINESS_TOOLBOX_NOTIFICATIONS_ENABLED`, and browser `TOOLBOX_NOTIFICATIONS_ENABLED`. A reviewed service migration enables the private setting after staging acceptance; it is never browser-editable. `crm_toolbox_deliver_notifications(integer)` is service-only. Owner reads use the caller-only RPC, current active owner membership and recipient identity. Removed owners, staff and other locations cannot read inbox rows. Private tables have RLS with no browser grants. No email, analytics, payment or external provider call is added.

The notification migration is additive and does not activate delivery. Deploy the runtime off, apply the reviewed migration, verify a synthetic scoped owner workflow, then separately approve flags. Existing outbox rows recover on the bounded cron processor when enabled. Monitor failures/attempts through service-only operational queries without logging customer details.

## Historical entitlement source repair

Hosted rollback-only acceptance discovered that the existing `crm_workspace_entitlements_source_check` accepts `plan/trial/purchase/manual/platform`, while the original toolbox sync inserted `toolbox`. The canonical source now maps Stripe to `purchase`, trials to `trial`, and promotional/admin/grandfathered grants to `manual`. Existing entitlement source values are retained on conflict.

`20261020181726_toolbox_entitlement_source_compatibility.sql` is a forward-only CREATE OR REPLACE repair for the already-applied function, with explicit service-only execution grants. It creates or drops no tables and changes no live subscriptions or entitlements by itself. The canonical source is synchronized for future clean installations, including the explicit four-table ACL correction. Never replay the original create-table migration on an existing database.

The release owner applied the reviewed forward repair (SHA256 d3127457ef5bb01e0aa6d28d47ba85a6b4a727c4cb0b6190f68b161ca33e7d46) to the shared database. Hosted rollback-only owner acceptance then verified Básico CRM allowed, inventory/PoS denied, direct inventory reads empty and browser rotation execution denied. Rollback left zero toolbox enrollments; preparation bindings and existing subscriptions remained unchanged. The original executed canonical hash remains b6b92500771ac1796a0056df53cd720ce6dd42fb5515b523432664b3930931e6 plus the recorded forward repair; no table creation was replayed.

## Evidence and rollback

Focused database tests reproduce the old CHECK failure (23514), apply the forward repair twice, verify all five source mappings and service-only execution, and retain existing records. Notification tests execute default-off behavior, duplicate/retry delivery, staff and location isolation, revoked membership and current active selection. Browser acceptance runs 16 actual bell-function/CSS fixture combinations (EN/ES, light/dark, phone/tablet/desktop), including keyboard activation, safe text and scope switching. Fixtures do not claim live notification acceptance.

Offline caches advance source136/paid137; paid app asset47 includes the new bell helper. Rollback runtime/UI flags first, retain inbox/outbox/history data, and redeploy a previously accepted artifact using a newer offline cache stamp. Do not restore the incompatible entitlement function or delete customer data.

Additional hosted rollback-only acceptance verified active staff granted CRM can use CRM while inventory remains denied; an empty individual limit revokes CRM immediately, restoring it restores access, and setting membership to the real `suspended` state revokes access. Rollback retained zero toolbox enrollments and the original 12 active memberships. Fixtures now include the real active/suspended membership CHECK. Initial-selection source audit confirmed account checkout validates exactly 4/8 choices (Pro all12), migration initial selection is owner-confirmed and saved for renewal, and lifecycle rejects missing choices rather than assigning invented defaults.

## Retry queue fairness

Forward migration `20261020183515_toolbox_notification_retry_backoff.sql` adds a due timestamp and a partial due-row index. Failed claims wait 30 seconds, then double up to one hour; successful delivery and the unique history/recipient key remain atomic. Claims exclude future retries and order due timestamps before history IDs, so invalid owners cannot monopolise the first batch. Existing pending rows default to immediately due at migration time; new entries use their creation time so due retries also retain fair ordering against incoming work. The service-only grant, owner isolation and all disabled gates are retained. The 101 invalid-owner plus one valid-owner test proves the valid row delivers in the second bounded claim; it also verifies no immediate retry, the one-hour cap and recovery after the owner returns.

Recipient-profile deletion cascades only to the private inbox delivery copies, preserving rotation history and outbox audit. This FK is corrected in the initial notification DDL while that migration remains unapplied; the executed deletion test verifies a profile can be removed without deleting audit records.
