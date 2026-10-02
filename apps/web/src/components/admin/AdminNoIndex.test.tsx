import { waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithProviders } from "../../test/render";
import { AdminNoIndex } from "./AdminNoIndex";

describe("AdminNoIndex", () => {
  it("sets noindex,nofollow robots meta", async () => {
    renderWithProviders(<AdminNoIndex title="Admin Test" />);

    await waitFor(() => {
      expect(document.querySelector("meta[name='robots']")).toHaveAttribute("content", "noindex,nofollow");
    });
  });
});
