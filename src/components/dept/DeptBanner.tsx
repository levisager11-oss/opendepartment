"use client";

import Link from "next/link";
import { useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { useTenant } from "@/lib/tenant/context";

/**
 * The strip above everything, imitating the "official website" banner of a
 * government site -- with the parody label made unmissable, which is both the
 * joke and the honest thing to do.
 *
 * On OpenDepartment it carries a second job: saying plainly that this archive
 * is run by whoever runs it, not by the platform. A visitor who has been
 * handed a link should be able to tell within one line who is accountable for
 * what they are about to see.
 */
export function DeptBanner() {
  const { t } = useI18n();
  const { branding } = useTenant();
  const [open, setOpen] = useState(false);

  return (
    <div className="gov-banner">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-3 gap-y-1 px-4 py-1.5">
        <span
          className="stamp stamp-red stamp-sm stamp-solid"
          style={{ transform: "rotate(-2deg)" }}
        >
          {t("gov.parody")}
        </span>

        <span className="opacity-80">
          {t("gov.official", { name: branding.departmentName })}
        </span>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="ml-auto cursor-pointer underline decoration-dotted underline-offset-2 opacity-70 transition-opacity hover:opacity-100"
        >
          {open ? "⌃" : "⌄"} {t("legal.imprint")}
        </button>
      </div>

      {open && (
        <div className="border-t border-white/10 bg-black/25">
          <div className="mx-auto max-w-7xl space-y-2 px-4 py-2 text-2xs leading-relaxed opacity-85">
            <p>{t("gov.disclaimer")}</p>
            <p>
              {t("dept.hostedNotice", { name: branding.departmentName })}{" "}
              <Link href="/" className="underline underline-offset-2">
                OpenDepartment
              </Link>
              .
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
