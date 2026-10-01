"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTransition, type ReactNode } from "react";
import {
  Activity,
  ChevronsUpDown,
  History,
  LayoutDashboard,
  LogOut,
  Loader2,
  Settings,
  Video,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAgentIdentity } from "@/components/auth/agent-identity";
import { signOut } from "@/app/login/actions";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Brand } from "@/components/layout/brand";
import { NavigationPending } from "@/components/layout/navigation-pending";
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

export function AppShell({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const agent = useAgentIdentity();
  const [signingOut, startSignOut] = useTransition();

  return (
    <SidebarProvider
      className="app-surface"
      style={
        {
          "--sidebar-width": "14rem",
          "--sidebar-width-icon": "4rem",
        } as React.CSSProperties
      }
    >
      <Sidebar collapsible="icon" className="border-r">
        <SidebarHeader className="h-14 justify-center border-b px-4 group-data-[collapsible=icon]:px-3">
          <Brand className="overflow-hidden [&>span:last-child]:group-data-[collapsible=icon]:hidden" />
        </SidebarHeader>
        <SidebarContent className="py-5">
          <SidebarGroup>
            <SidebarGroupLabel className="mb-2 text-[10px] uppercase tracking-[0.12em]">
              Workspace
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {primaryNav.map(({ href, label, icon: Icon }) => (
                  <SidebarMenuItem key={href}>
                    <SidebarMenuButton
                      render={<Link href={href} />}
                      isActive={
                        pathname === href ||
                        (href === "/sessions" &&
                          pathname.startsWith("/sessions/"))
                      }
                      tooltip={label}
                      className="h-10 gap-3 rounded-lg px-3 text-[13px] font-medium data-active:bg-white data-active:shadow-xs"
                    >
                      <Icon />
                      <span>{label}</span>
                      <NavigationPending />
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
                <DropdownMenuTrigger
                  aria-label="Account menu"
                  render={<SidebarMenuButton size="lg" className="h-12" />}
                >
                  <Avatar size="sm">
                    <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                      {agent.initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="grid flex-1 text-left text-xs leading-tight">
                    <span className="truncate font-medium">{agent.name}</span>
                    <span className="truncate text-muted-foreground">
                      Support agent
                    </span>
                  </span>
                  <ChevronsUpDown className="ml-auto size-3.5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent side="top" align="start" className="w-56">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>{agent.email}</DropdownMenuLabel>
                    <DropdownMenuItem render={<Link href="/settings" />}>
                      <Settings />
                      Account settings
                      <NavigationPending />
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    disabled={signingOut}
                    onClick={() =>
                      startSignOut(() => {
                        void signOut();
                      })
                    }
                  >
                    {signingOut ? (
                      <Loader2 className="animate-spin motion-reduce:animate-none" />
                    ) : (
                      <LogOut />
                    )}
                    {signingOut ? "Signing out…" : "Sign out"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset className="min-w-0 bg-background">
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur sm:px-6">
          <SidebarTrigger className="size-9 text-muted-foreground" />
          <span className="h-4 border-l" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium">{title}</p>
            <span className="sr-only">{description}</span>
          </div>
          {actions}
        </header>
        <div className="min-w-0 flex-1 px-4 py-7 sm:px-6 lg:px-8 lg:py-9">
          <div className="workspace-content">{children}</div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

export function StatusPill({ label = "Live" }: { label?: string }) {
  return (
    <Badge variant="outline" className="gap-1.5 bg-white font-normal">
      <Activity className="size-3.5 text-emerald-600" />
      {label}
    </Badge>
  );
}
