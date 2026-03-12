import { CheckCircle2, Cloud, CloudOff, RefreshCw } from "lucide-react";
import React from "react";
import type { SyncStatus } from "../hooks/useOfflineSync";

interface SyncStatusIndicatorProps {
  status: SyncStatus;
  pendingCount?: number;
}

export default function SyncStatusIndicator({
  status,
  pendingCount = 0,
}: SyncStatusIndicatorProps) {
  if (status === "synced") {
    return (
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <CheckCircle2 className="w-3 h-3 text-success" />
        <span className="hidden sm:inline">Synced</span>
      </div>
    );
  }

  if (status === "syncing") {
    return (
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <RefreshCw className="w-3 h-3 text-primary animate-spin" />
        <span className="hidden sm:inline">Syncing...</span>
      </div>
    );
  }

  if (status === "offline") {
    return (
      <div className="flex items-center gap-1 text-xs text-destructive">
        <CloudOff className="w-3 h-3" />
        <span className="hidden sm:inline">Offline</span>
      </div>
    );
  }

  if (status === "pending") {
    return (
      <div className="flex items-center gap-1 text-xs text-warning">
        <Cloud className="w-3 h-3 pulse-dot" />
        <span className="hidden sm:inline">{pendingCount} pending</span>
      </div>
    );
  }

  return null;
}
