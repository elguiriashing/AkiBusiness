# Read-only Business UI activation

This follow-up to merged PR35 enables only the shipped browser flags `OPERATIONAL_ANALYTICS_ENABLED` and `TOOLBOX_NOTIFICATIONS_ENABLED`. They select the already-tested scoped report renderer and owner-inbox reader. They do not grant a tool, enroll a toolbox, change billing, enable onboarding enforcement, deliver messages or alter gateway runtime flags. Configuration examples remain opt-in defaults.

## Acceptance evidence

The release owner applied the operational analytics SQL and verified an actual owner's scoped report and foreign-scope denial without inventing profitability. Existing database and browser fixtures cover unavailable data, per-tool visibility, scope changes, exports, languages and viewports.

An additional hosted read-only transaction selected a real active owner without exposing their identity. The owner inbox RPC returned an array with zero messages. Browser delivery execution and private inbox table SELECT were denied; a foreign workspace raised 42501. The transaction rolled back and made no production data changes. These are backend role checks, not a claim of authenticated private-browser acceptance. No customer notification was generated for acceptance.

The activation tests execute the real production configuration and actual report controller. They verify strict boolean flags, explicit false overrides, the scoped read RPC, no billing readiness flags and disabled-controller zero network calls. Existing rendering, billing and authorization tests remain intact. The static config URL advances source44/paid45 and service-worker cache source138/paid139 to avoid stale disabled defaults.

## Gateway and rollout dependencies

Toolbox selection, immediate staff delegation, operational reports and owner notification reads call Supabase RPCs directly. They do not call the older integration gateway. Central AkiPasa verified billing recovery applies subscription state and invokes monthly rotation for its Stripe bindings. Existing legacy locations with no toolbox row retain their access and see the localized migration-pending explanation; UI flags cannot enroll them or expose the new selection/delegation forms early.

Notification delivery is independent: the private database setting enables immediate event-trigger delivery; a scheduled bounded retry processor must also be available for reliable recovery. The old gateway lacks the new retry handler. Deploy the reviewed gateway bundle or add a separately reviewed central cron RPC call before claiming reliable notification delivery is live. Merely enabling the reader produces an empty bell when no authorized messages exist. Non-Stripe promotional/admin grant rotations also need a verified scheduler before granting such enrollments. None is created by this change.

Deploy only after exact-head CI and the reviewed static build. Verify the production config asset exposes the two true booleans, fresh version/cache URLs, and the expected release source. An authenticated owner should then confirm their report and inbox in the real browser; ordinary login/sign-in redirects do not prove a private journey. Do not activate checkout, billing, tax or onboarding flags as part of this rollout.

Rollback uses a reviewed static configuration deployment setting these booleans false with a newer config/cache stamp. Retain database migrations, historical records and existing entitlements. No database or financial rollback is required.
