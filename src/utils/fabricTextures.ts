import * as THREE from 'three';
import type { Fabric, FabricCategory } from '../types';

// 纹理尺寸，256 足够表现面料细节且性能良好
const TEXTURE_SIZE = 256;

export interface FabricTextures {
  bumpMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
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

// 将灰度值写入 ImageData 指定像素位置
function setGray(img: ImageData, x: number, y: number, value: number) {
  const idx = (y * img.width + x) * 4;
  const v = Math.max(0, Math.min(255, value));
  img.data[idx] = v;
  img.data[idx + 1] = v;
  img.data[idx + 2] = v;
  img.data[idx + 3] = 255;
}

// 简单的伪随机函数，确保纹理可复现
function pseudoRandom(x: number, y: number, seed: number) {
  const n = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
  return n - Math.floor(n);
}

// 棉布：平纹编织，细密的方格纹理
function drawCotton(height: ImageData, rough: ImageData) {
  const size = height.width;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const threadX = Math.floor(x / 4) % 2;
      const threadY = Math.floor(y / 4) % 2;
      // 平纹：经纬交错，形成细小网格凸起
      let h = threadX === threadY ? 145 : 112;
      h += (pseudoRandom(x, y, 1) - 0.5) * 14;
      setGray(height, x, y, h);
      // 粗糙度中等，经纬交错处略有变化
      const r = 170 + (pseudoRandom(x, y, 2) - 0.5) * 30;
      setGray(rough, x, y, r);
    }
  }
}

// 丝绸：极为光滑，带极细微的纤维方向感
function drawSilk(height: ImageData, rough: ImageData) {
  const size = height.width;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // 几乎平坦，仅有非常细微的纵向纤维纹路
      const fiber = Math.sin(y * 0.8) * 3;
      const h = 128 + fiber + (pseudoRandom(x, y, 3) - 0.5) * 4;
      setGray(height, x, y, h);
      // 丝绸光滑，粗糙度低，缎面处有深色（光滑）条纹
      const satin = Math.abs(Math.sin(y * 0.15)) < 0.15 ? 30 : 55;
      const r = satin + (pseudoRandom(x, y, 4) - 0.5) * 10;
      setGray(rough, x, y, r);
    }
  }
}

// 羊毛：蓬松毛茸茸，随机纤维团块
function drawWool(height: ImageData, rough: ImageData) {
  const size = height.width;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // 大尺度噪声模拟毛团
      const blockX = Math.floor(x / 6);
      const blockY = Math.floor(y / 6);
      const block = pseudoRandom(blockX, blockY, 5);
      // 细尺度噪声模拟单根纤维
      const fiber = (pseudoRandom(x, y, 6) - 0.5) * 40;
      const h = 128 + (block - 0.5) * 50 + fiber;
      setGray(height, x, y, h);
      // 羊毛非常粗糙
      const r = 225 + (pseudoRandom(x, y, 7) - 0.5) * 25;
      setGray(rough, x, y, r);
    }
  }
}

// 亚麻：明显的十字交叉编织，带有粗节（slub）
function drawLinen(height: ImageData, rough: ImageData) {
  const size = height.width;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // 较粗的经纬线
      const warp = Math.floor(y / 5) % 2;
      const weft = Math.floor(x / 5) % 2;
      let h = warp === weft ? 150 : 105;
      // 随机粗节（slub）：经纬线上偶尔出现的粗段
      const slubWarp = pseudoRandom(Math.floor(y / 5), 0, 8) > 0.92 ? 25 : 0;
      const slubWeft = pseudoRandom(0, Math.floor(x / 5), 9) > 0.92 ? 25 : 0;
      h += slubWarp + slubWeft;
      h += (pseudoRandom(x, y, 10) - 0.5) * 12;
      setGray(height, x, y, h);
      // 亚麻粗糙，粗节处更粗糙
      const r = 200 + (slubWarp + slubWeft) * 0.6 + (pseudoRandom(x, y, 11) - 0.5) * 25;
      setGray(rough, x, y, r);
    }
  }
}

// 化纤：均匀细腻，表面非常一致
function drawSynthetic(height: ImageData, rough: ImageData) {
  const size = height.width;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // 非常细微的均匀纹理
      const fine = (pseudoRandom(x, y, 12) - 0.5) * 6;
      const h = 128 + fine;
      setGray(height, x, y, h);
      // 化纤中等粗糙度，均匀
      const r = 120 + (pseudoRandom(x, y, 13) - 0.5) * 10;
      setGray(rough, x, y, r);
    }
  }
}

// 牛仔：斜纹编织（twill），45 度对角线
function drawDenim(height: ImageData, rough: ImageData) {
  const size = height.width;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // 45 度斜纹：沿对角线方向交替
      const diagonal = Math.floor((x + y) / 5) % 2;
      // 双色线效果（蓝白），斜纹交错
      let h = diagonal === 0 ? 110 : 145;
      h += (pseudoRandom(x, y, 14) - 0.5) * 18;
      setGray(height, x, y, h);
      // 牛仔非常粗糙，斜纹沟槽处更粗糙
      const r = diagonal === 0 ? 230 : 200;
      setGray(rough, x, y, r + (pseudoRandom(x, y, 15) - 0.5) * 20);
    }
  }
}

