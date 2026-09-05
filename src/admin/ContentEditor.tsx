import { Plus } from "lucide-react";
import type { SiteContent } from "../../shared/content";
import { ImageField, ItemActions, TextField } from "./EditorFields";

export const sections = [
  {
    id: "hero",
    label: "Hero",
    description:
      "The first impression. Update the main photograph and welcome message.",
  },
  {
    id: "halls",
    label: "Halls",
    description:
      "Present each space with its photograph, capacity and suitable occasions.",
  },
  {
    id: "services",
    label: "Services",
    description:
      "Keep the services on offer clear, current and easy to understand.",
  },
  {
    id: "journey",
    label: "Event journey",
    description:
      "Explain how guests move from their first enquiry to the celebration.",
  },
  {
    id: "packages",
    label: "Packages",
    description:
      "Manage package outlines and inclusions approved by the venue.",
  },
  {
    id: "galleryItems",
    label: "Gallery",
    description:
      "Add photographs, organize categories and describe what each image shows.",
  },
  {
    id: "booking",
    label: "Booking",
    description:
      "Set the enquiry introduction. Halls and packages automatically update the form choices.",
  },
  {
    id: "contact",
    label: "Contact & footer",
    description:
      "Keep the venue’s contact details, social links and opening hours up to date.",
  },
] as const;
export type SectionId = (typeof sections)[number]["id"];
type Props = {
  section: SectionId;
  content: SiteContent;
  onChange: (content: SiteContent) => void;
  onBusy: (busy: boolean) => void;
};
type CollectionKey =
  "halls" | "services" | "journey" | "packages" | "galleryItems";

