import { SkeletonLine, SkeletonPanel } from "@/components/Skeleton";

/** Mirrors the exhibit page: back link, folder tab, header block, viewer. */
export default function FileLoading() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <SkeletonLine width="w-24" className="mb-4 h-3" />

      <div className="paper-tab ml-6 inline-block px-4 py-1">
        <SkeletonLine width="w-32" className="h-2" />
      </div>

      <article className="paper">
        <header className="flex flex-wrap items-start gap-4 border-b border-paper-300 p-5">
          <div className="skeleton h-20 w-10 shrink-0" />
          <div className="min-w-0 flex-1 space-y-3">
            <div className="skeleton h-7 w-2/3" />
            <SkeletonLine />
            <SkeletonLine width="w-4/5" />
          </div>
          <div className="skeleton h-7 w-20 shrink-0" />
        </header>
        <div className="p-5">
          <div className="skeleton h-viewer w-full" />
        </div>
      </article>

      <SkeletonPanel className="mt-6 h-48" />
    </div>
  );
}
