create type public.support_session_status as enum (
  'created',
  'waiting',
  'active',
  'completed'
);

create table public.support_sessions (
  id uuid primary key,
  agent_id uuid not null references auth.users (id) on delete cascade,
  agent_name text not null check (char_length(agent_name) between 1 and 80),
  reference text not null default '' check (char_length(reference) <= 120),
  customer_name text check (customer_name is null or char_length(customer_name) between 1 and 80),
  status public.support_session_status not null default 'created',
  started_at timestamptz,
  ended_at timestamptz,
  quality_score smallint check (quality_score between 0 and 100),
  average_latency_ms numeric(10, 2) check (average_latency_ms >= 0),
  average_packet_loss_percent numeric(7, 4) check (average_packet_loss_percent between 0 and 100),
  average_send_bitrate_kbps numeric(12, 2) check (average_send_bitrate_kbps >= 0),
  average_receive_bitrate_kbps numeric(12, 2) check (average_receive_bitrate_kbps >= 0),
  reconnect_count integer not null default 0 check (reconnect_count >= 0),
  local_candidate_type text,
  remote_candidate_type text,
  transport_protocol text,
  media_sent boolean,
  media_received boolean,
  ended_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint support_sessions_time_order check (
    ended_at is null or started_at is null or ended_at >= started_at
  )
);

create index support_sessions_agent_created_idx
  on public.support_sessions (agent_id, created_at desc);

create index support_sessions_agent_status_idx
  on public.support_sessions (agent_id, status);

create function public.set_support_session_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger support_sessions_set_updated_at
before update on public.support_sessions
for each row execute function public.set_support_session_updated_at();

revoke execute on function public.set_support_session_updated_at() from public, anon, authenticated;

alter table public.support_sessions enable row level security;

revoke all on table public.support_sessions from anon, authenticated;
grant select, insert, update on table public.support_sessions to authenticated;
grant usage on type public.support_session_status to authenticated;

create policy "Agents can view their own support sessions"
on public.support_sessions
for select
to authenticated
using (
  (select auth.uid()) is not null
  and (select auth.uid()) = agent_id
);

create policy "Agents can create their own support sessions"
on public.support_sessions
for insert
to authenticated
with check (
  (select auth.uid()) is not null
  and (select auth.uid()) = agent_id
);

create policy "Agents can update their own support sessions"
on public.support_sessions
for update
to authenticated
using (
  (select auth.uid()) is not null
  and (select auth.uid()) = agent_id
)
with check (
  (select auth.uid()) is not null
  and (select auth.uid()) = agent_id
);
