import * as site from "../data/site";
import type { SiteContent } from "../../shared/content";

export const defaultContent: SiteContent = {
  hero: site.hero,
  halls: site.halls,
  services: site.services as SiteContent["services"],
  journey: site.journey,
  packages: site.packages,
  galleryItems: site.galleryItems,
  contact: {
    phoneDisplay: site.phoneDisplay,
    whatsappNumber: site.whatsappNumber,
    emailAddress: site.emailAddress,
    address: site.address,
    mapsUrl: site.mapsUrl,
    hours: "Business hours to be supplied",
    facebook: "",
    instagram: "",
  },
  headings: {
    halls: {
      title: "Two halls. One considered celebration.",
      description:
        "Explore both spaces, then confirm capacity, layout and availability directly with the venue team. No unverified capacity figures are presented here.",
    },
    services: {
      title: "The details that hold the day together.",
      description:
        "Start with the services relevant to your occasion. Availability, inclusions and final arrangements are confirmed by the venue team.",
    },
    experience: {
      title: "From first question to event day.",
      description:
        "A clear, human process keeps every decision connected. Booking remains provisional until the venue team confirms availability and terms.",
    },
    packages: {
      title: "Begin with an outline. Shape the rest together.",
      description:
        "These are editable enquiry starting points, not confirmed commercial packages. Pricing and final inclusions are discussed directly with Shafi Complex & Marquee.",
    },
    gallery: {
      title: "A glimpse of the atmosphere.",
      description:
        "The exterior image shows the venue. Decor and dining images communicate presentation direction and must be replaced with approved venue photography before commercial launch.",
    },
    booking: {
      title: "Tell us what you are planning.",
      description:
        "Share the essentials and continue the conversation on WhatsApp. Every booking, package and date remains subject to direct confirmation.",
    },
    contact: {
      title: "Visit the venue. Speak with the team.",
      description:
        "For availability, viewing arrangements and event questions, contact Shafi Complex & Marquee directly.",
    },
  },
  packageDisclosure:
    "Package names and inclusions are presentation examples only. The venue must supply approved packages, prices and terms before launch.",
  footerNote: "Package prices, capacities and hours require venue approval.",
};
