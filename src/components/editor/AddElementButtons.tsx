import { ImagePlus, Type } from 'lucide-react';
import { configurationStore } from '@/store/configurationStore';
import { useUiStore } from '@/store/uiStore';
import { useArtworkUpload } from '@/hooks/useArtworkUpload';
import { Button } from '@/components/common/Button';

interface AddElementButtonsProps {
  size?: 'sm' | 'md';
}

/** "Add text" and "Upload logo" for the selected panel. */
export function AddElementButtons({ size = 'md' }: AddElementButtonsProps) {
  const upload = useArtworkUpload();

  const addText = () => {
    const ui = useUiStore.getState();
    const { configuration, product } = configurationStore.getState();
    if ((configuration.designs[ui.selectedPanelId]?.length ?? 0) >= product.limits.maxElementsPerPanel) {
      ui.notify(`A panel can hold up to ${product.limits.maxElementsPerPanel} elements.`, 'error');
      return;
    }
    const id = configurationStore.getState().addText(ui.selectedPanelId);
    ui.selectElement(ui.selectedPanelId, id);
  };

  return (
    <div className="grid grid-cols-2 gap-2">
      <Button size={size} icon={<Type className="h-4 w-4" />} onClick={addText}>
        Add text
      </Button>
      <Button size={size} icon={<ImagePlus className="h-4 w-4" />} onClick={upload.open} loading={upload.busy}>
        Upload logo
      </Button>
      <input
        ref={upload.inputRef}
        type="file"
        accept={upload.accept}
        onChange={upload.onChange}
        className="hidden"
        aria-label="Upload logo or artwork"
        tabIndex={-1}
      />
    </div>
  );
}
