import { Bell, KeyRound, Save, ShieldCheck, UserRound } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function SettingsPage() {
  return (
    <AppShell title="Settings" description="Account and workspace preferences" actions={<Button><Save />Save changes</Button>}>
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <section><h2 className="text-[1.75rem] font-semibold leading-tight">Workspace settings</h2><p className="mt-2 text-muted-foreground">Manage your agent profile, call defaults, and notifications.</p></section>
        <Tabs defaultValue="profile" orientation="vertical" className="items-start gap-6 md:grid md:grid-cols-[190px_1fr]">
          <TabsList variant="line" className="w-full justify-start overflow-x-auto md:h-auto md:flex-col md:items-stretch">
            <TabsTrigger value="profile" className="justify-start md:flex-none"><UserRound />Profile</TabsTrigger>
            <TabsTrigger value="calls" className="justify-start md:flex-none"><ShieldCheck />Call defaults</TabsTrigger>
            <TabsTrigger value="notifications" className="justify-start md:flex-none"><Bell />Notifications</TabsTrigger>
            <TabsTrigger value="security" className="justify-start md:flex-none"><KeyRound />Security</TabsTrigger>
          </TabsList>
          <TabsContent value="profile"><SettingsCard title="Agent profile" description="Shown to customers during a support session."><div className="mb-6 flex items-center gap-4"><Avatar className="size-14"><AvatarFallback className="bg-primary/10 text-lg font-semibold text-primary">AM</AvatarFallback></Avatar><div><Button variant="outline">Change photo</Button><p className="mt-1.5 text-xs text-muted-foreground">JPG or PNG, up to 2 MB.</p></div></div><FieldGroup><div className="grid gap-5 sm:grid-cols-2"><Field><FieldLabel htmlFor="first-name">First name</FieldLabel><Input id="first-name" defaultValue="Alex" /></Field><Field><FieldLabel htmlFor="last-name">Last name</FieldLabel><Input id="last-name" defaultValue="Morgan" /></Field></div><Field><FieldLabel htmlFor="email">Work email</FieldLabel><Input id="email" type="email" defaultValue="alex@supportroom.dev" /><FieldDescription>Contact an administrator to change your email.</FieldDescription></Field><Field><FieldLabel htmlFor="role">Role</FieldLabel><Input id="role" defaultValue="Support agent" /></Field></FieldGroup></SettingsCard></TabsContent>
          <TabsContent value="calls"><SettingsCard title="Call defaults" description="Applied when you create a new support room."><div className="space-y-5"><ToggleRow label="Start with camera on" description="Enable your camera when entering a room." defaultChecked /><ToggleRow label="Start with microphone on" description="Enable your microphone when entering a room." defaultChecked /><Separator /><Field><FieldLabel>Video quality</FieldLabel><Select defaultValue="720"><SelectTrigger className="w-full sm:w-56"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="720">HD · 720p</SelectItem><SelectItem value="1080">Full HD · 1080p</SelectItem><SelectItem value="auto">Automatic</SelectItem></SelectContent></Select><FieldDescription>Automatic may reduce quality on slower networks.</FieldDescription></Field></div></SettingsCard></TabsContent>
          <TabsContent value="notifications"><SettingsCard title="Notifications" description="Choose when SupportRoom gets your attention."><div className="space-y-5"><ToggleRow label="Customer enters waiting room" description="Play a sound and show a browser notification." defaultChecked /><ToggleRow label="Connection quality drops" description="Alert when packet loss or latency crosses a threshold." defaultChecked /><ToggleRow label="Session summary ready" description="Email a link to the completed diagnostic report." /><ToggleRow label="Weekly activity summary" description="Receive a summary every Monday morning." /></div></SettingsCard></TabsContent>
          <TabsContent value="security"><SettingsCard title="Security" description="Protect your account and support sessions."><div className="space-y-5"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><p className="text-sm font-medium">Password</p><p className="text-sm text-muted-foreground">Last changed 42 days ago</p></div><Button variant="outline">Change password</Button></div><Separator /><ToggleRow label="Two-factor authentication" description="Require a code when signing in from a new device." defaultChecked /><Separator /><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><p className="text-sm font-medium">Active sessions</p><p className="text-sm text-muted-foreground">You are signed in on 2 devices.</p></div><Button variant="outline">Manage sessions</Button></div></div></SettingsCard></TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}

function SettingsCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) { return <Card className="border shadow-sm ring-0"><CardHeader className="border-b"><CardTitle>{title}</CardTitle><CardDescription>{description}</CardDescription></CardHeader><CardContent>{children}</CardContent></Card>; }
function ToggleRow({ label, description, defaultChecked = false }: { label: string; description: string; defaultChecked?: boolean }) { return <div className="flex items-start justify-between gap-6"><div><p className="text-sm font-medium">{label}</p><p className="mt-0.5 text-sm leading-5 text-muted-foreground">{description}</p></div><Switch defaultChecked={defaultChecked} aria-label={label} /></div>; }
