/**
 * 数值工具 —— 四维数值的钳制、增减、区间评价与镇级聚合。
 * 纯函数，无副作用，可直接单元测试。
 */
import type { Metrics, MetricKey, MetricZone, CraftState } from './types';

export const METRIC_KEYS: MetricKey[] = ['heritage', 'market', 'life', 'spirit'];

export const METRIC_LABELS: Record<MetricKey, string> = {
  heritage: '传承度',
  market: '市场度',
  life: '生活度',
  spirit: '精神度',
};

export const METRIC_MIN = 0;
export const METRIC_MAX = 100;

/** 健康区间下/上限，超出触发危机 / 异化 */
export const HEALTHY_LOW = 30;
export const HEALTHY_HIGH = 70;

/** 将单个数值钳制到 [0,100] */
export function clamp(value: number): number {
  return Math.max(METRIC_MIN, Math.min(METRIC_MAX, value));
}

/** 在不可变前提下，对一组四维施加增量并钳制 */
export function applyDelta(base: Metrics, delta: Partial<Metrics>): Metrics {
  const next: Metrics = { ...base };
  for (const key of METRIC_KEYS) {
    if (delta[key] !== undefined) {
      next[key] = clamp(next[key] + (delta[key] as number));
    }
  }
  return next;
}

/** 评价某个数值落在哪个区间 */
export function zoneOf(value: number): MetricZone {
  if (value <= 10) return 'crisis';
  if (value < HEALTHY_LOW) return 'low';
  if (value <= HEALTHY_HIGH) return 'healthy';
  if (value < 90) return 'high';
  return 'excess';
}

/** 由各手艺四维加权（按是否解锁）聚合出镇级四维 */
export function aggregateTownMetrics(crafts: CraftState[]): Metrics {
  const unlocked = crafts.filter((c) => c.unlocked);
  if (unlocked.length === 0) {
    return { heritage: 0, market: 0, life: 0, spirit: 0 };
  }
  const sum: Metrics = { heritage: 0, market: 0, life: 0, spirit: 0 };
  for (const craft of unlocked) {
    for (const key of METRIC_KEYS) {
      sum[key] += craft.metrics[key];
    }
  }
  const avg: Metrics = { heritage: 0, market: 0, life: 0, spirit: 0 };
  for (const key of METRIC_KEYS) {
    avg[key] = Math.round(sum[key] / unlocked.length);
  }
  return avg;
}
