import { BufferGeometry, Float32BufferAttribute } from 'three';

/** Scene units are feet. The canopy footprint is centred on the origin. */
export const DIM = {
  half: 5,
  eave: 7,
  peak: 9.6,
  legInset: 4.92,
  leg: 0.14,
  valanceHeight: 1,
  wallHeight: 7,
  halfWallHeight: 3,
  wallInset: 4.98,
} as const;

/** Rotation around Y that turns the "front" (+Z) side to face each side. */
export const SIDE_ROTATION = {
  front: 0,
  right: Math.PI / 2,
  back: Math.PI,
  left: -Math.PI / 2,
} as const;

export type Side = keyof typeof SIDE_ROTATION;

export const CAMERA_DEFAULT = {
  position: [15, 8.5, 17] as [number, number, number],
  target: [0, 4.6, 0] as [number, number, number],
  fov: 38,
};

const DEFAULT_ASPECT = 1.5;

/**
 * Default camera position for a viewport aspect ratio. Narrow viewports
 * (split view, phones) move the camera back so the whole canopy stays in frame.
 */
export function defaultCameraPosition(aspect: number): [number, number, number] {
  const [x, y, z] = CAMERA_DEFAULT.position;
  const [tx, ty, tz] = CAMERA_DEFAULT.target;
  const scale = Math.min(2.2, Math.max(1, DEFAULT_ASPECT / Math.max(0.3, aspect)) ** 0.85);
  return [tx + (x - tx) * scale, ty + (y - ty) * scale, tz + (z - tz) * scale];
}

/**
 * Front roof face: base along the front eave, apex at the peak. UVs map the
 * panel's triangle (base at bottom of the canvas, apex at top-centre).
 */
export function createRoofFaceGeometry(): BufferGeometry {
  const { half, eave, peak } = DIM;
  const overhang = 0.06;
  const g = new BufferGeometry();
  g.setAttribute(
    'position',
    new Float32BufferAttribute([-half - overhang, eave, half + overhang, half + overhang, eave, half + overhang, 0, peak, 0], 3),
  );
  g.setAttribute('uv', new Float32BufferAttribute([0, 0, 1, 0, 0.5, 1], 2));
  g.computeVertexNormals();
  return g;
}
