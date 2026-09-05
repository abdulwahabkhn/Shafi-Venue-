import logo from '../../public/media/shafi-marquee-logo.jpg'
import { navigation } from '../data/site'
import { useSiteContent } from '../content/ContentProvider'

export function Footer() {
  const { contact, footerNote } = useSiteContent()
  return (
    <footer className="site-footer">
      <div className="footer__brand">
        <img src={logo} alt="" width="76" height="76" loading="lazy" decoding="async" />
        <p>Shafi Complex &amp; Marquee<br /><span>Jaranwala, Pakistan</span></p>
      </div>
      <nav aria-label="Footer navigation">
        {navigation.map((item) => <a href={item.href} key={item.href}>{item.label}</a>)}
      </nav>
      <div className="footer__meta">
        <p>{contact.facebook ? <a href={contact.facebook} target="_blank" rel="noreferrer">Facebook</a> : 'Facebook link to be supplied'}<br />{contact.instagram ? <a href={contact.instagram} target="_blank" rel="noreferrer">Instagram</a> : 'Instagram link to be supplied'}</p>
        <a className="admin-link" href="/admin/login">Admin portal</a>
      </div>
      <div className="footer__bottom">
        <span>© {new Date().getFullYear()} Shafi Complex &amp; Marquee</span>
        <span>{footerNote}</span>
        <a href="#home">Back to top</a>
      </div>
    </footer>
  )
}
