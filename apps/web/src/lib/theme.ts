import { create } from "zustand";

export type Theme = "system" | "light" | "dark";

interface ThemeState {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
}

const THEME_STORAGE_KEY = "fastvid-theme";

function getSystemPreference(): "light" | "dark" {
  if (typeof window === "undefined" || !window.matchMedia) {
    return "light";
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function resolveTheme(theme: Theme): "light" | "dark" {
  if (theme === "system") {
    return getSystemPreference();
  }
  return theme;
}

function applyThemeToDocument(resolved: "light" | "dark"): void {
  if (typeof document === "undefined") {
    return;
  }
  const root = document.documentElement;
  if (resolved === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

function getStoredTheme(): Theme {
  if (typeof window === "undefined") {
    return "system";
  }
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }
  } catch {
    // Fall back to default if storage is restricted
  }
  return "system";
}

const initialTheme = getStoredTheme();
const initialResolved = resolveTheme(initialTheme);
applyThemeToDocument(initialResolved);

export const useThemeStore = create<ThemeState>((set) => ({
  theme: initialTheme,
  resolvedTheme: initialResolved,
  setTheme: (theme: Theme) => {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore storage write errors
    }
    const resolved = resolveTheme(theme);
    applyThemeToDocument(resolved);
    set({ theme, resolvedTheme: resolved });
  }
}));

if (typeof window !== "undefined" && window.matchMedia) {
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  const handleSystemChange = () => {
    const currentTheme = useThemeStore.getState().theme;
    if (currentTheme === "system") {
      const resolved = getSystemPreference();
      applyThemeToDocument(resolved);
      useThemeStore.setState({ resolvedTheme: resolved });
    }
  };

  try {
    mediaQuery.addEventListener("change", handleSystemChange);
  } catch {
    mediaQuery.addListener(handleSystemChange);
  }
}

export function initializeTheme(): void {
  const currentTheme = getStoredTheme();
  const resolved = resolveTheme(currentTheme);
  applyThemeToDocument(resolved);
}
