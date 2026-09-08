import { NextResponse } from "next/server";
import { requestOrigin } from "./origin";

/** Cookie-authorized mutations are only used by this app's own browser UI. */
export function sameOrigin(request: Request): boolean {
  return request.headers.get("origin") === requestOrigin(request.headers);
}

export async function readJsonObject(request: Request, maxBytes = 16_384): Promise<
  { ok: true; value: Record<string, unknown> } | { ok: false; response: NextResponse }
> {
  const refuse = (status: number, error: string) => ({ ok: false as const, response: NextResponse.json({ error }, { status }) });
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") return refuse(415, "BAD_REQUEST");
  if (!request.body) return refuse(400, "BAD_REQUEST");
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let text = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maxBytes) { await reader.cancel(); return refuse(413, "BAD_REQUEST"); }
      text += decoder.decode(value, { stream: true });
    }
    const value: unknown = JSON.parse(text + decoder.decode());
    if (!value || typeof value !== "object" || Array.isArray(value)) return refuse(400, "BAD_REQUEST");
    return { ok: true, value: value as Record<string, unknown> };
  } catch { return refuse(400, "BAD_REQUEST"); }
  finally { reader.releaseLock(); }
}

export function stringFields(body: Record<string, unknown>, fields: string[]): boolean {
  return fields.every((field) => body[field] === undefined || typeof body[field] === "string");
}
