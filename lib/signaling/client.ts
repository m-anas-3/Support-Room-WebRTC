import { serverMessageSchema, type CreatedRoom } from "@support-room/shared";
import { createClient } from "@/lib/supabase/client";

const E2E_ACCESS_TOKEN = "supportroom-e2e-room-creation-token";
export const hostRoomsChangedEvent = "supportroom:host-rooms-changed";

export type SavedHostRoom = {
  roomId: string;
  reference: string;
  createdAt: number;
  expiresAt: number;
};

export function savedHostRooms(agentId: string): SavedHostRoom[] {
  const rooms: SavedHostRoom[] = [];
  try {
    for (let index = 0; index < sessionStorage.length; index += 1) {
      const key = sessionStorage.key(index);
      if (!key?.startsWith("supportroom:host:")) continue;
      let stored;
      try {
        stored = JSON.parse(sessionStorage.getItem(key) ?? "null");
      } catch {
        continue;
      }
      if (!stored || stored.agentId !== agentId) continue;
      const parsed = serverMessageSchema.safeParse(stored);
      if (
        !parsed.success ||
        parsed.data.type !== "room-created" ||
        parsed.data.expiresAt <= Date.now()
      )
        continue;
      rooms.push({
        roomId: parsed.data.roomId,
        reference: typeof stored.reference === "string" ? stored.reference : "",
        createdAt: typeof stored.createdAt === "number" ? stored.createdAt : 0,
        expiresAt: parsed.data.expiresAt,
      });
    }
  } catch {
    /* Storage can be unavailable in a restricted browser. */
  }
  return rooms.sort((a, b) => b.createdAt - a.createdAt);
}

export function forgetHostRoom(roomId: string) {
  try {
    sessionStorage.removeItem(`supportroom:host:${roomId}`);
  } catch {
    /* Best effort. */
  }
  window.dispatchEvent(new Event(hostRoomsChangedEvent));
}

export function signalingUrl() {
  return process.env.NEXT_PUBLIC_SIGNALING_URL ?? "ws://localhost:8080/signal";
}

export function readHostRoom(roomId: string): CreatedRoom | null {
  try {
    const stored = sessionStorage.getItem(`supportroom:host:${roomId}`);
    const parsed = serverMessageSchema.safeParse(
      stored ? JSON.parse(stored) : null,
    );
    return parsed.success && parsed.data.type === "room-created"
      ? parsed.data
      : null;
  } catch {
    return null;
  }
}

export function sessionDestination(
  session: { id: string; status: string },
  hydrated: boolean,
) {
  const room =
    hydrated && session.status !== "completed"
      ? readHostRoom(session.id)
      : null;
  return room && room.expiresAt > Date.now()
    ? `/room/${session.id}`
    : `/sessions/${session.id}`;
}

export function invitationUrl(room: CreatedRoom) {
  // Fragments stay in the browser and do not enter Next.js request URLs/logs.
  return `${window.location.origin}/join/${room.roomId}#token=${room.inviteToken}`;
}

export async function createSupportRoom(
  reference: string,
  agentId: string,
): Promise<CreatedRoom> {
  const requestId = crypto.randomUUID();
  const accessToken = await roomCreationAccessToken();
  const room = await new Promise<CreatedRoom>((resolve, reject) => {
    const socket = new WebSocket(signalingUrl());
    let settled = false;
    const timeout = setTimeout(
      () =>
        finish(
          new Error(
            "The signaling server did not respond. Check that it is running.",
          ),
        ),
      10000,
    );
    function finish(result: CreatedRoom | Error) {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      socket.close();
      if (result instanceof Error) reject(result);
      else resolve(result);
    }
    socket.onopen = () =>
      socket.send(
        JSON.stringify({
          type: "create-room",
          requestId,
          reference,
          accessToken,
        }),
      );
    socket.onmessage = (event) => {
      let data: unknown;
      try {
        data = JSON.parse(event.data);
      } catch {
        return finish(new Error("Invalid signaling response."));
      }
      const parsed = serverMessageSchema.safeParse(data);
      if (!parsed.success)
        return finish(new Error("Invalid signaling response."));
      if (parsed.data.type === "error") finish(new Error(parsed.data.message));
      if (
        parsed.data.type === "room-created" &&
        parsed.data.requestId === requestId
      )
        finish(parsed.data);
    };
    socket.onerror = () =>
      finish(
        new Error("Cannot reach the signaling server. Start it and try again."),
      );
    socket.onclose = () =>
      finish(
        new Error(
          "The signaling connection closed before the room was created.",
        ),
      );
  });
  sessionStorage.setItem(
    `supportroom:host:${room.roomId}`,
    JSON.stringify({
      ...room,
      agentId,
      reference: reference.trim(),
      createdAt: Date.now(),
    }),
  );
  window.dispatchEvent(new Event(hostRoomsChangedEvent));
  return room;
}

async function roomCreationAccessToken() {
  if (process.env.NEXT_PUBLIC_SUPPORTROOM_E2E === "1") return E2E_ACCESS_TOKEN;
  const supabase = createClient();
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) {
    throw new Error(
      "Your agent session has expired. Sign in again before creating a room.",
    );
  }
  return data.session.access_token;
}
