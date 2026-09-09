"use client";

import { useState, useTransition } from "react";
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
 *     where it would outlive the one-hour signature it was fetched with.
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

  /**
   * PDF, in a sandboxed frame rather than an <object>.
   *
   * What decides how the bytes are rendered is the response's Content-Type,
   * never a `type` attribute the markup asserts -- and that value is whatever
   * the uploading browser said it was. Storage takes it from the client, and
   * the storage INSERT policy checks the folder and the membership, not the
   * media type. The CHECK constraint in db/tenant-schema.sql fences
   * `files.mime_type` and `kind` -- the ROW -- and cannot reach the object
   * those columns describe.
   *
   * So a member could file a row as application/pdf over an object stored as
   * text/html, and an <object> would render it: a document with scripts, in a
   * nested browsing context, on the department's own supabase.co origin, which
   * the policy has to allow because that is where every exhibit lives. Not
   * cross-site scripting against this app -- the session cookie is on this
   * origin, not that one -- but active content inside a page a member trusts,
   * which is enough for a convincing overlay, a top-level navigation attempt
   * and a beacon carrying whoever opened the exhibit.
   *
   * The sandbox is what makes the media type stop mattering. With neither
   * allow-scripts nor allow-same-origin, a smuggled HTML document is inert
   * markup in an opaque origin, while the browser's own PDF viewer -- which is
   * not page script -- goes on rendering an actual PDF. allow-downloads keeps
   * that viewer's save button working; the download link beside it is the
   * fallback either way.
   */
  return (
    <iframe
      src={url}
      title={title}
      sandbox="allow-downloads"
      referrerPolicy="no-referrer"
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
