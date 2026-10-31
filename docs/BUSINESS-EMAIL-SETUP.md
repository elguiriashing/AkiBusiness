# Business-owned email: deployment and acceptance

Status: implemented locally, provider acceptance pending. The owner selected **each business connects its own email provider**. The platform mailbox and its existing AkiPasa aliases are unchanged.

## Configuration

Use the existing gateway project/config. The additive `BUSINESS_MAIL` binding points to the SQLite-backed `BusinessMailbox` class. Mailbox messages are read from the provider on request; they are not copied to the all-company KV inbox or CRM snapshots.

Set these Worker secrets using the deployment secret manager:

- `BUSINESS_MAIL_KEY`: a cryptographically random 32-byte key encoded in base64. Keep a recoverable, access-controlled copy; changing it without re-encrypting existing accounts requires reconnection.
- `BUSINESS_GOOGLE_CLIENT_ID`, `BUSINESS_GOOGLE_CLIENT_SECRET`: a web OAuth client authorized for Gmail read and send scopes.
- `BUSINESS_MICROSOFT_CLIENT_ID`, `BUSINESS_MICROSOFT_CLIENT_SECRET`: a confidential Microsoft app with delegated `User.Read`, `Mail.Read`, `Mail.Send` and `offline_access`.

Register the exact redirect URI `https://akihq-integration-gateway.alexashing1.workers.dev/api/business-mail/callback` with each provider, or the verified gateway's equivalent if its host has changed. The callback returns only to `https://akibusiness.com/login`; the authenticated browser completes the exchange. State is single use, expires after ten minutes and is bound to the initiating actor and workspace; PKCE binds the authorization code. No refresh token reaches the browser.

The administrator explicitly chooses a **dedicated business mailbox**, shared with members who have Inbox access. Marketing-only access can configure a sender and send approved campaigns but cannot read or reply to mailbox messages. Staff replies require Inbox and write access. Connecting an email account never changes CRM membership or billing.

## Marketing gate

Leave `BUSINESS_MARKETING_ENABLED` unset/false initially. Before enabling:

1. Verify the existing privacy RPCs and their access checks on the correct production target. Configure controller name/address, privacy contact/policy, and the exact approved sender identity.
2. Configure `PRIVACY_PUBLIC_ORIGIN` to the HTTPS gateway origin serving `/api/privacy/unsubscribe`. Test a real subscription withdrawal and prove a later send is rejected.
3. Record recipient consent with provenance, evidence and notice version. Merely appearing in Contacts is never sufficient.
4. Verify the business provider's applicable sending limits and permissions, including Google app verification / Microsoft organization consent where required. The implementation sends one explicitly reviewed email at a time, not background bulk campaigns.
5. Use an explicitly approved test recipient for end-to-end acceptance. This audit sent no real emails.

The transport records provider **acceptance**, not inbox delivery/open/click tracking. Gmail/Microsoft delivery-event and bounce ingestion is not implemented here; do not sell this as a full email-marketing analytics platform. Provider-specific limits and consent approval are external release dependencies.

## Recovery, disconnect and ownership

Every outbound request has a stable reference. Its durable marker is written before provider transport. Repeated requests cannot resend the same reference; mismatched payloads are rejected. A timeout/crash stays unknown and requires checking the provider's Sent folder. A failed connection or send keeps the browser draft. The UI never labels an uncertain send as delivered.

Disconnect deletes the stored encrypted account and pending authorization. It does not delete provider mail or revoke unrelated grants. The owner should also revoke AkiBusiness in the provider's security settings when permanently retiring a connection. On business closure or owner departure, disconnect the mailbox as part of the existing human-operated cleanup process. Send-reference records contain digest/status/timestamp, not message content; they must not be discarded casually because they prevent duplicate sends.

## Release and rollback

Deploy the gateway only after approval, verify the new binding, then ship the frontend and verify `/release-source.json`. Test connect/cancel/reconnect, read/reply, revoked token, read-only role, cross-workspace isolation, duplicate/unknown sends, mobile navigation and Marketing-only restrictions with an authorized test business.

For rollback, disable `BUSINESS_MARKETING_ENABLED`, remove provider configuration if mailbox operations must be suspended, and revert the frontend. Keep the Durable Object class export/binding and storage migration history available; do not delete existing account/send-reference data just to restore an older Worker bundle. Provider authorization can be revoked independently. No live rollback or configuration change was performed during this audit.

## Primary references consulted

- [Google server-side OAuth](https://developers.google.com/identity/protocols/oauth2/web-server)
- [Gmail message sending](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/send)
- [Microsoft Graph sendMail](https://learn.microsoft.com/en-us/graph/api/user-sendmail?view=graph-rest-1.0)
- [Cloudflare Durable Object state](https://developers.cloudflare.com/durable-objects/api/state/)
- [Workers best practices](https://developers.cloudflare.com/workers/best-practices/workers-best-practices/)
