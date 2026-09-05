import { StrictMode, lazy, Suspense } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import '@fontsource/cormorant-garamond/latin-600.css'
import '@fontsource/manrope/latin-400.css'
import '@fontsource/manrope/latin-600.css'
import App from './App'
import './styles.css'

const root = document.getElementById('root')!
const isAdmin = window.location.pathname === '/admin' || window.location.pathname.startsWith('/admin/')
const AdminApp = lazy(() => import('./admin/AdminApp'))
const isManagement = window.location.pathname === '/management' || window.location.pathname.startsWith('/management/')
const ManagementApp = lazy(() => import('./management/ManagementApp'))
const app = (
  <StrictMode>
    {isAdmin ? <Suspense fallback={<p role="status" style={{ padding: '40px' }}>Opening admin portal…</p>}><AdminApp /></Suspense> : isManagement ? <Suspense fallback={<p role="status" style={{ padding: '40px' }}>Opening venue operations…</p>}><ManagementApp /></Suspense> : <App />}
  </StrictMode>
)

if (root.hasChildNodes() && !isAdmin && !isManagement) {
  hydrateRoot(root, app)
} else {
  createRoot(root).render(app)
}