const drawFunctions: Record<FabricCategory, (height: ImageData, rough: ImageData) => void> = {
  cotton: drawCotton,
  silk: drawSilk,
  wool: drawWool,
  linen: drawLinen,
  synthetic: drawSynthetic,
  denim: drawDenim,
};

function buildTextures(category: FabricCategory): FabricTextures {
  const cached = textureCache.get(category);
  if (cached) return cached;

  const { canvas: heightCanvas, ctx: heightCtx } = createCanvas(TEXTURE_SIZE);
  const { canvas: roughCanvas, ctx: roughCtx } = createCanvas(TEXTURE_SIZE);

  const heightImg = heightCtx.createImageData(TEXTURE_SIZE, TEXTURE_SIZE);
  const roughImg = roughCtx.createImageData(TEXTURE_SIZE, TEXTURE_SIZE);

  drawFunctions[category](heightImg, roughImg);

  heightCtx.putImageData(heightImg, 0, 0);
  roughCtx.putImageData(roughImg, 0, 0);

  // 凹凸贴图：控制表面起伏
  const bumpMap = new THREE.CanvasTexture(heightCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.anisotropy = 4;
  bumpMap.needsUpdate = true;

  // 粗糙度贴图：白色=粗糙，黑色=光滑
  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.anisotropy = 4;
  roughnessMap.needsUpdate = true;

  const textures: FabricTextures = { bumpMap, roughnessMap };
  textureCache.set(category, textures);
  return textures;
}

// 根据面料类别返回对应的材质视觉特征参数
export interface FabricMaterialFeatures {
  clearcoat: number;
  clearcoatRoughness: number;
  sheen: number;
  sheenColor: THREE.Color;
  sheenRoughness: number;
  reflectivity: number;
}

export function getFabricFeatures(category: FabricCategory): FabricMaterialFeatures {
  switch (category) {
    case 'silk':
      // 丝绸/缎面：清漆层带来高光光泽
      return {
        clearcoat: 0.9,
        clearcoatRoughness: 0.1,
        sheen: 0.2,
        sheenColor: new THREE.Color('#fff0e0'),
        sheenRoughness: 0.3,
        reflectivity: 0.6,
      };
    case 'wool':
      // 羊毛：绒面光泽（sheen）模拟纤维漫反射
      return {
        clearcoat: 0.0,
        clearcoatRoughness: 1.0,
        sheen: 1.0,
        sheenColor: new THREE.Color('#d4b896'),
        sheenRoughness: 0.7,
        reflectivity: 0.2,
      };
    case 'cotton':
      return {
        clearcoat: 0.0,
        clearcoatRoughness: 1.0,
        sheen: 0.3,
        sheenColor: new THREE.Color('#f0e8d8'),
        sheenRoughness: 0.8,
        reflectivity: 0.25,
      };
    case 'linen':
      return {
        clearcoat: 0.0,
        clearcoatRoughness: 1.0,
        sheen: 0.4,
        sheenColor: new THREE.Color('#e8dcc0'),
        sheenRoughness: 0.85,
        reflectivity: 0.2,
      };
    case 'denim':
      // 牛仔：斜纹有轻微 sheen
      return {
        clearcoat: 0.05,
        clearcoatRoughness: 0.8,
        sheen: 0.5,
        sheenColor: new THREE.Color('#4a7ab5'),
        sheenRoughness: 0.75,
        reflectivity: 0.3,
      };
    case 'synthetic':
      // 化纤：轻微涂层光泽
      return {
        clearcoat: 0.3,
        clearcoatRoughness: 0.35,
        sheen: 0.1,
        sheenColor: new THREE.Color('#ffffff'),
        sheenRoughness: 0.5,
        reflectivity: 0.4,
      };
    default:
      return {
        clearcoat: 0.0,
        clearcoatRoughness: 1.0,
        sheen: 0.0,
        sheenColor: new THREE.Color('#ffffff'),
        sheenRoughness: 1.0,
        reflectivity: 0.3,
      };
  }
}

// 获取并配置面料纹理，设置合适的重复次数
export function getFabricTextures(fabric: Fabric, repeatX = 4, repeatY = 4): FabricTextures {
  const textures = buildTextures(fabric.category);
  textures.bumpMap.repeat.set(repeatX, repeatY);
  textures.roughnessMap.repeat.set(repeatX, repeatY);
  return textures;
}

// 释放所有缓存的纹理（切换场景或卸载时调用）
export function disposeFabricTextures() {
  textureCache.forEach(({ bumpMap, roughnessMap }) => {
    bumpMap.dispose();
    roughnessMap.dispose();
  });
  textureCache.clear();
}
