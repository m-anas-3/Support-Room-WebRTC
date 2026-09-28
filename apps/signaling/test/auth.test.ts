import assert from "node:assert/strict";
import { test } from "node:test";
import { createSupabaseRoomCreationAuthenticator, roomCreationAuthenticatorFromEnv } from "../src/auth.js";

test("verifies room creators with the Supabase Auth user endpoint", async () => {
  let requestedUrl = "";
  let requestedHeaders: Headers | null = null;
  const authenticate = createSupabaseRoomCreationAuthenticator({
    supabaseUrl: "https://project.supabase.co",
    publishableKey: "publishable-key",
    fetchImpl: async (input, init) => {
      requestedUrl = input.toString();
      requestedHeaders = new Headers(init?.headers);
      return Response.json({ id: "10000000-0000-4000-8000-000000000001" });
    },
  });

  assert.deepEqual(await authenticate("agent-access-token"), { agentId: "10000000-0000-4000-8000-000000000001" });
  assert.equal(requestedUrl, "https://project.supabase.co/auth/v1/user");
  assert.equal(requestedHeaders?.get("apikey"), "publishable-key");
  assert.equal(requestedHeaders?.get("authorization"), "Bearer agent-access-token");
});

test("rejects invalid Supabase sessions and incomplete server configuration", async () => {
  const authenticate = createSupabaseRoomCreationAuthenticator({
    supabaseUrl: "https://project.supabase.co",
    publishableKey: "publishable-key",
    fetchImpl: async () => new Response(null, { status: 401 }),
  });

  assert.equal(await authenticate("expired-access-token"), null);
  assert.throws(
    () => roomCreationAuthenticatorFromEnv({}),
    /requires SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY/,
  );
  assert.throws(
    () => roomCreationAuthenticatorFromEnv({ SUPABASE_URL: "http://project.supabase.co", SUPABASE_PUBLISHABLE_KEY: "key" }),
    /must use HTTPS/,
  );
});
