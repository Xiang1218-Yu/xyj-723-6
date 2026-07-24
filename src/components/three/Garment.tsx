import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../../store';
import { BodyMetrics } from '../../utils/bodyMetrics';
import { getFabricTextures } from '../../utils/fabricTextures';

/**
 * 服装图层组件
 * 这些图层不再作为独立 group 与人体做位置对齐，而是以人体各部位
 * group 的子节点形式渲染（真实的层级包裹关系）：
 * 上衣是躯干 group 的子节点、袖子是手臂 group 的子节点，
 * 因此会自动继承父级（人体部位）的平移与旋转变换。
 */

/**
 * 服装材质 hook
 * 根据当前选中面料生成带程序化纹理、法线、粗糙度与环境光遮蔽(AO)的材质。
 */
export function useGarmentMaterial(): THREE.MeshStandardMaterial {
  const selectedFabric = useStore((state) => state.selectedFabric);
  const showWireframe = useStore((state) => state.showWireframe);

  // 逐面料生成专属纹理集合，保证同类别不同面料也有明显差异
  const textures = useMemo(
    () => (selectedFabric ? getFabricTextures(selectedFabric) : null),
    [selectedFabric]
  );

  return useMemo(() => {
    const props = selectedFabric?.materialProps;
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(props?.color ?? '#E8D5C4'),
      roughness: props?.roughness ?? 0.8,
      metalness: props?.metalness ?? 0.05,
      side: THREE.DoubleSide,
      wireframe: showWireframe,
    });

    if (textures) {
      mat.map = textures.map;
      mat.normalMap = textures.normalMap;
      mat.roughnessMap = textures.roughnessMap;
      // 应用环境光遮蔽贴图，并按面料 aoIntensity 控制遮蔽强度
      mat.aoMap = textures.aoMap;
      mat.aoMapIntensity = props?.aoIntensity ?? 0.3;
      const normalScale = props?.normalScale ?? 0.5;
      mat.normalScale = new THREE.Vector2(normalScale, normalScale);
    }
    return mat;
  }, [selectedFabric, showWireframe, textures]);
}

// AO 贴图需要第二套 UV。几何体创建后把 uv 复制到 uv1 通道，使 aoMap 生效
function setupAoUv(geometry: THREE.BufferGeometry | null): void {
  if (geometry && geometry.attributes.uv && !geometry.attributes.uv1) {
    geometry.setAttribute('uv1', geometry.attributes.uv.clone());
  }
}

interface GarmentLayerProps {
  metrics: BodyMetrics;
  material: THREE.MeshStandardMaterial;
}

/**
 * 上衣图层：作为躯干 group 的子节点渲染。
 * 使用躯干 group 的局部坐标，向下延伸包裹躯干与部分臀部。
 */
export function TorsoGarment({ metrics, material }: GarmentLayerProps) {
  const bodyRef = useRef<THREE.Mesh>(null);
  const selectedFabric = useStore((state) => state.selectedFabric);
  const garmentSettings = useStore((state) => state.garmentSettings);
  const isPlaying = useStore((state) => state.isPlaying);

  const { fit, length } = garmentSettings;
  // 版型决定服装相对人体的宽松程度
  const fitScale = fit === 'tight' ? 1.04 : fit === 'loose' ? 1.2 : 1.1;
  // 面料厚度带来的额外外扩间隙，让衣服包裹在皮肤外层
  const clothingGap = selectedFabric ? 0.01 + selectedFabric.physicalParams.thickness * 0.03 : 0.02;

  // 躯干 group 位于世界坐标 y=torsoY，此处均换算为相对该 group 的局部坐标
  const shoulderWorldY = metrics.torsoY + metrics.torsoHeight / 2;
  const coverLength = metrics.torsoHeight + metrics.hipsHeight * (length / 50);
  const bottomWorldY = shoulderWorldY - coverLength;
  const centerWorldY = (shoulderWorldY + bottomWorldY) / 2;
  // 转为躯干 group 的局部 Y
  const centerLocalY = centerWorldY - metrics.torsoY;
  const shoulderLocalY = shoulderWorldY - metrics.torsoY;

  const topRadius = metrics.torsoTopRadius * fitScale + clothingGap;
  const bottomRadius = Math.max(metrics.hipsTopRadius, metrics.torsoBottomRadius) * fitScale + clothingGap;

  const drape = selectedFabric ? selectedFabric.physicalParams.drape : 0.6;

  useFrame((state) => {
    if (!bodyRef.current) return;
    // 轻微布料摆动：垂坠越好摆动越小（旋转由父级人体 group 继承，无需重复）
    const sway = isPlaying ? Math.sin(state.clock.elapsedTime * 1.5) * 0.015 * (1 - drape) : 0;
    bodyRef.current.rotation.z = sway * 0.3;
  });

  return (
    <>
      <mesh ref={bodyRef} position={[0, centerLocalY, 0]} castShadow receiveShadow material={material}>
        <cylinderGeometry
          args={[topRadius, bottomRadius, coverLength, 32, 12, true]}
          ref={setupAoUv}
        />
      </mesh>

      {/* 肩部盖布，封住衣服顶部使其自然搭在肩上 */}
      <mesh position={[0, shoulderLocalY, 0]} rotation={[-Math.PI / 2, 0, 0]} castShadow receiveShadow material={material}>
        <ringGeometry args={[metrics.neckHeight * 0.4, topRadius, 32]} ref={setupAoUv} />
      </mesh>
    </>
  );
}

/**
 * 袖子图层：作为手臂 group 的子节点渲染，包裹对应手臂。
 * 手臂 group 位于世界坐标 [±armX, armY, 0]，此处使用其局部坐标。
 */
export function SleeveGarment({ metrics, material }: GarmentLayerProps) {
  const sleeveRef = useRef<THREE.Mesh>(null);
  const selectedFabric = useStore((state) => state.selectedFabric);
  const garmentSettings = useStore((state) => state.garmentSettings);
  const isPlaying = useStore((state) => state.isPlaying);

  const { fit, sleeveLength } = garmentSettings;
  const fitScale = fit === 'tight' ? 1.04 : fit === 'loose' ? 1.2 : 1.1;
  const clothingGap = selectedFabric ? 0.01 + selectedFabric.physicalParams.thickness * 0.03 : 0.02;

  const sleeveTopWorldY = metrics.armY + metrics.armLength / 2;
  const sleeveLen = metrics.armLength * (sleeveLength / 25);
  const centerWorldY = sleeveTopWorldY - sleeveLen / 2;
  // 转为手臂 group 的局部 Y
  const centerLocalY = centerWorldY - metrics.armY;
  const sleeveRadius = metrics.armRadius * fitScale + clothingGap;

  const wrinkle = selectedFabric ? selectedFabric.physicalParams.wrinkle : 0.4;

  useFrame((state) => {
    if (!sleeveRef.current) return;
    const wave = isPlaying ? Math.sin(state.clock.elapsedTime * 2) * 0.02 * wrinkle : 0;
    sleeveRef.current.rotation.x = wave;
  });

  return (
    <mesh ref={sleeveRef} position={[0, centerLocalY, 0]} castShadow receiveShadow material={material}>
      <cylinderGeometry args={[sleeveRadius, sleeveRadius * 0.92, sleeveLen, 24, 8, true]} ref={setupAoUv} />
    </mesh>
  );
}
