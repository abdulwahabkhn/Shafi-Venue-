import type { Plugin } from "vite";
import handler from "../api/cms.js";

export function cmsPlugin(): Plugin {
  return {
    name: "shafi-local-cms",
    configureServer(server) {
      server.middlewares.use("/api/cms", async (incoming, outgoing) => {
        try {
          const origin = `http://${incoming.headers.host}`;
          const headers = new Headers();
          for (const [key, value] of Object.entries(incoming.headers))
            if (value)
              headers.set(key, Array.isArray(value) ? value.join(", ") : value);
          const method = incoming.method || "GET";
          const chunks: Buffer[] = [];
          let size = 0;
          for await (const chunk of incoming) {
            size += chunk.length;
            if (size > 3 * 1024 * 1024) {
              outgoing.writeHead(413);
              outgoing.end('{"error":"Upload exceeds 3 MB."}');
              return;
            }
            chunks.push(chunk);
          }
          const request = new Request(
            `${origin}/api/cms${incoming.url || ""}`,
            {
              method,
              headers,
              ...(method !== "GET" && method !== "HEAD"
                ? { body: Buffer.concat(chunks) }
                : {}),
            },
          );
          const response = await handler(request);
          outgoing.writeHead(
            response.status,
            Object.fromEntries(response.headers.entries()),
          );
          outgoing.end(Buffer.from(await response.arrayBuffer()));
        } catch {
          outgoing.writeHead(500);
          outgoing.end('{"error":"Local CMS unavailable."}');
        }
      });
    },
  };
}
