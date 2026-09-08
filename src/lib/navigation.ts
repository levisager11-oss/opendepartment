/** Normalize with the browser's URL rules before accepting a local redirect. */
export function safeLocalPath(value: unknown, fallback: string, within?: string): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u0020\u007f]/.test(value)) return fallback;
  try {
    const base = "https://opendepartment.invalid";
    const url = new URL(value, base);
    if (url.origin !== base) return fallback;
    if (within && url.pathname !== within && !url.pathname.startsWith(`${within}/`)) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

/** Accept either a slug or a department link, including query/hash suffixes. */
export function departmentSlug(value: string): string {
  const clean = value.trim();
  let slug = clean;
  if (clean.startsWith("/") || /^https?:\/\//i.test(clean)) {
    try {
      const url = new URL(clean, "https://opendepartment.invalid");
      slug = /^\/d\/([^/]+)/.exec(url.pathname)?.[1] ?? "";
    } catch { return ""; }
  }
  slug = slug.toLowerCase();
  return /^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])$/.test(slug) ? slug : "";
}
