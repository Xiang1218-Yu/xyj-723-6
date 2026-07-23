import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../../store';
import { getFabricTextures, getFabricFeatures } from '../../utils/fabricTextures';
import { BodyType } from '../../types';

// 与 VirtualModel 中保持一致的体型缩放参数，用于将服装对齐到模特身体
const bodyTypeScales: Record<BodyType, { torso: number; hips: number; limbs: number }> = {
  slim: { torso: 0.85, hips: 0.85, limbs: 1.05 },
  standard: { torso: 1, hips: 1, limbs: 1 },
  athletic: { torso: 1.1, hips: 0.9, limbs: 1.05 },
  curvy: { torso: 0.95, hips: 1.15, limbs: 0.95 },
};

// 版型对应的服装与身体之间的间隙（紧身/常规/宽松）
const fitOffsetMap = { tight: 0.006, regular: 0.02, loose: 0.042 } as const;

export function Garment() {
  const groupRef = useRef<THREE.Group>(null);
  const torsoRef = useRef<THREE.Mesh>(null);
  const leftSleeveRef = useRef<THREE.Group>(null);
  const rightSleeveRef = useRef<THREE.Group>(null);

  const selectedFabric = useStore((state) => state.selectedFabric);
  const garmentSettings = useStore((state) => state.garmentSettings);
  const modelSettings = useStore((state) => state.modelSettings);
  const showWireframe = useStore((state) => state.showWireframe);
  const isPlaying = useStore((state) => state.isPlaying);

  const { fit, length, sleeveLength, garmentType } = garmentSettings;
  const { bodyType, measurements } = modelSettings;
  const scales = bodyTypeScales[bodyType];

  // 读取模特身体尺寸，确保服装尺寸与身体对齐
  const heightScale = measurements.height / 175;
  const bustScale = measurements.bust / 90;
  const waistScale = measurements.waist / 65;
  const hipsScale = measurements.hips / 95;

  // 身体各部分几何尺寸（与 VirtualModel 保持一致）
  const torsoHeight = 0.6 * scales.torso * heightScale;
  const torsoTopRadius = 0.28 * scales.torso * bustScale;
  const torsoBottomRadius = 0.22 * scales.torso * waistScale;
  const torsoY = 0.95 * scales.torso * heightScale;
  const hipsY = 0.5 * scales.hips * heightScale;
  const hipsBottomRadius = 0.3 * scales.hips * hipsScale;

  // 肩部位置（躯干顶部）
  const shoulderY = torsoY + torsoHeight / 2;

  // 服装长度由滑块控制（衣长 30-80cm）
  const garmentLength = length * 0.011;
  // 服装下摆位置，以及下摆半径（若下摆落到臀部区域则参考臀围）
  const hemY = shoulderY - garmentLength;
  const centerY = (shoulderY + hemY) / 2;

  // 根据下摆位置在内插值下摆半径（腰部→臀部），模拟服装随身体曲线
  const waistBottomY = torsoY - torsoHeight / 2;
  const hipsBottomY = hipsY - 0.15;
  const hemT = THREE.MathUtils.clamp((hemY - waistBottomY) / (hipsBottomY - waistBottomY), 0, 1);
  const hemRadius = THREE.MathUtils.lerp(torsoBottomRadius, hipsBottomRadius, hemT * 0.7);

  // 版型间隙
  const fitOffset = fitOffsetMap[fit];
  const topRadius = torsoTopRadius + fitOffset;
  const bottomRadius = hemRadius + fitOffset * 1.1;

  // 袖长（0 表示无袖），袖管几何
  const sleeveLen = sleeveLength * 0.012;
  const sleeveAngle = 0.32; // 袖子自然下垂并略向外展开的角度
  const sleeveTopRadius = 0.085 * scales.limbs * heightScale + fitOffset;
  const sleeveBottomRadius = 0.07 * scales.limbs * heightScale + fitOffset;

  // 裙装/连衣裙会拉长下摆（此处对 tshirt/jacket 使用上述长度，dress 追加长度）
  const isLongGarment = garmentType === 'dress';
  const finalLength = isLongGarment ? garmentLength * 1.5 : garmentLength;
  const finalBottomRadius = isLongGarment ? bottomRadius * 1.15 : bottomRadius;
  const finalCenterY = isLongGarment
    ? (shoulderY + shoulderY - finalLength) / 2
    : centerY;

  // 构建服装材质，使用程序化纹理与物理材质参数
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

    // 生成/获取该面料类别的程序化纹理
    const textures = getFabricTextures(selectedFabric, 4, 4);
    // 该类别对应的材质视觉特征（清漆、绒面光泽等）
    const features = getFabricFeatures(selectedFabric.category);

    return new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(selectedFabric.materialProps.color),
      roughness: selectedFabric.materialProps.roughness,
      metalness: selectedFabric.materialProps.metalness,
      // 凹凸贴图使用 procedural 纹理体现编织/纤维质感
      bumpMap: textures.bumpMap,
      bumpScale: selectedFabric.materialProps.normalScale * 0.08,
      // 粗糙度贴图让表面粗糙度随纹理变化
      roughnessMap: textures.roughnessMap,
      // 物理材质特性：丝绸用清漆层，羊毛/牛仔用绒面光泽
      clearcoat: features.clearcoat,
      clearcoatRoughness: features.clearcoatRoughness,
      sheen: features.sheen,
      sheenColor: features.sheenColor,
      sheenRoughness: features.sheenRoughness,
      reflectivity: features.reflectivity,
      side: THREE.DoubleSide,
      wireframe: showWireframe,
    });
  }, [selectedFabric, showWireframe]);

  // 材质切换时释放旧材质，避免内存泄漏
  useEffect(() => {
    return () => {
      if (material) material.dispose();
    };
  }, [material]);

  const drape = selectedFabric ? selectedFabric.physicalParams.drape : 0.6;
  const wrinkle = selectedFabric ? selectedFabric.physicalParams.wrinkle : 0.4;

  useFrame((state) => {
    if (!groupRef.current) return;

    const t = state.clock.elapsedTime;

    // 与模特同步旋转，形成整体展示效果
    if (isPlaying) {
      groupRef.current.rotation.y = t * 0.3;
    } else {
      groupRef.current.rotation.y = 0;
    }

    // 根据面料垂感/褶皱参数产生轻微摆动，越柔软摆动越明显
    const wobble = Math.sin(t * 1.5) * 0.012 * (1 - drape);
    const wave = Math.sin(t * 2) * 0.01 * wrinkle;

    // 躯干微幅前后晃动
    if (torsoRef.current) {
      torsoRef.current.rotation.x = wobble * 0.15;
    }

    // 袖子随步伐/重力轻柔摇摆（左臂旋转角为负、右臂为正，使袖管自然向外下方展开）
    if (leftSleeveRef.current) {
      leftSleeveRef.current.rotation.z = -sleeveAngle + wobble * 0.4;
      leftSleeveRef.current.rotation.x = wave * 0.3;
    }
    if (rightSleeveRef.current) {
      rightSleeveRef.current.rotation.z = sleeveAngle - wobble * 0.4;
      rightSleeveRef.current.rotation.x = -wave * 0.3;
    }
  });

  return (
    // 与 VirtualModel 相同的基准位置 [0, -0.5, 0]，确保服装穿戴在模特身上而非浮于后方
    <group ref={groupRef} position={[0, -0.5, 0]}>
      {/* 服装躯干：使用圆台（tapered cylinder）包裹躯干，取代原先位于身体后方的平面 */}
      <mesh
        ref={torsoRef}
        position={[0, finalCenterY, 0]}
        castShadow
        receiveShadow
        material={material}
      >
        <cylinderGeometry
          args={[topRadius, finalBottomRadius, finalLength, 48, 12, true]}
        />
      </mesh>

      {/* 左肩袖：从肩部向外下方延伸，覆盖上臂 */}
      {sleeveLen > 0.001 && (
        <group
          ref={leftSleeveRef}
          position={[-torsoTopRadius, shoulderY, 0]}
          rotation={[0, 0, -sleeveAngle]}
        >
          <mesh
            position={[0, -sleeveLen / 2, 0]}
            castShadow
            receiveShadow
            material={material}
          >
            <cylinderGeometry
              args={[sleeveTopRadius, sleeveBottomRadius, sleeveLen, 24, 8, true]}
            />
          </mesh>
        </group>
      )}

      {/* 右肩袖 */}
      {sleeveLen > 0.001 && (
        <group
          ref={rightSleeveRef}
          position={[torsoTopRadius, shoulderY, 0]}
          rotation={[0, 0, sleeveAngle]}
        >
          <mesh
            position={[0, -sleeveLen / 2, 0]}
            castShadow
            receiveShadow
            material={material}
          >
            <cylinderGeometry
              args={[sleeveTopRadius, sleeveBottomRadius, sleeveLen, 24, 8, true]}
            />
          </mesh>
        </group>
      )}
    </group>
  );
}
