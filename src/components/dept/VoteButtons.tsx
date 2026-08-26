"use client";

import { useState, useTransition } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { useTenantClient } from "@/lib/tenant/context";

/**
 * One vote per person per document, switchable, and clicking the same arrow
 * again withdraws it. The counts come back from the database function so two
 * people voting at the same time cannot drift the total.
 */
export function VoteButtons({
  fileId,
  initialScore,
  initialVote = 0,
  size = "md",
}: {
  fileId: string;
  initialScore: number;
  initialVote?: number;
  size?: "sm" | "md";
}) {
  const { t } = useI18n();
  const supabase = useTenantClient();
  const [score, setScore] = useState(initialScore);
  const [vote, setVote] = useState(initialVote);
  const [pending, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);

  function submit(next: number) {
    const value = vote === next ? 0 : next;

    // Optimistic: the arrows must feel instant.
    const previousVote = vote;
    const previousScore = score;
    setVote(value);
    setScore(score - previousVote + value);
    setFailed(false);

    startTransition(async () => {
      const { data, error } = await supabase.rpc("cast_vote", {
        target: fileId,
        new_value: value,
      });

      if (error) {
        setVote(previousVote);
        setScore(previousScore);
        setFailed(true);
        return;
      }

      const row = Array.isArray(data) ? data[0] : data;
      if (row) {
        setScore(row.score);
        setVote(row.my_vote);
      }
    });
  }

  const iconSize = size === "sm" ? 16 : 20;
  const pad = size === "sm" ? "p-1" : "p-1.5";

  return (
    <div
      className="flex flex-col items-center gap-0.5 select-none"
      title={failed ? t("common.error") : undefined}
    >
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          submit(1);
        }}
        disabled={pending}
        aria-label={t("vote.up")}
        aria-pressed={vote === 1}
        className={`${pad} cursor-pointer rounded-card transition-colors ${
          vote === 1
            ? "text-stamp-green"
            : "text-ink-400 hover:bg-paper-200 hover:text-stamp-green"
        }`}
      >
        <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none">
          <path
            d="M12 5l7 9h-4v5h-6v-5H5z"
            fill={vote === 1 ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <span
        className={`typewriter tabular-nums ${
          size === "sm" ? "text-sm" : "text-base"
        } ${
          score > 0
            ? "text-stamp-green"
            : score < 0
              ? "text-stamp-red"
              : "text-ink-500"
        }`}
      >
        {score > 0 ? `+${score}` : score}
      </span>

      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          submit(-1);
        }}
        disabled={pending}
        aria-label={t("vote.down")}
        aria-pressed={vote === -1}
        className={`${pad} cursor-pointer rounded-card transition-colors ${
          vote === -1
            ? "text-stamp-red"
            : "text-ink-400 hover:bg-paper-200 hover:text-stamp-red"
        }`}
      >
        <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none">
          <path
            d="M12 19l-7-9h4V5h6v5h4z"
            fill={vote === -1 ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}
