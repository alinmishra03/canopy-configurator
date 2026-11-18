import { useEffect } from 'react';
import { configurationStore, useConfigurationStore } from '@/store/configurationStore';
import { useUiStore } from '@/store/uiStore';
import { useActivePanels } from '@/store/selectors';

/** Re-render canvases once web fonts are available (canvas text needs loaded fonts). */
export function useFontLoading(fonts: string[]): void {
  useEffect(() => {
    if (!document.fonts) return;
    const bump = useUiStore.getState().bumpFontsVersion;
    Promise.allSettled(fonts.flatMap((f) => [document.fonts.load(`400 32px "${f}"`), document.fonts.load(`700 32px "${f}"`)])).then(bump);
    document.fonts.addEventListener?.('loadingdone', bump);
    return () => document.fonts.removeEventListener?.('loadingdone', bump);
  }, [fonts]);
}

/** Keeps UI selection valid when options remove panels or undo removes elements. */
export function useSelectionGuards(): void {
  const activePanels = useActivePanels();
  const selectedPanelId = useUiStore((s) => s.selectedPanelId);
  const selectedElementId = useUiStore((s) => s.selectedElementId);
  const elementExists = useConfigurationStore((s) =>
    selectedElementId ? Boolean(s.configuration.designs[selectedPanelId]?.some((e) => e.id === selectedElementId)) : true,
  );

  useEffect(() => {
    if (!activePanels.some((p) => p.id === selectedPanelId) && activePanels[0]) {
      useUiStore.getState().selectPanel(activePanels[0].id);
    }
  }, [activePanels, selectedPanelId]);

  useEffect(() => {
    if (!elementExists) useUiStore.getState().clearElementSelection();
  }, [elementExists]);
}

/** Surfaces automatic option adjustments (rule conflicts) as notifications. */
export function useAdjustmentNotices(): void {
  useEffect(
    () =>
      configurationStore.subscribe((state, prev) => {
        if (state.lastAdjustments !== prev.lastAdjustments) {
          for (const message of state.lastAdjustments) useUiStore.getState().notify(message, 'info');
        }
      }),
    [],
  );
}

function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return Boolean(el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)));
}

/** Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z / Ctrl+Y, Delete, Escape. */
export function useKeyboardShortcuts(): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      const store = configurationStore.getState();
      const ui = useUiStore.getState();
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) store.redo();
        else store.undo();
      } else if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        store.redo();
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && ui.selectedElementId) {
        e.preventDefault();
        store.removeElement(ui.selectedPanelId, ui.selectedElementId);
        ui.clearElementSelection();
      } else if (e.key === 'Escape') {
        ui.clearElementSelection();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
