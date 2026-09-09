# Shafi desktop release handoff

Updated: 9 September 2026. This file preserves implementation status independently of conversation visibility.

## User decisions

- Keep the current staff passwords. Do not rotate them without permission.
- Keep the web portal operational alongside the Windows desktop app.
- Desktop uses the same live accounts and records and requires internet.
- GM has full control, Director monitors, Accountant uses the expense sheet.
- Three physical halls; all seven single/pair/all-hall combinations reserve their members atomically.
- User will install and test after preparation. Do not install into their normal Windows environment on their behalf.

## Completed

- Live web deployment from commit `06fc157`: https://shafi-venue.vercel.app/management.
- All seven hall selections verified in the live GM booking form.
- 62 isolated database workflow checks, 18 CMS checks, hall-combination tests and production build passed.
- Same-origin script policy deployed and verified; CMS password marker is now keyed. Existing passwords unchanged.
- Windows x64 NSIS setup produced in `desktop/release`; initial packaged launch check passed.
- Follow-up fixes: ignore overlapping startup/reload attempts, safely handle window closure during failed loading, distinguish a second running instance from a successful smoke test.
- Seven desktop tests pass: security preferences, permission denial, navigation/redirect rejection, download filtering, offline-close recovery, window-close race and smoke exit codes.
- Follow-up candidate rebuilt; packaged launch check exited successfully with code 0.
- Final package audit: archive contains only the two expected code files and release metadata. Code matches source `e9634cf`; development metadata is stripped as expected. Installer SHA-256 and testing instructions are recorded in `docs/DESKTOP-TESTING.md`.

## Remaining release gates

Signing follow-up: no usable signing certificate was found in CurrentUser/My or LocalMachine/My, and standard certificate/Azure signing environment settings are absent. `npm run build:signed` in `desktop` now requires a signature and writes to `release-signed`; it must not silently produce an unsigned client release. The existing Desktop installer remains unsigned. Completion requires the owner's verified signing identity; no identity or purchase has been assumed. Signing identifies the publisher but does not guarantee SmartScreen reputation.

1. Local preparation complete: rebuild, packaged launch, archive-content/source verification and installer checksum recorded. No Windows Sandbox is available on this machine; clean installation testing remains external.
2. Genuine Windows code signing is not configured. Installer signature previously verified as `NotSigned`. Do not bypass Windows warnings or describe this as a signed release.
3. Install/uninstall and printing/file-picker checks on a clean Windows test machine remain unverified. Mocked lifecycle tests do not replace these checks.
4. No automatic binary updater. Electron security updates require rebuilding and redistributing setup; web updates are independent.
5. Stronger passwords/MFA are recommended but passwords remain unchanged by explicit instruction.

## Resume safely

Read this file, `docs/desktop-and-halls.md`, `security_best_practices_report.md`, and Git status before continuing. Preserve unrelated `src/management/ExpensesWorkspace.tsx` changes and untracked skill/requirements files. Never clear live booking, employee, expense or stock records for tests. The database test scripts create disposable schemas and clean up only those schemas.

Do not claim release completion until the remaining gates are verified or explicitly accepted by the owner. Do not create recurring background work unless the user requests it.
