import { SkeletonCardGrid, SkeletonHeading } from "@/components/Skeleton";

/**
 * The vault is force-dynamic and waits on the tenant's own Supabase project
 * before it can render anything, so this is the screen members actually see
 * on a cold navigation. It reproduces the heading, the filter bar and one
 * screenful of cards at their real heights.
 */
export default function VaultLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <SkeletonHeading />
        <div className="skeleton h-10 w-40" />
      </div>

      {/* filter bar */}
      <div className="paper mb-6 p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="skeleton h-10 flex-1" />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:flex">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="skeleton h-10 w-full lg:w-36" />
            ))}
          </div>
        </div>
        <div className="mt-3 border-t border-paper-300 pt-3">
          <div className="skeleton h-4 w-40" />
        </div>
      </div>

      <SkeletonCardGrid />
    </div>
  );
}
