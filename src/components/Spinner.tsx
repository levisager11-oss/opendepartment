/**
 * Inline pending indicator for submit buttons.
 *
 * aria-hidden on purpose: every button that shows one also swaps its label to
 * a working state ("Filing...", "Saving..."), so announcing the spinner too
 * would just make a screen reader say the same thing twice. The buttons pair
 * it with aria-busy, which is the part assistive tech actually wants.
 *
 * .btn is inline-flex with a gap, so this needs no margin of its own.
 */
export function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      focusable="false"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="3"
        opacity="0.25"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
