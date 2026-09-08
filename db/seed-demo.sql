-- ===========================================================================
--  OPENDEPARTMENT -- demo seed (DEVELOPMENT / TESTING ONLY)
--
--  Fills a department with subjects, exhibits, comments and votes so the
--  archive UI has something to render. Run it AFTER tenant-schema.sql, and
--  after you have signed up once so that an administrator exists.
--
--  NEVER run this against a department real people are using.
--
--  Re-runnable: it clears its own demo rows first and leaves anything you
--  created by hand alone.
-- ===========================================================================

begin;
set local search_path = public, extensions;

-- Found the department using its private founder link before seeding. This
-- script never reopens bootstrap or silently turns a demo user into an admin.
do $ready$ begin
  if not coalesce((select claimed from public.settings where id), false)
     or not exists (select 1 from public.profiles where is_admin and not is_banned) then
    raise exception 'Sign up with your private founder link before running the demo seed; an administrator is required.';
  end if;
end $ready$;

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 0. Demo members.
--
-- Creating auth users from SQL means writing into auth.users, whose exact
-- column set moves between GoTrue releases. An incompatible version fails the
-- transaction with its actual error; no partial seed or renamed real account
-- is left behind. The temporary invite uses the ordinary signup trigger and
-- is removed before commit, without changing the department's join policy.
--
-- Demo password for all three: demopass123
-- ---------------------------------------------------------------------------
do $demo$
declare
  ids uuid[] := array[
    '11111111-1111-4111-8111-111111111111'::uuid,
    '22222222-2222-4222-8222-222222222222'::uuid,
    '33333333-3333-4333-8333-333333333333'::uuid
  ];
  emails text[] := array['agent.k@example.test','agent.m@example.test','agent.q@example.test'];
  names  text[] := array['agent_k','agent_m','agent_q'];
  invite text := 'DEMO-' || upper(replace(gen_random_uuid()::text, '-', ''));
  i int;
begin
  insert into public.invites (code, note, max_uses, grants_admin, expires_at)
  values (invite, 'Temporary demo seed invite', 3, false, now() + interval '1 hour');

  for i in 1..3 loop
    if exists (select 1 from auth.users where id = ids[i] and email is distinct from emails[i]) then
      raise exception 'Demo account ID % belongs to a different user; nothing was seeded.', ids[i];
    end if;

    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      confirmation_token, recovery_token,
      email_change, email_change_token_new, email_change_token_current
    ) values (
      '00000000-0000-0000-0000-000000000000', ids[i], 'authenticated',
      'authenticated', emails[i], crypt('demopass123', gen_salt('bf')),
      now(), now() - (i || ' days')::interval, now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('invite_code', invite),
      '', '', '', '', ''
    )
    on conflict (id) do nothing;

    -- Password sign-in resolves through auth.identities on current releases.
    insert into auth.identities (
      provider_id, user_id, identity_data, provider, last_sign_in_at,
      created_at, updated_at
    ) values (
      ids[i]::text, ids[i],
      jsonb_build_object('sub', ids[i]::text, 'email', emails[i],
                         'email_verified', true, 'phone_verified', false),
      'email', now(), now(), now()
    )
    on conflict do nothing;

    update public.profiles set username = names[i] where id = ids[i];
    if not found then
      raise exception 'Demo account % has no member profile; nothing was seeded.', ids[i];
    end if;
    update auth.users set raw_user_meta_data = raw_user_meta_data - 'invite_code' where id = ids[i];
  end loop;

  delete from public.invites where code = invite;
  raise notice 'demo members ready (password: demopass123)';
end $demo$;

-- ---------------------------------------------------------------------------
-- 1. Clear previous demo content, identified by the marker in storage_path.
-- ---------------------------------------------------------------------------
delete from public.files where storage_path like 'demo-seed/%'
  or storage_path like owner_id::text || '/demo-seed/%';
delete from public.subjects where description = 'demo seed';

-- ---------------------------------------------------------------------------
-- 2. Subjects.
-- ---------------------------------------------------------------------------
insert into public.subjects (name, description) values
  ('The Cafeteria Incident', 'demo seed'),
  ('Operation Homework',     'demo seed'),
  ('The Missing Stapler',    'demo seed'),
  ('Field Trip Anomalies',   'demo seed'),
  ('Unidentified Sandwich',  'demo seed')
on conflict (name) do nothing;

