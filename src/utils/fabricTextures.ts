import * as THREE from 'three';
import { Fabric } from '../types';

/**
 * 面料程序化纹理生成器
 * 为每一种面料生成专属的颜色贴图(map)、法线贴图(normalMap)、
 * 粗糙度贴图(roughnessMap) 与环境光遮蔽贴图(aoMap)。
 *
 * 纹理不仅按类别（棉/丝/毛/麻/化纤/牛仔）区分基础织纹，
 * 还根据每种面料的物理参数（褶皱/厚度/硬度）以及由面料 id 派生的
 * 随机种子进行差异化，使同类别内不同面料（如 cotton-001/002/003）
 * 也呈现明显不同的纹理图案。
 */

export interface FabricTextureSet {
  map: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  aoMap: THREE.CanvasTexture;
  /** 纹理平铺重复次数 */
  repeat: number;
}

// 按面料 id 缓存，保证每种面料生成一次且各不相同
const textureCache = new Map<string, FabricTextureSet>();

const TEXTURE_SIZE = 256;

// 由字符串 id 生成 32 位整数哈希，作为随机种子
function hashString(str: string): number {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

// mulberry32：由种子产生确定性的伪随机数序列，保证同一面料纹理稳定
function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 创建一个指定尺寸的 2D 画布上下文
function createCanvas(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = TEXTURE_SIZE;
  canvas.height = TEXTURE_SIZE;
  const ctx = canvas.getContext('2d')!;
  return { canvas, ctx };
}

// 以灰底填充画布
function fillBase(ctx: CanvasRenderingContext2D, gray: number): void {
  ctx.fillStyle = `rgb(${gray}, ${gray}, ${gray})`;
  ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);
}

// 使用面料专属随机数叠加噪点，模拟纤维颗粒感（每种面料噪点分布不同）
function addNoise(
  ctx: CanvasRenderingContext2D,
  amount: number,
  density: number,
  rng: () => number
): void {
  const imageData = ctx.getImageData(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    if (rng() < density) {
      const delta = (rng() - 0.5) * amount;
      data[i] = Math.max(0, Math.min(255, data[i] + delta));
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + delta));
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + delta));
    }
  }
  ctx.putImageData(imageData, 0, 0);
}

