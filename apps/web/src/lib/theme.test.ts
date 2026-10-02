import { beforeEach, describe, expect, it } from "vitest";
import { useThemeStore } from "./theme";

describe("theme store", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.classList.remove("dark");
  });

  it("defaults to system or stored preference", () => {
    const state = useThemeStore.getState();
    expect(["system", "light", "dark"]).toContain(state.theme);
  });

  it("switches to dark mode and adds dark class", () => {
    useThemeStore.getState().setTheme("dark");

    expect(useThemeStore.getState().theme).toBe("dark");
    expect(useThemeStore.getState().resolvedTheme).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(window.localStorage.getItem("fastvid-theme")).toBe("dark");
  });

  it("switches to light mode and removes dark class", () => {
    document.documentElement.classList.add("dark");
    useThemeStore.getState().setTheme("light");

    expect(useThemeStore.getState().theme).toBe("light");
    expect(useThemeStore.getState().resolvedTheme).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(window.localStorage.getItem("fastvid-theme")).toBe("light");
  });

  it("handles system theme preference", () => {
    useThemeStore.getState().setTheme("system");

    expect(useThemeStore.getState().theme).toBe("system");
    expect(["light", "dark"]).toContain(useThemeStore.getState().resolvedTheme);
    expect(window.localStorage.getItem("fastvid-theme")).toBe("system");
  });
});
