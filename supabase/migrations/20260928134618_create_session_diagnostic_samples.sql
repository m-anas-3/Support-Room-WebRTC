create table public.support_session_diagnostic_samples (
  session_id uuid not null references public.support_sessions (id) on delete cascade,
  sequence smallint not null check (sequence between 0 and 899),
  sampled_at timestamptz not null,
  connection_state text not null check (
    connection_state in ('idle', 'new', 'connecting', 'connected', 'disconnected', 'failed', 'closed')
  ),
  latency_ms numeric(10, 2) check (latency_ms >= 0),
  incoming_packet_loss_percent numeric(7, 4) check (
    incoming_packet_loss_percent between 0 and 100
  ),
  outgoing_packet_loss_percent numeric(7, 4) check (
    outgoing_packet_loss_percent between 0 and 100
  ),
  send_bitrate_kbps numeric(12, 2) check (send_bitrate_kbps >= 0),
  receive_bitrate_kbps numeric(12, 2) check (receive_bitrate_kbps >= 0),
  available_outgoing_bitrate_kbps numeric(12, 2) check (
    available_outgoing_bitrate_kbps >= 0
  ),
  recovery_attempts integer not null default 0 check (recovery_attempts >= 0),
  primary key (session_id, sequence)
);

alter table public.support_session_diagnostic_samples enable row level security;

revoke all on table public.support_session_diagnostic_samples from anon, authenticated;
grant select, insert on table public.support_session_diagnostic_samples to authenticated;

create policy "Agents can view their own diagnostic samples"
on public.support_session_diagnostic_samples
for select
to authenticated
using (
  exists (
    select 1
    from public.support_sessions
    where support_sessions.id = support_session_diagnostic_samples.session_id
      and support_sessions.agent_id = (select auth.uid())
  )
);

create policy "Agents can create their own diagnostic samples"
on public.support_session_diagnostic_samples
for insert
to authenticated
with check (
  exists (
    select 1
    from public.support_sessions
    where support_sessions.id = support_session_diagnostic_samples.session_id
      and support_sessions.agent_id = (select auth.uid())
  )
);
