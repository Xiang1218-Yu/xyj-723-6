import * as THREE from 'three';
import { FabricTextureType } from '../types';

const TEXTURE_SIZE = 512;

function createCanvas(size: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  return { canvas, ctx };
}

function canvasToTexture(canvas: HTMLCanvasElement, repeatX = 1, repeatY = 1): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : { r: 128, g: 128, b: 128 };
}

function generateWovenAlbedo(baseColor: string, scale: number): HTMLCanvasElement {
  const { canvas, ctx } = createCanvas(TEXTURE_SIZE);
  const { r, g, b } = hexToRgb(baseColor);
  const threadSpacing = Math.max(4, 8 / scale);

  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);

  for (let x = 0; x < TEXTURE_SIZE; x += threadSpacing) {
    for (let y = 0; y < TEXTURE_SIZE; y += threadSpacing) {
      const isWarp = Math.floor(x / threadSpacing) % 2 === 0;
      const variation = (Math.random() - 0.5) * 20;
      if (isWarp) {
        ctx.fillStyle = `rgb(${Math.min(255, Math.max(0, r + variation + 8))},${Math.min(255, Math.max(0, g + variation + 8))},${Math.min(255, Math.max(0, b + variation + 8))})`;
      } else {
        ctx.fillStyle = `rgb(${Math.min(255, Math.max(0, r + variation - 5))},${Math.min(255, Math.max(0, g + variation - 5))},${Math.min(255, Math.max(0, b + variation - 5))})`;
      }
      ctx.fillRect(x, y, threadSpacing - 1, threadSpacing - 1);
    }
  }

  for (let i = 0; i < 2000 * scale; i++) {
    const fx = Math.random() * TEXTURE_SIZE;
    const fy = Math.random() * TEXTURE_SIZE;
    const fuzz = (Math.random() - 0.5) * 15;
    ctx.fillStyle = `rgba(${Math.min(255, Math.max(0, r + fuzz + 10))},${Math.min(255, Math.max(0, g + fuzz + 10))},${Math.min(255, Math.max(0, b + fuzz + 10))},0.3)`;
    ctx.fillRect(fx, fy, 1, 1);
  }

  return canvas;
}

function generateWovenNormalMap(scale: number): HTMLCanvasElement {
  const { canvas, ctx } = createCanvas(TEXTURE_SIZE);
  const threadSpacing = Math.max(4, 8 / scale);

  ctx.fillStyle = '#8080ff';
  ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);

  for (let x = 0; x < TEXTURE_SIZE; x += threadSpacing) {
    for (let y = 0; y < TEXTURE_SIZE; y += threadSpacing) {
      const isWarp = Math.floor(x / threadSpacing) % 2 === 0;
      if (isWarp) {
        ctx.fillStyle = '#8090ff';
        ctx.fillRect(x, y, threadSpacing - 1, threadSpacing - 1);
      } else {
        ctx.fillStyle = '#7080ff';
        ctx.fillRect(x, y, threadSpacing - 1, threadSpacing - 1);
      }
    }
  }

  return canvas;
}

