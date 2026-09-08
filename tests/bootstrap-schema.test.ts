import { createHash, webcrypto } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { describe, expect, it, vi } from "vitest";
import { generateBootstrapSecret, hashBootstrapSecret, isBootstrapSecret, founderLink } from "@/lib/setup/bootstrap";
import { personalizeTenantSchema } from "@/lib/setup/personalize";

const opts = {
  name: "Founder's archive", subjectLabel: "Case", docket: "CF", openJoin: false,
  operatorName: "Owner's Name", operatorContact: "owner@example.com",
};

describe("bootstrap capability and SQL contract", () => {
  it("uses 256 random bits and the exact UTF-8 SHA-256 contract expected by SQL", async () => {
    vi.stubGlobal("crypto", webcrypto);
    try {
      const first = generateBootstrapSecret();
      const second = generateBootstrapSecret();
      expect(isBootstrapSecret(first)).toBe(true);
      expect(first).not.toBe(second);
      expect(await hashBootstrapSecret(first)).toBe(createHash("sha256").update(first, "utf8").digest("hex"));
      await expect(hashBootstrapSecret("bad")).rejects.toThrow("INVALID_BOOTSTRAP_SECRET");
      expect(() => founderLink("demo", "bad")).toThrow("INVALID_BOOTSTRAP_SECRET");
      expect(() => personalizeTenantSchema("", { ...opts, bootstrapHash: "bad'" })).toThrow("INVALID_BOOTSTRAP_HASH");
    } finally { vi.unstubAllGlobals(); }
  });

  it("executes hash-only personalization, rotates only an unclaimed verifier, and preserves a claimed tenant", async () => {
    const secret = "ab".repeat(32);
    const hash = createHash("sha256").update(secret, "utf8").digest("hex");
    const sql = personalizeTenantSchema("", { ...opts, bootstrapHash: hash });
    expect(sql).not.toContain(secret);
    const db = new PGlite();
    try {
      await db.exec(`create table public.settings (
        id boolean primary key, claimed boolean not null, department_name text, subject_label text,
        docket_prefix text, seal_top text, seal_bottom text, operator_name text, operator_contact text, open_join boolean
      );
      insert into public.settings (id,claimed) values(true,false);
      create table public.department_bootstrap (id boolean primary key check(id), secret_hash text not null check(secret_hash ~ '^[0-9a-f]{64}$'));`);
      await db.exec(sql);
      expect((await db.query("select secret_hash from public.department_bootstrap")).rows).toEqual([{ secret_hash: hash }]);
      expect((await db.query("select department_name,operator_name from public.settings")).rows).toEqual([{
        department_name: opts.name, operator_name: opts.operatorName,
      }]);
      const replacement = "cd".repeat(32);
      await db.exec(personalizeTenantSchema("", { ...opts, bootstrapHash: replacement }));
      expect((await db.query("select secret_hash from public.department_bootstrap")).rows).toEqual([{ secret_hash: replacement }]);
      await db.exec("update public.settings set claimed=true; delete from public.department_bootstrap;");
      await db.exec(sql);
      expect((await db.query("select * from public.department_bootstrap")).rows).toEqual([]);
      expect((await db.query("select claimed from public.settings")).rows).toEqual([{ claimed: true }]);
    } finally { await db.close(); }
  }, 30_000);
});
