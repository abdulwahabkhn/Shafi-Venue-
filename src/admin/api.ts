export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function cmsRequest<T>(
  action: string,
  body?: unknown,
): Promise<T> {
  const response = await fetch(
    `/api/cms?action=${action}`,
    body === undefined
      ? { cache: "no-store" }
      : {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
  );
  const result = await response.json();
  if (!response.ok)
    throw new ApiError(
      result.error || "The request failed. Please retry.",
      response.status,
    );
  return result;
}
export async function uploadImage(file: File) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error("Choose a JPG, PNG or WebP image.");
  if (file.size > 20 * 1024 * 1024)
    throw new Error("Choose an original image smaller than 20 MB.");
  const bitmap = await createImageBitmap(file);
  if (bitmap.width * bitmap.height > 80_000_000) {
    bitmap.close();
    throw new Error(
      "This image is too large to process. Export a smaller copy.",
    );
  }
  const ratio = Math.min(1, 1920 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
  canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("Your browser could not prepare this image.");
  }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (value) =>
        value
          ? resolve(value)
          : reject(new Error("Image optimization failed.")),
      "image/webp",
      0.84,
    ),
  );
  if (blob.size > 3 * 1024 * 1024)
    throw new Error(
      "Image is still larger than 3 MB after optimization. Please use a smaller original.",
    );
  const response = await fetch("/api/cms?action=upload", {
    method: "POST",
    headers: { "Content-Type": blob.type },
    body: blob,
  });
  const result = await response.json();
  if (!response.ok)
    throw new ApiError(
      result.error || "Upload failed. Please retry.",
      response.status,
    );
  return result.url as string;
}
