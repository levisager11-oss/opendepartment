"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/provider";

const ITCH_GAME_URL = "https://levisager11-oss.itch.io/deepsub";
const ITCH_EMBED_URL =
  "https://itch.io/embed/5114290?linkback=true&bg_color=0b1a20&fg_color=cbdcd7&link_color=72e5b0&border_color=353d42";

/**
 * itch.io widget for the developer's game, loaded only on click.
 *
 * The cookie notice and privacy notice promise that nothing from a third party
 * loads on these pages until the reader asks for it (see KofiButton for the
 * same reasoning). An iframe would send every visitor's address to itch.io on
 * page load, so until the button is pressed this is a plain link and a button,
 * and the frame does not exist. The proxy allows itch.io in frame-src on the
 * landing page only.
 */
export function ItchEmbed() {
  const { t } = useI18n();
  const [loaded, setLoaded] = useState(false);

  if (loaded) {
    return (
      <iframe
        src={ITCH_EMBED_URL}
        title="DEEPSUB on itch.io"
        width={552}
        height={167}
        className="block h-[167px] w-full max-w-[552px] border-0"
      >
        <a href={ITCH_GAME_URL}>DEEPSUB by levisager11-oss</a>
      </iframe>
    );
  }

  return (
    <div className="flex w-full max-w-[552px] flex-col gap-3 rounded-control border border-paper-300 bg-paper-50 p-4">
      <p className="text-sm text-ink-700">
        <a
          href={ITCH_GAME_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-ink-900 underline"
        >
          DEEPSUB
        </a>{" "}
        – {t("od.itchBody")}
      </p>
      <p className="text-xs text-ink-500">{t("od.itchNotice")}</p>
      <div>
        <button type="button" className="btn btn-ghost" onClick={() => setLoaded(true)}>
          {t("od.itchLoad")}
        </button>
      </div>
    </div>
  );
}