function generateSatinAlbedo(baseColor: string, scale: number): HTMLCanvasElement {
  const { canvas, ctx } = createCanvas(TEXTURE_SIZE);
  const { r, g, b } = hexToRgb(baseColor);
  const threadSpacing = Math.max(3, 6 / scale);

  const gradient = ctx.createLinearGradient(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);
  gradient.addColorStop(0, `rgb(${Math.min(255, r + 30)},${Math.min(255, g + 30)},${Math.min(255, b + 30)})`);
  gradient.addColorStop(0.5, `rgb(${r},${g},${b})`);
  gradient.addColorStop(1, `rgb(${Math.min(255, r + 20)},${Math.min(255, g + 20)},${Math.min(255, b + 20)})`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);

  for (let x = 0; x < TEXTURE_SIZE; x += threadSpacing) {
    ctx.fillStyle = `rgba(255,255,255,0.08)`;
    ctx.fillRect(x, 0, 1, TEXTURE_SIZE);
  }

  for (let i = 0; i < 500; i++) {
    const sx = Math.random() * TEXTURE_SIZE;
    const sy = Math.random() * TEXTURE_SIZE;
    ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.15})`;
    ctx.fillRect(sx, sy, Math.random() * 20 + 5, 1);
  }

  return canvas;
}

function generateSatinNormalMap(scale: number): HTMLCanvasElement {
  const { canvas, ctx } = createCanvas(TEXTURE_SIZE);
  ctx.fillStyle = '#8080ff';
  ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);

  const threadSpacing = Math.max(3, 6 / scale);
  for (let x = 0; x < TEXTURE_SIZE; x += threadSpacing) {
    ctx.fillStyle = '#8888ff';
    ctx.fillRect(x, 0, 1, TEXTURE_SIZE);
  }

  return canvas;
}

function generateKnitAlbedo(baseColor: string, scale: number): HTMLCanvasElement {
  const { canvas, ctx } = createCanvas(TEXTURE_SIZE);
  const { r, g, b } = hexToRgb(baseColor);
  const stitchW = Math.max(6, 12 / scale);
  const stitchH = Math.max(4, 8 / scale);

  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);

  for (let row = 0; row < TEXTURE_SIZE / stitchH; row++) {
    for (let col = 0; col < TEXTURE_SIZE / stitchW; col++) {
      const x = col * stitchW;
      const y = row * stitchH;
      const offset = row % 2 === 0 ? 0 : stitchW / 2;
      const variation = (Math.random() - 0.5) * 18;
      const vr = Math.min(255, Math.max(0, r + variation));
      const vg = Math.min(255, Math.max(0, g + variation));
      const vb = Math.min(255, Math.max(0, b + variation));

      ctx.fillStyle = `rgb(${vr + 5},${vg + 5},${vb + 5})`;
      ctx.beginPath();
      ctx.arc(x + offset + stitchW / 2, y + stitchH / 2, stitchW / 2.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = `rgb(${Math.max(0, vr - 15)},${Math.max(0, vg - 15)},${Math.max(0, vb - 15)})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x + offset + stitchW / 2, y + stitchH / 2, stitchW / 3, Math.PI * 0.1, Math.PI * 0.9);
      ctx.stroke();
    }
  }

  return canvas;
}

