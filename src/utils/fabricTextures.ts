import * as THREE from 'three';
import type { Fabric, FabricCategory } from '../types';

// 纹理尺寸，512 可以更细腻地表现纤维/编织纹理
const TEXTURE_SIZE = 512;

export interface FabricTextures {
  normalMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  // 羊毛等绒面材质使用的绒毛 alpha 贴图（无绒毛时为 null）
  fuzzAlphaMap: THREE.CanvasTexture | null;
  // 纹理重复次数（每类面料不同，体现编织密度差异）
  repeatX: number;
  repeatY: number;
}

// 按面料类别缓存生成的纹理，避免重复创建
const textureCache = new Map<FabricCategory, FabricTextures>();

function createCanvas(size: number) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('无法获取 Canvas 2D 上下文');
  return { canvas, ctx };
}

function pseudoRandom(x: number, y: number, seed: number) {
  const n = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
  return n - Math.floor(n);
}

function smoothNoise(x: number, y: number, seed: number) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const a = pseudoRandom(ix, iy, seed);
  const b = pseudoRandom(ix + 1, iy, seed);
  const c = pseudoRandom(ix, iy + 1, seed);
  const d = pseudoRandom(ix + 1, iy + 1, seed);
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  return a * (1 - ux) * (1 - uy) + b * ux * (1 - uy) + c * (1 - ux) * uy + d * ux * uy;
}

function fbm(x: number, y: number, seed: number, octaves = 4) {
  let value = 0;
  let amplitude = 0.5;
  let frequency = 1;
  for (let i = 0; i < octaves; i++) {
    value += amplitude * smoothNoise(x * frequency, y * frequency, seed + i * 17);
    amplitude *= 0.5;
    frequency *= 2;
  }
  return value;
}

type HeightFn = (size: number) => Float32Array;

// ---- 高度场（法线来源）----

// 棉质：细密平纹编织（小方格，经纬 1 上 1 下），柔软自然
const cottonHeight: HeightFn = (size) => {
  const h = new Float32Array(size * size);
  const threadPitch = 6; // 较密的经纬间距
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = y * size + x;
      const warp = Math.floor(x / threadPitch) % 2;
      const weft = Math.floor(y / threadPitch) % 2;
      // 平纹：经纬线交替凸起，起伏温和
      let v = warp === weft ? 0.35 : -0.25;
      // 棉纤维的轻微不规则
      v += (pseudoRandom(x, y, 1) - 0.5) * 0.15;
      h[idx] = v;
    }
  }
  return h;
};

// 丝绸缎面：极光滑，带有缎纹编织的长浮线（warp 连续跨过多根 weft）
const silkHeight: HeightFn = (size) => {
  const h = new Float32Array(size * size);
  const satinPitch = 5; // 缎纹：每 5 根线才有一个交点，表面极光滑
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = y * size + x;
      // 缎纹：大部分区域经线浮在表面（光滑），只有周期性交点微凹
      const intersection = (Math.floor(x / satinPitch) + Math.floor(y / satinPitch)) % satinPitch === 0;
      let v = intersection ? -0.08 : 0.04;
      // 极细腻的纵向纤维微光
      v += Math.sin(y * 0.2) * 0.02;
      h[idx] = v;
    }
  }
  return h;
};

// 羊毛：强烈团块状起伏（fBm 多倍频噪声），模拟绒毛聚簇
const woolHeight: HeightFn = (size) => {
  const h = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = y * size + x;
      // 大尺度毛团
      const clump = fbm(x * 0.035, y * 0.035, 10, 5) * 1.6 - 0.8;
      // 中等尺度毛束
      const bundle = fbm(x * 0.08, y * 0.08, 15, 3) * 0.3;
      h[idx] = clump + bundle;
    }
  }
  return h;
};

// 亚麻：粗十字编织 + 明显随机粗节（slub）
const linenHeight: HeightFn = (size) => {
  const h = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = y * size + x;
      const warp = Math.floor(y / 6) % 2;
      const weft = Math.floor(x / 6) % 2;
      let v = warp === weft ? 0.55 : -0.4;
      // 粗节：经线或纬线局部加粗
      const warpSlub = pseudoRandom(Math.floor(y / 6), Math.floor(x / 18), 20) > 0.9 ? 0.5 : 0;
      const weftSlub = pseudoRandom(Math.floor(x / 6), Math.floor(y / 18), 21) > 0.9 ? 0.5 : 0;
      v += warpSlub + weftSlub;
      v += (pseudoRandom(x, y, 12) - 0.5) * 0.2;
      h[idx] = v;
    }
  }
  return h;
};

