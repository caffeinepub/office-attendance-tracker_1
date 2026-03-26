# SwipeTrack Pro

## Current State

The app has:
- Leave types: Full Day, First Half, Second Half (half-day leave logic with frozen swipe-in at 13:00 for first-half, clamped swipe-out at 12:30 for second-half)
- Comp Off balance tracked separately from earned holiday working hours (0.5 for 4h, 1.0 for 8h holiday work)
- Comp Off available as a single option in the Leave tab (full-day only)
- Comp Off balance displayed as amber badge beside the Leave selector
- Comp Off entries expire 60 days after being earned

## Requested Changes (Diff)

### Add
- Comp Off sub-types in Leave tab: First Half Comp Off, Second Half Comp Off, Full Day Comp Off
- When First Half Comp Off is selected: same logic as First Half Leave (swipe-in frozen at 13:00, counts as 4h 00m toward weekly target), deducts 0.5 from comp off balance
- When Second Half Comp Off is selected: same logic as Second Half Leave (swipe-out clamped at 12:30, counts as 4h 30m toward weekly target), deducts 0.5 from comp off balance
- When Full Day Comp Off is selected: same as Full Day Leave (entire day off, 8h 30m toward weekly target), deducts 1.0 from comp off balance

### Modify
- DailyEntry.tsx: Replace single "Comp Off" leave option with three sub-options (First Half, Second Half, Full Day)
- hoursCalculation.ts: Treat comp off sub-types identically to their leave counterparts in all calculations
- useCompOff.ts / compOffLeaves.ts: Deduct 0.5 for half-day comp off usage, 1.0 for full-day comp off usage from balance

### Remove
- Single undifferentiated "Comp Off" leave type (replaced by the three sub-types)

## Implementation Plan

1. Update leave type definitions to include `comp-off-first-half`, `comp-off-second-half`, `comp-off-full` (or similar)
2. In DailyEntry.tsx leave selector, replace single Comp Off option with a group showing three sub-options
3. In hoursCalculation.ts, map comp off sub-types to their leave equivalents for all calculations
4. In useCompOff/compOffLeaves, deduct 0.5 for half-day and 1.0 for full-day when a comp off leave day is saved
5. Ensure color thresholds apply correctly (same as leave counterparts)
6. Ensure swipe-in freeze / swipe-out clamp logic applies to comp off first/second half same as regular leaves
