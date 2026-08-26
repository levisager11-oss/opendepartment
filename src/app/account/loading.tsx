import { MarketingShell } from "@/components/MarketingShell";

export default function AccountLoading() {
  return (
    <MarketingShell wide>
      <div className="mb-8 flex flex-wrap items-center gap-4">
        <div className="skeleton h-9 w-64 max-w-full" />
        <div className="skeleton ml-auto h-10 w-36" />
      </div>

      <ul className="space-y-3">
        {Array.from({ length: 3 }, (_, i) => (
          <li key={i} className="paper flex flex-wrap items-center gap-4 p-4">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="skeleton h-4 w-52" />
              <div className="skeleton h-2 w-32" />
            </div>
            <div className="skeleton h-9 w-24" />
            <div className="skeleton h-9 w-20" />
          </li>
        ))}
      </ul>
    </MarketingShell>
  );
}
