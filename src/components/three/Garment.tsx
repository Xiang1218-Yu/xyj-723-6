import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../../store';
import { computeBodyMetrics, BODY_GROUP_OFFSET_Y } from '../../utils/bodyMetrics';
import { getFabricTextures } from '../../utils/fabricTextures';

export function Garment() {
  const groupRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Mesh>(null);
  const leftSleeveRef = useRef<THREE.Mesh>(null);
  const rightSleeveRef = useRef<THREE.Mesh>(null);

  const selectedFabric = useStore((state) => state.selectedFabric);
  const modelSettings = useStore((state) => state.modelSettings);
  const garmentSettings = useStore((state) => state.garmentSettings);
  const showWireframe = useStore((state) => state.showWireframe);
  const isPlaying = useStore((state) => state.isPlaying);

  // 与 VirtualModel 共用同一套人体尺寸，确保服装贴合穿戴而非漂浮错位
  const metrics = useMemo(() => computeBodyMetrics(modelSettings), [modelSettings]);

  const { fit, length, sleeveLength } = garmentSettings;
  // 版型决定服装相对人体的宽松程度
  const fitScale = fit === 'tight' ? 1.04 : fit === 'loose' ? 1.2 : 1.1;
  // 面料厚度带来的额外外扩间隙，让衣服包裹在皮肤外层
  const clothingGap = selectedFabric ? 0.01 + selectedFabric.physicalParams.thickness * 0.03 : 0.02;

  // 依据人体躯干与臀部计算上衣覆盖范围（局部坐标，与人体 group 一致）
  const shoulderY = metrics.torsoY + metrics.torsoHeight / 2;
  // length 控制衣长：默认覆盖整个躯干，加长时向臀部延伸
  const coverLength = metrics.torsoHeight + metrics.hipsHeight * (length / 50);
  const bodyBottomY = shoulderY - coverLength;
  const bodyCenterY = (shoulderY + bodyBottomY) / 2;

  const bodyTopRadius = metrics.torsoTopRadius * fitScale + clothingGap;
  const bodyBottomRadius = Math.max(metrics.hipsTopRadius, metrics.torsoBottomRadius) * fitScale + clothingGap;

  // 袖子沿手臂方向覆盖，sleeveLength 控制袖长
  const sleeveTopY = metrics.armY + metrics.armLength / 2;
  const sleeveLen = metrics.armLength * (sleeveLength / 25);
  const sleeveCenterY = sleeveTopY - sleeveLen / 2;
  const sleeveRadius = metrics.armRadius * fitScale + clothingGap;

  // 面料纹理集合：为不同材质类别生成专属的织纹、法线与粗糙度贴图
  const textures = useMemo(
    () => (selectedFabric ? getFabricTextures(selectedFabric.category) : null),
    [selectedFabric]
  );

  const material = useMemo(() => {
    const props = selectedFabric?.materialProps;
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(props?.color ?? '#E8D5C4'),
      roughness: props?.roughness ?? 0.8,
      metalness: props?.metalness ?? 0.05,
      side: THREE.DoubleSide,
      wireframe: showWireframe,
    });

    // 应用程序化纹理，体现符合材质名称的 3D 织物外观
    if (textures) {
      mat.map = textures.map;
      mat.normalMap = textures.normalMap;
      mat.roughnessMap = textures.roughnessMap;
      const normalScale = props?.normalScale ?? 0.5;
      mat.normalScale = new THREE.Vector2(normalScale, normalScale);
    }
    return mat;
  }, [selectedFabric, showWireframe, textures]);

  // 面料物理参数影响布料的垂坠与褶皱动态
  const drape = selectedFabric ? selectedFabric.physicalParams.drape : 0.6;
  const wrinkle = selectedFabric ? selectedFabric.physicalParams.wrinkle : 0.4;

  useFrame((state) => {
    if (!groupRef.current) return;

    const t = state.clock.elapsedTime;

    // 与人体保持完全相同的旋转，穿戴状态下同步转动
    if (isPlaying) {
      groupRef.current.rotation.y = t * 0.3;
    } else {
      groupRef.current.rotation.y = 0;
    }

    // 轻微的布料摆动：垂坠越好摆动越小，褶皱越多波动越明显
    const sway = Math.sin(t * 1.5) * 0.015 * (1 - drape);
    const wave = Math.sin(t * 2) * 0.02 * wrinkle;

    if (bodyRef.current) {
      bodyRef.current.rotation.z = sway * 0.3;
    }
    if (leftSleeveRef.current) {
      leftSleeveRef.current.rotation.x = wave;
    }
    if (rightSleeveRef.current) {
      rightSleeveRef.current.rotation.x = -wave;
    }
  });

  return (
    <group ref={groupRef} position={[0, BODY_GROUP_OFFSET_Y, 0]}>
      {/* 上衣主体：包裹躯干与上臀部的锥形壳体 */}
      <mesh
        ref={bodyRef}
        position={[0, bodyCenterY, 0]}
        castShadow
        receiveShadow
        material={material}
      >
        <cylinderGeometry args={[bodyTopRadius, bodyBottomRadius, coverLength, 32, 12, true]} />
      </mesh>

      {/* 肩部盖布，封住衣服顶部使其自然搭在肩上 */}
      <mesh
        position={[0, shoulderY, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        castShadow
        receiveShadow
        material={material}
      >
        <ringGeometry args={[metrics.neckHeight * 0.4, bodyTopRadius, 32]} />
      </mesh>

      {/* 左袖：包裹左手臂 */}
      <mesh
        ref={leftSleeveRef}
        position={[metrics.armX, sleeveCenterY, 0]}
        castShadow
        receiveShadow
        material={material}
      >
        <cylinderGeometry args={[sleeveRadius, sleeveRadius * 0.92, sleeveLen, 24, 8, true]} />
      </mesh>

      {/* 右袖：包裹右手臂 */}
      <mesh
        ref={rightSleeveRef}
        position={[-metrics.armX, sleeveCenterY, 0]}
        castShadow
        receiveShadow
        material={material}
      >
        <cylinderGeometry args={[sleeveRadius, sleeveRadius * 0.92, sleeveLen, 24, 8, true]} />
      </mesh>
    </group>
  );
}
