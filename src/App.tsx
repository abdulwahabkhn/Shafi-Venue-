import { BookingSection } from './components/BookingSection'
import { ContactSection } from './components/ContactSection'
import { ExperienceSection } from './components/ExperienceSection'
import { Footer } from './components/Footer'
import { GallerySection } from './components/GallerySection'
import { HallsSection } from './components/HallsSection'
import { Header } from './components/Header'
import { Hero } from './components/Hero'
import { PackagesSection } from './components/PackagesSection'
import { ServicesSection } from './components/ServicesSection'
import { ContentProvider } from './content/ContentProvider'

export default function App() {
  return (
    <ContentProvider><div className="site-shell">
      <Header />
      <main>
        <Hero />
        <HallsSection />
        <ServicesSection />
        <ExperienceSection />
        <PackagesSection />
        <GallerySection />
        <BookingSection />
        <ContactSection />
      </main>
      <Footer />
    </div></ContentProvider>
  )
}
