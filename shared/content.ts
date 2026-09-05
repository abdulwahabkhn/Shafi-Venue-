import { z } from "zod";

const text = z.string().trim().max(3000);
const label = z.string().trim().min(1).max(160);
const image = z
  .string()
  .max(2000)
  .refine(
    (value) =>
      value === "" ||
      /^\/(?!\/)[^\\]*$/.test(value) ||
      /^https:\/\/[^\s]+$/.test(value),
    "Use an uploaded image, a local path, or an HTTPS image URL.",
  );
const link = z
  .string()
  .trim()
  .max(2000)
  .refine(
    (value) => value === "" || /^https:\/\/[^\s]+$/.test(value),
    "Use a full HTTPS link.",
  );
const heading = z.object({ title: label, description: text });
export const contentSchema = z.object({
  hero: z.object({
    title: label,
    description: text,
    image,
    desktopAvif: image,
    mobileAvif: image,
  }),
  headings: z.object({
    halls: heading,
    services: heading,
    experience: heading,
    packages: heading,
    gallery: heading,
    booking: heading,
    contact: heading,
  }),
  halls: z
    .array(
      z.object({
        name: label,
        image,
        imageAvif: z.string().max(5000),
        summary: text,
        capacity: text,
        occasions: z.array(label).max(20),
        imageNote: text,
      }),
    )
    .min(1)
    .max(12),
  services: z
    .array(
      z.object({
        icon: z.enum([
          "planning",
          "decor",
          "catering",
          "dining",
          "guests",
          "security",
        ]),
        title: label,
        copy: text,
      }),
    )
    .min(1)
    .max(30),
  journey: z
    .array(z.object({ title: label, copy: text }))
    .min(1)
    .max(12),
  packages: z
    .array(
      z.object({
        name: label,
        summary: text,
        includes: z.array(label).max(30),
      }),
    )
    .max(20),
  galleryItems: z
    .array(
      z.object({
        src: image.refine(Boolean, "Choose an image."),
        avifSrcSet: z.string().max(5000).optional(),
        category: label,
        alt: label,
        note: text,
      }),
    )
    .max(100),
  contact: z.object({
    phoneDisplay: label,
    whatsappNumber: z
      .string()
      .regex(/^\d{10,15}$/, "Use country code and digits, e.g. 923138220777."),
    emailAddress: z.email(),
    address: label,
    mapsUrl: link,
    hours: text,
    facebook: link,
    instagram: link,
  }),
  packageDisclosure: text,
  footerNote: text,
});
export type SiteContent = z.infer<typeof contentSchema>;
export type PublishedContent = {
  content: SiteContent | null;
  revision: string | null;
  publishedAt: string | null;
};
