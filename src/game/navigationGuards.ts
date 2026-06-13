import type { GameState } from '../engine';
import { buildRegionSpec } from './regionSpec';

export function isCurrentStreetSubregionGate(state: GameState, subregionId: string): boolean {
  const spec = buildRegionSpec(state.currentRegion, state);
  return Boolean(spec?.subregionGates.some((gate) => gate.subregionId === subregionId));
}

export function currentStreetRegionGate(
  state: GameState,
  regionId: string,
): { regionId: string; unlocked: boolean } | null {
  const spec = buildRegionSpec(state.currentRegion, state);
  const gate = spec?.gates.find((item) => item.regionId === regionId);
  if (!gate) return null;
  return {
    regionId: gate.regionId,
    unlocked: gate.unlocked && state.unlockedRegions.includes(gate.regionId),
  };
}
