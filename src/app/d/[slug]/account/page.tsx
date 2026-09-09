import Link from "next/link";
import { requireMember } from "@/lib/tenant/auth";
import { DeptLeaveForm } from "@/components/dept/DeptLeaveForm";
import { T } from "@/components/T";
import { privatePage } from "@/lib/seo";

/**
 * A member's own page inside one department.
 *
 * There was not one, and the gap showed: the username form lived only on the
 * onboarding screen, which redirects away the moment a name exists, and there
 * was nowhere at all to answer "how do I get out of this". Both belong to the
 * member rather than to the administration screen, so they get an address of
 * their own -- deliberately under /d/<slug>, because a membership is scoped to
 * one department and so is everything on this page.
 *
 * Member-only, so it stays out of the index even when the department itself is
 * public. The canonical is left to the department layout, as everywhere else:
 * one address per archive, not one per screen.
 */
export const dynamic = "force-dynamic";
export const metadata = privatePage("Your membership");

export default async function MemberAccountPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const member = await requireMember(slug);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
      <h1 className="mb-2 font-serif text-2xl font-black break-words text-ink-900">
        <T k="member.title" />
      </h1>
      <p className="mb-8 text-sm leading-relaxed text-ink-700">
        <T k="member.body" />
      </p>

      <div className="paper mb-6 p-5">
        <p className="docket mb-3 text-2xs text-ink-500">
          <T k="member.identity" />
        </p>
        <dl className="flex flex-col gap-3 text-sm">
          <div className="flex flex-wrap items-baseline gap-2">
            <dt className="text-ink-500">
              <T k="member.username" />
            </dt>
            <dd className="typewriter text-ink-900">
              {member.profile.username ?? "—"}
            </dd>
          </div>
          <div className="flex flex-wrap items-baseline gap-2">
            <dt className="text-ink-500">
              <T k="member.email" />
            </dt>
            <dd className="typewriter break-all text-ink-900">
              {member.email || "—"}
            </dd>
          </div>
        </dl>
        <p className="mt-4 text-xs text-ink-400">
          <T k="member.emailNote" />
        </p>
        <Link
          href={`/d/${slug}/auth/update-password`}
          className="btn btn-ghost mt-4"
        >
          <T k="member.changePassword" />
        </Link>
      </div>

      <DeptLeaveForm username={member.profile.username} />
    </div>
  );
}
