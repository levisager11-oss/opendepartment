import { SkeletonHeading, SkeletonPanel } from "@/components/Skeleton";

/**
 * Administration runs seven queries in parallel against the tenant's project,
 * so it is the slowest screen in the product. Mirrors the heading, the storage
 * meter, the tab strip and the first table.
 */
export default function AdminLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <SkeletonHeading />
        <SkeletonPanel className="h-20 w-full min-w-64 sm:w-auto" />
      </div>

      <div className="scroll-x mb-5 border-b-2 border-paper-400">
        <div className="flex min-w-max gap-1">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="skeleton h-9 w-28" />
          ))}
        </div>
      </div>

      <SkeletonPanel className="h-96" />
    </div>
  );
}