-- ---------------------------------------------------------------------------
-- 3. Exhibits, attributed only to the three demo members.
--
-- Mostly non-image kinds on purpose: these rows point at storage objects that
-- were never uploaded, and a pdf or audio card renders its icon happily while
-- an image card would show a broken thumbnail.
-- ---------------------------------------------------------------------------
do $files$
declare
  owners uuid[];
  titles text[] := array[
    'Surveillance photograph, north corridor',
    'Interview transcript: the witness who saw nothing',
    'Memorandum regarding unauthorised snacks',
    'Recovered audio, 14 seconds',
    'Incident report, filed late',
    'Redacted seating plan',
    'Expense claim, disputed',
    'Photograph of the stapler (before)',
    'Photograph of the stapler (after)',
    'Anonymous tip, transcribed',
    'Field notes, week 3',
    'Chain of custody form'
  ];
  cats text[] := array['EXHIBIT','TRANSCRIPT','MEMORANDUM','SURVEILLANCE',
                       'WITNESS STATEMENT','CORRESPONDENCE','MISCELLANEOUS'];
  kinds public.file_kind[] := array['pdf','pdf','pdf','audio','pdf','pdf',
                                    'pdf','image','image','pdf','pdf','pdf'];
  mimes text[] := array['application/pdf','application/pdf','application/pdf',
                        'audio/mpeg','application/pdf','application/pdf',
                        'application/pdf','image/jpeg','image/jpeg',
                        'application/pdf','application/pdf','application/pdf'];
  new_id uuid;
  subject_ids uuid[];
  i int;
begin
  owners := array['11111111-1111-4111-8111-111111111111'::uuid,
                  '22222222-2222-4222-8222-222222222222'::uuid,
                  '33333333-3333-4333-8333-333333333333'::uuid];

  select array_agg(id order by name) into subject_ids
    from public.subjects where description = 'demo seed';

  for i in 1..array_length(titles, 1) loop
    insert into public.files (
      owner_id, title, description, category, storage_path, original_name,
      mime_type, size_bytes, kind, created_at
    ) values (
      owners[1 + (i % array_length(owners, 1))],
      titles[i],
      'Seeded demo record number ' || i || '. Not a real document.',
      cats[1 + (i % array_length(cats, 1))],
      owners[1 + (i % array_length(owners, 1))]::text || '/demo-seed/' || i || '-' || gen_random_uuid(),
      'exhibit-' || lpad(i::text, 3, '0'),
      mimes[i],
      40000 + (i * 91733) % 4000000,
      kinds[i],
      now() - (i * 7 || ' hours')::interval
    )
    returning id into new_id;

    -- Every other exhibit gets filed under a subject.
    if subject_ids is not null and i % 2 = 0 then
      insert into public.file_subjects (file_id, subject_id)
      values (new_id, subject_ids[1 + (i % array_length(subject_ids, 1))])
      on conflict do nothing;
    end if;
  end loop;
end $files$;

-- ---------------------------------------------------------------------------
-- 4. Votes and comments, so scores and sort orders are not all zero.
-- ---------------------------------------------------------------------------
do $engagement$
declare
  f record;
  owners uuid[];
  i int := 0;
  voter uuid;
  j int;
begin
  owners := array['11111111-1111-4111-8111-111111111111'::uuid,
                  '22222222-2222-4222-8222-222222222222'::uuid,
                  '33333333-3333-4333-8333-333333333333'::uuid];

  for f in select id from public.files where storage_path like owner_id::text || '/demo-seed/%'
           order by created_at
  loop
    i := i + 1;

    for j in 1..array_length(owners, 1) loop
      voter := owners[j];
      -- A deterministic mix of up and down votes, and some abstentions.
      if (i + j) % 4 <> 0 then
        insert into public.votes (file_id, user_id, value)
        values (f.id, voter, case when (i * j) % 3 = 0 then -1 else 1 end)
        on conflict (file_id, user_id) do update set value = excluded.value;
      end if;
    end loop;

    if i % 3 <> 0 then
      insert into public.comments (file_id, author_id, body)
      values (
        f.id,
        owners[1 + (i % array_length(owners, 1))],
        (array[
          'This corroborates exhibit 4. Requesting the full file.',
          'The timestamp does not line up with the roster.',
          'Filed under the wrong category, surely.',
          'I was there. It did not happen like this.',
          'Motion to declassify the remainder.'
        ])[1 + (i % 5)]
      );
    end if;
  end loop;

  update public.files set view_count = 3 + (abs(hashtext(id::text)::bigint) % 240)
   where storage_path like owner_id::text || '/demo-seed/%';
end $engagement$;

-- ---------------------------------------------------------------------------
-- 5. One open report, so the admin queue is not empty.
-- ---------------------------------------------------------------------------
insert into public.reports (file_id, reporter_id, reason, details)
select f.id, '11111111-1111-4111-8111-111111111111'::uuid, 'other', 'Seeded demo report -- safe to dismiss.'
  from public.files f
 where f.storage_path like f.owner_id::text || '/demo-seed/%'
 order by f.created_at
 limit 1;

commit;

-- ===========================================================================
--  Done. Open /d/<your-slug>/vault to see it.
-- ===========================================================================
