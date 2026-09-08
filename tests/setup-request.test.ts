import { expect, it } from "vitest";
import { readJsonObject, sameOrigin, stringFields } from "@/lib/setup/request";
import { requestOrigin } from "@/lib/setup/origin";

const request = (body: string, contentType = "application/json") => new Request("https://archive.test/api/setup/probe", {
  method: "POST", headers: { host: "archive.test", origin: "https://archive.test", "content-type": contentType }, body,
});
it.each(["null", "[]", "123", '"string"', "{"])("rejects non-object JSON without throwing: %s", async (body) => {
  const result = await readJsonObject(request(body));
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.response.status).toBe(400);
});
it("bounds actual bytes, including a body without Content-Length", async () => {
  const result = await readJsonObject(request(JSON.stringify({ value: "é".repeat(20) })), 30);
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.response.status).toBe(413);
});
it("rejects form-compatible JSON and wrong field types", async () => {
  expect((await readJsonObject(request('{"slug":"valid"}', "text/plain"))).ok).toBe(false);
  expect(stringFields({ slug: 4 }, ["slug"])).toBe(false);
  expect(stringFields({ slug: "valid" }, ["slug", "ref"])).toBe(true);
});
it("requires the browser's origin to match the proxy-validated request host", () => {
  expect(sameOrigin(request("{}"))).toBe(true);
  const forged = request("{}");
  forged.headers.set("origin", "https://another.archive.test");
  expect(sameOrigin(forged)).toBe(false);
  forged.headers.delete("origin");
  expect(sameOrigin(forged)).toBe(false);
  expect(requestOrigin(new Headers({ host: "archive.test", "x-forwarded-host": "evil.test/path", "x-forwarded-proto": "javascript" }))).toBe("https://archive.test");
});
