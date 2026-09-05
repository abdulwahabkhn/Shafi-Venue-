import { useSiteContent } from '../content/ContentProvider'
import { SectionHeading } from './SectionHeading'

export function ExperienceSection() {
  const { journey, headings } = useSiteContent()
  return (
    <section className="experience section section--charcoal" aria-labelledby="experience-title">
      <SectionHeading
        {...headings.experience}
        tone="dark"
      />

      <ol className="journey">
        {journey.map((step, index) => (
          <li key={step.title}>
            <span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
            <div>
              <h3>{step.title}</h3>
              <p>{step.copy}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
