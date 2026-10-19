import { createHash, timingSafeEqual } from "node:crypto";

export const fixtures = Array.from({ length: 12 }, (_, offset) => {
  const index = String(offset + 1).padStart(3, "0");
  const ext = index === "004" ? "mp3" : ["008", "009"].includes(index) ? "jpg" : "pdf";
  return {
    index,
    filename: `exhibit-${index}.${ext}`,
    mime: ext === "mp3" ? "audio/mpeg" : ext === "jpg" ? "image/jpeg" : "application/pdf",
    thumb: ext === "jpg" ? `exhibit-${index}-thumb.webp` : null,
  };
});

export function fixtureUploads(paths: string[]) {
  return fixtures.flatMap((fixture) => {
    const matches = paths.filter((path) =>
      new RegExp(`^[0-9a-f-]{36}/demo-seed/${fixture.index}-${fixture.filename.replace(".", "\\.")}$`).test(path));
    if (matches.length !== 1) throw new Error("Invalid fixture paths");
    const path = matches[0];
    const uploads = [{ path, filename: fixture.filename, mime: fixture.mime }];
    if (fixture.thumb) {
      const thumbPath = path.replace(/\.[^.]+$/, "-thumb.webp");
      if (!paths.includes(thumbPath)) throw new Error("Missing thumbnail path");
      uploads.push({ path: thumbPath, filename: fixture.thumb, mime: "image/webp" });
    }
    return uploads;
  });
}

export function authorized(header: string | null, secret: string) {
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(header ?? ""), digest(`Bearer ${secret}`));
}

export function batches<T>(items: T[], size = 100): T[][] {
  if (!Number.isInteger(size) || size < 1) throw new Error("Invalid batch size");
  return Array.from({ length: Math.ceil(items.length / size) }, (_, i) => items.slice(i * size, (i + 1) * size));
}
