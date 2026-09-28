import { randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { WebSocket } from "ws";
import type { ClientMessage, CreatedRoom, IceConfiguration, RoomSnapshot } from "@support-room/shared";
import { send, sendError } from "./messages.js";

type Room = {
  id: string;
  agentId: string;
  reference: string;
  hostToken: string;
  inviteToken: string;
  expiresAt: number;
  host: WebSocket | null;
  hostName: string | null;
  customer: WebSocket | null;
  customerName: string | null;
  admitted: boolean;
  hostReady: boolean;
  customerReady: boolean;
  hostDisconnectTimer: ReturnType<typeof setTimeout> | null;
};
type Membership = { room: Room; role: "host" | "customer" };
type IceConfigurationIssuer = (roomId: string, role: Membership["role"]) => IceConfiguration;
export type RoomClosureReason = "host-ended" | "host-disconnected" | "expired" | "server-shutdown";
export type RoomClosure = { roomId: string; agentId: string; reason: RoomClosureReason; endedAt: string };
type RoomClosureListener = (closure: RoomClosure) => void;

function matchesToken(provided: string, expected: string) {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export class RoomRegistry {
  private rooms = new Map<string, Room>();
  private memberships = new Map<WebSocket, Membership>();

  constructor(
    private ttlMs = 30 * 60 * 1000,
    private maxRooms = 1000,
    private hostReconnectGraceMs = 30000,
    private issueIceConfiguration: IceConfigurationIssuer | null = null,
    private onRoomClosed: RoomClosureListener | null = null,
  ) {}

  create(requestId: string, reference: string, agentId: string): CreatedRoom | null {
    if (this.rooms.size >= this.maxRooms) return null;
    const room: Room = {
      id: randomUUID(), agentId, reference,
      hostToken: randomBytes(32).toString("hex"),
      inviteToken: randomBytes(32).toString("hex"),
      expiresAt: Date.now() + this.ttlMs,
      host: null, hostName: null, customer: null, customerName: null, admitted: false,
      hostReady: false, customerReady: false,
      hostDisconnectTimer: null,
    };
    this.rooms.set(room.id, room);
    return { type: "room-created", requestId, roomId: room.id, hostToken: room.hostToken, inviteToken: room.inviteToken, expiresAt: room.expiresAt };
  }

  private snapshot(room: Room): RoomSnapshot {
    return { roomId: room.id, reference: room.reference, hostName: room.hostName,
      hostConnected: room.host !== null, customerName: room.customerName,
      customerState: !room.customer ? "absent" : room.admitted ? "admitted" : "waiting" };
  }

  private broadcast(room: Room) {
    const message = { type: "room-state" as const, room: this.snapshot(room) };
    send(room.host, message);
    send(room.customer, message);
  }

  join(socket: WebSocket, message: Extract<ClientMessage, { type: "join-room" }>) {
    if (this.memberships.has(socket)) return sendError(socket, "ALREADY_JOINED", "Leave the current room first.");
    const room = this.rooms.get(message.roomId);
    if (!room || room.expiresAt <= Date.now()) return sendError(socket, "ROOM_UNAVAILABLE", "This invitation is invalid or has expired.");
    const expectedToken = message.role === "host" ? room.hostToken : room.inviteToken;
    if (!matchesToken(message.token, expectedToken)) return sendError(socket, "INVALID_TOKEN", "This invitation is invalid or has expired.");
    if (message.role === "host") {
      if (room.host) return sendError(socket, "HOST_PRESENT", "This room already has a connected host.");
      if (room.hostDisconnectTimer) clearTimeout(room.hostDisconnectTimer);
      room.hostDisconnectTimer = null;
      room.host = socket;
      room.hostName = message.name;
    } else {
      if (room.customer) return sendError(socket, "ROOM_FULL", "This room already has a customer.");
      room.customer = socket;
      room.customerName = message.name;
      room.admitted = false;
      room.hostReady = false;
      room.customerReady = false;
    }
    this.memberships.set(socket, { room, role: message.role });
    if (this.issueIceConfiguration) send(socket, this.issueIceConfiguration(room.id, message.role));
    this.broadcast(room);
  }

  handle(socket: WebSocket, message: Exclude<ClientMessage, { type: "create-room" | "join-room" }>) {
    const membership = this.memberships.get(socket);
    if (!membership) return sendError(socket, "NOT_JOINED", "Join a room before sending messages.");
    const { room, role } = membership;
    if (room.expiresAt <= Date.now()) return this.closeRoom(room, "expired");
    if (message.type === "leave") return this.leave(socket, true);
    if (message.type === "admit" || message.type === "decline") {
      if (role !== "host") return sendError(socket, "HOST_ONLY", "Only the host can admit or decline a customer.");
      if (!room.customer || room.admitted) return sendError(socket, "NO_WAITING_CUSTOMER", "There is no waiting customer.");
      if (message.type === "admit") {
        room.admitted = true;
        send(room.customer, { type: "admitted" });
      } else {
        const customer = room.customer;
        this.memberships.delete(customer);
        room.customer = null;
        room.customerName = null;
        send(customer, { type: "declined" });
        customer.close(1000, "Declined");
      }
      return this.broadcast(room);
    }
    if (!room.admitted) return sendError(socket, "NOT_ADMITTED", "The customer must be admitted before exchanging connection details.");
    if (message.type === "peer-ready") {
      if (role === "host") room.hostReady = true;
      else room.customerReady = true;
      if (room.hostReady && room.customerReady) {
        send(room.host, { type: "peers-ready" });
        send(room.customer, { type: "peers-ready" });
      }
      return;
    }
    if (!room.hostReady || !room.customerReady) return sendError(socket, "PEERS_NOT_READY", "Both participants must prepare their media connection first.");
    if (message.type === "ice-restart-request") {
      if (role !== "customer") return sendError(socket, "INVALID_ROLE", "Only the answering peer can request an ICE restart.");
      if (!room.host || room.host.readyState !== WebSocket.OPEN) return sendError(socket, "PEER_UNAVAILABLE", "The other participant is disconnected.");
      send(room.host, message);
      return;
    }
    // The host initiates the first negotiation, preventing simultaneous offers.
    if ((message.type === "offer" && role !== "host") || (message.type === "answer" && role !== "customer")) {
      return sendError(socket, "INVALID_ROLE", "This message is not allowed for your role.");
    }
    const peer = role === "host" ? room.customer : room.host;
    if (!peer || peer.readyState !== WebSocket.OPEN) return sendError(socket, "PEER_UNAVAILABLE", "The other participant is disconnected.");
    send(peer, message);
  }

  leave(socket: WebSocket, intentional = false) {
    const membership = this.memberships.get(socket);
    if (!membership) return;
    const { room, role } = membership;
    this.memberships.delete(socket);
    if (role === "host") {
      if (intentional) return this.closeRoom(room, "host-ended");
      room.host = null;
      room.admitted = false;
      room.hostReady = false;
      room.customerReady = false;
      send(room.customer, { type: "peer-left" });
      this.broadcast(room);
      room.hostDisconnectTimer = setTimeout(() => {
        if (!room.host && this.rooms.has(room.id)) this.closeRoom(room, "host-disconnected");
      }, this.hostReconnectGraceMs);
      return;
    }
    room.customer = null;
    room.customerName = null;
    room.admitted = false;
    room.hostReady = false;
    room.customerReady = false;
    send(room.host, { type: "peer-left" });
    this.broadcast(room);
  }

  private closeRoom(room: Room, reason: RoomClosureReason) {
    if (room.hostDisconnectTimer) clearTimeout(room.hostDisconnectTimer);
    if (!this.rooms.delete(room.id)) return;
    const clientReason = reason === "host-ended" || reason === "host-disconnected" ? "host-left" : reason;
    for (const socket of [room.host, room.customer]) {
      if (!socket) continue;
      this.memberships.delete(socket);
      send(socket, { type: "room-closed", reason: clientReason });
      socket.close(1000, "Room closed");
    }
    this.onRoomClosed?.({ roomId: room.id, agentId: room.agentId, reason, endedAt: new Date().toISOString() });
  }

  expire() {
    for (const room of this.rooms.values()) if (room.expiresAt <= Date.now()) this.closeRoom(room, "expired");
  }

  closeAll() {
    for (const room of this.rooms.values()) this.closeRoom(room, "server-shutdown");
  }
}
