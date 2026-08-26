"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { createControlBrowserClient } from "@/lib/control/browser";

type Dept = {
  slug: string;
  display_name: string;
  tagline: string | null;
  visibility: string;
  status: string;
  created_at: string;
};

export function DepartmentRow({ dept }: { dept: Dept }) {
  const { t, formatDate } = useI18n();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [visibility, setVisibility] = useState(dept.visibility);

  async function toggleVisibility() {
    setBusy(true);
    const next = visibility === "public" ? "unlisted" : "public";
    const { error } = await createControlBrowserClient()
      .from("departments")
      .update({ visibility: next })
      .eq("slug", dept.slug);
    setBusy(false);
    if (!error) setVisibility(next);
  }

  async function delist() {
    if (!confirm(t("account.delistConfirm"))) return;
    setBusy(true);
    const { error } = await createControlBrowserClient()
      .from("departments")
      .delete()
      .eq("slug", dept.slug);
    setBusy(false);
    if (!error) router.refresh();
  }

  return (
    <li className="paper flex flex-wrap items-center gap-x-4 gap-y-2 p-4">
      <div className="min-w-0 flex-1">
        <p className="font-[family-name:var(--font-serif)] text-base font-bold text-ink-900">
          {dept.display_name}
          {dept.status === "suspended" && (
            <span className="stamp stamp-red ml-3 !border-2 !px-1.5 !py-0 text-[0.6rem]">
              suspended
            </span>
          )}
        </p>
        <p className="docket mt-1 !text-[0.6rem]">
          /d/{dept.slug} · {formatDate(dept.created_at)}
        </p>
      </div>

      <button
        type="button"
        onClick={toggleVisibility}
        disabled={busy}
        className="border border-paper-400 px-3 py-1.5 text-xs text-ink-700 hover:bg-paper-200 disabled:opacity-40"
      >
        {t(visibility === "public" ? "setup.public" : "setup.unlisted")}
      </button>

      <Link
        href={`/d/${dept.slug}`}
        className="bg-gov-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-gov-800"
      >
        {t("account.visit")}
      </Link>

      <button
        type="button"
        onClick={delist}
        disabled={busy}
        className="text-xs text-stamp-red underline underline-offset-2 disabled:opacity-40"
      >
        {t("account.delist")}
      </button>
    </li>
  );
}
