"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/provider";
import { useTenantClient } from "@/lib/tenant/context";
import type { AdminSubject } from "./types";

export function AdminSubjects({ subjects }: { subjects: AdminSubject[] }) {
  const { t } = useI18n();
  const supabase = useTenantClient();
  const router = useRouter();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const clean = name.trim();
    if (!clean) return;

    setBusy(true);
    setError(null);

    const { error: insertError } = await supabase
      .from("subjects")
      .insert({ name: clean, description: description.trim() || null });

    setBusy(false);

    if (insertError) {
      setError(t("common.error"));
      return;
    }

    setName("");
    setDescription("");
    router.refresh();
  }

  async function remove(subject: AdminSubject) {
    if (!confirm(t("admin.subjects.removeConfirm"))) return;
    const { error } = await supabase
      .from("subjects")
      .delete()
      .eq("id", subject.id);
    if (error) alert(t("common.error"));
    else router.refresh();
  }

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[22rem_1fr]">
      <form onSubmit={add} className="paper h-fit p-5">
        <p className="docket mb-3 text-2xs text-ink-500">{t("admin.subjects.add")}</p>

        <label className="label" htmlFor="subject-name">
          {t("admin.subjects.name")}
        </label>
        <input
          id="subject-name"
          className="field typewriter"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
          placeholder="THE BLACK BOOK"
        />

        <label className="label mt-4" htmlFor="subject-description">
          {t("admin.subjects.description")}
        </label>
        <textarea
          id="subject-description"
          className="field min-h-20 resize-y"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={300}
        />

        {error && <p className="mt-3 text-sm text-stamp-red">{error}</p>}

        <button
          type="submit"
          disabled={busy || !name.trim()}
          className="btn btn-primary mt-4 w-full"
        >
          {busy ? t("common.saving") : t("admin.subjects.add")}
        </button>

        <p className="mt-4 text-xs leading-relaxed text-ink-400">
          {t("upload.subjectsHint")}
        </p>
      </form>

      <div className="grid h-fit grid-cols-1 gap-3 sm:grid-cols-2">
        {subjects.map((subject) => (
          <div key={subject.id} className="paper p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="typewriter font-bold text-gov-900">
                  {subject.name}
                </p>
                {subject.description && (
                  <p className="mt-1 text-xs leading-relaxed text-ink-500">
                    {subject.description}
                  </p>
                )}
                <p className="docket mt-2 text-3xs text-ink-500">
                  {subject.file_count} {t("admin.subjects.files")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => remove(subject)}
                className="shrink-0 cursor-pointer text-xs text-stamp-red underline"
              >
                {t("admin.subjects.remove")}
              </button>
            </div>
          </div>
        ))}

        {subjects.length === 0 && (
          <p className="py-10 text-center text-sm text-ink-400 sm:col-span-2">
            {t("upload.noSubjects")}
          </p>
        )}
      </div>
    </div>
  );
}
