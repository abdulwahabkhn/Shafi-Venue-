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

Browser verification remains limited: the automation could not retain typed values even in the unmodified username field. No complete browser booking-save pass is claimed. Client browser acceptance is still required. The web portal is not a packaged desktop/offline application.
