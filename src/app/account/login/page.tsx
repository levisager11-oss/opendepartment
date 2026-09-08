import { MarketingShell } from "@/components/MarketingShell";
import { AccountLoginForm } from "@/components/account/AccountLoginForm";
import { privatePage } from "@/lib/seo";
import { safeLocalPath } from "@/lib/navigation";

export const metadata = privatePage("Sign in", { path: "/account/login" });

export default async function AccountLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  // Only same-site paths. An open redirect here would let a crafted link
  // bounce someone off a trusted domain the instant they authenticate.
  const target = safeLocalPath(next, "/account");

  return (
    <MarketingShell>
      <div className="mx-auto max-w-md">
        <AccountLoginForm target={target} />
      </div>
    </MarketingShell>
  );
}
