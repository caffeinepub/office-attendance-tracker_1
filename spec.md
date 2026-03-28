# SwipeTrack Pro

## Current State
Comp off half-day leave (first half and second half) follows the same weekly contribution logic as regular half-day leaves:
- compOffFirstHalf → 4h 30m (HALF_DAY_FIRST_REDUCTION = 270 min)
- compOffSecondHalf → 4h 00m (HALF_DAY_SECOND_REDUCTION = 240 min)

Weekend working already has a popup and auto-fill, and earns comp off balance, but the earning logic for weekends specifically is tied to holiday earning (4h=0.5, 8h=1.0).

When comp off is used as full-day leave, 8h 30m (FULL_DAY_LEAVE_REDUCTION = 510 min) is already deducted from weekly target — this is correct.

## Requested Changes (Diff)

### Add
- New constant `COMP_OFF_HALF_REDUCTION = 4 * 60 = 240` (4h flat) for comp off half-day leaves
- Ensure weekend working (8h worked) earns 1 full day comp off via the useCompOff hook (same earning logic as holiday working: 4h=0.5, 8h=1.0)

### Modify
- `getLeaveWeeklyContribution` function in `hoursCalculation.ts`:
  - `compOffFirstHalf` case → return 240 min (flat 4h) instead of 270 min
  - `compOffSecondHalf` case → return 240 min (flat 4h) instead of 240 min (already 240, but ensure it stays at 240 not affected by other logic)
- Color threshold for comp off half-day (both first and second) → 240 min (green if ≥ 4h, red if < 4h)
- Any smart swipe-out prediction for compOffFirstHalf → use 240 min target
- Any smart swipe-out prediction for compOffSecondHalf → use 240 min target
- When full day comp off is used on a weekday (compOff or compOffFull leaveType), treat the day as non-working and deduct 8h 30m (510 min) from weekly target — this is already implemented, verify it is correct
- Weekend working: after selecting a weekend session mode (Half Day, Full Day, or Complete Deficit), if user works ≥ 8h on that weekend day, automatically earn 1 full day comp off in the comp off balance (with 60-day expiry). If ≥ 4h worked but < 8h, earn 0.5 comp off. This mirrors the holiday working comp off earning logic.

### Remove
- Nothing to remove

## Implementation Plan
1. In `hoursCalculation.ts`: add `COMP_OFF_HALF_REDUCTION = 240` constant. Update `getLeaveWeeklyContribution` to return 240 for `compOffFirstHalf` and `compOffSecondHalf`. Update color threshold logic to use 240 for both comp off half-day types.
2. In `hoursCalculation.ts`: verify smart swipe-out prediction for comp off half-day types uses the new 4h target.
3. In `useCompOff.ts` and/or `DailyEntry.tsx`: after a weekend working day is saved with actual hours, apply the same comp off earning logic as holidays (4h=0.5, 8h=1.0 with 60-day expiry).
4. Validate, typecheck, and build.
