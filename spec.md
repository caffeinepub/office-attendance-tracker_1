# Specification

## Summary
**Goal:** Make SwipeTrack Pro PWA-installable by adding a manifest, service worker, and proper app icons, and fix the green/red hours indicator threshold logic for half-day leave entries.

**Planned changes:**
- Update `frontend/index.html` to include a PWA manifest link, theme-color meta tag (amber/charcoal palette), Apple mobile web app meta tags, and Apple touch icon links
- Create `frontend/public/manifest.json` with all required PWA fields, icon entries for sizes 48–512px, and maskable icon entries for 192×192 and 512×512
- Add service worker registration and create a minimal `frontend/public/sw.js` that caches the app shell and serves it offline
- Fix the hours color indicator threshold in `DailyEntry.tsx` and `Dashboard.tsx`: use 4h 30m for `halfDayFirstHalf`, 4h 00m for `halfDaySecondHalf`, keep 8h 30m for regular days, and never show red for full-day leave
- Update surplus/shortfall display values to be computed against the correct per-leave-type threshold

**User-visible outcome:** The app can be installed as a PWA and works offline. Half-day leave entries now show correct green/red indicators and accurate surplus/shortfall values instead of being compared against the full-day 8h 30m target.
