// @vitest-environment jsdom
import { act } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { hydrateRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { I18nProvider, useI18n } from "@/lib/i18n/provider";

const ISO = "2026-01-15T12:00:00Z";

function Stamp() {
  const { formatDate } = useI18n();
  return <span>{formatDate(ISO)}</span>;
}

describe("formatDate across hydration", () => {
  const zone = process.env.TZ;
  afterEach(() => {
    process.env.TZ = zone;
  });

  it("agrees with the server first, then shows the reader's own time zone", async () => {
    // The server renders in UTC; this reader is in Zurich, an hour ahead in
    // January. Formatting in the local zone straight away is a mismatch.
    process.env.TZ = "Europe/Zurich";
    const tree = (
      <I18nProvider initialLocale="en">
        <Stamp />
      </I18nProvider>
    );
    const html = renderToString(tree);
    expect(html).toContain("12:00");

    const container = document.createElement("div");
    container.innerHTML = html;
    document.body.append(container);
    const recoverable = vi.fn();
    await act(async () => {
      hydrateRoot(container, tree, { onRecoverableError: recoverable });
    });

    expect(recoverable).not.toHaveBeenCalled();
    expect(container.textContent).toContain("13:00");
    container.remove();
  });
});
