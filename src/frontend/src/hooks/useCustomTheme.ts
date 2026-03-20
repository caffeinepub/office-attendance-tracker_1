import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "swipetrack-custom-theme";

export interface CustomTheme {
  primaryHue: number;
  chroma: number;
  fontFamily: string;
}

const DEFAULT_THEME: CustomTheme = {
  primaryHue: 255,
  chroma: 0.28,
  fontFamily: "Plus Jakarta Sans",
};

const FONT_URL_MAP: Record<string, string> = {
  "Plus Jakarta Sans":
    "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap",
  Inter:
    "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap",
  Roboto:
    "https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap",
  Poppins:
    "https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap",
  Nunito:
    "https://fonts.googleapis.com/css2?family=Nunito:wght@300;400;500;600;700&display=swap",
  "DM Sans":
    "https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap",
  Outfit:
    "https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap",
  Raleway:
    "https://fonts.googleapis.com/css2?family=Raleway:wght@300;400;500;600;700&display=swap",
  Montserrat:
    "https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&display=swap",
  Lato: "https://fonts.googleapis.com/css2?family=Lato:wght@300;400;700&display=swap",
  "Bricolage Grotesque":
    "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@300;400;500;600;700&display=swap",
};

function loadStoredTheme(): CustomTheme {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<CustomTheme>;
      return { ...DEFAULT_THEME, ...parsed };
    }
  } catch {
    // ignore
  }
  return { ...DEFAULT_THEME };
}

function applyThemeToDOM(theme: CustomTheme) {
  const root = document.documentElement;
  const { primaryHue: h, chroma: c } = theme;

  // Light mode primary
  root.style.setProperty("--primary", `0.55 ${c} ${h}`);
  root.style.setProperty("--accent", `0.55 ${c} ${h}`);
  root.style.setProperty("--ring", `0.55 ${c} ${h}`);
  root.style.setProperty("--chart-1", `0.55 ${c} ${h}`);
  root.style.setProperty("--sidebar-primary", `0.55 ${c} ${h}`);
  root.style.setProperty("--sidebar-ring", `0.55 ${c} ${h}`);

  // Store dark mode values via a CSS variable trick using data attribute
  root.setAttribute("data-custom-hue", String(h));
  root.setAttribute("data-custom-chroma", String(c));

  // Apply dark mode overrides if dark class is active
  if (root.classList.contains("dark")) {
    root.style.setProperty("--primary", `0.68 ${c} ${h}`);
    root.style.setProperty("--accent", `0.68 ${c} ${h}`);
    root.style.setProperty("--ring", `0.68 ${c} ${h}`);
    root.style.setProperty("--chart-1", `0.68 ${c} ${h}`);
    root.style.setProperty("--sidebar-primary", `0.68 ${c} ${h}`);
    root.style.setProperty("--sidebar-ring", `0.68 ${c} ${h}`);
  }
}

function applyFontToDOM(fontFamily: string) {
  // Update or inject Google Fonts link
  const linkId = "custom-theme-font";
  let link = document.getElementById(linkId) as HTMLLinkElement | null;
  const url = FONT_URL_MAP[fontFamily];
  if (url) {
    if (!link) {
      link = document.createElement("link");
      link.id = linkId;
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }
    link.href = url;
  }
  // Apply to body
  document.body.style.fontFamily = `"${fontFamily}", system-ui, sans-serif`;
}

// Apply immediately on module load to prevent flash
const _initialTheme = loadStoredTheme();
applyThemeToDOM(_initialTheme);
applyFontToDOM(_initialTheme.fontFamily);

// Re-apply when dark class changes
const _observer = new MutationObserver(() => {
  const stored = loadStoredTheme();
  applyThemeToDOM(stored);
});
_observer.observe(document.documentElement, {
  attributes: true,
  attributeFilter: ["class"],
});

export function useCustomTheme() {
  const [customTheme, setCustomThemeState] = useState<CustomTheme>(() =>
    loadStoredTheme(),
  );

  const persist = useCallback((theme: CustomTheme) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(theme));
    } catch {
      // ignore
    }
    applyThemeToDOM(theme);
    applyFontToDOM(theme.fontFamily);
    setCustomThemeState(theme);
  }, []);

  const setAccentColor = useCallback(
    (hue: number, chroma: number) => {
      setCustomThemeState((prev) => {
        const next = { ...prev, primaryHue: hue, chroma };
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const setFont = useCallback(
    (fontFamily: string) => {
      setCustomThemeState((prev) => {
        const next = { ...prev, fontFamily };
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const resetToDefault = useCallback(() => {
    persist({ ...DEFAULT_THEME });
  }, [persist]);

  // Initialize on mount
  useEffect(() => {
    applyThemeToDOM(customTheme);
    applyFontToDOM(customTheme.fontFamily);
  }, [customTheme]);

  return { customTheme, setAccentColor, setFont, resetToDefault };
}

export { DEFAULT_THEME, FONT_URL_MAP };
