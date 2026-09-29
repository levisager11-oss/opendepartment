import type { createTenantBrowserClient } from "./client";
import { STORAGE_BUCKET } from "./types";

type TenantClient = ReturnType<typeof createTenantBrowserClient>;

export type UploadOutcome = { error: { message: string } | null };

/**
 * Put one object into the department's bucket, reporting how far it has got.
 *
 * supabase-js uploads with fetch(), and fetch() says nothing about request
 * progress -- so a 40 MB video sat behind an animated bar that could not tell
 * a slow upload from a stuck one. This sends the same request the library
 * would, over XMLHttpRequest, whose upload.onprogress does report it:
 *
 *   POST {url}/storage/v1/object/{bucket}/{path}
 *   authorization: Bearer <the member's access token>
 *   apikey:        <the department's anon key>
 *   x-upsert:      false
 *   body:          multipart -- cacheControl, then the file under ""
 *
 * which is storage-js's own shape for a Blob body (StorageFileApi's
 * uploadOrUpdate), so the storage policies see nothing different: the member's
 * own token, the member's own folder. Nothing new is trusted -- the path,
 * token and key are the ones the library would have sent.
 *
 * It falls back to the library call wherever it cannot do that: no progress
 * wanted, no XMLHttpRequest, or no session to read a token from. The fallback
 * uploads exactly as before, just without a percentage.
 */
export async function uploadObject(
  supabase: TenantClient,
  coords: { supabaseUrl: string; anonKey: string },
  path: string,
  file: File | Blob,
  onProgress?: (fraction: number) => void
): Promise<UploadOutcome> {
  const contentType = file.type || "application/octet-stream";
  const viaLibrary = async (): Promise<UploadOutcome> => {
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, file, { contentType, upsert: false });
    return { error: error ? { message: error.message } : null };
  };

  if (!onProgress || typeof XMLHttpRequest === "undefined") return viaLibrary();

  let token: string | null = null;
  try {
    const { data } = await supabase.auth.getSession();
    token = data.session?.access_token ?? null;
  } catch {
    token = null;
  }
  if (!token) return viaLibrary();

  const body = new FormData();
  body.append("cacheControl", "3600");
  body.append("", file);

  return new Promise<UploadOutcome>((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open(
      "POST",
      `${coords.supabaseUrl.replace(/\/+$/, "")}/storage/v1/object/${STORAGE_BUCKET}/${path}`
    );
    xhr.setRequestHeader("authorization", `Bearer ${token}`);
    xhr.setRequestHeader("apikey", coords.anonKey);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) {
        onProgress(Math.min(1, event.loaded / event.total));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(1);
        resolve({ error: null });
        return;
      }
      // Storage answers { statusCode, error, message }. The message is only
      // ever matched on or logged, never shown -- same as the library path.
      let message = `HTTP ${xhr.status}`;
      try {
        const parsed = JSON.parse(xhr.responseText) as { message?: unknown; error?: unknown };
        if (typeof parsed.message === "string") message = parsed.message;
        else if (typeof parsed.error === "string") message = parsed.error;
      } catch {
        // Not JSON: the status line is all there is.
      }
      resolve({ error: { message } });
    };
    xhr.onerror = () => resolve({ error: { message: "Network error" } });
    xhr.onabort = () => resolve({ error: { message: "Upload aborted" } });
    xhr.send(body);
  });
}