function generateKnitNormalMap(scale: number): HTMLCanvasElement {
  const { canvas, ctx } = createCanvas(TEXTURE_SIZE);
  const stitchW = Math.max(6, 12 / scale);
  const stitchH = Math.max(4, 8 / scale);

  ctx.fillStyle = '#8080ff';
  ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);

  for (let row = 0; row < TEXTURE_SIZE / stitchH; row++) {
    for (let col = 0; col < TEXTURE_SIZE / stitchW; col++) {
      const x = col * stitchW;
      const y = row * stitchH;
      const offset = row % 2 === 0 ? 0 : stitchW / 2;

      ctx.fillStyle = '#9090ff';
      ctx.beginPath();
      ctx.arc(x + offset + stitchW / 2, y + stitchH / 2, stitchW / 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  return canvas;
}

function generateDenimAlbedo(baseColor: string, scale: number): HTMLCanvasElement {
  const { canvas, ctx } = createCanvas(TEXTURE_SIZE);
  const { r, g, b } = hexToRgb(baseColor);
  const threadSpacing = Math.max(3, 5 / scale);

  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);

  for (let x = 0; x < TEXTURE_SIZE; x += threadSpacing) {
    for (let y = 0; y < TEXTURE_SIZE; y += threadSpacing * 2) {
      const isBlue = Math.floor(x / threadSpacing) % 2 === 0;
      if (isBlue) {
        ctx.fillStyle = `rgb(${Math.max(0, r - 15)},${Math.max(0, g - 10)},${Math.min(255, b + 10)})`;
      } else {
        ctx.fillStyle = `rgb(${Math.min(255, r + 10)},${Math.min(255, g + 5)},${Math.max(0, b - 20)})`;
      }
      ctx.fillRect(x, y, threadSpacing - 1, threadSpacing * 2 - 1);
    }
  }

  for (let i = 0; i < 3000; i++) {
    const fx = Math.random() * TEXTURE_SIZE;
    const fy = Math.random() * TEXTURE_SIZE;
    const isWhite = Math.random() > 0.6;
    if (isWhite) {
      ctx.fillStyle = `rgba(200,200,220,${Math.random() * 0.3})`;
    } else {
      ctx.fillStyle = `rgba(${Math.max(0, r - 20)},${Math.max(0, g - 20)},${Math.max(0, b - 20)},${Math.random() * 0.2})`;
    }
    ctx.fillRect(fx, fy, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }

  return canvas;
}

function generateDenimNormalMap(scale: number): HTMLCanvasElement {
  const { canvas, ctx } = createCanvas(TEXTURE_SIZE);
  const threadSpacing = Math.max(3, 5 / scale);

  ctx.fillStyle = '#8080ff';
  ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);

  for (let x = 0; x < TEXTURE_SIZE; x += threadSpacing) {
    for (let y = 0; y < TEXTURE_SIZE; y += threadSpacing * 2) {
      ctx.fillStyle = '#7070ef';
      ctx.fillRect(x, y, threadSpacing - 1, threadSpacing * 2 - 1);
    }
  }

  for (let y = 0; y < TEXTURE_SIZE; y += threadSpacing * 2) {
    for (let x = 0; x < TEXTURE_SIZE; x += threadSpacing) {
      ctx.fillStyle = '#9090ff';
      ctx.fillRect(x, y, threadSpacing - 1, 1);
    }
  }

  return canvas;
}

function generateTweedAlbedo(baseColor: string, scale: number): HTMLCanvasElement {
  const { canvas, ctx } = createCanvas(TEXTURE_SIZE);
  const { r, g, b } = hexToRgb(baseColor);

  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);

  const accentColors = [
    { r: r + 40, g: g + 30, b: b + 20 },
    { r: Math.max(0, r - 30), g: Math.max(0, g - 20), b: Math.max(0, b - 30) },
    { r: r + 20, g: g - 10, b: b + 30 },
    { r: r - 20, g: g + 20, b: b - 10 },
  ];

  for (let i = 0; i < 8000 * scale; i++) {
    const fx = Math.random() * TEXTURE_SIZE;
    const fy = Math.random() * TEXTURE_SIZE;
    const accent = accentColors[Math.floor(Math.random() * accentColors.length)];
    const alpha = 0.1 + Math.random() * 0.4;
    const len = 2 + Math.random() * 6 * scale;
    const angle = Math.random() * Math.PI;

    ctx.save();
    ctx.translate(fx, fy);
    ctx.rotate(angle);
    ctx.fillStyle = `rgba(${Math.min(255, Math.max(0, accent.r))},${Math.min(255, Math.max(0, accent.g))},${Math.min(255, Math.max(0, accent.b))},${alpha})`;
    ctx.fillRect(-len / 2, 0, len, 1.5);
    ctx.restore();
  }

  return canvas;
}

function generateTweedNormalMap(scale: number): HTMLCanvasElement {
  const { canvas, ctx } = createCanvas(TEXTURE_SIZE);

  ctx.fillStyle = '#8080ff';
  ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);

  for (let i = 0; i < 5000 * scale; i++) {
    const fx = Math.random() * TEXTURE_SIZE;
    const fy = Math.random() * TEXTURE_SIZE;
    const val = 128 + (Math.random() - 0.5) * 40;
    ctx.fillStyle = `rgb(${val},${val},255)`;
    ctx.fillRect(fx, fy, 2, 2);
  }

  return canvas;
}

