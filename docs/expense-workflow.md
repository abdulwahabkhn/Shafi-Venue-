# Cash and expense milestone

The administrator opens Management → Cash & expenses.

1. Issue cash: record recipient, issuer (Director/GM name), date, amount and purpose.
2. Record an expense: select a cash issue or record a direct cash/bank payment. Choose the category from the client's supplied expense list and optionally link a booking.
3. Return cash: select the original issue and record unused money returned.
4. Review remaining cash per issue. Issuance and returns are transfers; only Expense entries contribute to the expense total.
5. Correct an erroneous record by voiding it with a reason, then creating the corrected entry. Original entries remain visible. An issue cannot be voided until its active settlements are voided.

The server enforces positive whole-PKR amounts, valid dates, existing booking references, matching cash holders, no settlement before issuance, no overspending, authentication, same-origin writes and idempotent retries. Concurrent settlements serialize in a transaction. Entries are stored privately in PostgreSQL, not in public website assets.

This is a shared-administrator milestone. Named accounts, verified recipient acknowledgement, role-scoped approvals, attachments, payroll advances and bank/cash-account reconciliation are subsequent phases. Entered issuer names are labels, not proof of who signed in. No payroll deduction or client damage charge is automatic.

Verification: `node scripts/test-bookings-cloud.mjs` runs in an isolated schema and removes only that schema. `node scripts/migrate-bookings.mjs` applies additive booking/ledger tables to the configured production database using the direct connection. Credentials remain in ignored `.cms-local` files.
