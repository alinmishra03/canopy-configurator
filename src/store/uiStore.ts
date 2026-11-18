import { create } from 'zustand';

/**
 * Transient UI state. Deliberately separate from the persistent configuration:
 * selection, view mode and notifications are never saved or priced.
 */
export type ViewMode = '3d' | '2d' | 'split';

export interface Toast {
  id: number;
  tone: 'info' | 'success' | 'error';
  message: string;
}

interface UiState {
  viewMode: ViewMode;
  selectedPanelId: string;
  selectedElementId: string | null;
  autoRotate: boolean;
  /** Increments when web fonts finish loading so canvases re-render text. */
  fontsVersion: number;
  toasts: Toast[];
  cartOpen: boolean;

  setViewMode(mode: ViewMode): void;
  selectPanel(panelId: string): void;
  selectElement(panelId: string, elementId: string | null): void;
  clearElementSelection(): void;
  setAutoRotate(value: boolean): void;
  bumpFontsVersion(): void;
  notify(message: string, tone?: Toast['tone']): void;
  dismissToast(id: number): void;
  setCartOpen(open: boolean): void;
}

let toastId = 0;

export const useUiStore = create<UiState>()((set, get) => ({
  viewMode: '3d',
  selectedPanelId: 'roof-front',
  selectedElementId: null,
  autoRotate: false,
  fontsVersion: 0,
  toasts: [],
  cartOpen: false,

  setViewMode: (viewMode) => set({ viewMode }),
  selectPanel: (selectedPanelId) =>
    set((s) => (s.selectedPanelId === selectedPanelId ? s : { selectedPanelId, selectedElementId: null })),
  selectElement: (selectedPanelId, selectedElementId) => set({ selectedPanelId, selectedElementId }),
  clearElementSelection: () => set({ selectedElementId: null }),
  setAutoRotate: (autoRotate) => set({ autoRotate }),
  bumpFontsVersion: () => set((s) => ({ fontsVersion: s.fontsVersion + 1 })),
  notify: (message, tone = 'info') => {
    const id = ++toastId;
    set((s) => ({ toasts: [...s.toasts.slice(-3), { id, tone, message }] }));
    window.setTimeout(() => get().dismissToast(id), tone === 'error' ? 7000 : 4500);
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  setCartOpen: (cartOpen) => set({ cartOpen }),
}));
