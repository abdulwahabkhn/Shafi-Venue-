import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { get, put } from "@vercel/blob";
import type { PublishedContent, SiteContent } from "../shared/content.js";

const pathname = "cms/published.json";
const empty: PublishedContent = {
  content: null,
  revision: null,
  publishedAt: null,
};
export const localStorage = () =>
  !process.env.VERCEL &&
  !process.env.BLOB_READ_WRITE_TOKEN &&
  !process.env.BLOB_STORE_ID;
export const storageReady = () =>
  localStorage() ||
  Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
export const localDirectory = () =>
  resolve(process.env.CMS_LOCAL_DIRECTORY || ".cms-local");
export async function readContent(): Promise<{
  document: PublishedContent;
  etag?: string;
}> {
  if (localStorage()) {
    try {
      return {
        document: JSON.parse(
          await readFile(resolve(localDirectory(), "published.json"), "utf8"),
        ),
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT")
        return { document: empty };
      throw error;
    }
  }
  const blob = await get(pathname, { access: "public", useCache: false });
  if (!blob) return { document: empty };
  if (blob.statusCode !== 200)
    throw new Error("Cannot read published content.");
  return {
    document: await new Response(blob.stream).json(),
    etag: blob.blob.etag,
  };
}
let writing = false;
export async function publishContent(
  content: SiteContent,
  revision: string | null,
) {
  if (writing) throw new Error("CONFLICT");
  writing = true;
  try {
    const current = await readContent();
    if (current.document.revision !== revision) throw new Error("CONFLICT");
    const document: PublishedContent = {
      content,
      revision: randomUUID(),
      publishedAt: new Date().toISOString(),
    };
    if (localStorage()) {
      await mkdir(resolve(localDirectory(), "history"), { recursive: true });
      if (current.document.content)
        await writeFile(
          resolve(
            localDirectory(),
            "history",
            `${current.document.revision}.json`,
          ),
          JSON.stringify(current.document),
        );
      const temporary = resolve(localDirectory(), `${document.revision}.tmp`);
      await writeFile(temporary, JSON.stringify(document));
      await rename(temporary, resolve(localDirectory(), "published.json"));
    } else {
      if (current.document.content)
        await put(
          `cms/history/${current.document.revision}-${randomUUID()}.json`,
          JSON.stringify(current.document),
          {
            access: "public",
            addRandomSuffix: false,
            contentType: "application/json",
          },
        );
      await put(pathname, JSON.stringify(document), {
        access: "public",
        addRandomSuffix: false,
        contentType: "application/json",
        cacheControlMaxAge: 60,
        ...(current.etag
          ? { ifMatch: current.etag }
          : { allowOverwrite: false }),
      });
    }
    return document;
  } finally {
    writing = false;
  }
}
export async function saveImage(
  bytes: Buffer,
  extension: string,
  contentType: string,
) {
  const name = `${randomUUID()}.${extension}`;
  if (localStorage()) {
    await mkdir(resolve(localDirectory(), "media"), { recursive: true });
    await writeFile(resolve(localDirectory(), "media", name), bytes);
    return `/api/cms?action=image&name=${name}`;
  }
  const blob = await put(`cms/media/${name}`, bytes, {
    access: "public",
    addRandomSuffix: false,
    contentType,
    cacheControlMaxAge: 31536000,
  });
  return blob.url;
}
