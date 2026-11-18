import { lazy, Suspense } from 'react';
import { Box, Columns2, Loader2, PenSquare, RotateCcw, Rotate3d, ZoomIn, ZoomOut } from 'lucide-react';
import { useUiStore, type ViewMode } from '@/store/uiStore';
import { useSelectedVariant } from '@/store/selectors';
import { SegmentedControl } from '@/components/common/SegmentedControl';
import { IconButton } from '@/components/common/Button';
import { cx } from '@/utils/cx';
import { viewerBridge } from './viewerBridge';

const ProductViewer3D = lazy(() => import('./ProductViewer3D').then((m) => ({ default: m.ProductViewer3D })));
const DesignEditor2D = lazy(() => import('@/components/editor/DesignEditor2D').then((m) => ({ default: m.DesignEditor2D })));

function Loading({ label }: { label: string }) {
  return (
    <div className="flex h-full items-center justify-center gap-2 text-xs text-ink-500">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> {label}
    </div>
  );
}

const VIEW_OPTIONS: Array<{ value: ViewMode; label: string; icon: JSX.Element; className?: string }> = [
  { value: '3d', label: '3D', icon: <Box className="h-3.5 w-3.5" aria-hidden /> },
  { value: '2d', label: '2D Design', icon: <PenSquare className="h-3.5 w-3.5" aria-hidden /> },
  { value: 'split', label: 'Split', icon: <Columns2 className="h-3.5 w-3.5" aria-hidden />, className: 'hidden xl:inline-flex' },
];

/**
 * Centre column. The 3D canvas stays mounted in every mode (hidden in 2D) so
 * the PDF can always capture a product image and textures stay warm.
 */
export function PreviewStage() {
  const viewMode = useUiStore((s) => s.viewMode);
  const setViewMode = useUiStore((s) => s.setViewMode);
  const autoRotate = useUiStore((s) => s.autoRotate);
  const setAutoRotate = useUiStore((s) => s.setAutoRotate);
  const size = useSelectedVariant('size');
  const show3d = viewMode !== '2d';
  const show2d = viewMode !== '3d';

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-ink-100 bg-white px-3 py-2">
        <SegmentedControl label="Preview mode" value={viewMode} options={VIEW_OPTIONS} onChange={setViewMode} />
        <div className={cx('flex items-center gap-0.5', !show3d && 'invisible')}>
          <IconButton label="Zoom in" onClick={() => viewerBridge.zoom(0.82)}>
            <ZoomIn className="h-4 w-4" />
          </IconButton>
          <IconButton label="Zoom out" onClick={() => viewerBridge.zoom(1.22)}>
            <ZoomOut className="h-4 w-4" />
          </IconButton>
          <IconButton label={autoRotate ? 'Stop rotating' : 'Auto rotate'} active={autoRotate} onClick={() => setAutoRotate(!autoRotate)}>
            <Rotate3d className="h-4 w-4" />
          </IconButton>
          <IconButton label="Reset view" onClick={() => viewerBridge.resetView()}>
            <RotateCcw className="h-4 w-4" />
          </IconButton>
        </div>
      </div>

      <div className={cx('relative min-h-0 flex-1', viewMode === 'split' && 'grid grid-cols-2 divide-x divide-ink-100')}>
        <div
          className={cx(
            'bg-[radial-gradient(ellipse_at_50%_30%,#ffffff_0%,#f1efeb_70%,#e9e6e0_100%)]',
            show3d ? 'relative h-full' : 'pointer-events-none invisible absolute inset-0 -z-10',
          )}
          aria-hidden={!show3d}
        >
          <Suspense fallback={<Loading label="Loading 3D preview" />}>
            <ProductViewer3D />
          </Suspense>
          {show3d && (
            <div className="pointer-events-none absolute inset-x-0 bottom-3 flex flex-col items-center gap-1.5 px-3 text-center">
              {size?.attributes.frame === 'none' && (
                <span className="rounded-full bg-amber-50 px-3 py-1 text-[11px] font-medium text-amber-800 ring-1 ring-amber-200">
                  Frame not included - shown faintly for reference
                </span>
              )}
              <span className="rounded-full bg-white/80 px-3 py-1 text-[11px] text-ink-500 ring-1 ring-ink-100 backdrop-blur">
                Drag to rotate · Scroll or pinch to zoom · Click a panel to select it
              </span>
            </div>
          )}
        </div>
        {show2d && (
          <div className="h-full min-h-0">
            <Suspense fallback={<Loading label="Loading editor" />}>
              <DesignEditor2D />
            </Suspense>
          </div>
        )}
      </div>
    </div>
  );
}
