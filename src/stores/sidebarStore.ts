import { create } from 'zustand';

interface SidebarStore {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export const useSidebarStore = create<SidebarStore>((set) => ({
  sidebarOpen: false,
  setSidebarOpen: (open: boolean) => set({ sidebarOpen: open }),
}));