export function ContentEditor({ section, content, onChange, onBusy }: Props) {
  function field<K extends keyof SiteContent>(key: K, value: SiteContent[K]) {
    onChange({ ...content, [key]: value });
  }
  function updateItem<K extends CollectionKey>(
    key: K,
    index: number,
    value: Partial<SiteContent[K][number]>,
  ) {
    field(
      key,
      content[key].map((item, i) =>
        i === index ? { ...item, ...value } : item,
      ) as SiteContent[K],
    );
  }
  function actions(
    key: CollectionKey,
    index: number,
    name: string,
    minimum = 0,
  ) {
    return (
      <ItemActions
        name={name || "item"}
        index={index}
        length={content[key].length}
        minimum={minimum}
        onMove={(i, direction) => {
          const items = [...content[key]];
          [items[i], items[i + direction]] = [items[i + direction], items[i]];
          onChange({ ...content, [key]: items });
        }}
        onRemove={(i) =>
          onChange({
            ...content,
            [key]: content[key].filter((_, itemIndex) => itemIndex !== i),
          })
        }
      />
    );
  }
  const headingKey =
    section === "journey"
      ? "experience"
      : section === "galleryItems"
        ? "gallery"
        : section === "hero"
          ? null
          : section;
  const heading = headingKey ? content.headings[headingKey] : null;
  return (
    <div className="cms-editor-fields">
      {heading && headingKey && (
        <div className="cms-field-group">
          <TextField
            label="Section heading"
            value={heading.title}
            onChange={(title) =>
              field("headings", {
                ...content.headings,
                [headingKey]: { ...heading, title },
              })
            }
          />
          <TextField
            label="Section introduction"
            multiline
            value={heading.description}
            onChange={(description) =>
              field("headings", {
                ...content.headings,
                [headingKey]: { ...heading, description },
              })
            }
          />
        </div>
      )}
      {section === "hero" && (
        <>
          <ImageField
            label="Hero image"
            value={content.hero.image}
            onBusy={onBusy}
            onChange={(image) =>
              field("hero", {
                ...content.hero,
                image,
                mobileAvif: "",
                desktopAvif: "",
              })
            }
          />
          <TextField
            label="Main headline"
            value={content.hero.title}
            onChange={(title) => field("hero", { ...content.hero, title })}
            hint="Keep this short enough to read comfortably on a phone."
          />
          <TextField
            label="Supporting message"
            multiline
            value={content.hero.description}
            onChange={(description) =>
              field("hero", { ...content.hero, description })
            }
          />
          <aside className="cms-note">
            Use a wide photograph with the main subject toward the centre or
            right. The website places the headline on the left.
          </aside>
        </>
      )}
      {section === "halls" && (
        <>
          {content.halls.map((item, index) => (
            <fieldset className="cms-entry" key={index}>
              <legend>{item.name || "New hall"}</legend>
              {actions("halls", index, item.name, 1)}
              <ImageField
                value={item.image}
                onBusy={onBusy}
                onChange={(image) =>
                  updateItem("halls", index, { image, imageAvif: "" })
                }
              />
              <div className="cms-two-columns">
                <TextField
                  label="Hall name"
                  value={item.name}
                  onChange={(name) => updateItem("halls", index, { name })}
                />
                <TextField
                  label="Guest capacity"
                  value={item.capacity}
                  onChange={(capacity) =>
                    updateItem("halls", index, { capacity })
                  }
                />
              </div>
              <TextField
                label="Description"
                multiline
                value={item.summary}
                onChange={(summary) => updateItem("halls", index, { summary })}
              />
              <TextField
                label="Suitable occasions"
                value={item.occasions.join(", ")}
                onChange={(value) =>
                  updateItem("halls", index, {
                    occasions: value.split(",").map((v) => v.trim()),
                  })
                }
                hint="Separate occasions with commas."
              />
              <TextField
                label="Image caption / disclosure"
                value={item.imageNote}
                onChange={(imageNote) =>
                  updateItem("halls", index, { imageNote })
                }
              />
            </fieldset>
          ))}
          <button
            className="cms-button"
            disabled={content.halls.length >= 12}
            onClick={() =>
              field("halls", [
                ...content.halls,
                {
                  name: "New hall",
                  summary: "",
                  capacity: "Capacity to be confirmed",
                  occasions: ["Wedding"],
                  image: "",
                  imageAvif: "",
                  imageNote: "",
                },
              ])
            }
          >
            <Plus aria-hidden="true" />
            Add hall
          </button>
        </>
      )}
      {section === "services" && (
        <>
          {content.services.map((item, index) => (
            <fieldset className="cms-entry" key={index}>
              <legend>{item.title || "New service"}</legend>
              {actions("services", index, item.title, 1)}
              <div className="cms-two-columns">
                <TextField
                  label="Service name"
                  value={item.title}
                  onChange={(title) => updateItem("services", index, { title })}
                />
                <label className="cms-field">
                  Icon
                  <select
                    value={item.icon}
                    onChange={(event) =>
                      updateItem("services", index, {
                        icon: event.target.value as typeof item.icon,
                      })
                    }
                  >
                    <option value="planning">Planning checklist</option>
                    <option value="decor">Decoration flower</option>
                    <option value="catering">Catering pot</option>
                    <option value="dining">Dining cutlery</option>
                    <option value="guests">Guests</option>
                    <option value="security">Security shield</option>
                  </select>
                </label>
              </div>
              <TextField
                label="Service description"
                multiline
                value={item.copy}
                onChange={(copy) => updateItem("services", index, { copy })}
              />
            </fieldset>
          ))}
          <button
            className="cms-button"
            disabled={content.services.length >= 30}
            onClick={() =>
              field("services", [
                ...content.services,
                { title: "New service", icon: "planning", copy: "" },
              ])
            }
          >
            <Plus aria-hidden="true" />
            Add service
          </button>
        </>
      )}
      {section === "journey" && (
        <>
          {content.journey.map((item, index) => (
            <fieldset className="cms-entry" key={index}>
              <legend>
                Step {index + 1}: {item.title}
              </legend>
              {actions("journey", index, item.title, 1)}
              <TextField
                label="Step title"
                value={item.title}
                onChange={(title) => updateItem("journey", index, { title })}
              />
              <TextField
                label="What happens"
                multiline
                value={item.copy}
                onChange={(copy) => updateItem("journey", index, { copy })}
              />
            </fieldset>
          ))}
          <button
            className="cms-button"
            disabled={content.journey.length >= 12}
            onClick={() =>
              field("journey", [
                ...content.journey,
                { title: "New step", copy: "" },
              ])
            }
          >
            <Plus aria-hidden="true" />
            Add step
          </button>
        </>
      )}
      {section === "packages" && (
        <>
          {content.packages.length === 0 && (
            <p className="cms-note">
              No packages yet. Add an approved outline to help visitors plan
              their enquiry.
            </p>
          )}
          {content.packages.map((item, index) => (
            <fieldset className="cms-entry" key={index}>
              <legend>{item.name || "New package"}</legend>
              {actions("packages", index, item.name)}
              <TextField
                label="Package name"
                value={item.name}
                onChange={(name) => updateItem("packages", index, { name })}
              />
              <TextField
                label="Package description"
                multiline
                value={item.summary}
                onChange={(summary) =>
                  updateItem("packages", index, { summary })
                }
              />
              <TextField
                label="Inclusions"
                multiline
                value={item.includes.join("\n")}
                onChange={(value) =>
                  updateItem("packages", index, { includes: value.split("\n") })
                }
                hint="One inclusion per line. Only list arrangements approved by the venue."
              />
            </fieldset>
          ))}
          <button
            className="cms-button"
            disabled={content.packages.length >= 20}
            onClick={() =>
              field("packages", [
                ...content.packages,
                { name: "New package", summary: "", includes: [] },
              ])
            }
          >
            <Plus aria-hidden="true" />
            Add package
          </button>
          <TextField
            label="Package notice"
            multiline
            value={content.packageDisclosure}
            onChange={(value) => field("packageDisclosure", value)}
          />
        </>
      )}
      {section === "galleryItems" && (
        <>
          {content.galleryItems.length === 0 && (
            <p className="cms-note">
              Your gallery is empty. Add a photograph to begin.
            </p>
          )}
          {content.galleryItems.map((item, index) => (
            <fieldset className="cms-entry" key={index}>
              <legend>{item.note || `Photograph ${index + 1}`}</legend>
              {actions(
                "galleryItems",
                index,
                item.note || `photograph ${index + 1}`,
              )}
              <ImageField
                value={item.src}
                onBusy={onBusy}
                onChange={(src) =>
                  updateItem("galleryItems", index, { src, avifSrcSet: "" })
                }
              />
              <div className="cms-two-columns">
                <TextField
                  label="Caption"
                  value={item.note}
                  onChange={(note) =>
                    updateItem("galleryItems", index, { note })
                  }
                />
                <TextField
                  label="Category"
                  value={item.category}
                  onChange={(category) =>
                    updateItem("galleryItems", index, { category })
                  }
                  hint="For example: Hall 1, Hall 2, Decor or Dining."
                />
              </div>
              <TextField
                label="Image description (alt text)"
                value={item.alt}
                onChange={(alt) => updateItem("galleryItems", index, { alt })}
                hint="Describe the scene for visitors who cannot see the image."
              />
            </fieldset>
          ))}
          <button
            className="cms-button"
            disabled={content.galleryItems.length >= 100}
            onClick={() =>
              field("galleryItems", [
                ...content.galleryItems,
                { src: "", alt: "", category: "Venue", note: "" },
              ])
            }
          >
            <Plus aria-hidden="true" />
            Add photograph
          </button>
        </>
      )}
      {section === "booking" && (
        <aside className="cms-note">
          The booking form continues to prepare an enquiry in WhatsApp. Update
          the destination number in Contact & footer. The form’s hall and
          package choices follow the items you publish here.
        </aside>
      )}
      {section === "contact" && (
        <>
          <div className="cms-two-columns">
            {(
              [
                "phoneDisplay",
                "whatsappNumber",
                "emailAddress",
                "address",
                "mapsUrl",
                "hours",
                "facebook",
                "instagram",
              ] as const
            ).map((key) => (
              <TextField
                key={key}
                label={
                  {
                    phoneDisplay: "Display phone number",
                    whatsappNumber: "WhatsApp number",
                    emailAddress: "Email address",
                    address: "Venue address",
                    mapsUrl: "Google Maps link",
                    hours: "Business hours",
                    facebook: "Facebook URL",
                    instagram: "Instagram URL",
                  }[key]
                }
                value={content.contact[key]}
                onChange={(value) =>
                  field("contact", { ...content.contact, [key]: value })
                }
                hint={
                  key === "whatsappNumber"
                    ? "Country code and digits only: 923138220777"
                    : key === "facebook" || key === "instagram"
                      ? "Optional. Use the full HTTPS address."
                      : undefined
                }
              />
            ))}
          </div>
          <TextField
            label="Footer notice"
            multiline
            value={content.footerNote}
            onChange={(value) => field("footerNote", value)}
          />
        </>
      )}
    </div>
  );
}
