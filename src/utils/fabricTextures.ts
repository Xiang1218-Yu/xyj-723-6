import * as THREE from 'three';
import { FabricTextureType } from '../types';

/** 程序化纹理画布尺寸 */
const TEXTURE_SIZE = 512;

/**
 * 创建指定尺寸的Canvas元素并获取2D上下文
 * @param size - 画布边长像素值
 */
function createCanvas(size: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  return { canvas, ctx };
}

/**
 * 将Canvas转换为Three.js纹理，设置重复包裹和各向异性过滤
 * @param canvas - 源Canvas元素
 * @param repeatX - U方向重复次数
 * @param repeatY - V方向重复次数
 */
function canvasToTexture(canvas: HTMLCanvasElement, repeatX = 1, repeatY = 1): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

/** 将十六进制颜色字符串解析为RGB分量 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : { r: 128, g: 128, b: 128 };
}

/** 将粗糙度值(0-1)编码为灰度像素值(0=光滑/黑, 255=粗糙/白) */
function roughnessToGray(value: number): string {
  const g = Math.round(value * 255);
  return `rgb(${g},${g},${g})`;
}

// ==================== Albedo (漫反射颜色) 纹理生成 ====================

/**
 * 生成棉质机织面料Albedo纹理 - 经纬交错编织图案，表面有细微毛羽
 */
function generateWovenAlbedo(baseColor: string, scale: number): HTMLCanvasElement {
  const { canvas, ctx } = createCanvas(TEXTURE_SIZE);
  const { r, g, b } = hexToRgb(baseColor);
  const threadSpacing = Math.max(4, 8 / scale);

  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);

  // 绘制经纬交错的方格编织图案
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

  // 添加随机毛羽噪点
  for (let i = 0; i < 2000 * scale; i++) {
    const fx = Math.random() * TEXTURE_SIZE;
    const fy = Math.random() * TEXTURE_SIZE;
    const fuzz = (Math.random() - 0.5) * 15;
    ctx.fillStyle = `rgba(${Math.min(255, Math.max(0, r + fuzz + 10))},${Math.min(255, Math.max(0, g + fuzz + 10))},${Math.min(255, Math.max(0, b + fuzz + 10))},0.3)`;
    ctx.fillRect(fx, fy, 1, 1);
  }

  return canvas;
}

/**
 * 生成缎面Albedo纹理 - 斜向光泽渐变，细密经线反光条纹
 */
function generateSatinAlbedo(baseColor: string, scale: number): HTMLCanvasElement {
  const { canvas, ctx } = createCanvas(TEXTURE_SIZE);
  const { r, g, b } = hexToRgb(baseColor);
  const threadSpacing = Math.max(3, 6 / scale);

  // 对角渐变模拟缎面光泽
  const gradient = ctx.createLinearGradient(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);
  gradient.addColorStop(0, `rgb(${Math.min(255, r + 30)},${Math.min(255, g + 30)},${Math.min(255, b + 30)})`);
  gradient.addColorStop(0.5, `rgb(${r},${g},${b})`);
  gradient.addColorStop(1, `rgb(${Math.min(255, r + 20)},${Math.min(255, g + 20)},${Math.min(255, b + 20)})`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);

  // 细密经线高光条纹
  for (let x = 0; x < TEXTURE_SIZE; x += threadSpacing) {
    ctx.fillStyle = `rgba(255,255,255,0.08)`;
    ctx.fillRect(x, 0, 1, TEXTURE_SIZE);
  }

  // 随机长条形高光闪烁
  for (let i = 0; i < 500; i++) {
    const sx = Math.random() * TEXTURE_SIZE;
    const sy = Math.random() * TEXTURE_SIZE;
    ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.15})`;
    ctx.fillRect(sx, sy, Math.random() * 20 + 5, 1);
  }

  return canvas;
}

/**
 * 生成针织面料Albedo纹理 - V形针脚环形图案，弹性纹理
 */
function generateKnitAlbedo(baseColor: string, scale: number): HTMLCanvasElement {
  const { canvas, ctx } = createCanvas(TEXTURE_SIZE);
  const { r, g, b } = hexToRgb(baseColor);
  const stitchW = Math.max(6, 12 / scale);
  const stitchH = Math.max(4, 8 / scale);

  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);

  // 交错排列的V形针织针脚
  for (let row = 0; row < TEXTURE_SIZE / stitchH; row++) {
    for (let col = 0; col < TEXTURE_SIZE / stitchW; col++) {
      const x = col * stitchW;
      const y = row * stitchH;
      const offset = row % 2 === 0 ? 0 : stitchW / 2;
      const variation = (Math.random() - 0.5) * 18;
      const vr = Math.min(255, Math.max(0, r + variation));
      const vg = Math.min(255, Math.max(0, g + variation));
      const vb = Math.min(255, Math.max(0, b + variation));

      // 凸起的针脚圆点
      ctx.fillStyle = `rgb(${vr + 5},${vg + 5},${vb + 5})`;
      ctx.beginPath();
      ctx.arc(x + offset + stitchW / 2, y + stitchH / 2, stitchW / 2.5, 0, Math.PI * 2);
      ctx.fill();

      // 针脚阴影弧线
      ctx.strokeStyle = `rgb(${Math.max(0, vr - 15)},${Math.max(0, vg - 15)},${Math.max(0, vb - 15)})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x + offset + stitchW / 2, y + stitchH / 2, stitchW / 3, Math.PI * 0.1, Math.PI * 0.9);
      ctx.stroke();
    }
  }

  return canvas;
}

