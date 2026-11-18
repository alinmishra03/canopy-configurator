import { useMemo, useState } from 'react';
import { DoubleSide, FrontSide, type BufferGeometry } from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import type { PanelDefinition } from '@shared/types';
import { usePanelColor, usePanelDoubleSided } from '@/store/selectors';
import { useUiStore } from '@/store/uiStore';
import { usePanelTexture } from './usePanelTexture';

interface PrintedPanelProps {
  panel: PanelDefinition;
  /** Custom geometry (roof triangles); otherwise a plane of width x height feet. */
  geometry?: BufferGeometry;
  width?: number;
  height?: number;
  position?: [number, number, number];
  /** Fabric seen from inside: printed if double sided, plain otherwise. Ignored for custom geometry. */
  backFace?: boolean;
}

const CLICK_TOLERANCE_PX = 5;

/**
 * A fabric surface whose texture is generated from the panel's design. Clicking
 * it selects the panel in the shared UI store, so the 2D editor follows.
 */
export function PrintedPanel({ panel, geometry, width = 10, height = 1, position = [0, 0, 0], backFace = true }: PrintedPanelProps) {
  const texture = usePanelTexture(panel);
  const color = usePanelColor(panel.id);
  const doubleSided = usePanelDoubleSided(panel);
  const selected = useUiStore((s) => s.selectedPanelId === panel.id);
  const showSelection = useUiStore((s) => s.viewMode !== '3d');
  const selectPanel = useUiStore((s) => s.selectPanel);
  const [hovered, setHovered] = useState(false);

  const handlers = useMemo(
    () => ({
      onClick: (e: ThreeEvent<MouseEvent>) => {
        if (e.delta > CLICK_TOLERANCE_PX) return;
        e.stopPropagation();
        selectPanel(panel.id);
      },
      onPointerOver: (e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = 'pointer';
      },
      onPointerOut: () => {
        setHovered(false);
        document.body.style.cursor = '';
      },
    }),
    [panel.id, selectPanel],
  );

  const highlight = (selected && showSelection) || hovered ? (selected ? 0.07 : 0.04) : 0;

  if (geometry) {
    return (
      <mesh geometry={geometry} castShadow receiveShadow {...handlers}>
        <meshStandardMaterial map={texture} side={DoubleSide} roughness={0.82} metalness={0} emissive="#ffffff" emissiveIntensity={highlight} />
      </mesh>
    );
  }

  return (
    <group position={position}>
      <mesh castShadow receiveShadow {...handlers}>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial map={texture} side={FrontSide} roughness={0.82} emissive="#ffffff" emissiveIntensity={highlight} />
      </mesh>
      {backFace && (
        <mesh rotation={[0, Math.PI, 0]} {...handlers}>
          <planeGeometry args={[width, height]} />
          {doubleSided ? (
            <meshStandardMaterial map={texture} roughness={0.82} emissive="#ffffff" emissiveIntensity={highlight} />
          ) : (
            <meshStandardMaterial color={color} roughness={0.9} emissive="#ffffff" emissiveIntensity={highlight} />
          )}
        </mesh>
      )}
    </group>
  );
}
