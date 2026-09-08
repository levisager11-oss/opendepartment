import { cookies, headers } from "next/headers";
import type { Locale } from "./dictionary";
import { LOCALE_COOKIE } from "./constants";

/**
 * Decide which language to render on the server.
 *
 * 1. An explicit choice stored in the cookie always wins.
 * 2. Otherwise the browser's Accept-Language header decides.
 * 3. English is the fallback -- OpenDepartment is used worldwide.
 *
 * Doing this server-side means the first paint is already in the right
 * language -- no flash of English before the client corrects itself.
 */
export async function detectLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const stored = cookieStore.get(LOCALE_COOKIE)?.value;
  if (stored === "de" || stored === "en") return stored;

  const accept = (await headers()).get("accept-language") ?? "";

  // Parse "en-GB,en;q=0.9,de;q=0.8" into a quality-ordered list.
  const ranked = accept
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params
        .map((p) => p.trim())
        .find((p) => p.startsWith("q="))
        ?.slice(2);
      return { tag: tag.toLowerCase(), q: q ? Number(q) : 1 };
    })
    .filter((entry) => entry.tag && Number.isFinite(entry.q) && entry.q > 0 && entry.q <= 1)
    .sort((a, b) => b.q - a.q);

  for (const { tag } of ranked) {
    if (tag === "de" || tag.startsWith("de-")) return "de";
    if (tag === "en" || tag.startsWith("en-")) return "en";
  }

  return "en";
}
