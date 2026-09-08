import { expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ accept: "", cookie: "" }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => ({ value: state.cookie }) }), headers: async () => new Headers({ "accept-language": state.accept }) }));
import { detectLocale } from "@/lib/i18n/detect";
it.each([
  ["de-CH,de;q=0.9,en;q=0.8", "de"],
  ["de;q=0,en;q=0.1", "en"],
  ["den;q=1,en;q=0.7", "en"],
  ["de;q=invalid,en", "en"],
  ["fr,de;q=0.8,en;q=0.9", "en"],
  ["de;q=2,en;q=0.9", "en"],
])("honors language quality and valid tags: %s", async (accept, expected) => {
  state.cookie = ""; state.accept = accept;
  expect(await detectLocale()).toBe(expected);
});
it("prioritizes an explicit language choice", async () => {
  state.cookie = "de"; state.accept = "en";
  expect(await detectLocale()).toBe("de");
});
