import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import type { AddressInfo } from "node:net";
import { createHmac, randomUUID } from "node:crypto";
import { WebSocket } from "ws";
import { serverMessageSchema, type CreatedRoom, type ServerMessage } from "@support-room/shared";
import { createSignalingServer } from "../src/server.js";
import type { RoomClosure } from "../src/rooms.js";

const origin = "http://localhost:3000";
const validAccessToken = "test-agent-access-token-00000001";
const authenticateRoomCreation = async (accessToken: string) => accessToken === validAccessToken ? { agentId: "10000000-0000-4000-8000-000000000001" } : null;
let app: ReturnType<typeof createSignalingServer>;
let url: string;
const clients = new Set<WebSocket>();
let closures: RoomClosure[] = [];

class Inbox {
  private messages: ServerMessage[] = [];
  private listeners = new Set<() => void>();

  constructor(readonly socket: WebSocket) {
    socket.on("message", (data) => {
      const parsed = serverMessageSchema.safeParse(JSON.parse(data.toString()));
      if (!parsed.success) throw new Error("Server sent an invalid protocol message");
      this.messages.push(parsed.data);
      this.listeners.forEach((listener) => listener());
    });
  }

  send(message: object) { this.socket.send(JSON.stringify(message)); }

  has(type: ServerMessage["type"]) { return this.messages.some((message) => message.type === type); }

  async next<T extends ServerMessage["type"]>(type: T, predicate?: (message: Extract<ServerMessage, { type: T }>) => boolean) {
    const take = () => {
      const index = this.messages.findIndex((message) => message.type === type && (!predicate || predicate(message as Extract<ServerMessage, { type: T }>)));
      if (index < 0) return undefined;
      return this.messages.splice(index, 1)[0] as Extract<ServerMessage, { type: T }>;
    };
    const ready = take();
    if (ready) return ready;
    return await new Promise<Extract<ServerMessage, { type: T }>>((resolve, reject) => {
      const timer = setTimeout(() => { this.listeners.delete(check); reject(new Error(`Timed out waiting for ${type}`)); }, 1500);
      const check = () => {
        const message = take();
        if (!message) return;
        clearTimeout(timer);
        this.listeners.delete(check);
        resolve(message);
      };
      this.listeners.add(check);
    });
  }
}

async function connect(connectionOrigin = origin) {
  const socket = new WebSocket(url, { origin: connectionOrigin });
  clients.add(socket);
  await new Promise<void>((resolve, reject) => {
    socket.once("open", resolve);
    socket.once("error", reject);
  });
  return new Inbox(socket);
}

async function createRoom(client: Inbox, reference = "Ticket 42") {
  const requestId = randomUUID();
  client.send({ type: "create-room", requestId, reference, accessToken: validAccessToken });
  return await client.next("room-created", (message) => message.requestId === requestId);
}

async function closureFor(roomId: string) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const closure = closures.find((item) => item.roomId === roomId);
    if (closure) return closure;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(`Timed out waiting for room closure ${roomId}`);
}

function join(client: Inbox, room: CreatedRoom, role: "host" | "customer", token: string, name: string) {
  client.send({ type: "join-room", roomId: room.roomId, role, token, name });
}

beforeEach(async () => {
  closures = [];
  app = createSignalingServer({ allowedOrigins: [origin], authenticateRoomCreation, finalizeSession: async (closure) => { closures.push(closure); }, roomTtlMs: 10_000, hostReconnectGraceMs: 1000 });
  await app.listen(0);
  const address = app.server.address() as AddressInfo;
  url = `ws://127.0.0.1:${address.port}/signal`;
});

afterEach(async () => {
  for (const client of clients) client.terminate();
  clients.clear();
  await app.close();
});

