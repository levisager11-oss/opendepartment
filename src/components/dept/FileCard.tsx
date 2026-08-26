"use client";

import Link from "next/link";
import { KindIcon, kindLabel } from "@/components/KindIcon";
import { VoteButtons } from "./VoteButtons";
import { useI18n } from "@/lib/i18n/provider";
import { useTenant } from "@/lib/tenant/context";
import { caseLabel, formatBytes, type CaseFile } from "@/lib/tenant/types";

export function FileCard({
  file,
  thumbnail,
}: {
  file: CaseFile;
  thumbnail?: string | null;
}) {
  const { t, formatDate } = useI18n();
  const { branding, href } = useTenant();

  return (
    <article className="animate-fade-up group relative">
      {/* folder tab */}
      <div className="paper-tab ml-4 inline-block px-3 py-0.5">
        <span className="docket text-3xs text-ink-700">
          {caseLabel(file.case_number, branding.docketPrefix)}
        </span>
      </div>

      <div className="paper relative flex gap-3 p-3 transition-shadow group-hover:shadow-md">
        <VoteButtons
          fileId={file.id}
          initialScore={file.score}
          initialVote={file.my_vote ?? 0}
          size="sm"
        />

        <Link
          href={href(`file/${file.id}`)}
          className="flex min-w-0 flex-1 gap-3"
        >
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-card border border-paper-400 bg-paper-200">
            {thumbnail ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={thumbnail}
                alt=""
                width={80}
                height={80}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-ink-400">
                <KindIcon kind={file.kind} size={26} />
                <span className="docket text-3xs text-ink-500">
                  {kindLabel(file.kind)}
                </span>
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <span className="stamp stamp-blue stamp-sm">
                {file.category}
              </span>
              {file.subjects.slice(0, 2).map((s) => (
                <span key={s.id} className="docket text-3xs text-gov-800">
                  · {s.name}
                </span>
              ))}
              {file.subjects.length > 2 && (
                <span className="docket text-3xs text-ink-500">
                  +{file.subjects.length - 2}
                </span>
              )}
            </div>

            <h3 className="truncate font-serif text-base font-bold text-gov-900 group-hover:underline">
              {file.title}
            </h3>

            {file.description && (
              <p className="mt-0.5 line-clamp-2 text-sm leading-snug text-ink-500">
                {file.description}
              </p>
            )}

            <div className="docket mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-3xs text-ink-500">
              <span className="typewriter text-2xs normal-case tracking-normal text-gov-800">
                {file.owner_username ?? "—"}
              </span>
              <span>{formatDate(file.created_at)}</span>
              <span>
                {file.view_count} {t("file.views")}
              </span>
              <span>
                {file.comment_count} {t("file.comments")}
              </span>
              <span>{formatBytes(file.size_bytes)}</span>
            </div>
          </div>
        </Link>
      </div>
    </article>
  );
}
