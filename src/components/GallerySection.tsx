import { useState } from 'react'
import { useSiteContent } from '../content/ContentProvider'
import { SectionHeading } from './SectionHeading'


export function GallerySection() {
  const { galleryItems, headings } = useSiteContent()
  const categories = ['All', ...new Set(galleryItems.map(item => item.category))]
  const [activeCategory, setActiveCategory] = useState('All')
  const visibleItems = activeCategory === 'All' ? galleryItems : galleryItems.filter((item) => item.category === activeCategory)

  return (
    <section className="gallery section section--charcoal" id="gallery" aria-labelledby="gallery-title">
      <SectionHeading
        {...headings.gallery}
        tone="dark"
      />

      <div className="gallery-filters" role="group" aria-label="Filter gallery">
        {categories.map((category) => (
          <button type="button" key={category} className={activeCategory === category ? 'active' : ''} aria-pressed={activeCategory === category} onClick={() => setActiveCategory(category)}>
            {category}
          </button>
        ))}
      </div>

      <div className="gallery-grid" aria-live="polite">
        {visibleItems.map((item, index) => (
          <figure className={index === 0 ? 'gallery-item gallery-item--wide' : 'gallery-item'} key={`${item.src}-${item.note}`}>
            <picture>
              {item.avifSrcSet && <source srcSet={item.avifSrcSet} sizes={index === 0 ? '(max-width: 720px) 100vw, 66vw' : '(max-width: 720px) 100vw, 33vw'} type="image/avif" />}
              <img src={item.src} alt={item.alt} width="1536" height="1024" loading="lazy" decoding="async" fetchPriority="low" />
            </picture>
            <figcaption>{item.note}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  )
}
