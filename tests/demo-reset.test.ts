import { describe, expect, it } from "vitest";
import { authorized, batches, fixtures, fixtureUploads } from "@/lib/demo/reset";

describe("demo reset helpers", () => {
  const paths = fixtures.flatMap(f => {
    const original = `22222222-2222-4222-8222-222222222222/demo-seed/${f.index}-${f.filename}`;
    return f.thumb ? [original, original.replace(/\.[^.]+$/, "-thumb.webp")] : [original];
  });
  it("maps originals and thumbnails using returned owner paths", () => {
    const uploads = fixtureUploads(paths);
    expect(uploads).toHaveLength(14);
    expect(uploads.filter(u => u.mime === "image/webp")).toHaveLength(2);
    expect(uploads.find(u => u.filename === "exhibit-004.mp3")?.mime).toBe("audio/mpeg");
    expect(uploads.every(u => paths.includes(u.path))).toBe(true);
    expect(() => fixtureUploads(paths.slice(1))).toThrow();
    expect(() => fixtureUploads([...paths, paths[0]])).toThrow();
    expect(() => fixtureUploads(paths.filter(p => !p.endsWith("-thumb.webp")))).toThrow();
  });
  it("requires the exact bearer header", () => {
    expect(authorized("Bearer secret", "secret")).toBe(true);
    for (const value of [null, "", "secret", "bearer secret", "Bearer wrong", "Bearer secret "]) {
      expect(authorized(value, "secret")).toBe(false);
    }
  });
  it("batches all objects with a maximum of 100", () => {
    const input = Array.from({ length: 201 }, (_, i) => i);
    expect(batches(input).map(b => b.length)).toEqual([100, 100, 1]);
    expect(batches(input).flat()).toEqual(input);
    expect(batches([])).toEqual([]);
    expect(() => batches(input, 0)).toThrow();
  });
});
