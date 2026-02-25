# Specification

## Summary
**Goal:** Add an Apple-style full-screen calendar overlay to the Daily Entry date picker and deploy the updated app to production.

**Planned changes:**
- Replace the existing date picker in `frontend/src/pages/DailyEntry.tsx` with a full-screen modal overlay triggered by tapping the date field
- Overlay backdrop uses 40% opacity with a frosted-glass/blur effect; the calendar card itself has a solid opaque surface for readability
- Calendar grid features Apple-inspired minimal typography, muted weekday headers (S M T W T F S), a subtle today indicator, and a filled-circle highlight on the selected date
- Smooth fade + slide-up open/close CSS transition animations
- Dismiss overlay by tapping outside the calendar card or swiping down
- Selected date is correctly applied back to the form field
- Overlay works in both light and dark mode
- Deploy the updated frontend to the Internet Computer mainnet, replacing the current live deployment

**User-visible outcome:** Users on the Daily Entry screen can tap the date field to open a beautiful full-screen Apple-style calendar picker with a translucent backdrop, then select a date or dismiss with a swipe/tap — and the live production app is updated with this new experience.
