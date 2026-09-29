/**
 * Placeholder primitives for the route-level loading.tsx files.
 *
 * These are server components on purpose -- a loading state that shipped its
 * own JavaScript bundle would be arriving exactly when the main bundle is
 * already competing for the network.
 *
 * The rule for every skeleton in this codebase: it must occupy the same box as
 * the thing it stands in for. A placeholder that is the wrong height moves the
 * page when the real content lands, which is worse than showing nothing.
 */

export function SkeletonLine({
  className = "",
  width = "w-full",
}: {
  className?: string;
  width?: string;
}) {
  return <span className={`skeleton block h-3 ${width} ${className}`} />;
}

export function SkeletonBlock({ className = "" }: { className?: string }) {
  return <span className={`skeleton block ${className}`} />;
}

/** Matches the header block every department sub-page opens with. */
export function SkeletonHeading() {
  return (
    <div className="mb-6">
      <SkeletonLine width="w-32" className="mb-3 h-2" />
      <SkeletonBlock className="h-9 w-64" />
    </div>
  );
}

/**
 * Mirrors FileCard's grid form: the 16:10 preview, the category line, two
 * lines of title, the byline and the footer row with the vote pill. Kept in
 * step with that component by hand -- if the card grows a row, this grows a
 * row.
 */
export function SkeletonFileCard() {
  return (
    <article className="paper flex flex-col overflow-hidden">
      <SkeletonBlock className="aspect-[16/10] w-full rounded-none" />
      <div className="space-y-2.5 p-4">
        <SkeletonLine width="w-24" className="h-4" />
        <SkeletonLine width="w-3/4" className="h-4" />
        <SkeletonLine width="w-full" />
        <SkeletonLine width="w-1/2" className="mt-4 h-2.5" />
      </div>
      <div className="flex items-center justify-between border-t border-paper-300 px-3 py-2">
        <SkeletonBlock className="h-8 w-24" />
        <SkeletonLine width="w-16" />
      </div>
    </article>
  );
}

export function SkeletonCardGrid({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <SkeletonFileCard key={i} />
      ))}
    </div>
  );
}

/** A stand-in for a .paper panel of roughly known height. */
export function SkeletonPanel({ className = "h-40" }: { className?: string }) {
  return <div className={`paper ${className}`} />;
}
