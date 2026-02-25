import { useState, useEffect, useCallback, useRef } from 'react';
import { AttendanceRecord } from '../backend';

const OFFLINE_QUEUE_KEY = 'swipetrack-offline-queue';

export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'pending';

interface PendingRecord {
  record: AttendanceRecord;
  timestamp: number;
}

function loadQueue(): PendingRecord[] {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as PendingRecord[];
  } catch {
    return [];
  }
}

function saveQueue(queue: PendingRecord[]) {
  try {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // ignore
  }
}

export function useOfflineSync(
  actor: { saveRecord: (r: AttendanceRecord) => Promise<void> } | null,
  onSyncComplete?: () => void
) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('synced');
  const [pendingCount, setPendingCount] = useState(0);
  const isSyncingRef = useRef(false);

  const updatePendingCount = useCallback(() => {
    const q = loadQueue();
    setPendingCount(q.length);
    if (q.length > 0) setSyncStatus('pending');
  }, []);

  useEffect(() => {
    updatePendingCount();
  }, [updatePendingCount]);

  const addToQueue = useCallback((record: AttendanceRecord) => {
    const queue = loadQueue();
    // Replace if same date exists
    const filtered = queue.filter(p => p.record.date !== record.date);
    filtered.push({ record, timestamp: Date.now() });
    saveQueue(filtered);
    setPendingCount(filtered.length);
    setSyncStatus('pending');
  }, []);

  const syncPending = useCallback(async () => {
    if (!actor || isSyncingRef.current) return;
    const queue = loadQueue();
    if (queue.length === 0) return;

    isSyncingRef.current = true;
    setSyncStatus('syncing');

    const remaining: PendingRecord[] = [];
    for (const pending of queue) {
      try {
        await actor.saveRecord(pending.record);
      } catch {
        remaining.push(pending);
      }
    }

    saveQueue(remaining);
    setPendingCount(remaining.length);
    isSyncingRef.current = false;

    if (remaining.length === 0) {
      setSyncStatus('synced');
      onSyncComplete?.();
    } else {
      setSyncStatus('pending');
    }
  }, [actor, onSyncComplete]);

  // Auto-sync when actor becomes available
  useEffect(() => {
    if (actor) {
      syncPending();
    }
  }, [actor, syncPending]);

  // Listen for online events
  useEffect(() => {
    const handleOnline = () => {
      if (actor) syncPending();
    };
    const handleOffline = () => setSyncStatus('offline');

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (!navigator.onLine) setSyncStatus('offline');

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [actor, syncPending]);

  return { syncStatus, pendingCount, addToQueue, syncPending };
}
