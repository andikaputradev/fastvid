import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, type RenderResult } from "@testing-library/react";
import type { ReactElement } from "react";
import { MemoryRouter } from "react-router-dom";

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false
      }
    }
  });
}

export function renderWithProviders(element: ReactElement): RenderResult {
  const queryClient = createTestQueryClient();

  return render(<QueryClientProvider client={queryClient}>{element}</QueryClientProvider>);
}

export function renderWithRouter(element: ReactElement, initialEntries = ["/"]): RenderResult {
  return renderWithProviders(<MemoryRouter initialEntries={initialEntries}>{element}</MemoryRouter>);
}
