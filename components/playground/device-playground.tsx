"use client";

import { Camera, Mic, MicOff, ShieldCheck, VideoOff } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { StatusNotice } from "@/components/layout/status-notice";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CallDeviceSettings } from "@/components/room/call-device-settings";
import { useLocalMedia } from "@/hooks/use-local-media";
import { DevicePreview } from "./device-preview";

export function DevicePlayground() {
  const media = useLocalMedia();
  const ready = media.status === "ready";
  return (
    <AppShell title="Device check">
      <div className="page-stack">
        <PageHeader
          eyebrow="Before your next call"
          title="Look good. Sound clear."
          description="Choose your devices and take a moment to check everything. This is a private preview."
        />
        {media.error && <StatusNotice error>{media.error}</StatusNotice>}
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
          <section className="min-w-0">
            <DevicePreview media={media} startLabel="Start device check" />
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button
                className="h-10 bg-white"
                variant="outline"
                disabled={
                  !ready ||
                  ["requesting", "recovering"].includes(media.microphoneStatus)
                }
                onClick={media.toggleMicrophone}
              >
                {media.isMicrophoneEnabled ? <Mic /> : <MicOff />}
                {media.isMicrophoneEnabled ? "Mute" : "Unmute"}
              </Button>
              <Button
                className="h-10 bg-white"
                variant="outline"
                disabled={
                  !ready ||
                  ["requesting", "recovering"].includes(media.cameraStatus)
                }
                onClick={media.toggleCamera}
              >
                {media.isCameraEnabled ? <Camera /> : <VideoOff />}
                {media.isCameraEnabled ? "Turn off camera" : "Turn on camera"}
              </Button>
              {ready && (
                <Button
                  className="ml-auto h-10"
                  variant="ghost"
                  onClick={media.stopMedia}
                >
                  Stop preview
                </Button>
              )}
            </div>
            <div className="mt-6 rounded-xl border bg-white p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="flex items-center gap-2 text-sm font-medium">
                  <Mic className="size-4 text-muted-foreground" />
                  Microphone level
                </p>
                <span className="text-xs text-muted-foreground">
                  {!ready
                    ? "Not connected"
                    : media.isMicrophoneEnabled
                      ? "Speak to test"
                      : "Muted"}
                </span>
              </div>
              <Progress
                aria-label="Microphone level"
                value={
                  ready && media.isMicrophoneEnabled ? media.audioLevel : 0
                }
                className="mt-4 h-1.5"
              />
              <p className="mt-3 text-xs text-muted-foreground">
                You won’t hear your own microphone. This prevents feedback.
              </p>
            </div>
            <p className="mt-5 flex items-start gap-2 text-xs leading-5 text-muted-foreground">
              <ShieldCheck className="mt-0.5 size-4 shrink-0" />
              Your media stays on this device. Leaving this page releases the
              camera and microphone.
            </p>
          </section>
          <section className="min-w-0 rounded-xl border bg-white p-6">
            <h2 className="text-lg font-medium">Your devices</h2>
            <p className="mt-1 mb-6 text-sm text-muted-foreground">
              {ready
                ? "Choose what you’ll use in your call."
                : "Start the preview to discover your devices."}
            </p>
            <CallDeviceSettings media={media} />
          </section>
        </div>
      </div>
    </AppShell>
  );
}
