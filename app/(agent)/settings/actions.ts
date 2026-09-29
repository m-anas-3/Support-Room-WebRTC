"use server";

import { revalidatePath } from "next/cache";

import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export type ProfileSettingsState = {
  status: "idle" | "success" | "error";
  message: string | null;
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
