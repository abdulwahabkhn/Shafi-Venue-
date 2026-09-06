# Shafi operations development

## Inventory increment — 6 September 2026

Implemented the next unfinished phase as a physical-stock foundation: catalogue with unique SKU/home location, Director-only opening counts, purchase receipts with supplier references, booking/employee-linked issues, partial usable returns, damage and loss incidents, repair/recovery and Director-only write-offs. Balances are derived from immutable movement records; concurrent issues and source settlements are serialized. Hall managers cannot issue against another hall's booking or view its movement history. Accountant inventory access is read-only. No sample stock quantities are seeded.

The Inventory navigation now opens saved stock records instead of the demonstration. This is not yet the entire inventory phase: future reservations, rental supplier agreements/returns, inter-hall transfers, catalogue editing/count corrections and a purchase-bill linking interface are still pending. Purchase payments and bill attachments remain in Cash & expenses. No automatic customer damage charge or employee deduction occurs.

Validation: 23 inventory checks passed, plus all 73 existing booking/employee/expense checks. The production build passes. Browser QA against an isolated schema created an item and recorded 100 opening units successfully; no test stock was added to the production records.

Remaining development order: (1) complete inventory reservations/rentals/transfers, (2) cash acknowledgement and daily reconciliation, (3) enquiry intake and supplier balances, (4) history/report refinements plus backup/restore drill, (5) desktop/offline packaging after confirming device and offline rules. Existing employee, booking and expense modules are retained. Automated inventory checks: `node scripts/test-inventory-cloud.mjs` in a disposable isolated schema; migration included in `scripts/migrate-bookings.mjs`.

## Employee and expense milestone — 6 September 2026

This section supersedes earlier pending-module statements below. Implemented: named Director, GM, Accountant and hall-scoped manager sessions; Director account administration and session revocation; employee sectors, recruitment/exit records, attendance and manual salary/wage/advance records; cash recipient account linkage; private bill uploads (JPG/PNG/PDF, 2 MB each, five per entry); accountant verification, Director/GM approval and Director-only voids; daily cash/bank activity report with print/save-PDF.

Payroll decision confirmed by the user: employees are paid outside the application. GM or Accountant presses **Mark paid** to record the actual amount, date and method. No transfer, automatic attendance deduction, overtime calculation or automatic advance deduction occurs. One active salary record per employee/month; mistaken entries are voided with history retained. Changes to the agreed rate are audited; the monthly register displays the current agreed rate, not a calculated historical payroll entitlement. Enter the actual paid amount and explain differences.

Access setup: the existing owner CMS login can open `/management` and create named accounts in **Staff accounts**. Do not share the owner password with restricted staff. Staff login is `/management`. Login accounts are separate from employee records. Hall 1 and Hall 2 are configured; multiple managers can be assigned to either hall. Account passwords are hashed; private bills stay in PostgreSQL, never the public website image store.

Verification: 33 booking/cash checks and 40 staff/employee/review/file/report checks pass in disposable isolated database schemas. Run `node scripts/test-bookings-cloud.mjs` and `node scripts/test-staff-cloud.mjs`. Both require the ignored private connection configuration and remove their own schemas. `scripts/dev-staff-test.mjs` creates a separate browser-QA schema and localhost server; press Enter to stop and remove that schema. The QA password in this script is disposable and never a production credential.

Remaining before full ERP completion: inventory/rentals/damage, cash recipient acknowledgements, formal end-of-day closing and reconciliation, salary-history presentation across rehire periods, automated report delivery, backup/restore drill, website enquiry intake, supplier balances and desktop/offline packaging. Daily PDF uses the browser Print → Save as PDF flow, not scheduled delivery. No statutory payroll rules are assumed. The inventory screen is still a labelled preview. No real staff identities are seeded.

Security-best-practices was installed from OpenAI's curated skills and used to guide server permissions, HttpOnly sessions and private file handling. Installation does not guarantee defect-free software; client acceptance testing remains required.

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
