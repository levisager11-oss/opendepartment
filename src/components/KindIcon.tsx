import type { FileKind } from "@/lib/tenant/types";

const PATHS: Record<FileKind, string> = {
  image: "M4 5h16v14H4z M8 11l3 3 2-2 3 4H7z M9 9a1.2 1.2 0 1 0 0-.01",
  pdf: "M7 3h7l4 4v14H7z M14 3v4h4",
  video: "M4 6h11v12H4z M15 10l5-3v10l-5-3z",
  audio: "M9 18V6l9-2v12 M9 18a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0 M18 16a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0",
  other: "M7 3h7l4 4v14H7z M14 3v4h4 M9.5 13h5 M9.5 16h5",
};

const LABELS: Record<FileKind, string> = {
  image: "IMG",
  pdf: "PDF",
  video: "VID",
  audio: "AUD",
  other: "DOC",
};

export function KindIcon({
  kind,
  size = 18,
  className = "",
}: {
  kind: FileKind;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role="img"
      aria-label={LABELS[kind]}
    >
      <path d={PATHS[kind]} />
    </svg>
  );
}

export function kindLabel(kind: FileKind): string {
  return LABELS[kind];
}
