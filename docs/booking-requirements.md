# Booking requirements and implementation evidence

Prepared for Shafi Complex & Marquee, 5 September 2026. Scope: online booking persistence, customer payments and correct dashboard records. Sources: user's descriptions and nine supplied handwritten photos; official database and application-security documentation. This is operational software design, not tax or legal advice.

## Conclusions from the client notes
- Bookings carry customer, hall, time, guests, advance and balance. Packages differ by hall and are negotiable. Implement an agreed package snapshot and total rather than inventing fixed prices.
- Cash and bank transfers are accepted; cheques are not. Receipt transactions must be distinct from GM-issued operating cash and employee advances.
- Hall 1 and Hall 2 are visible in the notes; three managers are mentioned in conversation. Keep those two halls for now; do not invent a third hall or staffing assignments.
- Income comes from booking advances and bills. Cancelled bookings must retain their payment trail; refunds must not erase receipts.
- Director, GM and accountant access are described, but exact approval thresholds are not supplied. Current booking rollout uses existing administrator authentication. Individual role accounts are a separate unresolved prerequisite for staff rollout.
- Notes say multiple events need not have separately tracked expenses, while the user requests expense linkage. Support optional linkage in the expense phase; do not require it to create a booking.

## Required booking behavior
Create enquiry → optionally hold a slot with explicit expiry → confirm → complete after event time, or cancel with reason. Enquiries do not block availability. Active holds and confirmed events do. Retain completed event occupancy. Allow overnight intervals and use Pakistan time. Back-to-back times are allowed; a setup/cleanup buffer is not supplied and must be confirmed.

Persist customer phone, guest count, manager name, negotiated package/arrangements, total, status and unique reference. Reopening a record must show server data. Validate all inputs server-side. Protect updates with a version. A retry must not create another booking or payment. Block overpayments and refunds above the net amount received. Closed booking fields are immutable; refunds and remaining completed-event collections remain possible.

The dashboard and calendar read the same private records as the booking register. Never mix sample event counts with live financial totals. Cancelled balances are excluded from receivables; retained cash remains included in net receipts. Financial totals describe their scope explicitly.

## Technical findings and sources
1. PostgreSQL supports transaction-scoped advisory locks, which release with the transaction. Use a short shared mutation lock for one venue to serialize conflicting reservation/payment writes across serverless instances while allowing concurrent reads. [PostgreSQL — Explicit locking](https://www.postgresql.org/docs/current/explicit-locking.html), accessed 5 September 2026. High confidence. Exclusion constraints are a future stronger database-only alternative for a normalized reservation table: [PostgreSQL range types](https://www.postgresql.org/docs/15/rangetypes.html).
2. All statements in a node-postgres transaction must use the same client. Implement BEGIN/COMMIT/ROLLBACK on a checked-out client and release it in finally. [node-postgres — Transactions](https://node-postgres.com/features/transactions), accessed 5 September 2026. High confidence.
3. Authorization must be checked for each endpoint receiving a record identifier. Existing admin session checks protect list, record history, save and payment. No client-side role claim grants access. [OWASP API1:2023](https://owasp.org/API-Security/editions/2023/en/0xa1-broken-object-level-authorization/), accessed 5 September 2026. High confidence; individual hall permissions await named accounts.
4. Neon is available as a Vercel Postgres integration. CLI discovery confirmed the `free_v3` plan; user accepted marketplace terms before provisioning. Use server-only DATABASE_URL, never public Blob or browser database credentials. [Vercel integration CLI](https://vercel.com/docs/cli/integration), [Neon pricing](https://neon.com/pricing), accessed 5 September 2026. Plan limits can change; no paid plan was selected.

## Evidence gaps and boundaries
No confirmed deposit percentage, refund policy, tax rate, hall capacities, setup buffer or approval thresholds. They are not invented. Administrator records actual agreed amounts/refunds; no automatic charge or cancellation penalty is generated. Employee assignment remains a name field until employee identities exist. Shared administrator audit does not identify individual staff. Website enquiry intake and role permissions require additional workflow work; current website WhatsApp behavior must not be described as automatic confirmed reservations.

## Research method and stopping decision
Compared all supplied note categories with current code; searched official PostgreSQL transaction/overlap rules, Vercel/Neon provisioning and OWASP record authorization. Follow-up reads verified locking, same-client transaction behavior and endpoint authorization. Those sources resolve the present persistence/concurrency decisions. Further generic venue-software searches cannot determine this client's missing commercial policies, so research stops at those explicit gaps.

## Acceptance checks
Unauthenticated list/save rejected; cross-origin mutation rejected; invalid date/amount rejected; same-hall overlap rejected including concurrent requests; another hall allowed; expired holds released; stale update rejected; create/payment retries idempotent; refund limits enforced; data survives new connection; dashboard receives saved record; cancellation frees slot without removing payment history.
