"use client";

import { useState } from "react";
import { Spinner } from "@/components/Spinner";
import { useI18n } from "@/lib/i18n/provider";
import { useTenantClient } from "@/lib/tenant/context";
import type { Comment } from "@/lib/tenant/types";

export function CommentSection({
  fileId,
  initialComments,
  currentUserId,
  currentUsername,
  isAdmin,
}: {
  fileId: string;
  initialComments: Comment[];
  currentUserId: string;
  currentUsername: string | null;
  isAdmin: boolean;
}) {
  const { t, formatDate } = useI18n();
  const supabase = useTenantClient();
  const [comments, setComments] = useState(initialComments);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  async function post(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    if (text.length > 2000) {
      setError(t("comments.tooLong"));
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const { data, error: insertError } = await supabase
        .from("comments")
        .insert({ file_id: fileId, author_id: currentUserId, body: text })
        .select("id, file_id, author_id, body, created_at")
        .single();
      if (insertError || !data) throw insertError ?? new Error("Comment not saved");
      setComments((prev) => [...prev, { ...data, author_username: currentUsername }]);
      setBody("");
    } catch {
      setError(t("common.actionFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (removing.has(id)) return;
    setRemoving((prev) => new Set(prev).add(id));
    setError(null);
    try {
      const { data, error: deleteError } = await supabase.from("comments")
        .delete().eq("id", id).select("id");
      if (deleteError || !data?.length) throw deleteError ?? new Error("Deletion refused");
      // Remove only the confirmed row. A failed parallel request must never
      // restore a snapshot containing another successfully deleted comment.
      setComments((prev) => prev.filter((comment) => comment.id !== id));
    } catch {
      setError(t("common.actionFailed"));
    } finally {
      setRemoving((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  return (
    <section className="mt-8">
      <div className="paper-tab ml-6 inline-block px-4 py-1">
        <span className="docket text-ink-700 text-2xs">{t("comments.title")}</span>
      </div>

      <div className="paper p-4 sm:p-5">
        {comments.length === 0 ? (
          <p className="typewriter py-6 text-center text-sm text-ink-400">
            {t("comments.empty")}
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-paper-300">
            {comments.map((comment) => {
              const mine = comment.author_id === currentUserId;
              return (
                <li key={comment.id} className="animate-fade-up py-4 first:pt-0">
                  <div className="mb-1 flex flex-wrap items-baseline gap-x-3">
                    <span className="typewriter text-sm font-bold text-gov-800">
                      {comment.author_username ?? "—"}
                      {mine && (
                        <span className="ml-1 text-ink-400">
                          ({t("common.you")})
                        </span>
                      )}
                    </span>
                    <span className="docket text-3xs text-ink-500">
                      {formatDate(comment.created_at)}
                    </span>

                    {(mine || isAdmin) && (
                      <button
                        type="button"
                        disabled={removing.has(comment.id)}
                        aria-busy={removing.has(comment.id)}
                        onClick={() => {
                          if (confirm(t("comments.deleteConfirm"))) {
                            remove(comment.id);
                          }
                        }}
                        className="ml-auto cursor-pointer text-xs text-ink-400 underline hover:text-stamp-red"
                      >
                        {t("comments.delete")}
                      </button>
                    )}
                  </div>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap text-ink-900">
                    {comment.body}
                  </p>
                </li>
              );
            })}
          </ul>
        )}

        <form onSubmit={post} className="mt-5 border-t border-paper-300 pt-5">
          <textarea
            className="field min-h-20 resize-y"
            placeholder={t("comments.placeholder")}
            aria-label={t("comments.placeholder")}
            disabled={busy}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={2000}
          />
          {error && (
            <p role="alert" className="mt-2 text-sm text-stamp-red">
              {error}
            </p>
          )}
          <div className="mt-3 flex items-center justify-between">
            <span className="docket text-3xs text-ink-500">
              {body.length} / 2000
            </span>
            <button
              type="submit"
              disabled={busy || !body.trim()}
              aria-busy={busy}
              className="btn btn-primary"
            >
              {busy && <Spinner />}
              {busy ? t("common.saving") : t("comments.submit")}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
