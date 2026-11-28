-- Secret messages for the owner's office event (artificials.net/pesan, worker/pesan.ts).
-- Run once in the Supabase SQL editor after 001–011. Only the Worker (service role)
-- reads or writes these tables: RLS is on and there are no policies.
-- Nothing about the sender is stored: no IP, user agent, account or cookie.
begin;
create table if not exists public.secret_messages (
  id uuid primary key default gen_random_uuid(),
  to_name text not null check (char_length(to_name) between 1 and 60),
  body text not null check (char_length(body) between 1 and 280),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'shown')),
  created_at timestamptz not null default now()
);
create index if not exists secret_messages_created_idx on public.secret_messages (created_at);
alter table public.secret_messages enable row level security;

create table if not exists public.secret_message_session (
  id int primary key check (id = 1),
  open boolean not null default false,
  updated_at timestamptz not null default now()
);
insert into public.secret_message_session (id, open) values (1, false) on conflict (id) do nothing;
alter table public.secret_message_session enable row level security;

revoke all on public.secret_messages, public.secret_message_session from anon, authenticated;
commit;
