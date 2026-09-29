import { ImageResponse } from "next/og";

/**
 * The home-screen icon iOS asks for, from the same folder-and-seal mark as
 * components/Logo.tsx and the favicon. Without it, "Add to Home Screen" used a
 * screenshot of whatever page happened to be open.
 *
 * Full-bleed and square: iOS rounds the corners itself, and a tile that
 * arrived pre-rounded would come out with a white rim inside its own mask.
 */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#0050d8" }}>
        <svg width="180" height="180" viewBox="0 0 32 32">
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
