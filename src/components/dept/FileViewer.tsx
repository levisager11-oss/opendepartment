"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/provider";
import { KindIcon } from "@/components/KindIcon";
import type { FileKind } from "@/lib/tenant/types";

/**
 * Why these are <img>/<video> and not next/image.
 *
 * Every exhibit is a *signed* URL into the department owner's own Supabase
 * Storage bucket, on a hostname that is not known until the request is served.
 * Putting them behind next/image would mean:
 *
 *   - proxying tenant media through our origin, which contradicts the property
 *     the README sells the whole product on -- files go browser to the owner's
 *     bucket and never pass through our server -- and turns zero storage
 *     egress into per-view egress on every department; and
 *   - caching private, time-limited content at /_next/image on our domain,
 *     where it would outlive the short signature it was fetched with.
 *
 * So the tags stay raw. What they must not do is cost layout stability, which
 * is what MediaFrame below is for: every exhibit kind renders into the same
 * reserved box, so nothing reflows when the bytes land and the page does not
 * jump when you page from a portrait scan to a landscape one.
 */

function MediaFrame({
  children,
  dark,
}: {
  children: React.ReactNode;
  dark?: boolean;
}) {
  return (
    <div
      className={`flex h-viewer items-center justify-center overflow-hidden rounded-card border border-paper-400 shadow-md ${
        dark ? "bg-black" : "bg-white"
      }`}
    >
      {children}
    </div>
  );
}

export function FileViewer({
  kind,
  url,
  title,
}: {
  kind: FileKind;
  url: string | null;
  title: string;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [brokenUrl, setBrokenUrl] = useState<string | null>(null);
  const [retrying, startTransition] = useTransition();

  if (!url || brokenUrl === url) {
    return (
      <Placeholder>
        <p role="alert" className="text-sm text-ink-500">{t("file.previewFailed")}</p>
        <button type="button" className="btn btn-ghost mt-4" disabled={retrying}
          aria-busy={retrying} onClick={() => {
            setBrokenUrl(null);
            startTransition(() => router.refresh());
          }}>
          {retrying ? t("common.loading") : t("common.retry")}
        </button>
      </Placeholder>
    );
  }

  if (kind === "other") {
    return (
      <Placeholder>
        <KindIcon kind={kind} size={40} className="text-ink-400" />
        <p className="mt-3 max-w-sm text-sm text-ink-500">
          {t("file.unsupported")}
        </p>
      </Placeholder>
    );
  }

  if (kind === "image") {
    return (
      <ImageView url={url} title={title} onError={() => setBrokenUrl(url)} />
    );
  }

  if (kind === "video") {
    return (
      <MediaFrame dark>
        <video
          src={url}
          controls
          preload="metadata"
          onError={() => setBrokenUrl(url)}
          className="max-h-full max-w-full"
        >
          <track kind="captions" />
        </video>
      </MediaFrame>
    );
  }

  if (kind === "audio") {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-paper-400 bg-paper-100 text-ink-500">
          <KindIcon kind="audio" size={34} />
        </div>
        <audio
          src={url}
          controls
          preload="metadata"
          onError={() => setBrokenUrl(url)}
          className="w-full max-w-md"
        />
      </div>
    );
  }

  return (
    <PdfFrame
      url={url}
      title={title}
      onError={() => setBrokenUrl(url)}
    />
  );
}

/** A PDF begins with `%PDF-`, allowed anywhere in its first kilobyte. */
function looksLikePdf(bytes: ArrayBuffer): boolean {
  const head = new Uint8Array(bytes, 0, Math.min(1024, bytes.byteLength));
  const magic = [0x25, 0x50, 0x44, 0x46, 0x2d];
  for (let i = 0; i + magic.length <= head.length; i++) {
    if (magic.every((byte, j) => head[i + j] === byte)) return true;
  }
  return false;
}

/**
 * PDF, fetched into a blob whose type this code chose rather than framed
 * straight from storage.
 *
 * What decides how a framed document renders is the response's Content-Type,
 * and Storage returns whatever the uploading browser said it was -- so a
 * member could file a row as application/pdf over an object stored as
 * text/html, and framing the signed URL would run that document's scripts in
 * a page a member trusts.
 *
 * The first answer to that was a sandboxed iframe, and it made every PDF
 * preview in Chrome, Edge and every other Chromium browser a grey "blocked"
 * page: a sandboxed frame may not load plugins, and Chromium's PDF viewer is
 * one. There is no sandbox token that allows it.
 *
 * This takes the decision away from the uploader instead. The bytes are
 * fetched here, refused unless they open like a PDF, and re-wrapped as a Blob
 * typed application/pdf -- so whatever the object claimed to be, the frame can
 * only ever hand it to the browser's PDF viewer, never to the HTML parser.
 * The blob is revoked when the URL changes or the viewer unmounts.
 */
