import { ImageResponse } from "next/og";

/**
 * Favicon, generated rather than shipped as a binary: it is the same folder-
 * and-seal mark as components/Logo.tsx, drawn at the size a browser tab asks
 * for, so the two cannot drift apart.
 */
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex" }}>
        <svg width="32" height="32" viewBox="0 0 32 32">
          <rect width="32" height="32" rx="6" fill="#0050d8" />
          <path
            d="M7.5 11a1.5 1.5 0 0 1 1.5-1.5h4.6l2 2H23a1.5 1.5 0 0 1 1.5 1.5v8.5A1.5 1.5 0 0 1 23 23H9a1.5 1.5 0 0 1-1.5-1.5z"
            fill="#ffffff"
          />
          <circle cx="16" cy="17.25" r="3.1" fill="none" stroke="#0050d8" strokeWidth="1.5" />
          <circle cx="16" cy="17.25" r="1.1" fill="#0050d8" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
