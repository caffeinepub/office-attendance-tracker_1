import { useQueryClient } from "@tanstack/react-query";
import type React from "react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import LoginScreen from "./LoginScreen";

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { identity, isInitializing } = useInternetIdentity();
  const _queryClient = useQueryClient();
  const isAuthenticated = !!identity;

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <img
            src="/assets/generated/swipetrack-icon.dim_256x256.png"
            alt="SwipeTrack Pro"
            className="w-16 h-16 rounded-2xl shadow-elevated animate-pulse"
          />
          <p className="text-muted-foreground text-sm font-medium">
            Loading...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return <>{children}</>;
}
