import { ArrowDownRight, MapPin } from 'lucide-react'
import { address, hero } from '../data/site'

export function Hero() {
  return (
    <section className="hero" id="home" aria-labelledby="hero-title">
      <picture>
        <source media="(max-width: 720px)" srcSet={hero.mobileAvif} type="image/avif" />
        <source srcSet={hero.desktopAvif} type="image/avif" />
        <img className="hero__image" src={hero.image} alt="Shafi Complex and Marquee exterior illuminated at dusk" width="1792" height="1024" fetchPriority="high" />
      </picture>
      <div className="hero__veil" aria-hidden="true" />

      <div className="hero__content">
        <h1 id="hero-title">{hero.title}</h1>
        <p>{hero.description}</p>
        <div className="hero__actions">
          <a className="button button--gold" href="#booking">Plan Your Event <ArrowDownRight aria-hidden="true" /></a>
          <a className="button button--quiet" href="#halls">Explore Our Halls</a>
        </div>
      </div>

      <div className="hero__facts" aria-label="Venue information">
        <span><MapPin aria-hidden="true" /> {address}</span>
        <span>Wedding &amp; event venue</span>
      </div>
    </section>
  )
}