/**
 * 生成牛仔布Albedo纹理 - 蓝色斜纹双色编织，白色棉结
 */
function generateDenimAlbedo(baseColor: string, scale: number): HTMLCanvasElement {
  const { canvas, ctx } = createCanvas(TEXTURE_SIZE);
  const { r, g, b } = hexToRgb(baseColor);
  const threadSpacing = Math.max(3, 5 / scale);

  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);

  // 靛蓝/白色交替的斜纹编织
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

  // 随机白色棉结/深色斑点
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

/**
 * 生成粗花呢Albedo纹理 - 多彩杂色纤维斑点，交叉纱线效果
 */
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

  // 随机方向的彩色短纤维
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

/**
 * 生成亚麻Albedo纹理 - 粗纬线不规则交叉，天然纤维节点
 */
function generateLinenAlbedo(baseColor: string, scale: number): HTMLCanvasElement {
  const { canvas, ctx } = createCanvas(TEXTURE_SIZE);
  const { r, g, b } = hexToRgb(baseColor);
  const threadSpacing = Math.max(5, 10 / scale);

  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);

  // 粗纬线（竖条）- 不规则宽度和颜色
  for (let x = 0; x < TEXTURE_SIZE; x += threadSpacing) {
    const variation = (Math.random() - 0.5) * 25;
    ctx.fillStyle = `rgb(${Math.min(255, Math.max(0, r + variation + 10))},${Math.min(255, Math.max(0, g + variation + 10))},${Math.min(255, Math.max(0, b + variation + 10))})`;
    ctx.fillRect(x, 0, threadSpacing - 2, TEXTURE_SIZE);
  }

  // 细经线（横条）- 半透明叠加
  for (let y = 0; y < TEXTURE_SIZE; y += threadSpacing) {
    const variation = (Math.random() - 0.5) * 20;
    ctx.fillStyle = `rgba(${Math.min(255, Math.max(0, r + variation - 5))},${Math.min(255, Math.max(0, g + variation - 5))},${Math.min(255, Math.max(0, b + variation - 5))},0.5)`;
    ctx.fillRect(0, y, TEXTURE_SIZE, threadSpacing - 2);
  }

  // 天然纤维节点
  for (let i = 0; i < 1000; i++) {
    const nx = Math.random() * TEXTURE_SIZE;
    const ny = Math.random() * TEXTURE_SIZE;
    ctx.fillStyle = `rgba(${Math.min(255, r + 30)},${Math.min(255, g + 30)},${Math.min(255, b + 30)},0.2)`;
    ctx.fillRect(nx, ny, Math.random() * 3 + 1, 1);
  }

  return canvas;
}

/**
 * 生成丝绸Albedo纹理 - 水平珠光渐变，细密闪烁竖线
 */
