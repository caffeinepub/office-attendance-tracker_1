import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";

interface AppleCalendarOverlayProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  onClose: () => void;
}

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
const WEEKDAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

function buildCalendarDays(viewMonth: Date): Date[] {
  const start = startOfWeek(startOfMonth(viewMonth), { weekStartsOn: 0 });
  const end = endOfWeek(endOfMonth(viewMonth), { weekStartsOn: 0 });
  const days: Date[] = [];
  let cur = start;
  while (cur <= end) {
    days.push(cur);
    cur = addDays(cur, 1);
  }
  return days;
}

export default function AppleCalendarOverlay({
  selectedDate,
  onSelectDate,
  onClose,
}: AppleCalendarOverlayProps) {
  const [viewMonth, setViewMonth] = useState<Date>(
    new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1),
  );
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef<number | null>(null);

  // Mount animation
  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const handleClose = useCallback(() => {
    setClosing(true);
    setVisible(false);
    setTimeout(onClose, 300);
  }, [onClose]);

  // Touch swipe-down to dismiss
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const delta = e.changedTouches[0].clientY - touchStartY.current;
    if (delta > 60) {
      handleClose();
    }
    touchStartY.current = null;
  };

  // Click outside card to dismiss
  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
      handleClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDialogElement>) => {
    if (e.key === "Escape") handleClose();
  };

  const days = buildCalendarDays(viewMonth);

  return (
    // biome-ignore lint/a11y/useSemanticElements: custom overlay needs open attribute control
    <dialog
      open
      aria-label="Date picker"
      className={`apple-cal-overlay ${visible && !closing ? "apple-cal-overlay--visible" : ""}`}
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div
        ref={cardRef}
        className={`apple-cal-card ${visible && !closing ? "apple-cal-card--visible" : ""}`}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Month navigation */}
        <div className="flex items-center justify-between px-5 py-3">
          <button
            type="button"
            onClick={() => setViewMonth(subMonths(viewMonth, 1))}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-secondary transition-colors text-foreground"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="text-center">
            <p className="text-lg font-semibold text-foreground tracking-tight">
              {format(viewMonth, "MMMM")}
            </p>
            <p className="text-xs text-muted-foreground font-medium">
              {format(viewMonth, "yyyy")}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setViewMonth(addMonths(viewMonth, 1))}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-secondary transition-colors text-foreground"
            aria-label="Next month"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 px-4 pb-1">
          {WEEKDAY_LABELS.map((label, i) => (
            <div
              key={WEEKDAY_KEYS[i]}
              className="flex items-center justify-center h-8"
            >
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* Day grid */}
        <div className="grid grid-cols-7 px-4 pb-5 gap-y-1">
          {days.map((day) => {
            const isSelected = isSameDay(day, selectedDate);
            const isCurrentMonth = isSameMonth(day, viewMonth);
            const isTodayDate = isToday(day);

            return (
              <button
                type="button"
                key={format(day, "yyyy-MM-dd")}
                onClick={() => {
                  onSelectDate(day);
                  setTimeout(handleClose, 120);
                }}
                className={`
                  relative flex items-center justify-center h-11 w-full rounded-full
                  transition-all duration-150 select-none
                  ${
                    isSelected
                      ? "apple-cal-selected"
                      : isTodayDate
                        ? "apple-cal-today"
                        : isCurrentMonth
                          ? "text-foreground hover:bg-secondary active:scale-95"
                          : "text-muted-foreground/40 hover:bg-secondary/50"
                  }
                `}
                aria-label={format(day, "EEEE, MMMM d, yyyy")}
                aria-pressed={isSelected}
              >
                <span
                  className={`text-base font-medium leading-none ${isSelected ? "text-primary-foreground" : ""}`}
                >
                  {format(day, "d")}
                </span>
                {isTodayDate && !isSelected && (
                  <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </div>

        {/* Today shortcut */}
        <div className="px-5 pb-5">
          <button
            type="button"
            onClick={() => {
              const now = new Date();
              setViewMonth(new Date(now.getFullYear(), now.getMonth(), 1));
              onSelectDate(now);
              setTimeout(handleClose, 120);
            }}
            className="w-full h-11 rounded-2xl bg-secondary text-foreground text-sm font-semibold hover:bg-secondary/80 transition-colors active:scale-[0.98]"
          >
            Today
          </button>
        </div>
      </div>
    </dialog>
  );
}
