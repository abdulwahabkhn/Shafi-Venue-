import {
  CookingPot,
  Flower2,
  ListChecks,
  ShieldCheck,
  UsersRound,
  UtensilsCrossed,
} from 'lucide-react'
import { useSiteContent } from '../content/ContentProvider'
import { SectionHeading } from './SectionHeading'

const icons = {
  planning: ListChecks,
  decor: Flower2,
  catering: CookingPot,
  dining: UtensilsCrossed,
  guests: UsersRound,
  security: ShieldCheck,
}

export function ServicesSection() {
  const { services, headings } = useSiteContent()
  return (
    <section className="services section section--forest" id="services" aria-labelledby="services-title">
      <SectionHeading
        {...headings.services}
        tone="dark"
      />

      <div className="service-list">
        {services.map((service) => {
          const Icon = icons[service.icon as keyof typeof icons]
          return (
            <article className="service-row" key={service.title}>
              <Icon aria-hidden="true" />
              <h3>{service.title}</h3>
              <p>{service.copy}</p>
            </article>
          )
        })}
      </div>
    </section>
  )
}
