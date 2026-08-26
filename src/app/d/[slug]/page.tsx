import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { requireDepartment } from "@/lib/tenant/auth";
import { Seal } from "@/components/Seal";
import { T } from "@/components/T";

/**
 * A department's front door, seen by someone who is not signed in.
 *
 * It shows the seal, the name and three counts -- and nothing else. No titles,
 * no usernames, no subjects. Somebody who was handed the link but has no
 * invite should learn that the archive exists and who runs it, not what is
 * inside it.
 */
export default async function DepartmentFrontDoor({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { dept, branding } = await requireDepartment(slug);

  // The schema is not installed: the owner never finished. Say so plainly
  // instead of rendering an archive with zeroes in it.
  if (!branding.claimed && branding.departmentName === dept.display_name) {
    const probe = await createClient(dept.supabase_url, dept.anon_key, {
      auth: { persistSession: false, autoRefreshToken: false },
    }).rpc("department_identity");

    if (probe.error) {
      return (
        <div className="mx-auto max-w-xl px-4 py-24 text-center">
          <p className="stamp stamp-red mb-6 inline-block">
            <T k="dept.notSetUp" />
          </p>
          <p className="text-sm leading-relaxed text-ink-700">
            <T k="dept.notSetUpBody" />
          </p>
          <Link
            href="/new"
            className="mt-6 inline-block bg-gov-900 px-5 py-2.5 font-bold text-white hover:bg-gov-800"
          >
            <T k="setup.title" />
          </Link>
        </div>
      );
    }
  }

  let stats = { files: 0, members: 0, subjects: 0 };
  try {
    const anon = createClient(dept.supabase_url, dept.anon_key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data } = await anon.rpc("department_stats");
    if (data && data.length > 0) stats = data[0];
  } catch {
    // Counters are decoration. A department whose project is briefly
    // unreachable should still render its door.
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-20 text-center">
      <Seal
        size={140}
        className="mx-auto mb-8 drop-shadow-xl"
        top={branding.sealTop}
        bottom={branding.sealBottom}
        accent={branding.accent}
        idPrefix="door"
      />

      <p className="docket mb-3">
        <T k="dept.frontDoor" />
      </p>

      <h1 className="mb-4 font-[family-name:var(--font-serif)] text-4xl font-black text-ink-900">
        {branding.departmentName}
      </h1>

      <p className="mx-auto mb-10 max-w-prose text-base leading-relaxed text-ink-700">
        {branding.tagline ?? <T k="landing.subtitle" />}
      </p>

      <dl className="mx-auto mb-12 grid max-w-lg grid-cols-3 gap-4">
        {[
          { n: stats.files, label: "landing.stat.files" },
          { n: stats.subjects, label: "landing.stat.subjects" },
          { n: stats.members, label: "landing.stat.members" },
        ].map((s) => (
          <div key={s.label} className="paper px-3 py-4">
            <dt className="typewriter text-2xl font-bold text-ink-900">{s.n}</dt>
            <dd className="docket mt-1 !text-[0.6rem]">
              <T k={s.label as never} />
            </dd>
          </div>
        ))}
      </dl>

      <div className="flex flex-wrap items-center justify-center gap-4">
        <Link
          href={`/d/${slug}/login`}
          className="px-6 py-3 font-bold text-gov-950"
          style={{ backgroundColor: branding.accent }}
        >
          <T k="landing.cta" />
        </Link>
        <Link
          href={`/d/${slug}/join`}
          className="text-sm text-ink-700 underline underline-offset-4 hover:text-ink-900"
        >
          <T k="dept.haveInvite" />
        </Link>
      </div>
    </div>
  );
}
