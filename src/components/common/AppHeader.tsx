import { useRef } from 'react';
import { Download, FolderOpen, Redo2, RotateCcw, ShoppingBag, Undo2 } from 'lucide-react';
import { configurationStore, useConfigurationStore } from '@/store/configurationStore';
import { useCanRedo, useCanUndo } from '@/store/selectors';
import { useCommerceStore } from '@/store/commerceStore';
import { useUiStore } from '@/store/uiStore';
import { downloadConfigurationFile, readConfigurationFile } from '@/services/configurationService';
import { preloadImages } from '@/utils/imageCache';
import { IconButton } from './Button';

/** Slim top bar: product context, history and save/restore controls. */
export function AppHeader() {
  const undo = useConfigurationStore((s) => s.undo);
  const redo = useConfigurationStore((s) => s.redo);
  const reset = useConfigurationStore((s) => s.reset);
  const canUndo = useCanUndo();
  const canRedo = useCanRedo();
  const cart = useCommerceStore((s) => s.cart);
  const setCartOpen = useUiStore((s) => s.setCartOpen);
  const notify = useUiStore((s) => s.notify);
  const fileRef = useRef<HTMLInputElement>(null);

  const onImport = async (file: File | undefined) => {
    if (!file) return;
    try {
      const { product, loadConfiguration } = configurationStore.getState();
      const config = await readConfigurationFile(file, product);
      await preloadImages(Object.values(config.assets).flatMap((a) => (a.dataUrl ? [a.dataUrl] : [])));
      loadConfiguration(config);
      notify(`Design ${config.id} restored.`, 'success');
    } catch (err) {
      notify((err as Error).message, 'error');
    }
  };

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-ink-200 bg-white px-4">
      <div className="flex min-w-0 items-center gap-3">
        <svg viewBox="0 0 32 32" className="h-7 w-7 shrink-0" aria-hidden>
          <path d="M16 4 3 13h26z" fill="#2f5bea" />
          <path d="M6 13v15M26 13v15" stroke="#1b1a18" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-ink-900">Canopy Studio</p>
          <p className="hidden truncate text-[11px] text-ink-500 sm:block">10×10 Custom Canopy Tent configurator</p>
        </div>
      </div>

      <div className="flex items-center gap-0.5">
        <IconButton label="Undo (Ctrl+Z)" disabled={!canUndo} onClick={undo}>
          <Undo2 className="h-4 w-4" />
        </IconButton>
        <IconButton label="Redo (Ctrl+Shift+Z)" disabled={!canRedo} onClick={redo}>
          <Redo2 className="h-4 w-4" />
        </IconButton>
        <span className="mx-1.5 hidden h-5 w-px bg-ink-200 sm:block" aria-hidden />
        <IconButton label="Export design file (.json)" onClick={() => downloadConfigurationFile(configurationStore.getState().configuration)} className="hidden sm:inline-flex">
          <Download className="h-4 w-4" />
        </IconButton>
        <IconButton label="Open design file" onClick={() => fileRef.current?.click()} className="hidden sm:inline-flex">
          <FolderOpen className="h-4 w-4" />
        </IconButton>
        <IconButton
          label="Start over"
          onClick={() => {
            reset();
            notify('Started a new design. Use Undo to go back.', 'info');
          }}
        >
          <RotateCcw className="h-4 w-4" />
        </IconButton>
        {cart && (
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="ml-1.5 inline-flex h-9 items-center gap-1.5 rounded-lg bg-ink-900 px-3 text-xs font-semibold text-white hover:bg-ink-800"
            aria-label={`Open cart, ${cart.totalQuantity} items`}
          >
            <ShoppingBag className="h-4 w-4" aria-hidden />
            {cart.totalQuantity}
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          tabIndex={-1}
          aria-hidden
          onChange={(e) => {
            void onImport(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </div>
    </header>
  );
}
