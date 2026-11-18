import { Suspense, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { ContactShadows, OrbitControls } from '@react-three/drei';
import { PerspectiveCamera, Vector3 } from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { useUiStore } from '@/store/uiStore';
import { CanopyModel } from './scene/CanopyModel';
import { CAMERA_DEFAULT, defaultCameraPosition } from './scene/dimensions';
import { viewerBridge } from './viewerBridge';

const MIN_DISTANCE = 9;
const MAX_DISTANCE = 55;

/** Registers camera/capture functions with the viewer bridge. */
function ViewerControlsBridge() {
  const { camera, gl, scene, size, invalidate } = useThree();
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null;

  useEffect(() => {
    const target = new Vector3(...CAMERA_DEFAULT.target);
    viewerBridge.register({
      zoom(factor) {
        const orbitTarget = controls?.target ?? target;
        const offset = camera.position.clone().sub(orbitTarget);
        const distance = Math.min(MAX_DISTANCE, Math.max(MIN_DISTANCE, offset.length() * factor));
        camera.position.copy(orbitTarget.clone().add(offset.setLength(distance)));
        controls?.update();
        invalidate();
      },
      resetView() {
        camera.position.set(...defaultCameraPosition(size.width / Math.max(1, size.height)));
        controls?.target.copy(target);
        controls?.update();
        invalidate();
      },
      capture() {
        const shot = new PerspectiveCamera(CAMERA_DEFAULT.fov, size.width / Math.max(1, size.height), 0.1, 200);
        shot.position.set(...defaultCameraPosition(size.width / Math.max(1, size.height)));
        shot.lookAt(target);
        gl.render(scene, shot);
        const data = gl.domElement.toDataURL('image/png');
        invalidate();
        return data;
      },
    });
    return () => viewerBridge.register(null);
  }, [camera, gl, scene, size, controls, invalidate]);

  // Re-frame the product when the viewport shape changes noticeably (split view, rotation).
  const aspectBucket = Math.round((size.width / Math.max(1, size.height)) * 4);
  useEffect(() => {
    if (size.width > 0 && size.height > 0) viewerBridge.resetView();
  }, [aspectBucket, controls]);

  return null;
}

export function ProductViewer3D() {
  const autoRotate = useUiStore((s) => s.autoRotate);

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      frameloop={autoRotate ? 'always' : 'demand'}
      camera={{ position: CAMERA_DEFAULT.position, fov: CAMERA_DEFAULT.fov, near: 0.1, far: 200 }}
      gl={{ antialias: true, preserveDrawingBuffer: false, alpha: true }}
      aria-label="Interactive 3D canopy preview"
      role="img"
    >
      <hemisphereLight args={['#ffffff', '#d9d5cc', 1.25]} />
      <directionalLight
        position={[10, 18, 12]}
        intensity={1.9}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
        shadow-bias={-0.0004}
      />
      <directionalLight position={[-12, 8, -10]} intensity={0.55} />

      <Suspense fallback={null}>
        <CanopyModel />
      </Suspense>

      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[30, 64]} />
        <shadowMaterial opacity={0.12} />
      </mesh>
      <ContactShadows position={[0, 0.01, 0]} scale={24} far={10} blur={2.4} opacity={0.38} resolution={512} />

      <OrbitControls
        makeDefault
        target={CAMERA_DEFAULT.target}
        enableDamping
        dampingFactor={0.08}
        minDistance={MIN_DISTANCE}
        maxDistance={MAX_DISTANCE}
        maxPolarAngle={Math.PI / 2 - 0.04}
        autoRotate={autoRotate}
        autoRotateSpeed={0.8}
        enablePan={false}
      />
      <ViewerControlsBridge />
    </Canvas>
  );
}
