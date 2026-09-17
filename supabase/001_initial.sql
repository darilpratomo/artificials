-- Run once in the Supabase SQL editor. All privileged functions are service-role only.
begin;
create table public.profiles (id uuid primary key references auth.users(id) on delete cascade, role text not null default 'member' check(role in ('member','admin')), created_at timestamptz not null default now());
create function public.on_user_created() returns trigger language plpgsql security definer set search_path=public as $$ begin insert into public.profiles(id) values(new.id); return new; end $$;
create trigger artificials_new_user after insert on auth.users for each row execute function public.on_user_created();
insert into public.profiles(id) select id from auth.users on conflict do nothing;
create table public.subscriptions (user_id uuid primary key references public.profiles(id) on delete cascade, paddle_customer_id text, paddle_subscription_id text unique, plan text not null check(plan in ('starter','pro','studio')), status text not null default 'active', period_start timestamptz not null, period_end timestamptz not null, credit_limit int not null, project_limit int not null, budget_micros bigint not null, credits_used int not null default 0, reserved_micros bigint not null default 0, last_event_at timestamptz not null default '1970-01-01', check(period_end>period_start), check(credits_used>=0 and reserved_micros>=0));
create table public.projects (id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade, title text not null default 'Untitled app', artifact jsonb, updated_at timestamptz not null default now());
create index projects_owner on public.projects(user_id,updated_at desc);
create table public.generations (id uuid primary key, user_id uuid not null references public.profiles(id) on delete cascade, project_id uuid references public.projects(id) on delete set null, status text not null default 'pending' check(status in ('pending','completed','failed')), reserved_micros bigint not null default 100000, actual_micros bigint, input_tokens int, output_tokens int, created_at timestamptz not null default now());
create index generations_owner on public.generations(user_id,created_at desc);
create table public.daily_budgets(day date primary key,reserved_micros bigint not null default 0);
create table public.billing_events(id text primary key, occurred_at timestamptz not null, created_at timestamptz not null default now());
create table public.articles(id uuid primary key default gen_random_uuid(),slug text unique not null,title text not null,excerpt text not null,category text not null,body text not null,published boolean not null default false,updated_at timestamptz not null default now());
create table public.audit_log(id bigint generated always as identity primary key,actor_id uuid references public.profiles(id) on delete set null,action text not null,target_id text,created_at timestamptz not null default now());
create table public.checkout_requests(user_id uuid primary key references public.profiles(id) on delete cascade,plan text not null,transaction_id text,created_at timestamptz not null default now());
create table public.rate_limits(key text primary key,window_start timestamptz not null,hits int not null);

alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.projects enable row level security;
alter table public.generations enable row level security;
alter table public.daily_budgets enable row level security;
alter table public.billing_events enable row level security;
alter table public.articles enable row level security;
alter table public.audit_log enable row level security;
alter table public.rate_limits enable row level security;
alter table public.checkout_requests enable row level security;
create policy profile_read on public.profiles for select to authenticated using(id=auth.uid());
create policy subscription_read on public.subscriptions for select to authenticated using(user_id=auth.uid());
create policy project_read on public.projects for select to authenticated using(user_id=auth.uid());
create policy generation_read on public.generations for select to authenticated using(user_id=auth.uid());
create policy published_articles on public.articles for select using(published=true);
-- No client mutation policies. The Worker validates authorization before using the service key.
revoke all on all tables in schema public from anon,authenticated;
grant select on public.articles to anon,authenticated;
-- Private data is read through the Worker only, where verified MFA is enforced.
-- RLS remains as defense in depth, but no browser role receives private table access.
grant all on all tables in schema public to service_role;
grant usage,select on all sequences in schema public to service_role;

create function public.consume_rate(p_key text,p_limit int,p_seconds int) returns boolean language plpgsql security definer set search_path=public as $$
declare n int;
begin
 insert into rate_limits(key,window_start,hits) values(p_key,now(),1) on conflict(key) do update set hits=case when rate_limits.window_start < now()-make_interval(secs=>p_seconds) then 1 else rate_limits.hits+1 end,window_start=case when rate_limits.window_start < now()-make_interval(secs=>p_seconds) then now() else rate_limits.window_start end returning hits into n;
 return n<=p_limit;