// 绘制颜色贴图：类别决定织纹类型，物理参数与随机种子决定具体图案
function drawColorPattern(ctx: CanvasRenderingContext2D, fabric: Fabric, rng: () => number): void {
  const { wrinkle, thickness, stiffness } = fabric.physicalParams;
  // 织纹线间距：面料越厚，织纹越粗越稀疏
  const spacing = Math.max(3, Math.round(4 + thickness * 9));
  // 噪点强度与密度随褶皱程度增大
  const noiseAmount = 8 + wrinkle * 48;
  const noiseDensity = 0.25 + wrinkle * 0.5;
  // 每种面料的织纹相位偏移，使同类别面料图案错开
  const phase = Math.floor(rng() * spacing);
  // 织纹线的深浅随硬度变化
  const lineAlpha = 0.3 + stiffness * 0.35;

  switch (fabric.category) {
    case 'cotton': {
      // 棉：均匀细密的平纹编织
      fillBase(ctx, 234);
      ctx.strokeStyle = `rgba(150, 150, 150, ${lineAlpha * 0.5})`;
      ctx.lineWidth = 1;
      for (let i = phase; i < TEXTURE_SIZE; i += spacing) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, TEXTURE_SIZE);
        ctx.stroke();
      }
      addNoise(ctx, noiseAmount, noiseDensity, rng);
      break;
    }
    case 'silk': {
      // 丝绸：顺滑并带有斜向高光条带，体现光泽感
      const gradient = ctx.createLinearGradient(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);
      gradient.addColorStop(0, 'rgb(242, 242, 242)');
      gradient.addColorStop(0.5, 'rgb(255, 255, 255)');
      gradient.addColorStop(1, 'rgb(238, 238, 238)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.25 + rng() * 0.2})`;
      ctx.lineWidth = 1;
      for (let i = -TEXTURE_SIZE + phase; i < TEXTURE_SIZE; i += spacing + 3) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i + TEXTURE_SIZE, TEXTURE_SIZE);
        ctx.stroke();
      }
      addNoise(ctx, noiseAmount * 0.4, noiseDensity * 0.5, rng);
      break;
    }
    case 'wool': {
      // 羊毛：厚实蓬松，强颗粒噪点表现毛绒感
      fillBase(ctx, 216);
      addNoise(ctx, noiseAmount + 20, Math.min(0.95, noiseDensity + 0.3), rng);
      addNoise(ctx, noiseAmount, noiseDensity * 0.5, rng);
      break;
    }
    case 'linen': {
      // 亚麻：明显的经纬交叉粗织纹
      fillBase(ctx, 228);
      ctx.strokeStyle = `rgba(135, 135, 135, ${lineAlpha})`;
      ctx.lineWidth = 2;
      for (let i = phase; i < TEXTURE_SIZE; i += spacing) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, TEXTURE_SIZE);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(TEXTURE_SIZE, i);
        ctx.stroke();
      }
      addNoise(ctx, noiseAmount, noiseDensity, rng);
      break;
    }
    case 'synthetic': {
      // 化纤：平滑均匀，仅有极细微噪点
      fillBase(ctx, 240);
      addNoise(ctx, noiseAmount * 0.3, noiseDensity * 0.4, rng);
      break;
    }
    case 'denim': {
      // 牛仔：斜向斜纹(twill)编织纹理
      fillBase(ctx, 206);
      ctx.strokeStyle = `rgba(115, 115, 115, ${lineAlpha})`;
      ctx.lineWidth = 2;
      for (let i = -TEXTURE_SIZE + phase; i < TEXTURE_SIZE; i += spacing) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i + TEXTURE_SIZE, TEXTURE_SIZE);
        ctx.stroke();
      }
      addNoise(ctx, noiseAmount, noiseDensity, rng);
      break;
    }
  }
}

// 由颜色贴图推导法线贴图：亮度梯度转换为法线扰动，形成凹凸立体感
function buildNormalMap(colorCanvas: HTMLCanvasElement, strength: number): HTMLCanvasElement {
  const src = colorCanvas.getContext('2d')!.getImageData(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);
  const { canvas, ctx } = createCanvas();
  const dst = ctx.createImageData(TEXTURE_SIZE, TEXTURE_SIZE);

  const gray = (x: number, y: number): number => {
    const px = ((y + TEXTURE_SIZE) % TEXTURE_SIZE) * TEXTURE_SIZE + ((x + TEXTURE_SIZE) % TEXTURE_SIZE);
    return src.data[px * 4] / 255;
  };

  for (let y = 0; y < TEXTURE_SIZE; y++) {
    for (let x = 0; x < TEXTURE_SIZE; x++) {
      const dx = (gray(x + 1, y) - gray(x - 1, y)) * strength;
      const dy = (gray(x, y + 1) - gray(x, y - 1)) * strength;
      const normal = new THREE.Vector3(-dx, -dy, 1).normalize();
      const idx = (y * TEXTURE_SIZE + x) * 4;
      dst.data[idx] = (normal.x * 0.5 + 0.5) * 255;
      dst.data[idx + 1] = (normal.y * 0.5 + 0.5) * 255;
      dst.data[idx + 2] = (normal.z * 0.5 + 0.5) * 255;
      dst.data[idx + 3] = 255;
    }
  }
  ctx.putImageData(dst, 0, 0);
  return canvas;
}

