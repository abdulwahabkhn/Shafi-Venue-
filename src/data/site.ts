import exteriorImage from '../../public/media/shafi-marquee-exterior.jpg'
import heroImage from '../../assets/plates/venue-hero.webp'
import heroDesktopAvif from '../../assets/plates/venue-hero-1792.avif'
import heroMobileAvif from '../../assets/plates/venue-hero-mobile.avif'
import weddingImage from '../../assets/plates/service-wedding-v2.webp'
import weddingImageSmall from '../../assets/plates/service-wedding-640.avif'
import weddingImageMedium from '../../assets/plates/service-wedding-800.avif'
import weddingImageLarge from '../../assets/plates/service-wedding-1200.avif'
import valimaImage from '../../assets/plates/service-valima-v2.webp'
import valimaImageSmall from '../../assets/plates/service-valima-640.avif'
import valimaImageMedium from '../../assets/plates/service-valima-800.avif'
import valimaImageLarge from '../../assets/plates/service-valima-1200.avif'
import gatheringImage from '../../assets/plates/service-gathering-v2.webp'
import gatheringImageSmall from '../../assets/plates/service-gathering-640.avif'
import gatheringImageMedium from '../../assets/plates/service-gathering-800.avif'
import gatheringImageLarge from '../../assets/plates/service-gathering-1200.avif'

export const phoneDisplay = '0313-8220777'
export const whatsappNumber = '923138220777'
export const emailAddress = 'Scjaranwala@hotmail.com'
export const address = '1-Km Shehroana Kamoana Bypass, Jaranwala'
export const mapsUrl = 'https://maps.google.com/?q=1-Km+Shehroana+Kamoana+Bypass+Jaranwala'

export const navigation = [
  { label: 'Home', href: '#home' },
  { label: 'Halls', href: '#halls' },
  { label: 'Services', href: '#services' },
  { label: 'Packages', href: '#packages' },
  { label: 'Gallery', href: '#gallery' },
  { label: 'Contact', href: '#contact' },
]

export const hero = {
  image: heroImage,
  desktopAvif: heroDesktopAvif,
  mobileAvif: heroMobileAvif,
  title: 'Where every celebration finds its setting.',
  description: 'A wedding and event venue in Jaranwala, shaped around your occasion with considered planning, presentation and a direct path to the venue team.',
}

export const halls = [
  {
    name: 'Hall 1',
    image: weddingImage,
    imageAvif: `${weddingImageSmall} 640w, ${weddingImageMedium} 800w, ${weddingImageLarge} 1200w`,
    summary: 'A flexible celebration setting that can be discussed around your event format, guest plan and preferred stage direction.',
    capacity: 'Capacity to be confirmed',
    occasions: ['Walima', 'Barat', 'Mehndi', 'Nikkah', 'Corporate events'],
    imageNote: 'Representative styling visual — venue photography to be supplied',
  },
  {
    name: 'Hall 2',
    image: gatheringImage,
    imageAvif: `${gatheringImageSmall} 640w, ${gatheringImageMedium} 800w, ${gatheringImageLarge} 1200w`,
    summary: 'A second event setting for families and hosts to review with the venue team before confirming layout and arrangements.',
    capacity: 'Capacity to be confirmed',
    occasions: ['Walima', 'Barat', 'Mehndi', 'Nikkah', 'Corporate events'],
    imageNote: 'Representative styling visual — venue photography to be supplied',
  },
]

export const services = [
  { icon: 'planning', title: 'Event planning', copy: 'Discuss the occasion, timing, guest flow and practical requirements with the venue team.' },
  { icon: 'decor', title: 'Decoration', copy: 'Shape a stage and setting direction—from restrained and elegant to ceremonial and grand.' },
  { icon: 'catering', title: 'Catering', copy: 'Review menu and service requirements directly with the team before final confirmation.' },
  { icon: 'dining', title: 'Crockery & buffet', copy: 'Plan crockery, dining presentation and buffet flow around the confirmed event format.' },
  { icon: 'guests', title: 'Guest management', copy: 'Coordinate arrival, seating and movement so the celebration remains clear and comfortable.' },
  { icon: 'security', title: 'Parking & security', copy: 'Confirm parking arrangements and on-site security requirements for your preferred date.' },
]

export const journey = [
  { title: 'Enquiry', copy: 'Share your event type, preferred date and estimated guest count.' },
  { title: 'Venue & package selection', copy: 'Review the halls and discuss the combination of services you need.' },
  { title: 'Booking confirmation', copy: 'The venue team confirms availability, inclusions and commercial terms directly.' },
  { title: 'Event preparation', copy: 'Finalize layout, stage direction, dining requirements and guest flow.' },
  { title: 'Celebration', copy: 'Arrive with the agreed plan ready for the occasion you have shaped.' },
]

export const packages = [
  {
    name: 'Venue foundation',
    summary: 'A starting outline for hosts who want to begin with the venue and essential event planning.',
    includes: ['Preferred hall discussion', 'Event layout conversation', 'Date and availability check'],
  },
  {
    name: 'Celebration styling',
    summary: 'An editable direction for events that need venue planning plus a considered visual setting.',
    includes: ['Venue foundation outline', 'Stage and decoration direction', 'Guest-flow planning'],
  },
  {
    name: 'Complete event plan',
    summary: 'A conversation covering the full event journey and every service relevant to your occasion.',
    includes: ['Venue and styling discussion', 'Catering and buffet requirements', 'Parking, security and guest management'],
  },
]

export const galleryItems = [
  { src: exteriorImage, category: 'Venue', alt: 'Exterior view of Shafi Complex and Marquee in Jaranwala', note: 'Venue exterior' },
  { src: weddingImage, avifSrcSet: `${weddingImageSmall} 640w, ${weddingImageMedium} 800w, ${weddingImageLarge} 1200w`, category: 'Decor', alt: 'Ivory and green wedding stage presentation direction', note: 'Wedding stage direction' },
  { src: valimaImage, avifSrcSet: `${valimaImageSmall} 640w, ${valimaImageMedium} 800w, ${valimaImageLarge} 1200w`, category: 'Dining', alt: 'Warm ivory reception dining presentation direction', note: 'Reception dining direction' },
  { src: gatheringImage, avifSrcSet: `${gatheringImageSmall} 640w, ${gatheringImageMedium} 800w, ${gatheringImageLarge} 1200w`, category: 'Decor', alt: 'Green and gold evening gathering presentation direction', note: 'Evening decor direction' },
]

export const eventOptions = ['Wedding', 'Walima', 'Barat', 'Mehndi', 'Nikkah', 'Corporate event', 'Other event']
export const hallOptions = ['No preference', 'Hall 1', 'Hall 2']
export const packageOptions = ['No package preference', ...packages.map((item) => item.name)]
