"use client";

import { Camera, Mic, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { useLocalMedia } from "@/hooks/use-local-media";

type DeviceController = Pick<ReturnType<typeof useLocalMedia>,
  | "devices"
  | "selectedCameraId"
  | "selectedMicrophoneId"
  | "selectedSpeakerId"
  | "cameraStatus"
  | "microphoneStatus"
  | "speakerSelectionSupported"
  | "speakerPromptSupported"
  | "speakerError"
  | "selectCamera"
  | "selectMicrophone"
  | "selectSpeaker"
  | "requestSpeaker"
>;

export function CallDeviceSettings({ media }: { media: DeviceController }) {
  const cameraChanging = media.cameraStatus === "requesting" || media.cameraStatus === "recovering";
  const microphoneChanging = media.microphoneStatus === "requesting" || media.microphoneStatus === "recovering";

  return (
    <div className="space-y-6">
      <DeviceField icon={Camera} label="Camera" description={cameraChanging ? "Switching camera…" : "Changing this replaces only your outgoing video track."}>
        <Select value={media.selectedCameraId || null} onValueChange={(value) => value && void media.selectCamera(value)} disabled={cameraChanging || !media.devices.cameras.length}>
          <SelectTrigger className="w-full"><SelectValue placeholder={media.devices.cameras.length ? "Select a camera" : "No camera available"} /></SelectTrigger>
          <SelectContent>{media.devices.cameras.map((device, index) => <SelectItem key={device.deviceId} value={device.deviceId}>{device.label || `Camera ${index + 1}`}</SelectItem>)}</SelectContent>
        </Select>
      </DeviceField>

      <DeviceField icon={Mic} label="Microphone" description={microphoneChanging ? "Switching microphone…" : "Your mute state is preserved when the input changes."}>
        <Select value={media.selectedMicrophoneId || null} onValueChange={(value) => value && void media.selectMicrophone(value)} disabled={microphoneChanging || !media.devices.microphones.length}>
          <SelectTrigger className="w-full"><SelectValue placeholder={media.devices.microphones.length ? "Select a microphone" : "No microphone available"} /></SelectTrigger>
          <SelectContent>{media.devices.microphones.map((device, index) => <SelectItem key={device.deviceId} value={device.deviceId}>{device.label || `Microphone ${index + 1}`}</SelectItem>)}</SelectContent>
        </Select>
      </DeviceField>

      <DeviceField
        icon={Volume2}
        label="Speaker"
        description={media.speakerSelectionSupported ? "Routes the other participant’s audio to this output." : "Use your device’s sound controls to choose an output in this browser."}
      >
        <Select value={media.selectedSpeakerId || "default"} onValueChange={(value) => value && media.selectSpeaker(value)} disabled={!media.speakerSelectionSupported}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="default">System default</SelectItem>
            {media.devices.speakers.filter((device) => device.deviceId !== "default").map((device, index) => <SelectItem key={device.deviceId} value={device.deviceId}>{device.label || `Speaker ${index + 1}`}</SelectItem>)}
          </SelectContent>
        </Select>
        {media.speakerPromptSupported && media.speakerSelectionSupported && <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => void media.requestSpeaker()}><Volume2 />Choose another speaker</Button>}
        {media.speakerError && <p role="alert" className="mt-2 text-xs leading-5 text-destructive">{media.speakerError}</p>}
      </DeviceField>

      <p className="rounded-lg bg-muted/60 px-3 py-2.5 text-xs leading-5 text-muted-foreground">Device choices stay in this browser and are reused for your next support call.</p>
    </div>
  );
}

function DeviceField({ icon: Icon, label, description, children }: { icon: typeof Camera; label: string; description: string; children: React.ReactNode }) {
  return (
    <Field>
      <div className="flex items-center gap-2"><Icon className="size-4 text-muted-foreground" /><FieldLabel>{label}</FieldLabel></div>
      {children}
      <FieldDescription>{description}</FieldDescription>
    </Field>
  );
}