function generateSilkAlbedo(baseColor: string, scale: number): HTMLCanvasElement {
  const { canvas, ctx } = createCanvas(TEXTURE_SIZE);
  const { r, g, b } = hexToRgb(baseColor);

  // 水平方向珠光渐变带
  const gradient = ctx.createLinearGradient(0, 0, TEXTURE_SIZE, 0);
  gradient.addColorStop(0, `rgb(${Math.min(255, r + 20)},${Math.min(255, g + 20)},${Math.min(255, b + 25)})`);
  gradient.addColorStop(0.3, `rgb(${r},${g},${b})`);
  gradient.addColorStop(0.5, `rgb(${Math.min(255, r + 40)},${Math.min(255, g + 40)},${Math.min(255, b + 45)})`);
  gradient.addColorStop(0.7, `rgb(${r},${g},${b})`);
  gradient.addColorStop(1, `rgb(${Math.min(255, r + 20)},${Math.min(255, g + 20)},${Math.min(255, b + 25)})`);

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);

  // 极细闪烁竖线
  const shimmerSpacing = Math.max(2, 4 / scale);
  for (let i = 0; i < TEXTURE_SIZE; i += shimmerSpacing) {
    ctx.fillStyle = `rgba(255,255,255,${0.02 + Math.random() * 0.05})`;
    ctx.fillRect(i, 0, 1, TEXTURE_SIZE);
  }

  return canvas;
}

/**
 * 生成光滑化纤Albedo纹理 - 均匀底色，极微噪点
 */
