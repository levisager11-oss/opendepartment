"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/Spinner";
import { useI18n } from "@/lib/i18n/provider";
import { useTenantClient } from "@/lib/tenant/context";
import { caseLabel } from "@/lib/tenant/types";
import type { DepartmentSettings } from "./types";

/**
 * The bucket's own file_size_limit, from db/tenant-schema.sql. Storage checks
 * it before RLS or anything in this app gets a say, so a max_upload_mb above
 * this number would only mean the browser waves a file through for storage to
 * reject with nothing useful to say about why.
 */
const BUCKET_CAP_MB = 25;

const HEX = /^#[0-9a-fA-F]{6}$/;

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="paper p-5">
      <p className="docket mb-4 text-2xs text-ink-500">{title}</p>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="label" htmlFor={id}>
        {label}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-xs leading-relaxed text-ink-400">{hint}</p>}
    </div>
  );
}

/**
 * Everything that makes a department look like itself, editable.
 *
 * Until this existed, rebranding after setup meant hand-writing an UPDATE in
 * the Supabase SQL editor. `settings` is admin-writable under the tenant's own
 * RLS, so this is an ordinary update running as the signed-in administrator --
 * no elevated key, and the row comes back selected so a policy refusal shows
 * up as an error rather than as a form that silently changed nothing.
 *
 * The door (open_join) is deliberately not here. It has a home under Invites,
 * next to the codes it interacts with, and one flag with two controls is how
 * two controls end up disagreeing.
 */
