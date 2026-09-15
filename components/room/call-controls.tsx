"use client";

import { Camera, Mic, MicOff, MonitorUp, PhoneOff, VideoOff, type LucideIcon } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function CallControls({ microphoneEnabled, cameraEnabled, mediaReady, screenShareReady, screenSharing, screenShareSupported, screenShareChanging, host, onToggleMicrophone, onToggleCamera, onToggleScreenShare, onLeave }: {
  microphoneEnabled: boolean;
  cameraEnabled: boolean;
  mediaReady: boolean;
  screenShareReady: boolean;
  screenSharing: boolean;
  screenShareSupported: boolean;
  screenShareChanging: boolean;
  host: boolean;
  onToggleMicrophone: () => void;
  onToggleCamera: () => void;
  onToggleScreenShare: () => void;
  onLeave: () => void;
}) {
  return <div className="flex flex-wrap items-center justify-center gap-2">
    <ControlButton label={microphoneEnabled ? "Mute microphone" : "Unmute microphone"} icon={microphoneEnabled ? Mic : MicOff} active={!microphoneEnabled} disabled={!mediaReady} onClick={onToggleMicrophone} />
    <ControlButton label={screenSharing ? "Camera controls are paused while presenting" : cameraEnabled ? "Turn off camera" : "Turn on camera"} icon={cameraEnabled ? Camera : VideoOff} active={!cameraEnabled && !screenSharing} disabled={!mediaReady || screenSharing || screenShareChanging} onClick={onToggleCamera} />
    <ControlButton label={!screenShareSupported ? "Screen sharing is unavailable in this browser" : screenSharing ? "Stop sharing" : screenShareChanging ? "Changing shared screen" : "Share screen"} icon={MonitorUp} active={screenSharing} disabled={!screenShareReady || !screenShareSupported || screenShareChanging} onClick={onToggleScreenShare} />
    <AlertDialog>
      <AlertDialogTrigger render={<Button size="icon-lg" aria-label={host ? "End room" : "Leave call"} className="ml-2 rounded-full bg-red-600 text-white hover:bg-red-700" />}><PhoneOff /></AlertDialogTrigger>
      <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{host ? "End this support room?" : "Leave this support call?"}</AlertDialogTitle><AlertDialogDescription>{host ? "The customer will be disconnected and the invitation will stop working." : "Your camera and microphone will be released."}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Stay in call</AlertDialogCancel><AlertDialogAction onClick={onLeave} className="bg-red-600 text-white hover:bg-red-700">{host ? "End room" : "Leave call"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
    </AlertDialog>
  </div>;
}

function ControlButton({ label, icon: Icon, active = false, disabled = false, onClick }: { label: string; icon: LucideIcon; active?: boolean; disabled?: boolean; onClick?: () => void }) {
  return <Tooltip><TooltipTrigger render={<span className="inline-flex"><Button size="icon-lg" variant="ghost" aria-label={label} disabled={disabled} onClick={onClick} className={`rounded-full border border-white/10 text-white hover:bg-white/10 hover:text-white ${active ? "bg-white text-slate-950 hover:bg-slate-100 hover:text-slate-950" : "bg-white/5"}`}><Icon /></Button></span>} /><TooltipContent>{label}</TooltipContent></Tooltip>;
}