function generateSmoothAlbedo(baseColor: string): HTMLCanvasElement {
  const { canvas, ctx } = createCanvas(TEXTURE_SIZE);
  const { r, g, b } = hexToRgb(baseColor);

  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);

  // 极细微噪点（化纤表面非常均匀）
  for (let i = 0; i < 500; i++) {
    const sx = Math.random() * TEXTURE_SIZE;
    const sy = Math.random() * TEXTURE_SIZE;
    ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.04})`;
    ctx.fillRect(sx, sy, 1, 1);
  }

  return canvas;
}

/**
 * 生成针织氨纶Albedo纹理 - 竖向V形凸条纹理，弹性面料
 */
function generateJerseyAlbedo(baseColor: string, scale: number): HTMLCanvasElement {
  const { canvas, ctx } = createCanvas(TEXTURE_SIZE);
  const { r, g, b } = hexToRgb(baseColor);
  const waleSpacing = Math.max(4, 8 / scale);

  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);

  // 竖向凸条纹理
  for (let x = 0; x < TEXTURE_SIZE; x += waleSpacing) {
    const variation = (Math.random() - 0.5) * 10;
    ctx.fillStyle = `rgb(${Math.min(255, Math.max(0, r + variation + 5))},${Math.min(255, Math.max(0, g + variation + 5))},${Math.min(255, Math.max(0, b + variation + 5))})`;
    ctx.fillRect(x, 0, waleSpacing - 1, TEXTURE_SIZE);

    // 横向连接弧线（针脚交叠处）
    for (let y = 0; y < TEXTURE_SIZE; y += waleSpacing * 1.5) {
      ctx.fillStyle = `rgba(${Math.max(0, r - 12)},${Math.max(0, g - 12)},${Math.max(0, b - 12)},0.3)`;
      ctx.beginPath();
      ctx.arc(x + waleSpacing / 2, y + waleSpacing * 0.75, waleSpacing / 3, 0, Math.PI);
      ctx.fill();
    }
  }

  return canvas;
}

// ==================== Normal Map (法线贴图) 纹理生成 ====================

/** 机织面料法线贴图 - 方格凹凸编织 */
function generateWovenNormalMap(scale: number): HTMLCanvasElement {
  const { canvas, ctx } = createCanvas(TEXTURE_SIZE);
  const threadSpacing = Math.max(4, 8 / scale);

  ctx.fillStyle = '#8080ff';
  ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);

  for (let x = 0; x < TEXTURE_SIZE; x += threadSpacing) {
    for (let y = 0; y < TEXTURE_SIZE; y += threadSpacing) {
      const isWarp = Math.floor(x / threadSpacing) % 2 === 0;
      ctx.fillStyle = isWarp ? '#8090ff' : '#7080ff';
      ctx.fillRect(x, y, threadSpacing - 1, threadSpacing - 1);
    }
  }

  return canvas;
}

/** 缎面法线贴图 - 细密经线方向凹凸 */
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

/** 针织法线贴图 - 圆形针脚凸起 */
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

/** 牛仔法线贴图 - 双色斜纹凹凸 */
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

/** 粗花呢法线贴图 - 随机方向纤维凹凸 */
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

/** 亚麻法线贴图 - 粗纬线交叉凹凸 */
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

// ==================== Roughness Map (粗糙度贴图) 纹理生成 ====================
// 粗糙度贴图中: 白色(255)=完全粗糙漫反射, 黑色(0)=完全光滑镜面反射

/**
 * 棉质粗糙度贴图 - 中等偏高粗糙度（0.7-0.9），编织纹理处有变化
 * 棉质表面哑光但编织交叉处略有光泽差异
 */
function generateWovenRoughnessMap(scale: number): HTMLCanvasElement {
  const { canvas, ctx } = createCanvas(TEXTURE_SIZE);
  const threadSpacing = Math.max(4, 8 / scale);
  const baseRoughness = 0.8;

  ctx.fillStyle = roughnessToGray(baseRoughness);
  ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);

  // 经纬线粗糙度略有不同（经线微光滑，纬线微粗糙）
  for (let x = 0; x < TEXTURE_SIZE; x += threadSpacing) {
    for (let y = 0; y < TEXTURE_SIZE; y += threadSpacing) {
      const isWarp = Math.floor(x / threadSpacing) % 2 === 0;
      const roughValue = isWarp ? baseRoughness - 0.05 : baseRoughness + 0.05;
      ctx.fillStyle = roughnessToGray(Math.max(0, Math.min(1, roughValue)));
      ctx.fillRect(x, y, threadSpacing - 1, threadSpacing - 1);
    }
  }

  // 随机毛羽增加粗糙度变化
  for (let i = 0; i < 3000 * scale; i++) {
    const fx = Math.random() * TEXTURE_SIZE;
    const fy = Math.random() * TEXTURE_SIZE;
    const roughVar = baseRoughness + (Math.random() - 0.5) * 0.2;
    ctx.fillStyle = roughnessToGray(Math.max(0, Math.min(1, roughVar)));
    ctx.fillRect(fx, fy, 2, 2);
  }

  return canvas;
}

/**
 * 缎面粗糙度贴图 - 低粗糙度（0.1-0.3），呈现高光泽
 * 经线方向粗糙度极低（反光），纬线略粗糙
 */
function generateSatinRoughnessMap(scale: number): HTMLCanvasElement {
  const { canvas, ctx } = createCanvas(TEXTURE_SIZE);
  const threadSpacing = Math.max(3, 6 / scale);
  const baseRoughness = 0.15;

  ctx.fillStyle = roughnessToGray(baseRoughness);
  ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);

  // 经线极光滑（深色=低粗糙度）
  for (let x = 0; x < TEXTURE_SIZE; x += threadSpacing) {
    ctx.fillStyle = roughnessToGray(0.05 + Math.random() * 0.05);
    ctx.fillRect(x, 0, 2, TEXTURE_SIZE);
  }

  // 纬线方向略粗糙
  for (let y = 0; y < TEXTURE_SIZE; y += threadSpacing * 3) {
    ctx.fillStyle = roughnessToGray(0.25);
    ctx.fillRect(0, y, TEXTURE_SIZE, 1);
  }

  // 随机光泽斑点（极低粗糙度=高光区域）
  for (let i = 0; i < 200; i++) {
    const sx = Math.random() * TEXTURE_SIZE;
    const sy = Math.random() * TEXTURE_SIZE;
    ctx.fillStyle = roughnessToGray(Math.random() * 0.1);
    ctx.fillRect(sx, sy, Math.random() * 15 + 3, 2);
  }

  return canvas;
}

/**
 * 针织粗糙度贴图 - 中高粗糙度（0.65-0.85），针脚凸起处略光滑
 * 环状针脚顶部微光滑，缝隙处粗糙
 */
function generateKnitRoughnessMap(scale: number): HTMLCanvasElement {
  const { canvas, ctx } = createCanvas(TEXTURE_SIZE);
  const stitchW = Math.max(6, 12 / scale);
  const stitchH = Math.max(4, 8 / scale);
  const baseRoughness = 0.75;

  ctx.fillStyle = roughnessToGray(baseRoughness);
  ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);

  for (let row = 0; row < TEXTURE_SIZE / stitchH; row++) {
    for (let col = 0; col < TEXTURE_SIZE / stitchW; col++) {
      const x = col * stitchW;
      const y = row * stitchH;
      const offset = row % 2 === 0 ? 0 : stitchW / 2;
      // 针脚环顶部略光滑（凸起处反射光线）
      ctx.fillStyle = roughnessToGray(baseRoughness - 0.1);
      ctx.beginPath();
      ctx.arc(x + offset + stitchW / 2, y + stitchH / 2, stitchW / 2.5, 0, Math.PI * 2);
      ctx.fill();
      // 针脚阴影线处更粗糙
      ctx.strokeStyle = roughnessToGray(baseRoughness + 0.1);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(x + offset + stitchW / 2, y + stitchH / 2, stitchW / 3, Math.PI * 0.1, Math.PI * 0.9);
      ctx.stroke();
    }
  }

  return canvas;
}

/**
 * 牛仔粗糙度贴图 - 高粗糙度（0.8-0.95），斜纹编织差异
 * 蓝色靛蓝纱线略粗糙，白色纬线光滑度不同
 */
function generateDenimRoughnessMap(scale: number): HTMLCanvasElement {
  const { canvas, ctx } = createCanvas(TEXTURE_SIZE);
  const threadSpacing = Math.max(3, 5 / scale);
  const baseRoughness = 0.9;

  ctx.fillStyle = roughnessToGray(baseRoughness);
  ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);

  // 斜纹编织粗糙度变化
  for (let x = 0; x < TEXTURE_SIZE; x += threadSpacing) {
    for (let y = 0; y < TEXTURE_SIZE; y += threadSpacing * 2) {
      const isIndigo = Math.floor(x / threadSpacing) % 2 === 0;
      const roughValue = isIndigo ? 0.92 : 0.85;
      ctx.fillStyle = roughnessToGray(roughValue);
      ctx.fillRect(x, y, threadSpacing - 1, threadSpacing * 2 - 1);
    }
  }

  // 白色棉结处粗糙度降低（棉花纤维更光滑）
  for (let i = 0; i < 2000; i++) {
    const fx = Math.random() * TEXTURE_SIZE;
    const fy = Math.random() * TEXTURE_SIZE;
    ctx.fillStyle = roughnessToGray(0.6 + Math.random() * 0.15);
    ctx.fillRect(fx, fy, 2, 2);
  }

  return canvas;
}

/**
 * 粗花呢粗糙度贴图 - 极高粗糙度（0.9-1.0），杂色纤维导致漫反射极强
 * 多彩纤维方向不同，粗糙度极度不均匀
 */
function generateTweedRoughnessMap(scale: number): HTMLCanvasElement {
  const { canvas, ctx } = createCanvas(TEXTURE_SIZE);
  const baseRoughness = 0.95;

  ctx.fillStyle = roughnessToGray(baseRoughness);
  ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);

  // 各方向短纤维粗糙度极度随机
  for (let i = 0; i < 6000 * scale; i++) {
    const fx = Math.random() * TEXTURE_SIZE;
    const fy = Math.random() * TEXTURE_SIZE;
    const roughVar = 0.85 + Math.random() * 0.15;
    const len = 2 + Math.random() * 5 * scale;
    const angle = Math.random() * Math.PI;

    ctx.save();
    ctx.translate(fx, fy);
    ctx.rotate(angle);
    ctx.fillStyle = roughnessToGray(roughVar);
    ctx.fillRect(-len / 2, 0, len, 2);
    ctx.restore();
  }

  return canvas;
}

/**
 * 亚麻粗糙度贴图 - 高粗糙度（0.75-0.9），粗纬线不均匀
 * 粗纬线表面粗糙，节点处粗糙度极高
 */
function generateLinenRoughnessMap(scale: number): HTMLCanvasElement {
  const { canvas, ctx } = createCanvas(TEXTURE_SIZE);
  const threadSpacing = Math.max(5, 10 / scale);
  const baseRoughness = 0.85;

  ctx.fillStyle = roughnessToGray(baseRoughness);
  ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);

  // 粗纬线（竖条）粗糙度变化
  for (let x = 0; x < TEXTURE_SIZE; x += threadSpacing) {
    const roughVar = baseRoughness + (Math.random() - 0.5) * 0.15;
    ctx.fillStyle = roughnessToGray(Math.max(0, Math.min(1, roughVar)));
    ctx.fillRect(x, 0, threadSpacing - 2, TEXTURE_SIZE);
  }

  // 细经线（横条）叠加粗糙度
  for (let y = 0; y < TEXTURE_SIZE; y += threadSpacing) {
    ctx.fillStyle = roughnessToGray(baseRoughness - 0.05);
    ctx.fillRect(0, y, TEXTURE_SIZE, threadSpacing - 2);
  }

  // 纤维节点处极高粗糙度
  for (let i = 0; i < 800; i++) {
    const nx = Math.random() * TEXTURE_SIZE;
    const ny = Math.random() * TEXTURE_SIZE;
    ctx.fillStyle = roughnessToGray(0.95);
    ctx.fillRect(nx, ny, Math.random() * 4 + 1, 2);
  }

  return canvas;
}

/**
 * 丝绸粗糙度贴图 - 极低粗糙度（0.05-0.25），珠光高光泽
 * 大面积极低粗糙度，水平方向有渐变光泽带
 */
function generateSilkRoughnessMap(scale: number): HTMLCanvasElement {
  const { canvas, ctx } = createCanvas(TEXTURE_SIZE);
  const shimmerSpacing = Math.max(2, 4 / scale);

  // 水平渐变粗糙度 - 模拟丝绸珠光带
  const gradient = ctx.createLinearGradient(0, 0, TEXTURE_SIZE, 0);
  gradient.addColorStop(0, roughnessToGray(0.15));
  gradient.addColorStop(0.3, roughnessToGray(0.08));
  gradient.addColorStop(0.5, roughnessToGray(0.03));
  gradient.addColorStop(0.7, roughnessToGray(0.08));
  gradient.addColorStop(1, roughnessToGray(0.15));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);

  // 极细竖线闪烁（极低粗糙度=镜面高光）
  for (let i = 0; i < TEXTURE_SIZE; i += shimmerSpacing) {
    ctx.fillStyle = roughnessToGray(0.02 + Math.random() * 0.03);
    ctx.fillRect(i, 0, 1, TEXTURE_SIZE);
  }

  return canvas;
}

/**
 * 光滑化纤粗糙度贴图 - 低到中等粗糙度（0.2-0.5），均匀一致
 * 合成纤维表面光滑均匀，仅微观粗糙度变化
 */
function generateSmoothRoughnessMap(): HTMLCanvasElement {
  const { canvas, ctx } = createCanvas(TEXTURE_SIZE);
  const baseRoughness = 0.35;

  ctx.fillStyle = roughnessToGray(baseRoughness);
  ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);

  // 极微小的粗糙度变化（化纤非常均匀）
  for (let i = 0; i < 1500; i++) {
    const sx = Math.random() * TEXTURE_SIZE;
    const sy = Math.random() * TEXTURE_SIZE;
    const roughVar = baseRoughness + (Math.random() - 0.5) * 0.15;
    ctx.fillStyle = roughnessToGray(Math.max(0, Math.min(1, roughVar)));
    ctx.fillRect(sx, sy, 2, 2);
  }

  return canvas;
}

/**
 * 氨纶针织粗糙度贴图 - 中等粗糙度（0.3-0.5），弹性面料光滑但有纹理
 * 凸条顶部光滑，凹槽处粗糙
 */
function generateJerseyRoughnessMap(scale: number): HTMLCanvasElement {
  const { canvas, ctx } = createCanvas(TEXTURE_SIZE);
  const waleSpacing = Math.max(4, 8 / scale);
  const baseRoughness = 0.4;

  ctx.fillStyle = roughnessToGray(baseRoughness);
  ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);

  // 竖向凸条顶部略光滑
  for (let x = 0; x < TEXTURE_SIZE; x += waleSpacing) {
    ctx.fillStyle = roughnessToGray(baseRoughness - 0.08);
    ctx.fillRect(x, 0, waleSpacing - 1, TEXTURE_SIZE);

    // 横向连接处更粗糙
    for (let y = 0; y < TEXTURE_SIZE; y += waleSpacing * 1.5) {
      ctx.fillStyle = roughnessToGray(baseRoughness + 0.1);
      ctx.beginPath();
      ctx.arc(x + waleSpacing / 2, y + waleSpacing * 0.75, waleSpacing / 3, 0, Math.PI);
      ctx.fill();
    }
  }

  return canvas;
}

// ==================== 纹理获取接口 ====================

export interface FabricTextures {
  /** 漫反射颜色纹理（Albedo/Map） */
  map: THREE.CanvasTexture;
  /** 法线贴图（Normal Map）- RGB编码表面凹凸方向 */
  normalMap: THREE.CanvasTexture;
  /** 粗糙度贴图（Roughness Map）- 灰度编码表面粗糙程度 */
  roughnessMap: THREE.CanvasTexture;
}

/** 纹理缓存，避免重复生成相同纹理 */
const textureCache = new Map<string, FabricTextures>();

/**
 * 根据面料纹理类型获取程序化生成的纹理集合（带缓存）
 * @param textureType - 面料纹理类型
 * @param baseColor - 基础颜色十六进制值
 * @param scale - 纹理缩放比例（值越大纹理越细密）
 */
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
  let roughnessCanvas: HTMLCanvasElement;

  switch (textureType) {
    case 'woven':
      albedoCanvas = generateWovenAlbedo(baseColor, scale);
      normalCanvas = generateWovenNormalMap(scale);
      roughnessCanvas = generateWovenRoughnessMap(scale);
      break;
    case 'satin':
      albedoCanvas = generateSatinAlbedo(baseColor, scale);
      normalCanvas = generateSatinNormalMap(scale);
      roughnessCanvas = generateSatinRoughnessMap(scale);
      break;
    case 'knit':
      albedoCanvas = generateKnitAlbedo(baseColor, scale);
      normalCanvas = generateKnitNormalMap(scale);
      roughnessCanvas = generateKnitRoughnessMap(scale);
      break;
    case 'denim':
      albedoCanvas = generateDenimAlbedo(baseColor, scale);
      normalCanvas = generateDenimNormalMap(scale);
      roughnessCanvas = generateDenimRoughnessMap(scale);
      break;
    case 'tweed':
      albedoCanvas = generateTweedAlbedo(baseColor, scale);
      normalCanvas = generateTweedNormalMap(scale);
      roughnessCanvas = generateTweedRoughnessMap(scale);
      break;
    case 'linen':
      albedoCanvas = generateLinenAlbedo(baseColor, scale);
      normalCanvas = generateLinenNormalMap(scale);
      roughnessCanvas = generateLinenRoughnessMap(scale);
      break;
    case 'silk':
      albedoCanvas = generateSilkAlbedo(baseColor, scale);
      normalCanvas = generateSatinNormalMap(scale * 0.7);
      roughnessCanvas = generateSilkRoughnessMap(scale);
      break;
    case 'jersey':
      albedoCanvas = generateJerseyAlbedo(baseColor, scale);
      normalCanvas = generateKnitNormalMap(scale * 0.8);
      roughnessCanvas = generateJerseyRoughnessMap(scale);
      break;
    case 'leather':
    case 'smooth':
    default:
      albedoCanvas = generateSmoothAlbedo(baseColor);
      normalCanvas = generateWovenNormalMap(0.3);
      roughnessCanvas = generateSmoothRoughnessMap();
      break;
  }

  const textures: FabricTextures = {
    map: canvasToTexture(albedoCanvas, repeatX, repeatY),
    normalMap: canvasToTexture(normalCanvas, repeatX, repeatY),
    roughnessMap: canvasToTexture(roughnessCanvas, repeatX, repeatY),
  };

  textureCache.set(cacheKey, textures);
  return textures;
}

/** 清空纹理缓存并释放GPU资源 */
export function clearTextureCache(): void {
  textureCache.forEach((textures) => {
    textures.map.dispose();
    textures.normalMap.dispose();
    textures.roughnessMap.dispose();
  });
  textureCache.clear();
}
