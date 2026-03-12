import { LogIn, LogOut, Plus, X } from "lucide-react";
import React, { useEffect, useRef } from "react";

interface FloatingActionButtonProps {
  isOpen: boolean;
  onToggle: () => void;
  onSwipeIn: () => void;
  onSwipeOut: () => void;
  isSwipeInPending?: boolean;
  isSwipeOutPending?: boolean;
}

export default function FloatingActionButton({
  isOpen,
  onToggle,
  onSwipeIn,
  onSwipeOut,
  isSwipeInPending = false,
  isSwipeOutPending = false,
}: FloatingActionButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: Event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        onToggle();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isOpen, onToggle]);

  const handleSwipeIn = () => {
    onSwipeIn();
    onToggle();
  };

  const handleSwipeOut = () => {
    onSwipeOut();
    onToggle();
  };

  return (
    <div
      ref={containerRef}
      className="fixed bottom-24 right-4 z-50 flex flex-col items-end gap-3"
      style={{ pointerEvents: "auto" }}
    >
      {/* Expanded action buttons */}
      <div
        className={`flex flex-col items-end gap-2 transition-all duration-300 ${
          isOpen
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 translate-y-4 pointer-events-none"
        }`}
        aria-hidden={!isOpen}
      >
        {/* Swipe Out */}
        <button
          type="button"
          onClick={handleSwipeOut}
          disabled={isSwipeOutPending}
          className="flex items-center gap-2 bg-destructive text-destructive-foreground px-4 py-2.5 rounded-2xl shadow-lg font-semibold text-sm active:scale-95 transition-transform disabled:opacity-60"
          aria-label="Quick Swipe Out"
        >
          {isSwipeOutPending ? (
            <span className="w-4 h-4 border-2 border-destructive-foreground/40 border-t-destructive-foreground rounded-full animate-spin" />
          ) : (
            <LogOut className="w-4 h-4" />
          )}
          Swipe Out
        </button>

        {/* Swipe In */}
        <button
          type="button"
          onClick={handleSwipeIn}
          disabled={isSwipeInPending}
          className="flex items-center gap-2 bg-success text-white px-4 py-2.5 rounded-2xl shadow-lg font-semibold text-sm active:scale-95 transition-transform disabled:opacity-60"
          aria-label="Quick Swipe In"
        >
          {isSwipeInPending ? (
            <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          ) : (
            <LogIn className="w-4 h-4" />
          )}
          Swipe In
        </button>
      </div>

      {/* Main FAB */}
      <button
        type="button"
        onClick={onToggle}
        className={`w-14 h-14 rounded-full shadow-glow flex items-center justify-center transition-all duration-300 active:scale-90 ${
          isOpen
            ? "bg-muted-foreground/20 text-foreground rotate-45"
            : "bg-primary text-primary-foreground"
        }`}
        aria-label={isOpen ? "Close quick actions" : "Open quick swipe actions"}
        aria-expanded={isOpen}
      >
        {isOpen ? <X className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
      </button>
    </div>
  );
}
