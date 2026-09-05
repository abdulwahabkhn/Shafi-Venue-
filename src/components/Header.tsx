import { useEffect, useState } from 'react'
import { Menu, X } from 'lucide-react'
import logo from '../../public/media/shafi-marquee-logo.jpg'
import { navigation } from '../data/site'

export function Header() {
  const [open, setOpen] = useState(false)
  const [authenticated, setAuthenticated] = useState(false)

  useEffect(() => {
    const checkSession = () => { fetch('/api/cms?action=session').then(response => response.ok ? response.json() : null).then(result => setAuthenticated(Boolean(result?.authenticated))).catch(() => setAuthenticated(false)) }
    checkSession()
    window.addEventListener('focus', checkSession)
    return () => window.removeEventListener('focus', checkSession)
  }, [])

  useEffect(() => {
    const closeOnWideScreen = () => {
      if (window.innerWidth > 960) setOpen(false)
    }
    window.addEventListener('resize', closeOnWideScreen)
    return () => window.removeEventListener('resize', closeOnWideScreen)
  }, [])

  return (
    <header className={authenticated ? 'site-header site-header--authenticated' : 'site-header'}>
      <a className="brand" href="#home" aria-label="Shafi Complex and Marquee home" onClick={() => setOpen(false)}>
        <img src={logo} alt="" width="72" height="72" />
        <span>Shafi Complex <em>&amp; Marquee</em></span>
      </a>

      <nav className={open ? 'primary-nav primary-nav--open' : 'primary-nav'} aria-label="Primary navigation">
        {authenticated && <a href="/admin">Manage website</a>}
        {navigation.map((item) => (
          <a key={item.href} href={item.href} onClick={() => setOpen(false)}>{item.label}</a>
        ))}
      </nav>

      <a className="button button--outline header-action" href="#booking" onClick={() => setOpen(false)}>Book Your Event</a>
      <button className="menu-button" type="button" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen((current) => !current)}>
        {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
      </button>
    </header>
  )
}
