"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type MediaStatus = "idle" | "requesting" | "ready" | "error";
type DeviceStatus = "idle" | "requesting" | "ready" | "off" | "recovering" | "unavailable";

type MediaDevices = {
  cameras: MediaDeviceInfo[];
  microphones: MediaDeviceInfo[];
  speakers: MediaDeviceInfo[];
};

const emptyDevices: MediaDevices = { cameras: [], microphones: [], speakers: [] };

function stopTracks(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

function getMediaErrorMessage(error: unknown, device = "camera and microphone") {
  if (!(error instanceof DOMException)) return `We could not start your ${device}.`;
  switch (error.name) {
    case "NotAllowedError": return `${capitalize(device)} access was blocked. Allow access in your browser settings and try again.`;
    case "NotFoundError": return `No ${device} was found. Connect a device and try again.`;
    case "NotReadableError": return `Another application may be using your ${device}.`;
    case "OverconstrainedError": return `The selected ${device} cannot satisfy the requested settings.`;
    case "SecurityError": return "Media access requires a secure HTTPS connection or localhost.";
    default: return error.message || `We could not start your ${device}.`;
  }
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function videoConstraints(deviceId?: string): MediaTrackConstraints {
  return {
    deviceId: deviceId ? { exact: deviceId } : undefined,
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: 30, max: 60 },
  };
}

function audioConstraints(deviceId?: string): MediaTrackConstraints {
  return {
    deviceId: deviceId ? { exact: deviceId } : undefined,
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  };
}

function shouldTryDefaultDevice(error: unknown) {
  return error instanceof DOMException && ["NotFoundError", "OverconstrainedError"].includes(error.name);
}

async function requestCamera(deviceId?: string) {
  try {
    return await navigator.mediaDevices.getUserMedia({ video: videoConstraints(deviceId), audio: false });
  } catch (error) {
    if (!deviceId || !shouldTryDefaultDevice(error)) throw error;
    return navigator.mediaDevices.getUserMedia({ video: videoConstraints(), audio: false });
  }
}

async function requestMicrophone(deviceId?: string) {
  try {
    return await navigator.mediaDevices.getUserMedia({ video: false, audio: audioConstraints(deviceId) });
  } catch (error) {
    if (!deviceId || !shouldTryDefaultDevice(error)) throw error;
    return navigator.mediaDevices.getUserMedia({ video: false, audio: audioConstraints() });
  }
}

export function useLocalMedia() {
  const streamRef = useRef<MediaStream | null>(null);
  const videoTrackRef = useRef<MediaStreamTrack | null>(null);
  const audioTrackRef = useRef<MediaStreamTrack | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const requestIdRef = useRef(0);
  const videoRequestIdRef = useRef(0);
  const audioRequestIdRef = useRef(0);
  const selectedCameraIdRef = useRef("");
  const selectedMicrophoneIdRef = useRef("");
  const cameraWantedRef = useRef(true);
  const microphoneWantedRef = useRef(true);
  const mountedRef = useRef(true);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [videoTrack, setVideoTrack] = useState<MediaStreamTrack | null>(null);
  const [audioTrack, setAudioTrack] = useState<MediaStreamTrack | null>(null);
  const [status, setStatus] = useState<MediaStatus>("idle");
  const [cameraStatus, setCameraStatus] = useState<DeviceStatus>("idle");
  const [microphoneStatus, setMicrophoneStatus] = useState<DeviceStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDevices>(emptyDevices);
  const [selectedCameraId, setSelectedCameraId] = useState("");
  const [selectedMicrophoneId, setSelectedMicrophoneId] = useState("");
  const [isCameraEnabled, setIsCameraEnabled] = useState(true);
  const [isMicrophoneEnabled, setIsMicrophoneEnabled] = useState(true);
  const [audioLevel, setAudioLevel] = useState(0);

  const refreshDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return [];
    try {
      const available = await navigator.mediaDevices.enumerateDevices();
      if (mountedRef.current) {
        setDevices({
          cameras: available.filter((device) => device.kind === "videoinput"),
          microphones: available.filter((device) => device.kind === "audioinput"),
          speakers: available.filter((device) => device.kind === "audiooutput"),
        });
      }
      return available;
    } catch {
      return [];
    }
  }, []);

  const commitVideoTrack = useCallback((nextTrack: MediaStreamTrack) => {
    let activeStream = streamRef.current;
    if (!activeStream) {
      activeStream = new MediaStream();
      streamRef.current = activeStream;
      setStream(activeStream);
    }
    const previous = videoTrackRef.current;
    if (previous && previous !== nextTrack) activeStream.removeTrack(previous);
    if (!activeStream.getTrackById(nextTrack.id)) activeStream.addTrack(nextTrack);
    videoTrackRef.current = nextTrack;
    setVideoTrack(nextTrack);
    if (previous && previous !== nextTrack) previous.stop();
  }, []);

  const commitAudioTrack = useCallback((nextTrack: MediaStreamTrack) => {
    let activeStream = streamRef.current;
    if (!activeStream) {
      activeStream = new MediaStream();
      streamRef.current = activeStream;
      setStream(activeStream);
    }
    const previous = audioTrackRef.current;
    if (previous && previous !== nextTrack) activeStream.removeTrack(previous);
    if (!activeStream.getTrackById(nextTrack.id)) activeStream.addTrack(nextTrack);
    audioTrackRef.current = nextTrack;
    setAudioTrack(nextTrack);
    if (previous && previous !== nextTrack) previous.stop();
  }, []);

  const startCamera = useCallback(async (deviceId = selectedCameraIdRef.current, recovering = false) => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("This browser does not support camera access.");
      setCameraStatus("unavailable");
      return;
    }
    const requestId = ++videoRequestIdRef.current;
    cameraWantedRef.current = true;
    setCameraStatus(recovering ? "recovering" : "requesting");
    if (!recovering) setError(null);
    let requestedStream: MediaStream | null = null;
    try {
      requestedStream = await requestCamera(deviceId);
      const nextTrack = requestedStream.getVideoTracks()[0];
      if (!nextTrack) throw new Error("The selected camera did not provide a video track.");
      if (!mountedRef.current || requestId !== videoRequestIdRef.current || !cameraWantedRef.current) {
        stopTracks(requestedStream);
        return;
      }
      commitVideoTrack(nextTrack);
      cameraWantedRef.current = true;
      setIsCameraEnabled(true);
      setCameraStatus("ready");
      setStatus("ready");
      setError(null);
      const resolvedId = nextTrack.getSettings().deviceId;
      if (resolvedId) {
        selectedCameraIdRef.current = resolvedId;
        setSelectedCameraId(resolvedId);
      }
      await refreshDevices();
    } catch (cameraError) {
      stopTracks(requestedStream);
      if (!mountedRef.current || requestId !== videoRequestIdRef.current) return;
      setIsCameraEnabled(false);
      setCameraStatus("unavailable");
      setError(recovering ? "Your camera disconnected. Audio is still connected. Connect a camera or turn it on again." : getMediaErrorMessage(cameraError, "camera"));
    }
  }, [commitVideoTrack, refreshDevices]);

  const startMicrophone = useCallback(async (deviceId = selectedMicrophoneIdRef.current, recovering = false, enabled = true) => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("This browser does not support microphone access.");
      setMicrophoneStatus("unavailable");
      return;
    }
    const requestId = ++audioRequestIdRef.current;
    microphoneWantedRef.current = enabled;
    setMicrophoneStatus(recovering ? "recovering" : "requesting");
    if (!recovering) setError(null);
    let requestedStream: MediaStream | null = null;
    try {
      requestedStream = await requestMicrophone(deviceId);
      const nextTrack = requestedStream.getAudioTracks()[0];
      if (!nextTrack) throw new Error("The selected microphone did not provide an audio track.");
      if (!mountedRef.current || requestId !== audioRequestIdRef.current) {
        stopTracks(requestedStream);
        return;
      }
      nextTrack.enabled = enabled;
      commitAudioTrack(nextTrack);
      microphoneWantedRef.current = enabled;
      setIsMicrophoneEnabled(enabled);
      setMicrophoneStatus(enabled ? "ready" : "off");
      setStatus("ready");
      setError(null);
      const resolvedId = nextTrack.getSettings().deviceId;
      if (resolvedId) {
        selectedMicrophoneIdRef.current = resolvedId;
        setSelectedMicrophoneId(resolvedId);
      }
      await refreshDevices();
    } catch (microphoneError) {
      stopTracks(requestedStream);
      if (!mountedRef.current || requestId !== audioRequestIdRef.current) return;
      setIsMicrophoneEnabled(false);
      setMicrophoneStatus("unavailable");
      setAudioLevel(0);
      setError(recovering ? "Your microphone disconnected. Video is still connected. Connect a microphone or turn it on again." : getMediaErrorMessage(microphoneError, "microphone"));
    }
  }, [commitAudioTrack, refreshDevices]);

  const startMedia = useCallback(async (overrides?: { cameraId?: string; microphoneId?: string }) => {
    const requestId = ++requestIdRef.current;
    videoRequestIdRef.current += 1;
    audioRequestIdRef.current += 1;
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("error");
      setError("This browser does not support camera and microphone access.");
      return;
    }

    setStatus("requesting");
    setCameraStatus(cameraWantedRef.current ? "requesting" : "off");
    setMicrophoneStatus("requesting");
    setError(null);
    stopTracks(streamRef.current);
    streamRef.current = null;
    videoTrackRef.current = null;
    audioTrackRef.current = null;
    setStream(null);
    setVideoTrack(null);
    setAudioTrack(null);

    const cameraId = overrides?.cameraId ?? selectedCameraIdRef.current;
    const microphoneId = overrides?.microphoneId ?? selectedMicrophoneIdRef.current;
    const constraints: MediaStreamConstraints = {
      video: cameraWantedRef.current ? videoConstraints(cameraId) : false,
      audio: audioConstraints(microphoneId),
    };

    try {
      const nextStream = await navigator.mediaDevices.getUserMedia(constraints);
      if (!mountedRef.current || requestId !== requestIdRef.current) {
        stopTracks(nextStream);
        return;
      }
      const nextVideoTrack = nextStream.getVideoTracks()[0] ?? null;
      const nextAudioTrack = nextStream.getAudioTracks()[0] ?? null;
      if (nextAudioTrack) nextAudioTrack.enabled = microphoneWantedRef.current;
      streamRef.current = nextStream;
      videoTrackRef.current = nextVideoTrack;
      audioTrackRef.current = nextAudioTrack;
      setStream(nextStream);
      setVideoTrack(nextVideoTrack);
      setAudioTrack(nextAudioTrack);
      setIsCameraEnabled(Boolean(nextVideoTrack));
      setIsMicrophoneEnabled(Boolean(nextAudioTrack?.enabled));
      setCameraStatus(nextVideoTrack ? "ready" : "off");
      setMicrophoneStatus(nextAudioTrack?.enabled ? "ready" : "off");
      setStatus("ready");

      const videoDeviceId = nextVideoTrack?.getSettings().deviceId;
      const audioDeviceId = nextAudioTrack?.getSettings().deviceId;
      if (videoDeviceId) {
        selectedCameraIdRef.current = videoDeviceId;
        setSelectedCameraId(videoDeviceId);
      }
      if (audioDeviceId) {
        selectedMicrophoneIdRef.current = audioDeviceId;
        setSelectedMicrophoneId(audioDeviceId);
      }
      await refreshDevices();
    } catch (mediaError) {
      if (!mountedRef.current || requestId !== requestIdRef.current) return;
      setStatus("error");
      setCameraStatus("unavailable");
      setMicrophoneStatus("unavailable");
      setError(getMediaErrorMessage(mediaError));
    }
  }, [refreshDevices]);

  const stopMedia = useCallback(() => {
    requestIdRef.current += 1;
    videoRequestIdRef.current += 1;
    audioRequestIdRef.current += 1;
    stopTracks(streamRef.current);
    streamRef.current = null;
    videoTrackRef.current = null;
    audioTrackRef.current = null;
    setStream(null);
    setVideoTrack(null);
    setAudioTrack(null);
    setStatus("idle");
    setCameraStatus("idle");
    setMicrophoneStatus("idle");
    setError(null);
    setAudioLevel(0);
  }, []);

  const toggleCamera = useCallback(() => {
    const current = videoTrackRef.current;
    if (!current) {
      cameraWantedRef.current = true;
      void startCamera();
      return;
    }
    cameraWantedRef.current = false;
    videoRequestIdRef.current += 1;
    streamRef.current?.removeTrack(current);
    videoTrackRef.current = null;
    setVideoTrack(null);
    setIsCameraEnabled(false);
    setCameraStatus("off");
    setError(null);
    current.stop();
  }, [startCamera]);

  const toggleMicrophone = useCallback(() => {
    const current = audioTrackRef.current;
    if (!current) {
      microphoneWantedRef.current = true;
      void startMicrophone();
      return;
    }
    const enabled = !current.enabled;
    current.enabled = enabled;
    microphoneWantedRef.current = enabled;
    setIsMicrophoneEnabled(enabled);
    setMicrophoneStatus(enabled ? "ready" : "off");
    if (!enabled) setAudioLevel(0);
    setError(null);
  }, [startMicrophone]);

  const selectCamera = useCallback(async (deviceId: string) => {
    selectedCameraIdRef.current = deviceId;
    setSelectedCameraId(deviceId);
    if (videoTrackRef.current) await startCamera(deviceId);
  }, [startCamera]);

  const selectMicrophone = useCallback(async (deviceId: string) => {
    selectedMicrophoneIdRef.current = deviceId;
    setSelectedMicrophoneId(deviceId);
    if (audioTrackRef.current) await startMicrophone(deviceId, false, microphoneWantedRef.current);
  }, [startMicrophone]);

  useEffect(() => {
    if (!audioTrack || !isMicrophoneEnabled) return;
    const context = new AudioContext();
    const analyser = context.createAnalyser();
    analyser.fftSize = 256;
    const source = context.createMediaStreamSource(new MediaStream([audioTrack]));
    const samples = new Uint8Array(analyser.fftSize);
    analyser.smoothingTimeConstant = 0.82;
    source.connect(analyser);
    void context.resume();
    audioContextRef.current = context;

    let lastMeasurement = 0;
    const measure = (timestamp = 0) => {
      if (timestamp - lastMeasurement >= 100) {
        lastMeasurement = timestamp;
        analyser.getByteTimeDomainData(samples);
        let sum = 0;
        for (const sample of samples) {
          const normalized = (sample - 128) / 128;
          sum += normalized * normalized;
        }
        setAudioLevel(Math.min(100, Math.round(Math.sqrt(sum / samples.length) * 280)));
      }
      animationFrameRef.current = requestAnimationFrame(measure);
    };
    measure();

    return () => {
      if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current);
      source.disconnect();
      void context.close();
      audioContextRef.current = null;
    };
  }, [audioTrack, isMicrophoneEnabled]);

  useEffect(() => {
    if (!videoTrack) return;
    const handleEnded = () => {
      if (videoTrackRef.current !== videoTrack) return;
      streamRef.current?.removeTrack(videoTrack);
      videoTrackRef.current = null;
      setVideoTrack(null);
      setIsCameraEnabled(false);
      if (!cameraWantedRef.current) {
        setCameraStatus("off");
        return;
      }
      setCameraStatus("recovering");
      setError("Your camera disconnected. Audio remains connected while SupportRoom looks for another camera.");
      void startCamera(selectedCameraIdRef.current, true);
    };
    videoTrack.addEventListener("ended", handleEnded, { once: true });
    return () => videoTrack.removeEventListener("ended", handleEnded);
  }, [startCamera, videoTrack]);

  useEffect(() => {
    if (!audioTrack) return;
    const handleEnded = () => {
      if (audioTrackRef.current !== audioTrack) return;
      streamRef.current?.removeTrack(audioTrack);
      audioTrackRef.current = null;
      setAudioTrack(null);
      setIsMicrophoneEnabled(false);
      setAudioLevel(0);
      if (!microphoneWantedRef.current) {
        setMicrophoneStatus("off");
        return;
      }
      setMicrophoneStatus("recovering");
      setError("Your microphone disconnected. Video remains connected while SupportRoom looks for another microphone.");
      void startMicrophone(selectedMicrophoneIdRef.current, true, true);
    };
    audioTrack.addEventListener("ended", handleEnded, { once: true });
    return () => audioTrack.removeEventListener("ended", handleEnded);
  }, [audioTrack, startMicrophone]);

  useEffect(() => {
    const mediaDevices = navigator.mediaDevices;
    if (!mediaDevices) return;
    const handleDeviceChange = () => {
      void refreshDevices().then(() => {
        if (cameraWantedRef.current && !videoTrackRef.current) void startCamera(selectedCameraIdRef.current, true);
        if (microphoneWantedRef.current && !audioTrackRef.current) void startMicrophone(selectedMicrophoneIdRef.current, true, true);
      });
    };
    mediaDevices.addEventListener("devicechange", handleDeviceChange);
    return () => mediaDevices.removeEventListener("devicechange", handleDeviceChange);
  }, [refreshDevices, startCamera, startMicrophone]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      requestIdRef.current += 1;
      videoRequestIdRef.current += 1;
      audioRequestIdRef.current += 1;
      stopTracks(streamRef.current);
      if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current);
      void audioContextRef.current?.close();
    };
  }, []);

  return {
    stream,
    videoTrack,
    audioTrack,
    status,
    cameraStatus,
    microphoneStatus,
    error,
    devices,
    selectedCameraId,
    selectedMicrophoneId,
    isCameraEnabled,
    isMicrophoneEnabled,
    audioLevel,
    startMedia,
    stopMedia,
    toggleCamera,
    toggleMicrophone,
    selectCamera,
    selectMicrophone,
  };
}
