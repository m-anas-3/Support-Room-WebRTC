import type { ClientMessage, SignalMessage } from "@support-room/shared";

export type PeerConnectionSnapshot = {
  connectionState: RTCPeerConnectionState | "idle";
  iceConnectionState: RTCIceConnectionState | "idle";
  iceGatheringState: RTCIceGatheringState | "idle";
  signalingState: RTCSignalingState | "idle";
  remoteStream: MediaStream | null;
  error: string | null;
};

const initialSnapshot: PeerConnectionSnapshot = {
  connectionState: "idle", iceConnectionState: "idle",
  iceGatheringState: "idle", signalingState: "idle",
  remoteStream: null, error: null,
};

type Options = {
  role: "host" | "customer";
  localStream: MediaStream;
  configuration: RTCConfiguration | (() => RTCConfiguration);
  send: (message: ClientMessage) => boolean;
  subscribeToSignals: (listener: (message: SignalMessage) => void) => () => void;
};
type SerializedCandidate = Extract<ClientMessage, { type: "ice-candidate" }>["candidate"];

// WebRTC is an external, event-driven system. This store gives React a stable
// snapshot while one connection owns its queues, listeners, and remote tracks.
export class PeerConnectionStore {
  private snapshot = initialSnapshot;
  private listeners = new Set<() => void>();
  private dispose: (() => void) | null = null;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };
  getSnapshot = () => this.snapshot;
  getServerSnapshot = () => initialSnapshot;

  private publish(snapshot: PeerConnectionSnapshot) {
    this.snapshot = snapshot;
    this.listeners.forEach((listener) => listener());
  }

  close = () => {
    this.dispose?.();
    this.dispose = null;
    this.publish({ ...initialSnapshot, connectionState: "closed" });
  };

  connect({ role, localStream, configuration, send, subscribeToSignals }: Options) {
    this.close();
    let pc: RTCPeerConnection;
    try {
      const resolvedConfiguration = typeof configuration === "function" ? configuration() : configuration;
      pc = new RTCPeerConnection(resolvedConfiguration);
    }
    catch {
      this.publish({ ...initialSnapshot, connectionState: "failed", error: "Could not create a WebRTC connection. Check browser support and STUN configuration." });
      return () => undefined;
    }

    let disposed = false;
    let offerStarted = false;
    let descriptionSent = false;
    let handling = Promise.resolve();
    let unsubscribe = () => {};
    const remoteStream = new MediaStream();
    const remoteCandidates: SerializedCandidate[] = [];
    const localCandidates: SerializedCandidate[] = [];
    const trackListeners = new Map<MediaStreamTrack, () => void>();

    const update = () => {
      if (disposed) return;
      this.publish({ connectionState: pc.connectionState,
        iceConnectionState: pc.iceConnectionState,
        iceGatheringState: pc.iceGatheringState,
        signalingState: pc.signalingState,
        remoteStream: remoteStream.getTracks().length ? remoteStream : null,
        error: null });
    };

    const dispose = () => {
      if (disposed) return;
      disposed = true;
      clearTimeout(timeout);
      unsubscribe();
      pc.onicecandidate = null;
      pc.ontrack = null;
      pc.onconnectionstatechange = null;
      pc.oniceconnectionstatechange = null;
      pc.onicegatheringstatechange = null;
      pc.onsignalingstatechange = null;
      for (const [track, listener] of trackListeners) {
        track.removeEventListener("ended", listener);
        track.stop();
      }
      pc.close();
      remoteCandidates.length = 0;
      localCandidates.length = 0;
      // Local tracks belong to useLocalMedia, which releases them on room leave.
    };
    const fail = (message: string) => {
      if (disposed) return;
      dispose();
      this.publish({ ...initialSnapshot, connectionState: "failed", error: message });
    };
    const timeout = setTimeout(() => fail("The media connection timed out. Leave and rejoin; some networks require a TURN relay."), 30000);
    this.dispose = dispose;

    const post = (message: ClientMessage) => {
      if (!disposed && !send(message)) throw new Error("Signaling is unavailable.");
    };
    const postDescription = (type: "offer" | "answer") => {
      if (disposed) return;
      const sdp = pc.localDescription?.sdp;
      if (!sdp) throw new Error("Missing local session description.");
      // Send SDP before candidates generated while setLocalDescription awaited.
      post({ type, sdp });
      descriptionSent = true;
      for (const candidate of localCandidates.splice(0)) post({ type: "ice-candidate", candidate });
    };
    const addRemoteCandidate = async (candidate: SerializedCandidate) => {
      if (!disposed) await pc.addIceCandidate(candidate ?? undefined);
    };
    const flushRemoteCandidates = async () => {
      for (const candidate of remoteCandidates.splice(0)) await addRemoteCandidate(candidate);
    };

    pc.onicecandidate = ({ candidate }) => {
      if (disposed) return;
      const candidateJson = candidate?.toJSON();
      const json: SerializedCandidate = candidateJson ? { ...candidateJson, candidate: candidateJson.candidate ?? "" } : null;
      if (!descriptionSent) { localCandidates.push(json); return; }
      try { post({ type: "ice-candidate", candidate: json }); }
      catch { fail("The signaling connection closed while exchanging network candidates."); }
    };
    pc.ontrack = ({ track }) => {
      if (disposed) return;
      // Tracks can arrive without an associated stream. Build our own stream.
      if (!remoteStream.getTrackById(track.id)) remoteStream.addTrack(track);
      const ended = () => { remoteStream.removeTrack(track); update(); };
      track.addEventListener("ended", ended);
      trackListeners.set(track, ended);
      update();
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") clearTimeout(timeout);
      if (pc.connectionState === "failed") return fail("The media connection failed. Leave and rejoin; a TURN relay may be needed on this network.");
      update();
    };
    pc.oniceconnectionstatechange = update;
    pc.onicegatheringstatechange = update;
    pc.onsignalingstatechange = update;

    const handle = async (message: SignalMessage) => {
      if (disposed) return;
      switch (message.type) {
        case "peers-ready": {
          if (role !== "host" || offerStarted) return;
          offerStarted = true;
          const offer = await pc.createOffer();
          if (disposed) return;
          await pc.setLocalDescription(offer);
          postDescription("offer");
          break;
        }
        case "offer": {
          if (role !== "customer" || pc.signalingState !== "stable") return;
          await pc.setRemoteDescription({ type: "offer", sdp: message.sdp });
          if (disposed) return;
          await flushRemoteCandidates();
          if (disposed) return;
          const answer = await pc.createAnswer();
          if (disposed) return;
          await pc.setLocalDescription(answer);
          postDescription("answer");
          break;
        }
        case "answer": {
          if (role !== "host" || pc.signalingState !== "have-local-offer") return;
          await pc.setRemoteDescription({ type: "answer", sdp: message.sdp });
          if (disposed) return;
          await flushRemoteCandidates();
          break;
        }
        case "ice-candidate":
          if (!pc.remoteDescription) {
            if (remoteCandidates.length >= 256) throw new Error("Too many pending candidates.");
            remoteCandidates.push(message.candidate);
          } else await addRemoteCandidate(message.candidate);
          break;
        case "peer-left": case "room-closed": case "declined": this.close(); break;
      }
    };

    try {
      localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));
      unsubscribe = subscribeToSignals((message) => {
        // Process async SDP and candidate operations in signaling arrival order.
        handling = handling.then(() => handle(message)).catch(() => {
          fail("Could not negotiate the call. Leave and rejoin the room.");
        });
      });
      update();
      // Announce readiness only after the connection and listener exist.
      post({ type: "peer-ready" });
    } catch { fail("Could not prepare the media connection. Leave and rejoin the room."); }

    return () => {
      dispose();
      if (this.dispose === dispose) {
        this.dispose = null;
        this.publish({ ...initialSnapshot, connectionState: "closed" });
      }
    };
  }
}
