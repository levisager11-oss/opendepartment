"use client";

import Link from "next/link";
import { Seal } from "@/components/Seal";
import { useI18n } from "@/lib/i18n/provider";
import { useTenant } from "@/lib/tenant/context";

export function DeptFooter() {
  const { t } = useI18n();
  const { branding, href, slug } = useTenant();

  return (
    <footer className="mt-16 gov-rule-top bg-gov-950 text-gov-100">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-8 sm:gap-8 sm:py-10 md:grid-cols-[auto_1fr_auto]">
        <div className="flex items-start gap-4">
          <Seal
            size={56}
            className="shrink-0 opacity-90"
            top={branding.sealTop}
            bottom={branding.sealBottom}
            accent={branding.accent}
            idPrefix={`ftr-${slug}`}
          />
          <div className="leading-tight">
            <p className="font-serif text-base font-bold text-white">
              {branding.departmentName}
            </p>
            {branding.tagline && (
              <p className="text-xs text-gov-100/60">{branding.tagline}</p>
            )}
          </div>
        </div>

        <div className="space-y-3 text-xs leading-relaxed text-gov-100/70">
          <p className="max-w-prose">{t("gov.disclaimer")}</p>
          <p className="max-w-prose">{t("notice.short")}</p>
          <p className="max-w-prose">
            {t("dept.hostedNotice", { name: branding.departmentName })}{" "}
            <Link href="/" className="underline underline-offset-2 hover:text-white">
              OpenDepartment
            </Link>
            .
          </p>
        </div>

        <nav className="flex flex-col gap-1 text-xs sm:gap-2 md:text-right">
          <Link href={href("legal/terms")} className="py-1 hover:text-white hover:underline sm:py-0">
            {t("legal.terms")}
          </Link>
          <Link href={href("legal/privacy")} className="py-1 hover:text-white hover:underline sm:py-0">
            {t("legal.privacy")}
          </Link>
          <Link href={href("legal/imprint")} className="py-1 hover:text-white hover:underline sm:py-0">
            {t("legal.imprint")}
          </Link>
          {/* Deliberately a link OUT of the department, to the platform.
              The report button on a document goes to this department's own
              administrator, which is the wrong address when the administrator
              is what somebody wants to complain about. The slug is prefilled
              because a person who is upset should not have to work out what
              this archive is called. */}
          <Link
            href={`/report?slug=${encodeURIComponent(slug)}`}
            className="py-1 hover:text-white hover:underline sm:py-0"
          >
            {t("abuse.link")}
          </Link>
        </nav>
      </div>

      <div className="border-t border-white/10">
        <div className="docket mx-auto max-w-7xl px-4 py-3 text-gov-100/40 text-2xs">
          {t("gov.parody")} · {new Date().getFullYear()} · {branding.sealTop}
        </div>
      </div>
    </footer>
  );
}
