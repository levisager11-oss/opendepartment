"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/provider";
import { useTenant, useTenantClient } from "@/lib/tenant/context";
import {
  VAULT_PAGE_SIZE,
  readVaultTrail,
  vaultFiltersFromSearch,
  vaultRangeQuery,
  writeVaultTrail,
  type VaultTrail,
} from "@/lib/tenant/vault-query";

/**
 * Previous and next, through the documents the vault showed in this tab.
 *
 * It walks the vault's own list -- same filters, same order -- rather than
 * some order of its own, so "next" is the card that was beside this one. A
 * page reached any other way (a shared link, a subject chip) has no list and
 * shows no links, which is the honest answer: there is no "next" to a link
 * somebody pasted.
 *
 * At the end of what the vault had loaded, while the vault said there was
 * more, the page after is fetched with the vault's query and added to the
 * list, exactly as scrolling the vault would have.
 *
 * The arrow keys step too, unless focus is in something that uses them
 * itself -- a field, a select, a media player, a tab strip -- or a dialog is
 * open over the page.
 */
export function ExhibitNav({
  fileId,
  currentUserId,
}: {
  fileId: string;
  currentUserId: string;
}) {
  const { t } = useI18n();
  const { href, slug } = useTenant();
  const supabase = useTenantClient();
  const router = useRouter();
  const [trail, setTrail] = useState<VaultTrail | null>(null);

  useEffect(() => {
    setTrail(readVaultTrail(slug));
  }, [slug, fileId]);

  const index = trail ? trail.items.findIndex((item) => item.id === fileId) : -1;
  const prev = index > 0 ? trail!.items[index - 1] : null;
  const next = index >= 0 && trail ? (trail.items[index + 1] ?? null) : null;
  const more = Boolean(trail && index >= 0 && !next && trail.items.length < trail.total);

  // Past the loaded end: fetch the vault's next page so "next" has somewhere
  // to go. A failure just leaves the link off -- the back link still works.
  useEffect(() => {
    if (!more || !trail) return;
    let cancelled = false;
    (async () => {
      const from = trail.items.length;
      const { data, count, error } = await vaultRangeQuery(
        supabase,
        "id, title",
        vaultFiltersFromSearch(trail.search),
        currentUserId,
        from,
        from + VAULT_PAGE_SIZE - 1
      );
      if (cancelled || error || !data) return;
      const rows = data as unknown as Array<{ id: string; title: string }>;
      const known = new Set(trail.items.map((item) => item.id));
      const added = rows.filter((row) => !known.has(row.id));
      const items = [...trail.items, ...added];
      const extended: VaultTrail = {
        search: trail.search,
        // A page that adds nothing means the archive shrank since the vault
        // counted it. Taking the loaded length as the total is what stops
        // this effect from asking again, and again.
        total: added.length ? Math.max(count ?? trail.total, items.length) : items.length,
        items,
      };
      writeVaultTrail(slug, extended);
      setTrail(extended);
    })().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [more, trail, supabase, currentUserId, slug]);

  useEffect(() => {
    if (!prev && !next) return;
    function onKey(e: KeyboardEvent) {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      // Not always an element: a key sent with nothing focused can arrive
      // addressed to the window or the document.
      const target = e.target instanceof Element ? e.target : null;
      if (
        target?.closest("input, textarea, select, [contenteditable=''], [contenteditable='true'], [role='tablist'], video, audio") ||
        document.querySelector("[role='dialog']")
      ) {
        return;
      }
      const to = e.key === "ArrowLeft" ? prev : next;
      if (!to) return;
      e.preventDefault();
      router.push(href(`file/${to.id}`));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prev, next, router, href]);

  if (!trail || index < 0 || (!prev && !next && !more)) return null;

  return (
    <nav
      aria-label={t("exhibit.navLabel")}
      className="flex min-w-0 items-center gap-3 text-sm sm:max-w-xl sm:flex-1 print:hidden"
    >
      <div className="min-w-0 flex-1">
        {prev && (
          <Link
            href={href(`file/${prev.id}`)}
            rel="prev"
            title={prev.title}
            className="group inline-flex max-w-full items-center gap-2 rounded-control text-ink-900 hover:text-gov-800"
          >
            <span aria-hidden>←</span>
            <span className="min-w-0">
              <span className="docket block text-3xs text-ink-500">{t("exhibit.prev")}</span>
              <span className="block truncate group-hover:underline">{prev.title}</span>
            </span>
          </Link>
        )}
      </div>
      <span className="docket shrink-0 text-3xs text-ink-500">
        {t("exhibit.position", { n: index + 1, total: trail.total })}
      </span>
      <div className="flex min-w-0 flex-1 justify-end text-right">
        {next && (
          <Link
            href={href(`file/${next.id}`)}
            rel="next"
            title={next.title}
            className="group inline-flex max-w-full items-center gap-2 rounded-control text-ink-900 hover:text-gov-800"
          >
            <span className="min-w-0">
              <span className="docket block text-3xs text-ink-500">{t("exhibit.next")}</span>
              <span className="block truncate group-hover:underline">{next.title}</span>
            </span>
            <span aria-hidden>→</span>
          </Link>
        )}
      </div>
    </nav>
  );
}
