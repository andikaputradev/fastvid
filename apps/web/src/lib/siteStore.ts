import { create } from "zustand";

interface SiteState {
  lastSubmittedUrl: string | null;
  setLastSubmittedUrl: (url: string) => void;
}

export const useSiteStore = create<SiteState>((set) => ({
  lastSubmittedUrl: null,
  setLastSubmittedUrl: (url) => set({ lastSubmittedUrl: url })
}));
