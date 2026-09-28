import assert from "node:assert/strict";
import { test } from "node:test";
import { createSupabaseSessionFinalizer, sessionFinalizerFromEnv } from "../src/history.js";

const closure = {
  roomId: "20000000-0000-4000-8000-000000000002",
  agentId: "10000000-0000-4000-8000-000000000001",
  reason: "host-disconnected" as const,
  endedAt: "2026-09-28T12:00:00.000Z",
};

test("reconciles an unfinished session through the scoped Supabase REST update", async () => {
  let requestedUrl = "";
  let requestedInit: RequestInit | undefined;
  const finalize = createSupabaseSessionFinalizer({
    supabaseUrl: "https://project.supabase.co",
    secretKey: "sb_secret_backend",
    fetchImpl: async (input, init) => {
      requestedUrl = input.toString();
      requestedInit = init;
      return new Response(null, { status: 204 });
    },
  });

  await finalize(closure);
  const url = new URL(requestedUrl);
  assert.equal(url.pathname, "/rest/v1/support_sessions");
  assert.equal(url.searchParams.get("id"), `eq.${closure.roomId}`);
  assert.equal(url.searchParams.get("agent_id"), `eq.${closure.agentId}`);
  assert.equal(url.searchParams.get("status"), "neq.completed");
  assert.equal(requestedInit?.method, "PATCH");
  assert.equal(new Headers(requestedInit?.headers).get("apikey"), "sb_secret_backend");
  assert.deepEqual(JSON.parse(String(requestedInit?.body)), {
    status: "completed",
    ended_at: closure.endedAt,
    ended_reason: "host-disconnected",
  });
});

test("keeps reconciliation optional and surfaces failed Supabase updates", async () => {
  assert.equal(sessionFinalizerFromEnv({ SUPABASE_URL: "https://project.supabase.co" }), null);
  assert.throws(
    () => sessionFinalizerFromEnv({ SUPABASE_SECRET_KEY: "sb_secret_backend" }),
    /requires SUPABASE_URL/,
  );

  const finalize = createSupabaseSessionFinalizer({
    supabaseUrl: "https://project.supabase.co",
    secretKey: "sb_secret_backend",
    fetchImpl: async () => new Response(null, { status: 503 }),
  });
  await assert.rejects(() => finalize(closure), /status 503/);
});
