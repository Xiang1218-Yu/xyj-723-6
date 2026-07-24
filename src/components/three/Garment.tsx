import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../../store';
import { BodyType } from '../../types';
import { getFabricTextures } from '../../utils/fabricTextures';

/**
 * 不同体型的缩放系数表，与VirtualModel保持严格一致
 * torso: 躯干缩放, hips: 臀部缩放, limbs: 四肢缩放
 */
const bodyTypeScales: Record<BodyType, { torso: number; hips: number; limbs: number }> = {
  slim: { torso: 0.85, hips: 0.85, limbs: 1.05 },
  standard: { torso: 1, hips: 1, limbs: 1 },
  athletic: { torso: 1.1, hips: 0.9, limbs: 1.05 },
  curvy: { torso: 0.95, hips: 1.15, limbs: 0.95 },
};

/**
 * 衣服组件 - 将服装几何体精确贴合穿戴在3D虚拟模特身上
 *
 * 坐标对齐原则：
 * - Garment组与VirtualModel组使用完全相同的position偏移[0,-0.5,0]
 * - 躯干衣身圆柱体与VirtualModel的躯干圆柱体同轴心、同高度、半径略大
 * - 袖子起始点精确对齐模特肩部（手臂胶囊体与躯干连接处）
 * - 领口圆环对齐颈部底部
 */
