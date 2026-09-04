import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import '@fontsource/cormorant-garamond/latin-600.css'
import '@fontsource/manrope/latin-400.css'
import '@fontsource/manrope/latin-600.css'
import App from './App'
import './styles.css'

const root = document.getElementById('root')!
const app = (
  <StrictMode>
    <App />
  </StrictMode>
)

if (root.hasChildNodes()) {
  hydrateRoot(root, app)
} else {
  createRoot(root).render(app)
}
