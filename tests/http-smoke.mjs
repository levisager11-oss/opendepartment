import assert from "node:assert/strict";

// Run against a separately started local production build with no Supabase env.
const base = new URL(process.env.AUDIT_BASE_URL ?? "http://127.0.0.1:3000");
assert.ok(["127.0.0.1", "localhost"].includes(base.hostname), "Smoke tests require a loopback server");
let previousNonce;
for (const path of ["/", "/directory", "/new", "/account/login", "/report", "/legal/terms", "/legal/privacy"]) {
  const response = await fetch(new URL(path, base));
  assert.equal(response.status, 200, path);
  const csp = response.headers.get("content-security-policy");
  assert.ok(csp?.includes("frame-ancestors 'none'"), `${path}: CSP`);
  const nonce = /'nonce-([^']+)'/.exec(csp)?.[1];
  assert.ok(nonce && nonce !== previousNonce, `${path}: unique nonce`);
  previousNonce = nonce;
  const html = await response.text();
  assert.ok(html.includes(`nonce="${nonce}"`), `${path}: HTML nonce matches policy`);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("x-frame-options"), "DENY");
  console.log(`PASS ${path}: rendered with matching CSP nonce and response headers`);
}
for (const path of ["/d/audit-missing-department", "/not-an-audit-route"]) {
  assert.equal((await fetch(new URL(path, base))).status, 404, path);
  console.log(`PASS ${path}: 404`);
}
for (const path of ["/api/setup/probe", "/api/setup/provision", "/api/setup/deprovision"]) {
  const response = await fetch(new URL(path, base), {
    method: "POST", headers: { origin: "https://foreign.example", "content-type": "application/json" }, body: "{}",
  });
  assert.equal(response.status, 403, `${path}: cross-origin refusal`);
  console.log(`PASS ${path}: cross-origin mutation refused`);
}
console.log("12 local production smoke checks passed");
