import { describe, expect, it } from 'vitest';
import {
  REAL_TIME_COOLDOWN_MS,
  createInitialState,
  gameReducer,
  realTimeCooldownKey,
  type GameContent,
} from '../';
import { ACHIEVEMENTS } from '../../data/achievements';
import { STARTING_APPRENTICES } from '../../data/apprentices';
import { CRAFTS } from '../../data/crafts';
import { CRAFT_INTERACTIONS } from '../../data/craftInteractions';
import { EVENTS } from '../../data/events';
import { INDUSTRIES } from '../../data/industries';
import { ITEM_DESCRIPTOR_RULES } from '../../data/itemDescriptors';
import { LORE_ENTRIES } from '../../data/loreEntries';
import { ALL_NPCS } from '../../data/npcs';
import { REGION_ACTIVITIES, REGION_CONTENT } from '../../data/regionContent';
import { REGIONS } from '../../data/regions';
import { RESOURCES } from '../../data/resources';
import { SUBREGION_CONTENT } from '../../data/subregionContent';
import { WORKSHOP_UPGRADES } from '../../data/workshopUpgrades';

const content: GameContent = {
  crafts: CRAFTS,
  apprentices: STARTING_APPRENTICES,
  events: EVENTS,
  industries: INDUSTRIES,
  regions: REGIONS,
  achievements: ACHIEVEMENTS,
  resources: RESOURCES,
  npcs: ALL_NPCS,
  activities: REGION_ACTIVITIES,
  regionContent: REGION_CONTENT,
  subregionContent: SUBREGION_CONTENT,
  craftInteractions: CRAFT_INTERACTIONS,
  workshopUpgrades: WORKSHOP_UPGRADES,
  itemDescriptorRules: ITEM_DESCRIPTOR_RULES,
  loreEntries: LORE_ENTRIES,
};

function freshState() {
  return createInitialState(CRAFTS, STARTING_APPRENTICES, 20260617, undefined, REGIONS);
}

describe('real-time cooldowns', () => {
  it('blocks repeated harvest actions until the 10-minute real-time cooldown expires', () => {
    const start = new Date(2026, 5, 17, 9, 0, 0).getTime();
    let state = gameReducer(
      freshState(),
      { type: 'TRAVEL_SUBREGION', subregionId: 'jiangnan-longquan' },
      content,
    );

    state = gameReducer(
      state,
      { type: 'GATHER_RESOURCE', industryId: 'harvest-iron-ore', quality: 0.92, now: start },
      content,
    );
    const key = realTimeCooldownKey('industry', 'harvest-iron-ore');
    const ironAfterFirst = state.resources.ironOre ?? 0;

    expect(ironAfterFirst).toBeGreaterThan(0);
    expect(state.realTime.cooldowns[key]?.readyAt).toBe(start + REAL_TIME_COOLDOWN_MS.industryHarvest);

    const blocked = gameReducer(
      state,
      { type: 'GATHER_RESOURCE', industryId: 'harvest-iron-ore', quality: 0.92, now: start + 60_000 },
      content,
    );
    expect(blocked.resources.ironOre).toBe(ironAfterFirst);
    expect(blocked.log[0]).toContain('等待');

    const ready = gameReducer(
      blocked,
      {
        type: 'GATHER_RESOURCE',
        industryId: 'harvest-iron-ore',
        quality: 0.92,
        now: start + REAL_TIME_COOLDOWN_MS.industryHarvest + 1_000,
      },
      content,
    );
    expect(ready.resources.ironOre).toBeGreaterThan(ironAfterFirst);
  });

  it('allows regular NPC talk once per real-world date', () => {
    const firstTalkAt = new Date(2026, 5, 17, 10, 0, 0).getTime();
    const nextDayAt = new Date(2026, 5, 18, 9, 0, 0).getTime();
    const npcId = 'jn-ning-ciqiu';

    const first = gameReducer(
      freshState(),
      { type: 'TALK_NPC', npcId, now: firstTalkAt },
      content,
    );
    const affinityAfterFirst = first.npcAffinity[npcId] ?? 0;
    expect(affinityAfterFirst).toBeGreaterThan(0);

    const blocked = gameReducer(
      first,
      { type: 'TALK_NPC', npcId, now: firstTalkAt + 2 * 60 * 60_000 },
      content,
    );
    expect(blocked.npcAffinity[npcId]).toBe(affinityAfterFirst);
    expect(blocked.log[0]).toContain('今日已经');

    const nextDay = gameReducer(
      blocked,
      { type: 'TALK_NPC', npcId, now: nextDayAt },
      content,
    );
    expect(nextDay.npcAffinity[npcId]).toBeGreaterThan(affinityAfterFirst);
  });
});
