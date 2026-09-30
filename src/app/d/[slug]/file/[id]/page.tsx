import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMember } from "@/lib/tenant/auth";
import { createTenantClient } from "@/lib/tenant/server";
import { FileViewer } from "@/components/dept/FileViewer";
import { VoteButtons } from "@/components/dept/VoteButtons";
import { CommentSection } from "@/components/dept/CommentSection";
import { ReportButton } from "@/components/dept/ReportButton";
import { DeleteFileButton } from "@/components/dept/DeleteFileButton";
import { VaultBackLink } from "@/components/dept/VaultBackLink";
import { PrintButton } from "@/components/dept/PrintButton";
import { ExhibitNav } from "@/components/dept/ExhibitNav";
import { EditFileDetails } from "@/components/dept/EditFileDetails";
import { FileMeta } from "@/components/FileMeta";
import { T } from "@/components/T";
import { privatePage } from "@/lib/seo";
import {
  SIGNED_URL_TTL,
  STORAGE_BUCKET,
  caseLabel,
  type CaseFile,
  type Comment,
  type Subject,
} from "@/lib/tenant/types";

export const dynamic = "force-dynamic";

/**
 * Member-only, so it stays out of the index even when the department
 * itself is public. The canonical is left to the department layout on
 * purpose: one address per archive, not one per screen.
 */
export const metadata = privatePage("Exhibit");

