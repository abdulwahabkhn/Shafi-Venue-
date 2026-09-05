import { randomBytes } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'

let existing = ''
try { existing = await readFile('.env.local', 'utf8') } catch (error) { if (error.code !== 'ENOENT') throw error }
const missing = []
if (!/^CMS_ADMIN_PASSWORD=.+$/m.test(existing)) missing.push(`CMS_ADMIN_PASSWORD=${randomBytes(24).toString('base64url')}`)
if (!/^CMS_SESSION_SECRET=.+$/m.test(existing)) missing.push(`CMS_SESSION_SECRET=${randomBytes(48).toString('base64url')}`)
if (missing.length) await writeFile('.env.local', `${existing.trimEnd()}\n${missing.join('\n')}\n`, { mode: 0o600 })
console.log(missing.length ? 'Local CMS credentials created in .env.local. Keep this file private. Restart npm run dev to load them.' : 'Existing local CMS credentials preserved.')
console.log('Use CMS_ADMIN_PASSWORD from .env.local to sign in at /admin/login. Never commit this file.')
