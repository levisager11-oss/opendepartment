import { ImageResponse } from "next/og";

/**
 * Favicon, generated rather than shipped as a binary: it reuses the same
 * navy/gold palette as the Seal component instead of drifting from it.
 * Ring text and beading from the full Seal are dropped -- they disappear
 * into noise at 32px, so only the scale-and-star motif survives.
 */
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex" }}>
        <svg width="32" height="32" viewBox="0 0 32 32">
          <circle cx="16" cy="16" r="16" fill="#0b1c33" />
          <circle
            cx="16"
            cy="16"
            r="14.4"
            fill="none"
            stroke="#c9a227"
            strokeWidth="1.4"
          />
          <path
            d="M16 6.5 L18.1 12 L24 12 L19.3 15.4 L21 21 L16 17.4 L11 21 L12.7 15.4 L8 12 L13.9 12 Z"
            fill="#c9a227"
            opacity="0.28"
          />
          <g
            stroke="#c9a227"
            strokeWidth="1.7"
            fill="none"
            strokeLinecap="round"
          >
            <line x1="16" y1="9.5" x2="16" y2="23" />
            <line x1="9" y1="12.8" x2="23" y2="12.8" />
            <line x1="9" y1="12.8" x2="6.2" y2="17.3" />
            <line x1="9" y1="12.8" x2="11.8" y2="17.3" />
            <line x1="23" y1="12.8" x2="20.2" y2="17.3" />
            <line x1="23" y1="12.8" x2="25.8" y2="17.3" />
            <line x1="12.6" y1="23" x2="19.4" y2="23" />
          </g>
          <path d="M4.7 17.3 h5 a2.5 2.5 0 0 1 -5 0 Z" fill="#c9a227" />
          <path d="M20.3 17.3 h5 a2.5 2.5 0 0 1 -5 0 Z" fill="#c9a227" />
          <circle cx="16" cy="9" r="1.2" fill="#c9a227" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
