import { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
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

// 绒毛外壳在服装几何基础上向外膨胀的距离（薄而均匀，避免重影）
const fuzzInflate = 0.012;

export function Garment() {
  const groupRef = useRef<THREE.Group>(null);
  const torsoRef = useRef<THREE.Mesh>(null);
  const leftSleeveRef = useRef<THREE.Mesh>(null);
  const rightSleeveRef = useRef<THREE.Mesh>(null);

  const selectedFabric = useStore((state) => state.selectedFabric);
  const garmentSettings = useStore((state) => state.garmentSettings);
  const modelSettings = useStore((state) => state.modelSettings);
  const showWireframe = useStore((state) => state.showWireframe);
  const isPlaying = useStore((state) => state.isPlaying);

  // 获取场景环境贴图：由于材质是命令式创建的，需要手动将 scene.environment 赋给材质
  const sceneEnv = useThree((state) => state.scene.environment);

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

  // 手臂几何（与 VirtualModel 一致）：垂直胶囊，中心在 [±armX, armY, 0]
  const armX = 0.4 * scales.limbs * bustScale;
  const armRadius = 0.06 * heightScale;

  // 肩部位置（躯干顶部）—— 袖管从此处开始向下覆盖手臂
  const shoulderY = torsoY + torsoHeight / 2;

  // 服装长度由滑块控制（衣长 30-80cm）
  const garmentLength = length * 0.011;
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

  // 袖长（0 表示无袖）
  const sleeveLen = sleeveLength * 0.012;
  // 袖管顶部稍宽（袖山/袖帽），内侧边缘衔接躯干表面
  const sleeveTopRadius = armRadius * 1.8 + fitOffset;
  const sleeveBottomRadius = armRadius + fitOffset + 0.004;
  const sleeveCenterY = shoulderY - sleeveLen / 2;

  // 裙装/连衣裙会拉长下摆
  const isLongGarment = garmentType === 'dress';
  const finalLength = isLongGarment ? garmentLength * 1.5 : garmentLength;
  const finalBottomRadius = isLongGarment ? bottomRadius * 1.15 : bottomRadius;
  const finalCenterY = isLongGarment
    ? (shoulderY + shoulderY - finalLength) / 2
    : centerY;

  // 构建服装材质，使用程序化纹理与物理材质参数
  const { material, fuzzMaterial } = useMemo(() => {
    if (!selectedFabric) {
      const fallback = new THREE.MeshStandardMaterial({
        color: '#E8D5C4',
        side: THREE.DoubleSide,
        roughness: 0.8,
        metalness: 0.05,
        wireframe: showWireframe,
      });
      return { material: fallback, fuzzMaterial: null as THREE.MeshPhysicalMaterial | null };
    }

    // 生成/获取该面料类别的程序化纹理
    const textures = getFabricTextures(selectedFabric);
    const features = getFabricFeatures(selectedFabric.category);

    // 应用该类别专属的纹理重复次数
    textures.normalMap.repeat.set(textures.repeatX, textures.repeatY);
    textures.roughnessMap.repeat.set(textures.repeatX, textures.repeatY);
    if (textures.fuzzAlphaMap) {
      textures.fuzzAlphaMap.repeat.set(textures.repeatX * 3, textures.repeatY * 3);
    }

    const mat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(selectedFabric.materialProps.color),
      // 使用类别基础粗糙度（由 roughnessMap 调制），确保不同面料光感差异显著
      roughness: features.baseRoughness,
      metalness: selectedFabric.materialProps.metalness,
      normalMap: textures.normalMap,
      normalScale: features.normalScale,
      roughnessMap: textures.roughnessMap,
      clearcoat: features.clearcoat,
      clearcoatRoughness: features.clearcoatRoughness,
      sheen: features.sheen,
      sheenColor: features.sheenColor,
      sheenRoughness: features.sheenRoughness,
      reflectivity: features.reflectivity,
      anisotropy: features.anisotropy,
      anisotropyRotation: features.anisotropyRotation,
      // 环境反射强度：丝绸最强、化纤中等、棉质/羊毛弱，直接决定光泽差异
      envMapIntensity: features.envMapIntensity,
      side: THREE.DoubleSide,
      wireframe: showWireframe,
    });

    // 羊毛绒毛材质：单层薄外壳，稀疏 alpha 纤维点，形成毛茸茸轮廓而不产生重影
    let fuzzMat: THREE.MeshPhysicalMaterial | null = null;
    if (features.fuzziness > 0 && textures.fuzzAlphaMap) {
      fuzzMat = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(selectedFabric.materialProps.color),
        roughness: 1.0,
        metalness: 0.0,
        alphaMap: textures.fuzzAlphaMap,
        transparent: true,
        opacity: features.fuzziness,
        alphaTest: 0.15,
        side: THREE.FrontSide,
        depthWrite: false,
        sheen: 0.6,
        sheenColor: new THREE.Color('#e8d8c8'),
        wireframe: false,
      });
    }

    return { material: mat, fuzzMaterial: fuzzMat };
  }, [selectedFabric, showWireframe]);

  // 材质切换时释放旧材质
  useEffect(() => {
    return () => {
      material.dispose();
      fuzzMaterial?.dispose();
    };
  }, [material, fuzzMaterial]);

  // 将场景环境贴图赋给命令式创建的材质（drei Environment 设置 scene.environment 后此 effect 触发）
  useEffect(() => {
    if (sceneEnv) {
      material.envMap = sceneEnv;
      material.needsUpdate = true;
    }
  }, [material, sceneEnv]);

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

    const wobble = Math.sin(t * 1.5) * 0.008 * (1 - drape);
    const wave = Math.sin(t * 2) * 0.006 * wrinkle;

    if (torsoRef.current) {
      torsoRef.current.rotation.x = wobble * 0.12;
    }

    if (leftSleeveRef.current) {
      leftSleeveRef.current.rotation.x = wave * 0.2;
    }
    if (rightSleeveRef.current) {
      rightSleeveRef.current.rotation.x = -wave * 0.2;
    }
  });

  return (
    <group ref={groupRef} position={[0, -0.5, 0]}>
      {/* 服装躯干：圆台包裹躯干 */}
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

      {/* 羊毛绒毛外壳：单层薄壳，alpha 纤维点产生毛茸茸边缘 */}
      {fuzzMaterial && (
        <mesh position={[0, finalCenterY, 0]} material={fuzzMaterial}>
          <cylinderGeometry
            args={[
              topRadius + fuzzInflate,
              finalBottomRadius + fuzzInflate,
              finalLength,
              48, 12, true,
            ]}
          />
        </mesh>
      )}

      {/* 左肩袖：垂直圆柱，中心对齐左臂中心线 */}
      {sleeveLen > 0.001 && (
        <group position={[-armX, sleeveCenterY, 0]}>
          <mesh
            ref={leftSleeveRef}
            castShadow
            receiveShadow
            material={material}
          >
            <cylinderGeometry
              args={[sleeveTopRadius, sleeveBottomRadius, sleeveLen, 24, 8, true]}
            />
          </mesh>
          {fuzzMaterial && (
            <mesh material={fuzzMaterial}>
              <cylinderGeometry
                args={[
                  sleeveTopRadius + fuzzInflate,
                  sleeveBottomRadius + fuzzInflate,
                  sleeveLen,
                  24, 8, true,
                ]}
              />
            </mesh>
          )}
        </group>
      )}

      {/* 右肩袖 */}
      {sleeveLen > 0.001 && (
        <group position={[armX, sleeveCenterY, 0]}>
          <mesh
            ref={rightSleeveRef}
            castShadow
            receiveShadow
            material={material}
          >
            <cylinderGeometry
              args={[sleeveTopRadius, sleeveBottomRadius, sleeveLen, 24, 8, true]}
            />
          </mesh>
          {fuzzMaterial && (
            <mesh material={fuzzMaterial}>
              <cylinderGeometry
                args={[
                  sleeveTopRadius + fuzzInflate,
                  sleeveBottomRadius + fuzzInflate,
                  sleeveLen,
                  24, 8, true,
                ]}
              />
            </mesh>
          )}
        </group>
      )}
    </group>
  );
}
