import assert from "node:assert/strict";
import { test } from "node:test";
import { iceConfigurationFromEnv, issueIceConfiguration } from "../src/ice.js";

test("validates TURN server environment configuration", () => {
  assert.equal(iceConfigurationFromEnv({}), null);
  assert.deepEqual(iceConfigurationFromEnv({
    STUN_URLS: "",
    TURN_URLS: "turn:turn.example.com:3478, turns:turn.example.com:5349",
    TURN_SHARED_SECRET: " secret ",
    TURN_CREDENTIAL_TTL_SECONDS: "900",
    ICE_TRANSPORT_POLICY: "relay",
  }), {
    stunUrls: [],
    turnUrls: ["turn:turn.example.com:3478", "turns:turn.example.com:5349"],
    sharedSecret: "secret",
    ttlSeconds: 900,
    transportPolicy: "relay",
  });
  assert.throws(
    () => iceConfigurationFromEnv({ TURN_URLS: "turn:turn.example.com:3478" }),
    /TURN_SHARED_SECRET/,
  );
  assert.throws(
    () => iceConfigurationFromEnv({ TURN_URLS: "https://turn.example.com", TURN_SHARED_SECRET: "secret" }),
    /TURN_URLS/,
  );
  assert.throws(
    () => iceConfigurationFromEnv({ TURN_URLS: "turn:turn.example.com", TURN_SHARED_SECRET: "secret", TURN_CREDENTIAL_TTL_SECONDS: "60" }),
    /between 600 and 86400/,
  );
});

test("generates deterministic coturn REST credentials", () => {
  const configuration = issueIceConfiguration({
    stunUrls: [],
    turnUrls: ["turn:turn.example.com:3478"],
    sharedSecret: "secret",
    ttlSeconds: 3600,
    transportPolicy: "relay",
  }, "room:customer", 1_700_000_000_123);

  assert.deepEqual(configuration, {
    type: "ice-configuration",
    iceServers: [{
      urls: ["turn:turn.example.com:3478"],
      username: "1700003600:room:customer",
      credential: "9ewhe8RUM79t1sFmqlc2coCDuE4=",
    }],
    iceTransportPolicy: "relay",
    expiresAt: 1_700_003_600_000,
  });
});
