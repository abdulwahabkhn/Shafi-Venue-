import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { get, put } from "@vercel/blob";

const maxAge = 60 * 60 * 8;
const cookieName = "shafi_admin";
export function requestUrl(request: Request) {
  try {
    return new URL(request.url);
  } catch {
    const host =
      request.headers.get("x-forwarded-host") || request.headers.get("host");
    const protocol = request.headers.get("x-forwarded-proto") || "https";
    if (!host) throw new Error("Request host is missing.");
    return new URL(request.url, `${protocol}://${host}`);
  }
}
export const configured = () =>
  Boolean(
    process.env.CMS_ADMIN_PASSWORD &&
    process.env.CMS_ADMIN_PASSWORD.length >= 16 &&
    process.env.CMS_SESSION_SECRET &&
    process.env.CMS_SESSION_SECRET.length >= 32,
  );
const digest = (value: string) => createHash("sha256").update(value).digest();
export const passwordMatches = (value: string) =>
  configured() &&
  timingSafeEqual(digest(value), digest(process.env.CMS_ADMIN_PASSWORD!));
const sign = (value: string) =>
  createHmac("sha256", process.env.CMS_SESSION_SECRET!)
    .update(value)
    .digest("base64url");
export function sessionValid(request: Request) {
  if (!configured()) return false;
  const token = request.headers
    .get("cookie")
    ?.split(";")
    .map((value) => value.trim())
    .find((value) => value.startsWith(`${cookieName}=`))
    ?.slice(cookieName.length + 1);
  if (!token || token.length > 1000) return false;
  const [payload, signature] = token.split(".");
  if (
    !payload ||
    !signature ||
    !timingSafeEqual(digest(signature), digest(sign(payload)))
  )
    return false;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    return (
      typeof data.expires === "number" &&
      data.expires > Date.now() &&
      data.passwordVersion ===
        digest(process.env.CMS_ADMIN_PASSWORD!).toString("hex")
    );
  } catch {
    return false;
  }
}
export function sessionCookie(request: Request, logout = false) {
  const payload = Buffer.from(
    JSON.stringify({
      expires: Date.now() + maxAge * 1000,
      nonce: randomBytes(16).toString("hex"),
      passwordVersion: digest(process.env.CMS_ADMIN_PASSWORD!).toString("hex"),
    }),
  ).toString("base64url");
  const secure =
    process.env.VERCEL || requestUrl(request).protocol === "https:";
  return `${cookieName}=${logout ? "" : `${payload}.${sign(payload)}`}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${logout ? 0 : maxAge}${secure ? "; Secure" : ""}`;
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return Boolean(origin && origin === requestUrl(request).origin);
}

// Production counters use conditional Blob writes, so limits survive serverless cold starts.
const attempts = new Map<string, { count: number; until: number }>();
export async function allowLogin(request: Request) {
  const key = request.headers.get("x-vercel-forwarded-for") || "local";
  const now = Date.now();
  if (process.env.VERCEL) {
    const bucket = Math.floor(now / (15 * 60 * 1000));
    const identity = createHmac("sha256", process.env.CMS_SESSION_SECRET!)
      .update(key)
      .digest("hex");
    const path = `cms/login-limits/${identity}.json`;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const blob = await get(path, { access: "public", useCache: false });
      const previous =
        blob?.statusCode === 200
          ? await new Response(blob.stream).json()
          : null;
      const count = previous?.bucket === bucket ? previous.count : 0;
      if (count >= 8) return false;
      try {
        await put(path, JSON.stringify({ bucket, count: count + 1 }), {
          access: "public",
          addRandomSuffix: false,
          contentType: "application/json",
          cacheControlMaxAge: 60,
          ...(blob ? { ifMatch: blob.blob.etag } : { allowOverwrite: false }),
        });
        return true;
      } catch (error) {
        if (
          !/condition|already exists/i.test(
            error instanceof Error ? error.message : "",
          )
        )
          throw error;
      }
    }
    return false;
  }
  for (const [ip, record] of attempts)
    if (record.until <= now) attempts.delete(ip);
  const record = attempts.get(key) ?? { count: 0, until: now + 15 * 60 * 1000 };
  if (record.count >= 8 || attempts.size > 10000) return false;
  record.count += 1;
  attempts.set(key, record);
  return true;
}
