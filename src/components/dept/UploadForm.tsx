"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Spinner } from "@/components/Spinner";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/provider";
import { useTenant, useTenantClient } from "@/lib/tenant/context";
import { KindIcon } from "@/components/KindIcon";
import { scrubImage } from "@/lib/tenant/scrub";
import { makeThumbnail } from "@/lib/tenant/thumbnail";
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
  const [preparing, setPreparing] = useState(false);
  const selectionRequest = useRef(0);
  const [pendingFile, setPendingFile] = useState<{
    path: string;
    record: Record<string, string | number | null>;
    subjectIds: string[];
  } | null>(null);
  const [pendingUpload, setPendingUpload] = useState<{
    id: string;
    subjectIds: string[];
  } | null>(null);
  /**
   * What happened to this file's metadata, so the form can say -- and say it
   * per kind rather than only when there is good news.
   *
   * Only images are scrubbed, and only some of those. The form used to be
   * silent about everything else, which read as reassurance: somebody who had
   * seen "location and camera details were removed" on a photograph had every
   * reason to assume a video got the same treatment. It does not. A video
   * carries the device and often where it was recorded, and a PDF carries
   * whoever authored it and on what -- neither is strippable in a browser
   * without re-encoding the file, which is not a thing to do to somebody's
   * document behind their back.
   *
   * So the note says which of those happened. Being told what was NOT cleaned
   * is the half that changes what a person does next.
   */
  const [scrubNote, setScrubNote] = useState<
    "stripped" | "unsupported" | "document" | "media" | null
  >(null);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  async function chooseFile(next: File | null) {
    if (busy || pendingUpload || pendingFile) return;
    const ticket = ++selectionRequest.current;
    setPreparing(false);
    setError(null);
    setScrubNote(null);
    if (!next) return;

    if (!ACCEPTED_MIME[next.type]) {
      setError(t("upload.errorType"));
      return;
    }
    if (next.size > maxUploadBytes) {
      setError(t("upload.errorSize", { mb: maxUploadMb }));
      return;
    }

    // A phone photograph says where it was taken, when, and on what. This
    // archive's subject is often the people in it, so that has to come off
    // before the bytes leave the browser -- afterwards they are in the
    // department owner's bucket and it is too late. Losslessly: the segments
    // are removed from the container, the pixels are not touched.
    setPreparing(true);
    let scrubbed;
    try {
      scrubbed = await scrubImage(next);
    } catch {
      if (ticket === selectionRequest.current) {
        setError(t("upload.errorGeneric"));
        setPreparing(false);
      }
      return;
    }
    if (ticket !== selectionRequest.current) return;
    setPreparing(false);
    const chosen = scrubbed.file;
    const chosenKind = kindFromMime(chosen.type);
    if (scrubbed.scrubbed) setScrubNote("stripped");
    else if (scrubbed.unsupported) setScrubNote("unsupported");
    else if (chosenKind === "pdf") setScrubNote("document");
    else if (chosenKind === "video" || chosenKind === "audio") {
      setScrubNote("media");
    }

    setFile(chosen);
    if (!title) setTitle(chosen.name.replace(/\.[^.]+$/, ""));

    setPreview(
      chosen.type.startsWith("image/") ? URL.createObjectURL(chosen) : null
    );
  }

  /**
   * Clearing has to reach the <input> as well as the state. Leaving the
   * element's value in place means picking the very same file again fires no
   * change event at all, and the dropzone just sits there looking broken.
   */
  function clearFile() {
    selectionRequest.current += 1;
    setPreparing(false);
    setFile(null);
    setPreview(null);
    setError(null);
    setScrubNote(null);
    if (inputRef.current) inputRef.current.value = "";
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
    if (busy || preparing) return;
    if (!file) return setError(t("upload.errorNoFile"));
    if (!title.trim()) return setError(t("upload.errorTitle"));
    if (!accepted) return;

    setBusy(true);
    setError(null);

    // Path is namespaced by user id: the storage policy only lets you write
    // into your own folder, so the path itself is part of the access check.
    let saved = pendingUpload;
    let write = pendingFile;
    try {
      if (!saved) {
        if (!write) {
          const stem = `${userId}/${crypto.randomUUID()}`;
          const path = `${stem}-${sanitiseName(file.name)}`;
          const { error: uploadError } = await supabase.storage
            .from(STORAGE_BUCKET)
            .upload(path, file, { contentType: file.type, upsert: false });
          if (uploadError) throw uploadError;

          /**
           * The small copy, after the original is safely stored.
           *
           * Deliberately in that order and deliberately swallowed: a
           * thumbnail is an optimisation on how the vault grid loads, and no
           * failure to make or store one may cost somebody the document they
           * came here to file. Every failure below leaves thumb_path null,
           * and a card with no thumbnail falls back to the original -- which
           * is what every card did before this existed.
           */
          let thumbPath: string | null = null;
          try {
            const thumb = await makeThumbnail(file);
            if (thumb) {
              const candidate = `${stem}-thumb.webp`;
              const { error: thumbError } = await supabase.storage
                .from(STORAGE_BUCKET)
                .upload(candidate, thumb.blob, {
                  contentType: "image/webp",
                  upsert: false,
                });
              if (!thumbError) thumbPath = candidate;
            }
          } catch {
            // Nothing to say and nothing to do: file the document.
          }

          write = { path, subjectIds: Array.from(picked), record: {
            owner_id: userId,
            title: title.trim().slice(0, 200),
            description: description.trim().slice(0, 2000) || null,
            category,
            storage_path: path,
            thumb_path: thumbPath,
            original_name: file.name.slice(0, 200),
            mime_type: file.type,
            size_bytes: file.size,
            kind: kindFromMime(file.type),
          } };
          setPendingFile(write);
        } else {
          // An earlier response was lost. Check for its committed row before
          // retrying the same unique storage path, without uploading again.
          const { data: existing, error: readError } = await supabase.from("files")
            .select("id").eq("storage_path", write.path).maybeSingle();
          if (readError) throw readError;
          if (existing) saved = { id: existing.id, subjectIds: write.subjectIds };
        }

        if (!saved) {
          const { data: row, error: insertError } = await supabase.from("files")
            .insert(write.record).select("id").single();
          if (insertError || !row) {
            const { data: existing, error: readError } = await supabase.from("files")
              .select("id").eq("storage_path", write.path).maybeSingle();
            if (existing && !readError) {
              saved = { id: existing.id, subjectIds: write.subjectIds };
            } else {
              // A transport failure is not proof the INSERT failed. Preserve
              // bytes on an uncertain read; a later retry uses this same path.
              if (!readError && /^[0-9A-Z]{5}$/.test(insertError?.code ?? "")) {
                // Both objects: abandoning the original and leaving its
                // thumbnail behind creates an orphan nothing will ever point
                // at, for an upload that never happened.
                const abandon = [write.path];
                const thumb = write.record.thumb_path;
                if (typeof thumb === "string") abandon.push(thumb);
                await supabase.storage.from(STORAGE_BUCKET).remove(abandon);
                setPendingFile(null);
                write = null;
              }
              throw insertError ?? readError ?? new Error("Upload status unknown");
            }
          } else saved = { id: row.id, subjectIds: write.subjectIds };
        }
        setPendingUpload(saved);
        setPendingFile(null);
        write = null;
      }

      if (saved.subjectIds.length) {
        const fileId = saved.id;
        // Keep the uploaded record across retries. An uncertain response may
        // have committed these links, so retrying them must be idempotent too.
        const { error: subjectError } = await supabase
          .from("file_subjects")
          .upsert(
            saved.subjectIds.map((subject_id) => ({
              file_id: fileId,
              subject_id,
            })),
            { onConflict: "file_id,subject_id", ignoreDuplicates: true }
          );
        if (subjectError) throw subjectError;
      }

      router.push(href(`file/${saved.id}`));
      router.refresh();
    } catch (err) {
      const message = typeof err === "object" && err !== null && "message" in err
        ? String(err.message) : "";
      setError(
        saved ? t("upload.savedNeedsSubjects") : write ? t("upload.confirmSave") : message.includes("QUOTA_EXCEEDED")
          ? t("upload.errorQuota")
          : t("upload.errorGeneric")
      );
      setBusy(false);
    }
  }

  const ready = Boolean(file && title.trim() && accepted && !busy && !preparing);

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      <fieldset disabled={busy || Boolean(pendingUpload) || Boolean(pendingFile)} className="contents">
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
          className={`dropzone px-6 py-10 text-center ${
            dragging ? "dropzone-active" : ""
          }`}
        >
          <input
            ref={inputRef}
            id="upload-file"
            type="file"
            // sr-only, not hidden: display:none takes the input out of the tab
            // order, which left the dropzone unreachable by keyboard entirely.
            // The zone shows the focus ring for it via :focus-within.
            className="sr-only"
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
                  width={96}
                  height={96}
                  decoding="async"
                  className="h-24 w-24 rounded-card border border-paper-400 object-cover"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-card border border-paper-400 bg-paper-200 text-ink-500">
                  <KindIcon kind={kindFromMime(file.type)} size={34} />
                </div>
              )}
              <div className="text-left">
                <p className="typewriter text-sm break-all text-ink-900">
                  {file.name}
                </p>
                <p className="docket mt-1 text-2xs text-ink-500">
                  {formatBytes(file.size)} · {file.type}
                </p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearFile();
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
              <label
                htmlFor="upload-file"
                className="cursor-pointer font-semibold text-ink-700"
              >
                {t("upload.dropzone")}
              </label>
              <p className="docket mt-1 text-2xs text-ink-500">
                {t("upload.dropzoneHint", { mb: maxUploadMb })}
              </p>
            </>
          )}
        </div>

        {scrubNote && (
          <p
            role="status"
            className={`notice text-xs ${
              scrubNote === "stripped"
                ? "notice-ok"
                : scrubNote === "unsupported"
                  ? "notice-error"
                  : ""
            }`}
          >
            {t(
              scrubNote === "stripped"
                ? "upload.metadataStripped"
                : scrubNote === "unsupported"
                  ? "upload.metadataUnsupported"
                  : scrubNote === "document"
                    ? "upload.metadataDocument"
                    : "upload.metadataMedia"
            )}
          </p>
        )}

        {/* metadata */}
        <div className="paper p-5">
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
                  <p className="mt-2 text-xs text-ink-400">
                    {t("upload.subjectsHint")}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* accountability */}
        <div className="paper paper-flag-red p-5">
          <p className="docket mb-2 text-stamp-red text-2xs">{t("notice.title")}</p>
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

      </fieldset>
      {error && (
        <p
          role="alert"
          className="notice notice-error"
        >
          {error}
        </p>
      )}
      {pendingUpload && error && (
        <Link href={href(`file/${pendingUpload.id}`)} className="text-sm text-gov-800 underline">
          {t("upload.openSavedFile")}
        </Link>
      )}

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={!ready}
          aria-busy={busy}
          className="btn btn-lg btn-primary"
        >
          {busy && <Spinner />}
          {busy ? t("upload.submitting") : pendingUpload ? t("upload.retrySubjects") : pendingFile ? t("common.retry") : t("upload.submit")}
        </button>

        {busy && (
          <div
            className="h-1.5 flex-1 overflow-hidden rounded-full bg-paper-300"
            role="progressbar"
            aria-label={t("upload.progress")}
          >
            <div className="h-full w-1/3 animate-indeterminate bg-gov-700" />
          </div>
        )}
      </div>
    </form>
  );
}