// 生成粗糙度贴图：织纹凹陷处粗糙度更高
function buildRoughnessMap(colorCanvas: HTMLCanvasElement, contrast: number): HTMLCanvasElement {
  const src = colorCanvas.getContext('2d')!.getImageData(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);
  const { canvas, ctx } = createCanvas();
  const dst = ctx.createImageData(TEXTURE_SIZE, TEXTURE_SIZE);
  for (let i = 0; i < src.data.length; i += 4) {
    const value = 255 - (src.data[i] - 128) * contrast;
    const clamped = Math.max(0, Math.min(255, value));
    dst.data[i] = clamped;
    dst.data[i + 1] = clamped;
    dst.data[i + 2] = clamped;
    dst.data[i + 3] = 255;
  }
  ctx.putImageData(dst, 0, 0);
  return canvas;
}

// 生成环境光遮蔽贴图：织纹缝隙(暗处)遮蔽更强，配合 aoMapIntensity 增强立体层次
function buildAoMap(colorCanvas: HTMLCanvasElement): HTMLCanvasElement {
  const src = colorCanvas.getContext('2d')!.getImageData(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);
  const { canvas, ctx } = createCanvas();
  const dst = ctx.createImageData(TEXTURE_SIZE, TEXTURE_SIZE);
  for (let i = 0; i < src.data.length; i += 4) {
    // 以亮度为基准，缝隙(暗)保持较低值形成遮蔽，整体略微提亮避免过暗
    const ao = Math.max(0, Math.min(255, 45 + src.data[i] * 0.82));
    dst.data[i] = ao;
    dst.data[i + 1] = ao;
    dst.data[i + 2] = ao;
    dst.data[i + 3] = 255;
  }
  ctx.putImageData(dst, 0, 0);
  return canvas;
}

// 每个类别的基础纹理参数：法线强度、粗糙度对比、平铺次数
const categoryConfig: Record<Fabric['category'], { normalStrength: number; roughnessContrast: number; repeat: number }> = {
  cotton: { normalStrength: 2.5, roughnessContrast: 0.4, repeat: 6 },
  silk: { normalStrength: 1.0, roughnessContrast: 0.2, repeat: 4 },
  wool: { normalStrength: 5.0, roughnessContrast: 0.6, repeat: 5 },
  linen: { normalStrength: 4.0, roughnessContrast: 0.5, repeat: 5 },
  synthetic: { normalStrength: 1.2, roughnessContrast: 0.25, repeat: 4 },
  denim: { normalStrength: 4.5, roughnessContrast: 0.55, repeat: 6 },
};

// 将 canvas 包装为可平铺的 three 纹理
function toTexture(canvas: HTMLCanvasElement, repeat: number, isColor: boolean): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat, repeat);
  texture.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  texture.needsUpdate = true;
  return texture;
}

/**
 * 获取指定面料的纹理集合（按面料 id 缓存，逐面料差异化）
 */
export function getFabricTextures(fabric: Fabric): FabricTextureSet {
  const cached = textureCache.get(fabric.id);
  if (cached) return cached;

  // 由面料 id 派生随机种子，保证同类别不同面料纹理各异且稳定
  const rng = mulberry32(hashString(fabric.id));

  const { canvas: colorCanvas, ctx: colorCtx } = createCanvas();
  drawColorPattern(colorCtx, fabric, rng);

  const base = categoryConfig[fabric.category];
  const { thickness, stiffness } = fabric.physicalParams;
  // 法线强度随厚度增强，粗糙度对比随柔软度增强
  const normalStrength = base.normalStrength * (0.7 + thickness * 0.8);
  const roughnessContrast = base.roughnessContrast * (0.7 + (1 - stiffness) * 0.6);

  const normalCanvas = buildNormalMap(colorCanvas, normalStrength);
  const roughnessCanvas = buildRoughnessMap(colorCanvas, roughnessContrast);
  const aoCanvas = buildAoMap(colorCanvas);

  const textureSet: FabricTextureSet = {
    map: toTexture(colorCanvas, base.repeat, true),
    normalMap: toTexture(normalCanvas, base.repeat, false),
    roughnessMap: toTexture(roughnessCanvas, base.repeat, false),
    aoMap: toTexture(aoCanvas, base.repeat, false),
    repeat: base.repeat,
  };

  textureCache.set(fabric.id, textureSet);
  return textureSet;
}
