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
  Clock,
  Download,
  LayoutDashboard,
  LogOut,
  User,
} from "lucide-react";
import React from "react";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useOfflineSync } from "../hooks/useOfflineSync";
import { useGetCallerUserProfile } from "../hooks/useQueries";
import SyncStatusIndicator from "./SyncStatusIndicator";
import ThemeToggle from "./ThemeToggle";

const NAV_ITEMS = [
  { path: "/", label: "Today", icon: Clock },
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/leaves", label: "Leaves", icon: Calendar },
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

  return (
    <div className="flex flex-col min-h-screen bg-background max-w-md mx-auto relative">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border/50 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img
              src="/assets/generated/swipetrack-icon.dim_256x256.png"
              alt="SwipeTrack Pro"
              className="w-8 h-8 rounded-xl shadow-xs"
            />
            <div>
              <h1 className="text-sm font-display font-bold text-foreground leading-none">
                SwipeTrack Pro
              </h1>
              <div className="mt-0.5">
                <SyncStatusIndicator
                  status={syncStatus}
                  pendingCount={pendingCount}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="tap-target flex items-center justify-center rounded-xl hover:bg-secondary transition-colors"
                >
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 rounded-xl">
                <div className="px-3 py-2">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {userProfile?.name || "User"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {identity?.getPrincipal().toString().slice(0, 20)}...
                  </p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-24">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-40 bg-background/95 backdrop-blur-md border-t border-border/50 bottom-nav-safe">
        <div className="flex items-center justify-around px-2 py-2">
          {NAV_ITEMS.map(({ path, label, icon: Icon }) => {
            const isActive = location.pathname === path;
            return (
              <button
                type="button"
                key={path}
                onClick={() => navigate({ to: path })}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-200 tap-target ${
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <div
                  className={`p-1.5 rounded-lg transition-all duration-200 ${isActive ? "bg-primary/10" : ""}`}
                >
                  <Icon
                    className={`w-5 h-5 ${isActive ? "text-primary" : ""}`}
                  />
                </div>
                <span
                  className={`text-[10px] font-medium leading-none ${isActive ? "text-primary" : ""}`}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
