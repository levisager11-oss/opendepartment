import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt = "OpenDepartment -- run your own files.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const GOLD = "#c9a227";
const GOLD_LIGHT = "#e8cf7a";

/**
 * Shares the site's own hero layout (masthead gold rule, seal, wordmark,
 * tagline) rather than inventing separate share-card art. Curved ring text
 * and the beading ring from the real Seal component are left out: Satori
 * (the renderer behind ImageResponse) has no textPath support, and at social
 * -card scale the plain scale-and-star mark reads better anyway.
 */
export default async function Image() {
  const fontDir = join(process.cwd(), "src/assets/fonts");
  const [merriweather, sourceSans] = await Promise.all([
    readFile(join(fontDir, "Merriweather-Black.ttf")),
    readFile(join(fontDir, "SourceSans3-Bold.ttf")),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(135deg, #14335c 0%, #0b1c33 62%)",
        }}
      >
        <div style={{ display: "flex", height: 8, background: GOLD }} />

        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 88px",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              maxWidth: 640,
            }}
          >
            <div
              style={{
                display: "flex",
                fontFamily: "Source Sans 3",
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: 5,
                textTransform: "uppercase",
                color: GOLD_LIGHT,
                marginBottom: 20,
              }}
            >
              Run your own files.
            </div>
            <div
              style={{
                display: "flex",
                fontFamily: "Merriweather",
                fontSize: 68,
                fontWeight: 900,
                lineHeight: 1.05,
                color: "#ffffff",
                marginBottom: 26,
              }}
            >
              OpenDepartment
            </div>
            <div
              style={{
                display: "flex",
                fontFamily: "Source Sans 3",
                fontSize: 27,
                fontWeight: 600,
                lineHeight: 1.45,
                color: "rgba(223,232,243,0.78)",
              }}
            >
              Build a mock government archive for your class, your team or
              your group chat.
            </div>
          </div>

          <svg width="300" height="300" viewBox="0 0 200 200">
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

        <div style={{ display: "flex", height: 6, background: GOLD }} />
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Merriweather", data: merriweather, weight: 900, style: "normal" },
        { name: "Source Sans 3", data: sourceSans, weight: 700, style: "normal" },
      ],
    }
  );
}
