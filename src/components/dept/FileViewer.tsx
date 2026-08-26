"use client";

import { useState } from "react";
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
  mimeType,
  title,
}: {
  kind: FileKind;
  url: string | null;
  mimeType: string;
  title: string;
}) {
  const { t } = useI18n();
  const [broken, setBroken] = useState(false);

  if (!url) {
    return (
      <Placeholder>
        <p className="typewriter text-ink-500">{t("file.loadingPreview")}</p>
      </Placeholder>
    );
  }

  if (broken || kind === "other") {
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
          onError={() => setBroken(true)}
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
          onError={() => setBroken(true)}
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
          onError={() => setBroken(true)}
          className="w-full max-w-md"
        />
      </div>
    );
  }

  // PDF. <object> degrades to the fallback on browsers that refuse to inline it.
  return (
    <object
      data={url}
      type={mimeType}
      className="h-viewer w-full rounded-card border border-paper-400 bg-white shadow-md"
      aria-label={title}
    >
      <Placeholder>
        <KindIcon kind="pdf" size={40} className="text-ink-400" />
        <p className="mt-3 max-w-sm text-sm text-ink-500">
          {t("file.unsupported")}
        </p>
      </Placeholder>
    </object>
  );
}

function Placeholder({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center rounded-card border border-dashed border-paper-400 bg-paper-100 p-8 text-center">
      {children}
    </div>
  );
}