end $$;

create function public.claim_checkout(p_user uuid,p_plan text) returns jsonb language plpgsql security definer set search_path=public as $$
declare r checkout_requests;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,0));
 select * into r from checkout_requests where user_id=p_user for update;
 if found then return jsonb_build_object('claimed',false,'plan',r.plan,'transaction_id',r.transaction_id); end if;
 insert into checkout_requests(user_id,plan) values(p_user,p_plan);
 return jsonb_build_object('claimed',true);
end $$;

create function public.reserve_generation(p_user uuid,p_id uuid,p_project uuid,p_title text,p_daily_limit bigint) returns jsonb language plpgsql security definer set search_path=public as $$
declare s subscriptions; g generations; project uuid; daily bigint; count_projects int;
begin
 select * into s from subscriptions where user_id=p_user for update;
 if not found then raise exception 'SUBSCRIPTION_REQUIRED'; end if;
 select * into g from generations where id=p_id;
 if found then
   if g.user_id<>p_user then raise exception 'INVALID_REQUEST'; end if;
   return jsonb_build_object('duplicate',true,'id',g.id,'project_id',g.project_id,'status',g.status);
 end if;
 if pg_database_size(current_database())>419430400 then raise exception 'STORAGE_CAPACITY'; end if;
 if s.status<>'active' or s.period_end<=now() or s.period_start>now() then raise exception 'SUBSCRIPTION_REQUIRED'; end if;
 if s.credits_used>=s.credit_limit or s.reserved_micros+100000>s.budget_micros then raise exception 'MONTHLY_LIMIT'; end if;
 if exists(select 1 from generations where user_id=p_user and status='pending' and created_at>now()-interval '5 minutes') then raise exception 'GENERATION_IN_PROGRESS'; end if;
 if (select count(*) from generations where user_id=p_user and created_at>now()-interval '1 minute')>=3 then raise exception 'RATE_LIMIT'; end if;
 if p_daily_limit<100000 or p_daily_limit>100000000 then raise exception 'INVALID_DAILY_LIMIT'; end if;
 insert into daily_budgets(day,reserved_micros) values((now() at time zone 'UTC')::date,0) on conflict do nothing;
 select reserved_micros into daily from daily_budgets where day=(now() at time zone 'UTC')::date for update;
 if daily+100000>p_daily_limit then raise exception 'DAILY_SERVICE_LIMIT'; end if;
 if p_project is null then
   select count(*) into count_projects from projects where user_id=p_user;
   if count_projects>=s.project_limit then raise exception 'PROJECT_LIMIT'; end if;
   insert into projects(user_id,title) values(p_user,left(p_title,100)) returning id into project;
 else
   select id into project from projects where id=p_project and user_id=p_user;
   if project is null then raise exception 'PROJECT_NOT_FOUND'; end if;
 end if;
 update subscriptions set credits_used=credits_used+1,reserved_micros=reserved_micros+100000 where user_id=p_user;
 update daily_budgets set reserved_micros=reserved_micros+100000 where day=(now() at time zone 'UTC')::date;
 insert into generations(id,user_id,project_id) values(p_id,p_user,project);
 return jsonb_build_object('duplicate',false,'id',p_id,'project_id',project,'status','pending');
end $$;

-- Shares the subscription lock with reserve_generation so deletion cannot race a new build.
create function public.delete_project(p_user uuid,p_id uuid) returns boolean language plpgsql security definer set search_path=public as $$
begin
 perform 1 from subscriptions where user_id=p_user for update;
 if exists(select 1 from generations where user_id=p_user and project_id=p_id and status='pending' and created_at>now()-interval '5 minutes') then raise exception 'GENERATION_IN_PROGRESS'; end if;
 delete from projects where id=p_id and user_id=p_user;
 return found;
end $$;

