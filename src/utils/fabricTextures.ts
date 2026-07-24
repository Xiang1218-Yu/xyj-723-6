import * as THREE from 'three';
import { FabricCategory } from '../types';

/**
 * 面料程序化纹理生成器
 * 为不同材质类别（棉/丝/毛/麻/化纤/牛仔）生成专属的
 * 颜色贴图(map)、法线贴图(normalMap)、粗糙度贴图(roughnessMap)，
 * 使每种材质在 3D 场景中呈现符合其名称的织物纹理与光泽差异。
 */

export interface FabricTextureSet {
  map: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  /** 纹理平铺重复次数，粗纹理少重复、细纹理多重复 */
  repeat: number;
}

// 按类别缓存，避免每次渲染重复生成 canvas 纹理
const textureCache = new Map<FabricCategory, FabricTextureSet>();

const TEXTURE_SIZE = 256;

// 创建一个指定尺寸的 2D 画布上下文
function createCanvas(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = TEXTURE_SIZE;
  canvas.height = TEXTURE_SIZE;
  const ctx = canvas.getContext('2d')!;
  return { canvas, ctx };
}

// 以灰底填充画布，灰度越高表示织物本色越亮（后续与材质颜色相乘）
function fillBase(ctx: CanvasRenderingContext2D, gray: number): void {
  ctx.fillStyle = `rgb(${gray}, ${gray}, ${gray})`;
  ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);
}

// 在画布上叠加随机噪点，模拟纤维颗粒感
function addNoise(ctx: CanvasRenderingContext2D, amount: number, density: number): void {
  const imageData = ctx.getImageData(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    if (Math.random() < density) {
      const delta = (Math.random() - 0.5) * amount;
      data[i] = Math.max(0, Math.min(255, data[i] + delta));
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + delta));
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + delta));
    }
  }
  ctx.putImageData(imageData, 0, 0);
}

// 绘制颜色贴图：不同类别使用不同织纹图案
function drawColorPattern(ctx: CanvasRenderingContext2D, category: FabricCategory): void {
  switch (category) {
    case 'cotton': {
      // 棉：均匀细密的平纹编织，颗粒柔和
      fillBase(ctx, 235);
      addNoise(ctx, 24, 0.6);
      break;
    }
    case 'silk': {
      // 丝绸：顺滑并带有斜向高光条带，体现光泽感
      const gradient = ctx.createLinearGradient(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);
      gradient.addColorStop(0, 'rgb(245, 245, 245)');
      gradient.addColorStop(0.5, 'rgb(255, 255, 255)');
      gradient.addColorStop(1, 'rgb(240, 240, 240)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.lineWidth = 1;
      for (let i = -TEXTURE_SIZE; i < TEXTURE_SIZE; i += 6) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i + TEXTURE_SIZE, TEXTURE_SIZE);
        ctx.stroke();
      }
      addNoise(ctx, 6, 0.3);
      break;
    }
    case 'wool': {
      // 羊毛：厚实蓬松，强颗粒噪点表现毛绒感
      fillBase(ctx, 215);
      addNoise(ctx, 55, 0.85);
      addNoise(ctx, 30, 0.4);
      break;
    }
    case 'linen': {
      // 亚麻：明显的经纬交叉粗织纹
      fillBase(ctx, 228);
      ctx.strokeStyle = 'rgba(140, 140, 140, 0.5)';
      ctx.lineWidth = 2;
      for (let i = 0; i < TEXTURE_SIZE; i += 8) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, TEXTURE_SIZE);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(TEXTURE_SIZE, i);
        ctx.stroke();
      }
      addNoise(ctx, 30, 0.5);
      break;
    }
    case 'synthetic': {
      // 化纤：平滑均匀，仅有极细微噪点
      fillBase(ctx, 240);
      addNoise(ctx, 10, 0.2);
      break;
    }
    case 'denim': {
      // 牛仔：斜向斜纹(twill)编织纹理
      fillBase(ctx, 205);
      ctx.strokeStyle = 'rgba(120, 120, 120, 0.55)';
      ctx.lineWidth = 2;
      for (let i = -TEXTURE_SIZE; i < TEXTURE_SIZE; i += 5) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i + TEXTURE_SIZE, TEXTURE_SIZE);
        ctx.stroke();
      }
      addNoise(ctx, 35, 0.6);
      break;
    }
  }
}

// 由颜色贴图推导法线贴图：亮度梯度转换为法线扰动，形成凹凸立体感
function buildNormalMap(colorCanvas: HTMLCanvasElement, strength: number): HTMLCanvasElement {
  const src = colorCanvas.getContext('2d')!.getImageData(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);
  const { canvas, ctx } = createCanvas();
  const dst = ctx.createImageData(TEXTURE_SIZE, TEXTURE_SIZE);

  // 取像素灰度
  const gray = (x: number, y: number): number => {
    const px = ((y + TEXTURE_SIZE) % TEXTURE_SIZE) * TEXTURE_SIZE + ((x + TEXTURE_SIZE) % TEXTURE_SIZE);
    return src.data[px * 4] / 255;
  };

  for (let y = 0; y < TEXTURE_SIZE; y++) {
    for (let x = 0; x < TEXTURE_SIZE; x++) {
      // Sobel 近似：计算 x/y 方向的高度差
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

// 生成粗糙度贴图：在基础粗糙度上叠加与织纹一致的随机扰动
function buildRoughnessMap(colorCanvas: HTMLCanvasElement, contrast: number): HTMLCanvasElement {
  const src = colorCanvas.getContext('2d')!.getImageData(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);
  const { canvas, ctx } = createCanvas();
  const dst = ctx.createImageData(TEXTURE_SIZE, TEXTURE_SIZE);
  for (let i = 0; i < src.data.length; i += 4) {
    // 织纹越暗（凹陷处）粗糙度越高
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

// 每个类别的纹理参数：法线强度、粗糙度对比、平铺次数
const categoryConfig: Record<FabricCategory, { normalStrength: number; roughnessContrast: number; repeat: number }> = {
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
  // 颜色贴图使用 sRGB 色彩空间，数据贴图保持线性
  texture.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  texture.needsUpdate = true;
  return texture;
}

/**
 * 获取指定面料类别的纹理集合（带缓存）
 */
export function getFabricTextures(category: FabricCategory): FabricTextureSet {
  const cached = textureCache.get(category);
  if (cached) return cached;

  const { canvas: colorCanvas, ctx: colorCtx } = createCanvas();
  drawColorPattern(colorCtx, category);

  const config = categoryConfig[category];
  const normalCanvas = buildNormalMap(colorCanvas, config.normalStrength);
  const roughnessCanvas = buildRoughnessMap(colorCanvas, config.roughnessContrast);

  const textureSet: FabricTextureSet = {
    map: toTexture(colorCanvas, config.repeat, true),
    normalMap: toTexture(normalCanvas, config.repeat, false),
    roughnessMap: toTexture(roughnessCanvas, config.repeat, false),
    repeat: config.repeat,
  };

  textureCache.set(category, textureSet);
  return textureSet;
}
