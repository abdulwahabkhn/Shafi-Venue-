import { ChevronDown } from 'lucide-react'
import { packages } from '../data/site'
import { SectionHeading } from './SectionHeading'

export function PackagesSection() {
  return (
    <section className="packages section section--paper" id="packages" aria-labelledby="packages-title">
      <SectionHeading
        title="Begin with an outline. Shape the rest together."
        description="These are editable enquiry starting points, not confirmed commercial packages. Pricing and final inclusions are discussed directly with Shafi Complex & Marquee."
        tone="light"
      />

      <div className="package-list">
        {packages.map((item) => (
          <details className="package" key={item.name}>
            <summary>
              <span>
                <strong>{item.name}</strong>
                <small>Tailored quotation</small>
              </span>
              <ChevronDown aria-hidden="true" />
            </summary>
            <div className="package__details">
              <p>{item.summary}</p>
              <ul>{item.includes.map((line) => <li key={line}>{line}</li>)}</ul>
              <a className="text-link" href="#booking">Discuss this outline</a>
            </div>
          </details>
        ))}
      </div>
      <p className="section-disclosure">Package names and inclusions are presentation examples only. The venue must supply approved packages, prices and terms before launch.</p>
    </section>
  )
}