function PdfFrame({
  url,
  title,
  onError,
}: {
  url: string;
  title: string;
  onError: () => void;
}) {
  const { t } = useI18n();
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let created: string | null = null;
    setBlobUrl(null);

    (async () => {
      try {
        const response = await fetch(url, {
          credentials: "omit",
          referrerPolicy: "no-referrer",
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const bytes = await response.arrayBuffer();
        if (!looksLikePdf(bytes)) throw new Error("Not a PDF");
        if (cancelled) return;
        created = URL.createObjectURL(
          new Blob([bytes], { type: "application/pdf" })
        );
        setBlobUrl(created);
      } catch {
        if (!cancelled) onError();
      }
    })();

    return () => {
      cancelled = true;
      if (created) URL.revokeObjectURL(created);
    };
    // onError is a fresh closure each render; the fetch belongs to the URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  if (!blobUrl) {
    return (
      <MediaFrame>
        <p role="status" className="typewriter text-sm text-ink-500">
          {t("common.loading")}
        </p>
      </MediaFrame>
    );
  }

  return (
    <>
      <iframe
        src={blobUrl}
        title={title}
        className="h-viewer w-full rounded-card border border-paper-400 bg-white shadow-md"
      />
      {/* Phone browsers mostly cannot page through a framed PDF: iOS draws
          the first page as a picture, Android draws nothing at all. The same
          blob opened as a page of its own gets the platform's real viewer.
          It is still the blob typed above, never the storage URL, so this
          adds no way for an uploader's Content-Type to reach a browser. */}
      <ViewerActions>
        <a
          href={blobUrl}
          target="_blank"
          rel="noopener"
          className="btn btn-sm btn-ghost"
        >
          {t("file.openTab")}
        </a>
      </ViewerActions>
    </>
  );
}

function ViewerActions({ children }: { children: React.ReactNode }) {
  return <div className="mt-2 flex justify-end gap-2">{children}</div>;
}

/**
 * An image in the reserved frame, with a way to see it larger.
 *
 * The frame is 70vh tall and a scanned page shrinks into it until the text is
 * unreadable, which made "open the image" the first thing anybody wanted and
 * there was no way to do it short of downloading. The overlay reuses the same
 * signed URL in an <img> -- deliberately not a link to it: opening a storage
 * URL as a page would hand the uploader's Content-Type to the browser, which
 * is the thing the PDF viewer below goes out of its way to avoid. It opens
 * fitted to the screen; clicking the picture toggles its real size.
 */
function ImageView({
  url,
  title,
  onError,
}: {
  url: string;
  title: string;
  onError: () => void;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [actual, setActual] = useState(false);
  const opener = useRef<HTMLButtonElement>(null);
  const closer = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const trigger = opener.current;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closer.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
      // Two controls, so Tab only has to stay between them.
      if (e.key === "Tab") {
        e.preventDefault();
        closer.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
      trigger?.focus();
    };
  }, [open]);

  return (
    <>
      <MediaFrame>
        <button
          ref={opener}
          type="button"
          onClick={() => {
            setActual(false);
            setOpen(true);
          }}
          aria-label={t("file.fullSize")}
          className="flex h-full w-full cursor-zoom-in items-center justify-center"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={title}
            decoding="async"
            onError={onError}
            className="max-h-full max-w-full object-contain"
          />
        </button>
      </MediaFrame>
      <ViewerActions>
        <button
          type="button"
          onClick={() => {
            setActual(false);
            setOpen(true);
          }}
          className="btn btn-sm btn-ghost"
        >
          {t("file.fullSize")}
        </button>
      </ViewerActions>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className="on-dark fixed inset-0 z-50 overflow-auto bg-black/90"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <button
            ref={closer}
            type="button"
            onClick={() => setOpen(false)}
            className="btn btn-sm fixed top-3 right-3 z-10 border-white/30 bg-black/60 text-white hover:bg-black/80"
          >
            {t("common.close")}
          </button>
          <div
            // m-auto on the picture rather than justify-center here: a
            // centred flex item wider than its box overflows on BOTH sides,
            // and the left half can never be scrolled to.
            className="flex min-h-full w-max min-w-full p-4 sm:p-8"
            onClick={(e) => {
              if (e.target === e.currentTarget) setOpen(false);
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt=""
              decoding="async"
              onClick={() => setActual((v) => !v)}
              className={
                actual
                  ? "m-auto max-w-none cursor-zoom-out"
                  : "m-auto max-h-[calc(100dvh-4rem)] max-w-[calc(100vw-2rem)] cursor-zoom-in object-contain sm:max-w-[calc(100vw-4rem)]"
              }
            />
          </div>
        </div>
      )}
    </>
  );
}

function Placeholder({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center rounded-card border border-dashed border-paper-400 bg-paper-100 p-8 text-center">
      {children}
    </div>
  );
}
