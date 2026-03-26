// Comp off leaves are stored purely in localStorage because
// the backend LeaveType variant does not include comp off half-day cases.
// When saving to the backend, comp off types are mapped to their regular leave equivalents.
// This module tracks which dates are comp off leaves, their sub-types, and usage.

const STORAGE_KEY = "swipetrack-compoff-dates";
const SUBTYPE_KEY = "swipetrack-compoff-subtypes";
const USAGE_KEY = "swipetrack-compoff-usage";

export type CompOffSubType = "full" | "firstHalf" | "secondHalf";

// ─── Date tracking (is this date a comp off leave?) ─────────────────────────

export function getCompOffDates(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(arr);
  } catch {
    return new Set();
  }
}

export function addCompOffDate(date: string): void {
  const dates = getCompOffDates();
  dates.add(date);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(dates)));
}

export function removeCompOffDate(date: string): void {
  const dates = getCompOffDates();
  dates.delete(date);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(dates)));
  removeCompOffSubType(date);
  removeCompOffUsage(date);
}

export function isCompOffDate(date: string): boolean {
  return getCompOffDates().has(date);
}

// ─── Sub-type tracking (full / firstHalf / secondHalf) ──────────────────────

export function getCompOffSubType(date: string): CompOffSubType {
  try {
    const raw = localStorage.getItem(SUBTYPE_KEY);
    if (!raw) return "full";
    const map = JSON.parse(raw) as Record<string, CompOffSubType>;
    return map[date] ?? "full";
  } catch {
    return "full";
  }
}

export function setCompOffSubType(date: string, subType: CompOffSubType): void {
  try {
    const raw = localStorage.getItem(SUBTYPE_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, CompOffSubType>) : {};
    map[date] = subType;
    localStorage.setItem(SUBTYPE_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

function removeCompOffSubType(date: string): void {
  try {
    const raw = localStorage.getItem(SUBTYPE_KEY);
    if (!raw) return;
    const map = JSON.parse(raw) as Record<string, CompOffSubType>;
    delete map[date];
    localStorage.setItem(SUBTYPE_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

// ─── Usage tracking (how much comp off has been used?) ─────────────────────

export function getCompOffUsageMap(): Record<string, number> {
  try {
    const raw = localStorage.getItem(USAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, number>;
  } catch {
    return {};
  }
}

export function setCompOffUsage(date: string, amount: number): void {
  try {
    const map = getCompOffUsageMap();
    map[date] = amount;
    localStorage.setItem(USAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

export function removeCompOffUsage(date: string): void {
  try {
    const map = getCompOffUsageMap();
    delete map[date];
    localStorage.setItem(USAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

export function getTotalCompOffUsed(): number {
  const map = getCompOffUsageMap();
  return Object.values(map).reduce((sum, v) => sum + v, 0);
}
