"use client";

import { useEffect, useRef, useState } from "react";

const KOFI_ID = "A7J825QGLG";
const KOFI_COLOR = "#72a4f2";
const KOFI_SCRIPT = "https://storage.ko-fi.com/cdn/widget/Widget_2.js";

declare global {
  interface Window {
    kofiwidget2?: {
      init: (text: string, color: string, id: string) => void;
      getHTML?: () => string;
      draw?: () => void;
    };
  }
}

/**
 * Ko-fi support button.
 *
 * Two details make this less trivial than pasting the snippet:
 *
 *  1. The official snippet ends in `kofiwidget2.draw()`, which calls
 *     document.write. That works in a blocking <script> during parse and
 *     blanks the entire page when called after load, which is the only time it
 *     can run in a React app. So we call getHTML() and inject instead.
 *
 *  2. Ko-fi's domain is blocked by most ad blockers. Rather than leaving a
 *     hole where the button was, we render our own styled link first and only
 *     replace it if the widget actually loads.
 */
export function KofiButton({ className = "" }: { className?: string }) {
  const host = useRef<HTMLDivElement>(null);
  const [widgetLoaded, setWidgetLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    function render() {
      const w = window.kofiwidget2;
      if (cancelled || !w || !host.current) return;
      try {
        w.init("Support me on Ko-fi", KOFI_COLOR, KOFI_ID);
        // Deliberately not draw(): see note 1 above.
        const html = w.getHTML?.();
        if (html) {
          host.current.innerHTML = html;
          setWidgetLoaded(true);
        }
      } catch {
        // Leave the fallback link in place.
      }
    }

    if (window.kofiwidget2) {
      render();
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${KOFI_SCRIPT}"]`
    );
    if (existing) {
      existing.addEventListener("load", render);
      return () => existing.removeEventListener("load", render);
    }

    const script = document.createElement("script");
    script.src = KOFI_SCRIPT;
    script.async = true;
    script.onload = render;
    document.body.appendChild(script);

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className={className}>
      <div ref={host} />
      {!widgetLoaded && (
        <a
          href={`https://ko-fi.com/${KOFI_ID}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block px-4 py-2 text-sm font-bold text-gov-950 transition-opacity hover:opacity-90"
          style={{ backgroundColor: KOFI_COLOR }}
        >
          ☕ Support me on Ko-fi
        </a>
      )}
    </div>
  );
}
