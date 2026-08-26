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

-- ---------------------------------------------------------------------------
-- 0. Demo members.
--
-- Creating auth users from SQL means writing into auth.users, whose exact
-- column set moves between GoTrue releases. The whole block is therefore
-- best-effort: if it fails on your version, the seed carries on and attributes
-- everything to the accounts that already exist, which still exercises the
-- list, the sorting, the comments and the admin screens.
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
  i int;
begin
  for i in 1..3 loop
    -- The signup trigger enforces the door policy, so open it first.
    insert into public.allowlist (email, note)
    values (emails[i], 'demo seed')
    on conflict (email) do nothing;

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
      '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
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
  end loop;

  raise notice 'demo members ready (password: demopass123)';
exception when others then
  raise notice 'demo members skipped (%): seeding with existing accounts only',
    sqlerrm;
end $demo$;

-- ---------------------------------------------------------------------------
-- 1. Clear previous demo content, identified by the marker in storage_path.
-- ---------------------------------------------------------------------------
delete from public.files where storage_path like 'demo-seed/%';
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
-- 3. Exhibits, spread across whichever members exist.
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
  kinds public.file_kind[] := array['pdf','pdf','other','audio','pdf','other',
                                    'pdf','image','image','other','pdf','pdf'];
  mimes text[] := array['application/pdf','application/pdf','text/plain',
                        'audio/mpeg','application/pdf','text/plain',
                        'application/pdf','image/jpeg','image/jpeg',
                        'text/plain','application/pdf','application/pdf'];
  new_id uuid;
  subject_ids uuid[];
  i int;
begin
  select array_agg(id order by created_at) into owners from public.profiles;
  if owners is null or array_length(owners, 1) = 0 then
    raise exception 'No profiles yet. Sign up once, then run this seed.';
  end if;

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
      'demo-seed/' || i || '-' || gen_random_uuid(),
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
  select array_agg(id order by created_at) into owners from public.profiles;

  for f in select id from public.files where storage_path like 'demo-seed/%'
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

  update public.files set view_count = 3 + (abs(hashtext(id::text)) % 240)
   where storage_path like 'demo-seed/%';
end $engagement$;

-- ---------------------------------------------------------------------------
-- 5. One open report, so the admin queue is not empty.
-- ---------------------------------------------------------------------------
insert into public.reports (file_id, reporter_id, reason, details)
select f.id, p.id, 'inaccurate', 'Seeded demo report -- safe to dismiss.'
  from public.files f
  cross join lateral (select id from public.profiles order by created_at limit 1) p
 where f.storage_path like 'demo-seed/%'
 order by f.created_at
 limit 1;

-- ===========================================================================
--  Done. Open /d/<your-slug>/vault to see it.
-- ===========================================================================
