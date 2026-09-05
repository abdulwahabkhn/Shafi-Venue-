import { randomBytes } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'

const cli = 'vercel'
const password = randomBytes(24).toString('base64url')
const secret = randomBytes(48).toString('base64url')
const environments = ['production', 'preview', 'development']
for (const name of ['CMS_ADMIN_PASSWORD', 'CMS_SESSION_SECRET']) {
  const value = name === 'CMS_ADMIN_PASSWORD' ? password : secret
  for (const environment of environments) {
    execFileSync(cli, ['env', 'add', name, environment, '--value', value, environment === 'development' ? '--no-sensitive' : '--sensitive', '--force', '--yes'], { stdio: 'inherit', cwd: process.cwd(), shell: process.platform === 'win32' })
  }
}
await mkdir(resolve('.cms-local'), { recursive: true })
await writeFile(resolve('.cms-local', 'production-credentials.txt'), `CMS_ADMIN_PASSWORD=${password}\nCMS_SESSION_SECRET=${secret}\n`, { mode: 0o600 })
console.log('Production CMS credentials set for Production, Preview and Development.')
console.log('The password is stored only in .cms-local/production-credentials.txt (gitignored).')
