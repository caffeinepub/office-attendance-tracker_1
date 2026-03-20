import { useCallback, useMemo, useState } from "react";

export interface Holiday {
  date: string; // YYYY-MM-DD
  name: string;
}

const STORAGE_KEY = "swipetrack-holidays";

function loadHolidays(): Holiday[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Holiday[];
  } catch {
    return [];
  }
}

function saveHolidays(holidays: Holiday[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(holidays));
}

export function useHolidays() {
  const [holidays, setHolidays] = useState<Holiday[]>(loadHolidays);

  const addHoliday = useCallback((date: string, name: string) => {
    setHolidays((prev) => {
      if (prev.some((h) => h.date === date)) return prev;
      const updated = [...prev, { date, name: name || "Company Holiday" }];
      saveHolidays(updated);
      return updated;
    });
  }, []);

  const deleteHoliday = useCallback((date: string) => {
    setHolidays((prev) => {
      const updated = prev.filter((h) => h.date !== date);
      saveHolidays(updated);
      return updated;
    });
  }, []);

  const isHoliday = useCallback(
    (dateStr: string) => holidays.some((h) => h.date === dateStr),
    [holidays],
  );

  const getHoliday = useCallback(
    (dateStr: string) => holidays.find((h) => h.date === dateStr),
    [holidays],
  );

  const sortedHolidays = useMemo(
    () => [...holidays].sort((a, b) => b.date.localeCompare(a.date)),
    [holidays],
  );

  return {
    holidays: sortedHolidays,
    addHoliday,
    deleteHoliday,
    isHoliday,
    getHoliday,
  };
}
