import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { contentSchema } from "../shared/content.js";
import {
  allowLogin,
  configured,
  passwordMatches,
  requestUrl,
  type RuntimeRequest,
  sameOrigin,
  sessionCookie,
  sessionValid,
} from "../server/auth.js";
import {
  localDirectory,
  localStorage,
  publishContent,
  readContent,
  saveImage,
  storageReady,
} from "../server/storage.js";

const json = (
  value: unknown,
  status = 200,
  headers: Record<string, string> = {},
) =>
  Response.json(value, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...headers,
    },
  });
async function limitedBody(request: RuntimeRequest, limit: number) {
  const rawBody = request.body;
  if (
    rawBody !== undefined &&
    rawBody !== null &&
    typeof (rawBody as ReadableStream).getReader !== "function"
  ) {
    if (Buffer.isBuffer(rawBody)) {
      if (rawBody.length > limit) throw new Error("TOO_LARGE");
      return rawBody;
    }
    if (rawBody instanceof Uint8Array) return Buffer.from(rawBody);
    if (typeof rawBody === "string") return Buffer.from(rawBody);
    return Buffer.from(JSON.stringify(rawBody));
  }
  const reader =
    typeof (rawBody as ReadableStream | undefined)?.getReader === "function"
      ? (rawBody as ReadableStream).getReader()
      : null;
  if (reader) {
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw new Error("TOO_LARGE");
      }
      chunks.push(value);
    }
    return Buffer.concat(chunks);
  }
  const nodeStream = request as unknown as AsyncIterable<Buffer>;
  if (typeof nodeStream[Symbol.asyncIterator] === "function") {
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const chunk of nodeStream) {
      size += chunk.length;
      if (size > limit) throw new Error("TOO_LARGE");
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }
  return Buffer.alloc(0);
}

// Vercel's Web runtime uses named HTTP methods. The default export remains for the local Vite adapter.
export async function GET(request: RuntimeRequest) {
  return handler(request);
}
export async function POST(request: RuntimeRequest) {
  return handler(request);
}
export default async function handler(
  request: RuntimeRequest,
): Promise<Response> {
  const url = requestUrl(request);
  const action = url.searchParams.get("action");
  try {
    if (request.method === "GET" && action === "session")
      return json({
        authenticated: sessionValid(request),
        configured: configured(),
        storageReady: storageReady(),
        local: localStorage(),
      });
    if (request.method === "GET" && action === "content") {
      if (!storageReady())
        return json({ content: null, revision: null, publishedAt: null });
      return json((await readContent()).document);
    }
    if (request.method === "GET" && action === "image" && localStorage()) {
      const name = url.searchParams.get("name") || "";
      if (!/^[a-f0-9-]{36}\.(webp|jpg|png)$/.test(name))
        return json({ error: "Image not found." }, 404);
      try {
        const bytes = await readFile(resolve(localDirectory(), "media", name));
        return new Response(bytes, {
          headers: {
            "Content-Type": `image/${name.endsWith(".jpg") ? "jpeg" : name.split(".").pop()}`,
            "Cache-Control": "public, max-age=31536000, immutable",
            "X-Content-Type-Options": "nosniff",
          },
        });
      } catch {
        return json({ error: "Image not found." }, 404);
      }
    }
    if (request.method !== "POST")
      return json({ error: "Method not allowed." }, 405, {
        Allow: "GET, POST",
      });
    if (!sameOrigin(request))
      return json({ error: "This request must come from the website." }, 403);
    if (!configured())
      return json(
        {
          error:
            "Admin access is not configured. Follow CMS.md to set the server credentials.",
        },
        503,
      );
    if (action === "login") {
      if (!(await allowLogin(request)))
        return json(
          { error: "Too many attempts. Wait 15 minutes before trying again." },
          429,
          { "Retry-After": "900" },
        );
      const data = JSON.parse((await limitedBody(request, 4096)).toString());
      if (typeof data.password !== "string" || !passwordMatches(data.password))
        return json(
          { error: "That password is incorrect. Please try again." },
          401,
        );
      return json({ authenticated: true }, 200, {
        "Set-Cookie": sessionCookie(request),
      });
    }
    if (!sessionValid(request))
      return json(
        { error: "Your session has ended. Sign in again to continue." },
        401,
      );
    if (action === "logout")
      return json({ authenticated: false }, 200, {
        "Set-Cookie": sessionCookie(request, true),
      });
    if (action === "publish") {
      const data = JSON.parse((await limitedBody(request, 512000)).toString());
      const parsed = contentSchema.safeParse(data.content);
      if (!parsed.success)
        return json(
          {
            error: parsed.error.issues
              .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
              .join("\n"),
          },
          400,
        );
      if (data.revision !== null && typeof data.revision !== "string")
        return json(
          { error: "Reload the published version before saving." },
          400,
        );
      return json(await publishContent(parsed.data, data.revision));
    }
    if (action === "upload") {
      const bytes = await limitedBody(request, 3 * 1024 * 1024);
      let format: { extension: string; mime: string } | undefined;
      if (
        bytes.subarray(0, 4).toString() === "RIFF" &&
        bytes.subarray(8, 12).toString() === "WEBP"
      )
        format = { extension: "webp", mime: "image/webp" };
      else if (bytes.subarray(0, 3).equals(Buffer.from([255, 216, 255])))
        format = { extension: "jpg", mime: "image/jpeg" };
      else if (
        bytes
          .subarray(0, 8)
          .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      )
        format = { extension: "png", mime: "image/png" };
      if (!format)
        return json({ error: "Choose a JPG, PNG or WebP image." }, 400);
      return json({
        url: await saveImage(bytes, format.extension, format.mime),
      });
    }
    return json({ error: "Unknown action." }, 404);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "CONFLICT" || /condition|already exists/i.test(message))
      return json(
        {
          error:
            "Another editor has published changes. Download your draft, then reload the published version before trying again.",
        },
        409,
      );
    if (message === "TOO_LARGE")
      return json(
        {
          error:
            "The upload is too large. Choose an image smaller than 3 MB after optimization.",
        },
        413,
      );
    if (error instanceof SyntaxError)
      return json({ error: "The request contains invalid JSON." }, 400);
    console.error(
      "CMS operation failed:",
      error instanceof Error ? error.name : "UnknownError",
    );
    return json(
      {
        error:
          "The content service is unavailable. Your unsaved changes are still in the editor. Please retry.",
      },
      503,
    );
  }
}
