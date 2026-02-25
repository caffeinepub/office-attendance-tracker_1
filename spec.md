# Specification

## Summary
**Goal:** Automatically deduct 30 minutes for lunch from the working-hour calculation on regular (no-leave) working days in SwipeTrack Pro.

**Planned changes:**
- Update `frontend/src/utils/hoursCalculation.ts` to apply a 30-minute lunch deduction for entries where `leaveType = #noLeave` (full-day presence).
- Net hours formula becomes: `(swipeOut − swipeIn, clamped) − 30 min lunch + 30 min breakfast bonus (if breakfastAtOffice is true)`.
- Ensure half-day leave entries (first half and second half) do NOT receive the lunch deduction.
- Ensure full-day leave entries continue to return 0 daily hours with no deduction.
- Smart Swipe-Out Prediction and Dashboard/Analytics screens will reflect the updated net hours automatically.

**User-visible outcome:** On a regular working day (e.g., swipe-in 07:00, swipe-out 16:00, no breakfast), the displayed net hours will show 8h 30m instead of 9h 00m, correctly reflecting the 30-minute lunch deduction. With breakfast, it shows 9h 00m.
