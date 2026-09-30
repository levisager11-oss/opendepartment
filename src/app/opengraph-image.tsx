import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt = "OpenDepartment · run your own files.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const GOLD = "#c9a227";
const BLUE = "#0050d8";
const INK = "#1c1b1f";

/**
 * Shares the landing page's own hero rather than inventing separate share-card
 * art: the logo, the headline, one line of what it is, and the seal a
 * department wears. Curved ring text and the beading ring from the real Seal
 * component are left out: Satori (the renderer behind ImageResponse) has no
 * textPath support, and at social-card scale the plain scale-and-star mark
 * reads better anyway.
 */
export default async function Image() {
  // The site's own two faces, as static files: Satori (the renderer behind
  // ImageResponse) cannot read the variable fonts next/font serves the pages.
  const fontDir = join(process.cwd(), "src/assets/fonts");
  const [bricolage, publicSans] = await Promise.all([
    readFile(join(fontDir, "BricolageGrotesque-ExtraBold.ttf")),
    readFile(join(fontDir, "PublicSans-SemiBold.ttf")),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#ffffff",
          fontFamily: "Public Sans",
        }}
      >
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 88px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", maxWidth: 680 }}>
            <div style={{ display: "flex", alignItems: "center", marginBottom: 44 }}>
              <svg width="56" height="56" viewBox="0 0 32 32">
                <rect width="32" height="32" rx="6" fill={BLUE} />
                <path
                  d="M7.5 11a1.5 1.5 0 0 1 1.5-1.5h4.6l2 2H23a1.5 1.5 0 0 1 1.5 1.5v8.5A1.5 1.5 0 0 1 23 23H9a1.5 1.5 0 0 1-1.5-1.5z"
                  fill="#ffffff"
                />
                <circle cx="16" cy="17.25" r="3.1" fill="none" stroke={BLUE} strokeWidth="1.5" />
                <circle cx="16" cy="17.25" r="1.1" fill={BLUE} />
              </svg>
              <div style={{ display: "flex", marginLeft: 18, fontFamily: "Bricolage Grotesque", fontSize: 34, fontWeight: 800, color: INK }}>
                OpenDepartment
              </div>
            </div>
            <div
              style={{
                display: "flex",
                fontFamily: "Bricolage Grotesque",
                fontSize: 74,
                fontWeight: 800,
                lineHeight: 1.02,
                letterSpacing: -2,
                color: INK,
                marginBottom: 28,
              }}
            >
              The official archive of your group chat.
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 28,
                fontWeight: 600,
                lineHeight: 1.4,
                color: "#5c5a60",
              }}
            >
              Private, invite-only, and stored in a Supabase project you own.
            </div>
          </div>

          <svg width="280" height="280" viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="97" fill="#0d2547" />
            <circle
              cx="100"
              cy="100"
              r="92"
              fill="none"
              stroke={GOLD}
              strokeWidth="2"
            />
            <circle
              cx="100"
              cy="100"
              r="60"
              fill="none"
              stroke={GOLD}
              strokeWidth="1.5"
              opacity="0.8"
            />
            <path
              d="M100 46 L109 74 L138 74 L114 91 L123 119 L100 102 L77 119 L86 91 L62 74 L91 74 Z"
              fill={GOLD}
              opacity="0.24"
            />
            <g
              stroke={GOLD}
              strokeWidth="2.4"
              fill="none"
              strokeLinecap="round"
            >
              <line x1="100" y1="66" x2="100" y2="132" />
              <line x1="66" y1="80" x2="134" y2="80" />
              <line x1="66" y1="80" x2="54" y2="98" />
              <line x1="66" y1="80" x2="78" y2="98" />
              <line x1="134" y1="80" x2="122" y2="98" />
              <line x1="134" y1="80" x2="146" y2="98" />
              <line x1="82" y1="132" x2="118" y2="132" />
            </g>
            <path d="M52 98 h28 a14 14 0 0 1 -28 0 Z" fill={GOLD} />
            <path d="M120 98 h28 a14 14 0 0 1 -28 0 Z" fill={GOLD} />
            <circle cx="100" cy="63" r="4" fill={GOLD} />
          </svg>
        </div>

        <div style={{ display: "flex", height: 10, background: BLUE }} />
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Bricolage Grotesque", data: bricolage, weight: 800, style: "normal" },
        { name: "Public Sans", data: publicSans, weight: 600, style: "normal" },
      ],
    }
  );
}
