import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../../store';
import { computeBodyMetrics, BODY_GROUP_OFFSET_Y } from '../../utils/bodyMetrics';
import { useGarmentMaterial, TorsoGarment, SleeveGarment } from './Garment';

export function VirtualModel() {
  const groupRef = useRef<THREE.Group>(null);
  const modelSettings = useStore((state) => state.modelSettings);
  const isPlaying = useStore((state) => state.isPlaying);

  // 使用共享的人体尺寸计算，保证与服装 Garment 完全对齐
  const metrics = useMemo(() => computeBodyMetrics(modelSettings), [modelSettings]);
  const { heightScale, scales } = metrics;

  // 服装材质（带程序化纹理），供作为子节点的服装图层复用
  const garmentMaterial = useGarmentMaterial();

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

  return (
    <group ref={groupRef} position={[0, BODY_GROUP_OFFSET_Y, 0]}>
      <group position={[0, metrics.headY, 0]}>
        <mesh castShadow>
          <sphereGeometry args={[metrics.headRadius, 32, 32]} />
          {skinMaterial}
        </mesh>
        <mesh position={[0, -0.2 * heightScale, 0]} castShadow>
          <cylinderGeometry args={[0.12 * heightScale, 0.15 * heightScale, metrics.neckHeight, 32]} />
          {skinMaterial}
        </mesh>
      </group>

      <group position={[0, metrics.torsoY, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[metrics.torsoTopRadius, metrics.torsoBottomRadius, metrics.torsoHeight, 32]} />
          {skinMaterial}
        </mesh>
        {/* 上衣作为躯干 group 的子节点，随躯干一起变换 */}
        <TorsoGarment metrics={metrics} material={garmentMaterial} />
      </group>

      <group position={[0, metrics.hipsY, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[metrics.hipsTopRadius, metrics.hipsBottomRadius, metrics.hipsHeight, 32]} />
          {skinMaterial}
        </mesh>
      </group>

      <group position={[metrics.armX, metrics.armY, 0]}>
        <mesh castShadow>
          <capsuleGeometry args={[metrics.armRadius, metrics.armLength, 8, 16]} />
          {skinMaterial}
        </mesh>
        <mesh position={[0, -0.35 * scales.limbs * heightScale, 0]} castShadow>
          <sphereGeometry args={[0.07 * heightScale, 16, 16]} />
          {skinMaterial}
        </mesh>
        {/* 袖子作为手臂 group 的子节点，随手臂一起变换 */}
        <SleeveGarment metrics={metrics} material={garmentMaterial} />
      </group>

      <group position={[-metrics.armX, metrics.armY, 0]}>
        <mesh castShadow>
          <capsuleGeometry args={[metrics.armRadius, metrics.armLength, 8, 16]} />
          {skinMaterial}
        </mesh>
        <mesh position={[0, -0.35 * scales.limbs * heightScale, 0]} castShadow>
          <sphereGeometry args={[0.07 * heightScale, 16, 16]} />
          {skinMaterial}
        </mesh>
        {/* 袖子作为手臂 group 的子节点，随手臂一起变换 */}
        <SleeveGarment metrics={metrics} material={garmentMaterial} />
      </group>

      <group position={[metrics.legX, metrics.legY, 0]}>
        <mesh castShadow>
          <capsuleGeometry args={[0.08 * heightScale, 0.7 * scales.limbs * heightScale, 8, 16]} />
          {skinMaterial}
        </mesh>
        <mesh position={[0, -0.45 * scales.limbs * heightScale, 0.02]} castShadow>
          <boxGeometry args={[0.12 * heightScale, 0.08 * heightScale, 0.2 * heightScale]} />
          {skinMaterial}
        </mesh>
      </group>

      <group position={[-metrics.legX, metrics.legY, 0]}>
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
