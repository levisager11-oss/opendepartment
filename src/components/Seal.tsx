/**
 * Positions of the beading ring, rounded to three decimals.
 *
 * Math.sin and Math.cos are not required to be bit-identical across JavaScript
 * engines, so computing these inline made Node and the browser disagree in the
 * last decimal place and React reported a hydration mismatch. Rounding puts
 * both sides on the same string.
 */
const BEADS: Array<[string, string]> = Array.from({ length: 48 }, (_, i) => {
  const angle = (i / 48) * Math.PI * 2;
  return [
    (100 + Math.cos(angle) * 66).toFixed(3),
    (100 + Math.sin(angle) * 66).toFixed(3),
  ];
});

/**
 * The departmental seal.
 *
 * Drawn from scratch on purpose: it deliberately does not reproduce the seal
 * of any real agency. Motif is a balance scale over a five-pointed star,
 * ringed by whatever mock-Latin the department chose for itself.
 *
 * The ring text and the metal colour are per-department settings, which is
 * what lets one deployment read DEPARTAMENTUM LORENZO and the next one read
 * something else entirely without touching this file.
 */
export function Seal({
  size = 64,
  className = "",
  top = "DEPARTMENT OF RECORDS",
  bottom = "OFFICIAL USE ONLY",
  accent = "#c9a227",
  idPrefix = "seal",
}: {
  size?: number;
  className?: string;
  top?: string;
  bottom?: string;
  accent?: string;
  /**
   * SVG ids are document-global. Two seals on one page (header and footer)
   * would otherwise share gradient and path ids, and the second would silently
   * borrow the first one's definitions.
   */
  idPrefix?: string;
}) {
  const arcTop = `${idPrefix}-arc-top`;
  const arcBottom = `${idPrefix}-arc-bottom`;
  const face = `${idPrefix}-face`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      className={className}
      role="img"
      aria-label={`Seal of ${top}`}
    >
      <defs>
        <path id={arcTop} d="M 100,100 m -78,0 a 78,78 0 1,1 156,0" fill="none" />
        <path
          id={arcBottom}
          d="M 100,100 m -68,0 a 68,68 0 1,0 136,0"
          fill="none"
        />
        <radialGradient id={face} cx="35%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#1f4f8f" />
          <stop offset="100%" stopColor="#0d2547" />
        </radialGradient>
      </defs>

      {/* rings */}
      <circle cx="100" cy="100" r="97" fill={`url(#${face})`} />
      <circle cx="100" cy="100" r="92" fill="none" stroke={accent} strokeWidth="2" />
      <circle
        cx="100"
        cy="100"
        r="60"
        fill="none"
        stroke={accent}
        strokeWidth="1.5"
        opacity="0.8"
      />

      {/* rope-style beading between the rings */}
      {BEADS.map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="1.4" fill={accent} opacity="0.55" />
      ))}

      {/* ring text */}
      <text
        fill={accent}
        fontSize="15"
        fontFamily="Georgia, serif"
        letterSpacing="3.2"
        opacity="0.95"
      >
        <textPath href={`#${arcTop}`} startOffset="50%" textAnchor="middle">
          {top.toUpperCase()}
        </textPath>
      </text>
      <text
        fill={accent}
        fontSize="12"
        fontFamily="Georgia, serif"
        letterSpacing="2.6"
        opacity="0.95"
      >
        <textPath href={`#${arcBottom}`} startOffset="50%" textAnchor="middle">
          {bottom.toUpperCase()}
        </textPath>
      </text>

      {/* star behind the scales */}
      <path
        d="M100 46 L109 74 L138 74 L114 91 L123 119 L100 102 L77 119 L86 91 L62 74 L91 74 Z"
        fill={accent}
        opacity="0.22"
      />

      {/* balance scale */}
      <g stroke={accent} strokeWidth="2.4" fill="none" strokeLinecap="round">
        <line x1="100" y1="66" x2="100" y2="132" />
        <line x1="66" y1="80" x2="134" y2="80" />
        <line x1="66" y1="80" x2="54" y2="98" />
        <line x1="66" y1="80" x2="78" y2="98" />
        <line x1="134" y1="80" x2="122" y2="98" />
        <line x1="134" y1="80" x2="146" y2="98" />
        <line x1="82" y1="132" x2="118" y2="132" />
      </g>
      <path d="M52 98 h28 a14 14 0 0 1 -28 0 Z" fill={accent} opacity="0.9" />
      <path d="M120 98 h28 a14 14 0 0 1 -28 0 Z" fill={accent} opacity="0.9" />
      <circle cx="100" cy="63" r="4" fill={accent} />
    </svg>
  );
}
