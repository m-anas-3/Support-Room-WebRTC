"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type MediaStatus = "idle" | "requesting" | "ready" | "error";

type MediaDevices = {
  cameras: MediaDeviceInfo[];
  microphones: MediaDeviceInfo[];
  speakers: MediaDeviceInfo[];
};

const emptyDevices: MediaDevices = {
  cameras: [],
  microphones: [],
  speakers: [],
};

function stopTracks(stream: MediaStream | null) {
  // A MediaStream does not release hardware by itself. Every track must stop.
  stream?.getTracks().forEach((track) => track.stop());
}

function getMediaErrorMessage(error: unknown) {
  if (!(error instanceof DOMException)) {
    return "We could not start your camera and microphone.";
  }

  switch (error.name) {
    case "NotAllowedError":
      return "Camera or microphone access was blocked. Allow access in your browser settings and try again.";
    case "NotFoundError":
      return "No camera or microphone was found. Connect a device and try again.";
    case "NotReadableError":
      return "Another application may be using your camera or microphone.";
    case "OverconstrainedError":
      return "The selected device cannot satisfy the requested video settings.";
    case "SecurityError":
      return "Media access requires a secure HTTPS connection or localhost.";
    default:
      return error.message || "We could not start your camera and microphone.";
  }
}

export function useLocalMedia() {
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const requestIdRef = useRef(0);
  const mountedRef = useRef(true);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [status, setStatus] = useState<MediaStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDevices>(emptyDevices);
  const [selectedCameraId, setSelectedCameraId] = useState("");
  const [selectedMicrophoneId, setSelectedMicrophoneId] = useState("");
  const [isCameraEnabled, setIsCameraEnabled] = useState(true);
  const [isMicrophoneEnabled, setIsMicrophoneEnabled] = useState(true);
  const [audioLevel, setAudioLevel] = useState(0);

  const refreshDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;

    try {
      const available = await navigator.mediaDevices.enumerateDevices();
      if (!mountedRef.current) return;
      setDevices({
        cameras: available.filter((device) => device.kind === "videoinput"),
        microphones: available.filter((device) => device.kind === "audioinput"),
        speakers: available.filter((device) => device.kind === "audiooutput"),
      });
    } catch {
      // Media can still work when the browser restricts device enumeration.
    }
  }, []);

  const startMedia = useCallback(async (overrides?: { cameraId?: string; microphoneId?: string }) => {
    const requestId = ++requestIdRef.current;
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("error");
      setError("This browser does not support camera and microphone access.");
      return;
    }

    setStatus("requesting");
    setError(null);
    stopTracks(streamRef.current);
    streamRef.current = null;
    setStream(null);

    const cameraId = overrides?.cameraId ?? selectedCameraId;
    const microphoneId = overrides?.microphoneId ?? selectedMicrophoneId;

    // Constraints describe the media we prefer. "ideal" allows the browser
    // to choose a close match instead of failing on a slightly different device.
    const constraints: MediaStreamConstraints = {
      video: {
        deviceId: cameraId ? { exact: cameraId } : undefined,
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30, max: 60 },
      },
      audio: {
        deviceId: microphoneId ? { exact: microphoneId } : undefined,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    };

    try {
      const nextStream = await navigator.mediaDevices.getUserMedia(constraints);

      // A permission prompt may resolve after another request or page unmount.
      if (!mountedRef.current || requestId !== requestIdRef.current) {
        stopTracks(nextStream);
        return;
      }
      streamRef.current = nextStream;
      nextStream.getVideoTracks().forEach((track) => { track.enabled = isCameraEnabled; });
      nextStream.getAudioTracks().forEach((track) => { track.enabled = isMicrophoneEnabled; });
      setStream(nextStream);
      setStatus("ready");

      const videoDeviceId = nextStream.getVideoTracks()[0]?.getSettings().deviceId;
      const audioDeviceId = nextStream.getAudioTracks()[0]?.getSettings().deviceId;
      if (videoDeviceId) setSelectedCameraId(videoDeviceId);
      if (audioDeviceId) setSelectedMicrophoneId(audioDeviceId);

      // Device labels become available only after the user grants permission.
      await refreshDevices();
    } catch (mediaError) {
      if (!mountedRef.current || requestId !== requestIdRef.current) return;
      setStatus("error");
      setError(getMediaErrorMessage(mediaError));
    }
  }, [isCameraEnabled, isMicrophoneEnabled, refreshDevices, selectedCameraId, selectedMicrophoneId]);

  const stopMedia = useCallback(() => {
    requestIdRef.current += 1;
    stopTracks(streamRef.current);
    streamRef.current = null;
    setStream(null);
    setStatus("idle");
    setAudioLevel(0);
  }, []);

  const toggleCamera = useCallback(() => {
    const nextEnabled = !isCameraEnabled;
    streamRef.current?.getVideoTracks().forEach((track) => { track.enabled = nextEnabled; });
    setIsCameraEnabled(nextEnabled);
  }, [isCameraEnabled]);

  const toggleMicrophone = useCallback(() => {
    const nextEnabled = !isMicrophoneEnabled;
    streamRef.current?.getAudioTracks().forEach((track) => { track.enabled = nextEnabled; });
    setIsMicrophoneEnabled(nextEnabled);
  }, [isMicrophoneEnabled]);

  const selectCamera = useCallback(async (deviceId: string) => {
    setSelectedCameraId(deviceId);
    await startMedia({ cameraId: deviceId });
  }, [startMedia]);

  const selectMicrophone = useCallback(async (deviceId: string) => {
    setSelectedMicrophoneId(deviceId);
    await startMedia({ microphoneId: deviceId });
  }, [startMedia]);

  useEffect(() => {
    if (!stream || !isMicrophoneEnabled) {
      return;
    }

    const audioTrack = stream.getAudioTracks()[0];
    if (!audioTrack) return;

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
      if (timestamp - lastMeasurement < 100) {
        animationFrameRef.current = requestAnimationFrame(measure);
        return;
      }
      lastMeasurement = timestamp;
      analyser.getByteTimeDomainData(samples);
      let sum = 0;
      for (const sample of samples) {
        const normalized = (sample - 128) / 128;
        sum += normalized * normalized;
      }
      const rms = Math.sqrt(sum / samples.length);
      setAudioLevel(Math.min(100, Math.round(rms * 280)));
      animationFrameRef.current = requestAnimationFrame(measure);
    };
    measure();

    return () => {
      if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current);
      source.disconnect();
      void context.close();
      audioContextRef.current = null;
    };
  }, [isMicrophoneEnabled, stream]);

  useEffect(() => {
    const mediaDevices = navigator.mediaDevices;
    if (!mediaDevices) return;
    const handleDeviceChange = () => { void refreshDevices(); };
    mediaDevices.addEventListener("devicechange", handleDeviceChange);
    return () => mediaDevices.removeEventListener("devicechange", handleDeviceChange);
  }, [refreshDevices]);

  useEffect(() => {
    if (!stream) return;
    const handleEnded = () => {
      stopTracks(streamRef.current);
      streamRef.current = null;
      setStream(null);
      setStatus("error");
      setError("A media device was disconnected. Reconnect it and run the check again.");
    };
    stream.getTracks().forEach((track) => track.addEventListener("ended", handleEnded));
    return () => stream.getTracks().forEach((track) => track.removeEventListener("ended", handleEnded));
  }, [stream]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      requestIdRef.current += 1;
      stopTracks(streamRef.current);
      if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current);
      void audioContextRef.current?.close();
    };
  }, []);

  return {
    stream,
    status,
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
