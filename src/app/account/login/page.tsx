import { MarketingShell } from "@/components/MarketingShell";
import { AccountLoginForm } from "@/components/account/AccountLoginForm";

export const metadata = { title: "Sign in" };

export default async function AccountLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  // Only same-site paths. An open redirect here would let a crafted link
  // bounce someone off a trusted domain the instant they authenticate.
  const target =
    next && next.startsWith("/") && !next.startsWith("//") ? next : "/account";

  return (
    <MarketingShell>
      <div className="mx-auto max-w-md">
        <AccountLoginForm target={target} />
      </div>
    </MarketingShell>
  );
}
