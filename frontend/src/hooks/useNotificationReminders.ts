import { useEffect, useRef } from 'react';

const SWIPE_IN_HOUR = 10;
const SWIPE_IN_MINUTE = 0;
const SWIPE_OUT_HOUR = 18;
const SWIPE_OUT_MINUTE = 30;

function isWeekday(date: Date): boolean {
  const day = date.getDay();
  return day >= 1 && day <= 5;
}

function msUntilNext(hour: number, minute: number): number {
  const now = new Date();
  const target = new Date(now);
  target.setHours(hour, minute, 0, 0);
  if (target <= now) {
    target.setDate(target.getDate() + 1);
  }
  return target.getTime() - now.getTime();
}

async function requestPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

function scheduleNotification(
  title: string,
  body: string,
  hour: number,
  minute: number,
  timeoutRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>
) {
  const delay = msUntilNext(hour, minute);

  timeoutRef.current = setTimeout(async () => {
    const now = new Date();
    if (isWeekday(now)) {
      const granted = await requestPermission();
      if (granted) {
        try {
          new Notification(title, { body, icon: '/assets/generated/swipetrack-icon.dim_256x256.png' });
        } catch {
          // ignore
        }
      }
    }
    // Reschedule for next day
    scheduleNotification(title, body, hour, minute, timeoutRef);
  }, delay);
}

export function useNotificationReminders() {
  const swipeInRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const swipeOutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!('Notification' in window)) return;

    // Request permission on mount
    requestPermission();

    scheduleNotification(
      'SwipeTrack Pro',
      "Don't forget to swipe in! 🏢",
      SWIPE_IN_HOUR,
      SWIPE_IN_MINUTE,
      swipeInRef
    );

    scheduleNotification(
      'SwipeTrack Pro',
      "Don't forget to swipe out! 🏠",
      SWIPE_OUT_HOUR,
      SWIPE_OUT_MINUTE,
      swipeOutRef
    );

    return () => {
      if (swipeInRef.current) clearTimeout(swipeInRef.current);
      if (swipeOutRef.current) clearTimeout(swipeOutRef.current);
    };
  }, []);
}