export default async function FilePage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const member = await requireMember(slug);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) notFound();
  const supabase = await createTenantClient(member.dept);

  // Count this visit BEFORE reading the record, so the number on the page
  // includes the person looking at it.
  //
  // This must be awaited. postgrest query builders are lazy thenables: the
  // HTTP request is only issued when .then() runs, so an un-awaited call is
  // never sent at all -- which is exactly why the counter sat at zero.
  const { error: viewError } = await supabase.rpc("increment_view", {
    target: id,
  });
  if (viewError) {
    // A broken counter must not take the document down with it.
    console.error("increment_view failed:", viewError.message);
  }

  const { data, error: fileError } = await supabase
    .from("files_public")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (fileError) throw new Error("Could not load the exhibit.");
  if (!data) notFound();
  const file = data as CaseFile;

  // Short-lived signed URL: the bucket itself is private, so this link is the
  // only way to reach the object and it expires after SIGNED_URL_TTL. Minting it needs
  // no elevated key -- the member's own session already passes storage RLS.
  const { data: signed } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(file.storage_path, SIGNED_URL_TTL);

  const [{ data: myVote, error: voteError }, { data: commentRows, error: commentsError }] = await Promise.all([
    supabase.from("votes").select("value").eq("file_id", id).maybeSingle(),
    supabase
      .from("comments")
      .select("id, file_id, author_id, body, created_at, profiles(username)")
      .eq("file_id", id)
      .order("created_at", { ascending: true }),
  ]);
  if (voteError || commentsError) throw new Error("Could not load exhibit discussion.");

  // Storage's signed download option sets Content-Disposition on its origin;
  // the browser download attribute alone cannot force a cross-origin download.
  const { data: download } = signed?.signedUrl
    ? await supabase.storage.from(STORAGE_BUCKET).createSignedUrl(file.storage_path, SIGNED_URL_TTL, { download: file.original_name })
    : { data: null };

  // Admins, and only admins, see who filed the document. The check happens
  // inside the database function, not here.
  let ownerEmail: string | null = null;
  if (member.profile.is_admin) {
    const { data: email } = await supabase.rpc("admin_file_owner_email", {
      target: file.id,
    });
    ownerEmail = (email as string | null) ?? null;
  }

  const comments: Comment[] = (commentRows ?? []).map((row) => {
    const profile = row.profiles as unknown as { username: string | null } | null;
    return {
      id: row.id,
      file_id: row.file_id,
      author_id: row.author_id,
      body: row.body,
      created_at: row.created_at,
      author_username: profile?.username ?? null,
    };
  });

  const isOwner = file.owner_id === member.userId;
  const canDelete = isOwner || member.profile.is_admin;

  // The subject picker for the edit form. Only the owner may edit -- the
  // schema's UPDATE grant and files_update_own say so -- so only the owner's
  // page pays for the read.
  let allSubjects: Subject[] = [];
  if (isOwner) {
    const { data: subjectRows, error: subjectsError } = await supabase
      .from("subjects")
      .select("id, name, description")
      .order("name");
    if (subjectsError) throw new Error("Could not load subjects.");
    allSubjects = (subjectRows ?? []) as Subject[];
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <VaultBackLink />
        <ExhibitNav fileId={file.id} currentUserId={member.userId} />
      </div>

      {/* Print only. The banner that says PARODY is screen chrome and drops
          out of a printout with the rest of it -- and a printed page that
          looks official and does not say it is a parody is exactly what this
          product must never produce. So the label is restated here, with
          which archive the page came from. */}
      <div className="mb-4 hidden border-b-2 border-ink-900 pb-2 print:block">
        <p className="font-display text-lg font-bold text-ink-900">
          {member.branding.departmentName}
        </p>
        <p className="text-xs text-ink-700">
          <T k="gov.parody" /> · <T k="gov.disclaimer" />
        </p>
      </div>

      {/*
        Four blocks in reading order -- the record, the preview, its facts, its
        notes -- which is how a phone and a printer show them. From lg up they
        are placed on a grid instead: the preview large on the left with the
        notes under it, the record and its facts in a column beside it, the
        way every file viewer lays out a document and its details.
      */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-6 print:block">
        <article className="paper p-5 lg:col-start-2 lg:row-start-1 print:mb-4 print:p-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="docket text-2xs text-ink-500">
              {caseLabel(file.case_number, member.branding.docketPrefix)}
            </span>
            <span className="stamp stamp-blue stamp-sm">{file.category}</span>
            <span className="stamp stamp-red stamp-sm animate-stamp ml-auto">
              {file.kind.toUpperCase()}
            </span>
          </div>

          <h1 className="font-display text-2xl leading-tight font-bold tracking-tight break-words text-ink-900">
            {file.title}
          </h1>
          {file.description && (
            <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap text-ink-700">
              {file.description}
            </p>
          )}

          {file.subjects.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-1.5">
              <span className="sr-only">
                <T k="file.subjects" />:
              </span>
              {file.subjects.map((s) => (
                <Link
                  key={s.id}
                  href={`/d/${slug}/vault?subject=${s.id}`}
                  className="chip transition-colors hover:bg-gov-100 hover:text-gov-800"
                >
                  {s.name}
                </Link>
              ))}
            </div>
          )}

          <div className="mt-5 flex items-center justify-between gap-3 border-t border-paper-300 pt-4 print:hidden">
            <VoteButtons
              fileId={file.id}
              initialScore={file.score}
              initialVote={myVote?.value ?? 0}
              layout="row"
            />
            {download?.signedUrl && (
              <a
                href={download.signedUrl}
                download={file.original_name}
                className="btn btn-primary"
              >
                <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 4v12 M7 11l5 5 5-5 M4 20h16" />
                </svg>
                <T k="file.download" />
              </a>
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 print:hidden">
            <PrintButton />

            {isOwner && (
              <EditFileDetails
                fileId={file.id}
                initial={{
                  title: file.title,
                  description: file.description,
                  category: file.category,
                  subjectIds: file.subjects.map((s) => s.id),
                }}
                subjects={allSubjects}
              />
            )}

            <ReportButton fileId={file.id} />

            {canDelete && (
              <DeleteFileButton fileId={file.id} isOwner={isOwner} />
            )}
          </div>
        </article>

        <div
          className={`paper overflow-hidden lg:col-start-1 lg:row-span-2 lg:row-start-1 print:mb-4 ${
            file.kind === "image" ? "" : "print:hidden"
          }`}
        >
          <div className="bg-paper-200 p-2 sm:p-4 print:bg-transparent print:p-0">
            <FileViewer
              kind={file.kind}
              url={signed?.signedUrl ?? null}
              title={file.title}
            />
          </div>
        </div>
        {/* A framed PDF, a video or a recording cannot be printed from the
            page around it; say so where it would have been. */}
        {file.kind !== "image" && (
          <p className="hidden p-4 text-sm text-ink-700 print:block">
            <T k="file.printOmitted" />
          </p>
        )}

        <div className="paper overflow-hidden lg:col-start-2 lg:row-start-2">
          <FileMeta file={file} ownerEmail={ownerEmail} />
        </div>

        <div className="lg:col-start-1 lg:row-start-3">
          <CommentSection
            fileId={file.id}
            initialComments={comments}
            currentUserId={member.userId}
            currentUsername={member.profile.username}
            isAdmin={member.profile.is_admin}
          />
        </div>
      </div>
    </div>
  );
}
