import { describe, expect, it } from 'vitest';
import {
  buildPriorityJourneyGuide,
  isPriorityJourneyMilestoneComplete,
  uniqueRoutesFromRegions,
} from '../';
import { createInitialState } from '../state';
import type { GameState } from '../types';
import { STARTING_APPRENTICES } from '../../data/apprentices';
import { CRAFTS } from '../../data/crafts';
import { LORE_ENTRIES } from '../../data/loreEntries';
import { PRIORITY_JOURNEY_STEPS } from '../../data/priorityJourney';
import { REGION_CONTENT } from '../../data/regionContent';
import { REGIONS } from '../../data/regions';

const routes = uniqueRoutesFromRegions(REGION_CONTENT);

function freshState(): GameState {
  return createInitialState(CRAFTS, STARTING_APPRENTICES, 20260614, undefined, REGIONS);
}

function withCraftProduced(state: GameState, craftId: string): GameState {
  return {
    ...state,
    crafts: state.crafts.map((craft) =>
      craft.craftId === craftId ? { ...craft, produced: Math.max(1, craft.produced) } : craft,
    ),
  };
}

function withFlags(state: GameState, flags: string[]): GameState {
  return {
    ...state,
    flags: [...new Set([...state.flags, ...flags])],
  };
}

function withCompletedActivities(state: GameState, activityIds: string[]): GameState {
  return {
    ...state,
    completedActivities: [...new Set([...state.completedActivities, ...activityIds])],
  };
}

function guideFor(state: GameState) {
  return buildPriorityJourneyGuide(state, PRIORITY_JOURNEY_STEPS, LORE_ENTRIES, REGIONS, routes);
}

describe('priority journey guide', () => {
  it('starts on the Jiangnan craft sample milestone', () => {
    const guide = guideFor(freshState());

    expect(guide?.status).toBe('active');
    expect(guide?.step?.id).toBe('journey-jiangnan');
    expect(guide?.milestone?.id).toBe('journey-jiangnan-craft-sample');
    expect(guide?.travelGuide?.targetSubregionId).toBe('jiangnan-longquan');
  });

  it('moves within a step after the first Jiangnan craft is produced', () => {
    const guide = guideFor(withCraftProduced(freshState(), 'longquan-sword'));

    expect(guide?.step?.id).toBe('journey-jiangnan');
    expect(guide?.milestone?.id).toBe('journey-jiangnan-qinhuai-stall');
    expect(guide?.travelGuide?.targetSubregionId).toBe('jiangnan-jinling');
  });

  it('moves to the next region only after the anchor festival closes', () => {
    const state = withFlags(withCraftProduced(freshState(), 'longquan-sword'), [
      'stall-closing-resolved:jn-qinhuai-lantern',
    ]);
    const guide = guideFor(state);

    expect(guide?.step?.id).toBe('journey-bashu');
    expect(guide?.milestone?.id).toBe('journey-bashu-craft-sample');
    expect(guide?.travelGuide?.targetRegionId).toBe('bashu');
  });

  it('treats each milestone kind as a concrete completion condition', () => {
    const state = withFlags(withCraftProduced(freshState(), 'shu-brocade'), [
      'stall-closing-resolved:bs-tea-horse-post',
    ]);
    const bashuStep = PRIORITY_JOURNEY_STEPS.find((step) => step.id === 'journey-bashu')!;

    expect(isPriorityJourneyMilestoneComplete(state, bashuStep.milestones[0])).toBe(true);
    expect(isPriorityJourneyMilestoneComplete(state, bashuStep.milestones[1])).toBe(true);
  });

  it('returns a complete guide after all priority milestones are satisfied', () => {
    let state = freshState();
    for (const craftId of ['longquan-sword', 'shu-brocade', 'gambiered-silk', 'jingdezhen-porcelain', 'jade-carving']) {
      state = withCraftProduced(state, craftId);
    }
    state = withFlags(state, [
      'stall-closing-resolved:jn-qinhuai-lantern',
      'stall-closing-resolved:bs-tea-horse-post',
      'stall-closing-resolved:ln-qilou-night-market',
      'stall-closing-resolved:gp-kiln-opening-fair',
      'stall-closing-resolved:xiyu-bazaar-trade',
    ]);
    state = withCompletedActivities(state, ['xiyu-caravan-post']);

    const guide = guideFor(state);

    expect(guide?.status).toBe('complete');
    expect(guide?.step).toBeNull();
    expect(guide?.completedStepIds).toHaveLength(PRIORITY_JOURNEY_STEPS.length);
  });

  it('keeps Xiyu active after the bazaar until the caravan post route is confirmed', () => {
    let state = freshState();
    for (const craftId of ['longquan-sword', 'shu-brocade', 'gambiered-silk', 'jingdezhen-porcelain', 'jade-carving']) {
      state = withCraftProduced(state, craftId);
    }
    state = withFlags(state, [
      'stall-closing-resolved:jn-qinhuai-lantern',
      'stall-closing-resolved:bs-tea-horse-post',
      'stall-closing-resolved:ln-qilou-night-market',
      'stall-closing-resolved:gp-kiln-opening-fair',
      'stall-closing-resolved:xiyu-bazaar-trade',
    ]);

    const beforeCaravan = guideFor(state);

    expect(beforeCaravan?.status).toBe('active');
    expect(beforeCaravan?.step?.id).toBe('journey-xiyu');
    expect(beforeCaravan?.milestone?.id).toBe('journey-xiyu-caravan-route');
    expect(beforeCaravan?.travelGuide?.targetSubregionId).toBe('xiyu-caravan-post');

    const afterCaravan = guideFor(withCompletedActivities(state, ['xiyu-caravan-post']));

    expect(afterCaravan?.status).toBe('complete');
  });
});
