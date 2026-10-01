"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  Camera,
  Check,
  Copy,
  Maximize2,
  MoreVertical,
  Users,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { ConnectionDiagnostics } from "@/components/diagnostics/connection-diagnostics";
import { useAgentIdentity } from "@/components/auth/agent-identity";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useLocalMedia } from "@/hooks/use-local-media";
import { useAgentNotifications } from "@/hooks/use-agent-notifications";
import { useOutgoingMedia } from "@/hooks/use-outgoing-media";
import { usePeerConnection } from "@/hooks/use-peer-connection";
import { useScreenShare } from "@/hooks/use-screen-share";
import { useScreenWakeLock } from "@/hooks/use-screen-wake-lock";
import { useSessionHistory } from "@/hooks/use-session-history";
import { useSignaling } from "@/hooks/use-signaling";
import { invitationUrl, readHostRoom } from "@/lib/signaling/client";
import { assessConnectionHealth } from "@/lib/webrtc/connection-health";
import { cn } from "@/lib/utils";
import { CallControls } from "./call-controls";
import { CallDeviceSettings } from "./call-device-settings";
import { CallLayout, CallPanel, SharingState } from "./call-layout";
import { VideoTile } from "./video-tile";

type Panel = "diagnostics" | "people" | "devices" | null;

