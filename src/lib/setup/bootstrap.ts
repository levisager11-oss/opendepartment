/** A browser-only, single-use capability for claiming a newly installed tenant. */
export function isBootstrapSecret(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{64}$/.test(value);
}

export function generateBootstrapSecret(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
}

export async function hashBootstrapSecret(secret: string): Promise<string> {
  if (!isBootstrapSecret(secret)) throw new Error("INVALID_BOOTSTRAP_SECRET");
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function storageKey(slug: string, projectUrl: string): string {
  return `od.bootstrap.v1:${slug}:${projectUrl.replace(/\/+$/, "")}`;
}

/** Retain the founder handoff until signup, including after the fragment is cleared. */
export function saveBootstrapSecret(slug: string, projectUrl: string, secret: string): void {
  if (!isBootstrapSecret(secret)) return;
  try { sessionStorage.setItem(storageKey(slug, projectUrl), secret); } catch { /* memory still works */ }
}

export function loadBootstrapSecret(slug: string, projectUrl: string): string | null {
  try {
    const secret = sessionStorage.getItem(storageKey(slug, projectUrl));
    return isBootstrapSecret(secret) ? secret : null;
  } catch { return null; }
}

export function forgetBootstrapSecret(slug: string, projectUrl: string): void {
  try { sessionStorage.removeItem(storageKey(slug, projectUrl)); } catch { /* no persistent handoff */ }
  // A successful signup also invalidates the capability in the retained wizard draft.
  try {
    const draft = JSON.parse(sessionStorage.getItem("od.setup.draft.v1") ?? "null");
    if (draft?.slug === slug && draft?.url?.replace(/\/+$/, "") === projectUrl.replace(/\/+$/, "")) {
      delete draft.bootstrapSecret;
      draft.founderClaimed = true;
      sessionStorage.setItem("od.setup.draft.v1", JSON.stringify(draft));
    }
  } catch { /* a missing or older draft needs no cleanup */ }
}

export function founderLink(slug: string, secret: string): string {
  if (!isBootstrapSecret(secret)) throw new Error("INVALID_BOOTSTRAP_SECRET");
  return `/d/${encodeURIComponent(slug)}/join#bootstrap=${secret}`;
}
