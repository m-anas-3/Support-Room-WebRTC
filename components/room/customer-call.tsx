"use client";

import { useState, type ReactNode } from "react";
import { CallControls } from "./call-controls";
import { CallLayout, CallPanel, SharingState } from "./call-layout";
import { VideoTile } from "./video-tile";

export function CustomerCall({
  name,
  hostName,
  localStream,
  remoteStream,
  connectionState,
  recoveryState,
  connectionNotice,
  error,
  cameraEnabled,
  microphoneEnabled,
  cameraChanging,
  microphoneChanging,
  screenSharing,
  remoteScreenSharing,
  remoteCameraEnabled,
  remoteMicrophoneEnabled,
  screenShareSupported,
  screenShareChanging,
  speakerId,
  deviceSettings,
  onSpeakerError,
  onToggleCamera,
  onToggleMicrophone,
  onToggleScreenShare,
  onLeave,
}: {
  name: string;
  hostName: string;
  localStream: MediaStream;
  remoteStream: MediaStream | null;
  connectionState: RTCPeerConnectionState | "idle";
  recoveryState: "idle" | "reconnecting" | "recovered";
  connectionNotice: string | null;
  error: string | null;
  cameraEnabled: boolean;
  microphoneEnabled: boolean;
  cameraChanging: boolean;
  microphoneChanging: boolean;
  screenSharing: boolean;
  remoteScreenSharing: boolean;
  remoteCameraEnabled: boolean;
  remoteMicrophoneEnabled: boolean;
  screenShareSupported: boolean;
  screenShareChanging: boolean;
  speakerId: string;
  deviceSettings: ReactNode;
  onSpeakerError: (message: string | null) => void;
  onToggleCamera: () => void;
  onToggleMicrophone: () => void;
  onToggleScreenShare: () => void;
  onLeave: () => void;
}) {
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <CallLayout
      title={`Support call with ${hostName}`}
      status={
        recoveryState === "reconnecting"
          ? "Reconnecting…"
          : connectionState === "connected"
            ? "Connected · One-to-one support"
            : "Connecting your call…"
      }
      connected={connectionState === "connected"}
      error={error}
      notice={connectionNotice}
      panel={
        <CallPanel
          open={settingsOpen}
          title="Call settings"
          description="Camera, microphone, and speaker"
          closeLabel="Close call settings"
          onClose={() => setSettingsOpen(false)}
        >
          {deviceSettings}
        </CallPanel>
      }
      controls={
        <CallControls
          microphoneEnabled={microphoneEnabled}
          cameraEnabled={cameraEnabled}
          cameraChanging={cameraChanging}
          microphoneChanging={microphoneChanging}
          screenShareReady={connectionState === "connected"}
          screenSharing={screenSharing}
          screenShareSupported={screenShareSupported}
          screenShareChanging={screenShareChanging}
          host={false}
          onToggleMicrophone={onToggleMicrophone}
          onToggleCamera={onToggleCamera}
          onToggleScreenShare={onToggleScreenShare}
          onOpenSettings={() => setSettingsOpen((open) => !open)}
          onLeave={onLeave}
        />
      }
    >
      <div
        className="call-grid"
        data-presenting={remoteScreenSharing || screenSharing}
        data-testid="customer-call-stage"
      >
        <VideoTile
          className="h-full min-h-0"
          stream={remoteStream}
          name={hostName}
          label={
            remoteScreenSharing
              ? "Support agent · Presenting"
              : recoveryState === "reconnecting"
                ? "Reconnecting…"
                : connectionState === "connected"
                  ? "Support agent"
                  : "Connecting…"
          }
          fit={remoteScreenSharing ? "contain" : "cover"}
          cameraEnabled={remoteScreenSharing || remoteCameraEnabled}
          microphoneEnabled={remoteMicrophoneEnabled}
          speakerId={speakerId}
          onSpeakerError={onSpeakerError}
          testId="remote-video"
        />
        <div className="relative min-h-0 overflow-hidden rounded-2xl">
          <VideoTile
            className="h-full min-h-0"
            stream={localStream}
            name="You"
            label={screenSharing ? `${name} · Presenting` : name}
            local
            cameraEnabled={cameraEnabled}
            microphoneEnabled={microphoneEnabled}
            testId="local-video"
          />
          {screenSharing && <SharingState onStop={onToggleScreenShare} />}
        </div>
      </div>
    </CallLayout>
  );
}
