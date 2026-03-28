import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQueryClient } from "@tanstack/react-query";
import { Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import {
  BarChart2,
  Calendar,
  CalendarRange,
  Clock,
  Download,
  Gift,
  LayoutDashboard,
  LogOut,
  Palette,
} from "lucide-react";
import React, { useState } from "react";
import { useActor } from "../hooks/useActor";
import { useCustomTheme } from "../hooks/useCustomTheme";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useOfflineSync } from "../hooks/useOfflineSync";
import { useGetCallerUserProfile } from "../hooks/useQueries";
import SkyBackground from "./SkyBackground";
import SyncStatusIndicator from "./SyncStatusIndicator";
import ThemeCustomizer from "./ThemeCustomizer";
import ThemeToggle from "./ThemeToggle";

const NAV_ITEMS = [
  { path: "/", label: "Today", icon: Clock },
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/leaves", label: "Leaves", icon: Calendar },
  { path: "/comp-off", label: "Comp Off", icon: Gift },
  { path: "/holidays", label: "Holidays", icon: CalendarRange },
  { path: "/analytics", label: "Analytics", icon: BarChart2 },
  { path: "/export", label: "Export", icon: Download },
];

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { clear, identity } = useInternetIdentity();
  const queryClient = useQueryClient();
  const { data: userProfile } = useGetCallerUserProfile();
  const { actor } = useActor();
  const { syncStatus, pendingCount } = useOfflineSync(actor);
  const [showThemeCustomizer, setShowThemeCustomizer] = useState(false);

  useCustomTheme();

  const handleLogout = async () => {
    await clear();
    queryClient.clear();
  };

  const initials = userProfile?.name
    ? userProfile.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : identity?.getPrincipal().toString().slice(0, 2).toUpperCase() || "U";

  const currentPage =
    NAV_ITEMS.find((item) => item.path === location.pathname)?.label ||
    "SwipeTrack Pro";

  return (
    <div className="flex flex-col min-h-screen bg-background max-w-md mx-auto relative">
      {/* Animated sky background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <SkyBackground />
      </div>

      {/* iOS Navigation Bar */}
      <header className="ios-navbar relative z-40">
        {/* Left: logo */}
        <div className="flex items-center gap-2 w-16">
          <img
            src="/assets/generated/swipetrack-icon.dim_256x256.png"
            alt="SwipeTrack Pro"
            className="w-7 h-7 rounded-xl"
          />
        </div>

        {/* Center: page title */}
        <div className="flex flex-col items-center flex-1">
          <h1 className="text-[17px] font-semibold text-foreground leading-none">
            {currentPage}
          </h1>
          <div className="mt-0.5">
            <SyncStatusIndicator
              status={syncStatus}
              pendingCount={pendingCount}
            />
          </div>
        </div>

        {/* Right: controls */}
        <div className="flex items-center gap-1 w-16 justify-end">
          <ThemeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="tap-target flex items-center justify-center"
              >
                <Avatar className="w-7 h-7">
                  <AvatarFallback
                    className="text-[11px] font-bold"
                    style={{
                      backgroundColor: "oklch(var(--primary) / 0.15)",
                      color: "oklch(var(--primary))",
                    }}
                  >
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 rounded-xl">
              <div className="px-3 py-2.5">
                <p className="text-sm font-semibold text-foreground truncate">
                  {userProfile?.name || "User"}
                </p>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {identity?.getPrincipal().toString().slice(0, 20)}...
                </p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                data-ocid="theme.open_modal_button"
                onClick={() => setShowThemeCustomizer(true)}
                className="cursor-pointer py-2.5"
              >
                <Palette className="w-4 h-4 mr-2" />
                Customize Theme
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-destructive focus:text-destructive py-2.5"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-[83px] relative z-10">
        <Outlet />
      </main>

      {/* iOS Tab Bar */}
      <nav
        className="ios-tabbar left-1/2 -translate-x-1/2"
        style={{ left: "50%", transform: "translateX(-50%)" }}
      >
        <div className="ios-tabbar-inner">
          {NAV_ITEMS.map(({ path, label, icon: Icon }) => {
            const isActive = location.pathname === path;
            return (
              <button
                type="button"
                key={path}
                onClick={() => navigate({ to: path })}
                className="flex flex-col items-center gap-0.5 px-2 py-1"
                style={{ minWidth: 44, minHeight: 44 }}
                data-ocid={`nav.${label.toLowerCase().replace(" ", "-")}.link`}
              >
                <Icon
                  className="mb-0.5"
                  style={{
                    width: 25,
                    height: 25,
                    color: isActive
                      ? "oklch(var(--primary))"
                      : "oklch(var(--muted-foreground))",
                    strokeWidth: isActive ? 2.2 : 1.7,
                  }}
                />
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: isActive ? 600 : 400,
                    color: isActive
                      ? "oklch(var(--primary))"
                      : "oklch(var(--muted-foreground))",
                    lineHeight: 1,
                  }}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Theme Customizer Sheet */}
      <ThemeCustomizer
        open={showThemeCustomizer}
        onClose={() => setShowThemeCustomizer(false)}
      />
    </div>
  );
}
