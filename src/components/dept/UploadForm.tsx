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
import { uploadObject } from "@/lib/tenant/upload-object";
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

/** One batch at most. Each file is its own upload and its own row. */
const MAX_FILES = 10;

/**
 * What happened to a file's metadata, so the form can say -- and say it per
 * kind rather than only when there is good news.
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
type ScrubNote = "stripped" | "unsupported" | "document" | "media";

const NOTE_ORDER: ScrubNote[] = ["unsupported", "document", "media", "stripped"];
const NOTE_KEY = {
  stripped: "upload.metadataStripped",
  unsupported: "upload.metadataUnsupported",
  document: "upload.metadataDocument",
  media: "upload.metadataMedia",
} as const;

/**
 * One file on its way into the archive, and how far it has got.
 *
 * `write` and `saved` are the recovery state, per file. A batch can fail
 * part-way through any of its files, and a retry has to pick each one up
 * exactly where it stopped: bytes stored but the row uncertain (`write`,
 * retried at the same path, never re-uploaded), row committed but subject
 * links owed (`saved`), or finished (`done`, skipped).
 */
type Staged = {
  key: string;
  file: File;
  title: string;
  preview: string | null;
  note: ScrubNote | null;
  write: {
    path: string;
    record: Record<string, string | number | null>;
    subjectIds: string[];
  } | null;
  saved: { id: string; subjectIds: string[] } | null;
  done: boolean;
  progress: number | null;
  error: string | null;
};

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
  const { branding, href, supabaseUrl, anonKey } = useTenant();
  const supabase = useTenantClient();
  const categories = branding.categories;
  const maxUploadMb = branding.maxUploadMb;
  const maxUploadBytes = maxUploadMb * 1024 * 1024;

  const [items, setItems] = useState<Staged[]>([]);
  // The title typed before any file was chosen. It becomes the first file's
  // title, and it is where that title goes back to if the file is removed.
  const [soloTitle, setSoloTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>(categories[0]);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [accepted, setAccepted] = useState(false);

  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Files still being scrubbed. More can be added while one is in progress.
  const [preparing, setPreparing] = useState(0);
  // Bumped by anything that should discard a scrub still in flight.
  const selectionRequest = useRef(0);

  // The submit loop walks the list as it was when the button was pressed and
  // patches each entry as it goes; it reads the entries from here rather than
  // from a render that is already stale.
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const soloTitleRef = useRef(soloTitle);
  soloTitleRef.current = soloTitle;

  const single = items.length <= 1;
  const solo = items[0];

  // Object URLs for previews are released when their file leaves the list
  // (see removeItem) and, for whatever is left, when the page does.
  useEffect(
    () => () => {
      for (const item of itemsRef.current) {
        if (item.preview) URL.revokeObjectURL(item.preview);
      }
    },
    []
  );

  // Leaving mid-upload abandons it with no word said -- the tab closes, the
  // bytes stop, and the document is simply not in the archive. The browser's
  // own "leave this page?" prompt is the only warning a closing tab can give.
  useEffect(() => {
    if (!busy) return;
    function onBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      // Still what Safari and older Chromium look for.
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [busy]);

  // While any file is part-way through, the form is held as it is: a retry
  // has to file the same things it tried to file the first time.
  const locked =
    busy || items.some((item) => !item.done && (item.write !== null || item.saved !== null));

  function patchItem(key: string, patch: Partial<Staged>) {
    setItems((prev) => prev.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  }

  async function addFiles(list: File[]) {
    if (locked || !list.length) return;
    const ticket = selectionRequest.current;
    setError(null);

    const room = MAX_FILES - itemsRef.current.length;
    const problems: string[] = [];
    if (list.length > room) problems.push(t("upload.tooMany", { max: MAX_FILES }));
    const candidates = list.slice(0, Math.max(0, room));
    // One file refused says why in the form's own words, as it always did;
    // several say which was which.
    const named = (file: File, message: string) =>
      list.length === 1 ? message : `${file.name}: ${message}`;

    setPreparing((n) => n + 1);
    try {
      for (const next of candidates) {
        if (!ACCEPTED_MIME[next.type]) {
          problems.push(named(next, t("upload.errorType")));
          continue;
        }
        if (next.size > maxUploadBytes) {
          problems.push(named(next, t("upload.errorSize", { mb: maxUploadMb })));
          continue;
        }

        // A phone photograph says where it was taken, when, and on what. This
        // archive's subject is often the people in it, so that has to come
        // off before the bytes leave the browser -- afterwards they are in
        // the department owner's bucket and it is too late. Losslessly: the
        // segments are removed from the container, the pixels are not
        // touched.
        let scrubbed;
        try {
          scrubbed = await scrubImage(next);
        } catch {
          problems.push(named(next, t("upload.errorGeneric")));
          continue;
        }
        if (ticket !== selectionRequest.current) return;

        const chosen = scrubbed.file;
        const kind = kindFromMime(chosen.type);
        const note: ScrubNote | null = scrubbed.scrubbed
          ? "stripped"
          : scrubbed.unsupported
            ? "unsupported"
            : kind === "pdf"
              ? "document"
              : kind === "video" || kind === "audio"
                ? "media"
                : null;
        const stem = chosen.name.replace(/\.[^.]+$/, "");

        setItems((prev) => {
          if (prev.length >= MAX_FILES) return prev;
          // The title typed before choosing belongs to the first file.
          const title = prev.length === 0 && soloTitleRef.current.trim() ? soloTitleRef.current : stem;
          return [
            ...prev,
            {
              key: crypto.randomUUID(),
              file: chosen,
              title,
              preview: chosen.type.startsWith("image/") ? URL.createObjectURL(chosen) : null,
              note,
              write: null,
              saved: null,
              done: false,
              progress: null,
              error: null,
            },
          ];
        });
      }
    } finally {
      setPreparing((n) => n - 1);
    }
    if (problems.length && ticket === selectionRequest.current) setError(problems.join(" "));
  }

  // Read through a ref by the paste listener, which is attached once.
  const addFilesRef = useRef(addFiles);
  addFilesRef.current = addFiles;

  /**
   * Pasting a screenshot files it. The clipboard hands images over as files,
   * and only a paste that carries files is taken -- pasting text into the
   * title or the description does what it always did.
   */
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const files = Array.from(e.clipboardData?.files ?? []);
      if (!files.length) return;
      e.preventDefault();
      void addFilesRef.current(files);
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  /**
   * Removing the last file has to reach the <input> as well as the state.
   * Leaving the element's value in place means picking the very same file
   * again fires no change event at all, and the dropzone just sits there
   * looking broken.
   */
  function removeItem(key: string) {
    selectionRequest.current += 1;
    const item = itemsRef.current.find((entry) => entry.key === key);
    if (item?.preview) URL.revokeObjectURL(item.preview);
    // With one file left the title field is that file's; give it back to the
    // field rather than losing what was typed.
    if (itemsRef.current.length === 1 && item) setSoloTitle(item.title);
    setItems((prev) => prev.filter((entry) => entry.key !== key));
    setError(null);
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

  /**
   * File one document: store the bytes, write the row, link the subjects.
   *
   * Resumes from the item's own recovery state, and records it again at each
   * step, so every failure leaves behind exactly what a retry needs.
   */
  async function fileOne(
    item: Staged,
    shared: { description: string; category: string; subjectIds: string[] }
  ): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
    let saved = item.saved;
    let write = item.write;
    patchItem(item.key, { error: null });

    try {
      if (!saved) {
        if (!write) {
          // Path is namespaced by user id: the storage policy only lets you
          // write into your own folder, so the path itself is part of the
          // access check.
          const stem = `${userId}/${crypto.randomUUID()}`;
          const path = `${stem}-${sanitiseName(item.file.name)}`;
          patchItem(item.key, { progress: 0 });
          const { error: uploadError } = await uploadObject(
            supabase,
            { supabaseUrl, anonKey },
            path,
            item.file,
            (fraction) => patchItem(item.key, { progress: fraction })
          );
          patchItem(item.key, { progress: null });
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
            const thumb = await makeThumbnail(item.file);
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

          write = { path, subjectIds: shared.subjectIds, record: {
            owner_id: userId,
            title: item.title.trim().slice(0, 200),
            description: shared.description.trim().slice(0, 2000) || null,
            category: shared.category,
            storage_path: path,
            thumb_path: thumbPath,
            original_name: item.file.name.slice(0, 200),
            mime_type: item.file.type,
            size_bytes: item.file.size,
            kind: kindFromMime(item.file.type),
          } };
          patchItem(item.key, { write });
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
                write = null;
                patchItem(item.key, { write: null });
              }
              throw insertError ?? readError ?? new Error("Upload status unknown");
            }
          } else saved = { id: row.id, subjectIds: write.subjectIds };
        }
        write = null;
        patchItem(item.key, { saved, write: null });
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

      patchItem(item.key, { done: true, error: null });
      return { ok: true, id: saved.id };
    } catch (err) {
      const message = typeof err === "object" && err !== null && "message" in err
        ? String(err.message) : "";
      const text = saved
        ? t("upload.savedNeedsSubjects")
        : write
          ? t("upload.confirmSave")
          : message.includes("QUOTA_EXCEEDED")
            ? t("upload.errorQuota")
            : t("upload.errorGeneric");
      patchItem(item.key, { error: text, progress: null });
      return { ok: false, message: text };
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || preparing) return;
    const batch = itemsRef.current;
    if (!batch.length) return setError(t("upload.errorNoFile"));
    if (batch.some((item) => !item.title.trim())) return setError(t("upload.errorTitle"));
    if (!accepted) return;

    setBusy(true);
    setError(null);

    const shared = { description, category, subjectIds: Array.from(picked) };
    const filed: string[] = [];
    let failed = 0;
    let lastFailure = "";
    // One at a time. In parallel they would share one connection's upload
    // bandwidth anyway, and the per-file progress would crawl in step instead
    // of each finishing in turn.
    for (const item of batch) {
      if (item.done) {
        if (item.saved) filed.push(item.saved.id);
        continue;
      }
      const outcome = await fileOne(item, shared);
      if (outcome.ok) filed.push(outcome.id);
      else {
        failed += 1;
        lastFailure = outcome.message;
      }
    }

    if (failed === 0) {
      // One document opens where it was filed, as it always did. A batch
      // opens the vault on this member's own filings, newest first, which is
      // the one view that shows all of them at once.
      router.push(batch.length === 1 ? href(`file/${filed[0]}`) : `${href("vault")}?sort=new&mine=1`);
      router.refresh();
      return;
    }
    setError(batch.length === 1 ? lastFailure : t("upload.someFailed", { n: failed, total: batch.length }));
    setBusy(false);
  }

  const titlesDone = single ? Boolean((solo?.title ?? soloTitle).trim()) : items.every((item) => item.title.trim());
  const ready = Boolean(items.length && titlesDone && accepted && !busy && !preparing);

  // A greyed-out submit button with no reason given sends people hunting up
  // the page. Named here, beside it, in the order the form asks for them.
  const missing = [
    !items.length && t("upload.needs.file"),
    !titlesDone && t("upload.needs.title"),
    !accepted && t("upload.needs.accept"),
  ].filter((entry): entry is string => Boolean(entry));

  const notes = NOTE_ORDER.filter((note) => items.some((item) => item.note === note));
  const anyFailed = items.some((item) => item.error);
  const soloProgress = busy && single ? (solo?.progress ?? null) : null;

  const submitLabel = busy
    ? t("upload.submitting")
    : single
      ? solo?.saved && !solo.done
        ? t("upload.retrySubjects")
        : solo?.write
          ? t("common.retry")
          : t("upload.submit")
      : anyFailed
        ? t("upload.retryFailed")
        : t("upload.submitMany", { n: items.filter((item) => !item.done).length });

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      <fieldset disabled={locked} className="contents">
        {/* dropzone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={(e) => {
            // Leaving the zone for one of its own children is not leaving it;
            // treated as if it were, the highlight flickered all the way
            // across the icon and the label.
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
              setDragging(false);
            }
          }}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            void addFiles(Array.from(e.dataTransfer.files ?? []));
          }}
          onClick={() => {
            if (!locked && items.length < MAX_FILES) inputRef.current?.click();
          }}
          className={`dropzone text-center ${single && solo ? "px-6 py-10" : items.length ? "px-6 py-5" : "px-6 py-10"} ${
            dragging ? "dropzone-active" : ""
          }`}
        >
          <input
            ref={inputRef}
            id="upload-file"
            type="file"
            multiple
            // sr-only, not hidden: display:none takes the input out of the tab
            // order, which left the dropzone unreachable by keyboard entirely.
            // The zone shows the focus ring for it via :focus-within.
            className="sr-only"
            accept={Object.keys(ACCEPTED_MIME).join(",")}
            onChange={(e) => {
              const chosen = Array.from(e.target.files ?? []);
              // Cleared at once, so picking the same file again after
              // removing it still fires a change.
              e.target.value = "";
              void addFiles(chosen);
            }}
          />

          {single && solo ? (
            <div className="flex items-center justify-center gap-4">
              <Preview item={solo} size="lg" />
              <div className="text-left">
                <p className="typewriter text-sm break-all text-ink-900">
                  {solo.file.name}
                </p>
                <p className="docket mt-1 text-2xs text-ink-500">
                  {formatBytes(solo.file.size)} · {solo.file.type}
                </p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeItem(solo.key);
                    }}
                    className="cursor-pointer text-xs text-stamp-red underline"
                  >
                    {t("common.cancel")}
                  </button>
                  <label
                    htmlFor="upload-file"
                    onClick={(e) => e.stopPropagation()}
                    className="cursor-pointer text-xs text-gov-800 underline"
                  >
                    {t("upload.addMore")}
                  </label>
                </div>
              </div>
            </div>
          ) : (
            <>
              <svg
                className={`mx-auto ${
                  items.length
                    ? "mb-1 text-ink-400"
                    : "mb-3 text-gov-800"
                }`}
                width={items.length ? 24 : 30}
                height={items.length ? 24 : 30}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                aria-hidden
              >
                <path d="M12 16V4M8 8l4-4 4 4M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
              </svg>
              <label
                htmlFor="upload-file"
                onClick={(e) => e.stopPropagation()}
                className="cursor-pointer text-base font-semibold text-ink-900"
              >
                {items.length ? t("upload.dropzoneMore") : t("upload.dropzone")}
              </label>
              <p className="docket mt-1 text-2xs text-ink-500">
                {items.length
                  ? t("upload.queueCount", { n: items.length, max: MAX_FILES })
                  : t("upload.dropzoneHint", { mb: maxUploadMb })}
              </p>
              {!items.length && (
                <p className="mt-1 hidden text-xs text-ink-400 sm:block">
                  {t("upload.pasteHint", { max: MAX_FILES })}
                </p>
              )}
            </>
          )}
        </div>

        {notes.map((note) => (
          <p
            key={note}
            role="status"
            className={`notice text-xs ${
              note === "stripped" ? "notice-ok" : note === "unsupported" ? "notice-error" : ""
            }`}
          >
            {t(NOTE_KEY[note])}
          </p>
        ))}

        {/* the batch */}
        {!single && (
          <ul className="paper divide-y divide-paper-300">
            {items.map((item) => (
              <li key={item.key} className="flex flex-wrap items-center gap-3 p-3 sm:flex-nowrap">
                <Preview item={item} size="sm" />
                <div className="min-w-0 flex-1 basis-48">
                  <input
                    className="field field-sm"
                    value={item.title}
                    onChange={(e) => patchItem(item.key, { title: e.target.value })}
                    aria-label={t("upload.titleFor", { name: item.file.name })}
                    placeholder={t("upload.fileTitlePlaceholder")}
                    maxLength={200}
                    required
                  />
                  <p className="docket mt-1 truncate text-3xs text-ink-500">
                    {item.file.name} · {formatBytes(item.file.size)}
                  </p>
                  {item.error && <p className="mt-1 text-xs text-stamp-red">{item.error}</p>}
                </div>
                <div className="flex w-full shrink-0 items-center justify-end gap-3 sm:w-40">
                  {item.done && item.saved ? (
                    <Link
                      href={href(`file/${item.saved.id}`)}
                      className="text-xs font-semibold text-stamp-green underline underline-offset-2"
                    >
                      ✓ {t("upload.filed")}
                    </Link>
                  ) : item.progress !== null ? (
                    <ProgressBar value={item.progress} label={t("upload.progress")} />
                  ) : busy && !item.error ? (
                    <span className="docket text-3xs text-ink-500">{t("upload.queued")}</span>
                  ) : !item.write && !item.saved ? (
                    <button
                      type="button"
                      onClick={() => removeItem(item.key)}
                      aria-label={t("upload.remove", { name: item.file.name })}
                      className="cursor-pointer text-xs text-stamp-red underline"
                    >
                      {t("upload.removeShort")}
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* metadata */}
        <div className="paper p-5">
          <div className="flex flex-col gap-4">
            {single && (
              <div>
                <label className="label" htmlFor="title">
                  {t("upload.fileTitle")}
                </label>
                <input
                  id="title"
                  className="field"
                  value={solo ? solo.title : soloTitle}
                  onChange={(e) =>
                    solo ? patchItem(solo.key, { title: e.target.value }) : setSoloTitle(e.target.value)
                  }
                  placeholder={t("upload.fileTitlePlaceholder")}
                  maxLength={200}
                  required
                />
              </div>
            )}

            <div>
              <label className="label" htmlFor="description">
                {single ? t("upload.description") : t("upload.descriptionAll")}
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
                          className="chip chip-toggle"
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
      {single && solo?.saved && !solo.done && error && (
        <Link href={href(`file/${solo.saved.id}`)} className="text-sm text-gov-800 underline">
          {t("upload.openSavedFile")}
        </Link>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={!ready}
          aria-busy={busy}
          className="btn btn-lg btn-primary"
        >
          {busy && <Spinner />}
          {submitLabel}
        </button>

        {busy && single && (
          // A real percentage while the file is travelling; the moving bar
          // only for the steps nobody can measure -- the thumbnail, the
          // database row, the subject links. A batch shows one per row.
          <div className="flex min-w-40 flex-1 items-center gap-3">
            <ProgressBar value={soloProgress} label={t("upload.progress")} />
          </div>
        )}

        {!busy && !preparing && missing.length > 0 && !locked && (
          <p className="text-xs text-ink-500">
            {t("upload.needs", { items: missing.join(", ") })}
          </p>
        )}
      </div>
    </form>
  );
}

function Preview({ item, size }: { item: Staged; size: "sm" | "lg" }) {
  const box = size === "lg" ? "h-24 w-24" : "h-12 w-12";
  if (item.preview) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={item.preview}
        alt=""
        width={size === "lg" ? 96 : 48}
        height={size === "lg" ? 96 : 48}
        decoding="async"
        className={`${box} shrink-0 rounded-card border border-paper-400 object-cover`}
      />
    );
  }
  return (
    <div className={`flex ${box} shrink-0 items-center justify-center rounded-card border border-paper-400 bg-paper-200 text-ink-500`}>
      <KindIcon kind={kindFromMime(item.file.type)} size={size === "lg" ? 34 : 20} />
    </div>
  );
}

/** Determinate when there is a number, the travelling bar when there is not. */
function ProgressBar({ value, label }: { value: number | null; label: string }) {
  return (
    <>
      <div
        className="h-1.5 flex-1 overflow-hidden rounded-full bg-paper-300"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value === null ? undefined : Math.round(value * 100)}
      >
        {value === null ? (
          <div className="h-full w-1/3 animate-indeterminate bg-gov-700" />
        ) : (
          <div
            className="h-full bg-gov-700 transition-[width] duration-200 ease-out"
            style={{ width: `${Math.max(2, value * 100)}%` }}
          />
        )}
      </div>
      {value !== null && (
        <span className="typewriter w-10 shrink-0 text-right text-xs tabular-nums text-ink-700">
          {Math.round(value * 100)}%
        </span>
      )}
    </>
  );
}
