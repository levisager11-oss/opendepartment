import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { authorized, batches, fixtureUploads } from "@/lib/demo/reset";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const json = (body: object, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function GET(request: Request) {
  // Deliberate opt-in exception to OpenDepartment holding no project keys:
  // ONLY the operator's OWN demo project. Server env only; never NEXT_PUBLIC_,
  // committed, logged, or returned. Supports service_role JWT and sb_secret_ keys.
  const url = process.env.DEMO_RESET_SUPABASE_URL;
  const key = process.env.DEMO_RESET_SERVICE_KEY;
  const secret = process.env.CRON_SECRET;
  if (!url || !key || !secret) return json({ error: "Not found" }, 404);
  if (!authorized(request.headers.get("authorization"), secret)) return json({ error: "Unauthorized" }, 401);
  let stage = "reset";
  try {
    const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await client.rpc("demo_reset");
    if (error) throw error;
    const uploads = fixtureUploads(data.keep_paths);
    stage = "fixture upload";
    for (const upload of uploads) {
      const bytes = await readFile(join(process.cwd(), "db/demo-fixtures", upload.filename));
      const { error } = await client.storage.from("department-files").upload(upload.path, bytes, {
        upsert: true, contentType: upload.mime,
      });
      if (error) throw error;
    }
    stage = "size sync";
    const sync = await client.rpc("demo_sync_sizes");
    if (sync.error) throw sync.error;
    stage = "storage cleanup";
    const extras = await client.rpc("demo_storage_extras");
    if (extras.error) throw extras.error;
    const paths: string[] = extras.data ?? [];
    for (const batch of batches(paths)) {
      const { error } = await client.storage.from("department-files").remove(batch);
      if (error) throw error;
    }
    return json({ files: data.files, members: data.members, accounts: data.accounts,
      uploaded: uploads.length, synced: sync.data, removed: paths.length });
  } catch {
    // Never serialize SDK errors: they may contain privileged request details.
    return json({ error: `Demo ${stage} failed` }, 500);
  }
}
