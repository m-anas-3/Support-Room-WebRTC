"use client";

import { Bell, KeyRound, ShieldCheck, UserRound } from "lucide-react";

import { useAgentIdentity } from "@/components/auth/agent-identity";
import { AppShell } from "@/components/layout/app-shell";
import { AccountSecurity } from "@/components/settings/account-security";
import { CallDefaultsForm } from "@/components/settings/call-defaults-form";
import { ProfileSettingsForm } from "@/components/settings/profile-settings-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function SettingsPage() {
  const agent = useAgentIdentity();
  return (
    <AppShell title="Settings" description="Account and workspace preferences">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <section><h2 className="text-[1.75rem] font-semibold leading-tight">Workspace settings</h2><p className="mt-2 text-muted-foreground">Manage your agent profile, call defaults, and notifications.</p></section>
        <Tabs defaultValue="profile" orientation="vertical" className="items-start gap-6 md:grid md:grid-cols-[190px_1fr]">
          <TabsList variant="line" className="w-full justify-start overflow-x-auto md:h-auto md:flex-col md:items-stretch">
            <TabsTrigger value="profile" className="justify-start md:flex-none"><UserRound />Profile</TabsTrigger>
            <TabsTrigger value="calls" className="justify-start md:flex-none"><ShieldCheck />Call defaults</TabsTrigger>
            <TabsTrigger value="notifications" className="justify-start md:flex-none"><Bell />Notifications</TabsTrigger>
            <TabsTrigger value="security" className="justify-start md:flex-none"><KeyRound />Security</TabsTrigger>
          </TabsList>
          <TabsContent value="profile"><SettingsCard title="Agent profile" description="Shown to customers during a support session."><ProfileSettingsForm agent={agent} /></SettingsCard></TabsContent>
          <TabsContent value="calls"><SettingsCard title="Call defaults" description="Applied when you prepare your devices in a new support room."><CallDefaultsForm agent={agent} /></SettingsCard></TabsContent>
          <TabsContent value="notifications"><SettingsCard title="Notifications" description="Choose when SupportRoom gets your attention."><div className="space-y-5"><ToggleRow label="Customer enters waiting room" description="Play a sound and show a browser notification." defaultChecked /><ToggleRow label="Connection quality drops" description="Alert when packet loss or latency crosses a threshold." defaultChecked /><ToggleRow label="Session summary ready" description="Email a link to the completed diagnostic report." /><ToggleRow label="Weekly activity summary" description="Receive a summary every Monday morning." /></div></SettingsCard></TabsContent>
          <TabsContent value="security"><SettingsCard title="Account security" description="Update your password and revoke access from other devices."><AccountSecurity /></SettingsCard></TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}

function SettingsCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) { return <Card className="border shadow-sm ring-0"><CardHeader className="border-b"><CardTitle>{title}</CardTitle><CardDescription>{description}</CardDescription></CardHeader><CardContent>{children}</CardContent></Card>; }
function ToggleRow({ label, description, defaultChecked = false }: { label: string; description: string; defaultChecked?: boolean }) { return <div className="flex items-start justify-between gap-6"><div><p className="text-sm font-medium">{label}</p><p className="mt-0.5 text-sm leading-5 text-muted-foreground">{description}</p></div><Switch defaultChecked={defaultChecked} aria-label={label} /></div>; }
