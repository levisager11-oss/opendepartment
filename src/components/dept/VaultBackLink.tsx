"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { useTenant } from "@/lib/tenant/context";
import { lastVaultKey, vaultReturnHref } from "@/lib/tenant/vault-return";

/**
 * "Back to repository", back to the filters this tab last had open.
 *
 * Renders the bare vault address first -- on the server and in the first
 * client render alike, so hydration agrees -- and swaps in the remembered
 * query afterwards.
 */
export function VaultBackLink() {
  const { t } = useI18n();
  const { href, slug } = useTenant();
  const base = href("vault");
  const [target, setTarget] = useState(base);

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = sessionStorage.getItem(lastVaultKey(slug));
    } catch {
      // Storage unavailable: the bare vault it is.
    }
    setTarget(vaultReturnHref(base, stored));
  }, [base, slug]);

  return (
    <Link
      href={target}
      className="inline-flex w-fit items-center gap-1.5 rounded-control border border-paper-300 bg-paper-50 px-3 py-1.5 text-sm font-medium text-ink-700 transition-colors hover:border-paper-400 hover:text-ink-900 print:hidden"
    >
      <span aria-hidden>←</span> {t("file.back")}
    </Link>
  );
}