create function public.complete_generation(p_user uuid,p_id uuid,p_artifact jsonb,p_input int,p_output int) returns void language plpgsql security definer set search_path=public as $$
declare g generations;
begin
 select * into g from generations where id=p_id and user_id=p_user for update;
 if not found or g.status<>'pending' then raise exception 'INVALID_GENERATION'; end if;
 update projects set artifact=p_artifact,title=left(p_artifact->>'title',100),updated_at=now() where id=g.project_id and user_id=p_user;
 if not found then raise exception 'PROJECT_NOT_FOUND'; end if;
 update generations set status='completed',input_tokens=p_input,output_tokens=p_output,actual_micros=ceil(p_input*0.25+p_output*2) where id=p_id;
end $$;

create function public.apply_adjustment(p_id text,p_occurred timestamptz,p_subscription text) returns void language plpgsql security definer set search_path=public as $$
begin
 insert into billing_events(id,occurred_at) values('adjustment:'||p_id,p_occurred) on conflict do nothing;
 if not found then return; end if;
 update subscriptions set status='suspended',last_event_at=greatest(last_event_at,p_occurred) where paddle_subscription_id=p_subscription;
end $$;

-- One transaction per webhook: duplicates and out-of-order events cannot refill credits.
create function public.apply_billing_event(p_event text,p_occurred timestamptz,p_user uuid,p_subscription text,p_customer text,p_plan text,p_start timestamptz,p_end timestamptz,p_status text,p_paid boolean) returns void language plpgsql security definer set search_path=public as $$
declare s subscriptions; lim int; proj int; budget bigint;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,0));
 insert into billing_events(id,occurred_at) values(p_event,p_occurred) on conflict do nothing;
 if not found then return; end if;
 select * into s from subscriptions where user_id=p_user for update;
 if not p_paid and found and s.last_event_at>=p_occurred then return; end if;
 if p_paid then
   if p_plan='starter' then lim:=30;proj:=5;budget:=3000000;
   elsif p_plan='pro' then lim:=90;proj:=20;budget:=9000000;
   elsif p_plan='studio' then lim:=200;proj:=50;budget:=20000000;
   else raise exception 'UNKNOWN_PLAN'; end if;
   if p_start is null or p_end is null or p_end<=p_start then raise exception 'INVALID_PERIOD'; end if;
   if s.user_id is not null and s.paddle_subscription_id<>p_subscription and s.period_end>now() then raise exception 'DUPLICATE_SUBSCRIPTION'; end if;
   if s.user_id is not null and p_start<s.period_start then return; end if;
   if s.user_id is not null and p_start=s.period_start then
      update subscriptions set last_event_at=greatest(last_event_at,p_occurred) where user_id=p_user;
      return; -- No mid-cycle credit resets, including plan changes and proration.
   end if;
   delete from checkout_requests where user_id=p_user;
   insert into subscriptions(user_id,paddle_subscription_id,paddle_customer_id,plan,status,period_start,period_end,credit_limit,project_limit,budget_micros,last_event_at)
   values(p_user,p_subscription,p_customer,p_plan,'active',p_start,p_end,lim,proj,budget,p_occurred)
   on conflict(user_id) do update set paddle_subscription_id=p_subscription,paddle_customer_id=p_customer,plan=p_plan,status='active',period_start=p_start,period_end=p_end,credit_limit=lim,project_limit=proj,budget_micros=budget,credits_used=0,reserved_micros=0,last_event_at=greatest(subscriptions.last_event_at,p_occurred);
 else
   if s.paddle_subscription_id=p_subscription then
     update subscriptions set status=case when s.status='suspended' then 'suspended' else p_status end,last_event_at=p_occurred where user_id=p_user;
   end if;
 end if;
end $$;
revoke execute on all functions in schema public from public,anon,authenticated;
grant execute on function public.delete_project(uuid,uuid), public.apply_adjustment(text,timestamptz,text), public.consume_rate(text,int,int), public.claim_checkout(uuid,text), public.reserve_generation(uuid,uuid,uuid,text,bigint), public.complete_generation(uuid,uuid,jsonb,int,int), public.apply_billing_event(text,timestamptz,uuid,text,text,text,timestamptz,timestamptz,text,boolean) to service_role;
commit;
