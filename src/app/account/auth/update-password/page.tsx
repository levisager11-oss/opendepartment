import Link from "next/link";
import { redirect } from "next/navigation";
import { createControlClient, CONTROL_CONFIGURED } from "@/lib/control/client";
import { MarketingShell } from "@/components/MarketingShell";
import { ControlPasswordForm } from "@/components/account/ControlPasswordForm";
import { T } from "@/components/T";
import { privatePage } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata = privatePage("Choose a new password", {
  path: "/account/auth/update-password",
});

/**
 * Where an operator's reset link finally lands, by way of the callback.
 *
 * The recovery session is a real one, which is why this screen has to exist:
 * without it a reset link signs somebody in and leaves the old password in
 * place. Same reasoning as the department's own update-password page.
 */
export default async function ControlUpdatePasswordPage() {
  if (!CONTROL_CONFIGURED) redirect("/");

  const supabase = await createControlClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <MarketingShell>
      <div className="mx-auto max-w-md">
        <h1 className="mb-6 font-serif text-2xl font-black break-words text-ink-900">
          <T k={user ? "auth.updateTitle" : "auth.linkExpired"} />
        </h1>
        <div className="paper p-5 sm:p-6">
          {user ? (
            <>
              <p className="mb-5 text-sm leading-relaxed text-ink-700">
                <T k="auth.updateBody" />
              </p>
              <ControlPasswordForm />
            </>
          ) : (
            <>
              <p className="text-sm leading-relaxed text-ink-700">
                <T k="auth.linkExpiredBody" />
              </p>
              <Link href="/account/login" className="btn btn-primary mt-6">
                <T k="auth.signin" />
              </Link>
            </>
          )}
        </div>
      </div>
    </MarketingShell>
  );
}
