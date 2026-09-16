const KOFI_ID = "A7J825QGLG";
const KOFI_COLOR = "#72a4f2";

/**
 * Ko-fi support link.
 *
 * This used to load Ko-fi's widget script and replace the link below with
 * whatever `kofiwidget2.getHTML()` returned. Three things were wrong with that
 * and only one of them was Ko-fi's fault:
 *
 *   IT CONTRADICTED THE COOKIE NOTICE, which tells every reader there is no
 *   third-party tag on these pages -- while a third-party script loaded on
 *   every marketing page before anybody had agreed to anything. Under the
 *   ePrivacy rules the notice exists to satisfy, the strictly-necessary
 *   exemption it relies on does not cover a script somebody else controls.
 *
 *   IT WAS AN INJECTION POINT. `getHTML()`'s result went into innerHTML.
 *   'strict-dynamic' in the policy means markup inserted that way cannot bring
 *   scripts with it, so this was never an XSS -- but a bad response from that
 *   CDN still put arbitrary markup on our own origin, on the pages a stranger
 *   sees first, and a convincing form is not made of scripts.
 *
 *   IT MOSTLY DID NOT RENDER ANYWAY. Ko-fi's domain is blocked by most content
 *   blockers, which is why the fallback link below was written in the first
 *   place. It is the thing the majority of readers already saw.
 *
 * So the fallback is the whole component now: a plain anchor, styled the same,
 * doing the same job with no third party, no consent question and nothing to
 * fail. A server component, because there is no longer any client behaviour
 * here to hydrate.
 */
export function KofiButton({ className = "" }: { className?: string }) {
  return (
    <div className={className}>
      <a
        href={`https://ko-fi.com/${KOFI_ID}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block px-4 py-2 text-sm font-bold text-gov-950 transition-opacity hover:opacity-90"
        style={{ backgroundColor: KOFI_COLOR }}
      >
        ☕ Support me on Ko-fi
      </a>
    </div>
  );
}
