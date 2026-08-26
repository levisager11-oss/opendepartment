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
 * Mirrors FileCard: the folder tab, the 80px thumbnail, the vote rail and four
 * lines of metadata. Kept in step with that component by hand -- if the card
 * grows a row, this grows a row.
 */
export function SkeletonFileCard() {
  return (
    <article>
      <div className="paper-tab ml-4 inline-block px-3 py-0.5">
        <SkeletonLine width="w-16" className="h-2" />
      </div>
      <div className="paper flex gap-3 p-3">
        <SkeletonBlock className="h-14 w-8 shrink-0" />
        <SkeletonBlock className="h-20 w-20 shrink-0" />
        <div className="min-w-0 flex-1 space-y-2 py-0.5">
          <SkeletonLine width="w-24" className="h-3" />
          <SkeletonLine width="w-3/4" className="h-4" />
          <SkeletonLine width="w-full" />
          <SkeletonLine width="w-1/2" className="h-2" />
        </div>
      </div>
    </article>
  );
}

export function SkeletonCardGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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
