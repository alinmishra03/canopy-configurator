import { useMemo } from 'react';
import { Quaternion, Vector3 } from 'three';
import { DIM } from './dimensions';

type Vec3 = [number, number, number];

interface BarProps {
  from: Vec3;
  to: Vec3;
  radius?: number;
  children: React.ReactNode;
}

const UP = new Vector3(0, 1, 0);

/** A cylinder spanning two points; the material is passed as a child. */
function Bar({ from, to, radius = 0.05, children }: BarProps) {
  const { position, quaternion, length } = useMemo(() => {
    const a = new Vector3(...from);
    const b = new Vector3(...to);
    const dir = b.clone().sub(a);
    return {
      length: dir.length(),
      position: a.clone().add(b).multiplyScalar(0.5),
      quaternion: new Quaternion().setFromUnitVectors(UP, dir.normalize()),
    };
  }, [from, to]);
  return (
    <mesh position={position} quaternion={quaternion} castShadow>
      <cylinderGeometry args={[radius, radius, length, 10]} />
      {children}
    </mesh>
  );
}

export type FrameStyle = 'standard' | 'light-up' | 'none';

interface FrameProps {
  style: FrameStyle;
  /** Half walls add a mid-height rail on the left and right sides. */
  halfWallRails: boolean;
}

/**
 * Procedural pop-up hex frame: four legs, scissor trusses, top rails and roof
 * supports. "none" renders a faint reference frame because the canopy-only
 * option ships without one.
 */
export function Frame({ style, halfWallRails }: FrameProps) {
  const ghost = style === 'none';
  const { legInset: L, eave, peak, leg } = DIM;
  const trussLow = eave - 0.75;

  const material = ghost ? (
    <meshStandardMaterial color="#9aa3ad" transparent opacity={0.16} depthWrite={false} />
  ) : (
    <meshStandardMaterial color="#c9ced4" metalness={0.75} roughness={0.32} />
  );

  const corners: Array<[number, number]> = [
    [L, L],
    [-L, L],
    [-L, -L],
    [L, -L],
  ];

  const sides: Array<[[number, number], [number, number]]> = [
    [[-L, L], [L, L]],
    [[L, L], [L, -L]],
    [[L, -L], [-L, -L]],
    [[-L, -L], [-L, L]],
  ];

  return (
    <group>
      {corners.map(([x, z]) => (
        <group key={`leg-${x}-${z}`}>
          <mesh position={[x, eave / 2, z]} castShadow>
            <boxGeometry args={[leg, eave, leg]} />
            {material}
          </mesh>
          {!ghost && (
            <mesh position={[x, 0.02, z]} receiveShadow>
              <boxGeometry args={[0.42, 0.04, 0.42]} />
              <meshStandardMaterial color="#8d939a" metalness={0.6} roughness={0.45} />
            </mesh>
          )}
          <Bar from={[x, eave, z]} to={[0, peak - 0.12, 0]} radius={0.04}>
            {material}
          </Bar>
          {style === 'light-up' && (
            <mesh position={[x - Math.sign(x) * 0.09, eave / 2 + 0.2, z - Math.sign(z) * 0.09]}>
              <boxGeometry args={[0.035, eave - 0.6, 0.035]} />
              <meshStandardMaterial color="#ffffff" emissive="#9fd8ff" emissiveIntensity={3} toneMapped={false} />
            </mesh>
          )}
        </group>
      ))}

      {sides.map(([[x1, z1], [x2, z2]], i) => {
        const mx = (x1 + x2) / 2;
        const mz = (z1 + z2) / 2;
        return (
          <group key={`side-${i}`}>
            <Bar from={[x1, eave, z1]} to={[x2, eave, z2]} radius={0.045}>
              {material}
            </Bar>
            <Bar from={[x1, eave, z1]} to={[mx, trussLow, mz]}>{material}</Bar>
            <Bar from={[x1, trussLow, z1]} to={[mx, eave, mz]}>{material}</Bar>
            <Bar from={[mx, eave, mz]} to={[x2, trussLow, z2]}>{material}</Bar>
            <Bar from={[mx, trussLow, mz]} to={[x2, eave, z2]}>{material}</Bar>
            {style === 'light-up' && (
              <Bar from={[x1, eave - 0.1, z1]} to={[x2, eave - 0.1, z2]} radius={0.025}>
                <meshStandardMaterial color="#ffffff" emissive="#9fd8ff" emissiveIntensity={3} toneMapped={false} />
              </Bar>
            )}
          </group>
        );
      })}

      {halfWallRails &&
        [L, -L].map((x) => (
          <Bar key={`rail-${x}`} from={[x, DIM.halfWallHeight, L]} to={[x, DIM.halfWallHeight, -L]} radius={0.04}>
            {material}
          </Bar>
        ))}

      {style === 'light-up' && <pointLight position={[0, eave - 0.4, 0]} intensity={14} distance={14} color="#cfeaff" />}
    </group>
  );
}
