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
      className="docket mb-4 inline-flex items-center gap-1 text-2xs text-ink-500 hover:text-gov-800 print:hidden"
    >
      <span aria-hidden>←</span> {t("file.back")}
    </Link>
  );
}
