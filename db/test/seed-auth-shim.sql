-- Test-only GoTrue subset shared by seed and demo hardening smoke tests.
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
