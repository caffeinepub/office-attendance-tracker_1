import { useState } from "react";
import { type AttendanceRecord, LeaveType } from "../backend";
import { useActor } from "./useActor";
import { useOfflineSync } from "./useOfflineSync";
import { useGetRecord, useSaveRecord } from "./useQueries";

function getTodayDateKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getCurrentTimeHHMM(): string {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function useQuickSwipe(onSuccess?: (message: string) => void) {
  const todayKey = getTodayDateKey();
  const { data: existingRecord } = useGetRecord(todayKey);
  const saveRecord = useSaveRecord();
  const { actor } = useActor();
  const { addToQueue, syncPending } = useOfflineSync(actor);

  const [isSwipeInPending, setIsSwipeInPending] = useState(false);
  const [isSwipeOutPending, setIsSwipeOutPending] = useState(false);

  const buildRecord = (
    isSwipeIn: boolean,
    timeStr: string,
  ): AttendanceRecord => {
    if (existingRecord) {
      return {
        ...existingRecord,
        ...(isSwipeIn ? { swipeIn: timeStr } : { swipeOut: timeStr }),
      };
    }
    // No existing record — create a fresh one
    return {
      date: todayKey,
      swipeIn: isSwipeIn ? timeStr : "",
      swipeOut: isSwipeIn ? "" : timeStr,
      breakfastAtOffice: false,
      leaveType: LeaveType.noLeave,
    };
  };

  const handleSwipeIn = async () => {
    if (isSwipeInPending) return;
    setIsSwipeInPending(true);
    const timeStr = getCurrentTimeHHMM();
    const record = buildRecord(true, timeStr);
    try {
      await saveRecord.mutateAsync(record);
      onSuccess?.(`Swipe In recorded: ${timeStr}`);
    } catch {
      addToQueue(record);
      syncPending();
      onSuccess?.(`Swipe In queued offline: ${timeStr}`);
    } finally {
      setIsSwipeInPending(false);
    }
  };

  const handleSwipeOut = async () => {
    if (isSwipeOutPending) return;
    setIsSwipeOutPending(true);
    const timeStr = getCurrentTimeHHMM();
    const record = buildRecord(false, timeStr);
    try {
      await saveRecord.mutateAsync(record);
      onSuccess?.(`Swipe Out recorded: ${timeStr}`);
    } catch {
      addToQueue(record);
      syncPending();
      onSuccess?.(`Swipe Out queued offline: ${timeStr}`);
    } finally {
      setIsSwipeOutPending(false);
    }
  };

  return {
    handleSwipeIn,
    handleSwipeOut,
    isSwipeInPending,
    isSwipeOutPending,
  };
}
