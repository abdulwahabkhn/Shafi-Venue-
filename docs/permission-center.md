# Permission center

Updated 11 September 2026.

- Director has full access to the operational modules, website CMS and Permission center. Director permissions cannot be switched off.
- Director can create and edit GM, Accountant and custom-role accounts, including individual permission categories.
- GM keeps existing access until the Director explicitly restricts it. A GM with staff-management access may manage Accountant/custom roles, but cannot edit GM/Director accounts or grant an action the GM does not have.
- Accountant defaults are retained for existing accounts. Custom roles default to no access. Saved checkbox choices are persisted for GM, Accountant and custom roles.
- Saving an account revokes that account's staff sessions. Sign in again to load updated navigation and controls. Passwords are unchanged unless explicitly replaced in the account form.
- All category checkboxes support checked, unchecked and mixed states. Enabling an editing action also enables the viewing permission it needs.
- Monthly overview and reports expose cross-module financial summaries; grant them only to people who should see those summaries. Inventory includes booking references needed to link damage.
- Employee salary/wage and advance permissions are separate. Voiding employee payment records requires both permissions. The application records payments made outside the software; it does not transfer money.
- Retired ledger routes are Director-only. Other users use the current expense, inventory and employee registers, whose server endpoints enforce individual permissions.
- The existing CMS owner sign-in is a Director-level recovery path. Protect that password separately; staff restrictions cannot restrict someone who also knows the owner credential.

## Verification

Run `npm run test:permissions` and `npm run build`.

The permission suite uses real authentication and API handlers with an in-memory SQL adapter. It does not contact production and does not replace database integration testing. It covers Director access, role hierarchy, permission persistence, audit snapshots, session revocation, custom roles, module restrictions and individual denied actions.

For a local browser fixture, run `node scripts/test-permission-center.mjs --ui` and open `http://127.0.0.1:5180/management`. This explicitly test-only server supplies a simulated Director and disposable records. It is bound to localhost and is never used by the deployed app.

The installed desktop app loads the hosted portal, so no installer rebuild is required for this update. Refresh or reopen the app after deployment.
