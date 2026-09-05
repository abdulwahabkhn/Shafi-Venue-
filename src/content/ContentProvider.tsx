import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { PublishedContent, SiteContent } from "../../shared/content";
import { defaultContent } from "./defaults";

const ContentContext = createContext(defaultContent);
export function ContentProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<SiteContent>(defaultContent);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/cms?action=content", { signal: controller.signal })
      .then((response) =>
        response.ok ? (response.json() as Promise<PublishedContent>) : null,
      )
      .then((result) => {
        if (result?.content) setContent(result.content);
      })
      .catch(() => {
        /* The prerendered content remains available during outages. */
      });
    return () => controller.abort();
  }, []);
  return (
    <ContentContext.Provider value={content}>
      {children}
    </ContentContext.Provider>
  );
}
export const useSiteContent = () => useContext(ContentContext);
