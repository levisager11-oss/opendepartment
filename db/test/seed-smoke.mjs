import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";

// The seed runs only against this disposable local database. The extra Auth
// columns mirror the subset used by the seed, not a full GoTrue service.
const sql = (path) => readFile(new URL(path, import.meta.url), "utf8");
const db = new PGlite({ extensions: { pgcrypto } });
try {
  await db.exec(await sql("./00-shim.sql"));
  await db.exec(`
    create extension pgcrypto;
    alter table auth.users
      add column instance_id uuid, add column aud text, add column role text,
      add column encrypted_password text, add column email_confirmed_at timestamptz,
      add column updated_at timestamptz, add column raw_app_meta_data jsonb,
      add column confirmation_token text, add column recovery_token text,
      add column email_change text, add column email_change_token_new text,
      add column email_change_token_current text;
    create table auth.identities (
      provider_id text, user_id uuid references auth.users(id), identity_data jsonb,
      provider text, last_sign_in_at timestamptz, created_at timestamptz, updated_at timestamptz,
      primary key (provider_id,provider)
    );
  `);
  await db.exec(await sql("../tenant-schema.sql"));
  const seed = await sql("../seed-demo.sql");
  const count = async (table) => (await db.query(`select count(*)::int as n from ${table}`)).rows[0].n;
  // A seed must not turn its first public demo account into the founder.
  await assert.rejects(db.exec(seed), /administrator|founder|Sign up/i);
  await db.exec("rollback");
  assert.equal(await count("auth.users"), 0);
  await db.exec(`
    insert into public.department_bootstrap (secret_hash)
    values (encode(sha256(convert_to(repeat('a',64),'UTF8')),'hex'));
    insert into auth.users (id,email,raw_user_meta_data) values
      ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','founder@example.test',
       jsonb_build_object('bootstrap_secret',repeat('a',64)));
    update public.profiles set username='founder' where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    insert into public.files (owner_id,title,storage_path,original_name,mime_type,size_bytes,kind)
    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Keep this document',
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/keep.pdf','keep.pdf','application/pdf',20,'pdf');
    insert into public.subjects (name,description) values ('Keep this subject','User-created');
    insert into public.invites (code,note) values ('KEEP-THIS-INVITE','User-created');
  `);
  for (let run = 1; run <= 2; run++) {
    await db.exec(seed);
    assert.equal(await count("auth.users"), 4, "founder and three demo accounts");
    assert.equal(await count("public.profiles"), 4);
    assert.equal(await count("public.user_emails"), 4);
    assert.equal(await count("auth.identities"), 3);
    assert.equal(await count("public.files"), 13, "twelve exhibits and preserved manual file");
    assert.equal(await count("public.subjects"), 6);
    assert.equal(await count("public.comments"), 8);
    assert.equal(await count("public.reports"), 1);
    assert.equal(await count("public.invites"), 1, "no seed invite left behind");
    assert.equal(await count("public.department_bootstrap"), 0);
    const { rows: [state] } = await db.query(`select
      (select count(*)::int from public.profiles where is_admin) as admins,
      (select claimed and not open_join from public.settings where id) as door_closed,
      (select count(*)::int from public.files where storage_path like owner_id::text || '/demo-seed/%') as exhibits,
      (select count(*)::int from auth.users where encrypted_password=crypt('demopass123',encrypted_password)) as passwords,
      (select count(*)::int from auth.users where raw_user_meta_data ? 'invite_code') as leaked_invites,
      (select count(*)::int from public.votes) as votes`);
    assert.deepEqual(state, { admins: 1, door_closed: true, exhibits: 12, passwords: 3, leaked_invites: 0, votes: 27 });
    console.log(`seed run ${run}: founder + 3 members, 12 exhibits, 5 subjects, 8 comments, 27 votes, 1 report; manual rows preserved`);
  }
} catch (error) {
  console.error(`seed smoke: ${error.message}`);
  if (error.where) console.error(error.where);
  process.exitCode = 1;
} finally {
  await db.close();
}
