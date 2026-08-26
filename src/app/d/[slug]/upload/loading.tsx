import { SkeletonHeading, SkeletonPanel } from "@/components/Skeleton";

export default function UploadLoading() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <SkeletonHeading />
      <div className="flex flex-col gap-6">
        {/* dropzone */}
        <div className="dropzone h-44" />
        <SkeletonPanel className="h-80" />
        <SkeletonPanel className="h-40" />
        <div className="skeleton h-12 w-44" />
      </div>
    </div>
  );
}
