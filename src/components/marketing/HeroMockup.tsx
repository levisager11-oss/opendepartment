import { KindIcon } from "@/components/KindIcon";
import { Seal } from "@/components/Seal";
import { T } from "@/components/T";
import type { TranslationKey } from "@/lib/i18n/dictionary";
import { SITE_URL } from "@/lib/seo";
import type { FileKind } from "@/lib/tenant/types";

/**
 * A picture of the product, drawn in markup rather than shipped as a
 * screenshot: it stays sharp at every density, costs no image request, and
 * speaks whichever language the reader picked.
 *
 * Every word in it is illustration. It is aria-hidden as a whole, because a
 * screen reader reading out four invented file names in the middle of the hero
 * would be describing an archive that does not exist.
 */
const FILES: Array<{
  title: TranslationKey;
  kind: FileKind;
  docket: string;
  score: number;
  tint: string;
}> = [
  { title: "od.mock.file1", kind: "image", docket: "SR-0042", score: 31, tint: "from-sky-200 to-blue-300" },
  { title: "od.mock.file2", kind: "pdf", docket: "SR-0041", score: 18, tint: "from-amber-100 to-orange-200" },
  { title: "od.mock.file3", kind: "audio", docket: "SR-0039", score: 12, tint: "from-emerald-100 to-teal-200" },
  { title: "od.mock.file4", kind: "video", docket: "SR-0036", score: 7, tint: "from-violet-100 to-fuchsia-200" },
];

export function HeroMockup() {
  return (
    <div aria-hidden className="relative select-none">
      {/* The glow behind the window. */}
      <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-to-br from-gov-100 via-white to-amber-50 blur-2xl" />

      <div className="overflow-hidden rounded-2xl border border-paper-300 bg-paper-50 shadow-pop">
        {/* window chrome */}
        <div className="flex items-center gap-1.5 border-b border-paper-300 bg-paper-100 px-4 py-2.5">
          <span className="size-2.5 rounded-full bg-[#ff5f57]" />
          <span className="size-2.5 rounded-full bg-[#febc2e]" />
          <span className="size-2.5 rounded-full bg-[#28c840]" />
          <span className="ml-3 truncate rounded-md bg-paper-50 px-3 py-0.5 font-mono text-3xs text-ink-400">
            {new URL(SITE_URL).host}/d/staff-room
          </span>
        </div>

        {/* app header */}
        <div className="flex items-center gap-2.5 border-b border-paper-300 px-4 py-3">
          <Seal size={28} top="STAFF ROOM FILES" bottom="OFFICIAL USE ONLY" accent="#c9a227" idPrefix="mock" />
          <span className="font-display text-sm font-bold text-ink-900">
            <T k="od.mock.dept" />
          </span>
          <span className="ml-auto rounded-md bg-gov-800 px-2.5 py-1 text-3xs font-semibold text-white">
            + <T k="nav.upload" />
          </span>
        </div>

        <div className="space-y-3 p-4">
          {/* search and filters */}
          <div className="flex items-center gap-2">
            <div className="flex h-7 flex-1 items-center gap-2 rounded-md border border-paper-300 px-2.5 text-3xs text-ink-400">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-4-4" strokeLinecap="round" />
              </svg>
              <T k="vault.search" />
            </div>
            <span className="chip bg-gov-100 text-3xs text-gov-800"><T k="vault.sort.top" /></span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {FILES.map((file) => (
              <div key={file.docket} className="overflow-hidden rounded-xl border border-paper-300 bg-paper-50">
                <div className={`flex h-16 items-center justify-center bg-gradient-to-br sm:h-20 ${file.tint}`}>
                  <KindIcon kind={file.kind} size={22} className="text-ink-900/45" />
                </div>
                <div className="p-2.5">
                  <p className="docket text-3xs text-ink-400">{file.docket}</p>
                  <p className="mt-0.5 line-clamp-1 text-2xs font-semibold text-ink-900">
                    <T k={file.title} />
                  </p>
                  <div className="mt-1.5 flex items-center gap-1 text-3xs font-semibold text-stamp-green">
                    <svg width="9" height="9" viewBox="0 0 10 10">
                      <path d="M5 2l3.5 5h-7z" fill="currentColor" />
                    </svg>
                    {file.score}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Floating details: the parody, kept where it is a wink rather than
          the whole interface. */}
      <span className="stamp stamp-red absolute -top-4 -right-3 bg-paper-50/80 text-xs sm:text-sm">
        CLASSIFIED
      </span>
      <div className="absolute -bottom-8 -left-5 hidden w-56 rounded-xl border border-paper-300 bg-paper-50 p-3 shadow-lift sm:block">
        <p className="text-3xs font-semibold text-ink-400">
          <T k="od.mock.commentBy" />
        </p>
        <p className="mt-0.5 text-2xs leading-snug text-ink-900">
          <T k="od.mock.comment" />
        </p>
      </div>
    </div>
  );
}
