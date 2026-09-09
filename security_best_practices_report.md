# Security review — 9 September 2026

## Summary

Targeted review of React rendering, API role gates, cookie authentication, request origins, booking concurrency, dependencies and the new desktop wrapper. This is not a penetration-test certificate or a guarantee against compromise. No current staff passwords were changed, as explicitly requested by the owner.

## High — remaining

1. **Predictable staff passwords retained by request.** Login is password-only (`server/staff-auth.ts:29`). Known role-based passwords can be guessed; rate limiting cannot protect an already-known password. Existing controls: scrypt password hashing (`server/staff-auth.ts:26`), per-account/per-IP persistent limits (`server/staff-auth.ts:31`), HttpOnly session cookies and server-side role enforcement (`api/staff.ts:22`). Recommended next step is unique passphrases and MFA. Credentials are intentionally not repeated in this report.

## Medium — addressed

2. **CMS cookie contained an unkeyed password fingerprint.** `server/auth.ts:75` and `server/auth.ts:88` now use a server-keyed HMAC marker instead of plain SHA-256. This prevents a stolen marker alone being used for offline password guessing. Existing CMS cookies become invalid on deployment; sign in again with the unchanged password. The 18 CMS tests cover valid/tampered sessions, password rotation, origin rejection and throttling.

3. **No explicit script policy in deployment configuration.** `vercel.json:7` now supplies a same-origin script policy, blocks object embeds, limits base URLs/framing, and disables camera/microphone/location permissions. Inline styles remain supported intentionally for the prerendered landing page; inline scripts and eval are not allowed. Runtime verification is still required after deployment.

## Release limitations

4. **Desktop signing and update operations.** `desktop/package.json` defines a Windows installer but no signing identity or automatic updater. Code signing and a clean-machine install/uninstall test are release requirements for broad client distribution. Keep Electron patched and redistribute installers; website updates do not patch the embedded browser. The desktop wrapper follows Electron's sandbox/isolation guidance and has no Node bridge to remote content.

5. **Infrastructure controls not audited.** Cloud account MFA, backup retention/restore drills, team access and device security require owner verification. No changes were made to these services. CMS signed sessions have an eight-hour lifetime; logging out clears the browser cookie but does not revoke another stolen copy. Consider server-backed CMS session revocation in a later authentication upgrade.

## Verified existing protections

- Server-side GM / Director monitoring / Accountant expense-sheet restrictions, not merely hidden UI controls.
- Same-origin validation on state-changing API requests plus SameSite cookies.
- Parameterized Postgres operations and transaction locking for bookings; existing records retained.
- Protected attachment downloads, safe React text rendering, CMS unsafe-URL and image-type tests.
- Production dependency audit reported zero known vulnerabilities at review time. This does not rule out unknown issues or supply-chain compromise.

Guidance: https://www.electronjs.org/docs/latest/tutorial/security and the installed security-best-practices React/frontend references. No framework-specific Vercel server reference was provided by the skill; backend findings are based on the inspected code and tests.
