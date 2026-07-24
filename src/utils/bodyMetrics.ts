import { BodyType, ModelSettings } from '../types';

/**
 * 人体尺寸计算模块
 * VirtualModel（人体）与 Garment（服装）共用同一套人体尺寸，
 * 保证服装能够精确贴合并"穿戴"在 3D 人物身上，而不是漂浮或错位。
 */

// 不同体型对躯干/臀部/四肢的缩放系数
export const bodyTypeScales: Record<BodyType, { torso: number; hips: number; limbs: number }> = {
  slim: { torso: 0.85, hips: 0.85, limbs: 1.05 },
  standard: { torso: 1, hips: 1, limbs: 1 },
  athletic: { torso: 1.1, hips: 0.9, limbs: 1.05 },
  curvy: { torso: 0.95, hips: 1.15, limbs: 0.95 },
};

// 人体整体在场景中的垂直偏移（VirtualModel 与 Garment 的 group 都使用该偏移对齐）
export const BODY_GROUP_OFFSET_Y = -0.5;

export interface BodyMetrics {
  heightScale: number;
  scales: { torso: number; hips: number; limbs: number };
  // 头/颈
  headRadius: number;
  neckHeight: number;
  headY: number;
  // 躯干（局部坐标，相对人体 group）
  torsoTopRadius: number;
  torsoBottomRadius: number;
  torsoHeight: number;
  torsoY: number;
  // 臀部
  hipsTopRadius: number;
  hipsBottomRadius: number;
  hipsHeight: number;
  hipsY: number;
  // 手臂
  armX: number;
  armY: number;
  armRadius: number;
  armLength: number;
  // 腿部
  legX: number;
  legY: number;
}

/**
 * 根据模型设置计算人体各部位尺寸与局部坐标
 */
export function computeBodyMetrics(modelSettings: ModelSettings): BodyMetrics {
  const { bodyType, measurements } = modelSettings;
  const scales = bodyTypeScales[bodyType];

  const heightScale = measurements.height / 175;
  const bustScale = measurements.bust / 90;
  const waistScale = measurements.waist / 65;
  const hipsScale = measurements.hips / 95;

  return {
    heightScale,
    scales,
    headRadius: 0.18 * heightScale,
    neckHeight: 0.25 * heightScale,
    headY: 1.6 * heightScale,
    torsoTopRadius: 0.28 * scales.torso * bustScale,
    torsoBottomRadius: 0.22 * scales.torso * waistScale,
    torsoHeight: 0.6 * scales.torso * heightScale,
    torsoY: 0.95 * scales.torso * heightScale,
    hipsTopRadius: 0.22 * scales.hips * waistScale,
    hipsBottomRadius: 0.3 * scales.hips * hipsScale,
    hipsHeight: 0.3 * scales.hips * heightScale,
    hipsY: 0.5 * scales.hips * heightScale,
    armX: 0.4 * scales.limbs * bustScale,
    armY: 1.1 * heightScale,
    armRadius: 0.06 * heightScale,
    armLength: 0.5 * scales.limbs * heightScale,
    legX: 0.15 * scales.limbs * hipsScale,
    legY: 0.1 * heightScale,
  };
}
