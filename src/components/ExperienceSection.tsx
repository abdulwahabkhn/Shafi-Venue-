import { journey } from '../data/site'
import { SectionHeading } from './SectionHeading'

export function ExperienceSection() {
  return (
    <section className="experience section section--charcoal" aria-labelledby="experience-title">
      <SectionHeading
        title="From first question to event day."
        description="A clear, human process keeps every decision connected. Booking remains provisional until the venue team confirms availability and terms."
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
