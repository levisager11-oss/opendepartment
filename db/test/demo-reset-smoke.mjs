import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";


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
  const reset = await sql("../demo-reset.sql");
  const undo = await sql("../demo-reset-undo.sql");
  await db.exec(`
    insert into public.department_bootstrap(secret_hash)
      values (encode(sha256(convert_to(repeat('a',64),'UTF8')),'hex'));
    insert into auth.users(id,email,raw_user_meta_data) values
      ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','founder@example.test',
       jsonb_build_object('bootstrap_secret',repeat('a',64)));
  `);
  await db.exec(seed);
  await db.exec(seed);
  await db.exec(reset);
  await db.exec(reset);
  for (const role of ["anon", "authenticated"]) {
    for (const fn of ["demo_reset", "demo_storage_extras", "demo_sync_sizes", "demo_seed_content"]) {
      const result = await db.query("select has_function_privilege($1,$2,'execute') as allowed", [role, `public.${fn}()`]);
      assert.equal(result.rows[0].allowed, false, `${role} cannot call ${fn}`);
      await db.exec(`set role ${role}`);
      await assert.rejects(db.query(`select public.${fn}()`), /permission denied/);
      await db.exec("reset role");
    }
  }
  await db.exec(`
    update public.settings set open_join=true where id;
    insert into auth.users(id,email) values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','stranger@example.test');
    update public.profiles set is_banned=true, username='changed' where id='11111111-1111-4111-8111-111111111111';
    insert into public.files(owner_id,title,storage_path,original_name,mime_type,size_bytes,kind)
      values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','Stranger','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/stranger.pdf','stranger.pdf','application/pdf',1,'pdf');
    insert into public.comments(file_id,author_id,body)
      select id,'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','Stranger comment' from public.files limit 1;
    insert into public.votes(file_id,user_id,value)
      select id,'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',1 from public.files limit 1;
    insert into public.subjects(name) values ('Stranger subject');
    insert into public.invites(code) values ('STRANGER');
    insert into public.file_views(file_id,user_id)
      select id,'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' from public.files limit 1;
    insert into storage.objects(bucket_id,name,metadata)
      select 'department-files',storage_path,'{"size":1234}'::jsonb from public.files;
    insert into storage.objects(bucket_id,name,metadata)
      select 'department-files',thumb_path,'{"size":100}'::jsonb from public.files where thumb_path is not null;
    insert into storage.objects(bucket_id,name) values ('department-files','orphan');
    insert into public.audit_log(action) values ('keep.audit');
  `);
  const settings = (await db.query("select * from public.settings")).rows;
  for (let run=0; run<2; run++) {
    await db.exec("set role service_role");
    const result = (await db.query("select public.demo_reset() as result")).rows[0].result;
    assert.equal(result.keep_paths.length,14);
    assert.ok(result.keep_paths.every(p => /\/demo-seed\/\d{3}-exhibit-\d{3}(\.(pdf|jpg|mp3)|-thumb\.webp)$/.test(p)));
    const extras = (await db.query("select public.demo_storage_extras() as path")).rows.map(r=>r.path).sort();
    assert.deepEqual(extras,["bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/stranger.pdf","orphan"]);
    assert.equal((await db.query("select public.demo_sync_sizes() as n")).rows[0].n,12);
    await db.exec("reset role");
    for (const [table,n] of [["files",12],["subjects",5],["comments",8],["votes",27],["reports",1],["invites",0],["file_views",0],["profiles",4],["user_emails",4]]) {
      assert.equal((await db.query(`select count(*)::int as n from public.${table}`)).rows[0].n,n,table);
    }
    assert.equal((await db.query("select count(*)::int as n from auth.users")).rows[0].n,4);
    assert.deepEqual((await db.query("select * from public.settings")).rows,settings);
    assert.equal((await db.query("select count(*)::int as n from public.files where size_bytes=1234")).rows[0].n,12);
    const profile = (await db.query("select username,is_banned from public.profiles where id='11111111-1111-4111-8111-111111111111'")).rows[0];
    assert.deepEqual(profile,{username:"agent_k",is_banned:true});
    assert.equal((await db.query("select count(*)::int as n from public.audit_log where action='keep.audit'")).rows[0].n,1);
  }
  await db.exec("update public.settings set claimed=false where id");
  await assert.rejects(db.query("select public.demo_reset()"), /claimed department/);
  await db.exec("update public.settings set claimed=true where id; update public.profiles set is_banned=true where is_admin");
  await assert.rejects(db.query("select public.demo_reset()"), /active administrator/);
  await db.exec(undo);
  await db.exec(undo);
  for (const fn of ["demo_reset","demo_storage_extras","demo_sync_sizes"]) {
    assert.equal((await db.query("select to_regprocedure($1) as fn",[`public.${fn}()`])).rows[0].fn,null);
  }
  console.log("demo reset: reapplication, permissions, accounts, bans, content, storage, safety and undo passed");
} finally {
  await db.close();
}
