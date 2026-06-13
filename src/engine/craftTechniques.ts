import type {
  CraftInteractionSpec,
  CraftInteractionStage,
  CraftFocusCheckChoiceId,
  CraftFocusCheckRecord,
  CraftFocusCheckSelection,
  CraftStageOutcome,
  CraftStageOutcomeResult,
  CraftTechniqueChoiceId,
  CraftTechniqueRecord,
  CraftTechniqueSelection,
  ItemQualityDimension,
  Metrics,
} from './types';

export interface CraftTechniqueOption {
  id: CraftTechniqueChoiceId;
  label: string;
  shortLabel: string;
  desc: string;
  laborDelta: number;
  qualityDelta: number;
  dimensionDelta: number;
  metricDelta: Partial<Metrics>;
}

export interface CraftTechniquePlan {
  records: CraftTechniqueRecord[];
  stageOutcomes: CraftStageOutcome[];
  laborDelta: number;
  qualityDelta: number;
  dimensionDelta: Partial<Record<ItemQualityDimension, number>>;
  metricDelta: Partial<Metrics>;
}

export interface CraftFocusCheckOption {
  id: CraftFocusCheckChoiceId;
  label: string;
  shortLabel: string;
  desc: string;
  qualityDelta: number;
  dimensionDelta: number;
  controlDelta: number;
  riskDelta: number;
  result: CraftFocusCheckRecord['result'];
  metricDelta: Partial<Metrics>;
}

export interface CraftFocusCheckPlan {
  records: CraftFocusCheckRecord[];
  qualityDelta: number;
  dimensionDelta: Partial<Record<ItemQualityDimension, number>>;
  metricDelta: Partial<Metrics>;
}

export const DEFAULT_CRAFT_TECHNIQUE_CHOICE: CraftTechniqueChoiceId = 'balanced';
export const DEFAULT_CRAFT_FOCUS_CHECK_CHOICE: CraftFocusCheckChoiceId = 'observe';

export const CRAFT_TECHNIQUE_OPTIONS: CraftTechniqueOption[] = [
  {
    id: 'careful',
    label: '稳手细作',
    shortLabel: '稳',
    desc: '多耗 1 工时，提升本工序焦点维度，适合压住重缺陷风险。',
    laborDelta: 1,
    qualityDelta: 0.025,
    dimensionDelta: 0.06,
    metricDelta: { heritage: 1, spirit: 1 },
  },
  {
    id: 'balanced',
    label: '平衡推进',
    shortLabel: '平',
    desc: '按常规节奏完成，不额外改变工时、品质或风险。',
    laborDelta: 0,
    qualityDelta: 0,
    dimensionDelta: 0,
    metricDelta: {},
  },
  {
    id: 'rushed',
    label: '赶工压时',
    shortLabel: '赶',
    desc: '少耗 1 工时，但压低本工序焦点维度，容易把隐患带进成品。',
    laborDelta: -1,
    qualityDelta: -0.035,
    dimensionDelta: -0.08,
    metricDelta: { heritage: -1, spirit: -1, market: 1 },
  },
];

export const CRAFT_FOCUS_CHECK_OPTIONS: CraftFocusCheckOption[] = [
  {
    id: 'observe',
    label: '察火候',
    shortLabel: '察',
    desc: '先看火候、料性或线势，略稳控制并压低风险。',
    qualityDelta: 0.008,
    dimensionDelta: 0.015,
    controlDelta: 0.05,
    riskDelta: -0.06,
    result: 'settled',
    metricDelta: { heritage: 1 },
  },
  {
    id: 'align',
    label: '卡准点',
    shortLabel: '准',
    desc: '抓准下手窗口，提升本段焦点维度与现场控制。',
    qualityDelta: 0.018,
    dimensionDelta: 0.035,
    controlDelta: 0.08,
    riskDelta: -0.02,
    result: 'precise',
    metricDelta: { heritage: 1, spirit: 1 },
  },
  {
    id: 'press',
    label: '压线抢手',
    shortLabel: '抢',
    desc: '抢在窗口边缘下手，品质潜力更高，但更容易留下临门风险。',
    qualityDelta: 0.028,
    dimensionDelta: 0.045,
    controlDelta: -0.05,
    riskDelta: 0.12,
    result: 'strained',
    metricDelta: { market: 1, spirit: -1 },
  },
];

export function craftTechniqueOption(choiceId?: string): CraftTechniqueOption {
  return (
    CRAFT_TECHNIQUE_OPTIONS.find((option) => option.id === choiceId) ??
    CRAFT_TECHNIQUE_OPTIONS.find((option) => option.id === DEFAULT_CRAFT_TECHNIQUE_CHOICE)!
  );
}

export function craftFocusCheckOption(choiceId?: string): CraftFocusCheckOption {
  return (
    CRAFT_FOCUS_CHECK_OPTIONS.find((option) => option.id === choiceId) ??
    CRAFT_FOCUS_CHECK_OPTIONS.find((option) => option.id === DEFAULT_CRAFT_FOCUS_CHECK_CHOICE)!
  );
}

export function activeTechniqueStages(
  spec: CraftInteractionSpec | null | undefined,
  activeProcessStepIds: Iterable<string>,
): CraftInteractionStage[] {
  if (!spec) return [];
  const active = new Set(activeProcessStepIds);
  return spec.stages.filter((stage) => stage.processStepIds.some((stepId) => active.has(stepId)));
}

