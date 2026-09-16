import type { ClientMessage, SignalMessage } from "@support-room/shared";
import { collectPeerDiagnostics, emptyPeerDiagnostics, type DiagnosticsHistory, type PeerDiagnostics } from "@/lib/webrtc/diagnostics";

export type PeerConnectionSnapshot = {
  connectionState: RTCPeerConnectionState | "idle";
  iceConnectionState: RTCIceConnectionState | "idle";
  iceGatheringState: RTCIceGatheringState | "idle";
  signalingState: RTCSignalingState | "idle";
  remoteStream: MediaStream | null;
  remoteScreenSharing: boolean;
  remoteCameraEnabled: boolean;
  remoteMicrophoneEnabled: boolean;
  diagnostics: PeerDiagnostics;
  error: string | null;
};

const initialSnapshot: PeerConnectionSnapshot = {
  connectionState: "idle", iceConnectionState: "idle",
  iceGatheringState: "idle", signalingState: "idle",
  remoteStream: null, remoteScreenSharing: false, remoteCameraEnabled: true,
  remoteMicrophoneEnabled: true, diagnostics: emptyPeerDiagnostics, error: null,
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
  private replaceVideoTrack: ((track: MediaStreamTrack | null) => Promise<void>) | null = null;
  private replaceAudioTrack: ((track: MediaStreamTrack | null) => Promise<void>) | null = null;
  private videoReplacementQueue: Promise<void> = Promise.resolve();
  private audioReplacementQueue: Promise<void> = Promise.resolve();

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

  replaceOutgoingVideoTrack = (track: MediaStreamTrack | null) => {
    if (track && track.kind !== "video") throw new Error("Only a video track can replace the outgoing camera.");
    const replace = this.replaceVideoTrack;
    if (!replace) return Promise.reject(new Error("The media connection is not ready for video changes."));
    const operation = this.videoReplacementQueue.catch(() => undefined).then(() => replace(track));
    this.videoReplacementQueue = operation;
    return operation;
  };

  replaceOutgoingAudioTrack = (track: MediaStreamTrack | null) => {
    if (track && track.kind !== "audio") throw new Error("Only an audio track can replace the outgoing microphone.");
    const replace = this.replaceAudioTrack;
    if (!replace) return Promise.reject(new Error("The media connection is not ready for microphone changes."));
    const operation = this.audioReplacementQueue.catch(() => undefined).then(() => replace(track));
    this.audioReplacementQueue = operation;
    return operation;
  };

  connect({ role, localStream, configuration, send, subscribeToSignals }: Options) {
    this.close();
    this.videoReplacementQueue = Promise.resolve();
    this.audioReplacementQueue = Promise.resolve();
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
    let remoteScreenSharing = false;
    let remoteCameraEnabled = true;
    let remoteMicrophoneEnabled = true;
    let videoSender: RTCRtpSender | null = null;
    let audioSender: RTCRtpSender | null = null;
    let diagnostics = emptyPeerDiagnostics;
    let diagnosticsHistory: DiagnosticsHistory = new Map();
    let diagnosticsPending = false;
    let diagnosticsTimer: ReturnType<typeof setInterval> | null = null;
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
        remoteScreenSharing,
        remoteCameraEnabled,
        remoteMicrophoneEnabled,
        diagnostics,
        error: null });
    };

    const pollDiagnostics = async () => {
      if (disposed || diagnosticsPending || pc.connectionState !== "connected") return;
      diagnosticsPending = true;
      try {
        const result = collectPeerDiagnostics(await pc.getStats(), diagnosticsHistory);
        if (disposed) return;
        diagnostics = result.diagnostics;
        diagnosticsHistory = result.history;
        update();
      } catch {
        if (disposed) return;
        diagnostics = { ...diagnostics, error: "Live connection statistics are unavailable in this browser." };
        update();
      } finally {
        diagnosticsPending = false;
      }
    };

    const dispose = () => {
      if (disposed) return;
      disposed = true;
      if (this.replaceVideoTrack === replaceVideoTrack) this.replaceVideoTrack = null;
      if (this.replaceAudioTrack === replaceAudioTrack) this.replaceAudioTrack = null;
      clearTimeout(timeout);
      if (diagnosticsTimer) clearInterval(diagnosticsTimer);
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

    const replaceVideoTrack = async (track: MediaStreamTrack | null) => {
      if (disposed || !videoSender) throw new Error("The video sender is unavailable.");
      try {
        await videoSender.replaceTrack(track);
      } catch (firstError) {
        if (disposed) throw firstError;
        // Some browsers briefly reject a replacement while a camera is
        // stopping or restarting. Retry once after that transition settles.
        await new Promise((resolve) => setTimeout(resolve, 150));
        if (disposed) throw firstError;
        await videoSender.replaceTrack(track);
      }
    };
    const replaceAudioTrack = async (track: MediaStreamTrack | null) => {
      if (disposed || !audioSender) throw new Error("The audio sender is unavailable.");
      try {
        await audioSender.replaceTrack(track);
      } catch (firstError) {
        if (disposed) throw firstError;
        await new Promise((resolve) => setTimeout(resolve, 150));
        if (disposed) throw firstError;
        await audioSender.replaceTrack(track);
      }
    };
    this.replaceVideoTrack = replaceVideoTrack;
    this.replaceAudioTrack = replaceAudioTrack;

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
      if (pc.connectionState === "connected") {
        clearTimeout(timeout);
        void pollDiagnostics();
      }
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
        case "screen-share-state":
          remoteScreenSharing = message.active;
          update();
          break;
        case "media-state":
          remoteCameraEnabled = message.camera;
          remoteMicrophoneEnabled = message.microphone;
          update();
          break;
        case "peer-left": case "room-closed": case "declined": this.close(); break;
      }
    };

    try {
      const localVideoTrack = localStream.getVideoTracks()[0];
      const localAudioTrack = localStream.getAudioTracks()[0];
      videoSender = localVideoTrack ? pc.addTrack(localVideoTrack, localStream) : pc.addTransceiver("video", { direction: "sendrecv" }).sender;
      audioSender = localAudioTrack ? pc.addTrack(localAudioTrack, localStream) : pc.addTransceiver("audio", { direction: "sendrecv" }).sender;
      unsubscribe = subscribeToSignals((message) => {
        // Process async SDP and candidate operations in signaling arrival order.
        handling = handling.then(() => handle(message)).catch(() => {
          fail("Could not negotiate the call. Leave and rejoin the room.");
        });
      });
      diagnosticsTimer = setInterval(() => { void pollDiagnostics(); }, 2000);
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