function generateLinenAlbedo(baseColor: string, scale: number): HTMLCanvasElement {
  const { canvas, ctx } = createCanvas(TEXTURE_SIZE);
  const { r, g, b } = hexToRgb(baseColor);
  const threadSpacing = Math.max(5, 10 / scale);

  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);

  for (let x = 0; x < TEXTURE_SIZE; x += threadSpacing) {
    const variation = (Math.random() - 0.5) * 25;
    ctx.fillStyle = `rgb(${Math.min(255, Math.max(0, r + variation + 10))},${Math.min(255, Math.max(0, g + variation + 10))},${Math.min(255, Math.max(0, b + variation + 10))})`;
    ctx.fillRect(x, 0, threadSpacing - 2, TEXTURE_SIZE);
  }

  for (let y = 0; y < TEXTURE_SIZE; y += threadSpacing) {
    const variation = (Math.random() - 0.5) * 20;
    ctx.fillStyle = `rgba(${Math.min(255, Math.max(0, r + variation - 5))},${Math.min(255, Math.max(0, g + variation - 5))},${Math.min(255, Math.max(0, b + variation - 5))},0.5)`;
    ctx.fillRect(0, y, TEXTURE_SIZE, threadSpacing - 2);
  }

  for (let i = 0; i < 1000; i++) {
    const nx = Math.random() * TEXTURE_SIZE;
    const ny = Math.random() * TEXTURE_SIZE;
    ctx.fillStyle = `rgba(${Math.min(255, r + 30)},${Math.min(255, g + 30)},${Math.min(255, b + 30)},0.2)`;
    ctx.fillRect(nx, ny, Math.random() * 3 + 1, 1);
  }

  return canvas;
}

function generateLinenNormalMap(scale: number): HTMLCanvasElement {
  const { canvas, ctx } = createCanvas(TEXTURE_SIZE);
  const threadSpacing = Math.max(5, 10 / scale);

  ctx.fillStyle = '#8080ff';
  ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);

  for (let x = 0; x < TEXTURE_SIZE; x += threadSpacing) {
    ctx.fillStyle = '#8a8aff';
    ctx.fillRect(x, 0, threadSpacing - 2, TEXTURE_SIZE);
  }

  for (let y = 0; y < TEXTURE_SIZE; y += threadSpacing) {
    ctx.fillStyle = '#7676ee';
    ctx.fillRect(0, y, TEXTURE_SIZE, threadSpacing - 2);
  }

  return canvas;
}

function generateSilkAlbedo(baseColor: string, scale: number): HTMLCanvasElement {
  const { canvas, ctx } = createCanvas(TEXTURE_SIZE);
  const { r, g, b } = hexToRgb(baseColor);

  const gradient = ctx.createLinearGradient(0, 0, TEXTURE_SIZE, 0);
  gradient.addColorStop(0, `rgb(${Math.min(255, r + 20)},${Math.min(255, g + 20)},${Math.min(255, b + 25)})`);
  gradient.addColorStop(0.3, `rgb(${r},${g},${b})`);
  gradient.addColorStop(0.5, `rgb(${Math.min(255, r + 40)},${Math.min(255, g + 40)},${Math.min(255, b + 45)})`);
  gradient.addColorStop(0.7, `rgb(${r},${g},${b})`);
  gradient.addColorStop(1, `rgb(${Math.min(255, r + 20)},${Math.min(255, g + 20)},${Math.min(255, b + 25)})`);

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);

  const shimmerSpacing = Math.max(2, 4 / scale);
  for (let i = 0; i < TEXTURE_SIZE; i += shimmerSpacing) {
    ctx.fillStyle = `rgba(255,255,255,${0.02 + Math.random() * 0.05})`;
    ctx.fillRect(i, 0, 1, TEXTURE_SIZE);
  }

  return canvas;
}

