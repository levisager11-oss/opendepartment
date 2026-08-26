import { redirect } from "next/navigation";
import { requireMember } from "@/lib/tenant/auth";
import { DeptUsernameForm } from "@/components/dept/DeptUsernameForm";
import { T } from "@/components/T";
import { privatePage } from "@/lib/seo";

/**
 * Member-only, so it stays out of the index even when the department
 * itself is public. The canonical is left to the department layout on
 * purpose: one address per archive, not one per screen.
 */
export const metadata = privatePage("Choose a username");

export default async function OnboardingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const member = await requireMember(slug, { allowMissingUsername: true });

  // Already chosen one: nothing to do here.
  if (member.profile.username) redirect(`/d/${slug}/vault`);

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="mb-2 font-serif text-2xl font-black text-ink-900">
        <T k="onboarding.title" />
      </h1>
      <p className="mb-8 text-sm leading-relaxed text-ink-700">
        <T k="onboarding.body" />
      </p>

      <div className="paper p-6">
        <DeptUsernameForm />
      </div>
    </div>
  );
}
