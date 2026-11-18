import { useCallback, useRef, useState, type ChangeEvent } from 'react';
import { configurationStore } from '@/store/configurationStore';
import { useUiStore } from '@/store/uiStore';
import { processUpload, UploadError } from '@/utils/imageProcessing';
import { loadImage } from '@/utils/imageCache';

/** File-input wiring for logo uploads onto the currently selected panel. */
export function useArtworkUpload() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);

  const open = useCallback(() => inputRef.current?.click(), []);

  const onChange = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const { product, configuration, addImage } = configurationStore.getState();
    const ui = useUiStore.getState();
    if (Object.keys(configuration.assets).length >= product.limits.maxAssets) {
      ui.notify(`You can use up to ${product.limits.maxAssets} uploaded images per design.`, 'error');
      return;
    }
    setBusy(true);
    try {
      const asset = await processUpload(file, product);
      if (asset.dataUrl) await loadImage(asset.dataUrl);
      const panelId = ui.selectedPanelId;
      const elementId = addImage(panelId, asset);
      ui.selectElement(panelId, elementId);
      ui.notify(`"${asset.name}" added to the selected panel.`, 'success');
    } catch (err) {
      ui.notify(err instanceof UploadError ? err.message : 'That image could not be processed.', 'error');
    } finally {
      setBusy(false);
    }
  }, []);

  const accept = configurationStore.getState().product.limits.acceptedMimeTypes.join(',');

  return { inputRef, open, onChange, busy, accept };
}
