-- Artificials became a free, non-commercial site on 25 September 2026: the paid
-- app builder, its plans and checkout are gone. Run once in the Supabase SQL
-- editor after 001–004. It is safe on a new or an existing database. Editor
-- profiles, articles, the audit log and rate limits stay.
begin;
drop function if exists public.claim_checkout(uuid, text);
drop function if exists public.reserve_generation(uuid, uuid, uuid, text, bigint);
drop function if exists public.delete_project(uuid, uuid);
drop function if exists public.complete_generation(uuid, uuid, jsonb, int, int);
drop function if exists public.apply_adjustment(text, timestamptz, text);
drop function if exists public.apply_billing_event(text, timestamptz, uuid, text, text, text, timestamptz, timestamptz, text, boolean);
drop table if exists public.checkout_requests;
drop table if exists public.billing_events;
drop table if exists public.daily_budgets;
drop table if exists public.generations;
drop table if exists public.projects;
drop table if exists public.subscriptions;
commit;
