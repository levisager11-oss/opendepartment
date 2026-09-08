import { expect, it } from "vitest";
import { safeLocalPath, departmentSlug } from "@/lib/navigation";

it.each(["//example.test", "/\\example.test", "/\n/example.test", "https://example.test", "javascript:alert(1)", null, ["/account"]])("rejects unsafe redirects: %s", (path) => {
  expect(safeLocalPath(path, "/account")).toBe("/account");
});
it("normalizes traversal before enforcing department scope", () => {
  expect(safeLocalPath("/d/one/../two/vault", "/d/one/vault", "/d/one")).toBe("/d/one/vault");
  expect(safeLocalPath("/d/one/%2e%2e/two", "/d/one/vault", "/d/one")).toBe("/d/one/vault");
  expect(safeLocalPath("/d/one/vault?q=hello", "/d/one/vault", "/d/one")).toBe("/d/one/vault?q=hello");
});
it.each(["archive", "/d/archive/join?code=example#top", "https://example.test/d/archive?utm_source=test#top"]) ("extracts a reportable slug from %s", (value) => {
  expect(departmentSlug(value)).toBe("archive");
});
it.each(["a", "archive?bad", "https://example.test/not-a-department", "../archive"])("rejects invalid report targets: %s", (value) => {
  expect(departmentSlug(value)).toBe("");
});
