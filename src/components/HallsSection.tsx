import { ArrowRight, UsersRound } from 'lucide-react'
import { halls } from '../data/site'
import { SectionHeading } from './SectionHeading'

export function HallsSection() {
  return (
    <section className="halls section section--ivory" id="halls" aria-labelledby="halls-title">
      <SectionHeading
        title="Two halls. One considered celebration."
        description="Explore both spaces, then confirm capacity, layout and availability directly with the venue team. No unverified capacity figures are presented here."
        tone="light"
      />

      <div className="hall-list">
        {halls.map((hall, index) => (
          <article className={`hall ${index % 2 ? 'hall--reverse' : ''}`} key={hall.name}>
            <figure className="hall__media">
              <picture>
                <source srcSet={hall.imageAvif} sizes="(max-width: 960px) 100vw, 60vw" type="image/avif" />
                <img src={hall.image} alt={`${hall.name} representative event styling`} width="1536" height="1024" loading="lazy" decoding="async" fetchPriority="low" />
              </picture>
              <figcaption>{hall.imageNote}</figcaption>
            </figure>
            <div className="hall__content">
              <h3>{hall.name}</h3>
              <p>{hall.summary}</p>
              <div className="hall__capacity"><UsersRound aria-hidden="true" /><span>{hall.capacity}</span></div>
              <ul aria-label={`Suitable occasions for ${hall.name}`}>
                {hall.occasions.map((occasion) => <li key={occasion}>{occasion}</li>)}
              </ul>
              <a className="text-link" href="#booking">Ask about {hall.name} <ArrowRight aria-hidden="true" /></a>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
