# Shafi operations development

## Current milestone — 5 September 2026

Cash and expense foundation is now implemented: immutable ledger entries for cash issuance, expenses and cash returns; optional booking references; balances per cash issue; retries protected from duplication; concurrent spending checks; void-with-reason preserving original records. Thirty-three combined database checks passed. Live booking API smoke test confirmed create, reread, payment and idempotent retry, and the browser dashboard displayed the correct balance.

Next implementation order: named Director/GM/accountant/hall-manager accounts and permissions, then inventory issues/returns/damage and rentals, followed by employee attendance/salary/advance records. The current shared-admin ledger records issuer/recipient names; it does not establish individual identity or approvals. Bill attachments and daily PDF report formatting are still pending. Existing previews remain labelled.

Private Neon PostgreSQL storage is provisioned for production. Booking creation/editing, customer details, negotiated packages, two halls, overnight times, expiring holds, overlap protection, payment/refund ledger, cancellation reasons, optimistic version checks, audit history, printing, and saved-record dashboard/calendar are implemented. Twenty-five checks passed against an isolated cloud schema, removed afterward. The website bundle lazy-loads the operations workspace.

This supersedes the local-only limitations below. The legacy SQLite files are retained, not migrated or deleted. Development now uses the same API with a separately configured DATABASE_URL. Never point casual local testing at production. Production migrations: scripts/migrate-bookings.mjs; isolated cloud checks: scripts/test-bookings-cloud.mjs.

Still pending: named staff accounts and hall-scoped permissions; backup/restore drill; website enquiry intake (currently WhatsApp); approval/discount policies; inventory, employee and cash-expense integration. Those other workspaces are previews, not live ledgers. Do not distribute the shared administrator password to restricted staff.

See docs/booking-requirements.md for source requirements, unresolved client decisions and acceptance criteria.

## Historical phase plan (retained for context)

## Phase 1 — Local booking foundation (started)
Deliverable: authenticated local booking register, customer details, Hall 1/2, date/time, event type, guest count, negotiated total, manager name, notes, status, payment ledger, balance and audit entries.

Implemented: SQLite persistence outside public assets; transactional overlap checks for holds and confirmed bookings; version checks for concurrent edits; cash/bank payments with idempotency keys; overpayment prevention; readable booking UI. Existing shared CMS administrator authentication is temporary. Manager name is an assignment field, not a permission grant. No real records are seeded.

Limitations: same-day events; holds have no automatic expiry yet; no refunds/payment reversals or cancellation settlement; no individual identities, approval workflow or production database. Complete these before live operational use. Existing overview/calendar/stock/employee/expense screens remain demonstrations and do not reflect these records.

## Phase 2 — Private production storage and accounts
Choose managed relational database and identity provider; migrations, backups and restore checks; Director/GM/accountant/hall-scoped accounts; server-enforced permissions and individual audit identity; configurable halls. Confirm two halls versus three hall managers. Never store personal/financial operations records in the public website Blob store. Deploy only after these controls pass tests.

## Phase 3 — Booking workflow completion
Live calendar, hold expiry, negotiated package snapshots, payment receipts, controlled refunds/reversals, cancellation and closure rules, customer balances, website enquiry intake with duplicate/spam controls. Website submissions are enquiries, not reservations. Preserve cash and bank transfer methods; no cheque option.

## Phase 4 — Inventory and rentals
Opening-season counts, incoming purchases and bills, hall/store locations, date-aware reservations, issues, returns, damage/loss quarantine and approved write-offs, rental supplier returns and gate pass records. Damage is not automatically charged to a client. Keep gate passes compatible with the client's manual process.

## Phase 5 — Employees
Departments and job titles from supplied lists; recruitment, exit and rehire history; attendance; salary effective dates; advances and repayments; permanent versus rental staff; event assignments. Confirm payroll/overtime rules. Archive former employees without erasing their history.

## Phase 6 — Cash, expenses and approvals
Director/GM cash issuance, recipient acknowledgements, transfers and return of unused cash; manager expense entry, attachments, accountant verification, approvals and daily reconciliation. Cash issuance is a transfer, not an expense. Employee salary advances are distinct from operational cash advances. Event links are optional: source notes say separate per-event expense tracking is not required, while the user's explanation requests linkage; confirm this before requiring it. Do not impose a fixed daily budget.

## Phase 7 — Reports and closeout
Daily income/expense PDF; cash held by each person; receivables, supplier balances, stock loss, attendance/payroll, event cost reports with explicit shared-cost allocation. Director-only archive/reversal, immutable history, audit export and restore drill.

## Phase 8 — Desktop and web delivery
Shared API for browser and desktop client; choose packaging after Windows/printing/offline requirements are confirmed. Offline payment/stock writes require conflict and duplicate handling and are not assumed. Lazy-load workspaces, paginate/search on the server, index date/hall queries, optimize attachments and test slower networks.

## Next milestone acceptance
Create and reopen a booking after restart; prevent overlapping confirmed hall slots; record a payment once even after retry; reject unauthenticated writes and stale edits; reconcile balance from payments. Then establish private production storage/accounts before inviting hall managers.

## Local use
Run `npm run dev`, sign in through `/admin/login` using this machine's configured CMS password, then open `/management` → Bookings. SQLite files live in ignored `.cms-local`. Local records do not sync to Vercel. The website/CMS remains a separate existing surface.
