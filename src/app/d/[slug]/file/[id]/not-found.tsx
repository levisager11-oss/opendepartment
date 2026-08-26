import { DeptLink } from "@/components/dept/DeptLink";
import { T } from "@/components/T";
import { privatePage } from "@/lib/seo";

export const metadata = privatePage("Exhibit not found");

/**
 * Catches the notFound() in this route's page.tsx, which fires when the id
 * resolves to no row the member is allowed to see.
 *
 * It needs to exist here rather than one level up: the department boundary
 * would otherwise answer a missing exhibit with "no such department", which
 * sends the reader off checking the wrong half of the URL.
 */
export default function FileNotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="stamp stamp-red mb-6 inline-block">
        <T k="error.fileNotFound" />
      </p>

      <p className="mb-8 text-sm leading-relaxed text-ink-700">
        <T k="error.fileNotFoundBody" />
      </p>

      <DeptLink to="vault" k="nav.vault" />
    </div>
  );
}
