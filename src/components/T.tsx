"use client";

import { useI18n } from "@/lib/i18n/provider";
import type { TranslationKey } from "@/lib/i18n/dictionary";

/**
 * Tiny translation island.
 *
 * Server components cannot call the i18n hook, so they render <T k="..."/> and
 * the string resolves on the client in whichever language is active. Keeps
 * pages as server components without giving up live language switching.
 */
export function T({
  k,
  vars,
}: {
  k: TranslationKey;
  vars?: Record<string, string | number>;
}) {
  const { t } = useI18n();
  return <>{t(k, vars)}</>;
}

/** Same, but uppercased -- for stamps and dockets. */
export function TStamp({ k }: { k: TranslationKey }) {
  const { t } = useI18n();
  return <>{t(k).toUpperCase()}</>;
}

/** Plural helper: <TPlural base="vault.count" n={3} /> */
export function TPlural({ base, n }: { base: string; n: number }) {
  const { plural } = useI18n();
  return <>{plural(base, n)}</>;
}
