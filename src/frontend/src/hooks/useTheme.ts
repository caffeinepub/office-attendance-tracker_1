import { useCallback, useEffect, useState } from "react";

type Theme = "light" | "dark";

const THEME_KEY = "swipetrack-theme";
const THEME_USER_SET_KEY = "swipetrack-theme-user-set";

function isAfterHalfPast6PM(): boolean {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  return hours > 18 || (hours === 18 && minutes >= 30);
}

function getInitialTheme(): Theme {
  try {
    const userSet = localStorage.getItem(THEME_USER_SET_KEY);
    const stored = localStorage.getItem(THEME_KEY) as Theme | null;
    // Only use stored preference if user explicitly set it
    if (userSet === "true" && (stored === "light" || stored === "dark"))
      return stored;
    // Auto dark mode after 6:30 PM
    if (isAfterHalfPast6PM()) return "dark";
    // System preference
    if (window.matchMedia("(prefers-color-scheme: dark)").matches)
      return "dark";
  } catch {
    // ignore
  }
  return "light";
}

// Apply theme immediately to prevent flash
const initialTheme = getInitialTheme();
if (initialTheme === "dark") {
  document.documentElement.classList.add("dark");
} else {
  document.documentElement.classList.remove("dark");
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(initialTheme);

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // ignore
    }
  }, [theme]);

  // Check time every minute and auto-switch to dark if not user-set
  useEffect(() => {
    const check = () => {
      try {
        const userSet = localStorage.getItem(THEME_USER_SET_KEY);
        if (userSet !== "true" && isAfterHalfPast6PM()) {
          setThemeState("dark");
        }
      } catch {
        // ignore
      }
    };
    const interval = setInterval(check, 60000);
    return () => clearInterval(interval);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      try {
        localStorage.setItem(THEME_USER_SET_KEY, "true");
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    try {
      localStorage.setItem(THEME_USER_SET_KEY, "true");
    } catch {
      // ignore
    }
  }, []);

  return { theme, toggleTheme, setTheme };
}