export function AdminSettings({ settings }: { settings: DepartmentSettings }) {
  const { t } = useI18n();
  const supabase = useTenantClient();
  const router = useRouter();

  const [form, setForm] = useState({
    department_name: settings.department_name,
    tagline: settings.tagline ?? "",
    subject_label: settings.subject_label,
    docket_prefix: settings.docket_prefix,
    seal_top: settings.seal_top,
    seal_bottom: settings.seal_bottom,
    accent: settings.accent,
    categories: settings.categories.join("\n"),
    max_upload_mb: String(settings.max_upload_mb),
    operator_name: settings.operator_name ?? "",
    operator_contact: settings.operator_contact ?? "",
  });

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  const categories = form.categories
    .split("\n")
    .map((line) => line.trim().toUpperCase())
    .filter(Boolean)
    // A duplicate category is a filter that matches twice and a select with
    // two identical options.
    .filter((line, i, all) => all.indexOf(line) === i);

  async function save(e: React.FormEvent) {
    e.preventDefault();

    const name = form.department_name.trim();
    if (!name) return setError(t("settings.nameRequired"));
    if (!HEX.test(form.accent.trim())) return setError(t("settings.accentInvalid"));
    if (categories.length === 0) return setError(t("settings.categoriesEmpty"));

    setBusy(true);
    setError(null);

    const mb = Number(form.max_upload_mb);
    const { data, error: updateError } = await supabase
      .from("settings")
      .update({
        department_name: name.slice(0, 60),
        tagline: form.tagline.trim().slice(0, 160) || null,
        subject_label: form.subject_label.trim().slice(0, 30) || "Case",
        docket_prefix:
          form.docket_prefix.trim().toUpperCase().slice(0, 6) || "CF",
        seal_top: form.seal_top.trim().slice(0, 40),
        seal_bottom: form.seal_bottom.trim().slice(0, 40),
        accent: form.accent.trim().toLowerCase(),
        categories,
        max_upload_mb: Math.min(
          BUCKET_CAP_MB,
          Math.max(1, Number.isFinite(mb) ? Math.round(mb) : 25)
        ),
        operator_name: form.operator_name.trim().slice(0, 120) || null,
        operator_contact: form.operator_contact.trim().slice(0, 160) || null,
      })
      .eq("id", true)
      .select("department_name");

    setBusy(false);

    // Same reasoning as the door under Invites: an update the policy blocks
    // touches no rows and reports no failure, so the returned row is the only
    // thing that distinguishes "saved" from "refused".
    if (updateError || !data || data.length === 0) {
      setError(t("common.error"));
      return;
    }

    setSaved(true);
    // Branding is read per request by the layout, so the seal, the accent and
    // the docket prefix only change once the server has re-rendered.
    router.refresh();
  }

  return (
    <form onSubmit={save} className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <p className="text-sm leading-relaxed text-ink-500 lg:col-span-2">
        {t("settings.intro")}
      </p>

      <Section title={t("settings.identity")}>
        <Field id="set-name" label={t("settings.name")}>
          <input
            id="set-name"
            className="field"
            value={form.department_name}
            onChange={(e) => set("department_name", e.target.value)}
            maxLength={60}
          />
        </Field>

        <Field
          id="set-tagline"
          label={t("settings.tagline")}
          hint={t("settings.directoryNote")}
        >
          <input
            id="set-tagline"
            className="field"
            value={form.tagline}
            onChange={(e) => set("tagline", e.target.value)}
            maxLength={160}
          />
        </Field>
      </Section>

      <Section title={t("settings.vocabulary")}>
        <Field
          id="set-subject"
          label={t("settings.subjectLabel")}
          hint={t("settings.subjectLabelHint")}
        >
          <input
            id="set-subject"
            className="field"
            value={form.subject_label}
            onChange={(e) => set("subject_label", e.target.value)}
            maxLength={30}
          />
        </Field>

        <Field
          id="set-docket"
          label={t("settings.docket")}
          hint={t("settings.docketHint", {
            example: caseLabel(7, form.docket_prefix.trim().toUpperCase() || "CF"),
          })}
        >
          <input
            id="set-docket"
            className="field typewriter"
            value={form.docket_prefix}
            onChange={(e) =>
              set("docket_prefix", e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))
            }
            maxLength={6}
            spellCheck={false}
          />
        </Field>
      </Section>

      <Section title={t("settings.seal")}>
        <Field id="set-seal-top" label={t("settings.sealTop")}>
          <input
            id="set-seal-top"
            className="field typewriter"
            value={form.seal_top}
            onChange={(e) => set("seal_top", e.target.value.toUpperCase())}
            maxLength={40}
          />
        </Field>

        <Field id="set-seal-bottom" label={t("settings.sealBottom")}>
          <input
            id="set-seal-bottom"
            className="field typewriter"
            value={form.seal_bottom}
            onChange={(e) => set("seal_bottom", e.target.value.toUpperCase())}
            maxLength={40}
          />
        </Field>

        <Field id="set-accent" label={t("settings.accent")}>
          <div className="flex gap-2">
            <input
              id="set-accent"
              className="field typewriter"
              value={form.accent}
              onChange={(e) => set("accent", e.target.value)}
              maxLength={7}
              spellCheck={false}
            />
            <input
              type="color"
              aria-label={t("settings.accent")}
              // A swatch beside the text field, not instead of it: the colour
              // input cannot express "I have not chosen yet" and shows black
              // for anything it fails to parse, so the hex stays canonical.
              value={HEX.test(form.accent.trim()) ? form.accent.trim() : "#b8860b"}
              onChange={(e) => set("accent", e.target.value)}
              className="h-10 w-12 shrink-0 cursor-pointer rounded-card border border-paper-400 bg-paper-100 p-1"
            />
          </div>
        </Field>
      </Section>

      <Section title={t("settings.categories")}>
        <Field
          id="set-categories"
          label={t("settings.categories")}
          hint={t("settings.categoriesHint")}
        >
          <textarea
            id="set-categories"
            className="field typewriter min-h-44 resize-y"
            value={form.categories}
            onChange={(e) => set("categories", e.target.value)}
            spellCheck={false}
          />
        </Field>
      </Section>

      <Section title={t("settings.upload")}>
        <Field
          id="set-upload"
          label={t("settings.upload")}
          hint={t("settings.uploadHint", { cap: BUCKET_CAP_MB })}
        >
          <input
            id="set-upload"
            className="field"
            type="number"
            min={1}
            max={BUCKET_CAP_MB}
            value={form.max_upload_mb}
            onChange={(e) => set("max_upload_mb", e.target.value)}
          />
        </Field>
      </Section>

      <Section title={t("settings.operator")}>
        <Field id="set-op-name" label={t("settings.operatorName")}>
          <input
            id="set-op-name"
            className="field"
            value={form.operator_name}
            onChange={(e) => set("operator_name", e.target.value)}
            maxLength={120}
          />
        </Field>

        <Field
          id="set-op-contact"
          label={t("settings.operatorContact")}
          hint={t("settings.operatorHint")}
        >
          <input
            id="set-op-contact"
            className="field"
            value={form.operator_contact}
            onChange={(e) => set("operator_contact", e.target.value)}
            maxLength={160}
          />
        </Field>
      </Section>

      <div className="flex flex-wrap items-center gap-4 lg:col-span-2">
        <button
          type="submit"
          disabled={busy}
          aria-busy={busy}
          className="btn btn-lg btn-primary"
        >
          {busy && <Spinner />}
          {busy ? t("common.saving") : t("common.save")}
        </button>

        {error && (
          <p role="alert" className="text-sm font-semibold text-stamp-red">
            {error}
          </p>
        )}
        {saved && !error && (
          <p role="status" className="text-sm font-semibold text-stamp-green">
            {t("settings.saved")}
          </p>
        )}
      </div>
    </form>
  );
}
