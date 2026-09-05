import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { cmsPlugin } from './server/vite-cms'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  for (const key of ['CMS_ADMIN_PASSWORD', 'CMS_SESSION_SECRET', 'BLOB_READ_WRITE_TOKEN', 'BLOB_STORE_ID']) {
    if (env[key] && !process.env[key]) process.env[key] = env[key]
  }
  return { plugins: [react(), cmsPlugin()] }
})
