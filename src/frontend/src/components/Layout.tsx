import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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
import { useIncomingCall } from "@/hooks/useIncomingCall";
import { useMyProfile } from "@/hooks/useQueries";
import { shortPrincipal } from "@/lib/format";
import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import { Link, Outlet } from "@tanstack/react-router";
import { LogOut, MessageSquare, UserCircle, Users, Video } from "lucide-react";

const NAV_ITEMS = [
  {
    label: "Conversations",
    to: "/conversations",
    icon: MessageSquare,
    ocid: "nav_conversations",
  },
  {
    label: "Directory",
    to: "/directory",
    icon: Users,
    ocid: "nav_directory",
  },
  {
    label: "Profile",
    to: "/profile",
    icon: UserCircle,
    ocid: "nav_profile",
  },
] as const;

function BrandHeader() {
  return (
    <div className="flex items-center gap-2 px-2 py-1">
      <div className="bg-gradient-primary flex size-9 items-center justify-center rounded-xl">
        <Video className="size-5 text-white" />
      </div>
      <div className="leading-tight">
        <p className="font-display text-base font-bold tracking-tight">
          REALCHAT
        </p>
        <p className="text-muted-foreground text-[11px] font-medium uppercase tracking-widest">
          Talk live
        </p>
      </div>
    </div>
  );
}

function AppShell() {
  const { clear } = useInternetIdentity();
  const { data: profile } = useMyProfile();
  useIncomingCall();

  const displayName = profile?.displayName || "You";
  const avatar = profile?.avatar;

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <BrandHeader />
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Menu</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {NAV_ITEMS.map((item) => (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton
                      asChild
                      tooltip={item.label}
                      data-ocid={item.ocid}
                    >
                      <Link to={item.to}>
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                tooltip="Profile"
                data-ocid="nav_profile_footer"
              >
                <Link to="/profile">
                  <Avatar className="size-6">
                    {avatar ? (
                      <AvatarImage src={avatar} alt={displayName} />
                    ) : null}
                    <AvatarFallback className="bg-primary text-primary-foreground text-[10px]">
                      {displayName.slice(0, 1).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="min-w-0">
                    <span className="block truncate">{displayName}</span>
                    <span className="text-muted-foreground block truncate text-xs">
                      {profile ? shortPrincipal(profile.id) : ""}
                    </span>
                  </span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                tooltip="Sign out"
                data-ocid="logout_button"
              >
                <button type="button" onClick={clear}>
                  <LogOut />
                  <span>Sign out</span>
                </button>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SidebarInset>
        <header className="bg-card/80 flex h-14 items-center gap-2 border-b px-4">
          <SidebarTrigger data-ocid="sidebar_toggle" />
          <span className="text-muted-foreground text-sm font-medium">
            REALCHAT
          </span>
        </header>
        <main className="flex-1 overflow-hidden">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

function LoginScreen() {
  const { login, isLoggingIn } = useInternetIdentity();

  return (
    <div className="bg-gradient-subtle flex min-h-svh items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="bg-card shadow-elevated rounded-2xl border p-8">
          <div className="mb-6 flex flex-col items-center gap-3 text-center">
            <div className="bg-gradient-primary flex size-14 items-center justify-center rounded-2xl">
              <Video className="size-7 text-white" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight">
                REALCHAT
              </h1>
              <p className="text-muted-foreground mt-1 text-sm">
                Real-time chat and video calls, made simple.
              </p>
            </div>
          </div>
          <Button
            type="button"
            size="lg"
            className="w-full rounded-full"
            onClick={() => login()}
            disabled={isLoggingIn}
            data-ocid="login_button"
          >
            {isLoggingIn ? "Signing in…" : "Sign in with Internet Identity"}
          </Button>
          <p className="text-muted-foreground mt-4 text-center text-xs">
            Sign in to start conversations and make video calls.
          </p>
        </div>
        <footer className="text-muted-foreground mt-6 text-center text-xs">
          © {new Date().getFullYear()}. Built with love using{" "}
          <a
            href="https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=realchat"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2"
          >
            caffeine.ai
          </a>
          .
        </footer>
      </div>
    </div>
  );
}

export function Layout() {
  const { isAuthenticated, isInitializing } = useInternetIdentity();

  if (isInitializing) {
    return (
      <div className="bg-background flex min-h-svh items-center justify-center">
        <div className="bg-muted size-10 animate-pulse rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return <AppShell />;
}
