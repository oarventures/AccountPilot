-- Apply once in a dedicated Supabase project. No customer data belongs in test environments.
begin;
create table public.memberships (
 user_id uuid primary key references auth.users(id) on delete cascade,
 stripe_customer_id text unique not null,
 stripe_subscription_id text unique not null,
 status text not null check(status in ('active','inactive')),
 access_until timestamptz,
 subscription_created bigint not null,
 event_created bigint not null,
 updated_at timestamptz not null default now()
);
create table public.billing_events (event_id text primary key, processed_at timestamptz not null default now());
create table public.workspaces (
 user_id uuid primary key references auth.users(id) on delete cascade,
 payload jsonb not null check(jsonb_typeof(payload)='object' and octet_length(payload::text)<=3000000),
 revision bigint not null default 1 check(revision>0),
 updated_at timestamptz not null default now()
);
alter table public.memberships enable row level security;
alter table public.billing_events enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspaces force row level security;
revoke all on public.memberships,public.billing_events,public.workspaces from public,anon,authenticated;
grant select on public.memberships to authenticated;
grant select,insert,update,delete on public.workspaces to authenticated;
grant select,insert,update on public.memberships,public.billing_events to service_role;
revoke all on public.workspaces from service_role;
create policy own_membership on public.memberships for select to authenticated using(user_id=(select auth.uid()));
create function public.has_paid_access() returns boolean language sql stable security invoker set search_path=pg_catalog,public as $$
 select exists(select 1 from public.memberships where user_id=(select auth.uid()) and status='active' and access_until>now());
$$;
revoke all on function public.has_paid_access() from public;
grant execute on function public.has_paid_access() to authenticated;
create policy own_paid_workspace on public.workspaces for all to authenticated
 using(user_id=(select auth.uid()) and public.has_paid_access())
 with check(user_id=(select auth.uid()) and public.has_paid_access());
-- Users cannot manufacture entitlements. Only the signature-verified billing webhook calls this RPC.
create function public.apply_subscription_event(p_event_id text,p_user_id uuid,p_customer_id text,p_subscription_id text,p_status text,p_access_until timestamptz,p_subscription_created bigint,p_event_created bigint)
 returns boolean language plpgsql security definer set search_path=pg_catalog,public as $$
begin
 if p_status not in ('active','inactive') then raise exception 'invalid membership status'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_user_id::text,0));
 insert into public.billing_events(event_id) values(p_event_id) on conflict do nothing;
 if not found then return false; end if;
 insert into public.memberships(user_id,stripe_customer_id,stripe_subscription_id,status,access_until,subscription_created,event_created)
 values(p_user_id,p_customer_id,p_subscription_id,p_status,p_access_until,p_subscription_created,p_event_created)
 on conflict(user_id) do update set stripe_customer_id=excluded.stripe_customer_id,stripe_subscription_id=excluded.stripe_subscription_id,status=excluded.status,access_until=excluded.access_until,subscription_created=excluded.subscription_created,event_created=excluded.event_created,updated_at=now()
 where excluded.subscription_created>memberships.subscription_created
 or (excluded.subscription_created=memberships.subscription_created and excluded.stripe_subscription_id=memberships.stripe_subscription_id
 and (excluded.event_created>memberships.event_created or (excluded.event_created=memberships.event_created and excluded.status='inactive')));
 return true;
end;
$$;
revoke all on function public.apply_subscription_event(text,uuid,text,text,text,timestamptz,bigint,bigint) from public,anon,authenticated;
grant execute on function public.apply_subscription_event(text,uuid,text,text,text,timestamptz,bigint,bigint) to service_role;
commit;
