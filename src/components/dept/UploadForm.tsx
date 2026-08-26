"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/provider";
import { useTenant, useTenantClient } from "@/lib/tenant/context";
import { KindIcon } from "@/components/KindIcon";
import {
  ACCEPTED_MIME,
  STORAGE_BUCKET,
  formatBytes,
  kindFromMime,
  type Subject,
} from "@/lib/tenant/types";

/** Strip anything that could confuse a storage path or a Content-Disposition. */
function sanitiseName(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[^\w.\- ]+/g, "")
    .replace(/\s+/g, "_")
    .slice(-80);
}

export function UploadForm({
  subjects,
  userId,
}: {
  subjects: Subject[];
  userId: string;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  // Categories and the size cap are per-department settings, so they arrive
  // through context rather than being compiled in from env vars.
  const { branding, href } = useTenant();
  const supabase = useTenantClient();
  const categories = branding.categories;
  const maxUploadMb = branding.maxUploadMb;
  const maxUploadBytes = maxUploadMb * 1024 * 1024;

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>(categories[0]);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [accepted, setAccepted] = useState(false);

  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function chooseFile(next: File | null) {
    setError(null);
    if (!next) return;

    if (!ACCEPTED_MIME[next.type]) {
      setError(t("upload.errorType"));
      return;
    }
    if (next.size > maxUploadBytes) {
      setError(t("upload.errorSize", { mb: maxUploadMb }));
      return;
    }

    setFile(next);
    if (!title) setTitle(next.name.replace(/\.[^.]+$/, ""));

    if (preview) URL.revokeObjectURL(preview);
    setPreview(
      next.type.startsWith("image/") ? URL.createObjectURL(next) : null
    );
  }

  function toggleSubject(id: string) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return setError(t("upload.errorNoFile"));
    if (!title.trim()) return setError(t("upload.errorTitle"));
    if (!accepted) return;

    setBusy(true);
    setError(null);

    // Path is namespaced by user id: the storage policy only lets you write
    // into your own folder, so the path itself is part of the access check.
    const path = `${userId}/${crypto.randomUUID()}-${sanitiseName(file.name)}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(path, file, {
          contentType: file.type,
          upsert: false,
        });
      if (uploadError) throw uploadError;

      const { data: row, error: insertError } = await supabase
        .from("files")
        .insert({
          owner_id: userId,
          title: title.trim().slice(0, 200),
          description: description.trim().slice(0, 2000) || null,
          category,
          storage_path: path,
          original_name: file.name.slice(0, 200),
          mime_type: file.type,
          size_bytes: file.size,
          kind: kindFromMime(file.type),
        })
        .select("id")
        .single();

      if (insertError) {
        // Do not leave an orphaned object behind if the row could not be made.
        await supabase.storage.from(STORAGE_BUCKET).remove([path]);
        throw insertError;
      }

      if (picked.size) {
        await supabase.from("file_subjects").insert(
          Array.from(picked).map((subject_id) => ({
            file_id: row.id,
            subject_id,
          }))
        );
      }

      router.push(href(`file/${row.id}`));
      router.refresh();
    } catch {
      setError(t("upload.errorGeneric"));
      setBusy(false);
    }
  }

  const ready = Boolean(file && title.trim() && accepted && !busy);

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      {/* dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          chooseFile(e.dataTransfer.files?.[0] ?? null);
        }}
        onClick={() => inputRef.current?.click()}
        className={`paper cursor-pointer rounded-xs border-2 border-dashed px-6 py-10 text-center transition-colors ${
          dragging
            ? "!border-gov-700 !bg-gov-100"
            : "!border-paper-400 hover:!border-gov-600"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={Object.keys(ACCEPTED_MIME).join(",")}
          onChange={(e) => chooseFile(e.target.files?.[0] ?? null)}
        />

        {file ? (
          <div className="flex items-center justify-center gap-4">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview}
                alt=""
                className="h-24 w-24 rounded-xs border border-paper-400 object-cover"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-xs border border-paper-400 bg-paper-200 text-ink-500">
                <KindIcon kind={kindFromMime(file.type)} size={34} />
              </div>
            )}
            <div className="text-left">
              <p className="typewriter text-sm break-all text-ink-900">
                {file.name}
              </p>
              <p className="docket mt-1">
                {formatBytes(file.size)} · {file.type}
              </p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                  setPreview(null);
                }}
                className="mt-2 cursor-pointer text-xs text-stamp-red underline"
              >
                {t("common.cancel")}
              </button>
            </div>
          </div>
        ) : (
          <>
            <svg
              className="mx-auto mb-3 text-ink-400"
              width="34"
              height="34"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            >
              <path d="M12 16V4M8 8l4-4 4 4M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
            </svg>
            <p className="font-semibold text-ink-700">{t("upload.dropzone")}</p>
            <p className="docket mt-1">
              {t("upload.dropzoneHint", { mb: maxUploadMb })}
            </p>
          </>
        )}
      </div>

      {/* metadata */}
      <div className="paper rounded-xs p-5">
        <div className="flex flex-col gap-4">
          <div>
            <label className="label" htmlFor="title">
              {t("upload.fileTitle")}
            </label>
            <input
              id="title"
              className="field"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("upload.fileTitlePlaceholder")}
              maxLength={200}
              required
            />
          </div>

          <div>
            <label className="label" htmlFor="description">
              {t("upload.description")}
            </label>
            <textarea
              id="description"
              className="field min-h-24 resize-y"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("upload.descriptionPlaceholder")}
              maxLength={2000}
            />
          </div>

          <div>
            <label className="label" htmlFor="category">
              {t("upload.category")}
            </label>
            <select
              id="category"
              className="field"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {categories.map((c: string) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <span className="label">{t("upload.subjects")}</span>
            {subjects.length === 0 ? (
              <p className="text-sm text-ink-400">{t("upload.noSubjects")}</p>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  {subjects.map((s) => {
                    const on = picked.has(s.id);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => toggleSubject(s.id)}
                        aria-pressed={on}
                        title={s.description ?? undefined}
                        className={`typewriter cursor-pointer rounded-xs border px-2.5 py-1 text-xs transition-colors ${
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
                <p className="mt-2 text-xs text-ink-400">
                  {t("upload.subjectsHint")}
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* accountability */}
      <div className="paper rounded-xs border-l-4 !border-l-stamp-red p-5">
        <p className="docket mb-2 !text-stamp-red">{t("notice.title")}</p>
        <p className="text-sm leading-relaxed text-ink-700">
          {t("notice.body")}
        </p>
        <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm font-semibold text-ink-900">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            className="mt-0.5 accent-stamp-red"
            required
          />
          {t("notice.checkbox")}
        </label>
      </div>

      {error && (
        <p
          role="alert"
          className="border-l-[3px] border-stamp-red bg-stamp-red/8 px-3 py-2 text-sm text-stamp-red"
        >
          {error}
        </p>
      )}

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={!ready}
          className="btn btn-primary !px-6 !py-3"
        >
          {busy ? t("upload.submitting") : t("upload.submit")}
        </button>

        {busy && (
          <div
            className="h-1.5 flex-1 overflow-hidden rounded-full bg-paper-300"
            role="progressbar"
            aria-label={t("upload.progress")}
          >
            <div className="h-full w-1/3 animate-[fade-up_1.1s_ease-in-out_infinite_alternate] bg-gov-700" />
          </div>
        )}
      </div>
    </form>
  );
}