export function SupportCall({ roomId }: { roomId: string }) {
  const router = useRouter();
  const agent = useAgentIdentity();
  const [panel, setPanel] = useState<Panel>(null);
  const media = useLocalMedia(agent.callDefaults);
  const signaling = useSignaling({
    roomId,
    role: "host",
    name: agent.name,
    onDisconnect: media.stopMedia,
  });
  const admitted = signaling.room?.customerState === "admitted";
  const waitingCustomer = signaling.room?.customerState === "waiting";
  const mediaReady = media.status === "ready" && Boolean(media.stream);
  useScreenWakeLock(admitted && mediaReady);
  const peer = usePeerConnection({
    role: "host",
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
  const handleHistoryError = useCallback(() => {
    toast.warning(
      "The call is still active, but its session history could not be updated.",
    );
  }, []);
  const sessionHistory = useSessionHistory({
    roomId,
    customerName: signaling.room?.customerName ?? null,
    customerState: signaling.room?.customerState ?? null,
    connectionState: peer.connectionState,
    diagnostics: peer.diagnostics,
    recoveryAttempts: peer.recoveryAttempts,
    onPersistenceError: handleHistoryError,
  });
  const signalingReconnecting = signaling.status === "reconnecting";
  const connectionHealth = assessConnectionHealth({
    connected: peer.connectionState === "connected",
    reconnecting:
      peer.recoveryState === "reconnecting" || signalingReconnecting,
    recoveryAttempts: peer.recoveryAttempts,
    diagnostics: peer.diagnostics,
    localMedia: {
      audio: media.isMicrophoneEnabled,
      video: screenShare.isSharing || media.isCameraEnabled,
    },
    remoteMedia: {
      audio: peer.remoteMicrophoneEnabled,
      video: peer.remoteScreenSharing || peer.remoteCameraEnabled,
    },
  });
  useAgentNotifications({
    customerWaiting: waitingCustomer,
    customerName: signaling.room?.customerName,
    connectionHealth: connectionHealth.level,
    preferences: agent.notificationPreferences,
  });
  const error =
    media.error ||
    outgoingMedia.error ||
    screenShare.error ||
    peer.error ||
    (signalingReconnecting ? null : signaling.error);
  const reference = signaling.room?.reference || "Support session";
  const panelTitle =
    panel === "diagnostics"
      ? "Connection details"
      : panel === "people"
        ? "People"
        : "Call settings";
  const panelDescription =
    panel === "diagnostics"
      ? "Live call quality"
      : panel === "people"
        ? "Participants in this room"
        : "Camera, microphone, and speaker";

  async function copyInvite() {
    const created = readHostRoom(roomId);
    if (!created)
      return toast.error("No invitation is available for this room.");
    try {
      await navigator.clipboard.writeText(invitationUrl(created));
      toast.success("Invitation link copied");
    } catch {
      toast.error(
        "Could not copy the invitation. Check your browser permissions.",
      );
    }
  }

  async function endRoom() {
    screenShare.releaseScreenShare();
    peer.close();
    media.stopMedia();
    signaling.leave();
    await sessionHistory.complete();
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <CallLayout
      title={reference}
      status={
        signalingReconnecting || peer.recoveryState === "reconnecting"
          ? "Reconnecting…"
          : peer.connectionState === "connected"
            ? "Connected · One-to-one support"
            : admitted
              ? "Connecting your call…"
              : "Waiting room"
      }
      connected={peer.connectionState === "connected"}
      error={error}
      notice={
        signalingReconnecting
          ? "Connection interrupted. Reconnecting… Your devices remain ready."
          : null
      }
      actions={
        <>
          <FooterButton
            label="Connection diagnostics"
            active={panel === "diagnostics"}
            icon={Activity}
            onClick={() =>
              setPanel((current) =>
                current === "diagnostics" ? null : "diagnostics",
              )
            }
          />
          <FooterButton
            label="People"
            active={panel === "people"}
            icon={Users}
            onClick={() =>
              setPanel((current) => (current === "people" ? null : "people"))
            }
          />
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-11 text-muted-foreground"
                  aria-label="More options"
                />
              }
            >
              <MoreVertical />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="dark" align="end">
              <DropdownMenuItem onClick={copyInvite}>
                <Copy />
                Copy invite link
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  if (document.documentElement.requestFullscreen)
                    void document.documentElement
                      .requestFullscreen()
                      .catch(() =>
                        toast.error("Full screen could not be started."),
                      );
                  else
                    toast.info("Full screen is unavailable in this browser.");
                }}
              >
                <Maximize2 />
                Enter full screen
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      }
      panel={
        <CallPanel
          open={panel !== null}
          title={panelTitle}
          description={panelDescription}
          onClose={() => setPanel(null)}
          testId={
            panel === "diagnostics" ? "host-diagnostics-panel" : undefined
          }
        >
          {panel === "diagnostics" ? (
            <ConnectionDiagnostics
              signalingStatus={signaling.status}
              peer={peer}
              localMedia={{
                audio: media.isMicrophoneEnabled,
                video: screenShare.isSharing || media.isCameraEnabled,
              }}
              remoteMedia={{
                audio: peer.remoteMicrophoneEnabled,
                video: peer.remoteScreenSharing || peer.remoteCameraEnabled,
              }}
            />
          ) : panel === "people" ? (
            <People
              hostName={agent.name}
              customerName={signaling.room?.customerName}
              admitted={admitted}
            />
          ) : (
            <CallDeviceSettings media={media} inCall />
          )}
        </CallPanel>
      }
      controls={
        <CallControls
          microphoneEnabled={media.isMicrophoneEnabled}
          cameraEnabled={media.isCameraEnabled}
          mediaReady={mediaReady}
          cameraChanging={["requesting", "recovering"].includes(
            media.cameraStatus,
          )}
          microphoneChanging={["requesting", "recovering"].includes(
            media.microphoneStatus,
          )}
          screenShareReady={peer.connectionState === "connected"}
          screenSharing={screenShare.isSharing}
          screenShareSupported={screenShare.supported}
          screenShareChanging={screenShare.isChanging}
          host
          onToggleMicrophone={media.toggleMicrophone}
          onToggleCamera={media.toggleCamera}
          onToggleScreenShare={() => {
            if (screenShare.isSharing) void screenShare.stopScreenShare();
            else void screenShare.startScreenShare();
          }}
          onOpenSettings={() =>
            setPanel((current) => (current === "devices" ? null : "devices"))
          }
          onLeave={endRoom}
        />
      }
    >
      <div
        className="call-grid"
        data-presenting={peer.remoteScreenSharing || screenShare.isSharing}
        data-testid="host-call-stage"
      >
        {admitted ? (
          <VideoTile
            className="h-full min-h-0"
            stream={peer.remoteStream}
            name={signaling.room?.customerName ?? "Customer"}
            label={
              peer.remoteScreenSharing
                ? "Customer · Presenting"
                : peer.recoveryState === "reconnecting"
                  ? "Reconnecting…"
                  : peer.connectionState === "connected"
                    ? "Customer"
                    : "Connecting…"
            }
            fit={peer.remoteScreenSharing ? "contain" : "cover"}
            cameraEnabled={peer.remoteScreenSharing || peer.remoteCameraEnabled}
            microphoneEnabled={peer.remoteMicrophoneEnabled}
            speakerId={media.selectedSpeakerId}
            onSpeakerError={media.reportSpeakerError}
            testId="remote-video"
          />
        ) : (
          <WaitingTile
            customerName={signaling.room?.customerName}
            connected={signaling.status === "connected"}
            waiting={waitingCustomer}
            error={signaling.error}
            canAdmit={mediaReady}
            onCopy={copyInvite}
            onDecline={() => signaling.send({ type: "decline" })}
            onAdmit={() => signaling.send({ type: "admit" })}
          />
        )}
        <div className="relative min-h-0 overflow-hidden rounded-2xl">
          <VideoTile
            className="h-full min-h-0"
            stream={media.stream}
            name="You"
            label={screenShare.isSharing ? "Host · Presenting" : "Host"}
            local
            cameraEnabled={media.isCameraEnabled}
            microphoneEnabled={media.isMicrophoneEnabled}
            testId="local-video"
            action={
              !mediaReady ? (
                <Button
                  className="h-10"
                  disabled={media.status === "requesting"}
                  onClick={() => void media.startMedia()}
                >
                  <Camera />
                  {media.status === "requesting"
                    ? "Starting…"
                    : agent.callDefaults.cameraEnabled
                      ? "Start camera"
                      : "Prepare devices"}
                </Button>
              ) : undefined
            }
          />
          {screenShare.isSharing && (
            <SharingState onStop={() => void screenShare.stopScreenShare()} />
          )}
        </div>
      </div>
    </CallLayout>
  );
}