test("creates a private room, enforces admission, and relays negotiation", async () => {
  const creator = await connect();
  const room = await createRoom(creator);
  assert.equal(room.type, "room-created");
  assert.notEqual(room.hostToken, room.inviteToken);

  const host = await connect();
  join(host, room, "host", room.hostToken, "Alex");
  assert.equal((await host.next("room-state")).room.hostConnected, true);

  const customer = await connect();
  join(customer, room, "customer", room.inviteToken, "Jordan");
  assert.equal((await customer.next("room-state")).room.customerState, "waiting");
  assert.equal((await host.next("room-state", (message) => message.room.customerState === "waiting")).room.customerName, "Jordan");

  host.send({ type: "offer", sdp: "offer-before-admission" });
  assert.equal((await host.next("error")).code, "NOT_ADMITTED");

  host.send({ type: "admit" });
  await customer.next("admitted");
  assert.equal((await customer.next("room-state")).room.customerState, "admitted");

  host.send({ type: "offer", sdp: "offer-before-ready" });
  assert.equal((await host.next("error")).code, "PEERS_NOT_READY");
  host.send({ type: "peer-ready" });
  customer.send({ type: "peer-ready" });
  await host.next("peers-ready");
  await customer.next("peers-ready");
  host.send({ type: "offer", sdp: "test-offer" });
  assert.equal((await customer.next("offer")).sdp, "test-offer");
  customer.send({ type: "answer", sdp: "test-answer" });
  assert.equal((await host.next("answer")).sdp, "test-answer");
  host.send({ type: "ice-candidate", candidate: null });
  assert.equal((await customer.next("ice-candidate")).candidate, null);
  customer.send({ type: "screen-share-state", active: true });
  assert.equal((await host.next("screen-share-state")).active, true);
  customer.send({ type: "ice-restart-request" });
  assert.equal((await host.next("ice-restart-request")).type, "ice-restart-request");
  host.send({ type: "ice-restart-request" });
  assert.equal((await host.next("error")).code, "INVALID_ROLE");
  host.send({ type: "media-state", camera: false, microphone: true });
  assert.deepEqual(await customer.next("media-state"), { type: "media-state", camera: false, microphone: true });
});

test("rejects invalid credentials, duplicate customers, and unauthorized roles", async () => {
  const creator = await connect();
  const room = await createRoom(creator);

  const attacker = await connect();
  join(attacker, room, "customer", "x".repeat(64), "Attacker");
  assert.equal((await attacker.next("error")).code, "INVALID_TOKEN");

  const host = await connect();
  join(host, room, "host", room.hostToken, "Alex");
  await host.next("room-state");
  const customer = await connect();
  join(customer, room, "customer", room.inviteToken, "Jordan");
  await customer.next("room-state");

  const extra = await connect();
  join(extra, room, "customer", room.inviteToken, "Extra");
  assert.equal((await extra.next("error")).code, "ROOM_FULL");
  customer.send({ type: "admit" });
  assert.equal((await customer.next("error")).code, "HOST_ONLY");

});

test("requires an authenticated agent before creating a room", async () => {
  const client = await connect();
  client.send({ type: "create-room", requestId: randomUUID(), reference: "Unauthorized", accessToken: "invalid-agent-access-token-00000" });
  assert.equal((await client.next("error")).code, "AUTH_REQUIRED");

  const room = await createRoom(client, "Authorized");
  assert.equal(room.type, "room-created");
});

test("closes the room when the host leaves and rejects disallowed origins", async () => {
  const creator = await connect();
  const room = await createRoom(creator);
  const host = await connect();
  const customer = await connect();
  join(host, room, "host", room.hostToken, "Alex");
  await host.next("room-state");
  join(customer, room, "customer", room.inviteToken, "Jordan");
  await customer.next("room-state");
  host.send({ type: "leave" });
  assert.equal((await customer.next("room-closed")).reason, "host-left");
  assert.equal((await closureFor(room.roomId)).reason, "host-ended");

  await new Promise<void>((resolve, reject) => {
    const socket = new WebSocket(url, { origin: "https://evil.example" });
    clients.add(socket);
    socket.once("unexpected-response", (_request, response) => {
      response.destroy();
      try { assert.equal(response.statusCode, 403); resolve(); } catch (error) { reject(error); }
    });
    socket.once("open", () => reject(new Error("Disallowed origin connected")));
    socket.once("error", () => undefined);
  });
});

test("isolates rooms even when a sender includes another room ID", async () => {
  const creator = await connect();
  const first = await createRoom(creator, "First");
  const second = await createRoom(creator, "Second");
  const firstHost = await connect();
  const firstCustomer = await connect();
  const secondHost = await connect();
  const secondCustomer = await connect();

  for (const [room, host, customer] of [[first, firstHost, firstCustomer], [second, secondHost, secondCustomer]] as const) {
    join(host, room, "host", room.hostToken, "Host");
    await host.next("room-state");
    join(customer, room, "customer", room.inviteToken, "Customer");
    await customer.next("room-state");
    host.send({ type: "admit" });
    await customer.next("admitted");
    host.send({ type: "peer-ready" });
    customer.send({ type: "peer-ready" });
    await host.next("peers-ready");
    await customer.next("peers-ready");
  }

  firstHost.send({ type: "offer", roomId: second.roomId, sdp: "first-room-offer" });
  assert.equal((await firstCustomer.next("offer")).sdp, "first-room-offer");
  secondHost.send({ type: "offer", sdp: "second-room-offer" });
  assert.equal((await secondCustomer.next("offer")).sdp, "second-room-offer");
  // If the first message leaked, it would be the first offer in this inbox.

  firstCustomer.send({ type: "leave" });
  await firstHost.next("peer-left");
  const replacement = await connect();
  join(replacement, first, "customer", first.inviteToken, "Replacement");
  assert.equal((await replacement.next("room-state")).room.customerState, "waiting");
});