function generateSmoothAlbedo(baseColor: string): HTMLCanvasElement {
  const { canvas, ctx } = createCanvas(TEXTURE_SIZE);
  const { r, g, b } = hexToRgb(baseColor);

  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);

  for (let i = 0; i < 500; i++) {
    const sx = Math.random() * TEXTURE_SIZE;
    const sy = Math.random() * TEXTURE_SIZE;
    ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.04})`;
    ctx.fillRect(sx, sy, 1, 1);
  }

  return canvas;
}

function generateJerseyAlbedo(baseColor: string, scale: number): HTMLCanvasElement {
  const { canvas, ctx } = createCanvas(TEXTURE_SIZE);
  const { r, g, b } = hexToRgb(baseColor);
  const waleSpacing = Math.max(4, 8 / scale);

  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);

  for (let x = 0; x < TEXTURE_SIZE; x += waleSpacing) {
    const variation = (Math.random() - 0.5) * 10;
    ctx.fillStyle = `rgb(${Math.min(255, Math.max(0, r + variation + 5))},${Math.min(255, Math.max(0, g + variation + 5))},${Math.min(255, Math.max(0, b + variation + 5))})`;
    ctx.fillRect(x, 0, waleSpacing - 1, TEXTURE_SIZE);

    for (let y = 0; y < TEXTURE_SIZE; y += waleSpacing * 1.5) {
      ctx.fillStyle = `rgba(${Math.max(0, r - 12)},${Math.max(0, g - 12)},${Math.max(0, b - 12)},0.3)`;
      ctx.beginPath();
      ctx.arc(x + waleSpacing / 2, y + waleSpacing * 0.75, waleSpacing / 3, 0, Math.PI);
      ctx.fill();
    }
  }

  return canvas;
}

export interface FabricTextures {
  map: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
}

const textureCache = new Map<string, FabricTextures>();

export function getFabricTextures(
  textureType: FabricTextureType,
  baseColor: string,
  scale: number = 1.0
): FabricTextures {
  const cacheKey = `${textureType}-${baseColor}-${scale.toFixed(2)}`;
  if (textureCache.has(cacheKey)) {
    return textureCache.get(cacheKey)!;
  }

  const repeatX = 2 * scale;
  const repeatY = 3 * scale;
  let albedoCanvas: HTMLCanvasElement;
  let normalCanvas: HTMLCanvasElement;

  switch (textureType) {
    case 'woven':
      albedoCanvas = generateWovenAlbedo(baseColor, scale);
      normalCanvas = generateWovenNormalMap(scale);
      break;
    case 'satin':
      albedoCanvas = generateSatinAlbedo(baseColor, scale);
      normalCanvas = generateSatinNormalMap(scale);
      break;
    case 'knit':
      albedoCanvas = generateKnitAlbedo(baseColor, scale);
      normalCanvas = generateKnitNormalMap(scale);
      break;
    case 'denim':
      albedoCanvas = generateDenimAlbedo(baseColor, scale);
      normalCanvas = generateDenimNormalMap(scale);
      break;
    case 'tweed':
      albedoCanvas = generateTweedAlbedo(baseColor, scale);
      normalCanvas = generateTweedNormalMap(scale);
      break;
    case 'linen':
      albedoCanvas = generateLinenAlbedo(baseColor, scale);
      normalCanvas = generateLinenNormalMap(scale);
      break;
    case 'silk':
      albedoCanvas = generateSilkAlbedo(baseColor, scale);
      normalCanvas = generateSatinNormalMap(scale * 0.7);
      break;
    case 'jersey':
      albedoCanvas = generateJerseyAlbedo(baseColor, scale);
      normalCanvas = generateKnitNormalMap(scale * 0.8);
      break;
    case 'leather':
    case 'smooth':
    default:
      albedoCanvas = generateSmoothAlbedo(baseColor);
      normalCanvas = generateWovenNormalMap(0.3);
      break;
  }

  const roughnessCanvas = createCanvas(TEXTURE_SIZE);
  roughnessCanvas.ctx.fillStyle = '#aaaaaa';
  roughnessCanvas.ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);

  const textures: FabricTextures = {
    map: canvasToTexture(albedoCanvas, repeatX, repeatY),
    normalMap: canvasToTexture(normalCanvas, repeatX, repeatY),
    roughnessMap: canvasToTexture(roughnessCanvas.canvas, repeatX, repeatY),
  };

  textureCache.set(cacheKey, textures);
  return textures;
}

export function clearTextureCache(): void {
  textureCache.forEach((textures) => {
    textures.map.dispose();
    textures.normalMap.dispose();
    textures.roughnessMap.dispose();
  });
  textureCache.clear();
}
