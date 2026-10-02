import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();

  for (const cookie of document.cookie.split(";")) {
    const name = cookie.split("=")[0]?.trim();

    if (name) {
      document.cookie = `${name}=; Max-Age=0; path=/`;
    }
  }

  document.head.innerHTML = '<meta name="description" content="">';
  document.body.innerHTML = "";
});
