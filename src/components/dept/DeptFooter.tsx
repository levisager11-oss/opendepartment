"use client";

import Link from "next/link";
import { Seal } from "@/components/Seal";
import { useI18n } from "@/lib/i18n/provider";
import { useTenant } from "@/lib/tenant/context";

const LINK = "py-1 text-ink-500 transition-colors hover:text-ink-900 sm:py-0";

export function DeptFooter() {
  const { t } = useI18n();
  const { branding, href, slug } = useTenant();

  return (
    <footer className="mt-20 gov-rule-top bg-paper-50 print:hidden">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 py-10 md:grid-cols-[auto_1fr_auto]">
        <div className="flex items-start gap-3.5">
          <Seal
            size={48}
            className="shrink-0"
            top={branding.sealTop}
            bottom={branding.sealBottom}
            accent={branding.accent}
            idPrefix={`ftr-${slug}`}
          />
          <div className="leading-tight">
            <p className="font-display text-base font-bold text-ink-900">
              {branding.departmentName}
            </p>
            {branding.tagline && (
              <p className="mt-0.5 max-w-60 text-xs text-ink-500">{branding.tagline}</p>
            )}
          </div>
        </div>

        <div className="space-y-2.5 text-xs leading-relaxed text-ink-500">
          <p className="max-w-prose">{t("gov.disclaimer")}</p>
          <p className="max-w-prose">{t("notice.short")}</p>
          <p className="max-w-prose">
            {t("dept.hostedNotice", { name: branding.departmentName })}{" "}
            <Link href="/" className="font-medium text-ink-700 underline underline-offset-2 hover:text-ink-900">
              OpenDepartment
            </Link>
            .
          </p>
        </div>

        <nav className="flex flex-col gap-1 text-sm sm:gap-2 md:text-right">
          <Link href={href("legal/terms")} className={LINK}>
            {t("legal.terms")}
          </Link>
          <Link href={href("legal/privacy")} className={LINK}>
            {t("legal.privacy")}
          </Link>
          <Link href={href("legal/imprint")} className={LINK}>
            {t("legal.imprint")}
          </Link>
          {/* Deliberately a link OUT of the department, to the platform.
              The report button on a document goes to this department's own
              administrator, which is the wrong address when the administrator
              is what somebody wants to complain about. The slug is prefilled
              because a person who is upset should not have to work out what
              this archive is called. */}
          <Link href={`/report?slug=${encodeURIComponent(slug)}`} className={LINK}>
            {t("abuse.link")}
          </Link>
        </nav>
      </div>

      <div className="border-t border-paper-300">
        <div className="docket mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 text-3xs text-ink-400">
          <span
            className="stamp stamp-red stamp-sm stamp-solid"
            style={{ transform: "rotate(-2deg)" }}
          >
            {t("gov.parody")}
          </span>
          <span>
            {new Date().getFullYear()} · {branding.sealTop}
          </span>
        </div>
      </div>
    </footer>
  );
}
