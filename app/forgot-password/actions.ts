"use server";

import { getSiteUrl, isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export type ForgotPasswordState = {
  status: "idle" | "success" | "error";
  message: string | null;
};

export async function requestPasswordReset(
  _state: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email || !email.includes("@") || email.length > 254) {
    return { status: "error", message: "Enter a valid email address." };
  }
  if (!isSupabaseConfigured()) {
    return { status: "error", message: "Supabase authentication is not configured." };
  }

  let siteUrl: string;
  try { siteUrl = getSiteUrl(); }
  catch { return { status: "error", message: "Password recovery is not configured for this deployment." }; }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/callback?next=/reset-password`,
  });
  if (error) return { status: "error", message: "We could not send the recovery email. Please try again later." };

  return {
    status: "success",
    message: "If an agent account exists for that address, a password recovery email is on its way.",
  };
}
