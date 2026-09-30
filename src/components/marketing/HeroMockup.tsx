import { Seal } from "@/components/Seal";
import { T } from "@/components/T";
import type { TranslationKey } from "@/lib/i18n/dictionary";
import { SITE_URL } from "@/lib/seo";

/**
 * A picture of the product, drawn in markup rather than shipped as a
 * screenshot: it stays sharp at every density, costs no image request, and
 * speaks whichever language the reader picked.
 *
 * The thumbnails are what an archive like this actually holds -- a typed memo,
 * minutes with a line blacked out, a recording, a photo of a whiteboard --
 * drawn in the same paper and ink as the rest of the product, not stand-in
 * colour washes.
 *
 * Every word in it is illustration. It is aria-hidden as a whole, because a
 * screen reader reading out four invented file names in the middle of the hero
 * would be describing an archive that does not exist.
 */
type Thumb = "memo" | "minutes" | "audio" | "whiteboard";

const FILES: Array<{ title: TranslationKey; thumb: Thumb; docket: string; score: number; category: string }> = [
  { title: "od.mock.file1", thumb: "memo", docket: "SR-0042", score: 31, category: "EXHIBIT" },
  { title: "od.mock.file2", thumb: "minutes", docket: "SR-0041", score: 18, category: "TRANSCRIPT" },
  { title: "od.mock.file3", thumb: "audio", docket: "SR-0039", score: 12, category: "STATEMENT" },
  { title: "od.mock.file4", thumb: "whiteboard", docket: "SR-0036", score: 7, category: "SURVEILLANCE" },
];

/** Ink on the paper itself, which stays paper-coloured in either theme. */
const INK = "#3b3a3f";
const RULE = "#cfcbc2";
/** The surface around the paper follows the theme. */
const DESK = "var(--color-paper-200)";

function Page({ kind }: { kind: Thumb }) {
  if (kind === "audio") {
    // A recording: a waveform, the one thing a sound file looks like.
    const bars = [6, 14, 22, 12, 30, 18, 26, 10, 20, 34, 16, 24, 8, 28, 14, 20, 10, 18, 6];
    return (
      <svg viewBox="0 0 160 100" className="h-full w-full">
        <rect width="160" height="100" fill="var(--color-paper-100)" />
        {bars.map((h, i) => (
          <rect key={i} x={17 + i * 7} y={50 - h / 2} width="3" height={h} rx="1" fill="var(--color-ink-700)" opacity="0.7" />
        ))}
        <text x="17" y="86" fontFamily="monospace" fontSize="8" fill="var(--color-ink-500)">00:31</text>
      </svg>
    );
  }
  if (kind === "whiteboard") {
    // A photo of a whiteboard: a frame, and marker nobody can read.
    return (
      <svg viewBox="0 0 160 100" className="h-full w-full">
        <rect width="160" height="100" fill={DESK} />
        <rect x="14" y="12" width="132" height="76" fill="#ffffff" stroke="#b9b5ad" strokeWidth="3" />
        <path d="M28 34c10-8 20 6 30-2s18 4 26-3" fill="none" stroke="#1c4fc4" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M30 52h40M30 62h28" stroke="#1c4fc4" strokeWidth="2.2" strokeLinecap="round" />
        <circle cx="110" cy="48" r="16" fill="none" stroke="#c0262d" strokeWidth="2.2" />
        <path d="M100 70l22-10" stroke="#c0262d" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    );
  }
  // A typed page. Minutes carry a line somebody blacked out.
  const lines = [22, 30, 38, 46, 54, 62, 70];
  return (
    <svg viewBox="0 0 160 100" className="h-full w-full">
      <rect width="160" height="100" fill={DESK} />
      <rect x="30" y="8" width="100" height="96" fill="#ffffff" stroke={RULE} />
      {lines.map((y, i) => {
        const redacted = kind === "minutes" && i === 3;
        return redacted ? (
          <rect key={y} x="40" y={y - 1.3} width="80" height="5" fill="#16130f" />
        ) : (
          <rect key={y} x="40" y={y} width={i % 3 === 2 ? 52 : 80} height="2.4" fill={INK} opacity="0.32" />
        );
      })}
      {kind === "memo" && (
        <g transform="rotate(-8 104 80)">
          <rect x="84" y="72" width="40" height="15" rx="2" fill="none" stroke="#c0262d" strokeWidth="1.6" />
          <text x="104" y="82.5" textAnchor="middle" fontFamily="monospace" fontSize="7" fontWeight="bold" fill="#c0262d">
            RECEIVED
          </text>
        </g>
      )}
    </svg>
  );
}

export function HeroMockup() {
  return (
    <div aria-hidden className="relative select-none">
      <div className="overflow-hidden rounded-card border border-paper-400 bg-paper-50 shadow-pop">
        {/* The address, which is the one piece of browser chrome that says
            something: whose archive this is. */}
        <div className="border-b border-paper-300 bg-paper-100 px-4 py-2">
          <span className="block truncate font-mono text-3xs text-ink-500">
            {new URL(SITE_URL).host}/d/staff-room/vault
          </span>
        </div>

        <div className="h-[3px] bg-[#c9a227]" />
        <div className="flex items-center gap-2.5 border-b border-paper-300 px-4 py-3">
          <Seal size={28} top="STAFF ROOM FILES" bottom="OFFICIAL USE ONLY" accent="#c9a227" idPrefix="mock" />
          <span className="font-display text-sm font-bold text-ink-900">
            <T k="od.mock.dept" />
          </span>
          <span className="ml-auto rounded-tag bg-[#c9a227] px-2.5 py-1 text-3xs font-semibold text-gov-950">
            + <T k="nav.upload" />
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 bg-paper-100 p-4">
          {FILES.map((file) => (
            <div key={file.docket} className="overflow-hidden rounded-control border border-paper-300 bg-paper-50">
              <div className="h-20 border-b border-paper-300 sm:h-24">
                <Page kind={file.thumb} />
              </div>
              <div className="p-2.5">
                <p className="flex items-center gap-2">
                  <span className="docket text-3xs text-ink-500">{file.docket}</span>
                  <span className="stamp stamp-blue stamp-sm hidden sm:inline-block">{file.category}</span>
                </p>
                <p className="mt-1 line-clamp-1 text-2xs font-semibold text-ink-900">
                  <T k={file.title} />
                </p>
                <p className="mt-1.5 text-3xs font-semibold text-stamp-green">▲ {file.score}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* The parody, where it is a wink rather than the whole interface. */}
      <span className="stamp stamp-red absolute -top-4 -right-2 bg-paper-50 text-xs sm:-right-4 sm:text-sm">
        CLASSIFIED
      </span>
    </div>
  );
}
