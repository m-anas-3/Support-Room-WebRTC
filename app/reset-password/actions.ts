"use server";

import { redirect } from "next/navigation";

import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export type ResetPasswordState = { error: string | null };

export async function resetPassword(
  _state: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("passwordConfirmation") ?? "");
  if (password.length < 8 || password.length > 128) return { error: "Use a password between 8 and 128 characters." };
  if (password !== confirmation) return { error: "The password confirmation does not match." };
  if (!isSupabaseConfigured()) return { error: "Supabase authentication is not configured." };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    if (error.code === "weak_password") return { error: "Choose a longer, less predictable password." };
    if (error.code === "same_password") return { error: "Choose a password you have not used for this account." };
    return { error: "This recovery link is invalid or expired. Request a new one." };
  }

  await supabase.auth.signOut({ scope: "local" });
  redirect("/login?password=updated");
}
