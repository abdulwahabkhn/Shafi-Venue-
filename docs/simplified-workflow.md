# Revised client workflow

This replaces the earlier Hall Manager, cash-handover, rental and approval-oriented public management workflow.

- GM: manages bookings, employee records, attendance, manual payments/advances, inventory, expenses and staff accounts.
- Director: monitors management records without mutation permissions.
- Accountant: daily expense-sheet access only, including add/remove. No bookings, inventory, employees, payroll, staff accounts or full financial reports.
- Hall Manager authentication and account creation are disabled. Legacy data is retained; no notifications to Hall Managers are sent.

## Registers

Daily expenses have name, purpose, whole-number quantity, whole-PKR unit price and cash/bank method. The server assigns today's Pakistan date. Quantity times price is calculated server-side. Removing a row keeps its history but excludes it from totals. Daily cash spent is not represented as cash in hand. Monthly expenses use the same active expense rows; payroll remains separately reported to avoid duplicate expense entry.

Bookings retain overlap/concurrency protection, customer records, payment/refund history and existing booking data. New status choices are Hold, Confirmed and Completed. Legacy enquiry/cancellation records are retained. The dashboard reports receipts minus refunds by payment month, not unpaid contract totals or profit. The current month-to-previous comparison uses month-to-date versus the entire previous month, explicitly labelled. With a zero prior baseline no misleading percentage is shown.

GM enters the employee list. Four Leave-marked days per calendar month are allowed (user-confirmed). Above-allowance employees appear on the dashboard and leave counts appear in the salary register. Absent/Half day are not silently treated as Leave. Salary is never automatically changed. The GM can explicitly select deduction days and a daily rate, apply the calculated deduction to the paid amount, and record the payment. Zero rate/days means no deduction. Advances and repayments remain manual records with outstanding-balance checks. All historical payment records are retained unless part of the user's explicit initial reset.

Inventory is a list created by the GM. Damage requires a booking and available quantity; it reduces usable stock. Replacement resolves a specific damage entry and restores usable stock. Writing off damage resolves the damage without increasing usable stock. Remove quantity reduces usable stock. Remove item archives the list entry and retains its history; unresolved damage, missing or issued quantities prevent archival. Adding quantity records additional stock, not a financial expense. Any purchase spending belongs in the expense sheet.

## Reset check

The user requested all employee and inventory data cleared. A production count found zero employee records, attendance, employee payments, inventory items/movements and rental receipts/events. No deletion was necessary. One existing booking was preserved; the expense table was also empty. Only Director, GM and Accountant accounts existed. No real sample people or quantities were seeded.

## Verification

`node scripts/test-simple-registers.mjs` covers the revised workflow in a disposable schema: 39 checks passed, including permissions, daily totals, removal, receipt-month totals, overlapping bookings, inventory retry/concurrency, damage/replacement/write-off and manual leave deductions/advances. The schema was removed after tests.

Historical test suites encode former Director-write / Accountant-payroll permissions and are not the acceptance source for this revised access model. Their prior pass counts must not be claimed as a current regression result. The public CMS is separate and unchanged.

The 7 September browser limitation was superseded by the 8 September acceptance pass below. The web portal is not a packaged desktop/offline application.

## 8 September continuation and acceptance

Found and fixed a frontend transport defect: `staffApi` generated `?resource=resource=...`, so UI requests missed the intended handlers despite earlier direct-API checks passing. The shared helper now generates one resource parameter, retains date/month filters, and reports unavailable services clearly. `scripts/test-staff-transport.mjs` exercises twelve resource names, query parameters, POST payloads, authentication errors and non-JSON service errors without network writes. The disposable integration suite now has 46 passing checks, including actual frontend-helper calls into authentication and saved-register handlers.

Additional fixes: Director can select historical attendance dates while mutation fields remain disabled; typed date/month changes update the displayed records immediately; expense loading ignores superseded requests; failed dashboard/expense loads do not display stale figures; daily reports show expense item, purpose, quantity and price; inventory replacement options show remaining damage; invalid stock actions are disabled; refresh controls recover inventory/report loading; salary month is fixed while a paid-record form is open; retired manager assignment is removed from bookings; current status filters are Hold/Confirmed/Completed with historical filters only when needed; login buttons receive the operations colour tokens and a normal signed-out visit does not show an error.

Browser acceptance used disposable accounts and a separate `ui_test_` schema:

- GM signed in and created a booking for 20 September, 18:00–22:00, with total PKR 10,000. Recorded PKR 3,000 received; balance became PKR 7,000.
- Reloading preserved the booking and payment. The dashboard showed one booking and PKR 3,000 net receipts; the calendar displayed the saved event.
- Entered five tissue boxes at PKR 200. Daily expenses and cash spent showed PKR 1,000.
- Created 20 chairs; two damaged against the booking resulted in 18 usable/two damaged. Replacing one resulted in 19 usable/one damaged.
- Created an employee with PKR 30,000 salary; recorded PKR 1,000 advance and marked the full salary paid. Both records appeared separately in payment history.
- Accountant sign-in exposed only the expense sheet and its add/remove actions.
- Director saw the saved dashboard, detailed daily report and employee payment history without mutation actions. Selecting a previous attendance date updated the heading after the date-input fix.
- Login checked visually on desktop/320px. The expense page had no document-level horizontal overflow at 320, 768 and 1280px. This is not a complete screenshot audit of every form.

No live business records were added by these tests. Outstanding scope includes packaged desktop/offline operation, production-volume performance testing, restore rehearsal and client acceptance with real operating data. Historical requirements-review notes about Hall Manager/cash-custody features predate the simplified client brief and must not be treated as the current roadmap.