// 化纤：极其均匀，几乎无编织纹理，仅微塑料颗粒感
const syntheticHeight: HeightFn = (size) => {
  const h = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = y * size + x;
      // 极细微的均匀颗粒，模拟合成纤维的冷硬表面
      h[idx] = (pseudoRandom(x, y, 13) - 0.5) * 0.03;
    }
  }
  return h;
};

// 牛仔：粗犷 45° 斜纹（twill），双色线交替（蓝色经线、白色纬线）
const denimHeight: HeightFn = (size) => {
  const h = new Float32Array(size * size);
  const twillPitch = 10; // 较宽的斜纹间距
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = y * size + x;
      // 45 度斜纹棱线：正弦波沿对角线方向产生强凸起
      const diag = Math.sin((x + y) * (Math.PI / twillPitch)) * 0.7;
      // 斜纹内部的双色线效果（经线蓝凸起、纬线白凹下）
      const thread = Math.sin((x - y) * 0.5) * 0.15;
      const noise = (pseudoRandom(x, y, 14) - 0.5) * 0.2;
      h[idx] = diag + thread + noise;
    }
  }
  return h;
};

const heightFunctions: Record<FabricCategory, HeightFn> = {
  cotton: cottonHeight,
  silk: silkHeight,
  wool: woolHeight,
  linen: linenHeight,
  synthetic: syntheticHeight,
  denim: denimHeight,
};

function heightToNormal(height: Float32Array, size: number, strength: number): ImageData {
  const img = new ImageData(size, size);
  const getH = (x: number, y: number) => {
    const xi = ((x % size) + size) % size;
    const yi = ((y % size) + size) % size;
    return height[yi * size + xi];
  };
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const hL = getH(x - 1, y);
      const hR = getH(x + 1, y);
      const hD = getH(x, y - 1);
      const hU = getH(x, y + 1);
      const dx = (hR - hL) * strength;
      const dy = (hU - hD) * strength;
      let nx = -dx;
      let ny = -dy;
      let nz = 1.0;
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
      nx /= len;
      ny /= len;
      nz /= len;
      img.data[idx] = Math.round((nx * 0.5 + 0.5) * 255);
      img.data[idx + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      img.data[idx + 2] = Math.round((nz * 0.5 + 0.5) * 255);
      img.data[idx + 3] = 255;
    }
  }
  return img;
}

// ---- 粗糙度图（白=粗糙，黑=光滑）----
type RoughFn = (x: number, y: number, size: number) => number;

const cottonRough: RoughFn = (x, y) => {
  // 棉布中等粗糙，经纬交错处略粗糙
  const warp = Math.floor(x / 6) % 2;
  const weft = Math.floor(y / 6) % 2;
  const base = warp === weft ? 160 : 185;
  return base + (pseudoRandom(x, y, 30) - 0.5) * 20;
};

const silkRough: RoughFn = (x, y) => {
  // 丝绸极光滑：黑色为主（高反光），缎纹交点处略粗糙
  const satinPitch = 5;
  const intersection = (Math.floor(x / satinPitch) + Math.floor(y / satinPitch)) % satinPitch === 0;
  const base = intersection ? 70 : 15; // 大部分区域近乎镜面
  return base + (pseudoRandom(x, y, 31) - 0.5) * 8;
};

const woolRough: RoughFn = () => {
  // 羊毛非常粗糙
  return 240;
};

const linenRough: RoughFn = (x, y) => {
  const warp = Math.floor(y / 6) % 2;
  const weft = Math.floor(x / 6) % 2;
  const slub = (warp !== weft) ? 25 : 0;
  return 210 + slub + (pseudoRandom(x, y, 33) - 0.5) * 20;
};

const syntheticRough: RoughFn = (x, y) => {
  // 化纤中等偏光滑（塑料感），但不如丝绸镜面
  return 95 + (pseudoRandom(x, y, 34) - 0.5) * 8;
};

const denimRough: RoughFn = (x, y) => {
  // 牛仔非常粗糙，斜纹沟槽处更粗糙
  const twillPitch = 10;
  const diag = Math.sin((x + y) * (Math.PI / twillPitch));
  const base = diag > 0 ? 200 : 245;
  return base + (pseudoRandom(x, y, 35) - 0.5) * 12;
};

const roughFunctions: Record<FabricCategory, RoughFn> = {
  cotton: cottonRough,
  silk: silkRough,
  wool: woolRough,
  linen: linenRough,
  synthetic: syntheticRough,
  denim: denimRough,
};

