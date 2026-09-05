import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { randomBytes } from 'node:crypto'
import { createServer } from 'vite'

const directory = await mkdtemp(join(tmpdir(), 'shafi-cms-test-'))
process.env.CMS_LOCAL_DIRECTORY = directory
process.env.CMS_ADMIN_PASSWORD = randomBytes(24).toString('hex')
process.env.CMS_SESSION_SECRET = randomBytes(48).toString('hex')
delete process.env.VERCEL
delete process.env.BLOB_READ_WRITE_TOKEN
delete process.env.BLOB_STORE_ID
const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom' })
let passed = 0
function check(condition, name) { assert.ok(condition, name); passed += 1; console.log(`PASS ${name}`) }
try {
  const { default: handler } = await server.ssrLoadModule('/api/cms.ts')
  const { defaultContent } = await server.ssrLoadModule('/src/content/defaults.ts')
  const request = (action, data, cookie = '', origin = 'http://localhost:5175') => handler(new Request(`http://localhost:5175/api/cms?action=${action}`, { method: data === undefined ? 'GET' : 'POST', headers: { Origin: origin, Cookie: cookie, 'Content-Type': 'application/json' }, body: data === undefined ? undefined : JSON.stringify(data) }))
  check((await request('publish', { content: defaultContent, revision: null })).status === 401, 'Unauthenticated publish is rejected')
  check((await request('login', { password: process.env.CMS_ADMIN_PASSWORD }, '', 'https://other.example')).status === 403, 'Cross-origin sign-in is rejected')
  check((await request('login', { password: 'incorrect' })).status === 401, 'Incorrect password is rejected')
  const login = await request('login', { password: process.env.CMS_ADMIN_PASSWORD })
  const cookie = login.headers.get('set-cookie').split(';')[0]
  check(login.status === 200 && /HttpOnly; SameSite=Strict/.test(login.headers.get('set-cookie')), 'Correct sign-in sets protected cookie')
  check((await (await request('session', undefined, cookie)).json()).authenticated, 'Valid session is recognized')
  check(!(await (await request('session', undefined, cookie + 'tampered')).json()).authenticated, 'Tampered session is rejected')
  const initial = await request('publish', { content: defaultContent, revision: null }, cookie)
  assert.equal(initial.status, 200, JSON.stringify(await initial.clone().json()))
  const published = await initial.json()
  check(Boolean(published.revision), 'First publish stores a revision')
  const changed = structuredClone(defaultContent)
  changed.hero.title = 'CMS test celebration'
  const updated = await request('publish', { content: changed, revision: published.revision }, cookie)
  check(updated.status === 200, 'Current revision can publish changes')
  check((await (await request('content')).json()).content.hero.title === changed.hero.title, 'Public endpoint returns persisted changes')
  check((await request('publish', { content: defaultContent, revision: published.revision }, cookie)).status === 409, 'Stale editor cannot overwrite newer changes')
  changed.contact.mapsUrl = 'javascript:alert(1)'
  check((await request('publish', { content: changed, revision: published.revision }, cookie)).status === 400, 'Unsafe links are rejected')
  const invalidUpload = await handler(new Request('http://localhost:5175/api/cms?action=upload', { method: 'POST', headers: { Origin: 'http://localhost:5175', Cookie: cookie }, body: '<svg onload="alert(1)"></svg>' }))
  check(invalidUpload.status === 400, 'SVG or disguised uploads are rejected')
  const imageBytes = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aZl8AAAAASUVORK5CYII=', 'base64')
  const upload = await handler(new Request('http://localhost:5175/api/cms?action=upload', { method: 'POST', headers: { Origin: 'http://localhost:5175', Cookie: cookie }, body: imageBytes }))
  const uploaded = await upload.json()
  check(upload.status === 200 && uploaded.url.includes('action=image'), 'Valid image uploads persist')
  const imageResponse = await handler(new Request(`http://localhost:5175${uploaded.url}`))
  check(imageResponse.status === 200 && Buffer.from(await imageResponse.arrayBuffer()).equals(imageBytes), 'Uploaded image is served intact')
  const logout = await request('logout', {}, cookie)
  check(logout.status === 200 && /Max-Age=0/.test(logout.headers.get('set-cookie')), 'Sign-out clears the cookie')
  process.env.CMS_ADMIN_PASSWORD = randomBytes(24).toString('hex')
  check(!(await (await request('session', undefined, cookie)).json()).authenticated, 'Password rotation invalidates existing sessions')
  for (let i = 0; i < 8; i += 1) await request('login', { password: 'incorrect' })
  check((await request('login', { password: 'incorrect' })).status === 429, 'Repeated attempts are throttled')
  delete process.env.CMS_SESSION_SECRET
  check((await request('login', { password: 'incorrect' })).status === 503, 'Missing configuration fails closed')
  console.log(`${passed} CMS checks passed. Test content was isolated from the website.`)
} finally { await server.close(); await rm(directory, { recursive: true, force: true }) }
