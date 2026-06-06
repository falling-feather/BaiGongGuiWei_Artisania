import type { IndustryDef, RegionDef } from '../engine/types';
import { RESOURCE_INDEX } from './resources';

/** 按「输入是否为空 / 产出资源层级」推断产业层级。 */
export function industryTierFor(industry: IndustryDef) {
  if (Object.keys(industry.input).length === 0) return 'harvest' as const;
  return RESOURCE_INDEX[industry.output]?.tier === 'product' ? 'product' as const : 'refine' as const;
}

/**
 * 本地可操作产业 = 本地特产授权的采集业 + 地区显式列入的精炼/制作业。
 * 街景点位和镇务面板都走这里，避免一个入口可采、另一个入口看不到。
 */
export function localIndustriesForRegion(
  region: RegionDef | undefined,
  industries: IndustryDef[],
): IndustryDef[] {
  if (!region) return [];

  const harvests = industries.filter(
    (industry) =>
      Object.keys(industry.input).length === 0 &&
      region.localResources.includes(industry.output),
  );
  const explicit = region.industries
    .map((id) => industries.find((industry) => industry.id === id))
    .filter((industry): industry is IndustryDef => Boolean(industry));

  const seen = new Set<string>();
  return [...harvests, ...explicit].filter((industry) => {
    if (seen.has(industry.id)) return false;
    seen.add(industry.id);
    return true;
  });
}
