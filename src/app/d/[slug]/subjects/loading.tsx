import { SkeletonHeading, SkeletonPanel } from "@/components/Skeleton";

/** The heading and one screenful of subject cards, at their real heights. */
export default function SubjectsLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
      <SkeletonHeading />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <SkeletonPanel key={i} className="h-36" />
        ))}
      </div>
    </div>
  );
}
