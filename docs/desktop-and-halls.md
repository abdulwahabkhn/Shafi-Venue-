# Desktop and three-hall bookings

The Windows app uses https://shafi-venue.vercel.app/management and the same server-side accounts, permissions and records as the browser. Internet is required. There is no offline editing or local database copy. Sessions are memory-only and require signing in after closing the app.

## Windows build

For a signed client release, configure a genuine signing certificate or supported signing service, then run `npm run build:signed` from `desktop`. This uses electron-builder's `forceCodeSigning` check and a separate `release-signed` output directory. Verify the app and installer with `Get-AuthenticodeSignature` before distribution. Signing credentials must be configured locally or in a protected build environment, never committed or sent in conversation. No usable local signing certificate or signing environment was available at the last check. A valid signature establishes publisher identity; SmartScreen can still warn about newly released files. See https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/smartscreen-reputation.

From `desktop`, run `npm ci`, `npm test`, then `npm run build`. The x64 per-user NSIS installer is generated in `desktop/release`. The installer creates a desktop shortcut and does not need a machine-wide installation. Only the three explicitly included application files are packaged; environment files, database credentials, website source and local test data are excluded.

This initial installer is unsigned unless the release operator supplies a genuine Windows code-signing identity through electron-builder's supported signing configuration. Do not bypass Windows security warnings for client rollout. Obtain signing credentials and test installation/uninstallation on a separate Windows test machine before general distribution. Rebuild and distribute the desktop package when Electron receives security updates; the hosted website updates independently. No automatic binary updater is configured.

The Portal menu provides Print / Save as PDF and a fixed trusted link to the web portal. Remote content cannot open arbitrary external programs, webviews or new privileged windows. Downloads are restricted to common report/image extensions and never automatically executed. No preloads or IPC bridge are exposed. See Electron's official security checklist: https://www.electronjs.org/docs/latest/tutorial/security

## Halls

Booking choices: Hall 1, Hall 2, Hall 3, Hall 1 + Hall 2, Hall 1 + Hall 3, Hall 2 + Hall 3, All halls. One booking reserves every selected hall for its start/end interval, including overnight events. A conflict in any selected hall rejects the whole booking. Adjacent end/start times are allowed. Prices and payments are per booking, not multiplied by hall count.

Existing single-hall records need no migration. Shared definitions resolve combinations into physical halls for conflict checks. The Postgres transaction lock continues to serialize booking writes, including different combinations sharing a hall. Third-hall stock locations and staff hall choices are available without restoring the removed hall-manager role. Public enquiries also offer all combinations; no photographs, capacity or marketing claims for Hall 3 were invented.

Tests: `node scripts/test-hall-combinations.mjs`, `node scripts/test-bookings.mjs`, `node scripts/test-simple-registers.mjs`, `npm run test:cms`, `npm run build`. The database test creates and removes a disposable schema; it does not alter live business records.
