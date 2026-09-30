import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AgentIdentityProvider, type AgentIdentity } from "@/components/auth/agent-identity";
import { defaultCallDefaults, parseCallDefaults } from "@/lib/media/call-defaults";
import { defaultNotificationPreferences, parseNotificationPreferences } from "@/lib/notifications/preferences";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export default async function AgentLayout({ children }: { children: ReactNode }) {
  if (process.env.SUPPORTROOM_E2E === "1" || !isSupabaseConfigured()) {
    return <AgentIdentityProvider value={developmentAgent}>{children}</AgentIdentityProvider>;
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) redirect("/login");

  const claims = data.claims as Record<string, unknown>;
  const metadata = typeof claims.user_metadata === "object" && claims.user_metadata !== null
    ? claims.user_metadata as Record<string, unknown>
    : {};
  const email = typeof claims.email === "string" ? claims.email : "Signed-in agent";
  const name = firstString(metadata.full_name, metadata.name) ?? email.split("@")[0] ?? "Support agent";
  const identity: AgentIdentity = {
    id: String(claims.sub),
    name,
    email,
    initials: initials(name),
    callDefaults: parseCallDefaults(metadata.call_defaults),
    notificationPreferences: parseNotificationPreferences(metadata.notification_preferences),
  };

  return <AgentIdentityProvider value={identity}>{children}</AgentIdentityProvider>;
}

const developmentAgent: AgentIdentity = {
  id: "development-agent",
  name: "Alex Morgan",
  email: "alex@supportroom.dev",
  initials: "AM",
  callDefaults: defaultCallDefaults,
  notificationPreferences: defaultNotificationPreferences,
};

function firstString(...values: unknown[]) {
  return values.find((value): value is string => typeof value === "string" && value.trim().length > 0)?.trim();
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? `${parts[0][0]}${parts.at(-1)?.[0] ?? ""}` : parts[0]?.slice(0, 2) ?? "SA").toUpperCase();
}
