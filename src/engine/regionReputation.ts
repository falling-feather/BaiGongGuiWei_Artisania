import type { GameState, RegionId } from './types';

export const REGION_REPUTATION_MAX = 100;

export type RegionReputationBand = 'unfamiliar' | 'known' | 'trusted' | 'honored' | 'pillar';

export function clampRegionReputation(value: number): number {
  return Math.max(0, Math.min(REGION_REPUTATION_MAX, Math.round(value)));
}

export function regionReputationOf(
  state: Pick<GameState, 'regionReputation'>,
  regionId: RegionId | string | undefined,
): number {
  if (!regionId) return 0;
  return clampRegionReputation(state.regionReputation?.[regionId] ?? 0);
}

export function addRegionReputation(
  reputation: Record<string, number> | undefined,
  regionId: RegionId | string | undefined,
  amount: number,
): Record<string, number> {
  if (!regionId || amount === 0) return { ...(reputation ?? {}) };
  return {
    ...(reputation ?? {}),
    [regionId]: clampRegionReputation((reputation?.[regionId] ?? 0) + amount),
  };
}

export function regionReputationBand(score: number): RegionReputationBand {
  const value = clampRegionReputation(score);
  if (value >= 80) return 'pillar';
  if (value >= 60) return 'honored';
  if (value >= 36) return 'trusted';
  if (value >= 12) return 'known';
  return 'unfamiliar';
}

export function regionReputationLabel(score: number): string {
  const labels: Record<RegionReputationBand, string> = {
    unfamiliar: '初来',
    known: '有名',
    trusted: '可信',
    honored: '望重',
    pillar: '坐地师',
  };
  return labels[regionReputationBand(score)];
}

