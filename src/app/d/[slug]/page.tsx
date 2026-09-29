import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { requireDepartment } from "@/lib/tenant/auth";
import { Seal } from "@/components/Seal";
import { T, TStamp } from "@/components/T";

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
        <div className="mx-auto max-w-xl px-4 py-16 text-center sm:py-24">
          <p className="stamp stamp-red mb-6 inline-block">
            <T k="dept.notSetUp" />
          </p>
          <p className="text-sm leading-relaxed text-ink-700">
            <T k="dept.notSetUpBody" />
          </p>
          <Link
            href="/new"
            className="btn btn-lg btn-primary mt-6"
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
    <div>
      <div className="mx-auto max-w-3xl px-4 py-14 text-center sm:py-20">
        <Seal
          size={128}
          className="mx-auto mb-7"
          top={branding.sealTop}
          bottom={branding.sealBottom}
          accent={branding.accent}
          idPrefix="door"
        />

        {/* Stamped, the way a records office marks what may be opened. */}
        <p className={`stamp stamp-sm mb-5 text-2xs ${branding.openJoin ? "stamp-green" : "stamp-red"}`}>
          <TStamp k={branding.openJoin ? "dept.frontDoorOpen" : "dept.frontDoor"} />
        </p>

        <h1 className="mb-4 font-display text-4xl font-extrabold tracking-tight break-words text-ink-900 sm:text-5xl">
          {branding.departmentName}
        </h1>

        <p className="mx-auto mb-10 max-w-prose text-lg leading-relaxed text-ink-500">
          {branding.tagline ?? <T k="landing.subtitle" />}
        </p>

        {/* The term is the label and the value is the number, whichever one is
            drawn larger: a screen reader announces a <dt> as the name of the
            <dd> after it, so the other way round read out "12: documents on
            file" as if 12 were the heading. flex-col-reverse keeps the number
            on top. */}
        <dl className="mx-auto mb-10 grid max-w-lg grid-cols-3 divide-x divide-paper-300 border-y border-paper-300 sm:mb-12">
          {[
            { n: stats.files, label: "landing.stat.files" },
            { n: stats.subjects, label: "landing.stat.subjects" },
            { n: stats.members, label: "landing.stat.members" },
          ].map((s) => (
            <div key={s.label} className="flex flex-col-reverse px-2 py-4 sm:px-3">
              <dt className="mt-1 text-xs text-ink-500">
                <T k={s.label as never} />
              </dt>
              <dd className="font-display text-3xl font-bold text-ink-900 tabular-nums">{s.n}</dd>
            </div>
          ))}
        </dl>

        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          {/* Said as what it does. It used to read "Request access", and a
              member coming back to sign in had to guess that this was the way
              in -- while somebody who really was asking for access was sent to
              a sign-in form. The link beside it is the way to join.
              btn-accent reads the same --accent the layout sets, and brings
              the hover and pressed states an inline style could not. */}
          <Link href={`/d/${slug}/login`} className="btn btn-lg btn-accent w-full sm:w-auto">
            <T k="nav.signin" />
          </Link>
          {/* A public archive says so on the door. Sending someone who needs no
              code to a link that reads "I have an invite code" is how a public
              department ends up looking shut. */}
          <Link href={`/d/${slug}/join`} className="btn btn-lg btn-ghost w-full sm:w-auto">
            <T k={branding.openJoin ? "dept.joinOpen" : "dept.haveInvite"} />
          </Link>
        </div>
      </div>
    </div>
  );
}
