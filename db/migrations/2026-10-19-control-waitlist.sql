/*
 * Control plane only: apply manually in the control-plane project's SQL editor.
 * Safe to re-run. NOT for tenant projects.
 */
-- ---------------------------------------------------------------------------
-- HOSTED-VERSION WAITLIST -- no direct client access, only the bounded RPC.
-- ---------------------------------------------------------------------------
create table if not exists public.waitlist (
  id bigint generated always as identity primary key,
  email text not null check (length(email) <= 254 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  group_size integer not null check (group_size between 1 and 10000),
  expected_storage text not null check (expected_storage in ('under_1gb', '1_10gb', '10_100gb', 'over_100gb')),
  willingness_to_pay smallint not null check (willingness_to_pay in (0, 3, 5, 10)),
  created_at timestamptz not null default now()
);
comment on column public.waitlist.willingness_to_pay is 'Willingness to pay in EUR per month.';
create unique index if not exists waitlist_email_idx on public.waitlist (lower(email));
alter table public.waitlist enable row level security;
revoke all on public.waitlist from anon, authenticated, public;

-- Only SHA-256 digests of client addresses, never clear IPs; kept for a day.
create table if not exists public.waitlist_throttle (
  sender text not null,
  at timestamptz not null default now()
);
create index if not exists waitlist_throttle_sender_idx on public.waitlist_throttle (sender, at);
alter table public.waitlist_throttle enable row level security;
revoke all on public.waitlist_throttle from anon, authenticated, public;

create or replace function public.max_waitlist_rows()
returns integer language sql immutable set search_path = public
as $fn$ select 5000; $fn$;
revoke execute on function public.max_waitlist_rows() from anon, authenticated, public;

create or replace function public.join_waitlist(
  email text, group_size integer, expected_storage text, willingness_to_pay integer
) returns void
language plpgsql security definer set search_path = public as $fn$
#variable_conflict use_column
declare
  clean text := lower(trim(email));
  headers json;
  address text;
  sender_key text;
begin
  if clean is null or length(clean) > 254 or clean !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'INVALID_EMAIL';
  end if;
  if group_size is null or group_size not between 1 and 10000 then
    raise exception 'INVALID_GROUP_SIZE';
  end if;
  if expected_storage is null or expected_storage not in ('under_1gb', '1_10gb', '10_100gb', 'over_100gb') then
    raise exception 'INVALID_STORAGE';
  end if;
  if willingness_to_pay is null or willingness_to_pay not in (0, 3, 5, 10) then
    raise exception 'INVALID_PRICE';
  end if;

  begin
    headers := nullif(current_setting('request.headers', true), '')::json;
  exception when others then
    headers := null;
  end;
  address := coalesce(
    nullif(trim(headers ->> 'cf-connecting-ip'), ''),
    nullif(trim(headers ->> 'x-real-ip'), ''),
    nullif(trim(split_part(headers ->> 'x-forwarded-for', ',', 1)), '')
  );
  if address is not null then
    sender_key := encode(sha256(convert_to('ip:' || address, 'UTF8')), 'hex');
  end if;

  -- Serialize this small list's calls, including the per-sender rate check.
  perform pg_advisory_xact_lock(20261019, 1);
  delete from public.waitlist_throttle t where t.at < now() - interval '1 day';
  if (select count(*) from public.waitlist_throttle t
       where t.sender = sender_key and t.at > now() - interval '1 hour') >= 5 then
    raise exception 'RATE_LIMITED';
  end if;

  -- At capacity, duplicates and new addresses receive the same error too.
  if (select count(*) from public.waitlist) >= public.max_waitlist_rows() then
    raise exception 'WAITLIST_FULL';
  end if;
  insert into public.waitlist_throttle (sender)
    select sender_key where sender_key is not null;
  insert into public.waitlist (email, group_size, expected_storage, willingness_to_pay)
    values (clean, $2, $3, $4)
    on conflict ((lower(email))) do nothing;
end; $fn$;
revoke execute on function public.join_waitlist(text, integer, text, integer) from public;
grant execute on function public.join_waitlist(text, integer, text, integer) to anon, authenticated;
