"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  Activity,
  ChevronsUpDown,
  CircleHelp,
  History,
  LayoutDashboard,
  LogOut,
  Settings,
  ShieldCheck,
  Video,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";

const primaryNav = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/playground", label: "Device check", icon: Video },
  { href: "/sessions", label: "Sessions", icon: History },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({ title, description, actions, children }: { title: string; description?: string; actions?: ReactNode; children: ReactNode }) {
  const pathname = usePathname();

  return (
    <SidebarProvider className="app-surface">
      <Sidebar collapsible="icon" className="border-r bg-white">
        <SidebarHeader className="h-16 flex-row items-center border-b px-3">
          <Link href="/dashboard" className="flex min-w-0 flex-1 items-center gap-2.5 overflow-hidden px-1 group-data-[collapsible=icon]:justify-center">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground"><Video className="size-4" /></span>
            <span className="truncate text-base font-semibold tracking-[-0.025em]">SupportRoom</span>
          </Link>
          <SidebarTrigger className="ml-auto shrink-0 text-muted-foreground group-data-[collapsible=icon]:hidden" />
        </SidebarHeader>
        <SidebarContent className="py-3">
          <SidebarGroup>
            <SidebarGroupLabel>Workspace</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {primaryNav.map(({ href, label, icon: Icon }) => (
                  <SidebarMenuItem key={href}>
                    <SidebarMenuButton
                      render={<Link href={href} />}
                      isActive={pathname === href || (href === "/sessions" && pathname.startsWith("/sessions/"))}
                      tooltip={label}
                      className="h-10 font-medium"
                    >
                      <Icon /><span>{label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="border-t p-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger render={<SidebarMenuButton size="lg" className="h-12" />}>
                  <Avatar size="sm"><AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">AM</AvatarFallback></Avatar>
                  <span className="grid flex-1 text-left text-xs leading-tight"><span className="truncate font-medium">Alex Morgan</span><span className="truncate text-muted-foreground">Support agent</span></span>
                  <ChevronsUpDown className="ml-auto size-3.5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent side="top" align="start" className="w-56">
                  <DropdownMenuLabel>alex@supportroom.dev</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem render={<Link href="/settings" />}><Settings />Account settings</DropdownMenuItem>
                  <DropdownMenuItem><CircleHelp />Help center</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" render={<Link href="/login" />}><LogOut />Sign out</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset className="min-w-0 bg-[#f7f8fa]">
        <header className="sticky top-0 z-20 flex min-h-16 items-center gap-3 border-b bg-white/95 px-4 backdrop-blur sm:px-6">
          <SidebarTrigger className="md:hidden md:peer-data-[state=collapsed]:inline-flex" />
          <Separator orientation="vertical" className="h-5 md:hidden md:peer-data-[state=collapsed]:block" />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-semibold">{title}</h1>
            {description && <p className="hidden truncate text-xs text-muted-foreground sm:block">{description}</p>}
          </div>
          <Badge variant="outline" className="hidden gap-1.5 bg-white font-normal text-muted-foreground sm:flex"><ShieldCheck className="size-3.5 text-emerald-600" />Secure workspace</Badge>
          {actions}
        </header>
        <div className="app-page flex-1 p-5 sm:p-7 lg:p-9">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}

export function StatusPill({ label = "Live" }: { label?: string }) {
  return <Badge variant="outline" className="gap-1.5 bg-white font-normal"><Activity className="size-3.5 text-emerald-600" />{label}</Badge>;
}