// 每类面料纹理重复次数（编织密度差异：丝绸/化纤密，牛仔/亚麻疏）
const repeatMap: Record<FabricCategory, [number, number]> = {
  cotton: [5, 5],
  silk: [3, 3],
  wool: [3, 3],
  linen: [4, 4],
  synthetic: [6, 6],
  denim: [3, 3],
};

// 羊毛绒毛 alpha 贴图：稀疏分布的短纤维点（而非大片半透明面），避免重影
function buildFuzzAlphaMap(size: number): THREE.CanvasTexture {
  const { canvas, ctx } = createCanvas(size);
  ctx.clearRect(0, 0, size, size);

  // 稀疏的细短纤维丝，模拟从布面突出的毛羽
  const fiberCount = Math.floor(size * size * 0.08);
  for (let i = 0; i < fiberCount; i++) {
    const x = pseudoRandom(i, 0, 50) * size;
    const y = pseudoRandom(0, i, 51) * size;
    const angle = pseudoRandom(i, i, 52) * Math.PI * 2;
    const len = 1 + pseudoRandom(i, i * 2, 53) * 3;
    const alpha = 0.4 + pseudoRandom(i * 3, i, 54) * 0.4;
    ctx.beginPath();
    ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
    ctx.lineWidth = 0.9;
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
    ctx.stroke();
  }

  // 细密毛点
  const dotCount = Math.floor(size * size * 0.05);
  for (let i = 0; i < dotCount; i++) {
    const x = pseudoRandom(i * 7, 0, 60) * size;
    const y = pseudoRandom(0, i * 7, 61) * size;
    const alpha = 0.25 + pseudoRandom(i, i * 3, 62) * 0.35;
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.fillRect(x, y, 1, 1);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

function buildTextures(category: FabricCategory): FabricTextures {
  const cached = textureCache.get(category);
  if (cached) return cached;

  const heightField = heightFunctions[category](TEXTURE_SIZE);

  // 法线强度：丝绸/化纤极弱（表面光滑），牛仔/亚麻/羊毛强（纹理粗犷）
  const normalStrengthMap: Record<FabricCategory, number> = {
    cotton: 1.8,
    silk: 0.3,
    wool: 4.0,
    linen: 2.8,
    synthetic: 0.2,
    denim: 3.5,
  };
  const normalImg = heightToNormal(heightField, TEXTURE_SIZE, normalStrengthMap[category]);

  const { canvas: normalCanvas, ctx: normalCtx } = createCanvas(TEXTURE_SIZE);
  normalCtx.putImageData(normalImg, 0, 0);

  const { canvas: roughCanvas, ctx: roughCtx } = createCanvas(TEXTURE_SIZE);
  const roughImg = roughCtx.createImageData(TEXTURE_SIZE, TEXTURE_SIZE);
  const roughFn = roughFunctions[category];
  for (let y = 0; y < TEXTURE_SIZE; y++) {
    for (let x = 0; x < TEXTURE_SIZE; x++) {
      const idx = (y * TEXTURE_SIZE + x) * 4;
      const v = Math.max(0, Math.min(255, roughFn(x, y, TEXTURE_SIZE)));
      roughImg.data[idx] = v;
      roughImg.data[idx + 1] = v;
      roughImg.data[idx + 2] = v;
      roughImg.data[idx + 3] = 255;
    }
  }
  roughCtx.putImageData(roughImg, 0, 0);

  const normalMap = new THREE.CanvasTexture(normalCanvas);
  normalMap.wrapS = THREE.RepeatWrapping;
  normalMap.wrapT = THREE.RepeatWrapping;
  normalMap.anisotropy = 8;
  normalMap.needsUpdate = true;

  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.anisotropy = 4;
  roughnessMap.needsUpdate = true;

  const fuzzAlphaMap = category === 'wool' ? buildFuzzAlphaMap(256) : null;

  const [rx, ry] = repeatMap[category];

  const textures: FabricTextures = { normalMap, roughnessMap, fuzzAlphaMap, repeatX: rx, repeatY: ry };
  textureCache.set(category, textures);
  return textures;
}

// 每类面料的物理材质特征
export interface FabricMaterialFeatures {
  clearcoat: number;
  clearcoatRoughness: number;
  sheen: number;
  sheenColor: THREE.Color;
  sheenRoughness: number;
  reflectivity: number;
  normalScale: THREE.Vector2;
  anisotropy: number;
  anisotropyRotation: number;
  fuzziness: number;
  // 基础粗糙度（与 roughnessMap 相乘）
  baseRoughness: number;
  // 环境贴图反射强度：丝绸/化纤高，棉质/羊毛低
  envMapIntensity: number;
}

export function getFabricFeatures(category: FabricCategory): FabricMaterialFeatures {
  switch (category) {
    case 'silk':
      // 丝绸/缎面：镜面清漆 + 强各向异性 + 极低粗糙度 + 高环境反射 = 明显光泽流动感
      return {
        clearcoat: 1.0,
        clearcoatRoughness: 0.03,
        sheen: 0.2,
        sheenColor: new THREE.Color('#fff8f0'),
        sheenRoughness: 0.2,
        reflectivity: 0.9,
        normalScale: new THREE.Vector2(0.12, 0.12),
        anisotropy: 1.0,
        anisotropyRotation: 0,
        fuzziness: 0,
        baseRoughness: 0.1,
        envMapIntensity: 2.5,
      };
    case 'wool':
      // 羊毛：最强绒面光泽 + 绒毛外壳，完全无清漆，粗糙温暖
      return {
        clearcoat: 0.0,
        clearcoatRoughness: 1.0,
        sheen: 1.0,
        sheenColor: new THREE.Color('#d9c4a8'),
        sheenRoughness: 0.6,
        reflectivity: 0.1,
        normalScale: new THREE.Vector2(1.1, 1.1),
        anisotropy: 0,
        anisotropyRotation: 0,
        fuzziness: 0.55,
        baseRoughness: 0.95,
        envMapIntensity: 0.4,
      };
    case 'cotton':
      // 棉质：柔和哑光，中等绒面，无清漆
      return {
        clearcoat: 0.0,
        clearcoatRoughness: 1.0,
        sheen: 0.3,
        sheenColor: new THREE.Color('#f0e8d8'),
        sheenRoughness: 0.7,
        reflectivity: 0.2,
        normalScale: new THREE.Vector2(0.5, 0.5),
        anisotropy: 0,
        anisotropyRotation: 0,
        fuzziness: 0,
        baseRoughness: 0.78,
        envMapIntensity: 0.6,
      };
    case 'linen':
      // 亚麻：粗糙哑光，明显编织光泽
      return {
        clearcoat: 0.0,
        clearcoatRoughness: 1.0,
        sheen: 0.5,
        sheenColor: new THREE.Color('#e8dcc0'),
        sheenRoughness: 0.8,
        reflectivity: 0.2,
        normalScale: new THREE.Vector2(0.85, 0.85),
        anisotropy: 0,
        anisotropyRotation: 0,
        fuzziness: 0,
        baseRoughness: 0.85,
        envMapIntensity: 0.5,
      };
    case 'denim':
      // 牛仔：粗犷斜纹，强方向性 sheen，蓝色调反光，无清漆
      return {
        clearcoat: 0.0,
        clearcoatRoughness: 1.0,
        sheen: 0.8,
        sheenColor: new THREE.Color('#6a9ad4'),
        sheenRoughness: 0.55,
        reflectivity: 0.25,
        normalScale: new THREE.Vector2(1.0, 1.0),
        anisotropy: 0.4,
        anisotropyRotation: Math.PI / 4,
        fuzziness: 0,
        baseRoughness: 0.9,
        envMapIntensity: 0.7,
      };
    case 'synthetic':
      // 化纤：塑料涂层感（中等清漆），无各向异性，冷白反光，中等环境反射
      return {
        clearcoat: 0.5,
        clearcoatRoughness: 0.35,
        sheen: 0.05,
        sheenColor: new THREE.Color('#e8f0ff'),
        sheenRoughness: 0.5,
        reflectivity: 0.6,
        normalScale: new THREE.Vector2(0.08, 0.08),
        anisotropy: 0,
        anisotropyRotation: 0,
        fuzziness: 0,
        baseRoughness: 0.35,
        envMapIntensity: 1.5,
      };
    default:
      return {
        clearcoat: 0.0,
        clearcoatRoughness: 1.0,
        sheen: 0.0,
        sheenColor: new THREE.Color('#ffffff'),
        sheenRoughness: 1.0,
        reflectivity: 0.3,
        normalScale: new THREE.Vector2(0.3, 0.3),
        anisotropy: 0,
        anisotropyRotation: 0,
        fuzziness: 0,
        baseRoughness: 0.7,
        envMapIntensity: 0.5,
      };
  }
}

// 获取面料纹理，使用该类别内置的重复次数
export function getFabricTextures(fabric: Fabric): FabricTextures {
  return buildTextures(fabric.category);
}

export function disposeFabricTextures() {
  textureCache.forEach(({ normalMap, roughnessMap, fuzzAlphaMap }) => {
    normalMap.dispose();
    roughnessMap.dispose();
    fuzzAlphaMap?.dispose();
  });
  textureCache.clear();
}
