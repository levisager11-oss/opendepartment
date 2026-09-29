"use client";

import Link from "next/link";
import { KindIcon, kindLabel } from "@/components/KindIcon";
import { VoteButtons } from "./VoteButtons";
import { useI18n } from "@/lib/i18n/provider";
import { useTenant } from "@/lib/tenant/context";
import {
  caseLabel,
  formatBytes,
  type CaseFile,
} from "@/lib/tenant/types";

const ICON = {
  comment: "M4 5h16v11H9l-5 4z",
  eye: "M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
};

function Stat({ path, label, value }: { path: string; label: string; value: number }) {
  return (
    <span className="inline-flex items-center gap-1" title={label}>
      <svg aria-hidden width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
        <path d={path} />
      </svg>
      <span className="sr-only">{label}</span>
      <span aria-hidden className="tabular-nums">{value}</span>
    </span>
  );
}

function Thumb({
  file,
  thumbnail,
  className,
  iconSize,
}: {
  file: CaseFile;
  thumbnail?: string | null;
  className: string;
  iconSize: number;
}) {
  return (
    // No picture: the kind's own mark on plain paper. One neutral for every
    // kind -- a colour per kind turned the grid into a rainbow that said
    // nothing the label under the mark does not.
    <div className={`relative overflow-hidden ${className} ${thumbnail ? "bg-paper-200" : "bg-paper-100 text-ink-400"}`}>
      {thumbnail ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumbnail}
          alt=""
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-1">
          <KindIcon kind={file.kind} size={iconSize} />
          <span className="docket text-3xs opacity-80">{kindLabel(file.kind)}</span>
        </div>
      )}
    </div>
  );
}

export function FileCard({
  file,
  thumbnail,
  view = "grid",
}: {
  file: CaseFile;
  thumbnail?: string | null;
  view?: "grid" | "list";
}) {
  const { plural, formatDate } = useI18n();
  const { branding, href } = useTenant();
  const docket = caseLabel(file.case_number, branding.docketPrefix);

  if (view === "list") {
    return (
      <article className="group flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-paper-100 sm:gap-4 sm:px-4">
        <Link href={href(`file/${file.id}`)} className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
          <Thumb file={file} thumbnail={thumbnail} className="size-11 shrink-0 rounded-control" iconSize={20} />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-semibold text-ink-900 group-hover:text-gov-800">
              {file.title}
            </h2>
            <p className="mt-0.5 flex items-center gap-2 truncate text-xs text-ink-500">
              <span className="docket text-3xs">{docket}</span>
              <span aria-hidden>·</span>
              <span className="truncate">{file.owner_username ?? "—"}</span>
              <span aria-hidden className="hidden sm:inline">·</span>
              <span className="hidden sm:inline">{formatDate(file.created_at)}</span>
            </p>
          </div>
          {/* A fixed column, so the sizes and scores after it line up down
              the list however long each category's name is. */}
          <span className="hidden w-44 shrink-0 text-right md:block">
            <span className="stamp stamp-blue stamp-sm">{file.category}</span>
          </span>
          <span className="hidden w-16 shrink-0 text-right text-xs text-ink-500 tabular-nums lg:block">
            {formatBytes(file.size_bytes)}
          </span>
          <span className="hidden shrink-0 items-center gap-3 text-xs text-ink-500 sm:flex">
            <Stat path={ICON.comment} label={plural("file.commentCount", file.comment_count)} value={file.comment_count} />
          </span>
        </Link>
        <VoteButtons
          fileId={file.id}
          initialScore={file.score}
          initialVote={file.my_vote ?? 0}
          size="sm"
          layout="row"
        />
      </article>
    );
  }

  return (
    // A column that stretches, so every card in a grid row is as tall as the
    // tallest: a row where one card carried a subject line and its
    // neighbours did not used to end in three different places.
    <article className="paper lift animate-fade-up group relative flex flex-col overflow-hidden">
      <Link href={href(`file/${file.id}`)} className="flex flex-1 flex-col">
        <div className="relative">
          <Thumb file={file} thumbnail={thumbnail} className="aspect-[16/10] w-full" iconSize={36} />
          <span className="docket absolute top-2.5 left-2.5 rounded-tag border border-paper-300 bg-paper-50 px-1.5 py-0.5 text-3xs text-ink-700">
            {docket}
          </span>
        </div>

        <div className="flex flex-1 flex-col p-4">
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            <span className="stamp stamp-blue stamp-sm">{file.category}</span>
            {file.subjects.slice(0, 2).map((s) => (
              <span key={s.id} className="chip text-2xs">
                {s.name}
              </span>
            ))}
            {file.subjects.length > 2 && (
              <span className="chip text-2xs">+{file.subjects.length - 2}</span>
            )}
          </div>

          {/* Two lines at every width. Cut to one, the stapler's "before" and
              "after" photographs were both "Photograph of the stapler (…" --
              the one word that told them apart was the one that went. */}
          <h2 className="line-clamp-2 text-base leading-snug font-semibold text-ink-900 group-hover:text-gov-800">
            {file.title}
          </h2>

          {file.description && (
            <p className="mt-1 line-clamp-2 text-sm leading-snug text-ink-500">
              {file.description}
            </p>
          )}

          <p className="mt-auto pt-3 text-xs text-ink-500">
            <span className="font-medium text-ink-700">{file.owner_username ?? "—"}</span>
            {" · "}
            {formatDate(file.created_at)}
            {" · "}
            {formatBytes(file.size_bytes)}
          </p>
        </div>
      </Link>

      <div className="flex items-center justify-between gap-3 border-t border-paper-300 px-3 py-2">
        <VoteButtons
          fileId={file.id}
          initialScore={file.score}
          initialVote={file.my_vote ?? 0}
          size="sm"
          layout="row"
        />
        <span className="flex items-center gap-3 pr-1 text-xs text-ink-500">
          <Stat path={ICON.comment} label={plural("file.commentCount", file.comment_count)} value={file.comment_count} />
          <Stat path={ICON.eye} label={plural("file.viewCount", file.view_count)} value={file.view_count} />
        </span>
      </div>
    </article>
  );
}
