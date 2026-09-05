# Shafi website CMS

## Using the editor

Open **Admin portal** in the website footer and enter the admin password. After sign-in, **Manage website** appears in the public navigation; the sign-in screen also links directly to the editor at `/admin`.

The editor manages the hero photograph and copy, section headings, halls and capacities, services and icons, event journey, packages and inclusions, gallery photographs/categories/alt text, booking introduction, contact details, hours, social links and footer notices. Add, reorder or remove collection entries. The booking form automatically uses the published halls, packages and WhatsApp number.

Edits remain in the open editor until **Publish changes → Publish website**. Leaving with unsaved edits triggers a warning. Download a JSON draft to keep unfinished work, and import it later. Reloading the published version discards the current draft after confirmation. If another editor publishes first, a conflicting save is rejected; download your draft before reloading and reconciling edits.

Uploads are resized to a maximum dimension of 1920px and converted to WebP in the browser. Originals up to 20 MB are accepted; optimized uploads are limited to 3 MB. The server verifies JPG/PNG/WebP file signatures and refuses SVG. An upload is stored immediately but appears on the website only after publication. Removing an image entry removes its display, not the underlying file, so old versions remain recoverable.

## Local setup

Run `npm run cms:setup`, then `npm run dev`. Setup adds missing `CMS_ADMIN_PASSWORD` and `CMS_SESSION_SECRET` values to `.env.local`, preserving existing credentials. Read the password from that file privately. Never commit it or paste credentials into public messages. Restart the development server after changing credentials.

Without a Blob connection, the development server uses `.cms-local/published.json` and `.cms-local/media/`. Both local content and `.env.local` are gitignored. Local publishing does not affect the live Vercel website. `vite preview` serves static build files only; use `npm run dev` for local CMS API testing.

## Vercel setup required before the CMS goes live

1. Connect a **public Vercel Blob store** to the `shafi-venue` project. Connect Production; use a separate store for Preview/Development when testing so test publishes cannot change the live site. The store supplies `BLOB_READ_WRITE_TOKEN` (or `BLOB_STORE_ID` with Vercel OIDC for server access).
2. Add server-only `CMS_ADMIN_PASSWORD` (at least 16 characters) and `CMS_SESSION_SECRET` (at least 32 characters, randomly generated) in Vercel's project environment settings. Choose a production password independently of local credentials. Never use a `VITE_` prefix for a secret.
3. Deploy the code. `api/cms.ts` is a Vercel Function; `vercel.json` routes `/admin` and `/admin/login` to the separate admin shell. The build prerenders the public page and emits `admin.html` without public page markup. The admin editor is a separate lazy-loaded chunk.
4. Test sign-in, image upload, publication and sign-out on the deployed URL. Verify the new content from a separate signed-out browser before handing it to venue staff.

Vercel Blob storage and operations use the project's plan allowance. This implementation has been exercised locally; production Blob/OIDC and domain behavior must be smoke-tested after the store and environment variables are configured.

## Security and data behavior

The password is checked only on the server. Signed sessions last eight hours and use HttpOnly, SameSite=Strict cookies, with Secure enabled on Vercel/HTTPS. A password or session-secret change invalidates old sessions. Requests that mutate content require both a valid session and a matching Origin. Every published field is validated server-side, and links are restricted to HTTPS. The endpoint enforces body size limits.

Production login attempts are limited to eight per forwarded IP in each 15-minute window using conditional Blob writes, surviving serverless cold starts; local development uses a bounded in-memory limiter. IP addresses are represented by keyed hashes in counter object names. Store failures fail closed. A Vercel Firewall rate-limit rule on `/api/cms?action=login` is also recommended to reduce abusive traffic before it reaches a function. A shared password identifies the venue team, not individual staff; there are no per-user roles or individual audit logs.

Only publishable website content, optimized media, prior published versions and pseudonymous throttle counters enter the public Blob store. Do not put enquiries, guest lists, passwords or other private records into CMS text or images. Booking continues to hand off to WhatsApp; no enquiry database is added.

`cms/published.json` holds the current document. Writes use Blob ETags to prevent lost updates; a first-write race is rejected. Prior documents are preserved under `cms/history/`. To recover a previous version, download that JSON, import its `content` property as a draft, review and publish. Local history is in `.cms-local/history/`. History and unused uploads are retained; storage cleanup is a separate maintenance task.

Public content is loaded after hydration. The prerendered page remains the fallback during API outages. This preserves the fast initial page, but content edits are not injected into the build-time HTML or social metadata; full server rendering/SEO publishing is a separate enhancement. Existing static image paths remain the defaults until replaced in the editor. Code-level layout, fonts, colours, navigation structure and application logic remain developer-managed.

## Validation

`npm run build` checks frontend and server TypeScript and builds both public and admin outputs. `npm run test:cms` runs isolated integration checks for sessions, origin protection, publication, stale writes, input validation, uploads, logout, rotation and throttling. Test data uses a temporary directory, leaving the venue content intact.