function FooterButton({
  label,
  icon: Icon,
  active,
  onClick,
}: {
  label: string;
  icon: typeof Activity;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "size-11 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground",
              active && "bg-primary/15 text-primary",
            )}
            aria-label={label}
            onClick={onClick}
          />
        }
      >
        <Icon />
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function WaitingTile({
  customerName,
  connected,
  waiting,
  error,
  canAdmit,
  onAdmit,
  onDecline,
  onCopy,
}: {
  customerName?: string | null;
  connected: boolean;
  waiting?: boolean;
  error?: string | null;
  canAdmit: boolean;
  onAdmit: () => void;
  onDecline: () => void;
  onCopy: () => void;
}) {
  return (
    <div className="grid min-h-0 place-items-center overflow-y-auto rounded-2xl border border-border bg-card p-5 text-center">
      <div>
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-secondary">
          <UserRound className="size-6 text-muted-foreground" />
        </span>
        <h2 className="mt-4 text-lg font-medium">
          {waiting
            ? `${customerName ?? "A customer"} is waiting`
            : connected
              ? "Your next conversation starts here"
              : "Connecting to the room"}
        </h2>
        <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-muted-foreground">
          {error ??
            (waiting
              ? canAdmit
                ? "Your devices are ready. Admit your customer when you’re ready to talk."
                : "Prepare your devices before admitting your customer. Your camera can stay off."
              : "Copy your invitation and send it to your customer. You choose when they join.")}
        </p>
        {waiting ? (
          <div className="mt-5 flex justify-center gap-2">
            <Button className="h-10" variant="secondary" onClick={onDecline}>
              Decline
            </Button>
            <Button className="h-10" disabled={!canAdmit} onClick={onAdmit}>
              <Check />
              Admit
            </Button>
          </div>
        ) : (
          connected && (
            <Button variant="secondary" className="mt-5 h-10" onClick={onCopy}>
              <Copy />
              Copy invite link
            </Button>
          )
        )}
      </div>
    </div>
  );
}

function People({
  hostName,
  customerName,
  admitted,
}: {
  hostName: string;
  customerName?: string | null;
  admitted: boolean;
}) {
  return (
    <div className="space-y-3">
      <Person name={hostName} role="Host" />
      {customerName && (
        <Person name={customerName} role={admitted ? "In call" : "Waiting"} />
      )}
    </div>
  );
}
function Person({ name, role }: { name: string; role: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border p-3">
      <span className="grid size-9 place-items-center rounded-full bg-secondary">
        <UserRound className="size-4 text-muted-foreground" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{name}</p>
        <p className="text-xs text-muted-foreground">{role}</p>
      </div>
    </div>
  );
}
