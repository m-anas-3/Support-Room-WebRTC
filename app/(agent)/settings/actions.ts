"use server";

import { revalidatePath } from "next/cache";

import { isVideoQuality } from "@/lib/media/call-defaults";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export type ProfileSettingsState = {
  status: "idle" | "success" | "error";
  message: string | null;
};

export type CallDefaultsState = ProfileSettingsState;
export type AccountSecurityState = ProfileSettingsState & {
  reauthenticationRequired?: boolean;
};

export async function updateAgentProfile(
  _state: ProfileSettingsState,
  formData: FormData,
): Promise<ProfileSettingsState> {
  const fullName = String(formData.get("fullName") ?? "").trim().replace(/\s+/g, " ");

  if (fullName.length < 2 || fullName.length > 80) {
    return { status: "error", message: "Enter a name between 2 and 80 characters." };
  }

  if (!isSupabaseConfigured()) {
    return { status: "error", message: "Supabase authentication is not configured." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.updateUser({
    data: { full_name: fullName },
  });

  if (error || !data.user) {
    const sessionExpired = error?.code === "session_not_found" || error?.status === 401;
    return {
      status: "error",
      message: sessionExpired
        ? "Your session has expired. Sign in again before updating your profile."
        : "We could not update your profile. Please try again.",
    };
  }

  revalidatePath("/", "layout");
  return { status: "success", message: "Your profile has been updated." };
}

export async function updateCallDefaults(
  _state: CallDefaultsState,
  formData: FormData,
): Promise<CallDefaultsState> {
  const videoQuality = String(formData.get("videoQuality") ?? "");
  if (!isVideoQuality(videoQuality)) {
    return { status: "error", message: "Choose a supported video quality." };
  }

  if (!isSupabaseConfigured()) {
    return { status: "error", message: "Supabase authentication is not configured." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.updateUser({
    data: {
      call_defaults: {
        camera_enabled: formData.get("cameraEnabled") === "on",
        microphone_enabled: formData.get("microphoneEnabled") === "on",
        video_quality: videoQuality,
      },
    },
  });

  if (error || !data.user) {
    const sessionExpired = error?.code === "session_not_found" || error?.status === 401;
    return {
      status: "error",
      message: sessionExpired
        ? "Your session has expired. Sign in again before updating call defaults."
        : "We could not update your call defaults. Please try again.",
    };
  }

  revalidatePath("/", "layout");
  return { status: "success", message: "Your call defaults have been updated." };
}

export async function updatePassword(
  _state: AccountSecurityState,
  formData: FormData,
): Promise<AccountSecurityState> {
  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("passwordConfirmation") ?? "");
  const nonce = String(formData.get("nonce") ?? "").trim();

  if (password.length < 8 || password.length > 128) {
    return { status: "error", message: "Use a password between 8 and 128 characters." };
  }
  if (password !== confirmation) {
    return { status: "error", message: "The password confirmation does not match." };
  }
  if (nonce && !/^\d{6,8}$/.test(nonce)) {
    return { status: "error", message: "Enter the numeric verification code from your email." };
  }
  if (!isSupabaseConfigured()) {
    return { status: "error", message: "Supabase authentication is not configured." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password,
    ...(nonce ? { nonce } : {}),
  });

  if (error) {
    if (["reauth_nonce_missing", "reauthentication_needed"].includes(error.code ?? "")) {
      return {
        status: "error",
        message: "This password change requires a verification code. Send a code below, then try again.",
        reauthenticationRequired: true,
      };
    }
    if (error.code === "reauthentication_not_valid") {
      return { status: "error", message: "That verification code is invalid or expired. Send a new code and try again.", reauthenticationRequired: true };
    }
    if (error.code === "same_password") {
      return { status: "error", message: "Choose a password you have not used for this account." };
    }
    if (error.code === "weak_password") {
      return { status: "error", message: "Supabase rejected this password as too weak. Choose a longer, less predictable password." };
    }
    if (error.code === "session_not_found" || error.status === 401) {
      return { status: "error", message: "Your session has expired. Sign in again before changing your password." };
    }
    return { status: "error", message: "We could not update your password. Please try again." };
  }

  return { status: "success", message: "Your password has been updated." };
}

export async function requestPasswordReauthentication(
  _state: AccountSecurityState,
): Promise<AccountSecurityState> {
  void _state;
  if (!isSupabaseConfigured()) {
    return { status: "error", message: "Supabase authentication is not configured." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.reauthenticate();
  if (error) {
    const sessionExpired = error.code === "session_not_found" || error.status === 401;
    return {
      status: "error",
      message: sessionExpired
        ? "Your session has expired. Sign in again before requesting a verification code."
        : "We could not send a verification code. Please try again.",
    };
  }

  return { status: "success", message: "A verification code was sent to your confirmed email address." };
}

export async function signOutOtherSessions(
  _state: AccountSecurityState,
): Promise<AccountSecurityState> {
  void _state;
  if (!isSupabaseConfigured()) {
    return { status: "error", message: "Supabase authentication is not configured." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signOut({ scope: "others" });
  if (error) {
    const sessionExpired = error.code === "session_not_found" || error.status === 401;
    return {
      status: "error",
      message: sessionExpired
        ? "Your session has expired. Sign in again to manage other sessions."
        : "We could not sign out your other sessions. Please try again.",
    };
  }

  return { status: "success", message: "Other browser and device sessions have been signed out." };
}
