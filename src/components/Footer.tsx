import logo from '../../public/media/shafi-marquee-logo.jpg'
import { emailAddress, navigation } from '../data/site'

export function Footer() {
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
        <p>Facebook link to be supplied<br />Instagram link to be supplied</p>
        <a className="admin-link" href={`mailto:${emailAddress}?subject=Admin%20portal%20access`}>Admin portal access</a>
      </div>
      <div className="footer__bottom">
        <span>© {new Date().getFullYear()} Shafi Complex &amp; Marquee</span>
        <span>Package prices, capacities and hours require venue approval.</span>
        <a href="#home">Back to top</a>
      </div>
    </footer>
  )
}
