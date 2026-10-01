import type { ClientMessage, SignalMessage } from "@support-room/shared";
import { collectPeerDiagnostics, emptyPeerDiagnostics, type DiagnosticsHistory, type PeerDiagnostics } from "@/lib/webrtc/diagnostics";

export type PeerConnectionSnapshot = {
  connectionState: RTCPeerConnectionState | "idle";
  iceConnectionState: RTCIceConnectionState | "idle";
  iceGatheringState: RTCIceGatheringState | "idle";
  signalingState: RTCSignalingState | "idle";
  recoveryState: "idle" | "reconnecting" | "recovered";
  recoveryAttempts: number;
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
  recoveryState: "idle", recoveryAttempts: 0,
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
      this.publish({ ...initialSnapshot, connectionState: "failed", error: "Could not create a WebRTC connection. Check browser support and ICE server configuration." });
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
    let disconnectedTimer: ReturnType<typeof setTimeout> | null = null;
    let recoveryTimer: ReturnType<typeof setTimeout> | null = null;
    let recoveryState: PeerConnectionSnapshot["recoveryState"] = "idle";
    let recoveryAttempts = 0;
    let recoveryRequestPending = false;
    let restartScheduled = false;
    let negotiationCount = 0;
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
        recoveryState,
        recoveryAttempts,
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
      clearTimeout(initialConnectionTimer);
      if (disconnectedTimer) clearTimeout(disconnectedTimer);
      if (recoveryTimer) clearTimeout(recoveryTimer);
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
    const initialConnectionTimer = setTimeout(() => fail("The media connection timed out. Check the TURN configuration and try again."), 30000);
    this.dispose = dispose;

    const replaceVideoTrack = async (track: MediaStreamTrack | null) => {
      if (disposed || !videoSender) throw new Error("The video sender is unavailable.");
      if (videoSender.track === track) return;
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
      if (audioSender.track === track) return;
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

    const prepareLocalDescription = () => {
      descriptionSent = false;
      localCandidates.length = 0;
    };

    const markConnectionUsable = () => {
      clearTimeout(initialConnectionTimer);
      if (disconnectedTimer) clearTimeout(disconnectedTimer);
      if (recoveryTimer) clearTimeout(recoveryTimer);
      disconnectedTimer = null;
      recoveryTimer = null;
      recoveryRequestPending = false;
      recoveryState = recoveryAttempts > 0 ? "recovered" : "idle";
    };

    const armRecoveryTimer = () => {
      if (recoveryTimer) clearTimeout(recoveryTimer);
      recoveryTimer = setTimeout(() => {
        recoveryTimer = null;
        if (disposed) return;
        if (pc.connectionState === "connected" || ["connected", "completed"].includes(pc.iceConnectionState)) {
          markConnectionUsable();
          update();
          return;
        }
        recoveryRequestPending = false;
        beginRecovery();
      }, 10000);
    };

    const createAndSendOffer = async (iceRestart: boolean) => {
      if (disposed || role !== "host") return;
      if (pc.signalingState !== "stable") throw new Error("The connection is already negotiating.");
      prepareLocalDescription();
      if (iceRestart) pc.restartIce();
      const offer = await pc.createOffer(iceRestart ? { iceRestart: true } : undefined);
      if (disposed) return;
      await pc.setLocalDescription(offer);
      postDescription("offer");
      negotiationCount += 1;
    };

    const runHostRecovery = async (force: boolean) => {
      restartScheduled = false;
      if (disposed || (!force && pc.connectionState === "connected")) return;
      if (recoveryAttempts >= 2) return fail("The media connection could not be restored. Check the network or TURN service, then rejoin the room.");
      recoveryAttempts += 1;
      recoveryState = "reconnecting";
      update();
      await createAndSendOffer(true);
      armRecoveryTimer();
    };

    const queueHostRecovery = (force = false) => {
      if (disposed || restartScheduled || recoveryTimer || (!force && pc.connectionState === "connected")) return;
      restartScheduled = true;
      handling = handling.then(() => runHostRecovery(force)).catch(() => {
        restartScheduled = false;
        fail("Could not restart the media connection. Check the network or TURN service, then rejoin the room.");
      });
    };

    function beginRecovery() {
      if (disposed || pc.connectionState === "connected") return;
      if (recoveryAttempts >= 2) return fail("The media connection could not be restored. Check the network or TURN service, then rejoin the room.");
      recoveryState = "reconnecting";
      update();
      if (role === "host") {
        queueHostRecovery(true);
        return;
      }
      if (recoveryRequestPending) return;
      recoveryRequestPending = true;
      recoveryAttempts += 1;
      try {
        post({ type: "ice-restart-request" });
        armRecoveryTimer();
      } catch {
        fail("Could not request connection recovery because signaling is unavailable.");
      }
    }

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
        markConnectionUsable();
        void pollDiagnostics();
      }
      if (pc.connectionState === "failed") beginRecovery();
      update();
    };
    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
        markConnectionUsable();
        void pollDiagnostics();
      }
      if (pc.iceConnectionState === "disconnected" && !disconnectedTimer) {
        disconnectedTimer = setTimeout(() => {
          disconnectedTimer = null;
          if (pc.iceConnectionState === "disconnected" || pc.iceConnectionState === "failed") beginRecovery();
        }, 4000);
      } else if (pc.iceConnectionState !== "disconnected" && disconnectedTimer) {
        clearTimeout(disconnectedTimer);
        disconnectedTimer = null;
      }
      if (pc.iceConnectionState === "failed") beginRecovery();
      update();
    };
    pc.onicegatheringstatechange = update;
    pc.onsignalingstatechange = update;

    const handle = async (message: SignalMessage) => {
      if (disposed) return;
      switch (message.type) {
        case "peers-ready": {
          if (role !== "host" || offerStarted) return;
          offerStarted = true;
          await createAndSendOffer(false);
          break;
        }
        case "offer": {
          if (role !== "customer" || pc.signalingState !== "stable") return;
          const isRecoveryOffer = negotiationCount > 0 || recoveryState === "reconnecting";
          if (isRecoveryOffer) {
            recoveryState = "reconnecting";
            recoveryAttempts = Math.max(1, recoveryAttempts);
            recoveryRequestPending = false;
            update();
          }
          await pc.setRemoteDescription({ type: "offer", sdp: message.sdp });
          if (disposed) return;
          if (negotiationCount === 0) {
            // The answerer must use the transceivers associated with the offer.
            // Pre-created addTransceiver() senders are not reusable by a remote
            // offer and would silently remain unnegotiated when starting muted.
            for (const kind of ["video", "audio"] as const) {
              const transceiver = pc.getTransceivers().find((item) => item.mid !== null && item.receiver.track.kind === kind);
              if (!transceiver) throw new Error(`The offer is missing ${kind}.`);
              transceiver.direction = "sendrecv";
              transceiver.sender.setStreams(localStream);
              const track = localStream.getTracks().find((item) => item.kind === kind && item.readyState === "live") ?? null;
              await transceiver.sender.replaceTrack(track);
              if (disposed) return;
              if (kind === "video") videoSender = transceiver.sender;
              else audioSender = transceiver.sender;
            }
          }
          await flushRemoteCandidates();
          if (disposed) return;
          prepareLocalDescription();
          const answer = await pc.createAnswer();
          if (disposed) return;
          await pc.setLocalDescription(answer);
          postDescription("answer");
          negotiationCount += 1;
          if (isRecoveryOffer) armRecoveryTimer();
          break;
        }
        case "answer": {
          if (role !== "host" || pc.signalingState !== "have-local-offer") return;
          await pc.setRemoteDescription({ type: "answer", sdp: message.sdp });
          if (disposed) return;
          await flushRemoteCandidates();
          break;
        }
        case "ice-restart-request":
          if (role === "host") queueHostRecovery(true);
          break;
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
      if (role === "host") {
        // Always negotiate both media kinds, including when the camera is off.
        const localVideoTrack = localStream.getVideoTracks().find((track) => track.readyState === "live");
        const localAudioTrack = localStream.getAudioTracks().find((track) => track.readyState === "live");
        videoSender = pc.addTransceiver(localVideoTrack ?? "video", { direction: "sendrecv", streams: [localStream] }).sender;
        audioSender = pc.addTransceiver(localAudioTrack ?? "audio", { direction: "sendrecv", streams: [localStream] }).sender;
      }
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
