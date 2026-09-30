/**
 * OpenDepartment's own mark: a folder with a seal stamped on it, on a blue
 * tile. It is the platform's logo only -- a department wears its own seal
 * (components/Seal.tsx), coloured and lettered by its administrator, and never
 * this.
 *
 * Decorative by default, because it always sits beside the wordmark that
 * already names it; pass a `title` where it has to stand alone.
 */
export function LogoMark({
  size = 32,
  className = "",
  title,
}: {
  size?: number;
  className?: string;
  title?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <rect width="32" height="32" rx="6" fill="#0050d8" />
      <path
        d="M7.5 11a1.5 1.5 0 0 1 1.5-1.5h4.6l2 2H23a1.5 1.5 0 0 1 1.5 1.5v8.5A1.5 1.5 0 0 1 23 23H9a1.5 1.5 0 0 1-1.5-1.5z"
        fill="#fff"
      />
      <circle cx="16" cy="17.25" r="3.1" fill="none" stroke="#0050d8" strokeWidth="1.5" />
      <circle cx="16" cy="17.25" r="1.1" fill="#0050d8" />
    </svg>
  );
}

/** The mark and the name together, as the header and footer show them. */
export function Wordmark({
  size = 32,
  className = "",
  name,
}: {
  size?: number;
  className?: string;
  /** Passed in rather than translated here, so this stays a server component. */
  name: React.ReactNode;
}) {
  return (
    <span className={`flex min-w-0 items-center gap-2.5 ${className}`}>
      <LogoMark size={size} className="shrink-0" />
      <span className="truncate font-display text-lg font-bold tracking-tight text-ink-900">
        {name}
      </span>
    </span>
  );
}
