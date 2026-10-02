"use client";

import { useState } from "react";
import {
  Check,
  Clock3,
  ShieldCheck,
  ArrowRight,
  CircleAlert,
} from "lucide-react";

import { Brand } from "@/components/layout/brand";
import { DevicePreview } from "@/components/playground/device-preview";
import { StatusNotice } from "@/components/layout/status-notice";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useLocalMedia } from "@/hooks/use-local-media";
import { useOutgoingMedia } from "@/hooks/use-outgoing-media";
import { usePeerConnection } from "@/hooks/use-peer-connection";
import { useScreenShare } from "@/hooks/use-screen-share";
import { useScreenWakeLock } from "@/hooks/use-screen-wake-lock";
import { useSignaling } from "@/hooks/use-signaling";
import { CustomerCall } from "@/components/room/customer-call";
import { CallDeviceSettings } from "@/components/room/call-device-settings";
import { MediaControls } from "@/components/room/call-controls";

export function CustomerJoin({ roomId }: { roomId: string }) {
  const media = useLocalMedia({ autoStartGranted: true });
  const [left, setLeft] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [name, setName] = useState("");
  const signaling = useSignaling({
    roomId,
    role: "customer",
    name,
    enabled: waiting,
    onDisconnect: media.stopMedia,
  });
  const admitted = signaling.room?.customerState === "admitted";
  const isReady = media.status === "ready";
  const failed = ["error", "closed", "disconnected", "declined"].includes(
    signaling.status,
  );
  useScreenWakeLock(Boolean(admitted && !failed && media.stream));
  const peer = usePeerConnection({
    role: "customer",
    localStream: media.stream,
    enabled: admitted && signaling.status === "connected",
    iceConfiguration: signaling.iceConfiguration,
    send: signaling.send,
    subscribeToSignals: signaling.subscribeToSignals,
  });
  const screenShare = useScreenShare({
    cameraStream: media.stream,
    enabled: peer.connectionState === "connected",
    replaceOutgoingVideoTrack: peer.replaceOutgoingVideoTrack,
    announce: (active) => {
      if (signaling.status === "connected")
        signaling.send({ type: "screen-share-state", active });
    },
  });
  const outgoingMedia = useOutgoingMedia({
    connected: peer.connectionState === "connected",
    audioTrack: media.audioTrack,
    videoTrack: media.videoTrack,
    videoOverrideActive: screenShare.isSharing,
    cameraEnabled: media.isCameraEnabled,
    microphoneEnabled: media.isMicrophoneEnabled,
    replaceAudioTrack: peer.replaceOutgoingAudioTrack,
    replaceVideoTrack: peer.replaceOutgoingVideoTrack,
    send: signaling.send,
  });

  if (admitted && !failed && media.stream) {
    return (
      <CustomerCall
        name={name}
        hostName={signaling.room?.hostName ?? "Support agent"}
        localStream={media.stream}
        remoteStream={peer.remoteStream}
        connectionState={peer.connectionState}
        recoveryState={peer.recoveryState}
        connectionNotice={
          signaling.status === "reconnecting"
            ? `Signaling connection interrupted. Reconnecting${signaling.reconnectAttempt ? ` · attempt ${signaling.reconnectAttempt}` : ""}… Your devices remain ready.`
            : null
        }
        error={
          media.error ||
          outgoingMedia.error ||
          screenShare.error ||
          peer.error ||
          (signaling.status === "reconnecting" ? null : signaling.error)
        }
        cameraEnabled={media.isCameraEnabled}
        microphoneEnabled={media.isMicrophoneEnabled}
        cameraChanging={["requesting", "recovering"].includes(
          media.cameraStatus,
        )}
        microphoneChanging={["requesting", "recovering"].includes(
          media.microphoneStatus,
        )}
        screenSharing={screenShare.isSharing}
        remoteScreenSharing={peer.remoteScreenSharing}
        remoteCameraEnabled={peer.remoteCameraEnabled}
        remoteMicrophoneEnabled={peer.remoteMicrophoneEnabled}
        screenShareSupported={screenShare.supported}
        screenShareChanging={screenShare.isChanging}
        speakerId={media.selectedSpeakerId}
        deviceSettings={<CallDeviceSettings media={media} inCall />}
        onSpeakerError={media.reportSpeakerError}
        onToggleCamera={media.toggleCamera}
        onToggleMicrophone={media.toggleMicrophone}
        onToggleScreenShare={() => {
          if (screenShare.isSharing) void screenShare.stopScreenShare();
          else void screenShare.startScreenShare();
        }}
        onLeave={() => {
          screenShare.releaseScreenShare();
          peer.close();
          media.stopMedia();
          signaling.leave();
          setWaiting(false);
          setLeft(true);
        }}
      />
    );
  }

  function resetPreview() {
    screenShare.releaseScreenShare();
    peer.close();
    signaling.leave();
    media.stopMedia();
    media.prepareForCall();
    setWaiting(false);
    setLeft(false);
  }

  const terminal = left || (waiting && failed);
  return (
    <main className="min-h-dvh bg-background">
      <header className="flex h-16 items-center justify-between border-b bg-white px-5 sm:px-8">
        <Brand href="/login" />
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="size-4" />
          Private support call
        </span>
      </header>
      {terminal ? (
        <section className="mx-auto max-w-md px-6 py-20 text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl border bg-white">
            {left || signaling.status === "closed" ? (
              <Check className="size-6" />
            ) : (
              <CircleAlert className="size-6" />
            )}
          </span>
          <h1 className="mt-6 text-[28px] font-semibold tracking-tight">
            {left || signaling.status === "closed"
              ? "Your call has ended"
              : signaling.status === "declined"
                ? "Your request was declined"
                : "Unable to join this room"}
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {left
              ? "Your camera and microphone have been released. You can safely close this tab."
              : signaling.error ||
                (signaling.status === "declined"
                  ? "Contact your support agent if you still need help."
                  : "Ask your support agent for a new invitation if you need to reconnect.")}
          </p>
          <Button
            variant="outline"
            className="mt-7 h-11 bg-white"
            onClick={resetPreview}
          >
            Back to device check
          </Button>
        </section>
      ) : (
        <div className="mx-auto max-w-[1100px] px-5 py-8 sm:px-8 lg:py-12">
          <div
            className="mb-8 flex items-center gap-3 text-xs text-muted-foreground"
            aria-label="Joining progress"
          >
            <span
              className={
                isReady ? "text-primary" : "font-medium text-foreground"
              }
            >
              01 · Check devices
            </span>
            <span className="h-px w-6 bg-border" />
            <span
              className={
                !waiting && isReady ? "font-medium text-foreground" : ""
              }
            >
              02 · Request to join
            </span>
            <span className="h-px w-6 bg-border" />
            <span className={waiting ? "font-medium text-primary" : ""}>
              03 · Join call
            </span>
          </div>
          <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-12">
            <section className="min-w-0">
              <div className="mb-6">
                <h1 className="text-[28px] font-semibold tracking-tight">
                  Get ready to join
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  A quick check, then you’re ready to connect.
                </p>
              </div>
              <DevicePreview media={media} showStartButton={false} />
              <div className="dark mt-4 flex justify-center gap-3 rounded-2xl bg-card p-2">
                <MediaControls
                  cameraEnabled={media.isCameraEnabled}
                  microphoneEnabled={media.isMicrophoneEnabled}
                  cameraChanging={["requesting", "recovering"].includes(
                    media.cameraStatus,
                  )}
                  microphoneChanging={["requesting", "recovering"].includes(
                    media.microphoneStatus,
                  )}
                  onToggleCamera={media.toggleCamera}
                  onToggleMicrophone={media.toggleMicrophone}
                />
              </div>
              {isReady && (
                <>
                  <div className="mt-5 flex items-center gap-4">
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {media.isMicrophoneEnabled
                        ? "Speak to test"
                        : "Microphone muted"}
                    </span>
                    <Progress
                      aria-label="Microphone level"
                      value={media.isMicrophoneEnabled ? media.audioLevel : 0}
                      className="h-1.5"
                    />
                  </div>
                  <Accordion className="mt-5 rounded-xl border bg-white px-5">
                    <AccordionItem value="devices">
                      <AccordionTrigger className="py-4">
                        Device settings
                      </AccordionTrigger>
                      <AccordionContent className="pb-5">
                        <CallDeviceSettings media={media} />
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </>
              )}
              {media.error && (
                <StatusNotice className="mt-4" error>
                  {media.error}
                </StatusNotice>
              )}
            </section>
            <aside className="rounded-2xl border bg-white p-6 lg:mt-[88px] lg:p-7">
              {waiting ? (
                <div className="py-3 text-center">
                  <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary/8 text-primary">
                    <Clock3 className="size-6" />
                  </span>
                  <h2 className="mt-5 text-xl font-medium">
                    {admitted
                      ? "You’re in. Connecting…"
                      : signaling.status === "connecting"
                        ? "Sending your request…"
                        : "Waiting for admission"}
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    {signaling.error ||
                      "Your agent will let you in shortly. Keep this page open; your preview is still private."}
                  </p>
                  <Button
                    className="mt-6 h-11 w-full"
                    variant="outline"
                    onClick={() => {
                      resetPreview();
                      setLeft(true);
                    }}
                  >
                    Leave room
                  </Button>
                </div>
              ) : (
                <>
                  <Badge variant="secondary" className="mb-5">
                    Guest access · No account needed
                  </Badge>
                  <h2 className="text-xl font-medium tracking-tight">
                    Let’s get you connected.
                  </h2>
                  <p className="mt-2 mb-6 text-sm leading-6 text-muted-foreground">
                    Let your support agent know who’s joining.
                  </p>
                  <Field>
                    <FieldLabel htmlFor="name">Your name</FieldLabel>
                    <Input
                      className="h-11"
                      id="name"
                      autoComplete="name"
                      maxLength={80}
                      placeholder="Enter your name"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                    />
                  </Field>
                  <Button
                    className="mt-5 h-11 w-full"
                    disabled={!name.trim()}
                    onClick={() => setWaiting(true)}
                  >
                    Ask to join <ArrowRight />
                  </Button>
                  <p className="mt-6 border-t pt-5 text-xs leading-5 text-muted-foreground">
                    Your preview stays on this device. Audio and video are
                    shared only after your agent admits you. Your camera can and
                    microphone can stay off.
                  </p>
                </>
              )}
            </aside>
          </div>
        </div>
      )}
    </main>
  );
}
