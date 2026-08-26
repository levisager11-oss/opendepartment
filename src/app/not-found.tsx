import Link from "next/link";
import { Seal } from "@/components/Seal";
import { T } from "@/components/T";
import { privatePage } from "@/lib/seo";

export const metadata = privatePage("Page not found");

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-lg flex-1 flex-col items-center justify-center px-4 py-24 text-center">
      <Seal size={90} className="mb-8 opacity-50" idPrefix="nf" />
      {/* The stamp is the page's heading, not decoration -- Tailwind's
          preflight resets heading size and weight, so the .stamp utility
          still renders it identically. */}
      <h1 className="stamp stamp-red mb-6 inline-block">404</h1>
      <p className="mb-8 text-sm text-ink-700">
        <T k="error.notFound" />
      </p>
      <Link href="/" className="text-sm text-gov-800 underline underline-offset-4">
        <T k="od.name" />
      </Link>
    </div>
  );
}
