BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT plan(13);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-4000-8000-000000000001', 'agent-one@example.com'),
  ('00000000-0000-4000-8000-000000000002', 'agent-two@example.com');

INSERT INTO public.support_sessions (id, agent_id, agent_name, reference)
VALUES (
  '10000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-000000000002',
  'Agent Two',
  'Private session'
);

SELECT has_table('public', 'support_sessions', 'support_sessions table exists');
SELECT has_table('public', 'support_session_diagnostic_samples', 'diagnostic samples table exists');
SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.support_sessions'::regclass),
  'row level security is enabled'
);

SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);

SELECT lives_ok(
  $$INSERT INTO public.support_sessions (id, agent_id, agent_name, reference)
    VALUES (
      '10000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000001',
      'Agent One',
      'Visible session'
    )$$,
  'an authenticated agent can create their own session'
);

SELECT is(
  (SELECT count(*) FROM public.support_sessions),
  1::bigint,
  'an agent can only select their own rows'
);

SELECT lives_ok(
  $$INSERT INTO public.support_session_diagnostic_samples (
      session_id, sequence, sampled_at, connection_state, latency_ms
    ) VALUES (
      '10000000-0000-4000-8000-000000000001', 0, now(), 'connected', 42
    )$$,
  'an authenticated agent can add diagnostics to their own session'
);

SELECT is(
  (SELECT count(*) FROM public.support_session_diagnostic_samples),
  1::bigint,
  'an agent can only select samples from their own sessions'
);

SELECT throws_ok(
  $$INSERT INTO public.support_session_diagnostic_samples (
      session_id, sequence, sampled_at, connection_state
    ) VALUES (
      '10000000-0000-4000-8000-000000000002', 0, now(), 'connected'
    )$$,
  '42501',
  'new row violates row-level security policy for table "support_session_diagnostic_samples"',
  'an agent cannot add diagnostics to another agent session'
);

SELECT throws_ok(
  $$INSERT INTO public.support_sessions (id, agent_id, agent_name)
    VALUES (
      '10000000-0000-4000-8000-000000000003',
      '00000000-0000-4000-8000-000000000002',
      'Agent One'
    )$$,
  '42501',
  'new row violates row-level security policy for table "support_sessions"',
  'an agent cannot create a session for another agent'
);

SELECT lives_ok(
  $$UPDATE public.support_sessions
    SET status = 'waiting'
    WHERE id = '10000000-0000-4000-8000-000000000001'$$,
  'an agent can update their own session'
);

SELECT is(
  (SELECT status::text FROM public.support_sessions WHERE id = '10000000-0000-4000-8000-000000000001'),
  'waiting',
  'the owner update is persisted'
);

RESET ROLE;
SET LOCAL ROLE anon;

SELECT throws_ok(
  $$SELECT count(*) FROM public.support_sessions$$,
  '42501',
  'permission denied for table support_sessions',
  'signed-out visitors cannot read session history'
);

SELECT throws_ok(
  $$SELECT count(*) FROM public.support_session_diagnostic_samples$$,
  '42501',
  'permission denied for table support_session_diagnostic_samples',
  'signed-out visitors cannot read diagnostic samples'
);

SELECT * FROM finish();
ROLLBACK;
