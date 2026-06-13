import { buildLoreTravelGuide, type LoreTravelGuide } from './loreGuide';
import type { GameState, LoreEntry, RegionDef, RouteSpec } from './types';

export type PriorityJourneyMilestoneKind =
  | 'anyCraftProduced'
  | 'allCraftProduced'
  | 'flags'
  | 'completedActivities'
  | 'completedQuests';

export interface PriorityJourneyMilestone {
  id: string;
  label: string;
  kind: PriorityJourneyMilestoneKind;
  ids: string[];
  targetLoreEntryId: string;
  activityId?: string;
  hint: string;
}

export interface PriorityJourneyStep {
  id: string;
  regionId: string;
  title: string;
  summary: string;
  milestones: PriorityJourneyMilestone[];
}

export interface PriorityJourneyGuide {
  status: 'active' | 'complete';
  step: PriorityJourneyStep | null;
  milestone: PriorityJourneyMilestone | null;
  stepIndex: number;
  milestoneIndex: number;
  totalSteps: number;
  completedStepIds: string[];
  completedMilestoneIds: string[];
  headline: string;
  instruction: string;
  detail: string;
  travelGuide: LoreTravelGuide | null;
}

function hasProducedCraft(state: GameState, craftId: string): boolean {
  return (state.crafts.find((craft) => craft.craftId === craftId)?.produced ?? 0) > 0;
}

function hasAll(values: readonly string[], id: string): boolean {
  return values.includes(id);
}

export function isPriorityJourneyMilestoneComplete(
  state: GameState,
  milestone: PriorityJourneyMilestone,
): boolean {
  switch (milestone.kind) {
    case 'anyCraftProduced':
      return milestone.ids.some((craftId) => hasProducedCraft(state, craftId));
    case 'allCraftProduced':
      return milestone.ids.every((craftId) => hasProducedCraft(state, craftId));
    case 'flags':
      return milestone.ids.every((flag) => hasAll(state.flags, flag));
    case 'completedActivities':
      return milestone.ids.every((activityId) => hasAll(state.completedActivities, activityId));
    case 'completedQuests':
      return milestone.ids.every((questId) => hasAll(state.completedQuests, questId));
    default:
      return false;
  }
}

export function isPriorityJourneyStepComplete(state: GameState, step: PriorityJourneyStep): boolean {
  return step.milestones.every((milestone) => isPriorityJourneyMilestoneComplete(state, milestone));
}

export function buildPriorityJourneyGuide(
  state: GameState,
  steps: readonly PriorityJourneyStep[],
  loreEntries: readonly LoreEntry[],
  regions: readonly RegionDef[],
  routes: readonly RouteSpec[],
): PriorityJourneyGuide | null {
  if (steps.length === 0) return null;

  const completedStepIds = steps
    .filter((step) => isPriorityJourneyStepComplete(state, step))
    .map((step) => step.id);
  const completedMilestoneIds = steps.flatMap((step) =>
    step.milestones
      .filter((milestone) => isPriorityJourneyMilestoneComplete(state, milestone))
      .map((milestone) => milestone.id),
  );

  const stepIndex = steps.findIndex((step) => !isPriorityJourneyStepComplete(state, step));
  if (stepIndex === -1) {
    return {
      status: 'complete',
      step: null,
      milestone: null,
      stepIndex: steps.length,
      milestoneIndex: 0,
      totalSteps: steps.length,
      completedStepIds,
      completedMilestoneIds,
      headline: '当前优先版主轴已跑通',
      instruction: '五个锚点地区的工艺样品与节会摊位闭环已经全部完成。',
      detail: '接下来可以集中做美术接入、位置微调、数值手感和更多支线扩展。',
      travelGuide: null,
    };
  }

  const step = steps[stepIndex];
  const milestoneIndex = step.milestones.findIndex(
    (milestone) => !isPriorityJourneyMilestoneComplete(state, milestone),
  );
  const milestone = step.milestones[milestoneIndex] ?? step.milestones[0];
  const targetEntry = loreEntries.find((entry) => entry.id === milestone.targetLoreEntryId);
  const travelGuide = buildLoreTravelGuide(state, targetEntry, regions, routes);
  const instruction = travelGuide && !travelGuide.isAtTarget ? travelGuide.instruction : milestone.hint;
  const detail = travelGuide && !travelGuide.isAtTarget ? travelGuide.detail : step.summary;

  return {
    status: 'active',
    step,
    milestone,
    stepIndex,
    milestoneIndex,
    totalSteps: steps.length,
    completedStepIds,
    completedMilestoneIds,
    headline: `${step.title} (${milestoneIndex + 1}/${step.milestones.length})`,
    instruction,
    detail,
    travelGuide,
  };
}
