import { useEffect, useState } from 'react';
import { configurationStore } from '@/store/configurationStore';
import { useUiStore } from '@/store/uiStore';
import { draftStorage, loadSavedConfiguration } from '@/services/configurationService';
import { preloadImages } from '@/utils/imageCache';

const AUTOSAVE_MS = 800;

/**
 * Restores a configuration on startup (?config=<id> from the server, else the
 * local draft) and autosaves changes locally. Returns false until restored.
 */
export function usePersistence(): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const { product, loadConfiguration } = configurationStore.getState();
    const notify = useUiStore.getState().notify;

    async function restore() {
      const sharedId = new URLSearchParams(window.location.search).get('config');
      let restored = null;
      if (sharedId) {
        try {
          restored = await loadSavedConfiguration(sharedId, product);
          notify(`Loaded saved design ${sharedId}.`, 'success');
        } catch (err) {
          notify(`Could not load design ${sharedId}: ${(err as Error).message}`, 'error');
        }
      }
      restored ??= draftStorage.load(product);
      if (restored && !cancelled) {
        await preloadImages(Object.values(restored.assets).flatMap((a) => (a.dataUrl ? [a.dataUrl] : [])));
        loadConfiguration(restored);
      }
      if (!cancelled) setReady(true);
    }
    void restore();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    let timer: number | undefined;
    const unsubscribe = configurationStore.subscribe((state, prev) => {
      if (state.configuration === prev.configuration) return;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => draftStorage.save(state.configuration), AUTOSAVE_MS);
    });
    return () => {
      unsubscribe();
      window.clearTimeout(timer);
    };
  }, [ready]);

  return ready;
}
