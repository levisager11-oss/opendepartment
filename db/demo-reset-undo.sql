-- Disable the opt-in reset RPCs. Also remove the Vercel demo reset env vars.
-- Seed content and demo_seed_content() belong to seed-demo.sql and remain.
begin;
drop function if exists public.demo_reset();
drop function if exists public.demo_storage_extras();
drop function if exists public.demo_sync_sizes();
commit;
