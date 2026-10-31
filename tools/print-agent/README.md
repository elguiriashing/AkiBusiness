# AkiBusiness unattended print agent

This outbound-only Node agent runs on the bar computer. Staff phones create server-held tickets; the agent claims its paired stations and spools them without a browser print dialog. It has automated transport/emulator tests, **not physical printer acceptance**. It does not issue fiscal invoices.

## Deployment order

Deploy the coordinated application and `20260925140340_unattended_printing.sql` before pairing. Apply the forward-only `20261031113907_printer_recovery_ack.sql` migration before installing this agent version. Install **both `agent.mjs` and `recovery.mjs` together**. Existing agents retain their `begin`/`spooled`/`uncertain` API contract. On an older server, the new recovery command fails closed and retains its journal; do not delete it to bypass that failure.

## Setup

1. Install Node 22 or later on the bar computer. For network printers, confirm the model accepts raw ESC/POS over a private LAN TCP port (commonly 9100). Windows/macOS/Linux can use this path. For USB printers on macOS/Linux, install and test a CUPS raw queue. Windows USB needs the system print dialog or a future supported adapter; it is not supported by this agent.
2. In AkiBusiness's PoS administrator printer panel, pair the computer and select only the stations it will print. Download the one-time configuration. The device token is a secret, expires after 90 days and can be revoked immediately. Neither an owner password nor a service-role key belongs in the configuration.
3. Save the file as `akihq-printer.local.json` outside any public web directory, readable only by the service account (for example `chmod 600` on Unix). The legacy filename is retained for compatibility. Edit each route to the actual private IPv4 address/port or installed CUPS queue. `example.json` contains placeholders, not credentials. Use 32/42/48 columns appropriate to the printer/roll. Enable cutting only on compatible models.
4. Start `node tools/print-agent/agent.mjs /protected/path/akihq-printer.local.json`. Keep the computer awake on the printer network. Install this command under the OS service manager if required; run one instance per configuration with a persistent writable configuration directory. No inbound local HTTP server or browser trust certificate is needed.
5. Send one test ticket per station and perform the acceptance checks below before business use. Pair only stations with configured routes. Never publish the downloaded configuration or include it in a support screenshot.

The agent uses printable ASCII with accent transliteration and `EUR`, without assuming a vendor code page. It strips printer control bytes from business/customer text. Unicode logos, exact accented glyphs, cash drawers and printer status protocols require a verified model-specific adapter. Preparation/payment output remains an operational ticket, not a fiscal invoice.

## Recovery

A durable journal is written before the server authorizes bytes to be sent. A completed spool is **not proof of paper output**. A crash or lost response may leave a local journal even when the server already recorded `spooled`. The system never automatically repeats that print.

Stop the agent and any service configured to restart it. Inspect the printer and AkiBusiness ticket queue and record which output exists. If a copy is necessary, request an explicitly marked COPY in AkiBusiness with a reason. After an unclean exit, remove the adjacent `.lock` **only after confirming no other agent is running and inspecting the pending job**. Then run:

```sh
node tools/print-agent/agent.mjs /protected/path/akihq-printer.local.json --acknowledge-uncertain TICKET_ID
```

Recovery takes the same exclusive lock as normal printing. It checks the pending ticket and printer pairing and, for new journals, the project origin. Legacy journals without an origin still require a matching device. It asks the server to acknowledge recovery before clearing local evidence: `claimed` becomes `uncertain`; `uncertain`, `spooled` and `confirmed` remain unchanged. The server records recovery once per device/ticket, so retrying after a lost reply does not duplicate the recovery audit event. No ticket is requeued and no bytes are sent.

An unavailable/older server, wrong pairing, permission revocation, malformed reply or changed journal retains the hold. Restore connectivity or have an administrator resolve the specific authorization/deployment issue; do not edit ticket IDs, pairing IDs or delete evidence. Repeat the same command after resolving the failure. Restart normal service only after successful acknowledgement. Keep configuration, journal and lock on persistent local storage. Do not run the same pairing on multiple computers or assume a network filesystem provides this local lock guarantee.

## Required physical acceptance

Record printer model/firmware, connection, OS, Node version, roll width and tester/date. Test kitchen/bar/receipt routing, long notes and quantities, Spanish transliteration, previous/current preparation revisions, copies and relocation tickets. Test two staff phones concurrently, paper-out, power loss, cable/Wi-Fi loss before and after output, restart, expired/revoked pairing, permission removal and lost acknowledgements. Confirm uncertain jobs do not print twice and recovery works after an already-recorded spool. Verify receipt margins/cutter and QR/fiscal documents separately when that integration is ready.

Automated tests use a TCP loopback **emulator**, real local files/processes and an isolated database fixture. They do not establish physical hardware compatibility, production deployment or legal certification.