function stageOutcomeScores(choiceId: CraftTechniqueChoiceId): {
  controlScore: number;
  riskScore: number;
  result: CraftStageOutcomeResult;
} {
  if (choiceId === 'careful') return { controlScore: 0.86, riskScore: 0.14, result: 'steady' };
  if (choiceId === 'rushed') return { controlScore: 0.42, riskScore: 0.72, result: 'risky' };
  return { controlScore: 0.64, riskScore: 0.34, result: 'standard' };
}

export function craftTechniquePlan(
  spec: CraftInteractionSpec | null | undefined,
  selections: CraftTechniqueSelection[] | undefined,
  activeProcessStepIds: Iterable<string>,
): CraftTechniquePlan {
  const stages = activeTechniqueStages(spec, activeProcessStepIds);
  const selected = new Map((selections ?? []).map((selection) => [selection.stageId, selection.choiceId]));
  const stageOutcomes = stages.map((stage) => {
    const option = craftTechniqueOption(selected.get(stage.id));
    const dimensionDelta = Object.fromEntries(
      stage.focusDimensions.map((dimension) => [dimension, option.dimensionDelta]),
    ) as Partial<Record<ItemQualityDimension, number>>;
    return {
      stageId: stage.id,
      stageName: stage.name,
      choiceId: option.id,
      choiceLabel: option.label,
      laborDelta: option.laborDelta,
      qualityDelta: option.qualityDelta,
      dimensionDelta,
      focusDimensions: [...stage.focusDimensions],
      sourceStepIds: [...stage.processStepIds],
      ...stageOutcomeScores(option.id),
      resultText:
        option.id === 'careful'
          ? stage.successText
          : option.id === 'rushed'
            ? stage.failureText
            : stage.playerAction,
    };
  });
  const records: CraftTechniqueRecord[] = stageOutcomes.map(
    ({ focusDimensions, sourceStepIds, controlScore, riskScore, result, ...record }) => record,
  );

  const dimensionDelta: Partial<Record<ItemQualityDimension, number>> = {};
  const metricDelta: Partial<Metrics> = {};
  let laborDelta = 0;
  let qualityDelta = 0;
  for (const record of records) {
    laborDelta += record.laborDelta;
    qualityDelta += record.qualityDelta;
    for (const [dimension, delta] of Object.entries(record.dimensionDelta) as [ItemQualityDimension, number][]) {
      dimensionDelta[dimension] = (dimensionDelta[dimension] ?? 0) + delta;
    }
    const option = craftTechniqueOption(record.choiceId);
    for (const [metric, delta] of Object.entries(option.metricDelta) as [keyof Metrics, number][]) {
      metricDelta[metric] = (metricDelta[metric] ?? 0) + delta;
    }
  }

  return { records, stageOutcomes, laborDelta, qualityDelta, dimensionDelta, metricDelta };
}

function focusCheckResultText(stage: CraftInteractionStage, option: CraftFocusCheckOption): string {
  if (option.id === 'observe') return `先察「${stage.name}」的火候与料性，等气口稳住再下手。`;
  if (option.id === 'align') return `在「${stage.name}」抓准下手窗口，按准点推进。`;
  return `在「${stage.name}」压着窗口边缘抢手，留出更高成色但风险随之上扬。`;
}

export function craftFocusCheckPlan(
  spec: CraftInteractionSpec | null | undefined,
  selections: CraftFocusCheckSelection[] | undefined,
  activeProcessStepIds: Iterable<string>,
): CraftFocusCheckPlan {
  const selected = new Map((selections ?? []).map((selection) => [selection.stageId, selection.choiceId]));
  const stages = activeTechniqueStages(spec, activeProcessStepIds).filter((stage) => selected.has(stage.id));
  const records: CraftFocusCheckRecord[] = stages.map((stage) => {
    const option = craftFocusCheckOption(selected.get(stage.id));
    const dimensionDelta = Object.fromEntries(
      stage.focusDimensions.map((dimension) => [dimension, option.dimensionDelta]),
    ) as Partial<Record<ItemQualityDimension, number>>;
    return {
      stageId: stage.id,
      stageName: stage.name,
      choiceId: option.id,
      choiceLabel: option.label,
      qualityDelta: option.qualityDelta,
      dimensionDelta,
      controlDelta: option.controlDelta,
      riskDelta: option.riskDelta,
      result: option.result,
      resultText: focusCheckResultText(stage, option),
    };
  });

  const dimensionDelta: Partial<Record<ItemQualityDimension, number>> = {};
  const metricDelta: Partial<Metrics> = {};
  let qualityDelta = 0;
  for (const record of records) {
    qualityDelta += record.qualityDelta;
    for (const [dimension, delta] of Object.entries(record.dimensionDelta) as [ItemQualityDimension, number][]) {
      dimensionDelta[dimension] = (dimensionDelta[dimension] ?? 0) + delta;
    }
    const option = craftFocusCheckOption(record.choiceId);
    for (const [metric, delta] of Object.entries(option.metricDelta) as [keyof Metrics, number][]) {
      metricDelta[metric] = (metricDelta[metric] ?? 0) + delta;
    }
  }

  return { records, qualityDelta, dimensionDelta, metricDelta };
}
