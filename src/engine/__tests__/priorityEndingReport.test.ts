import { describe, expect, it } from 'vitest';
import { ACHIEVEMENTS } from '../../data/achievements';
import { STARTING_APPRENTICES } from '../../data/apprentices';
import { CRAFTS } from '../../data/crafts';
import { EVENTS } from '../../data/events';
import { ALL_NPCS } from '../../data/npcs';
import { PRIORITY_SCOPE_REQUIREMENTS } from '../../data/priorityScope';
import { REGIONS } from '../../data/regions';
import { RESOURCES } from '../../data/resources';
import { createInitialState, gameReducer, type GameContent, type GameState } from '../';

const content: GameContent = {
  crafts: CRAFTS,
  apprentices: STARTING_APPRENTICES,
  events: EVENTS,
  regions: REGIONS,
  achievements: ACHIEVEMENTS,
  resources: RESOURCES,
  npcs: ALL_NPCS,
};

const regionById = new Map(REGIONS.map((region) => [region.id, region]));
const npcById = new Map(ALL_NPCS.map((npc) => [npc.id, npc]));

function reportReadyState(regionId: string): GameState {
  const base = createInitialState(CRAFTS, STARTING_APPRENTICES, 20260614, undefined, REGIONS);

  return {
    ...base,
    turn: base.maxTurns,
    currentRegion: regionId,
    currentSubregion: regionById.get(regionId)?.subregions[0]?.id ?? regionId,
    unlockedRegions: [...new Set([...base.unlockedRegions, regionId])],
    regionReputation: { [regionId]: 85 },
    pendingEvent: null,
    pendingEscortCrisis: null,
    pendingSupplyCrisis: null,
    pendingActivityStallClosing: null,
  };
}

function finishReport(state: GameState): GameState {
  return gameReducer(state, { type: 'END_TURN' }, content);
}

describe('priority ending report flow', () => {
  it('emits a regional ending echo for every current-priority region', () => {
    for (const requirement of PRIORITY_SCOPE_REQUIREMENTS) {
      const region = regionById.get(requirement.regionId);
      expect(region, requirement.regionId).toBeTruthy();
      expect(region?.ending?.pillar, requirement.regionId).toBeTruthy();
      if (!region?.ending) continue;

      const ended = finishReport(reportReadyState(requirement.regionId));

      expect(ended.status, requirement.regionId).toBe('ended');
      expect(ended.report?.regionalOutcomes?.length, requirement.regionId).toBe(1);
      expect(ended.report?.regionalOutcomes?.[0], requirement.regionId).toContain(`【${region.name}】`);
      expect(ended.report?.regionalOutcomes?.[0], requirement.regionId).toContain(region.ending.pillar);
    }
  });

  it('emits relationship ending echoes for required priority NPCs', () => {
    const requiredNpcIds = [...new Set(PRIORITY_SCOPE_REQUIREMENTS.flatMap((entry) => entry.requiredNpcIds))];

    for (const npcId of requiredNpcIds) {
      const npc = npcById.get(npcId);
      expect(npc, npcId).toBeTruthy();
      expect(npc?.endingInfluence, npcId).toBeTruthy();
      if (!npc?.endingInfluence) continue;

      const ended = finishReport({
        ...reportReadyState(npc.regionId),
        npcAffinity: { [npcId]: 70 },
      });

      const relationshipOutcomes = ended.report?.relationshipOutcomes ?? [];
      expect(ended.status, npcId).toBe('ended');
      expect(relationshipOutcomes.length, npcId).toBeGreaterThanOrEqual(1);
      expect(relationshipOutcomes[0], npcId).toContain(npc.name);
      expect(relationshipOutcomes[0], npcId).toContain(npc.endingInfluence);
    }
  });
});
