import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../../store';

export function Garment() {
  const groupRef = useRef<THREE.Group>(null);
  const frontRef = useRef<THREE.Mesh>(null);
  const backRef = useRef<THREE.Mesh>(null);
  const leftSleeveRef = useRef<THREE.Mesh>(null);
  const rightSleeveRef = useRef<THREE.Mesh>(null);

  const selectedFabric = useStore((state) => state.selectedFabric);
  const garmentSettings = useStore((state) => state.garmentSettings);
  const showWireframe = useStore((state) => state.showWireframe);
  const isPlaying = useStore((state) => state.isPlaying);

  const { fit, length, sleeveLength } = garmentSettings;
  const fitScale = fit === 'tight' ? 0.88 : fit === 'loose' ? 1.12 : 1.0;

  const bodyHeight = 0.65 * (length / 50);
  const bodyWidth = 0.28 * fitScale;
  const bodyDepth = 0.16 * fitScale;
  const sleeveLen = 0.32 * (sleeveLength / 25);

  const material = useMemo(() => {
    if (!selectedFabric) {
      return new THREE.MeshStandardMaterial({
        color: '#E8D5C4',
        side: THREE.DoubleSide,
        roughness: 0.8,
        metalness: 0.05,
        wireframe: showWireframe,
      });
    }

    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(selectedFabric.materialProps.color),
      roughness: selectedFabric.materialProps.roughness,
      metalness: selectedFabric.materialProps.metalness,
      side: THREE.DoubleSide,
      wireframe: showWireframe,
    });
  }, [selectedFabric, showWireframe]);

  const drape = selectedFabric ? selectedFabric.physicalParams.drape : 0.6;
  const wrinkle = selectedFabric ? selectedFabric.physicalParams.wrinkle : 0.4;

  useFrame((state) => {
    if (!groupRef.current) return;

    const t = state.clock.elapsedTime;

    if (isPlaying) {
      groupRef.current.rotation.y = t * 0.3;
    } else {
      groupRef.current.rotation.y = 0;
    }

    const wobble = Math.sin(t * 1.5) * 0.01 * (1 - drape);
    const wave = Math.sin(t * 2) * 0.008 * wrinkle;

    if (frontRef.current) {
      frontRef.current.rotation.x = wobble * 0.15;
    }
    if (backRef.current) {
      backRef.current.rotation.x = -wobble * 0.15;
    }

    if (leftSleeveRef.current) {
      leftSleeveRef.current.rotation.z = -0.4 + wobble * 0.5;
      leftSleeveRef.current.rotation.x = wave * 0.3;
    }

    if (rightSleeveRef.current) {
      rightSleeveRef.current.rotation.z = 0.4 - wobble * 0.5;
      rightSleeveRef.current.rotation.x = -wave * 0.3;
    }
  });

  return (
    <group ref={groupRef} position={[0, 0.85, 0]}>
      <mesh ref={frontRef} position={[0, 0, bodyDepth * 0.52]} castShadow receiveShadow material={material}>
        <planeGeometry args={[bodyWidth * 2.0, bodyHeight, 8, 12]} />
      </mesh>

      <mesh ref={backRef} position={[0, 0, -bodyDepth * 0.52]} castShadow receiveShadow material={material}>
        <planeGeometry args={[bodyWidth * 2.0, bodyHeight, 8, 12]} />
      </mesh>

      <mesh position={[-bodyWidth, 0, 0]} rotation={[0, Math.PI / 2, 0]} castShadow receiveShadow material={material}>
        <planeGeometry args={[bodyDepth * 1.05, bodyHeight, 4, 8]} />
      </mesh>

      <mesh position={[bodyWidth, 0, 0]} rotation={[0, -Math.PI / 2, 0]} castShadow receiveShadow material={material}>
        <planeGeometry args={[bodyDepth * 1.05, bodyHeight, 4, 8]} />
      </mesh>

      <group position={[-bodyWidth * 1.05, bodyHeight * 0.22, 0]}>
        <mesh ref={leftSleeveRef} castShadow receiveShadow material={material}>
          <cylinderGeometry args={[0.085, 0.07, sleeveLen, 20, 10, true]} />
        </mesh>
      </group>

      <group position={[bodyWidth * 1.05, bodyHeight * 0.22, 0]}>
        <mesh ref={rightSleeveRef} castShadow receiveShadow material={material}>
          <cylinderGeometry args={[0.085, 0.07, sleeveLen, 20, 10, true]} />
        </mesh>
      </group>
    </group>
  );
}
