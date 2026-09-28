import { serverMessageSchema, type CreatedRoom } from "@support-room/shared";
import { createClient } from "@/lib/supabase/client";

const E2E_ACCESS_TOKEN = "supportroom-e2e-room-creation-token";

export function signalingUrl() {
  return process.env.NEXT_PUBLIC_SIGNALING_URL ?? "ws://localhost:8080/signal";
}

export function readHostRoom(roomId: string): CreatedRoom | null {
  try {
    const stored = sessionStorage.getItem(`supportroom:host:${roomId}`);
    const parsed = serverMessageSchema.safeParse(stored ? JSON.parse(stored) : null);
    return parsed.success && parsed.data.type === "room-created" ? parsed.data : null;
  } catch { return null; }
}

export function invitationUrl(room: CreatedRoom) {
  // Fragments stay in the browser and do not enter Next.js request URLs/logs.
  return `${window.location.origin}/join/${room.roomId}#token=${room.inviteToken}`;
}

export async function createSupportRoom(reference: string): Promise<CreatedRoom> {
  const requestId = crypto.randomUUID();
  const accessToken = await roomCreationAccessToken();
  const room = await new Promise<CreatedRoom>((resolve, reject) => {
    const socket = new WebSocket(signalingUrl());
    let settled = false;
    const timeout = setTimeout(() => finish(new Error("The signaling server did not respond. Check that it is running.")), 10000);
    function finish(result: CreatedRoom | Error) {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      socket.close();
      if (result instanceof Error) reject(result);
      else resolve(result);
    }
    socket.onopen = () => socket.send(JSON.stringify({ type: "create-room", requestId, reference, accessToken }));
    socket.onmessage = (event) => {
      let data: unknown;
      try { data = JSON.parse(event.data); } catch { return finish(new Error("Invalid signaling response.")); }
      const parsed = serverMessageSchema.safeParse(data);
      if (!parsed.success) return finish(new Error("Invalid signaling response."));
      if (parsed.data.type === "error") finish(new Error(parsed.data.message));
      if (parsed.data.type === "room-created" && parsed.data.requestId === requestId) finish(parsed.data);
    };
    socket.onerror = () => finish(new Error("Cannot reach the signaling server. Start it and try again."));
    socket.onclose = () => finish(new Error("The signaling connection closed before the room was created."));
  });
  sessionStorage.setItem(`supportroom:host:${room.roomId}`, JSON.stringify(room));
  return room;
}

async function roomCreationAccessToken() {
  if (process.env.NEXT_PUBLIC_SUPPORTROOM_E2E === "1") return E2E_ACCESS_TOKEN;
  const supabase = createClient();
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) {
    throw new Error("Your agent session has expired. Sign in again before creating a room.");
  }
  return data.session.access_token;
}