export function Garment() {
  const groupRef = useRef<THREE.Group>(null);
  const torsoRef = useRef<THREE.Mesh>(null);
  const leftSleeveRef = useRef<THREE.Group>(null);
  const rightSleeveRef = useRef<THREE.Group>(null);

  // ========== 从全局状态读取数据 ==========
  const selectedFabric = useStore((state) => state.selectedFabric);
  const garmentSettings = useStore((state) => state.garmentSettings);
  const modelSettings = useStore((state) => state.modelSettings);
  const showWireframe = useStore((state) => state.showWireframe);
  const isPlaying = useStore((state) => state.isPlaying);

  const { fit, length, sleeveLength } = garmentSettings;
  const { bodyType, measurements } = modelSettings;
  const scales = bodyTypeScales[bodyType];

  // ========== 模特身体尺寸缩放系数 ==========
  // 将实际身体尺寸(cm)归一化为3D空间中的缩放比例
  const heightScale = measurements.height / 175;
  const bustScale = measurements.bust / 90;
  const waistScale = measurements.waist / 65;

  // ========== 合身度余量系数 ==========
  // tight: 紧贴身体留3%余量, regular: 常规留9%余量, loose: 宽松留18%余量
  const fitMultiplier = fit === 'tight' ? 1.03 : fit === 'loose' ? 1.18 : 1.09;

  // ========== 躯干衣身几何参数（与VirtualModel躯干严格对齐） ==========
  // VirtualModel躯干: topRadius=0.28*torso*bust, bottomRadius=0.22*torso*waist, height=0.6*torso*height
  // 衬衫使用相同的锥形比例，半径乘以合身度余量确保包裹身体
  const modelTorsoTopRadius = 0.28 * scales.torso * bustScale;
  const modelTorsoBottomRadius = 0.22 * scales.torso * waistScale;
  const modelTorsoHeight = 0.6 * scales.torso * heightScale;

  const torsoTopRadius = modelTorsoTopRadius * fitMultiplier;
  const torsoBottomRadius = modelTorsoBottomRadius * fitMultiplier;
  // 衣长参数length(30-80)控制衣身高度，50为标准长度(与身体躯干等高)
  const torsoHeight = modelTorsoHeight * (length / 50);
  // 躯干中心点Y坐标：与VirtualModel躯干中心点完全相同(local Y=0.95*torso*height)
  const torsoCenterY = 0.95 * scales.torso * heightScale;

  // ========== 袖子几何参数（精确对齐模特手臂位置） ==========
  // VirtualModel手臂胶囊体位置: local [±(0.4*limbs*bust), 1.1*height, 0]
  // 手臂胶囊半径=0.06*height, 圆柱段长度=0.5*limbs*height
  const modelArmX = 0.4 * scales.limbs * bustScale;
  const modelArmY = 1.1 * heightScale;
  const modelArmRadius = 0.06 * heightScale;
  const modelArmLength = 0.5 * scales.limbs * heightScale;

  // 袖管半径：比手臂半径大约30%，给布料留空间
  const sleeveRadius = modelArmRadius * 1.3 * fitMultiplier;
  // 袖长：sleeveLength(0-60)控制袖长比例，0=无袖, 60=全覆盖手臂
  const sleeveLen = modelArmLength * (sleeveLength / 60);

  // 肩部连接点：在躯干圆柱体顶部外侧，连接领口和袖子
  // shoulderX: 延伸到躯干边缘外一点，形成肩线
  // shoulderY: 在躯干顶部附近，对应人体肩峰位置
  const shoulderX = modelTorsoTopRadius * 1.02;
  const shoulderY = torsoCenterY + torsoHeight * 0.48;

  // 袖子从肩点向下的倾斜角度（弧度）
  // 手臂基本垂直，袖子略微外展(~8度)形成自然穿着姿态
  const sleeveHangAngle = 0.14;

  // ========== 领口参数 ==========
  // 领口圆环半径，基于颈部底部半径(0.15*height)略大
  const collarRadius = 0.14 * heightScale;

  // ========== 程序化纹理生成 ==========
  const fabricTextures = useMemo(() => {
    if (!selectedFabric) return null;
    const textureType = selectedFabric.materialProps.textureType || 'woven';
    const textureScale = selectedFabric.materialProps.textureScale || 1.0;
    return getFabricTextures(textureType, selectedFabric.materialProps.color, textureScale);
  }, [selectedFabric]);

  // ========== 材质创建 ==========
  // 使用MeshPhysicalMaterial以支持：
  // - clearcoat: 丝绸/缎面的高光涂层效果
  // - sheen: 棉质/羊毛的织物柔和反光
  // - normalMap/roughnessMap: 程序化纹理提供表面细节
  const material = useMemo(() => {
    const matProps = selectedFabric?.materialProps;

    const mat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(matProps?.color || '#E8D5C4'),
      roughness: matProps?.roughness ?? 0.8,
      metalness: matProps?.metalness ?? 0.0,
      side: THREE.FrontSide,
      wireframe: showWireframe,
      // 清漆层参数：丝绸/缎面类高光面料使用
      clearcoat: matProps?.clearcoat ?? 0,
      clearcoatRoughness: matProps?.clearcoatRoughness ?? 0.3,
      // 织物光泽参数：棉质/毛类面料使用sheen模拟纤维漫反射
      sheen: matProps?.sheen ?? 0,
      sheenRoughness: matProps?.sheenRoughness ?? 0.5,
      reflectivity: matProps?.reflectivity ?? 0.5,
      envMapIntensity: matProps?.envMapIntensity ?? 1.0,
    });

    // 设置sheen颜色（不同面料有不同的光泽色调）
    if (matProps?.sheenColor) {
      mat.sheenColor = new THREE.Color(matProps.sheenColor);
    }

    // 绑定程序化生成的纹理贴图
    if (fabricTextures) {
      mat.map = fabricTextures.map;
      mat.normalMap = fabricTextures.normalMap;
      mat.roughnessMap = fabricTextures.roughnessMap;
      // normalScale控制法线贴图的凹凸强度，乘以1.5增强纹理可见性
      mat.normalScale = new THREE.Vector2(
        (matProps?.normalScale ?? 0.5) * 1.5,
        (matProps?.normalScale ?? 0.5) * 1.5
      );
      mat.aoMapIntensity = matProps?.aoIntensity ?? 0.3;
    }

    return mat;
  }, [selectedFabric, showWireframe, fabricTextures]);

  // ========== 面料物理参数（用于动画形变） ==========
  const drape = selectedFabric ? selectedFabric.physicalParams.drape : 0.6;
  const wrinkle = selectedFabric ? selectedFabric.physicalParams.wrinkle : 0.4;
  const stiffness = selectedFabric ? selectedFabric.physicalParams.stiffness : 0.3;

  // ========== 躯干衣身几何体 ==========
  // 锥形开放圆柱体，顶点级别形变实现：下摆外扩、褶皱波动
  // 注意：不再进行肩部收窄(tuck)，确保衣身在肩部完整包裹身体
  const torsoGeometry = useMemo(() => {
    // 创建锥形圆柱体：上部(胸围)略宽，下部(腰围)略窄
    const geo = new THREE.CylinderGeometry(
      torsoTopRadius,
      torsoBottomRadius,
      torsoHeight,
      32,     // 圆周分段数：32段足够圆滑
      16,     // 高度分段数：16段支持褶皱动画
      true    // openEnded: 开放圆柱体（无上下底面），模拟布料管
    );

    const posAttr = geo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const y = posAttr.getY(i);
      const z = posAttr.getZ(i);
      // normalizedY: 0=下摆(最底端), 1=领口(最顶端)
      const normalizedY = (y + torsoHeight / 2) / torsoHeight;
      const angle = Math.atan2(z, x);
      const radius = Math.sqrt(x * x + z * z);

      // 肩部区域(normalizedY > 0.88)：保持原有半径，不做收窄
      // 衣身需要在肩部/上臂处完整覆盖身体，不能向内收

      // 下摆区域(normalizedY < 0.1)：模拟衣服下摆自然向外微展
      // 硬度越低(软面料如丝绸)，下摆外扩越明显
      if (normalizedY < 0.1) {
        const hemFactor = normalizedY / 0.1;
        const outwardCurve = Math.sin(hemFactor * Math.PI) * 0.015 * (1 - stiffness);
        if (radius > 0.001) {
          posAttr.setX(i, x + (x / radius) * outwardCurve);
          posAttr.setZ(i, z + (z / radius) * outwardCurve);
        }
      }

      // 布料褶皱波动：沿圆周方向8个褶皱波 + 高度方向频率变化
      // wrinkle参数控制褶皱深度，stiffness越高褶皱越平缓
      const wrinkleAmount = wrinkle * 0.006 * (1 - stiffness * 0.8);
      const wave = Math.sin(angle * 8 + normalizedY * 18) * wrinkleAmount;
      if (radius > 0.001) {
        posAttr.setX(i, posAttr.getX(i) + (x / radius) * wave);
        posAttr.setZ(i, posAttr.getZ(i) + (z / radius) * wave);
      }
    }

    posAttr.needsUpdate = true;
    geo.computeVertexNormals();
    return geo;
  }, [torsoTopRadius, torsoBottomRadius, torsoHeight, wrinkle, stiffness]);

  // ========== 袖子几何体 ==========
  // 锥形开放圆柱体：袖山(肩部连接处)略大，袖口收窄
  const sleeveGeometry = useMemo(() => {
    const geo = new THREE.CylinderGeometry(
      sleeveRadius * 1.2,     // 袖山半径（肩部连接处稍宽，形成袖冠）
      sleeveRadius * 0.85,    // 袖口半径（收边）
      sleeveLen,
      20,
      8,
      true
    );

    const posAttr = geo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const y = posAttr.getY(i);
      const x = posAttr.getX(i);
      const z = posAttr.getZ(i);
      const normalizedY = (y + sleeveLen / 2) / sleeveLen;
      const radius = Math.sqrt(x * x + z * z);
      const angle = Math.atan2(z, x);

      // 袖口收边（底端10%区域）：袖口处向内收窄
      if (normalizedY < 0.1) {
        const cuffFactor = normalizedY / 0.1;
        const taper = 1 - cuffFactor * 0.15;
        posAttr.setX(i, x * taper);
        posAttr.setZ(i, z * taper);
      }

      // 袖管褶皱波动
      const wrinkleAmount = wrinkle * 0.003;
      const wave = Math.sin(angle * 6 + normalizedY * 12) * wrinkleAmount;
      if (radius > 0.001) {
        posAttr.setX(i, posAttr.getX(i) + (x / radius) * wave);
        posAttr.setZ(i, posAttr.getZ(i) + (z / radius) * wave);
      }
    }

    posAttr.needsUpdate = true;
    geo.computeVertexNormals();
    return geo;
  }, [sleeveRadius, sleeveLen, wrinkle]);

  // ========== 领口几何体 ==========
  // 圆环(Torus)模拟圆领领口边缘，平放在XZ平面（水平放置）
  const collarGeometry = useMemo(() => {
    return new THREE.TorusGeometry(collarRadius, 0.012, 8, 32);
  }, [collarRadius]);

  // ========== 每帧动画更新 ==========
  useFrame((state) => {
    if (!groupRef.current) return;

    const t = state.clock.elapsedTime;

    // 自动旋转展示模式
    if (isPlaying) {
      groupRef.current.rotation.y = t * 0.3;
    } else {
      groupRef.current.rotation.y = 0;
    }

    // 布料微幅摆动计算：
    // wobble: 前后摆幅，受垂感(drape)影响 - 垂感越好摆动越小
    const wobble = Math.sin(t * 1.5) * 0.008 * (1 - drape);
    // wave: 横向波动，受褶皱(wrinkle)影响
    const wave = Math.sin(t * 2) * 0.005 * wrinkle;

    // 躯干微幅前后摆动
    if (torsoRef.current) {
      torsoRef.current.rotation.x = wobble * 0.12;
      // 垂感好的面料有轻微上下浮动
      torsoRef.current.position.y = torsoCenterY + Math.sin(t * 1.2) * 0.002 * drape;
    }

    // 袖子钟摆式摆动：从肩点自然下垂摆动
    if (leftSleeveRef.current) {
      leftSleeveRef.current.rotation.z = -sleeveHangAngle + wobble * 0.5;
      leftSleeveRef.current.rotation.x = wave * 0.3;
    }

    if (rightSleeveRef.current) {
      rightSleeveRef.current.rotation.z = sleeveHangAngle - wobble * 0.5;
      rightSleeveRef.current.rotation.x = -wave * 0.3;
    }
  });

  return (
    // 衣物组与VirtualModel使用完全相同的坐标原点[0,-0.5,0]
    // 确保两个组件在同一坐标系中渲染，实现精确对齐
    <group ref={groupRef} position={[0, -0.5, 0]}>
      {/* 躯干衣身：开放锥形圆柱体，与模特躯干同轴心放置 */}
      <mesh
        ref={torsoRef}
        geometry={torsoGeometry}
        material={material}
        position={[0, torsoCenterY, 0]}
        castShadow
        receiveShadow
      />

      {/* 领口圆环：水平放置在躯干顶端中心，模拟圆领T恤领口 */}
      {/* Y位置 = 躯干中心点 + 半高 = 躯干顶端，加上微小偏移对齐领口 */}
      <mesh
        geometry={collarGeometry}
        material={material}
        position={[0, torsoCenterY + torsoHeight * 0.48, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        castShadow
      />

      {/* 左袖组：从左肩点开始，袖管沿手臂方向下垂 */}
      <group
        ref={leftSleeveRef}
        position={[-shoulderX, shoulderY, 0]}
      >
        {/* 袖管整体外展角度，从肩点向外下方延伸 */}
        <group rotation={[0, 0, -sleeveHangAngle]}>
          {/* 将袖筒中心下移，使袖筒从肩点开始向下延伸 */}
          <group position={[0, -sleeveLen / 2, 0]}>
            <mesh
              geometry={sleeveGeometry}
              material={material}
              castShadow
              receiveShadow
            />
          </group>
        </group>
      </group>

      {/* 右袖组：与左袖镜像对称 */}
      <group
        ref={rightSleeveRef}
        position={[shoulderX, shoulderY, 0]}
      >
        <group rotation={[0, 0, sleeveHangAngle]}>
          <group position={[0, -sleeveLen / 2, 0]}>
            <mesh
              geometry={sleeveGeometry}
              material={material}
              castShadow
              receiveShadow
            />
          </group>
        </group>
      </group>
    </group>
  );
}
