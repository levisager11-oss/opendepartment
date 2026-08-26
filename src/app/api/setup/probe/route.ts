import { NextResponse } from "next/server";
import { probeTenant } from "@/lib/tenant/branding";

/**
 * Ask a candidate Supabase project whether it is ready to become a department.
 *
 * The URL is pinned to the Supabase hostname pattern before we touch it. This
 * endpoint takes a user-supplied address and makes a server-side request to
 * it, which is exactly the shape of an SSRF, so the allowed target set has to
 * be closed rather than merely discouraged.
 */
const SUPABASE_HOST = /^https:\/\/[a-z0-9-]+\.supabase\.(co|in)$/;

/**
 * Whether this key grants more than the browser should ever hold.
 *
 * Supabase has two key generations and both need catching:
 *
 *   - legacy: a JWT whose payload carries role "service_role"
 *   - current: an opaque string prefixed "sb_secret_"
 *
 * The prefix test comes FIRST and outside the try. An opaque key has no "."
 * to split on, so a JWT-shaped check returns early and never reaches a
 * fallback placed in the catch -- which is how a real sb_secret_ key would
 * otherwise be accepted and stored.
 */
function looksLikeServiceKey(key: string): boolean {
  if (key.startsWith("sb_secret_")) return true;

  const payload = key.split(".")[1];
  if (!payload) return false;

  try {
    const json = JSON.parse(
      Buffer.from(payload, "base64").toString("utf8")
    ) as { role?: string };
    return json.role === "service_role";
  } catch {
    // Not decodable as a JWT payload. Anything unrecognised is left to the
    // probe below, which fails safely because the key simply will not work.
    return false;
  }
}

export async function POST(request: Request) {
  let body: { url?: string; key?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  }

  const url = (body.url ?? "").trim().replace(/\/+$/, "");
  const key = (body.key ?? "").trim();

  if (!SUPABASE_HOST.test(url)) {
    return NextResponse.json({ error: "BAD_URL" }, { status: 400 });
  }
  if (!key) {
    return NextResponse.json({ error: "BAD_KEY" }, { status: 400 });
  }
  if (looksLikeServiceKey(key)) {
    return NextResponse.json({ error: "SERVICE_KEY" }, { status: 400 });
  }

  const result = await probeTenant(url, key);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 200 });
  }
  return NextResponse.json({ ok: true, claimed: result.claimed });
}
