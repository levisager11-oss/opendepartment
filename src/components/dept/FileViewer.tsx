"use client";

import { useEffect, useState, useTransition } from "react";
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
      <MediaFrame>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={title}
          decoding="async"
          onError={() => setBrokenUrl(url)}
          className="max-h-full max-w-full object-contain"
        />
      </MediaFrame>
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
    <iframe
      src={blobUrl}
      title={title}
      className="h-viewer w-full rounded-card border border-paper-400 bg-white shadow-md"
    />
  );
}

function Placeholder({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center rounded-card border border-dashed border-paper-400 bg-paper-100 p-8 text-center">
      {children}
    </div>
  );
}
