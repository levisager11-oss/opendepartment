"use client";

import { useState } from "react";
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

    const { data, error: insertError } = await supabase
      .from("comments")
      .insert({ file_id: fileId, author_id: currentUserId, body: text })
      .select("id, file_id, author_id, body, created_at")
      .single();

    if (insertError || !data) {
      setError(t("common.error"));
      setBusy(false);
      return;
    }

    setComments((prev) => [
      ...prev,
      { ...data, author_username: currentUsername },
    ]);
    setBody("");
    setBusy(false);
  }

  async function remove(id: string) {
    const previous = comments;
    setComments((prev) => prev.filter((c) => c.id !== id));

    const { error } = await supabase.from("comments").delete().eq("id", id);
    if (error) setComments(previous);
  }

  return (
    <section className="mt-8">
      <div className="paper-tab ml-6 inline-block px-4 py-1">
        <span className="docket !text-ink-700">{t("comments.title")}</span>
      </div>

      <div className="paper rounded-xs p-5">
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
                    <span className="docket !text-[0.6rem]">
                      {formatDate(comment.created_at)}
                    </span>

                    {(mine || isAdmin) && (
                      <button
                        type="button"
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
            <span className="docket !text-[0.6rem]">
              {body.length} / 2000
            </span>
            <button
              type="submit"
              disabled={busy || !body.trim()}
              className="btn btn-primary"
            >
              {busy ? t("common.saving") : t("comments.submit")}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
