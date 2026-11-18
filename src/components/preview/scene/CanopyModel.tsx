import { useMemo } from 'react';
import type { PanelDefinition } from '@shared/types';
import { useActivePanels, useSelectedVariant } from '@/store/selectors';
import { PrintedPanel } from './PrintedPanel';
import { Frame, type FrameStyle } from './Frame';
import { DIM, SIDE_ROTATION, createRoofFaceGeometry, type Side } from './dimensions';

/** Panel ids follow "<group>-<side>"; this extracts the side. */
function sideOf(panel: PanelDefinition): Side {
  const side = panel.id.split('-').pop();
  return side && side in SIDE_ROTATION ? (side as Side) : 'front';
}

/**
 * The configurable canopy. Structure comes from the selected variants; every
 * fabric surface is a PrintedPanel bound to the shared configuration store.
 */
export function CanopyModel() {
  const panels = useActivePanels();
  const size = useSelectedVariant('size');
  const roofGeometry = useMemo(() => createRoofFaceGeometry(), []);

  const frameStyle = (size?.attributes.frame as FrameStyle | undefined) ?? 'standard';
  const hasHalfWalls = panels.some((p) => p.group === 'halfWall');

  return (
    <group>
      <Frame style={frameStyle} halfWallRails={hasHalfWalls} />

      {panels.map((panel) => {
        const side = sideOf(panel);
        const rotation: [number, number, number] = [0, SIDE_ROTATION[side], 0];
        switch (panel.group) {
          case 'roof':
            return (
              <group key={panel.id} rotation={rotation}>
                <PrintedPanel panel={panel} geometry={roofGeometry} />
              </group>
            );
          case 'valance':
            return (
              <group key={panel.id} rotation={rotation}>
                <PrintedPanel
                  panel={panel}
                  width={DIM.half * 2 + 0.12}
                  height={DIM.valanceHeight}
                  position={[0, DIM.eave - DIM.valanceHeight / 2, DIM.half + 0.065]}
                />
              </group>
            );
          case 'sideWall':
            return (
              <group key={panel.id} rotation={rotation}>
                <PrintedPanel
                  panel={panel}
                  width={DIM.legInset * 2}
                  height={DIM.wallHeight - 0.04}
                  position={[0, DIM.wallHeight / 2 + 0.02, DIM.wallInset]}
                />
              </group>
            );
          case 'halfWall':
            return (
              <group key={panel.id} rotation={rotation}>
                <PrintedPanel
                  panel={panel}
                  width={DIM.legInset * 2}
                  height={DIM.halfWallHeight - 0.1}
                  position={[0, DIM.halfWallHeight / 2 + 0.02, DIM.wallInset]}
                />
              </group>
            );
          default:
            return null;
        }
      })}
    </group>
  );
}
