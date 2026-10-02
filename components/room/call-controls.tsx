"use client";

import {
  Camera,
  Loader2,
  Mic,
  MicOff,
  MonitorUp,
  PhoneOff,
  Settings,
  VideoOff,
  type LucideIcon,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function CallControls({
  microphoneEnabled,
  cameraEnabled,
  cameraChanging = false,
  microphoneChanging = false,
  screenShareReady,
  screenSharing,
  screenShareSupported,
  screenShareChanging,
  host,
  onToggleMicrophone,
  onToggleCamera,
  onToggleScreenShare,
  onOpenSettings,
  onLeave,
}: {
  microphoneEnabled: boolean;
  cameraEnabled: boolean;
  cameraChanging?: boolean;
  microphoneChanging?: boolean;
  screenShareReady: boolean;
  screenSharing: boolean;
  screenShareSupported: boolean;
  screenShareChanging: boolean;
  host: boolean;
  onToggleMicrophone: () => void;
  onToggleCamera: () => void;
  onToggleScreenShare: () => void;
  onOpenSettings?: () => void;
  onLeave: () => void;
}) {
  return (
    <div className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-card p-2 sm:gap-3">
      <MediaControls
        microphoneEnabled={microphoneEnabled}
        cameraEnabled={cameraEnabled}
        microphoneChanging={microphoneChanging}
        cameraChanging={cameraChanging}
        cameraPaused={screenSharing || screenShareChanging}
        onToggleMicrophone={onToggleMicrophone}
        onToggleCamera={onToggleCamera}
      />
      <ControlButton
        label={
          !screenShareSupported
            ? "Screen sharing is unavailable in this browser"
            : screenSharing
              ? "Stop sharing"
              : screenShareChanging
                ? "Changing shared screen"
                : "Share screen"
        }
        icon={MonitorUp}
        active={screenSharing}
        activeTone="accent"
        disabled={
          !screenShareReady || !screenShareSupported || screenShareChanging
        }
        onClick={onToggleScreenShare}
      />
      {onOpenSettings && (
        <ControlButton
          label="Call settings"
          icon={Settings}
          onClick={onOpenSettings}
        />
      )}
      <AlertDialog>
        <AlertDialogTrigger
          render={
            <Button
              size="icon-lg"
              aria-label={host ? "End room" : "Leave call"}
              className="ml-2 h-11 w-14 rounded-xl bg-red-600 text-white hover:bg-red-500 sm:ml-4"
            />
          }
        >
          <PhoneOff />
        </AlertDialogTrigger>
        <AlertDialogContent className="dark">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {host ? "End this support room?" : "Leave this support call?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {host
                ? "The customer will be disconnected and the invitation will stop working."
                : "Your camera and microphone will be released."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Stay in call</AlertDialogCancel>
            <AlertDialogAction
              onClick={onLeave}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {host ? "End room" : "Leave call"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function MediaControls({
  microphoneEnabled,
  cameraEnabled,
  microphoneChanging = false,
  cameraChanging = false,
  cameraPaused = false,
  onToggleMicrophone,
  onToggleCamera,
}: {
  microphoneEnabled: boolean;
  cameraEnabled: boolean;
  microphoneChanging?: boolean;
  cameraChanging?: boolean;
  cameraPaused?: boolean;
  onToggleMicrophone: () => void;
  onToggleCamera: () => void;
}) {
  return (
    <>
      <ControlButton
        label={
          microphoneChanging
            ? "Changing microphone"
            : microphoneEnabled
              ? "Mute microphone"
              : "Unmute microphone"
        }
        icon={microphoneEnabled ? Mic : MicOff}
        active={!microphoneEnabled}
        busy={microphoneChanging}
        disabled={microphoneChanging}
        onClick={onToggleMicrophone}
      />
      <ControlButton
        label={
          cameraChanging
            ? "Changing camera"
            : cameraPaused
              ? "Camera controls are paused while presenting"
              : cameraEnabled
                ? "Turn off camera"
                : "Turn on camera"
        }
        icon={cameraEnabled ? Camera : VideoOff}
        active={!cameraEnabled && !cameraPaused}
        busy={cameraChanging}
        disabled={cameraChanging || cameraPaused}
        onClick={onToggleCamera}
      />
    </>
  );
}

function ControlButton({
  label,
  icon: Icon,
  active = false,
  activeTone = "danger",
  disabled = false,
  busy = false,
  onClick,
}: {
  label: string;
  icon: LucideIcon;
  active?: boolean;
  activeTone?: "danger" | "accent";
  disabled?: boolean;
  busy?: boolean;
  onClick?: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span className="inline-flex">
            <Button
              size="icon-lg"
              variant="ghost"
              aria-label={label}
              aria-busy={busy}
              disabled={disabled}
              onClick={onClick}
              className={cn(
                "size-11 rounded-xl border-0 bg-secondary text-foreground hover:bg-secondary/70 hover:text-foreground",
                active &&
                  activeTone === "danger" &&
                  "bg-red-400/15 text-red-300 hover:bg-red-400/25",
                active &&
                  activeTone === "accent" &&
                  "bg-primary text-primary-foreground hover:bg-primary/80 hover:text-primary-foreground",
              )}
            >
              {busy ? <Loader2 className="animate-spin" /> : <Icon />}
            </Button>
          </span>
        }
      />
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
