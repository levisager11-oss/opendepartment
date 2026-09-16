"use client";

import { useCallback, useState } from "react";
import { useI18n } from "@/lib/i18n/provider";

/**
 * What an administrator actually does about an out-of-date schema.
 *
 * The strip under the header says there is something to do; this is the doing.
 * It exists because the answer to "your department is behind" used to be
 * "go back through the setup wizard", and the wizard is a five-step flow for
 * registering a NEW department -- it asks for a slug that is already taken and
 * mints a founder capability for a department that is already claimed. An
 * existing administrator needs one thing out of it: the current SQL, to paste
 * into the project they already own.
 *
 * Deliberately the plain schema and not the personalised SQL the wizard hands
 * a new owner. That version carries a founder verifier, which
 * `handle_new_user` only honours while a department is unclaimed -- so on a
 * live department those statements are inert at best and confusing at worst.
 * The settings on this department are already set; re-running the file leaves
 * every one of them alone, which is what "safe to re-run" at the top of the
 * file means.
 *
 * The SQL arrives as a prop from the server, and only when there is something
 * to update: it is 73 kB, and no visitor to a current department should carry
 * it. Same copy/download pair as the wizard, for the same reason -- a
 * clipboard write can be refused outright by a browser that has not seen a
 * user gesture it likes, and a download needs nobody's permission.
 */
export function AdminSchema({
  current,
  expected,
  sql,
  slug,
}: {
  current: number | null;
  expected: number;
  sql: string;
  slug: string;
}) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(sql);
      setCopied(true);
      setCopyFailed(false);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopyFailed(true);
    }
  }, [sql]);

  const download = useCallback(() => {
    const blob = new Blob([sql], { type: "application/sql" });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = `${slug}-schema.sql`;
    link.click();
    URL.revokeObjectURL(href);
  }, [sql, slug]);

  return (
    <section className="paper paper-flag-red mb-6 p-5">
      <p className="docket mb-2 text-2xs text-stamp-red">{t("schema.title")}</p>
      <p className="text-sm leading-relaxed text-ink-700">
        {current === null
          ? t("schema.bodyUnknown", { expected })
          : t("schema.body", { current, expected })}
      </p>
      <ol className="mt-4 flex list-decimal flex-col gap-1.5 pl-5 text-sm text-ink-700">
        <li>{t("schema.step1")}</li>
        <li>{t("schema.step2")}</li>
        <li>{t("schema.step3")}</li>
      </ol>
      <p className="mt-3 text-xs text-ink-500">{t("schema.safe")}</p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" onClick={copy} className="btn btn-primary">
          {copied ? t("setup.sqlCopied") : t("setup.copySql")}
        </button>
        <button type="button" onClick={download} className="btn btn-ghost">
          {t("setup.downloadSql")}
        </button>
      </div>
      {copyFailed && (
        <p role="alert" className="notice notice-error mt-3 text-xs">
          {t("setup.copyFailed")}
        </p>
      )}
    </section>
  );
}
