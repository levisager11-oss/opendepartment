import { afterEach, expect, it, vi } from "vitest";
import { scrubImage } from "@/lib/tenant/scrub";
import { looksLikeSecretKey, parseSupabaseCredentials } from "@/lib/setup/credentials";
import { rateLimit } from "@/lib/rate-limit";
import { getLegalDoc } from "@/lib/legal";

afterEach(() => vi.useRealTimers());
const bytesOf = async (file: File) => [...new Uint8Array(await file.arrayBuffer())];
const jwt = (payload: object) => `${Buffer.from('{"alg":"HS256"}').toString("base64url")}.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.synthetic`;

it("strips JPEG EXIF while preserving the color profile and compressed scan bytes", async () => {
  const profile = [255, 226, 0, 4, 10, 20];
  const scan = [255, 218, 0, 2, 42, 255, 217];
  const file = new File([new Uint8Array([255, 216, 255, 225, 0, 5, 1, 2, 3, ...profile, ...scan])], "photo.jpg", { type: "image/jpeg", lastModified: 1234 });
  const result = await scrubImage(file);
  expect(result.scrubbed).toBe(true);
  expect(await bytesOf(result.file)).toEqual([255, 216, ...profile, ...scan]);
  expect(result.file.lastModified).toBe(1234);
});

it("keeps malformed or truncated image bytes intact", async () => {
  for (const type of ["image/jpeg", "image/png", "image/webp"]) {
    const file = new File([new Uint8Array([255, 216, 255, 225, 0, 250, 1])], "broken", { type });
    expect((await scrubImage(file)).file).toBe(file);
  }
});

it("removes PNG text metadata without changing retained chunk bytes", async () => {
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  const chunk = (type: string, data: number[]) => [0, 0, 0, data.length, ...[...type].map(c => c.charCodeAt(0)), ...data, 1, 2, 3, 4];
  const image = chunk("IDAT", [10, 20, 30]);
  const end = chunk("IEND", []);
  const file = new File([new Uint8Array([...signature, ...chunk("tEXt", [71, 80, 83]), ...image, ...end])], "photo.png", { type: "image/png" });
  const result = await scrubImage(file);
  expect(result.scrubbed).toBe(true);
  expect(await bytesOf(result.file)).toEqual([...signature, ...image, ...end]);
});

it("identifies unsupported image formats without changing non-image documents", async () => {
  const heic = new File(["photo"], "photo.heic", { type: "image/heic" });
  expect(await scrubImage(heic)).toEqual({ file: heic, scrubbed: false, unsupported: true });
  const pdf = new File(["%PDF"], "file.pdf", { type: "application/pdf" });
  expect(await scrubImage(pdf)).toEqual({ file: pdf, scrubbed: false, unsupported: false });
});

it("recognizes privileged Supabase keys before submission", () => {
  expect(looksLikeSecretKey(jwt({ role: "service_role", ref: "project" }))).toBe(true);
  expect(looksLikeSecretKey("sb_secret_synthetic" )).toBe(true);
  expect(looksLikeSecretKey(jwt({ role: "anon", ref: "project" }))).toBe(false);
});

it("extracts pasted coordinates and derives URLs only from valid project references", () => {
  const key = jwt({ role: "anon", ref: "audit-project" });
  expect(parseSupabaseCredentials(key)).toEqual({ url: "https://audit-project.supabase.co", key, derivedUrl: true });
  expect(parseSupabaseCredentials(`URL=https://regional.supabase.in\nKEY=${key}`).url).toBe("https://regional.supabase.in");
  expect(parseSupabaseCredentials(jwt({ ref: "bad/path" })).url).toBeNull();
});

it("enforces separate fixed windows and permits a new request at expiry", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-08T10:00:00Z"));
  expect(rateLimit("audit-window-a", 2, 5000).ok).toBe(true);
  expect(rateLimit("audit-window-a", 2, 5000).ok).toBe(true);
  expect(rateLimit("audit-window-a", 2, 5000)).toEqual({ ok: false, retryAfter: 5 });
  expect(rateLimit("audit-window-b", 2, 5000).ok).toBe(true);
  vi.advanceTimersByTime(5000);
  expect(rateLimit("audit-window-a", 2, 5000).ok).toBe(true);
});

// An imprint that exists only for departments is not an imprint for the
// platform -- which is itself a service somebody runs and can be complained
// about. Both locales carry it, and it must name where a complaint about a
// DEPARTMENT goes instead, since that is not the platform's to answer.
it.each(["en", "de"] as const)("publishes a platform imprint in %s", (locale) => {
  const doc = getLegalDoc("imprint", locale);
  expect(doc.title).toBe(locale === "de" ? "Impressum" : "Imprint");
  expect(doc.sections.length).toBeGreaterThan(0);
  const text = doc.sections.flatMap((s) => s.body).join(" ");
  expect(text).toContain("/d/");
  expect(text.length).toBeGreaterThan(200);
});

it("falls back to naming the missing configuration rather than a placeholder", () => {
  const text = getLegalDoc("imprint", "en").sections[0].body.join(" ");
  // Either real operator details, or an honest sentence about what is unset --
  // never "[Your name here]".
  expect(text).not.toMatch(/\[.*\]/);
});
