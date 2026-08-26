import { SkeletonLine } from "@/components/Skeleton";

/**
 * The department front door. It waits on two RPCs against the owner's project
 * -- an identity probe and the public counters -- before it knows what to
 * draw, so it needs a placeholder of its own.
 *
 * This also covers any /d/[slug] sub-route that has no closer loading.tsx.
 */
export default function DepartmentLoading() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-20 text-center">
      <div className="skeleton mx-auto mb-8 h-36 w-36 rounded-full" />
      <SkeletonLine width="w-40" className="mx-auto mb-3 h-2" />
      <div className="skeleton mx-auto mb-4 h-10 w-80 max-w-full" />
      <SkeletonLine width="w-96 max-w-full" className="mx-auto mb-10" />

      <dl className="mx-auto mb-12 grid max-w-lg grid-cols-3 gap-4">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="paper px-3 py-4">
            <div className="skeleton mx-auto h-7 w-10" />
            <div className="skeleton mx-auto mt-2 h-2 w-14" />
          </div>
        ))}
      </dl>

      <div className="skeleton mx-auto h-12 w-40" />
    </div>
  );
}
