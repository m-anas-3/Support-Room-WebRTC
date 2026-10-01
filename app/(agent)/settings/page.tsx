"use client";

import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { useAgentIdentity } from "@/components/auth/agent-identity";
import { AccountSecurity } from "@/components/settings/account-security";
import { CallDefaultsForm } from "@/components/settings/call-defaults-form";
import { ProfileSettingsForm } from "@/components/settings/profile-settings-form";

export default function SettingsPage() {
  const agent = useAgentIdentity();
  return (
    <AppShell title="Settings">
      <div className="page-stack">
        <PageHeader
          title="Settings"
          description="Just the essentials for your support calls."
        />
        <div className="w-full divide-y rounded-2xl border bg-white px-5 sm:px-7">
          <SettingsSection
            title="Your name"
            description="The name your customer sees when you join a call."
          >
            <ProfileSettingsForm agent={agent} />
          </SettingsSection>
          <SettingsSection
            title="Call defaults"
            description="Choose how you start each new call."
          >
            <CallDefaultsForm agent={agent} />
          </SettingsSection>
          <SettingsSection
            title="Password"
            description="Keep your account secure with a unique password."
          >
            <AccountSecurity />
          </SettingsSection>
        </div>
      </div>
    </AppShell>
  );
}

function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid min-w-0 gap-6 py-7 md:grid-cols-[200px_minmax(0,1fr)] md:gap-10">
      <div>
        <h2 className="text-base font-medium">{title}</h2>
        <p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}