test("declining frees the customer slot and malformed messages are rejected", async () => {
  const host = await connect();
  const room = await createRoom(host);
  join(host, room, "host", room.hostToken, "Host");
  await host.next("room-state");
  const customer = await connect();
  join(customer, room, "customer", room.inviteToken, "Customer");
  await customer.next("room-state");
  host.send({ type: "decline" });
  await customer.next("declined");
  const replacement = await connect();
  join(replacement, room, "customer", room.inviteToken, "Replacement");
  await replacement.next("room-state");

  replacement.socket.send("not-json");
  assert.equal((await replacement.next("error")).code, "INVALID_MESSAGE");
  replacement.send({ type: "offer", sdp: 123 });
  assert.equal((await replacement.next("error")).code, "INVALID_MESSAGE");
});

test("expires active rooms and rejects reuse of their credentials", async () => {
  await app.close();
  app = createSignalingServer({ allowedOrigins: [origin], authenticateRoomCreation, finalizeSession: async (closure) => { closures.push(closure); }, roomTtlMs: 200 });
  await app.listen(0);
  const address = app.server.address() as AddressInfo;
  url = `ws://127.0.0.1:${address.port}/signal`;
  const host = await connect();
  const room = await createRoom(host);
  join(host, room, "host", room.hostToken, "Host");
  await host.next("room-state");
  assert.equal((await host.next("room-closed")).reason, "expired");
  assert.equal((await closureFor(room.roomId)).reason, "expired");
  const late = await connect();
  join(late, room, "customer", room.inviteToken, "Late");
  assert.equal((await late.next("error")).code, "ROOM_UNAVAILABLE");
});

test("allows a host to rejoin during the grace period, then closes an abandoned room", async () => {
  const host = await connect();
  const room = await createRoom(host);
  join(host, room, "host", room.hostToken, "Host");
  await host.next("room-state");
  const customer = await connect();
  join(customer, room, "customer", room.inviteToken, "Customer");
  await customer.next("room-state");

  host.socket.terminate();
  await customer.next("peer-left");
  assert.equal((await customer.next("room-state", (message) => !message.room.hostConnected)).room.hostConnected, false);
  const rejoined = await connect();
  join(rejoined, room, "host", room.hostToken, "Host");
  assert.equal((await rejoined.next("room-state")).room.hostConnected, true);

  rejoined.socket.terminate();
  assert.equal((await customer.next("room-closed")).reason, "host-left");
  assert.equal((await closureFor(room.roomId)).reason, "host-disconnected");
});

test("issues short-lived TURN credentials only after a valid room join", async () => {
  await app.close();
  const sharedSecret = "test-turn-shared-secret";
  app = createSignalingServer({
    allowedOrigins: [origin],
    authenticateRoomCreation,
    finalizeSession: async (closure) => { closures.push(closure); },
    iceConfiguration: {
      stunUrls: ["stun:stun.example.com:3478"],
      turnUrls: ["turn:turn.example.com:3478?transport=udp", "turns:turn.example.com:5349?transport=tcp"],
      sharedSecret,
      ttlSeconds: 600,
      transportPolicy: "all",
    },
  });
  await app.listen(0);
  const address = app.server.address() as AddressInfo;
  url = `ws://127.0.0.1:${address.port}/signal`;

  const creator = await connect();
  const room = await createRoom(creator);
  const invalid = await connect();
  join(invalid, room, "customer", "x".repeat(64), "Invalid");
  assert.equal((await invalid.next("error")).code, "INVALID_TOKEN");
  assert.equal(invalid.has("ice-configuration"), false);

  const host = await connect();
  join(host, room, "host", room.hostToken, "Alex");
  const configuration = await host.next("ice-configuration");
  const turn = configuration.iceServers.find((server) => "username" in server);
  assert.ok(turn && "username" in turn && "credential" in turn);
  assert.deepEqual(configuration.iceServers[0], { urls: ["stun:stun.example.com:3478"] });
  assert.deepEqual(turn.urls, ["turn:turn.example.com:3478?transport=udp", "turns:turn.example.com:5349?transport=tcp"]);
  assert.match(turn.username, new RegExp(`^\\d+:${room.roomId}:host$`));
  assert.equal(configuration.expiresAt, Number(turn.username.split(":", 1)[0]) * 1000);
  assert.equal(turn.credential, createHmac("sha1", sharedSecret).update(turn.username).digest("base64"));
  assert.ok(configuration.expiresAt > Date.now() + 590_000);
  assert.equal(configuration.iceTransportPolicy, "all");
});
