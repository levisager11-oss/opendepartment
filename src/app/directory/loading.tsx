import { MarketingShell } from "@/components/MarketingShell";
import { SkeletonLine } from "@/components/Skeleton";

export default function DirectoryLoading() {
  return (
    <MarketingShell wide>
      <div className="skeleton mb-2 h-9 w-72 max-w-full" />
      <SkeletonLine width="w-full max-w-prose" className="mb-10" />

      <ul className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => (
          <li key={i}>
            <div className="paper flex h-full items-start gap-4 p-5">
              <div className="skeleton h-11 w-11 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="skeleton h-4 w-40" />
                <SkeletonLine width="w-full" className="h-2" />
                <SkeletonLine width="w-24" className="h-2" />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </MarketingShell>
  );
}
