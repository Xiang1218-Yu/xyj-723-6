import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../../store';
import { BodyType } from '../../types';

const bodyTypeScales: Record<BodyType, { torso: number; hips: number; limbs: number }> = {
  slim: { torso: 0.85, hips: 0.85, limbs: 1.05 },
  standard: { torso: 1, hips: 1, limbs: 1 },
  athletic: { torso: 1.1, hips: 0.9, limbs: 1.05 },
  curvy: { torso: 0.95, hips: 1.15, limbs: 0.95 },
};

export function VirtualModel() {
  const groupRef = useRef<THREE.Group>(null);
  const modelSettings = useStore((state) => state.modelSettings);
  const isPlaying = useStore((state) => state.isPlaying);

  const { bodyType, measurements } = modelSettings;
  const scales = bodyTypeScales[bodyType];

  const heightScale = measurements.height / 175;
  const bustScale = measurements.bust / 90;
  const waistScale = measurements.waist / 65;
  const hipsScale = measurements.hips / 95;

  useFrame((state) => {
    if (!groupRef.current) return;
    if (isPlaying) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.3;
    } else {
      groupRef.current.rotation.y = 0;
    }
  });

  const skinMaterial = useMemo(() => (
    <meshStandardMaterial
      color="#F5DEB3"
      roughness={0.7}
      metalness={0.1}
    />
  ), []);

  const headRadius = 0.18 * heightScale;
  const neckHeight = 0.25 * heightScale;
  const torsoHeight = 0.6 * scales.torso * heightScale;
  const torsoTopRadius = 0.28 * scales.torso * bustScale;
  const torsoBottomRadius = 0.22 * scales.torso * waistScale;
  const hipsHeight = 0.3 * scales.hips * heightScale;
  const hipsTopRadius = 0.22 * scales.hips * waistScale;
  const hipsBottomRadius = 0.3 * scales.hips * hipsScale;
  const headY = 1.6 * heightScale;
  const torsoY = 0.95 * scales.torso * heightScale;
  const hipsY = 0.5 * scales.hips * heightScale;
  const armX = 0.4 * scales.limbs * bustScale;
  const armY = 1.1 * heightScale;
  const legX = 0.15 * scales.limbs * hipsScale;
  const legY = 0.1 * heightScale;

  return (
    <group ref={groupRef} position={[0, -0.5, 0]}>
      <group position={[0, headY, 0]}>
        <mesh castShadow>
          <sphereGeometry args={[headRadius, 32, 32]} />
          {skinMaterial}
        </mesh>
        <mesh position={[0, -0.2 * heightScale, 0]} castShadow>
          <cylinderGeometry args={[0.12 * heightScale, 0.15 * heightScale, neckHeight, 32]} />
          {skinMaterial}
        </mesh>
      </group>

      <group position={[0, torsoY, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[torsoTopRadius, torsoBottomRadius, torsoHeight, 32]} />
          {skinMaterial}
        </mesh>
      </group>

      <group position={[0, hipsY, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[hipsTopRadius, hipsBottomRadius, hipsHeight, 32]} />
          {skinMaterial}
        </mesh>
      </group>

      <group position={[armX, armY, 0]}>
        <mesh castShadow>
          <capsuleGeometry args={[0.06 * heightScale, 0.5 * scales.limbs * heightScale, 8, 16]} />
          {skinMaterial}
        </mesh>
        <mesh position={[0, -0.35 * scales.limbs * heightScale, 0]} castShadow>
          <sphereGeometry args={[0.07 * heightScale, 16, 16]} />
          {skinMaterial}
        </mesh>
      </group>

      <group position={[-armX, armY, 0]}>
        <mesh castShadow>
          <capsuleGeometry args={[0.06 * heightScale, 0.5 * scales.limbs * heightScale, 8, 16]} />
          {skinMaterial}
        </mesh>
        <mesh position={[0, -0.35 * scales.limbs * heightScale, 0]} castShadow>
          <sphereGeometry args={[0.07 * heightScale, 16, 16]} />
          {skinMaterial}
        </mesh>
      </group>

      <group position={[legX, legY, 0]}>
        <mesh castShadow>
          <capsuleGeometry args={[0.08 * heightScale, 0.7 * scales.limbs * heightScale, 8, 16]} />
          {skinMaterial}
        </mesh>
        <mesh position={[0, -0.45 * scales.limbs * heightScale, 0.02]} castShadow>
          <boxGeometry args={[0.12 * heightScale, 0.08 * heightScale, 0.2 * heightScale]} />
          {skinMaterial}
        </mesh>
      </group>

      <group position={[-legX, legY, 0]}>
        <mesh castShadow>
          <capsuleGeometry args={[0.08 * heightScale, 0.7 * scales.limbs * heightScale, 8, 16]} />
          {skinMaterial}
        </mesh>
        <mesh position={[0, -0.45 * scales.limbs * heightScale, 0.02]} castShadow>
          <boxGeometry args={[0.12 * heightScale, 0.08 * heightScale, 0.2 * heightScale]} />
          {skinMaterial}
        </mesh>
      </group>
    </group>
  );
}
