"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { KindIcon } from "@/components/KindIcon";
import type { FileKind } from "@/lib/tenant/types";

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
      <div className="flex justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={title}
          onError={() => setBroken(true)}
          className="max-h-[70vh] w-auto max-w-full rounded-xs border border-paper-400 bg-white object-contain shadow-md"
        />
      </div>
    );
  }

  if (kind === "video") {
    return (
      <video
        src={url}
        controls
        preload="metadata"
        onError={() => setBroken(true)}
        className="mx-auto max-h-[70vh] w-full rounded-xs border border-paper-400 bg-black shadow-md"
      >
        <track kind="captions" />
      </video>
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
      className="h-[70vh] w-full rounded-xs border border-paper-400 bg-white shadow-md"
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
    <div className="flex min-h-56 flex-col items-center justify-center rounded-xs border border-dashed border-paper-400 bg-paper-100 p-8 text-center">
      {children}
    </div>
  );
}
