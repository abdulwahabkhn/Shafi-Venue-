# Shafi Marquee desktop testing candidate

Version: 1.0.0, Windows x64. Source: `e9634cf`.

Installer: `desktop/release/Shafi-Marquee-Setup-1.0.0-x64.exe` (111,324,268 bytes).

SHA-256: `8EAEA0689FA4E671621DD29A9EEA7323E96CD92A54BD4A46F4C8CC6E376F1103`.

## Verified

- Windows installer build completed successfully.
- Packaged app launched the live HTTPS portal and exited its launch check with code 0.
- Seven desktop tests cover sandbox/isolation settings, denied device permissions, navigation and redirect restrictions, executable download blocking, offline startup, window closure during connection failure, and launch-test exit codes.
- The packaged archive contains only `main.cjs`, `policy.cjs` and release `package.json`. Both code files exactly match the checked-in source. Release name, version and entry point match; the packager correctly removes development scripts, build settings and development dependencies.
- No database credentials, environment files, local test data or business records are included in the application archive.
- The installer signature status is `NotSigned`.

## Testing instructions

Use a separate Windows test machine for the first installation. This computer has no available Windows Sandbox, so installation/uninstallation has not been verified in an isolated Windows environment. Do not treat a blocked Windows security prompt as a successful installation; resolve signing/trust before continuing.

1. Run the installer, choose a per-user location, and confirm the desktop shortcut launches Shafi Marquee.
2. Sign in with the existing staff credentials. GM should have the management sections, Director should have monitoring access, and Accountant should have the expense sheet.
3. Open Bookings and inspect all seven hall choices. Existing production data is shared with the website; do not submit disposable booking, payment or expense records to the live portal during an installation-only check.
4. Open a report and choose Portal → Print / Save as PDF. Cancel the print dialog when only verifying it opens. Check any needed file picker with a non-sensitive file and cancel before upload.
5. Close the app and reopen it. A fresh sign-in should be required. With internet disconnected before startup, verify the connection message and Retry after restoring connectivity.
6. Uninstall through Windows Installed apps. Confirm the app and its shortcut are removed, then check that the web portal and saved records still work. Removing the desktop app must not remove cloud data.

The app needs internet. Website updates appear in the desktop portal; Electron updates require a new installer. Current passwords remain unchanged by request.

## Distribution status

Ready as an unsigned testing candidate, not a signed general-distribution release. A genuine code-signing identity and the installation/printing/file-picker/uninstallation checks above remain outstanding. No certificate was purchased and no Windows security protection was disabled.
