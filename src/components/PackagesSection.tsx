import { ChevronDown } from 'lucide-react'
import { useSiteContent } from '../content/ContentProvider'
import { SectionHeading } from './SectionHeading'

export function PackagesSection() {
  const { packages, headings, packageDisclosure } = useSiteContent()
  return (
    <section className="packages section section--paper" id="packages" aria-labelledby="packages-title">
      <SectionHeading
        {...headings.packages}
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
      {packageDisclosure && <p className="section-disclosure">{packageDisclosure}</p>}
    </section>
  )
}
