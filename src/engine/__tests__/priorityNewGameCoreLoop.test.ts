import { describe, expect, it } from 'vitest';
import { ACHIEVEMENTS } from '../../data/achievements';
import { STARTING_APPRENTICES } from '../../data/apprentices';
import { CRAFTS } from '../../data/crafts';
import { CRAFT_INTERACTIONS } from '../../data/craftInteractions';
import { EVENTS } from '../../data/events';
import { INDUSTRIES } from '../../data/industries';
import { ITEM_DESCRIPTOR_RULES } from '../../data/itemDescriptors';
import { LORE_ENTRIES } from '../../data/loreEntries';
import { ALL_NPCS } from '../../data/npcs';
import { PRIORITY_JOURNEY_STEPS } from '../../data/priorityJourney';
import { REGION_ACTIVITIES, REGION_CONTENT } from '../../data/regionContent';
import { REGIONS } from '../../data/regions';
import { RESOURCES } from '../../data/resources';
import { SUBREGION_CONTENT } from '../../data/subregionContent';
import { WORKSHOP_UPGRADES } from '../../data/workshopUpgrades';
import { buildPriorityJourneyGuide, createInitialState, gameReducer, uniqueRoutesFromRegions, type GameContent } from '../';

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

const quietContent: GameContent = { ...content, events: [] };
const routes = uniqueRoutesFromRegions(REGION_CONTENT);

function guideFor(state: ReturnType<typeof createInitialState>) {
  return buildPriorityJourneyGuide(state, PRIORITY_JOURNEY_STEPS, LORE_ENTRIES, REGIONS, routes);
}

describe('priority new game core loop', () => {
  it('runs a fresh Jiangnan save through gathering, refining, crafting and selling', () => {
    let state = createInitialState(CRAFTS, STARTING_APPRENTICES, 20260614, undefined, REGIONS);

    expect(state.currentRegion).toBe('jiangnan');
    expect(state.currentSubregion).toBe('jiangnan-suhang');
    expect(guideFor(state)?.milestone?.ids).toContain('longquan-sword');

    state = gameReducer(state, { type: 'TRAVEL_SUBREGION', subregionId: 'jiangnan-longquan' }, content);
    expect(state.currentSubregion).toBe('jiangnan-longquan');

    state = gameReducer(state, { type: 'GATHER_RESOURCE', industryId: 'harvest-iron-ore', quality: 0.92 }, content);
    expect(state.resources.ironOre).toBeGreaterThanOrEqual(2);

    state = gameReducer(state, { type: 'GATHER_RESOURCE', industryId: 'harvest-coal', quality: 0.92 }, content);
    expect(state.resources.coal).toBeGreaterThanOrEqual(2);

    state = gameReducer(state, { type: 'GATHER_RESOURCE', industryId: 'smelt-iron', quality: 0.9 }, content);
    expect(state.resources.ironIngot).toBeGreaterThanOrEqual(1);

    state = gameReducer(state, { type: 'END_TURN' }, quietContent);
    expect(state.turn).toBe(2);
    expect(state.pendingEvent).toBeNull();
    expect(state.resources.labor).toBeGreaterThanOrEqual(5);

    const coinBeforeCraft = state.resources.coin ?? 0;
    const producedBefore = state.crafts.find((craft) => craft.craftId === 'longquan-sword')?.produced ?? 0;
    state = gameReducer(state, { type: 'RUN_PROCESS', craftId: 'longquan-sword', skipStepIds: [] }, content);

    const sword = state.itemInstances.find((item) => item.resourceId === 'treasureSword');
    expect(sword).toBeTruthy();
    expect(state.crafts.find((craft) => craft.craftId === 'longquan-sword')?.produced).toBe(producedBefore + 1);
    expect(state.resources.treasureSword).toBeGreaterThanOrEqual(1);
    expect(guideFor(state)?.milestone?.activityId).toBe('jn-qinhuai-lantern');

    state = gameReducer(state, { type: 'SELL_ITEM', itemId: sword!.id }, content);

    const sold = state.itemInstances.find((item) => item.id === sword!.id);
    expect(sold?.status).toBe('sold');
    expect(sold?.soldForCoin).toBeGreaterThan(0);
    expect(state.resources.coin ?? 0).toBeGreaterThan(coinBeforeCraft);
    expect(state.resources.treasureSword ?? 0).toBe(0);
    expect(state.flags).toContain('item-sold');
    expect(state.flags).toContain('item-sold:treasureSword');
  });
});
