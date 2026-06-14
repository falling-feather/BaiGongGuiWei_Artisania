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
import { PRIORITY_SCOPE_REQUIREMENTS } from '../../data/priorityScope';
import { REGION_ACTIVITIES, REGION_CONTENT } from '../../data/regionContent';
import { REGIONS } from '../../data/regions';
import { RESOURCES } from '../../data/resources';
import { SUBREGION_CONTENT } from '../../data/subregionContent';
import { WORKSHOP_UPGRADES } from '../../data/workshopUpgrades';
import { buildPriorityScopeAudit, createInitialState, type GameContent, type GameState } from '../';

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

function freshState(): GameState {
  return createInitialState(CRAFTS, STARTING_APPRENTICES, 20260614, undefined, REGIONS);
}

function completeJiangnanMainline(state: GameState): GameState {
  return {
    ...state,
    flags: [...state.flags, 'stall-chain-completed:jn-qinhuai-lantern'],
    crafts: state.crafts.map((craft) =>
      craft.craftId === 'longquan-sword' ? { ...craft, produced: Math.max(1, craft.produced) } : craft,
    ),
  };
}

describe('priority scope audit', () => {
  it('summarizes current-priority mainline progress and scoped content readiness', () => {
    const audit = buildPriorityScopeAudit(freshState(), PRIORITY_JOURNEY_STEPS, PRIORITY_SCOPE_REQUIREMENTS, content);

    expect(audit.totalSteps).toBe(5);
    expect(audit.totalMilestones).toBe(11);
    expect(audit.completedSteps).toBe(0);
    expect(audit.completedMilestones).toBe(0);
    expect(audit.readyAnchorRegions).toBe(5);
    expect(audit.readySkeletonRegions).toBe(6);
    expect(audit.journeySteps[0]).toMatchObject({
      id: 'journey-jiangnan',
      active: true,
      complete: false,
      completedMilestones: 0,
      totalMilestones: 2,
    });
    expect(audit.requirements.every((row) => row.ready)).toBe(true);
  });

  it('marks the next anchor region active after Jiangnan craft and lantern milestones complete', () => {
    const audit = buildPriorityScopeAudit(
      completeJiangnanMainline(freshState()),
      PRIORITY_JOURNEY_STEPS,
      PRIORITY_SCOPE_REQUIREMENTS,
      content,
    );

    expect(audit.completedSteps).toBe(1);
    expect(audit.completedMilestones).toBe(2);
    expect(audit.journeySteps[0]).toMatchObject({ id: 'journey-jiangnan', complete: true, active: false });
    expect(audit.journeySteps[1]).toMatchObject({ id: 'journey-bashu', complete: false, active: true });
  });

  it('reports scoped content gaps with stable ids', () => {
    const brokenContent: GameContent = {
      ...content,
      crafts: content.crafts.filter((craft) => craft.id !== 'jade-carving'),
    };
    const audit = buildPriorityScopeAudit(
      freshState(),
      PRIORITY_JOURNEY_STEPS,
      PRIORITY_SCOPE_REQUIREMENTS,
      brokenContent,
    );

    const xiyu = audit.requirements.find((row) => row.regionId === 'xiyu');
    expect(xiyu?.ready).toBe(false);
    expect(xiyu?.missing).toContain('craft:jade-carving');
  });
});
