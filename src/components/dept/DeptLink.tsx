"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n/provider";
import { useTenant } from "@/lib/tenant/context";
import type { TranslationKey } from "@/lib/i18n/dictionary";

/**
 * A link to a path inside the current department, for server components that
 * cannot build one themselves.
 *
 * not-found.tsx and error.tsx receive no params, so they have no slug to
 * interpolate. Resolving it through the tenant context is exact; the
 * alternative -- a relative href like "../vault" -- depends on how the router
 * happens to normalise the current URL.
 */
export function DeptLink({
  to,
  k,
  className = "btn btn-primary",
}: {
  to: string;
  k: TranslationKey;
  className?: string;
}) {
  const { t } = useI18n();
  const { href } = useTenant();

  return (
    <Link href={href(to)} className={className}>
      {t(k)}
    </Link>
  );
}
