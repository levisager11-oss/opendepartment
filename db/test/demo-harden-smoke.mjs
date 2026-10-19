import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';

const sql = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const db = new PGlite({ extensions: { pgcrypto } });
const founder = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const shared = '11111111-1111-4111-8111-111111111111';
const member = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const owner = () => db.exec('select odtest.as_owner()');
const user = (id) => db.exec(`select odtest.as_user('${id}')`);
const scalar = async (q) => (await db.query(q)).rows[0].v;
const object = (id, name, bytes = 1) => `insert into storage.objects(bucket_id,name,owner,metadata)
  values ('department-files','${id}/${name}','${id}','{"size":${bytes}}')`;
const file = (id, name) => `insert into public.files(owner_id,title,storage_path,original_name,mime_type,size_bytes,kind)
  values ('${id}','Document','${id}/${name}','file.pdf','application/pdf',1,'pdf')`;
let fileId;
const comment = (id) => `insert into public.comments(file_id,author_id,body,created_at)
  values ('${fileId}','${id}','Test', '2000-01-01')`;
try {
  await db.exec(await sql('./00-shim.sql'));
  await db.exec(await sql('./seed-auth-shim.sql'));
  await db.exec(await sql('../tenant-schema.sql'));
  await db.exec(await sql('./01-helpers.sql'));
  const harden = await sql('../demo-harden.sql');
  await db.exec(harden);
  await db.exec(`insert into public.department_bootstrap(secret_hash)
    values (encode(sha256(convert_to(repeat('a',64),'UTF8')),'hex'));
    insert into auth.users(id,email,raw_user_meta_data) values
    ('${founder}','founder@example.test',jsonb_build_object('bootstrap_secret',repeat('a',64)));`);
  const seed = await sql('../seed-demo.sql');
  // Exercise the first seed with safeguards already installed.
  await db.exec(seed);
  await db.exec('update public.settings set open_join=true where id');
  await db.exec(harden);
  await db.exec(harden);
  // Schema upgrades must not lose or duplicate the optional fences.
  await db.exec(await sql('../tenant-schema.sql'));
  await db.exec(harden);
  assert.equal(await scalar('select file_size_limit as v from storage.buckets'), 2 * 1024 * 1024);
  await db.exec(`insert into auth.users(id,email,encrypted_password) values
    ('${member}','normal@example.test','old-password')`);
  for (const id of [shared, '22222222-2222-4222-8222-222222222222', '33333333-3333-4333-8333-333333333333']) {
    await user(id);
    await assert.rejects(db.exec(object(id,'blocked')), /DEMO_UPLOADS_DISABLED/);
    await assert.rejects(db.exec(file(id,'blocked')), /DEMO_UPLOADS_DISABLED/);
  }
  await user(member);
  await db.exec(object(member,'normal'));
  await db.exec(file(member,'normal'));
  await assert.rejects(db.exec('select public.demo_limits()'), /permission denied/);
  await assert.rejects(db.exec('select * from public.demo_throttle'), /permission denied/);
  for (let i=1; i<20; i++) await db.exec(object(member,`daily-${i}`));
  await assert.rejects(db.exec(object(member,'daily-over')), /RATE_LIMITED/);
  await owner();
  // Age out daily objects, but still count their bytes without files rows.
  await db.exec(`update storage.objects set created_at=now()-interval '2 days',
    metadata='{"size":1048576}' where owner='${member}'`);
  await user(member);
  await assert.rejects(db.exec(object(member,'bytes-over')), /DEMO_STORAGE_FULL/);
  await owner();
  await db.exec(`update storage.objects set metadata='{"size":1}' where owner='${member}'`);
  await db.exec(object(founder,'department-full',300*1024*1024));
  await user(member);
  await assert.rejects(db.exec(object(member,'total-over')), /DEMO_STORAGE_FULL/);
  await owner();
  // Fixture adjustment only, never SQL DELETE from storage.objects.
  await db.exec(`update storage.objects set metadata='{"size":1}' where owner='${founder}'`);
  fileId = await scalar(`select id as v from public.files where owner_id='${member}' limit 1`);
  await user(shared);
  await db.exec(`insert into public.votes(file_id,user_id,value) values ('${fileId}','${shared}',1)`);
  await user(member);
  for (let i=0;i<10;i++) await db.exec(comment(member));
  await assert.rejects(db.exec(comment(member)), /RATE_LIMITED/);
  await owner();
  assert.equal(await scalar(`select count(*)::int as v from public.comments where author_id='${member}' and created_at>now()-interval '1 minute'`),10);
  await db.exec(`update public.comments set created_at=now()-interval '20 minutes' where author_id='${member}'`);
  for (let batch=0;batch<4;batch++) {
    await user(member);
    for (let i=0;i<10;i++) await db.exec(comment(member));
    await owner();
    await db.exec(`update public.comments set created_at=now()-interval '20 minutes' where author_id='${member}'`);
  }
  await user(member);
  await assert.rejects(db.exec(comment(member)), /RATE_LIMITED/);
  await owner();
  await db.exec(`update public.comments set created_at=now()-interval '2 days';
    set request.headers='{"x-forwarded-for":"192.0.2.1, 10.0.0.1"}';`);
  for (const id of [founder,shared,member]) {
    await user(id);
    for (let i=0;i<10;i++) await db.exec(comment(id));
  }
  await owner();
  await db.exec(`update public.comments set created_at=now()-interval '20 minutes'`);
  await user(shared);
  await assert.rejects(db.exec(comment(shared)), /RATE_LIMITED/);
  await owner();
  assert.equal(await scalar(`select count(*)::int as v from public.demo_throttle where sender=encode(sha256(convert_to('ip:192.0.2.1','UTF8')),'hex')`),30);
  await db.exec(`set request.headers=''; update public.comments set created_at=now()-interval '2 days'`);
  const credentials = await scalar(`select to_jsonb(u) as v from auth.users u where id='${shared}'`);
  await db.exec(`update auth.users set encrypted_password='changed',email='changed@example.test',email_change='pending' where id='${shared}'`);
  assert.equal(await scalar(`select encrypted_password as v from auth.users where id='${shared}'`),credentials.encrypted_password);
  assert.equal(await scalar(`select email as v from auth.users where id='${shared}'`),credentials.email);
  assert.equal(await scalar(`select email_change as v from auth.users where id='${shared}'`),credentials.email_change);
  await db.exec(`update auth.users set encrypted_password='changed',email='changed@example.test' where id='${member}'`);
  assert.equal(await scalar(`select encrypted_password as v from auth.users where id='${member}'`),'changed');
  assert.equal(await scalar(`select email as v from auth.users where id='${member}'`),'changed@example.test');
  await db.exec(`alter table auth.users add column phone text, add column phone_change text;
    update auth.users set phone='123',phone_change='456' where id='${shared}';`);
  assert.equal(await scalar(`select phone as v from auth.users where id='${shared}'`),null);
  assert.equal(await scalar(`select phone_change as v from auth.users where id='${shared}'`),null);
  await db.exec(seed);
  const n = await scalar('select count(*)::int as v from public.profiles');
  for (let i=n;i<20;i++) await db.exec(`insert into auth.users(email) values ('signup-${i}@example.test')`);
  await assert.rejects(db.exec(`insert into auth.users(email) values ('over@example.test')`),/RATE_LIMITED/);
  assert.equal(await scalar('select count(*)::int as v from auth.users'),20,'signup rolled back');
  await db.exec(seed); // Existing demo profiles must not consume signup slots.
  // Daily cap independent of hourly cap.
  await db.exec(`update public.profiles set created_at=now()-interval '2 hours'`);
  for (let i=20;i<100;i++) {
    await db.exec(`insert into auth.users(email) values ('signup-${i}@example.test');
      update public.profiles set created_at=now()-interval '2 hours';`);
  }
  await assert.rejects(db.exec(`insert into auth.users(email) values ('day-over@example.test')`),/RATE_LIMITED/);
  const undo = await sql('../demo-harden-undo.sql');
  await db.exec(undo);
  await db.exec(undo);
  assert.equal(await scalar(`select count(*)::int as v from pg_proc where pronamespace='public'::regnamespace
    and proname in ('demo_limits','demo_shared_account','demo_upload_allowed','demo_file_allowed',
      'demo_comment_limit','demo_account_limit','demo_credential_guard')`),0);
  assert.equal(await scalar(`select to_regprocedure('public.demo_seed_content()') is not null as v`),true);
  assert.equal(await scalar(`select count(*)::int as v from pg_policy where polname like 'demo%'`),0);
  assert.equal(await scalar(`select max_upload_mb as v from public.settings`),25);
  await user(shared);
  await db.exec(object(shared,'after-undo'));
  await db.exec(file(shared,'after-undo'));
  await owner();
  await db.exec(`update auth.users set email='undo@example.test' where id='${shared}'`);
  assert.equal(await scalar(`select email as v from auth.users where id='${shared}'`),'undo@example.test');
  await db.exec(await sql('../tenant-schema.sql'));
  await db.exec(`insert into auth.users(email) values ('after-undo@example.test')`);
  console.log('demo hardening smoke: policies, storage caps, rate windows, credentials, seed, upgrade and undo passed');
} catch (error) {
  console.error('demo hardening smoke:', error.message, error.where ?? '');
  process.exitCode = 1;
} finally { await db.close(); }
