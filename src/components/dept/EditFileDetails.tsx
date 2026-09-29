"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/Spinner";
import { useI18n } from "@/lib/i18n/provider";
import { useTenant, useTenantClient } from "@/lib/tenant/context";
import type { Subject } from "@/lib/tenant/types";

/**
 * Let whoever filed a document correct what they said about it.
 *
 * Owner only, and not by choice of this component: the tenant schema grants
 * UPDATE on exactly title, description and category, and files_update_own
 * only passes the owner while they are an active member. Subject links are
 * owner-or-admin under fs_write. So nothing here needs a new privilege -- it
 * is the form for ones members already had and could not reach.
 *
 * Every write reads back what it changed. An update that RLS refuses comes
 * back as success with no rows, and treating that as saved would tell
 * somebody their correction took when it did not.
 */
export function EditFileDetails({
  fileId,
  initial,
  subjects,
}: {
  fileId: string;
  initial: {
    title: string;
    description: string | null;
    category: string;
    subjectIds: string[];
  };
  subjects: Subject[];
}) {
  const { t } = useI18n();
  const { branding } = useTenant();
  const supabase = useTenantClient();
  const router = useRouter();
  const titleRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description ?? "");
  const [category, setCategory] = useState(initial.category);
  const [picked, setPicked] = useState<Set<string>>(new Set(initial.subjectIds));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A category the administrators have since retired is still this
  // document's category; it stays selectable rather than being silently
  // swapped for the first one on the list at the next save.
  const categories = branding.categories.includes(initial.category)
    ? branding.categories
    : [initial.category, ...branding.categories];

  useEffect(() => {
    if (open) titleRef.current?.focus();
  }, [open]);

  function start() {
    setTitle(initial.title);
    setDescription(initial.description ?? "");
    setCategory(initial.category);
    setPicked(new Set(initial.subjectIds));
    setError(null);
    setOpen(true);
  }

  function toggle(id: string) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setError(t("upload.errorTitle"));
      return;
    }
    setBusy(true);
    setError(null);

    let detailsSaved = false;
    try {
      const { data, error: updateError } = await supabase
        .from("files")
        .update({
          title: cleanTitle.slice(0, 200),
          description: description.trim().slice(0, 2000) || null,
          category,
        })
        .eq("id", fileId)
        .select("id");
      if (updateError || !data?.length) throw updateError ?? new Error("Update refused");
      detailsSaved = true;

      const before = new Set(initial.subjectIds);
      const added = [...picked].filter((id) => !before.has(id));
      const removed = [...before].filter((id) => !picked.has(id));

      if (added.length) {
        const { error: addError } = await supabase
          .from("file_subjects")
          .upsert(
            added.map((subject_id) => ({ file_id: fileId, subject_id })),
            { onConflict: "file_id,subject_id", ignoreDuplicates: true }
          );
        if (addError) throw addError;
      }
      if (removed.length) {
        const { error: removeError } = await supabase
          .from("file_subjects")
          .delete()
          .eq("file_id", fileId)
          .in("subject_id", removed);
        if (removeError) throw removeError;
        // Asked afterwards rather than counted from the delete's answer: a
        // refused delete also answers with no rows, and so does a retry of
        // one whose first response was lost. What is still linked is the
        // question that tells the two apart.
        const { data: left, error: readError } = await supabase
          .from("file_subjects")
          .select("subject_id")
          .eq("file_id", fileId)
          .in("subject_id", removed);
        if (readError || left?.length) throw readError ?? new Error("Removal refused");
      }

      setOpen(false);
      router.refresh();
    } catch {
      // Saying which half landed tells the member whether trying again
      // repeats a change or finishes one. Both halves are safe to repeat.
      setError(t(detailsSaved ? "file.editSubjectsFailed" : "common.actionFailed"));
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button type="button" onClick={start} className="btn btn-ghost">
        {t("file.edit")}
      </button>
    );
  }

  return (
    // order-last: the form opens inside the page's row of actions, and in
    // place it split that row -- Report and Delete stranded under Save.
    <form onSubmit={save} className="order-last w-full basis-full border-t border-paper-300 pt-4">
      <fieldset disabled={busy} className="flex flex-col gap-4">
        <legend className="docket mb-2 text-2xs text-ink-500">{t("file.editHeading")}</legend>
        <div>
          <label className="label" htmlFor="edit-title">{t("upload.fileTitle")}</label>
          <input
            ref={titleRef}
            id="edit-title"
            className="field"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="edit-description">{t("upload.description")}</label>
          <textarea
            id="edit-description"
            className="field min-h-24 resize-y"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={2000}
          />
        </div>
        <div>
          <label className="label" htmlFor="edit-category">{t("upload.category")}</label>
          <select
            id="edit-category"
            className="field"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        {subjects.length > 0 && (
          <div>
            <span className="label">{t("upload.subjects")}</span>
            <div className="flex flex-wrap gap-2">
              {subjects.map((s) => {
                const on = picked.has(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggle(s.id)}
                    aria-pressed={on}
                    title={s.description ?? undefined}
                    className={`typewriter cursor-pointer rounded-card border px-2.5 py-1 text-xs transition-colors ${
                      on
                        ? "border-gov-800 bg-gov-800 text-white"
                        : "border-paper-400 bg-paper-100 text-ink-700 hover:border-gov-600"
                    }`}
                  >
                    {on && <span aria-hidden>✓ </span>}
                    {s.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {error && <p role="alert" className="notice notice-error">{error}</p>}
        <div className="flex flex-wrap gap-3">
          <button type="submit" className="btn btn-primary" aria-busy={busy}>
            {busy && <Spinner />}
            {busy ? t("common.saving") : t("common.save")}
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
            {t("common.cancel")}
          </button>
        </div>
      </fieldset>
    </form>
  );
}
