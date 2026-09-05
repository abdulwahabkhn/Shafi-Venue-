import { ArrowUpRight, Clock3, Mail, MapPin, MessageCircle, Phone } from 'lucide-react'
import exteriorImage from '../../public/media/shafi-marquee-exterior.jpg'
import { useSiteContent } from '../content/ContentProvider'

export function ContactSection() {
  const { contact: { address, emailAddress, mapsUrl, phoneDisplay, whatsappNumber, hours }, headings } = useSiteContent()
  return (
    <section className="contact section section--forest" id="contact" aria-labelledby="contact-title">
      <div className="contact__heading">
        <h2 id="contact-title">{headings.contact.title}</h2>
        <p>{headings.contact.description}</p>
      </div>

      <a className="map-panel" href={mapsUrl} target="_blank" rel="noreferrer" aria-label="Open Shafi Complex and Marquee in Google Maps">
        <img src={exteriorImage} alt="Exterior of Shafi Complex and Marquee" width="960" height="480" loading="lazy" decoding="async" fetchPriority="low" />
        <span><MapPin aria-hidden="true" /> Open in Google Maps <ArrowUpRight aria-hidden="true" /></span>
      </a>

      <div className="contact-ledger">
        <a href={mapsUrl} target="_blank" rel="noreferrer"><MapPin aria-hidden="true" /><span>{address}</span><ArrowUpRight aria-hidden="true" /></a>
        <a href={`tel:+${whatsappNumber}`}><Phone aria-hidden="true" /><span>{phoneDisplay}</span><ArrowUpRight aria-hidden="true" /></a>
        <a href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noreferrer"><MessageCircle aria-hidden="true" /><span>WhatsApp the venue</span><ArrowUpRight aria-hidden="true" /></a>
        <a href={`mailto:${emailAddress}`}><Mail aria-hidden="true" /><span>{emailAddress}</span><ArrowUpRight aria-hidden="true" /></a>
        <div><Clock3 aria-hidden="true" /><span>{hours || 'Contact the venue for viewing hours.'}</span></div>
      </div>
    </section>
  )
}
