import { z } from "zod";

const roomId = z.string().uuid();
const token = z.string().min(32).max(128);
const name = z.string().trim().min(1).max(80);
const candidate = z.object({
  candidate: z.string().max(4096),
  sdpMid: z.string().max(256).nullable().optional(),
  sdpMLineIndex: z.number().int().nonnegative().nullable().optional(),
  usernameFragment: z.string().max(256).nullable().optional(),
});

// These schemas validate untrusted JSON at both ends of the socket.
export const clientMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("create-room"), requestId: z.string().uuid(), reference: z.string().trim().max(120).default("") }),
  z.object({ type: z.literal("join-room"), roomId, token, role: z.enum(["host", "customer"]), name }),
  z.object({ type: z.literal("admit") }),
  z.object({ type: z.literal("decline") }),
  z.object({ type: z.literal("peer-ready") }),
  z.object({ type: z.literal("offer"), sdp: z.string().min(1).max(60000) }),
  z.object({ type: z.literal("answer"), sdp: z.string().min(1).max(60000) }),
  z.object({ type: z.literal("ice-candidate"), candidate: candidate.nullable() }),
  z.object({ type: z.literal("screen-share-state"), active: z.boolean() }),
  z.object({ type: z.literal("leave") }),
]);

export const roomSnapshotSchema = z.object({
  roomId,
  reference: z.string(),
  hostName: z.string().nullable(),
  hostConnected: z.boolean(),
  customerName: z.string().nullable(),
  customerState: z.enum(["absent", "waiting", "admitted"]),
});

export const serverMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("room-created"), requestId: z.string().uuid(), roomId, hostToken: token, inviteToken: token, expiresAt: z.number() }),
  z.object({ type: z.literal("room-state"), room: roomSnapshotSchema }),
  z.object({ type: z.literal("admitted") }),
  z.object({ type: z.literal("declined") }),
  z.object({ type: z.literal("peer-left") }),
  z.object({ type: z.literal("peers-ready") }),
  z.object({ type: z.literal("room-closed"), reason: z.enum(["host-left", "expired", "server-shutdown"]) }),
  z.object({ type: z.literal("offer"), sdp: z.string() }),
  z.object({ type: z.literal("answer"), sdp: z.string() }),
  z.object({ type: z.literal("ice-candidate"), candidate: candidate.nullable() }),
  z.object({ type: z.literal("screen-share-state"), active: z.boolean() }),
  z.object({ type: z.literal("error"), code: z.string(), message: z.string() }),
]);

export type ClientMessage = z.infer<typeof clientMessageSchema>;
export type ServerMessage = z.infer<typeof serverMessageSchema>;
export type RoomSnapshot = z.infer<typeof roomSnapshotSchema>;
export type CreatedRoom = Extract<ServerMessage, { type: "room-created" }>;
export type SignalMessage = Extract<ServerMessage, { type: "offer" | "answer" | "ice-candidate" | "screen-share-state" | "peers-ready" | "peer-left" | "room-closed" | "declined" }>;
