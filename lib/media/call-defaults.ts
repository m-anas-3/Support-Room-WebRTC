export const videoQualities = ["auto", "720", "1080"] as const;

export type VideoQuality = (typeof videoQualities)[number];

export type CallDefaults = {
  cameraEnabled: boolean;
  microphoneEnabled: boolean;
  videoQuality: VideoQuality;
};

export const defaultCallDefaults: CallDefaults = {
  cameraEnabled: true,
  microphoneEnabled: true,
  videoQuality: "720",
};

export function parseCallDefaults(value: unknown): CallDefaults {
  if (!value || typeof value !== "object") return defaultCallDefaults;
  const defaults = value as Record<string, unknown>;
  const quality = defaults.video_quality;

  return {
    cameraEnabled: typeof defaults.camera_enabled === "boolean"
      ? defaults.camera_enabled
      : defaultCallDefaults.cameraEnabled,
    microphoneEnabled: typeof defaults.microphone_enabled === "boolean"
      ? defaults.microphone_enabled
      : defaultCallDefaults.microphoneEnabled,
    videoQuality: typeof quality === "string" && isVideoQuality(quality)
      ? quality
      : defaultCallDefaults.videoQuality,
  };
}

export function isVideoQuality(value: string): value is VideoQuality {
  return videoQualities.some((quality) => quality === value);
}
