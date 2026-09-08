import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMember } from "@/lib/tenant/auth";
import { createTenantClient } from "@/lib/tenant/server";
import { FileViewer } from "@/components/dept/FileViewer";
import { VoteButtons } from "@/components/dept/VoteButtons";
import { CommentSection } from "@/components/dept/CommentSection";
import { ReportButton } from "@/components/dept/ReportButton";
import { DeleteFileButton } from "@/components/dept/DeleteFileButton";
import { FileMeta } from "@/components/FileMeta";
import { T } from "@/components/T";
import { privatePage } from "@/lib/seo";
import {
  STORAGE_BUCKET,
  caseLabel,
  type CaseFile,
  type Comment,
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
  // only way to reach the object and it expires in an hour. Minting it needs
  // no elevated key -- the member's own session already passes storage RLS.
  const { data: signed } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(file.storage_path, 3600);

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
    ? await supabase.storage.from(STORAGE_BUCKET).createSignedUrl(file.storage_path, 3600, { download: file.original_name })
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

  const canDelete = file.owner_id === member.userId || member.profile.is_admin;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
      <Link
        href={`/d/${slug}/vault`}
        className="docket mb-4 inline-flex items-center gap-1 hover:text-gov-800 text-2xs text-ink-500"
      >
        <span aria-hidden>←</span> <T k="file.back" />
      </Link>

      <div className="paper-tab ml-6 inline-block px-4 py-1">
        <span className="docket text-ink-700 text-2xs">
          {caseLabel(file.case_number, member.branding.docketPrefix)} ·{" "}
          {file.category}
        </span>
      </div>

      <article className="paper">
        <header className="flex flex-wrap items-start gap-3 border-b border-paper-300 p-4 sm:gap-4 sm:p-5">
          <VoteButtons
            fileId={file.id}
            initialScore={file.score}
            initialVote={myVote?.value ?? 0}
          />

          <div className="min-w-0 flex-1">
            <h1 className="font-serif text-xl leading-tight font-black break-words text-gov-900 sm:text-2xl">
              {file.title}
            </h1>
            {file.description && (
              <p className="mt-2 leading-relaxed whitespace-pre-wrap text-ink-700">
                {file.description}
              </p>
            )}

            {file.subjects.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="docket text-2xs text-ink-500">
                  <T k="file.subjects" />:
                </span>
                {file.subjects.map((s) => (
                  <Link
                    key={s.id}
                    href={`/d/${slug}/vault?subject=${s.id}`}
                    className="typewriter rounded-card border border-paper-400 bg-paper-100 px-2 py-0.5 text-xs text-gov-800 hover:border-gov-600"
                  >
                    {s.name}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="flex shrink-0 flex-col items-end gap-2">
            <span className="stamp stamp-red animate-stamp text-2xs sm:text-xs">
              {file.kind.toUpperCase()}
            </span>
          </div>
        </header>

        <div className="border-b border-paper-300 bg-paper-200 p-2 sm:p-4">
          <FileViewer
            kind={file.kind}
            url={signed?.signedUrl ?? null}
            mimeType={file.mime_type}
            title={file.title}
          />
        </div>

        <FileMeta
          file={file}
          ownerEmail={ownerEmail}
          signedUrl={signed?.signedUrl ?? null}
        />

        <div className="flex flex-wrap items-center gap-3 border-t border-paper-300 p-4 sm:p-5">
          {download?.signedUrl && (
            <a
              href={download.signedUrl}
              download={file.original_name}
              className="btn btn-primary"
            >
              <T k="file.download" />
            </a>
          )}

          <ReportButton fileId={file.id} />

          {canDelete && (
            <DeleteFileButton
              fileId={file.id}
              isOwner={file.owner_id === member.userId}
            />
          )}
        </div>
      </article>

      <CommentSection
        fileId={file.id}
        initialComments={comments}
        currentUserId={member.userId}
        currentUsername={member.profile.username}
        isAdmin={member.profile.is_admin}
      />
    </div>
  );
}
