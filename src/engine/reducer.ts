/**
 * 核心状态机 —— 游戏的全部规则都在这里，且只在这里。
 * gameReducer 是纯函数：(state, action, content) => newState，不产生任何副作用。
 * UI 只负责「派发 action + 渲染 state」，永远不直接改规则。
 */
import type {
  GameState,
  GameAction,
  Craft,
  Apprentice,
  GameEvent,
  Metrics,
  GameEffect,
  CraftState,
  GameReport,
  ResourcePool,
  IndustryDef,
  RegionDef,
  AchievementDef,
  StoryBeat,
  ResourceDef,
  NpcDef,
  QuestDef,
  PlayerAttributeKey,
  PlayerProfile,
  NpcRuntimeState,
  RelationshipStage,
  TimePhase,
  GameWeather,
  Season,
  CropId,
  ActivityDef,
  ItemDescriptorRule,
  ItemInstance,
  PlayerAttributes,
  RegionContentSpec,
  SubregionContentSpec,
  RouteSpec,
  NpcFunctionKind,
  ActiveOrder,
  EscortCrisisChoiceDef,
  EscortEncounterDef,
  EscortEncounterOutcomeDef,
  PendingEscortCrisis,
  PendingSupplyCrisis,
  NightMarketStallRecord,
  SupplyCrisisChoiceId,
  SupplyCrisisRecord,
  CollabRecipeDef,
  CollabRecipeChoiceDef,
  HomeVisitDef,
  HomeVisitChoiceDef,
  HomeVisitReferralOrderDef,
  LoreEntry,
  ActivityStallComboDef,
  ActivityStallCustomerDef,
  ActivityStallClosingChoiceDef,
  ActivityStallDef,
  ActivityStallStageDef,
  ActivityStallStrategyDef,
  PendingActivityStallClosing,
  CraftFocusCheckRecord,
  CraftFocusCheckSelection,
  CraftInteractionSpec,
  CraftMentorIntervention,
  CraftRepairOptionDef,
  CraftStageOutcome,
  CraftTechniqueRecord,
  CraftTechniqueSelection,
  ItemDefect,
  ItemQualityDimension,
  WorkshopUpgradeDef,
} from './types';
import { applyDelta, aggregateTownMetrics, METRIC_KEYS, METRIC_LABELS } from './metrics';
import { createCalendar, createInitialState, LABOR_PER_TURN, titleForRank } from './state';
import { createRng, weightedPick } from './rng';
import { NPC_FUNCTION_LABELS, npcFunctionNeedsItem, npcFunctionRequirement } from './npcFunctions';
import { routeCostWithIntel, routeIntelDiscount, routeIntelKnown } from './routeCosts';
import { addRegionReputation, regionReputationLabel, regionReputationOf } from './regionReputation';
import { addRouteStability, routeRiskLabel, routeRiskScore, routeStabilityOf } from './routeStability';
import { craftFocusCheckPlan, craftTechniquePlan } from './craftTechniques';
import { isLoreEntryUnlocked } from './lore';

/** reducer 运行所需的内容包（由 store 层从 data 注入） */
export interface GameContent {
  crafts: Craft[];
  apprentices: Apprentice[];
  events: GameEvent[];
  /** 基础产业（可选，地区优先世界用） */
  industries?: IndustryDef[];
  /** 地区档案（可选，地区优先世界用） */
  regions?: RegionDef[];
  /** 成就定义（可选） */
  achievements?: AchievementDef[];
  /** 剧情节点（可选） */
  story?: StoryBeat[];
  /** 资源词典（可选，仅用于日志/展示的名称查找） */
  resources?: ResourceDef[];
  /** NPC 目录（可选，街市人物系统用） */
  npcs?: NpcDef[];
  /** 任务定义（可选，街市人物系统用） */
  quests?: QuestDef[];
  /** 逐地区内容活动（非工艺生活/商贸/修习/节令点） */
  activities?: ActivityDef[];
  /** 逐地区内容总览（路线、主 NPC、活动 id，全局剧情/任务数据库入口） */
  regionContent?: RegionContentSpec[];
  subregionContent?: SubregionContentSpec[];
  /** 护商事件链：按路线、护商次数和品质结算成功/失败分支 */
  escortEncounters?: EscortEncounterDef[];
  /** NPC 专属联作工序：交材料、改风格、写入人物工艺记忆 */
  collabRecipes?: CollabRecipeDef[];
  /** 百工院/珍品阁来访脚本：NPC 看陈列并留下评价、声望和人情记忆 */
  homeVisits?: HomeVisitDef[];
  /** 核心工艺交互规格：真实工序、品质维度、缺陷和返修闭环 */
  craftInteractions?: CraftInteractionSpec[];
  /** 工坊/工具/品牌升级树：为长期经营提供可购买的制作修正 */
  workshopUpgrades?: WorkshopUpgradeDef[];
  /** 隐藏数值转古风描述词的规则 */
  itemDescriptorRules?: ItemDescriptorRule[];
  /** 百工志见闻词条：由 flags、NPC knownTopics、成就和资源自动解锁 */
  loreEntries?: LoreEntry[];
}

export const BASE_WORKSHOP_CAPACITY = 1;
export const WORKSHOP_EXPANSION_CAPACITY = 1;
export const MAX_WORKSHOP_CAPACITY = 4;

export function workshopUpgradeSpaceCost(upgrade: Pick<WorkshopUpgradeDef, 'spaceCost'> | undefined): number {
  return Math.max(1, upgrade?.spaceCost ?? 1);
}

export function workshopCapacityForCraft(state: Pick<GameState, 'workshopSpaces'>, craftId: string): number {
  const record = (state.workshopSpaces ?? []).find((entry) => entry.craftId === craftId);
  return Math.max(BASE_WORKSHOP_CAPACITY, record?.capacity ?? BASE_WORKSHOP_CAPACITY);
}

export function workshopUsedSpaceForCraft(
  state: Pick<GameState, 'workshopUpgrades'>,
  content: Pick<GameContent, 'workshopUpgrades'>,
  craftId: string,
): number {
  const defs = new Map((content.workshopUpgrades ?? []).map((upgrade) => [upgrade.id, upgrade]));
  return (state.workshopUpgrades ?? [])
    .filter((record) => record.craftId === craftId)
    .reduce((sum, record) => sum + workshopUpgradeSpaceCost(defs.get(record.id)), 0);
}

export function workshopExpansionCostForCraft(state: Pick<GameState, 'workshopSpaces'>, craftId: string): ResourcePool {
  const record = (state.workshopSpaces ?? []).find((entry) => entry.craftId === craftId);
  const capacity = Math.max(BASE_WORKSHOP_CAPACITY, record?.capacity ?? BASE_WORKSHOP_CAPACITY);
  const expansions = Math.max(0, record?.expansions ?? 0);
  return { coin: 14 + capacity * 6, labor: Math.min(3, 1 + expansions) };
}

/** 解锁一个新地区的费用（文） */
const REGION_UNLOCK_COST = 30;
const ESCORT_LABOR_COST = 2;
const SPAR_LABOR_COST = 1;
const MASTERWORK_MIN_QUALITY = 0.7;
const MARKET_ORDER_MIN_QUALITY = 0.5;

/** 每回合自然补充的资源（轻量半成品回补，模拟持续供料） */
const TURN_RESOURCE_REGEN: Record<string, number> = {
  indigoVat: 2,
  bambooSplit: 2,
};

const MAX_LOG = 50;
const TIME_PHASES: TimePhase[] = ['dawn', 'morning', 'afternoon', 'dusk', 'night'];
const TIME_PHASE_LABEL: Record<TimePhase, string> = {
  dawn: '清晨',
  morning: '上午',
  afternoon: '下午',
  dusk: '黄昏',
  night: '夜间',
};
const WATER_LABOR_COST = 1;
const CROP_OUTPUT: Record<CropId, { resourceId: string; amount: number; name: string }> = {
  indigo: { resourceId: 'indigoPlant', amount: 4, name: '靛草' },
  mulberry: { resourceId: 'cocoonSilk', amount: 4, name: '桑蚕' },
  tea: { resourceId: 'teaLeaf', amount: 4, name: '茶青' },
};
const RAIN_NURTURED_OUTPUTS = new Set(['cocoonSilk', 'teaLeaf', 'indigoPlant', 'bambooRaw', 'qingtanBark']);
const SNOW_EXPOSED_OUTPUTS = new Set([
  'cocoonSilk',
  'ironOre',
  'copperOre',
  'silverOre',
  'coal',
  'kaolin',
  'teaLeaf',
  'indigoPlant',
  'bambooRaw',
  'rawLacquer',
  'pineSoot',
  'qingtanBark',
  'mineralPigment',
]);
const CROP_SEASONS: Record<CropId, Season[]> = {
  indigo: ['summer'],
  mulberry: ['spring', 'summer'],
  tea: ['spring', 'autumn'],
};

function clampStat(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function clampQuality(value: number) {
  return Math.max(0, Math.min(1, value));
}

function isHarvestIndustry(industry: IndustryDef) {
  return Object.keys(industry.input).length === 0;
}

function gatherWeatherEffect(industry: IndustryDef, weather: GameWeather) {
  if (!isHarvestIndustry(industry)) {
    return { producedBonus: 0, qualityDelta: 0, note: '' };
  }
  if (weather === 'rain' && RAIN_NURTURED_OUTPUTS.has(industry.output)) {
    return { producedBonus: 1, qualityDelta: 0.05, note: '雨水正润，采得更鲜足。' };
  }
  if (weather === 'snow' && SNOW_EXPOSED_OUTPUTS.has(industry.output)) {
    return { producedBonus: -1, qualityDelta: -0.08, note: '雪寒封野，采料量少，品相也受寒气牵制。' };
  }
  return { producedBonus: 0, qualityDelta: 0, note: '' };
}

function cropHarvestOutcome(cropId: CropId, season: Season, weather: GameWeather) {
  const crop = CROP_OUTPUT[cropId];
  const notes: string[] = [];
  let amount = crop.amount;
  let quality = 0.72;
  if (CROP_SEASONS[cropId].includes(season)) {
    amount += 1;
    quality += 0.06;
    notes.push('合时令');
  } else if (season === 'winter') {
    quality -= 0.04;
    notes.push('冬令收成偏紧');
  }
  if (weather === 'rain') {
    quality += 0.03;
    notes.push('雨水润苗');
  } else if (weather === 'snow') {
    amount = Math.max(1, amount - 1);
    quality -= 0.08;
    notes.push('雪寒折产');
  }
  return {
    ...crop,
    amount,
    quality: Number(clampQuality(quality).toFixed(2)),
    note: notes.length ? `（${notes.join('、')}）` : '',
  };
}

function profileRank(profile: PlayerProfile): number {
  const values = Object.values(profile.attributes);
  const average = values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
  if (average >= 80) return 5;
  if (average >= 64) return 4;
  if (average >= 48) return 3;
  if (average >= 32) return 2;
  if (average >= 16) return 1;
  return 0;
}

function normalizeProfile(profile: PlayerProfile): PlayerProfile {
  const titleRank = profileRank(profile);
  return { ...profile, titleRank, title: titleForRank(titleRank) };
}

function applyProfileXp(
  state: GameState,
  delta: Partial<Record<PlayerAttributeKey, number>>,
): GameState {
  if (Object.keys(delta).length === 0) return state;
  const attributes = { ...state.profile.attributes };
  const attributeXp = { ...state.profile.attributeXp };
  for (const [key, amount] of Object.entries(delta) as [PlayerAttributeKey, number][]) {
    attributeXp[key] = clampStat((attributeXp[key] ?? 0) + amount);
    attributes[key] = clampStat((attributes[key] ?? 0) + amount);
  }
  return { ...state, profile: normalizeProfile({ ...state.profile, attributes, attributeXp }) };
}

function profileXpFromAttributes(delta: Partial<PlayerAttributes> | undefined) {
  return (delta ?? {}) as Partial<Record<PlayerAttributeKey, number>>;
}

function mergeNumberDeltas<T extends string>(
  ...deltas: Array<Partial<Record<T, number>> | undefined>
): Partial<Record<T, number>> {
  const result: Partial<Record<T, number>> = {};
  for (const delta of deltas) {
    for (const [key, amount] of Object.entries(delta ?? {}) as [T, number][]) {
      result[key] = (result[key] ?? 0) + amount;
    }
  }
  return result;
}

function relationshipStageForAffinity(affinity: number): RelationshipStage {
  if (affinity >= 75) return 'confidant';
  if (affinity >= 50) return 'trusted';
  if (affinity >= 20) return 'familiar';
  return 'stranger';
}

function emptyNpcState(): NpcRuntimeState {
  return {
    affinity: 0,
    stage: 'stranger',
    talks: 0,
    lastTalkTurn: 0,
    lastGreetingIndex: 0,
    knownTopics: [],
    revealedIntelIds: [],
    usedFunctionDays: {},
  };
}

function hashText(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i++) hash = (hash * 31 + value.charCodeAt(i)) | 0;
  return Math.abs(hash);
}

function pickDescriptorTier(words: string[] | undefined, quality: number) {
  if (!words?.length) return '';
  const index = Math.max(0, Math.min(words.length - 1, Math.floor(quality * words.length)));
  return words[index] ?? words[0];
}

function descriptorRuleFor(
  rules: ItemDescriptorRule[] | undefined,
  resourceId: string,
  craftId: string | undefined,
  tags: string[],
) {
  return (
    rules?.find((rule) => craftId && rule.craftIds?.includes(craftId)) ??
    rules?.find((rule) => rule.resourceIds?.includes(resourceId)) ??
    rules?.find((rule) => rule.tags?.some((tag) => tags.includes(tag))) ??
    rules?.find((rule) => rule.id === 'generic-product') ??
    null
  );
}

type CraftWorkshopBonus = {
  qualityDelta: number;
  laborDiscount: number;
  defectSeverityReduction: number;
  descriptors: string[];
};

type ItemSourceContext = {
  sourceActivityId?: string;
  sourceIndustryId?: string;
  sourceItemIds?: string[];
  craftMetrics?: Metrics;
  materialQuality?: number | null;
  skippedStepIds?: string[];
  craftTechniqueRecords?: CraftTechniqueRecord[];
  craftFocusCheckRecords?: CraftFocusCheckRecord[];
  craftStageOutcomes?: CraftStageOutcome[];
  craftMentorInterventions?: CraftMentorIntervention[];
  craftTechniqueDimensionDelta?: Partial<Record<ItemQualityDimension, number>>;
  craftFocusDimensionDelta?: Partial<Record<ItemQualityDimension, number>>;
  qualityDimensions?: Partial<Record<ItemQualityDimension, number>>;
  defects?: ItemDefect[];
  mentorGuidance?: CraftMentorGuidance;
  workshopBonus?: CraftWorkshopBonus;
};

type CraftMentorGuidance = {
  stageIds: string[];
  defectIds: string[];
  repairOptionIds: string[];
  dimensions: ItemQualityDimension[];
  descriptors: string[];
  qualityDelta: number;
};

const DIMENSION_METRIC: Record<ItemQualityDimension, keyof Metrics> = {
  purity: 'heritage',
  grain: 'heritage',
  hardness: 'heritage',
  resilience: 'heritage',
  spirit: 'spirit',
  form: 'heritage',
  handling: 'life',
  sharpness: 'heritage',
  finish: 'spirit',
  merchantTrust: 'market',
};

function craftInteractionFor(content: GameContent, craftId: string | undefined): CraftInteractionSpec | null {
  if (!craftId) return null;
  return content.craftInteractions?.find((spec) => spec.craftId === craftId) ?? null;
}

type CraftMentorLesson = {
  spec: CraftInteractionSpec;
  stage: CraftInteractionSpec['stages'][number] | null;
  defect: CraftInteractionSpec['defects'][number] | null;
  repair: CraftRepairOptionDef | null;
};

function craftName(content: GameContent, craftId: string) {
  return content.crafts.find((craft) => craft.id === craftId)?.name ?? craftId;
}

function subregionNameFor(content: GameContent, regionId: string, subregionId: string) {
  const region = content.regions?.find((entry) => entry.id === regionId);
  return region?.subregions.find((entry) => entry.id === subregionId)?.name ?? subregionId;
}

function craftSubregionNames(content: GameContent, regionId: string, craftId: string): string[] {
  const region = content.regions?.find((entry) => entry.id === regionId);
  return (
    content.subregionContent
      ?.filter((entry) => entry.regionId === regionId && entry.craftIds.includes(craftId))
      .map((entry) => region?.subregions.find((subregion) => subregion.id === entry.subregionId)?.name ?? entry.subregionId) ??
    []
  );
}

function localCraftAccessFailure(state: GameState, content: GameContent, craftId: string): string | null {
  const subregionSpec = content.subregionContent?.find(
    (entry) => entry.regionId === state.currentRegion && entry.subregionId === state.currentSubregion,
  );
  if (!subregionSpec || subregionSpec.craftIds.includes(craftId)) return null;

  const craftLabel = craftName(content, craftId);
  const current = subregionNameFor(content, state.currentRegion, state.currentSubregion);
  const targets = craftSubregionNames(content, state.currentRegion, craftId);
  const targetText = targets.length > 0 ? `，请前往「${targets.join('」或「')}」的工坊点` : '，请前往对应地区的工坊点';
  return `「${current}」暂不能进行「${craftLabel}」${targetText}。`;
}

function craftMentorLessons(
  content: GameContent,
  npc: NpcDef,
  runtime: NpcRuntimeState,
): CraftMentorLesson[] {
  const knownTopics = new Set(runtime.knownTopics ?? []);
  return (content.craftInteractions ?? [])
    .filter((spec) => spec.mentorNpcIds?.includes(npc.id) || npc.anchorCraftId === spec.craftId)
    .map((spec) => {
      const stage = spec.stages.find((candidate) => !knownTopics.has(`craft-stage:${candidate.id}`)) ??
        spec.stages[0] ??
        null;
      const defect = [...spec.defects].sort((a, b) => b.severity - a.severity)[0] ?? null;
      const repair = defect
        ? spec.repairOptions.find((option) => defect.repairOptionIds.includes(option.id)) ?? null
        : null;
      return { spec, stage, defect, repair };
    });
}

function craftMentorLessonLine(content: GameContent, lesson: CraftMentorLesson) {
  const craft = craftName(content, lesson.spec.craftId);
  const stageNote = lesson.stage
    ? `先守「${lesson.stage.name}」：${lesson.stage.playerAction}`
    : lesson.spec.summary;
  const defectNote = lesson.defect ? `易留「${lesson.defect.label}」` : '少出失手';
  const repairNote = lesson.repair ? `可用「${lesson.repair.label}」返修` : '需先回炉自检';
  return `又讲「${lesson.spec.title}」（${craft}）：${stageNote}，${defectNote}，${repairNote}`;
}

function craftMentorGuidanceForCraft(state: GameState, spec: CraftInteractionSpec | null): CraftMentorGuidance | undefined {
  if (!spec) return undefined;
  const flags = new Set(state.flags);
  if (!flags.has(`craft-mentor:${spec.craftId}`)) return undefined;
  const stageIds = spec.stages
    .filter((stage) => flags.has(`craft-mentor-stage:${stage.id}`))
    .map((stage) => stage.id);
  const defects = spec.defects.filter((defect) => flags.has(`craft-mentor-defect:${defect.id}`));
  const repairOptions = spec.repairOptions.filter((option) => flags.has(`craft-mentor-repair:${option.id}`));
  const dimensions = [
    ...new Set([
      ...spec.stages
        .filter((stage) => stageIds.includes(stage.id))
        .flatMap((stage) => stage.focusDimensions),
      ...defects.map((defect) => defect.dimension),
      ...repairOptions.flatMap((option) => Object.keys(option.improveDimensions ?? {}) as ItemQualityDimension[]),
    ]),
  ];
  if (stageIds.length === 0 && defects.length === 0 && repairOptions.length === 0) return undefined;
  return {
    stageIds,
    defectIds: defects.map((defect) => defect.id),
    repairOptionIds: repairOptions.map((option) => option.id),
    dimensions,
    descriptors: ['师傅看样'],
    qualityDelta: 0.03 + Math.min(0.03, stageIds.length * 0.01 + defects.length * 0.01),
  };
}

function stageOutcomeResultFor(controlScore: number, riskScore: number): CraftStageOutcome['result'] {
  if (riskScore <= 0.24 && controlScore >= 0.78) return 'steady';
  if (riskScore <= 0.55 && controlScore >= 0.5) return 'standard';
  return 'risky';
}

function applyFocusChecksToStageOutcomes(
  stageOutcomes: CraftStageOutcome[],
  focusRecords: CraftFocusCheckRecord[],
): CraftStageOutcome[] {
  if (focusRecords.length === 0) return stageOutcomes;
  const focusByStage = new Map(focusRecords.map((record) => [record.stageId, record]));
  return stageOutcomes.map((outcome) => {
    const focusCheck = focusByStage.get(outcome.stageId);
    if (!focusCheck) return outcome;
    const controlScore = Number(clampQuality(outcome.controlScore + focusCheck.controlDelta).toFixed(3));
    const riskScore = Number(clampQuality(outcome.riskScore + focusCheck.riskDelta).toFixed(3));
    return {
      ...outcome,
      controlScore,
      riskScore,
      result: stageOutcomeResultFor(controlScore, riskScore),
      resultText: `${outcome.resultText} ${focusCheck.resultText}`,
      focusCheck,
    };
  });
}

function mentorStageInterventions(
  stageOutcomes: CraftStageOutcome[],
  mentorGuidance?: CraftMentorGuidance,
): { stageOutcomes: CraftStageOutcome[]; interventions: CraftMentorIntervention[] } {
  if (!mentorGuidance) return { stageOutcomes, interventions: [] };
  const guidedStageIds = new Set(mentorGuidance.stageIds);
  const guidedDimensions = new Set(mentorGuidance.dimensions);
  const interventions: CraftMentorIntervention[] = [];
  const adjusted = stageOutcomes.map((outcome) => {
    const stageGuided = guidedStageIds.has(outcome.stageId);
    const dimensionGuided = outcome.focusDimensions.some((dimension) => guidedDimensions.has(dimension));
    if (outcome.result !== 'risky' || (!stageGuided && !dimensionGuided)) return outcome;

    const reason = stageGuided
      ? `师傅已讲过「${outcome.stageName}」`
      : `师傅看过「${outcome.stageName}」关联病根`;
    const controlDelta = 0.16;
    const riskDelta = -0.22;
    const controlScore = Number(clampQuality(outcome.controlScore + controlDelta).toFixed(3));
    const riskScore = Number(clampQuality(outcome.riskScore + riskDelta).toFixed(3));
    const intervention: CraftMentorIntervention = {
      stageId: outcome.stageId,
      stageName: outcome.stageName,
      reason,
      controlDelta,
      riskDelta,
      note: `${reason}，临场复核后压住一截风险。`,
    };
    interventions.push(intervention);
    return {
      ...outcome,
      controlScore,
      riskScore,
      result: stageOutcomeResultFor(controlScore, riskScore),
      resultText: `${outcome.resultText} ${intervention.note}`,
      mentorIntervention: intervention,
    };
  });
  return { stageOutcomes: adjusted, interventions };
}

function craftWorkshopBonusForCraft(
  state: GameState,
  content: GameContent,
  craftId: string,
): CraftWorkshopBonus | undefined {
  const purchased = new Set((state.workshopUpgrades ?? []).map((upgrade) => upgrade.id));
  const defs = (content.workshopUpgrades ?? []).filter(
    (upgrade) => upgrade.craftId === craftId && purchased.has(upgrade.id),
  );
  if (defs.length === 0) return undefined;
  return {
    qualityDelta: defs.reduce((sum, upgrade) => sum + (upgrade.effects.qualityDelta ?? 0), 0),
    laborDiscount: defs.reduce((sum, upgrade) => sum + (upgrade.effects.laborDiscount ?? 0), 0),
    defectSeverityReduction: defs.reduce((sum, upgrade) => sum + (upgrade.effects.defectSeverityReduction ?? 0), 0),
    descriptors: [...new Set(defs.flatMap((upgrade) => upgrade.effects.descriptors ?? []))],
  };
}

function dimensionScore(
  dimension: ItemQualityDimension,
  quality: number,
  context: ItemSourceContext,
) {
  const metricKey = DIMENSION_METRIC[dimension];
  const metricSupport = context.craftMetrics ? (context.craftMetrics[metricKey] ?? 50) / 100 : quality;
  const materialSupport = context.materialQuality ?? quality;
  const skipPenalty = Math.min(0.16, (context.skippedStepIds?.length ?? 0) * 0.04);
  const mentorBoost = context.mentorGuidance?.dimensions.includes(dimension) ? 0.08 : 0;
  const techniqueDelta = context.craftTechniqueDimensionDelta?.[dimension] ?? 0;
  const focusDelta = context.craftFocusDimensionDelta?.[dimension] ?? 0;
  return Number(
    clampQuality(
      quality * 0.6 +
        metricSupport * 0.25 +
        materialSupport * 0.15 -
        skipPenalty +
        mentorBoost +
        techniqueDelta +
        focusDelta,
    ).toFixed(3),
  );
}

function itemQualityDimensions(
  rule: ItemDescriptorRule | null,
  spec: CraftInteractionSpec | null,
  quality: number,
  context: ItemSourceContext,
): Partial<Record<ItemQualityDimension, number>> | undefined {
  if (context.qualityDimensions) return context.qualityDimensions;
  const dimensions = spec?.qualityDimensions ?? (rule ? (Object.keys(rule.dimensions) as ItemQualityDimension[]) : []);
  if (dimensions.length === 0) return undefined;
  return Object.fromEntries(
    dimensions.map((dimension) => [dimension, dimensionScore(dimension, quality, context)]),
  ) as Partial<Record<ItemQualityDimension, number>>;
}

function defectTriggerMatches(
  spec: CraftInteractionSpec,
  defect: CraftInteractionSpec['defects'][number],
  quality: number,
  dimensions: Partial<Record<ItemQualityDimension, number>> | undefined,
  skippedStepIds: string[],
) {
  const trigger = defect.trigger;
  const skipped = new Set(skippedStepIds);
  if (trigger.skippedStepIds && !trigger.skippedStepIds.some((id) => skipped.has(id))) return false;
  if (trigger.minSkippedSteps !== undefined && skipped.size < trigger.minSkippedSteps) return false;
  if (trigger.maxQuality !== undefined && quality > trigger.maxQuality) return false;
  if (trigger.maxDimension) {
    const dimensionHit = Object.entries(trigger.maxDimension).some(([dimension, threshold]) => {
      const value = dimensions?.[dimension as ItemQualityDimension] ?? 1;
      return value <= (threshold ?? 0);
    });
    if (!dimensionHit) return false;
  }
  const hasAnyTrigger =
    Boolean(trigger.skippedStepIds?.length) ||
    trigger.minSkippedSteps !== undefined ||
    trigger.maxQuality !== undefined ||
    Boolean(trigger.maxDimension);
  return hasAnyTrigger && spec.defects.some((candidate) => candidate.id === defect.id);
}

function defectSourceStage(
  spec: CraftInteractionSpec,
  defect: CraftInteractionSpec['defects'][number],
  skippedStepIds: string[],
  stageOutcomes: CraftStageOutcome[] = [],
): Pick<ItemDefect, 'sourceStageId' | 'sourceStageName' | 'sourceReason'> {
  const skipped = new Set(skippedStepIds);
  const triggerSkipped = new Set(defect.trigger.skippedStepIds ?? []);
  const skippedStage = spec.stages.find((stage) =>
    stage.processStepIds.some((stepId) => skipped.has(stepId) && (triggerSkipped.size === 0 || triggerSkipped.has(stepId))),
  );
  if (skippedStage) {
    return {
      sourceStageId: skippedStage.id,
      sourceStageName: skippedStage.name,
      sourceReason: `省略「${skippedStage.name}」关联工序`,
    };
  }

  const dimensionOutcome = stageOutcomes
    .filter((outcome) => outcome.focusDimensions.includes(defect.dimension))
    .sort((a, b) => b.riskScore - a.riskScore || a.controlScore - b.controlScore)[0];
  if (dimensionOutcome) {
    return {
      sourceStageId: dimensionOutcome.stageId,
      sourceStageName: dimensionOutcome.stageName,
      sourceReason:
        dimensionOutcome.result === 'risky'
          ? `「${dimensionOutcome.stageName}」赶工风险偏高`
          : `「${dimensionOutcome.stageName}」关键维度不足`,
    };
  }

  const dimensionStage = spec.stages.find((stage) => stage.focusDimensions.includes(defect.dimension));
  if (dimensionStage) {
    return {
      sourceStageId: dimensionStage.id,
      sourceStageName: dimensionStage.name,
      sourceReason: `「${dimensionStage.name}」关键维度不足`,
    };
  }

  const riskyOutcome = [...stageOutcomes].sort((a, b) => b.riskScore - a.riskScore)[0];
  return riskyOutcome
    ? {
        sourceStageId: riskyOutcome.stageId,
        sourceStageName: riskyOutcome.stageName,
        sourceReason: `「${riskyOutcome.stageName}」工序风险累积`,
      }
    : {};
}

function itemDefectsFromSpec(
  spec: CraftInteractionSpec | null,
  quality: number,
  dimensions: Partial<Record<ItemQualityDimension, number>> | undefined,
  skippedStepIds: string[],
  mentorGuidance?: CraftMentorGuidance,
  workshopBonus?: CraftWorkshopBonus,
  stageOutcomes?: CraftStageOutcome[],
): ItemDefect[] {
  if (!spec) return [];
  return spec.defects
    .filter((defect) => defectTriggerMatches(spec, defect, quality, dimensions, skippedStepIds))
    .map((defect) => {
      const mitigatedByMentor = Boolean(
        mentorGuidance &&
          (mentorGuidance.defectIds.includes(defect.id) ||
            defect.repairOptionIds.some((optionId) => mentorGuidance.repairOptionIds.includes(optionId))),
      );
      const workshopReduction = Math.max(0, workshopBonus?.defectSeverityReduction ?? 0);
      const mitigatedByWorkshop = workshopReduction > 0 && defect.severity > 1;
      const severity = Math.max(
        1,
        defect.severity - (mitigatedByMentor ? 1 : 0) - (mitigatedByWorkshop ? workshopReduction : 0),
      ) as ItemDefect['severity'];
      return {
        id: defect.id,
        label: defect.label,
        dimension: defect.dimension,
        severity,
        description: defect.description,
        repairOptionIds: defect.repairOptionIds,
        source: 'craft' as const,
        ...defectSourceStage(spec, defect, skippedStepIds, stageOutcomes),
        mitigatedByMentor,
        mitigatedByWorkshop,
      };
    });
}

function repairOptionFor(
  content: GameContent,
  item: ItemInstance,
  repairOptionId: string,
): { spec: CraftInteractionSpec; option: CraftRepairOptionDef } | null {
  const spec = craftInteractionFor(content, item.sourceCraftId);
  const option = spec?.repairOptions.find((entry) => entry.id === repairOptionId);
  return spec && option ? { spec, option } : null;
}

function mentorGuidedRepair(
  state: GameState,
  defect: ItemDefect,
  option: CraftRepairOptionDef,
) {
  const flags = new Set(state.flags);
  return Boolean(
    defect.mitigatedByMentor ||
      flags.has(`craft-mentor-defect:${defect.id}`) ||
      flags.has(`craft-mentor-repair:${option.id}`),
  );
}

function createItemInstance(
  state: GameState,
  content: GameContent,
  resourceId: string,
  sourceCraftId?: string,
  quality = 0.62,
  tags: string[] = [],
  context: ItemSourceContext = {},
): ItemInstance {
  const rule = descriptorRuleFor(content.itemDescriptorRules, resourceId, sourceCraftId, tags);
  const spec = craftInteractionFor(content, sourceCraftId);
  const descriptors = rule
    ? Object.values(rule.dimensions)
        .map((words) => pickDescriptorTier(words, quality))
        .filter(Boolean)
        .slice(0, 4)
    : [];
  const dimensions = itemQualityDimensions(rule, spec, quality, context);
  const generatedDefects = context.defects ?? itemDefectsFromSpec(
    spec,
    quality,
    dimensions,
    context.skippedStepIds ?? [],
    context.mentorGuidance,
    context.workshopBonus,
    context.craftStageOutcomes,
  );
  const defectDescriptors =
    generatedDefects.length && spec
      ? spec.defects
          .filter((defect) => generatedDefects.some((itemDefect) => itemDefect.id === defect.id))
          .flatMap((defect) => defect.descriptors ?? [])
      : [];
  const resourceName = content.resources?.find((resource) => resource.id === resourceId)?.name ?? resourceId;
  const template = rule?.templates[Math.floor(Math.max(0, Math.min(0.999, quality)) * rule.templates.length)] ??
    '此物已有可辨之质，尚待名家细评。';
  const defectNote = generatedDefects.length
    ? ` 仍留${generatedDefects.map((defect) => `「${defect.label}${defect.mitigatedByMentor ? '（师傅已压低）' : ''}${defect.mitigatedByWorkshop ? '（工坊已压低）' : ''}」`).join('、')}，可择法返修。`
    : '';
  const mentorNote = context.mentorGuidance
    ? ' 此番按师傅看样先校过关键处，工序气口更稳。'
    : '';
  const workshopNote = context.workshopBonus?.descriptors.length
    ? ` 工坊已用${context.workshopBonus.descriptors.join('、')}整备，出品更稳。`
    : '';
  const mentorInterventionNote = context.craftMentorInterventions?.length
    ? ` 师傅现场复核${context.craftMentorInterventions.map((intervention) => `「${intervention.stageName}」`).join('、')}，把临门风险压回可控。`
    : '';
  const activeTechniqueRecords = (context.craftTechniqueRecords ?? []).filter(
    (record) => record.choiceId !== 'balanced',
  );
  const techniqueNote = activeTechniqueRecords.length
    ? ` 本次手法：${activeTechniqueRecords.map((record) => `${record.stageName}取「${record.choiceLabel}」`).join('，')}。`
    : '';
  const activeFocusCheckRecords = (context.craftFocusCheckRecords ?? []).filter(
    (record) => record.choiceId !== 'observe',
  );
  const focusCheckNote = activeFocusCheckRecords.length
    ? ` 专注校准：${activeFocusCheckRecords.map((record) => `${record.stageName}取「${record.choiceLabel}」`).join('，')}。`
    : '';
  const appraisal = `${template
    .replace(/\{item\}/g, resourceName)
    .replace(/\{descriptors\}/g, descriptors.join('、') || '朴实可用')}${mentorNote}${workshopNote}${mentorInterventionNote}${techniqueNote}${focusCheckNote}${defectNote}`;

  return {
    id: `${resourceId}-${state.turn}-${state.itemInstances.length + 1}-${Math.abs(hashText(appraisal)).toString(36)}`,
    resourceId,
    sourceCraftId,
    ...context,
    originRegionId: state.currentRegion,
    originSubregionId: state.currentSubregion,
    createdTurn: state.turn,
    quality,
    qualityDimensions: dimensions,
    craftFocusCheckRecords: context.craftFocusCheckRecords,
    craftStageOutcomes: context.craftStageOutcomes,
    craftMentorInterventions: context.craftMentorInterventions,
    defects: generatedDefects,
    repairHistory: [],
    descriptors: [
      ...new Set([
        ...descriptors,
        ...(context.mentorGuidance?.descriptors ?? []),
        ...(context.workshopBonus?.descriptors ?? []),
        ...(context.craftFocusCheckRecords?.length ? ['专注校准'] : []),
        ...(context.craftMentorInterventions?.length ? ['师傅现场复核'] : []),
        ...defectDescriptors,
      ]),
    ].slice(0, 6),
    appraisal,
    status: 'held',
  };
}

function itemIsTransferredAway(item: Pick<ItemInstance, 'status'>): boolean {
  return item.status === 'gifted' || item.status === 'sold';
}

function transferredItemActionMessage(item: Pick<ItemInstance, 'status'>, actionLabel: string): string {
  return item.status === 'sold'
    ? `这件作品已经售出，不能再${actionLabel}。`
    : `这件作品已经赠出，不能再${actionLabel}。`;
}

function itemIsUnavailableForConsumption(item: Pick<ItemInstance, 'status'>): boolean {
  return itemIsTransferredAway(item) || item.status === 'displayed';
}

function availableResourceAmount(state: GameState, resourceId: string): number {
  const stock = state.resources[resourceId] ?? 0;
  const displayedCount = state.itemInstances.filter(
    (item) => item.resourceId === resourceId && item.status === 'displayed',
  ).length;
  return Math.max(0, stock - displayedCount);
}

function consumedItemInstances(items: ItemInstance[], cost: ResourcePool): ItemInstance[] {
  const remaining: ResourcePool = { ...cost };
  const consumed: ItemInstance[] = [];
  for (const item of items) {
    const need = remaining[item.resourceId] ?? 0;
    if (need <= 0 || itemIsUnavailableForConsumption(item)) continue;
    remaining[item.resourceId] = need - 1;
    consumed.push(item);
  }
  return consumed;
}

/** 根据资源消耗同步移除已追踪的物品实例。 */
function consumeItemInstances(items: ItemInstance[], cost: ResourcePool): ItemInstance[] {
  const remaining: ResourcePool = { ...cost };
  return items.filter((item) => {
    const need = remaining[item.resourceId] ?? 0;
    if (need <= 0 || itemIsUnavailableForConsumption(item)) return true;
    remaining[item.resourceId] = need - 1;
    return false;
  });
}

function consumeItemInstancesExcept(items: ItemInstance[], cost: ResourcePool, excludeItemId: string): ItemInstance[] {
  const remaining: ResourcePool = { ...cost };
  return items.filter((item) => {
    if (item.id === excludeItemId) return true;
    const need = remaining[item.resourceId] ?? 0;
    if (need <= 0 || itemIsUnavailableForConsumption(item)) return true;
    remaining[item.resourceId] = need - 1;
    return false;
  });
}

function inputQualityFromItems(items: ItemInstance[], cost: ResourcePool): number | null {
  const consumed = consumedItemInstances(items, cost);
  if (consumed.length === 0) return null;
  return consumed.reduce((sum, item) => sum + item.quality, 0) / consumed.length;
}

function resourceName(content: GameContent, resourceId: string) {
  return content.resources?.find((resource) => resource.id === resourceId)?.name ?? resourceId;
}

function suggestItemTitle(item: ItemInstance, content: GameContent): string {
  const name = resourceName(content, item.resourceId);
  const descriptor = item.descriptors.find(Boolean);
  if (item.resourceId === 'treasureSword') return `${descriptor ?? '龙泉'}剑`;
  return `${descriptor ?? '初成'}${name}`;
}

function withNamedItem(state: GameState, content: GameContent, item: ItemInstance): ItemInstance {
  return {
    ...item,
    displayName: item.displayName ?? suggestItemTitle(item, content),
    authorName: item.authorName ?? (state.playerName.trim() || '无名匠人'),
    status: item.status ?? 'held',
  };
}

function itemDefects(item: Pick<ItemInstance, 'defects'>): ItemDefect[] {
  return item.defects ?? [];
}

export function itemDefectSeverity(item: Pick<ItemInstance, 'defects'>): number {
  return itemDefects(item).reduce((sum, defect) => sum + defect.severity, 0);
}

export function itemEffectiveQuality(item: Pick<ItemInstance, 'quality' | 'defects'>): number {
  return clampQuality(item.quality - itemDefectSeverity(item) * 0.035);
}

export function itemSaleValue(
  content: Pick<GameContent, 'resources'>,
  state: Pick<GameState, 'regionReputation'>,
  item: Pick<
    ItemInstance,
    | 'resourceId'
    | 'quality'
    | 'defects'
    | 'displayName'
    | 'inscription'
    | 'collaboratorNpcIds'
    | 'originRegionId'
    | 'descriptors'
  >,
): number {
  const resource = content.resources?.find((entry) => entry.id === item.resourceId);
  const baseValue = resource?.value ?? 12;
  const qualityValue = itemEffectiveQuality(item);
  const reputationBonus = Math.floor(regionReputationOf(state, item.originRegionId) / 10);
  const nameBonus = item.displayName ? 3 : 0;
  const inscriptionBonus = item.inscription ? 4 : 0;
  const collaboratorBonus = Math.min(8, (item.collaboratorNpcIds?.length ?? 0) * 2);
  const descriptorBonus = Math.min(4, item.descriptors.length);
  const defectPenalty = itemDefectSeverity(item) * 2;
  return Math.max(
    1,
    Math.round(
      baseValue * (0.55 + qualityValue * 0.95) +
        reputationBonus +
        nameBonus +
        inscriptionBonus +
        collaboratorBonus +
        descriptorBonus -
        defectPenalty,
    ),
  );
}

export function itemDefectSummary(item: Pick<ItemInstance, 'defects'>): string {
  const defects = itemDefects(item);
  if (defects.length === 0) return '';
  return `缺陷：${defects.map((defect) => `${defect.label}${defect.severity >= 2 ? '（重）' : ''}${defect.mitigatedByMentor ? '（师傅压过）' : ''}${defect.mitigatedByWorkshop ? '（工坊压过）' : ''}${defectSourceNote(defect)}`).join('、')}`;
}

function defectSourceNote(defect: Pick<ItemDefect, 'sourceStageName' | 'sourceReason'>): string {
  const source = defect.sourceReason ?? defect.sourceStageName;
  return source ? `（病根：${source}）` : '';
}

function highestSeverityDefect(item: Pick<ItemInstance, 'defects'>): ItemDefect | null {
  return [...itemDefects(item)].sort((a, b) => b.severity - a.severity || a.label.localeCompare(b.label))[0] ?? null;
}

function orderRequiresCleanWork(order: ActiveOrder): boolean {
  return (
    order.minQuality >= MASTERWORK_MIN_QUALITY ||
    order.orderKind === 'palace' ||
    order.orderKind === 'credit' ||
    order.orderKind === 'consignment' ||
    order.orderKind === 'referral'
  );
}

function orderItemHasBlockingDefect(item: ItemInstance, order: ActiveOrder): boolean {
  const defect = highestSeverityDefect(item);
  if (!defect) return false;
  if (defect.severity >= 3) return true;
  return defect.severity >= 2 && orderRequiresCleanWork(order);
}

function orderTrackedItems(state: GameState, order: ActiveOrder): ItemInstance[] {
  return state.itemInstances.filter(
    (item) => !itemIsUnavailableForConsumption(item) && item.resourceId === order.resourceId,
  );
}

function orderItemMeetsRequirements(item: ItemInstance, order: ActiveOrder): boolean {
  return itemEffectiveQuality(item) >= order.minQuality && !orderItemHasBlockingDefect(item, order);
}

function quickMarketOrderIssue(item: ItemInstance, content: GameContent): string | null {
  const defect = highestSeverityDefect(item);
  if (defect && defect.severity >= 2) {
    return `「${itemShortName(item, content)}」带有「${defect.label}」${defectSourceNote(defect)}，普通市场单也会先拒收；请返修后再交。`;
  }
  const effectiveQuality = itemEffectiveQuality(item);
  if (effectiveQuality < MARKET_ORDER_MIN_QUALITY) {
    const defectNote = defect ? `，主要受「${defect.label}」${defectSourceNote(defect)}影响` : '';
    return `「${itemShortName(item, content)}」有效品相仅 ${Math.round(effectiveQuality * 100)}，市场验收至少需 ${Math.round(MARKET_ORDER_MIN_QUALITY * 100)}${defectNote}。`;
  }
  return null;
}

function quickMarketOrderItemIndex(state: GameState, content: GameContent, resourceId: string): { index: number | null; issue: string | null } {
  const tracked = state.itemInstances
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => item.resourceId === resourceId && !itemIsUnavailableForConsumption(item));
  if (tracked.length === 0) return { index: null, issue: null };

  const eligible = tracked
    .filter(({ item }) => !quickMarketOrderIssue(item, content))
    .sort((a, b) => itemEffectiveQuality(b.item) - itemEffectiveQuality(a.item) || b.item.quality - a.item.quality)[0];
  if (eligible) return { index: eligible.index, issue: null };

  const representative = [...tracked].sort(
    (a, b) => itemDefectSeverity(b.item) - itemDefectSeverity(a.item) || itemEffectiveQuality(a.item) - itemEffectiveQuality(b.item),
  )[0];
  return { index: null, issue: representative ? quickMarketOrderIssue(representative.item, content) : null };
}

export function orderDeliveryIssue(state: GameState, order: ActiveOrder, content: GameContent): string | null {
  if (order.expiresDay !== undefined && order.expiresDay < state.calendar.day) return '已过交期';
  if (availableResourceAmount(state, order.resourceId) < order.quantity) return `库存不足，无法交付「${order.title}」。`;

  const tracked = orderTrackedItems(state, order);
  if (tracked.length === 0) return null;

  const eligible = tracked.filter((item) => orderItemMeetsRequirements(item, order));
  if (eligible.length >= order.quantity) return null;

  const defectBlocked = tracked.find((item) => item.quality >= order.minQuality && orderItemHasBlockingDefect(item, order));
  if (defectBlocked) {
    const defect = highestSeverityDefect(defectBlocked);
    return `「${itemShortName(defectBlocked, content)}」带有「${defect?.label ?? '重缺陷'}」${defect ? defectSourceNote(defect) : ''}，这类订单需先返修再交付。`;
  }

  const defectLowered = tracked.find((item) => item.defects?.length && itemEffectiveQuality(item) < order.minQuality);
  if (defectLowered) {
    const defect = highestSeverityDefect(defectLowered);
    const sourceNote = defect ? `，主要受「${defect.label}」${defectSourceNote(defect)}影响` : '';
    return `「${resourceName(content, order.resourceId)}」缺陷折损后未达 ${Math.round(order.minQuality * 100)} 分，有效品相仅 ${Math.round(itemEffectiveQuality(defectLowered) * 100)}${sourceNote}。`;
  }

  return `「${resourceName(content, order.resourceId)}」品相不足，需 ${order.quantity} 份达到 ${Math.round(order.minQuality * 100)} 分。`;
}

/**
 * 订单交付定价：成品基准售价随该手艺当前传承度浮动，形成「品质→售价」闭环。
 * 传承 0 → 0.6×，传承 50 → 1.0×，传承 100 → 1.4×。
 */
export function orderPrice(baseValue: number, heritage: number): number {
  const h = Math.max(0, Math.min(100, heritage));
  return Math.max(1, Math.round(baseValue * (0.6 + (h / 100) * 0.8)));
}

function pushLog(log: string[], message: string): string[] {
  return [message, ...log].slice(0, MAX_LOG);
}

/** 在状态中查找某门手艺的动态状态 */
function findCraftState(state: GameState, craftId: string): CraftState | undefined {
  return state.crafts.find((c) => c.craftId === craftId);
}

/** 重新计算镇级聚合四维 */
function recompute(state: GameState): GameState {
  return { ...state, metrics: aggregateTownMetrics(state.crafts) };
}

/** 将一个结构化效果应用到状态上 */
function applyEffect(state: GameState, effect: GameEffect): GameState {
  let next = state;

  if (effect.metrics) {
    // 镇级效果摊到所有已解锁手艺上，使聚合值随之变化
    const crafts = next.crafts.map((c) =>
      c.unlocked ? { ...c, metrics: applyDelta(c.metrics, effect.metrics as Partial<Metrics>) } : c,
    );
    next = { ...next, crafts };
  }

  if (effect.craftMetrics) {
    const crafts = next.crafts.map((c) => {
      const delta = effect.craftMetrics?.[c.craftId];
      return delta ? { ...c, metrics: applyDelta(c.metrics, delta) } : c;
    });
    next = { ...next, crafts };
  }

  if (effect.resources) {
    const resources = { ...next.resources };
    for (const [key, amount] of Object.entries(effect.resources)) {
      resources[key] = (resources[key] ?? 0) + amount;
    }
    next = { ...next, resources };
  }

  if (effect.logMessage) {
    next = { ...next, log: pushLog(next.log, effect.logMessage) };
  }

  if (effect.setFlags && effect.setFlags.length > 0) {
    const flags = new Set(next.flags);
    for (const f of effect.setFlags) flags.add(f);
    next = { ...next, flags: [...flags] };
  }

  return recompute(next);
}

/** 执行一门手艺的工艺流程 */
function runProcess(
  state: GameState,
  content: GameContent,
  craftId: string,
  skipStepIds: string[],
  techniqueChoices: CraftTechniqueSelection[] = [],
  focusChecks: CraftFocusCheckSelection[] = [],
): GameState {
  const craftDef = content.crafts.find((c) => c.id === craftId);
  const craftState = findCraftState(state, craftId);
  if (!craftDef || !craftState) return state;
  const locationFailure = localCraftAccessFailure(state, content, craftId);
  if (locationFailure) return { ...state, log: pushLog(state.log, locationFailure) };

  const skipSet = new Set(skipStepIds);
  const stepsToRun = craftDef.processChain.filter(
    (step) => !(skipSet.has(step.id) && step.skippable),
  );
  const stepsSkipped = craftDef.processChain.filter(
    (step) => skipSet.has(step.id) && step.skippable,
  );
  const workshopBonus = craftWorkshopBonusForCraft(state, content, craftId);
  const interactionSpec = craftInteractionFor(content, craftDef.id);
  const techniquePlan = craftTechniquePlan(
    interactionSpec,
    techniqueChoices,
    stepsToRun.map((step) => step.id),
  );
  const focusCheckPlan = craftFocusCheckPlan(
    interactionSpec,
    focusChecks,
    stepsToRun.map((step) => step.id),
  );

  // 汇总成本
  let laborNeed = 0;
  const resourceNeed: Record<string, number> = {};
  for (const step of stepsToRun) {
    laborNeed += step.laborCost;
    for (const [key, amount] of Object.entries(step.resourceCost)) {
      resourceNeed[key] = (resourceNeed[key] ?? 0) + amount;
    }
  }
  if (workshopBonus?.laborDiscount) laborNeed = Math.max(1, laborNeed - workshopBonus.laborDiscount);
  if (techniquePlan.laborDelta) laborNeed = Math.max(1, laborNeed + techniquePlan.laborDelta);

  // 校验人力
  if ((state.resources.labor ?? 0) < laborNeed) {
    return {
      ...state,
      log: pushLog(state.log, `人力不足，无法开工「${craftDef.name}」（需 ${laborNeed} 工时）。`),
    };
  }
  // 校验资源
  for (const [key, amount] of Object.entries(resourceNeed)) {
    if ((state.resources[key] ?? 0) < amount) {
      return {
        ...state,
        log: pushLog(state.log, `原料不足，无法开工「${craftDef.name}」（缺 ${key}）。`),
      };
    }
  }

  // 扣除成本
  const resources: ResourcePool = { ...state.resources, labor: state.resources.labor - laborNeed };
  for (const [key, amount] of Object.entries(resourceNeed)) {
    resources[key] = (resources[key] ?? 0) - amount;
  }
  const consumedMaterials = consumedItemInstances(state.itemInstances, resourceNeed);
  const materialQuality = inputQualityFromItems(state.itemInstances, resourceNeed);
  const itemInstancesAfterCost = consumeItemInstances(state.itemInstances, resourceNeed);

  // 累积四维影响
  let craftMetrics: Metrics = { ...craftState.metrics };
  for (const step of stepsToRun) {
    craftMetrics = applyDelta(craftMetrics, step.metricImpact);
  }
  for (const step of stepsSkipped) {
    if (step.skipImpact) craftMetrics = applyDelta(craftMetrics, step.skipImpact);
  }
  if (Object.keys(techniquePlan.metricDelta).length > 0) {
    craftMetrics = applyDelta(craftMetrics, techniquePlan.metricDelta);
  }
  if (Object.keys(focusCheckPlan.metricDelta).length > 0) {
    craftMetrics = applyDelta(craftMetrics, focusCheckPlan.metricDelta);
  }

  // 产出与收益：跳过工序短期提产增收，但已在 skipImpact 中折损四维
  const incomeBase = 8 + stepsSkipped.length * 2;
  resources.coin = (resources.coin ?? 0) + incomeBase;

  // 供应链终端：消耗 material 后产出一件成品（product 层）
  let productNote = '';
  let itemInstance: ItemInstance | null = null;
  let mentorGuidanceUsed = false;
  let mentorInterventions: CraftMentorIntervention[] = [];
  const outputId = craftDef.outputResourceId;
  if (outputId) {
    resources[outputId] = (resources[outputId] ?? 0) + 1;
    const productName = resourceName(content, outputId);
    const mentorGuidance = craftMentorGuidanceForCraft(state, interactionSpec);
    const focusAdjustedStageOutcomes = applyFocusChecksToStageOutcomes(
      techniquePlan.stageOutcomes,
      focusCheckPlan.records,
    );
    const mentorInterventionPlan = mentorStageInterventions(focusAdjustedStageOutcomes, mentorGuidance);
    mentorInterventions = mentorInterventionPlan.interventions;
    const mentorInterventionQualityDelta = Math.min(0.02, mentorInterventions.length * 0.01);
    const craftQuality = Math.max(0.25, Math.min(0.98, (craftMetrics.heritage + craftMetrics.spirit) / 200));
    const baseQuality = materialQuality === null
      ? craftQuality
      : Math.max(0.25, Math.min(0.98, craftQuality * 0.55 + materialQuality * 0.45));
    const quality = Number(
      clampQuality(
        baseQuality +
          techniquePlan.qualityDelta +
          focusCheckPlan.qualityDelta +
          (mentorGuidance?.qualityDelta ?? 0) +
          mentorInterventionQualityDelta +
          (workshopBonus?.qualityDelta ?? 0),
      ).toFixed(3),
    );
    mentorGuidanceUsed = Boolean(mentorGuidance);
    itemInstance = createItemInstance(
      state,
      content,
      outputId,
      craftDef.id,
      quality,
      craftDef.synergyTags,
      {
        sourceItemIds: consumedMaterials.map((item) => item.id),
        craftMetrics,
        materialQuality,
        skippedStepIds: stepsSkipped.map((step) => step.id),
        craftTechniqueRecords: techniquePlan.records,
        craftFocusCheckRecords: focusCheckPlan.records,
        craftStageOutcomes: mentorInterventionPlan.stageOutcomes,
        craftMentorInterventions: mentorInterventions,
        craftTechniqueDimensionDelta: techniquePlan.dimensionDelta,
        craftFocusDimensionDelta: focusCheckPlan.dimensionDelta,
        mentorGuidance,
        workshopBonus,
      },
    );
    productNote = `，得「${productName}」×1（${itemInstance.descriptors.join('、') || '可用'}）`;
  }

  const crafts = state.crafts.map((c) =>
    c.craftId === craftId ? { ...c, metrics: craftMetrics, produced: c.produced + 1 } : c,
  );

  const skipNote = stepsSkipped.length > 0 ? `（省略了 ${stepsSkipped.length} 道工序）` : '';
  const nextFlags = new Set(state.flags);
  if (itemInstance && mentorGuidanceUsed) {
    nextFlags.add(`craft-mentor-used:${craftDef.id}`);
  }
  if (mentorInterventions.length > 0) {
    nextFlags.add(`craft-mentor-intervention:${craftDef.id}`);
    for (const intervention of mentorInterventions) {
      nextFlags.add(`craft-mentor-intervention-stage:${intervention.stageId}`);
    }
  }
  const activeTechniqueRecords = techniquePlan.records.filter((record) => record.choiceId !== 'balanced');
  if (activeTechniqueRecords.length > 0) {
    nextFlags.add(`craft-technique-used:${craftDef.id}`);
    for (const record of activeTechniqueRecords) {
      nextFlags.add(`craft-technique:${record.choiceId}:${record.stageId}`);
    }
  }
  const activeFocusCheckRecords = focusCheckPlan.records.filter((record) => record.choiceId !== 'observe');
  if (focusCheckPlan.records.length > 0) {
    nextFlags.add(`craft-focus-check-used:${craftDef.id}`);
    for (const record of focusCheckPlan.records) {
      nextFlags.add(`craft-focus-check:${record.choiceId}:${record.stageId}`);
    }
  }
  const techniqueNote = activeTechniqueRecords.length > 0
    ? `（手法：${activeTechniqueRecords.map((record) => `${record.stageName}取${record.choiceLabel}`).join('；')}）`
    : '';
  const focusCheckNote = activeFocusCheckRecords.length > 0
    ? `（校准：${activeFocusCheckRecords.map((record) => `${record.stageName}取${record.choiceLabel}`).join('；')}）`
    : '';

  const next: GameState = {
    ...state,
    resources,
    crafts,
    flags: [...nextFlags],
    itemInstances: itemInstance ? [itemInstance, ...itemInstancesAfterCost].slice(0, 80) : itemInstancesAfterCost,
    log: pushLog(
      itemInstance ? pushLog(state.log, itemInstance.appraisal) : state.log,
      `「${craftDef.name}」完成一批出品${skipNote}${techniqueNote}${focusCheckNote}${productNote}，入账 ${incomeBase} 文。`,
    ),
  };
  return recompute(
    applyProfileXp(next, {
      craft: 2,
      mind:
        stepsSkipped.length > 0
          ? 0
          : 1 +
            activeTechniqueRecords.filter((record) => record.choiceId === 'careful').length +
            focusCheckPlan.records.filter((record) => record.choiceId === 'observe' || record.choiceId === 'align').length,
    }),
  );
}

function workshopUpgradeRequirementFailure(
  state: GameState,
  content: GameContent,
  upgrade: WorkshopUpgradeDef,
): string | null {
  const craftState = findCraftState(state, upgrade.craftId);
  const craftLabel = craftName(content, upgrade.craftId);
  if (!craftState?.unlocked) return `尚未掌握「${craftLabel}」，不能升级对应工坊。`;
  const requirements = upgrade.requirements;
  if (!requirements) return null;
  if (requirements.produced !== undefined && craftState.produced < requirements.produced) {
    return `「${craftLabel}」还需先完成 ${requirements.produced} 批出品。`;
  }
  const purchasedUpgrades = new Set((state.workshopUpgrades ?? []).map((entry) => entry.id));
  const missingUpgrade = (requirements.upgrades ?? []).find((upgradeId) => !purchasedUpgrades.has(upgradeId));
  if (missingUpgrade) {
    const required = (content.workshopUpgrades ?? []).find((entry) => entry.id === missingUpgrade);
    return `尚未安置前置工坊「${required?.title ?? missingUpgrade}」。`;
  }
  const flags = new Set(state.flags);
  const missingFlag = (requirements.flags ?? []).find((flag) => !flags.has(flag));
  if (missingFlag) return `尚缺前置见闻「${missingFlag}」。`;
  if (requirements.regionReputation) {
    const { regionId, min } = requirements.regionReputation;
    const reputation = regionReputationOf(state, regionId);
    if (reputation < min) {
      return `${regionNameFor(content, regionId)}声望不足，需 ${min}，当前 ${reputation}。`;
    }
  }
  for (const [attribute, min] of Object.entries(requirements.attributes ?? {}) as [PlayerAttributeKey, number][]) {
    if ((state.profile.attributes[attribute] ?? 0) < min) return `人物属性「${attribute}」不足，需 ${min}。`;
  }
  return null;
}

function expandWorkshopSpace(state: GameState, content: GameContent, craftId: string): GameState {
  const craftDef = content.crafts.find((craft) => craft.id === craftId);
  const craftLabel = craftDef?.name ?? craftId;
  if (!craftDef) return { ...state, log: pushLog(state.log, '没有找到这门工艺。') };
  const locationFailure = localCraftAccessFailure(state, content, craftId);
  if (locationFailure) return { ...state, log: pushLog(state.log, locationFailure) };
  const craftState = findCraftState(state, craftId);
  if (!craftState?.unlocked) {
    return { ...state, log: pushLog(state.log, `尚未掌握「${craftLabel}」，不能扩建对应工坊。`) };
  }

  const capacity = workshopCapacityForCraft(state, craftId);
  if (capacity >= MAX_WORKSHOP_CAPACITY) {
    return { ...state, log: pushLog(state.log, `「${craftLabel}」工坊空间已达上限 ${MAX_WORKSHOP_CAPACITY} 格。`) };
  }
  const cost = workshopExpansionCostForCraft(state, craftId);
  const missing = missingResourcesForCost(state, cost);
  if (missing.length > 0) {
    const missingLabel = missing
      .map(([resourceId, amount]) => `${resourceName(content, resourceId)}×${amount}`)
      .join('、');
    return { ...state, log: pushLog(state.log, `扩建「${craftLabel}」工坊缺少材料：${missingLabel}。`) };
  }

  const nextCapacity = capacity + WORKSHOP_EXPANSION_CAPACITY;
  const existing = (state.workshopSpaces ?? []).find((entry) => entry.craftId === craftId);
  const workshopSpaces = existing
    ? (state.workshopSpaces ?? []).map((entry) =>
        entry.craftId === craftId
          ? {
              ...entry,
              capacity: nextCapacity,
              expansions: (entry.expansions ?? 0) + 1,
              day: state.calendar.day,
              phase: state.calendar.phase,
            }
          : entry,
      )
    : [
        ...(state.workshopSpaces ?? []),
        {
          craftId,
          capacity: nextCapacity,
          expansions: 1,
          day: state.calendar.day,
          phase: state.calendar.phase,
        },
      ];
  const flags = new Set(state.flags);
  flags.add(`workshop-space-expanded:${craftId}`);
  flags.add(`workshop-space:${craftId}:${nextCapacity}`);
  const base: GameState = {
    ...state,
    resources: deductResourceCost(state.resources, cost),
    workshopSpaces,
    flags: [...flags],
    log: pushLog(
      state.log,
      `扩建「${craftLabel}」工坊：新增 ${WORKSHOP_EXPANSION_CAPACITY} 格整备空间，当前 ${nextCapacity} 格（耗 ${resourceCostLabel(
        content,
        cost,
      )}）。`,
    ),
  };
  return applyProfileXp(base, { craft: 1, commerce: 1 });
}

function upgradeWorkshop(state: GameState, content: GameContent, upgradeId: string): GameState {
  const upgrade = (content.workshopUpgrades ?? []).find((entry) => entry.id === upgradeId);
  if (!upgrade) return { ...state, log: pushLog(state.log, '没有找到这项工坊升级。') };
  if ((state.workshopUpgrades ?? []).some((entry) => entry.id === upgrade.id)) {
    return { ...state, log: pushLog(state.log, `「${upgrade.title}」已经安置过了。`) };
  }
  const locationFailure = localCraftAccessFailure(state, content, upgrade.craftId);
  if (locationFailure) return { ...state, log: pushLog(state.log, locationFailure) };
  const requirementFailure = workshopUpgradeRequirementFailure(state, content, upgrade);
  if (requirementFailure) return { ...state, log: pushLog(state.log, requirementFailure) };
  const usedSpace = workshopUsedSpaceForCraft(state, content, upgrade.craftId);
  const capacity = workshopCapacityForCraft(state, upgrade.craftId);
  const neededSpace = workshopUpgradeSpaceCost(upgrade);
  if (usedSpace + neededSpace > capacity) {
    return {
      ...state,
      log: pushLog(
        state.log,
        `「${upgrade.title}」需要 ${neededSpace} 格工坊空间，当前「${craftName(
          content,
          upgrade.craftId,
        )}」已用 ${usedSpace}/${capacity} 格，请先扩建工坊。`,
      ),
    };
  }
  const missing = missingResourcesForCost(state, upgrade.cost);
  if (missing.length > 0) {
    const missingLabel = missing
      .map(([resourceId, amount]) => `${resourceName(content, resourceId)}×${amount}`)
      .join('、');
    return { ...state, log: pushLog(state.log, `升级「${upgrade.title}」缺少材料：${missingLabel}。`) };
  }

  const resources: ResourcePool = { ...state.resources };
  for (const [resourceId, amount] of Object.entries(upgrade.cost)) {
    resources[resourceId] = (resources[resourceId] ?? 0) - amount;
  }
  const flags = new Set(state.flags);
  flags.add(`workshop-upgrade:${upgrade.id}`);
  flags.add(`workshop-upgrade-craft:${upgrade.craftId}`);
  for (const flag of upgrade.effects.flags ?? []) flags.add(flag);

  const base: GameState = {
    ...state,
    resources,
    flags: [...flags],
    itemInstances: consumeItemInstances(state.itemInstances, upgrade.cost),
    workshopUpgrades: [
      ...(state.workshopUpgrades ?? []),
      {
        id: upgrade.id,
        craftId: upgrade.craftId,
        title: upgrade.title,
        kind: upgrade.kind,
        tier: upgrade.tier,
        day: state.calendar.day,
        phase: state.calendar.phase,
        maintenancePaid: 0,
        maintenanceMissed: 0,
      },
    ],
    log: pushLog(
      state.log,
      `安置「${upgrade.title}」：${upgrade.desc}（耗 ${resourceCostLabel(content, upgrade.cost)}）。`,
    ),
  };
  const withEffect = applyEffect(base, {
    metrics: upgrade.effects.metrics,
    craftMetrics: upgrade.effects.craftMetrics ? { [upgrade.craftId]: upgrade.effects.craftMetrics } : undefined,
  });
  return applyProfileXp(withEffect, mergeProfileXp({ knowledge: 1 }, profileXpFromAttributes(upgrade.effects.attributes)));
}

function advanceTimePhase(state: GameState, content: GameContent): GameState {
  if (state.pendingEscortCrisis) {
    return { ...state, log: pushLog(state.log, '请先处理当前护商危机，再推进时辰。') };
  }
  if (state.pendingSupplyCrisis) {
    return { ...state, log: pushLog(state.log, '请先处理当前断供危机，再推进时辰。') };
  }
  if (state.pendingActivityStallClosing) {
    return { ...state, log: pushLog(state.log, '请先处理当前收灯夜选择，再推进时辰。') };
  }
  const currentIndex = TIME_PHASES.indexOf(state.calendar.phase);
  if (currentIndex < 0 || currentIndex >= TIME_PHASES.length - 1) return endTurn(state, content);
  const phase = TIME_PHASES[currentIndex + 1];
  return {
    ...state,
    calendar: { ...state.calendar, phase },
    log: pushLog(state.log, `时辰推进到${TIME_PHASE_LABEL[phase]}。`),
  };
}

function expireOrdersForDay(state: GameState, content: GameContent, day: number): GameState {
  const expired = (state.activeOrders ?? []).filter(
    (order) => order.status === 'active' && order.expiresDay !== undefined && order.expiresDay < day,
  );
  if (expired.length === 0) return state;
  const expiredIds = new Set(expired.map((order) => order.id));
  const flags = new Set(state.flags);
  for (const order of expired) {
    flags.add(`order-expired:${order.id}`);
    if (order.orderKind && order.orderKind !== 'npc') flags.add(`${order.orderKind}-order-expired:${order.npcId}`);
    if ((order.depositCoin ?? 0) > 0) flags.add(`deposit-forfeited:${order.npcId}`);
    if (order.orderKind === 'credit') flags.add(`credit-default:${order.npcId}`);
    if (order.sourceHomeVisitRecordId) flags.add(`homevisit-order-expired:${order.sourceHomeVisitRecordId}`);
    if (order.sourceHomeVisitChoiceId) flags.add(`homevisit-referral-expired:${order.sourceHomeVisitChoiceId}`);
  }
  const withExpired = {
    ...state,
    activeOrders: (state.activeOrders ?? []).map((order) =>
      expiredIds.has(order.id) ? { ...order, status: 'expired' as const } : order,
    ),
    flags: [...flags],
  };
  return expired.reduce(
    (next, order) => {
      const depositNote = (order.depositCoin ?? 0) > 0 ? `押金 ${order.depositCoin} 文不退，` : '';
      const creditNote = order.orderKind === 'credit' ? '票号信用受损，' : '';
      const logged = {
        ...next,
        log: pushLog(
          next.log,
          `「${order.title}」已过交期，${depositNote}${creditNote}${resourceName(content, order.resourceId)}订单作废。`,
        ),
      };
      if (order.orderKind !== 'consignment' && order.orderKind !== 'credit') return logged;
      const npc = (content.npcs ?? []).find((item) => item.id === order.npcId);
      return grantRegionReputation(
        logged,
        content,
        order.regionId ?? npc?.regionId ?? state.currentRegion,
        -2,
        `订单失约「${order.title}」`,
      );
    },
    withExpired,
  );
}

function stableTextHash(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) hash = (hash * 31 + value.charCodeAt(i)) % 1000003;
  return hash;
}

function routePressureDelta(risk: number): number {
  if (risk >= 54) return -4;
  if (risk >= 44) return -2;
  if (risk <= 18) return 1;
  return 0;
}

function routeSupplyResource(state: GameState, content: GameContent, route: RouteSpec): string | null {
  const regions = content.regions ?? [];
  const fromReputation = regionReputationOf(state, route.fromRegionId);
  const toReputation = regionReputationOf(state, route.toRegionId);
  const strainedRegionId = fromReputation <= toReputation ? route.fromRegionId : route.toRegionId;
  const strainedRegion = regions.find((region) => region.id === strainedRegionId);
  const candidates = strainedRegion?.localResources ?? [];
  return candidates.find((resourceId) => (state.resources[resourceId] ?? 0) > 0) ?? candidates[0] ?? null;
}

function workshopUpkeepCost(upgrade: WorkshopUpgradeDef): ResourcePool {
  if (upgrade.upkeep) return upgrade.upkeep;
  return upgrade.tier <= 1 ? { coin: 1 } : { coin: 2, labor: 1 };
}

function missingResourcesFromPool(resources: ResourcePool, cost: ResourcePool | undefined) {
  return Object.entries(cost ?? {})
    .filter(([, amount]) => amount > 0)
    .filter(([resourceId, amount]) => (resources[resourceId] ?? 0) < amount);
}

function canPayFromPool(resources: ResourcePool, cost: ResourcePool | undefined) {
  return missingResourcesFromPool(resources, cost).length === 0;
}

function deductResourceCost(resources: ResourcePool, cost: ResourcePool | undefined): ResourcePool {
  const next = { ...resources };
  for (const [resourceId, amount] of Object.entries(cost ?? {})) {
    if (amount > 0) next[resourceId] = (next[resourceId] ?? 0) - amount;
  }
  return next;
}

function settleWorkshopMaintenance(
  state: GameState,
  content: GameContent,
  resources: ResourcePool,
): {
  resources: ResourcePool;
  workshopUpgrades: GameState['workshopUpgrades'];
  logs: string[];
  flags: string[];
  craftMetrics: Record<string, Partial<Metrics>>;
} {
  const defs = new Map((content.workshopUpgrades ?? []).map((upgrade) => [upgrade.id, upgrade]));
  let nextResources = { ...resources };
  const logs: string[] = [];
  const flags = new Set(state.flags);
  const craftMetrics: Record<string, Partial<Metrics>> = {};
  const workshopUpgrades = (state.workshopUpgrades ?? []).map((record) => {
    const def = defs.get(record.id);
    if (!def) return record;
    const upkeep = workshopUpkeepCost(def);
    const costLabel = resourceCostLabel(content, upkeep);
    if (canPayFromPool(nextResources, upkeep)) {
      nextResources = deductResourceCost(nextResources, upkeep);
      logs.push(`工坊维护「${record.title}」支出 ${costLabel}，器具与账册照常运转。`);
      return {
        ...record,
        maintenancePaid: (record.maintenancePaid ?? 0) + 1,
        lastMaintainedTurn: state.turn + 1,
      };
    }

    const missing = missingResourcesFromPool(nextResources, upkeep)
      .map(([resourceId, amount]) => `${resourceName(content, resourceId)}×${amount}`)
      .join('、');
    flags.add(`workshop-maintenance-missed:${record.id}`);
    flags.add(`workshop-maintenance-missed-craft:${record.craftId}`);
    craftMetrics[record.craftId] = mergeMetricDelta(craftMetrics[record.craftId] ?? {}, {
      market: -1,
      spirit: -1,
    });
    logs.push(`工坊维护「${record.title}」缺 ${missing || costLabel}，本季样件整理与匠心口碑受挫。`);
    return {
      ...record,
      maintenanceMissed: (record.maintenanceMissed ?? 0) + 1,
      lastMissedTurn: state.turn + 1,
    };
  });
  return { resources: nextResources, workshopUpgrades, logs, flags: [...flags], craftMetrics };
}

function supplyCrisisSeverity(risk: number) {
  if (risk >= 72) return 3;
  if (risk >= 60) return 2;
  return 1;
}

function createSupplyCrisis(
  state: GameState,
  route: RouteSpec,
  risk: number,
  resourceId: string | null,
): PendingSupplyCrisis {
  const severity = supplyCrisisSeverity(risk);
  return {
    id: `supply-crisis-${route.id}-${state.turn + 1}-${state.calendar.day + 1}`,
    routeId: route.id,
    resourceId: resourceId ?? undefined,
    risk,
    severity,
    coinCost: Math.max(8, Math.round(8 + risk * 0.25 + severity * 4)),
    laborCost: severity + 1,
    createdDay: state.calendar.day + 1,
  };
}

function settleRoutePressure(
  state: GameState,
  content: GameContent,
  resources: ResourcePool,
): {
  resources: ResourcePool;
  routeStability: Record<string, number>;
  logs: string[];
  pendingSupplyCrisis: PendingSupplyCrisis | null;
} {
  const unlocked = new Set(state.unlockedRegions);
  let routeStability = { ...state.routeStability };
  let nextResources = { ...resources };
  const logs: string[] = [];
  let pendingSupplyCrisis: PendingSupplyCrisis | null = null;
  for (const route of allRouteSpecs(content)) {
    if (!unlocked.has(route.fromRegionId) || !unlocked.has(route.toRegionId)) continue;
    const risk = routeRiskScore({ ...state, routeStability }, route);
    const delta = routePressureDelta(risk);
    if (delta !== 0) routeStability = addRouteStability(routeStability, [route.id], delta);

    const roll = (state.seed + state.turn * 97 + stableTextHash(route.id)) % 100;
    if (risk < 52 || roll >= risk - 44) continue;
    const resourceId = routeSupplyResource(state, content, route);
    if (!pendingSupplyCrisis) {
      pendingSupplyCrisis = createSupplyCrisis(state, route, risk, resourceId);
      const resourceLabel = resourceId ? resourceName(content, resourceId) : '商路补给';
      logs.push(`「${route.name}」路况吃紧，${resourceLabel}出现断供苗头，需要先定下补救办法。`);
      continue;
    }
    if (!resourceId) {
      logs.push(`「${route.name}」路况吃紧，客商延误，市场人气受挫。`);
      continue;
    }
    nextResources = {
      ...nextResources,
      [resourceId]: Math.max(0, (nextResources[resourceId] ?? 0) - 1),
    };
    logs.push(`「${route.name}」路况吃紧，${resourceName(content, resourceId)}补给短少 1。`);
  }
  return { resources: nextResources, routeStability, logs, pendingSupplyCrisis };
}

/** 推进到下一回合：补给、抽事件、判定结局 */
function endTurn(state: GameState, content: GameContent): GameState {
  if (state.pendingEscortCrisis) {
    return { ...state, log: pushLog(state.log, '请先处理当前护商危机，再结束本季。') };
  }
  if (state.pendingSupplyCrisis) {
    return { ...state, log: pushLog(state.log, '请先处理当前断供危机，再结束本季。') };
  }
  if (state.pendingActivityStallClosing) {
    return { ...state, log: pushLog(state.log, '请先处理当前收灯夜选择，再结束本季。') };
  }
  if (state.pendingEvent) {
    return { ...state, log: pushLog(state.log, '请先处理当前事件，再结束这一季。') };
  }

  // 到达回合上限 → 结算
  if (state.turn >= state.maxTurns) {
    const report = generateReport(state, content);
    return {
      ...state,
      status: 'ended',
      report,
      log: pushLog(state.log, '岁月流转，百工镇的这段故事画上句点。'),
    };
  }

  // 资源补给 + 人力重置（开发者模式保持无限人力）
  const resources: ResourcePool = {
    ...state.resources,
    labor: state.devMode ? state.resources.labor : LABOR_PER_TURN,
  };
  for (const [key, amount] of Object.entries(TURN_RESOURCE_REGEN)) {
    resources[key] = (resources[key] ?? 0) + amount;
  }
  const routePressure = settleRoutePressure(state, content, resources);
  const workshopMaintenance = settleWorkshopMaintenance(state, content, routePressure.resources);

  // 抽取事件
  const rng = createRng(state.seed + state.turn * 1013);
  const event = routePressure.pendingSupplyCrisis ? null : weightedPick(content.events, rng);
  const seasonalLogs = [...routePressure.logs, ...workshopMaintenance.logs];
  const baseLog = seasonalLogs.reduce(
    (log, message) => pushLog(log, message),
    pushLog(state.log, `第 ${state.turn + 1} 季到来。`),
  );

  let next: GameState = {
    ...state,
    turn: state.turn + 1,
    calendar: createCalendar(state.calendar.day + 1, 'morning'),
    farmPlots: state.farmPlots.map((plot) =>
      plot.cropId
        ? {
            ...plot,
            growth: Math.min(
              100,
              plot.growth + (plot.wateredToday ? 34 : state.calendar.weather === 'rain' ? 30 : state.calendar.weather === 'snow' ? 10 : 18),
            ),
            wateredToday: false,
          }
        : { ...plot, wateredToday: false },
    ),
    resources: workshopMaintenance.resources,
    routeStability: routePressure.routeStability,
    workshopUpgrades: workshopMaintenance.workshopUpgrades,
    flags: workshopMaintenance.flags,
    seed: rng.seed,
    pendingEvent: event ?? null,
    pendingSupplyCrisis: routePressure.pendingSupplyCrisis,
    log: baseLog,
  };
  if (Object.keys(workshopMaintenance.craftMetrics).length > 0) {
    next = applyEffect(next, { craftMetrics: workshopMaintenance.craftMetrics });
  }
  next = expireOrdersForDay(next, content, next.calendar.day);
  next = settleSupplyCrisisFollowUps(next, content);

  // 危机判定：任一镇级数值跌至冰点
  const crisisKey = METRIC_KEYS.find((k) => next.metrics[k] <= 5);
  if (crisisKey) {
    const report = generateReport(next, content);
    next = {
      ...next,
      status: 'ended',
      report,
      log: pushLog(next.log, `${METRIC_LABELS[crisisKey]}跌至谷底，百工镇陷入危机。`),
    };
  }

  return next;
}

/** 在当前地区运行一项基础产业：消耗原料+人力，产出半成品（受 quality 缩放） */
function gatherResource(
  state: GameState,
  content: GameContent,
  industryId: string,
  quality: number,
): GameState {
  const industries = content.industries ?? [];
  const regions = content.regions ?? [];
  const industry = industries.find((i) => i.id === industryId);
  if (!industry) return state;

  // 校验：该产业需在当前地区可用（显式列入 industries，或为本地特产的采集业）
  const region = regions.find((r) => r.id === state.currentRegion);
  if (region) {
    const isHarvest = isHarvestIndustry(industry);
    const allowed =
      region.industries.includes(industryId) ||
      (isHarvest && region.localResources.includes(industry.output));
    if (!allowed) {
      return {
        ...state,
        log: pushLog(state.log, `本地（${region.name}）不具备「${industry.name}」的条件。`),
      };
    }
  }

  // 校验小地区作用域：大地区具备该产业，不代表当前街区/工坊点开放。
  if (region) {
    const subregionSpec = content.subregionContent?.find(
      (entry) => entry.regionId === state.currentRegion && entry.subregionId === state.currentSubregion,
    );
    if (subregionSpec && !subregionSpec.industryIds.includes(industryId)) {
      const subregionName =
        region.subregions.find((subregion) => subregion.id === state.currentSubregion)?.name ?? state.currentSubregion;
      return {
        ...state,
        log: pushLog(state.log, `「${subregionName}」暂不能进行「${industry.name}」，请前往对应的工坊或资源点。`),
      };
    }
  }

  // 校验人力
  if ((state.resources.labor ?? 0) < industry.laborCost) {
    return {
      ...state,
      log: pushLog(state.log, `人力不足，无法进行「${industry.name}」（需 ${industry.laborCost} 工时）。`),
    };
  }
  // 校验输入原料
  for (const [key, amount] of Object.entries(industry.input)) {
    if ((state.resources[key] ?? 0) < amount) {
      return {
        ...state,
        log: pushLog(state.log, `原料不足，无法进行「${industry.name}」（缺 ${key}）。`),
      };
    }
  }

  // 结算：扣除输入与人力，按 quality 与天气决定产量（露天采集受天气修正）
  const weatherEffect = gatherWeatherEffect(industry, state.calendar.weather);
  const q = clampQuality(quality + weatherEffect.qualityDelta);
  const produced = Math.max(1, Math.round(industry.yield * (1 + q)) + weatherEffect.producedBonus);
  const resources: ResourcePool = {
    ...state.resources,
    labor: state.resources.labor - industry.laborCost,
  };
  for (const [key, amount] of Object.entries(industry.input)) {
    resources[key] = (resources[key] ?? 0) - amount;
  }
  resources[industry.output] = (resources[industry.output] ?? 0) + produced;
  const itemInstancesAfterCost = consumeItemInstances(state.itemInstances, industry.input);
  const itemInstance = createItemInstance(
    state,
    content,
    industry.output,
    undefined,
    q,
    ['resource', industry.id, industry.miniGame],
    { sourceIndustryId: industry.id },
  );

  return applyProfileXp({
    ...state,
    resources,
    itemInstances: [itemInstance, ...itemInstancesAfterCost].slice(0, 80),
    log: pushLog(
      pushLog(state.log, itemInstance.appraisal),
      `「${industry.name}」产出 ${produced} 份${q >= 0.8 ? '上品' : ''}。${weatherEffect.note}`,
    ),
  }, { stamina: 1, knowledge: isHarvestIndustry(industry) ? 1 : 0 });
}

function isFarmSubregion(state: GameState, content: GameContent): boolean {
  const region = (content.regions ?? []).find((r) => r.id === state.currentRegion);
  const subregion = region?.subregions.find((s) => s.id === state.currentSubregion);
  return Boolean(subregion?.traits.includes('种植') || subregion?.id.includes('baigongyuan'));
}

function plantCrop(state: GameState, content: GameContent, plotId: string, cropId: CropId): GameState {
  if (!isFarmSubregion(state, content)) {
    return { ...state, log: pushLog(state.log, '要回到带田圃的家园小地区，才能下种。') };
  }
  const crop = CROP_OUTPUT[cropId];
  const plot = state.farmPlots.find((item) => item.id === plotId);
  if (!plot) return state;
  if (plot.cropId) return { ...state, log: pushLog(state.log, '这块田圃已经种下东西了。') };
  return {
    ...state,
    farmPlots: state.farmPlots.map((item) =>
      item.id === plotId
        ? { ...item, cropId, plantedDay: state.calendar.day, growth: 0, wateredToday: false }
        : item,
    ),
    log: pushLog(state.log, `在田圃里种下${crop.name}，等它慢慢长成。`),
  };
}

function waterPlot(state: GameState, content: GameContent, plotId: string): GameState {
  if (!isFarmSubregion(state, content)) {
    return { ...state, log: pushLog(state.log, '要回到百工院田圃边，才能浇水照料。') };
  }
  const plot = state.farmPlots.find((item) => item.id === plotId);
  if (!plot?.cropId) return { ...state, log: pushLog(state.log, '空田圃不用浇水。') };
  if (plot.wateredToday) return { ...state, log: pushLog(state.log, '这块田圃今日已经浇过水。') };
  if (state.calendar.weather === 'snow') {
    return { ...state, log: pushLog(state.log, '雪天封土，今日不宜再给田圃浇水。') };
  }
  const rainWatering = state.calendar.weather === 'rain';
  if (!rainWatering && (state.resources.labor ?? 0) < WATER_LABOR_COST) {
    return { ...state, log: pushLog(state.log, '工时不足，今日顾不上田圃了。') };
  }
  return applyProfileXp({
    ...state,
    resources: rainWatering
      ? state.resources
      : { ...state.resources, labor: (state.resources.labor ?? 0) - WATER_LABOR_COST },
    farmPlots: state.farmPlots.map((item) =>
      item.id === plotId
        ? { ...item, wateredToday: true, growth: Math.min(100, item.growth + (rainWatering ? 10 : 8)) }
        : item,
    ),
    log: pushLog(state.log, rainWatering ? '雨水替你润田，苗势更稳，且未耗工时。' : '给田圃浇了水，苗势稳了些。'),
  }, { stamina: 1, mind: 1 });
}

function harvestCrop(state: GameState, content: GameContent, plotId: string): GameState {
  if (!isFarmSubregion(state, content)) {
    return { ...state, log: pushLog(state.log, '要回到田圃边，才能收获作物。') };
  }
  const plot = state.farmPlots.find((item) => item.id === plotId);
  if (!plot?.cropId) return { ...state, log: pushLog(state.log, '这块田圃还没有作物。') };
  if (plot.growth < 100) return { ...state, log: pushLog(state.log, '作物还没成熟，再照料几日。') };
  const crop = cropHarvestOutcome(plot.cropId, state.calendar.season, state.calendar.weather);
  const itemInstance = createItemInstance(
    state,
    content,
    crop.resourceId,
    undefined,
    crop.quality,
    ['farming', plot.cropId],
  );
  return applyProfileXp({
    ...state,
    resources: {
      ...state.resources,
      [crop.resourceId]: (state.resources[crop.resourceId] ?? 0) + crop.amount,
    },
    farmPlots: state.farmPlots.map((item) =>
      item.id === plotId
        ? { ...item, cropId: null, plantedDay: null, growth: 0, wateredToday: false }
        : item,
    ),
    itemInstances: [itemInstance, ...state.itemInstances].slice(0, 80),
    log: pushLog(pushLog(state.log, itemInstance.appraisal), `收下${crop.name}，入仓 ${crop.amount} 份${crop.note}。`),
  }, { stamina: 1, knowledge: 1 });
}

function activityAffinityGain(activity: ActivityDef, quality: number) {
  if (activity.reward.npcAffinity !== undefined) return activity.reward.npcAffinity;
  const baseByKind: Record<ActivityDef['kind'], number> = {
    resource: 2,
    workshop: 3,
    training: 5,
    trade: 4,
    life: 3,
    festival: 4,
    route: 5,
  };
  const qualityBonus = quality >= 0.85 ? 3 : quality >= 0.65 ? 1 : quality < 0.5 ? -1 : 0;
  return Math.max(1, baseByKind[activity.kind] + qualityBonus);
}

function activityReputationGain(activity: ActivityDef, quality: number) {
  const baseByKind: Record<ActivityDef['kind'], number> = {
    resource: 1,
    workshop: 2,
    training: 2,
    trade: 3,
    life: 2,
    festival: 3,
    route: 4,
  };
  const qualityBonus = quality >= 0.85 ? 2 : quality >= 0.65 ? 1 : quality < 0.5 ? -1 : 0;
  return Math.max(1, baseByKind[activity.kind] + qualityBonus);
}

function regionNameFor(content: GameContent, regionId: string) {
  return (content.regions ?? []).find((region) => region.id === regionId)?.name ?? regionId;
}

function grantRegionReputation(
  state: GameState,
  content: GameContent,
  regionId: string | undefined,
  amount: number,
  reason: string,
): GameState {
  if (!regionId || amount === 0) return state;
  const before = regionReputationOf(state, regionId);
  const regionReputation = addRegionReputation(state.regionReputation, regionId, amount);
  const after = regionReputation[regionId] ?? before;
  const next = { ...state, regionReputation };
  if (after === before) return next;
  return {
    ...next,
    log: pushLog(next.log, `${regionNameFor(content, regionId)}声望 ${before}→${after}（${reason}）。`),
  };
}

function routeStabilityGainByActivity(activity: ActivityDef, quality: number) {
  const base = activity.kind === 'route' ? 8 : activity.kind === 'trade' ? 5 : 3;
  const qualityBonus = quality >= 0.85 ? 3 : quality >= 0.65 ? 1 : quality < 0.5 ? -2 : 0;
  return Math.max(1, base + qualityBonus);
}

function grantRouteStability(
  state: GameState,
  content: GameContent,
  routeIds: Iterable<string> | undefined,
  amount: number,
  reason: string,
): GameState {
  const uniqueRouteIds = [...new Set(routeIds ?? [])].filter(Boolean);
  if (uniqueRouteIds.length === 0 || amount === 0) return state;
  const before = routeStabilityOf(state, uniqueRouteIds[0]);
  const routeStability = addRouteStability(state.routeStability, uniqueRouteIds, amount);
  const after = routeStabilityOf({ routeStability }, uniqueRouteIds[0]);
  const next = { ...state, routeStability };
  if (after === before) return next;
  const names = routeNamesForIds(content, uniqueRouteIds).slice(0, 2).join('、');
  return {
    ...next,
    log: pushLog(next.log, `${names}稳定 ${before}→${after}（${reason}）。`),
  };
}

function routeNamesForIds(content: GameContent, routeIds: string[] | undefined) {
  return [...new Set(routeIds ?? [])].map((routeId) => routeNameForId(content, routeId));
}

function activityOrderKind(activity: ActivityDef): ActiveOrder['orderKind'] {
  if (activity.kind === 'festival') return 'festival';
  if (activity.kind === 'route' || activity.kind === 'trade') return 'route';
  return 'npc';
}

function generatedOrderDayAvailable(state: GameState, activity: ActivityDef) {
  const cycle = activity.reward.generatedOrder?.dayCycle;
  if (!cycle) return { available: true, note: '' };
  const cycleDays = Math.max(1, cycle.cycleDays);
  const offset = Math.max(1, cycle.offset);
  const available = ((state.calendar.day - offset) % cycleDays + cycleDays) % cycleDays === 0;
  return {
    available,
    note: available ? '' : `；今日不是「${cycle.label}」，只记灯市见闻，暂不添新单`,
  };
}

function activityGeneratedOrder(
  state: GameState,
  content: GameContent,
  activity: ActivityDef,
  quality: number,
): { state: GameState; note: string } {
  const generated = activity.reward.generatedOrder;
  if (!generated) return { state, note: '' };

  const dayGate = generatedOrderDayAvailable(state, activity);
  if (!dayGate.available) return { state, note: dayGate.note };

  const existing = (state.activeOrders ?? []).find(
    (order) => order.status === 'active' && order.sourceActivityId === activity.id && order.npcId === generated.npcId,
  );
  if (existing) {
    return { state, note: `；已有节令单「${existing.title}」未交付，先备齐货再来` };
  }

  const routeIds = generated.routeIds ?? [];
  const routeRisk = orderRouteRisk(state, content, routeIds);
  const reputation = regionReputationOf(state, activity.regionId);
  const qualityPremium = quality >= 0.85 ? 8 : quality >= 0.65 ? 4 : quality < 0.5 ? -2 : 0;
  const reputationPremium = Math.round(reputation * 0.08);
  const rewardCoin = Math.max(6, generated.rewardCoin + qualityPremium + reputationPremium);
  const orderKind = activityOrderKind(activity);
  const order: ActiveOrder = {
    id: `activity-order-${activity.id}-${state.calendar.day}-${state.turn}-${(state.activeOrders ?? []).length + 1}`,
    npcId: generated.npcId,
    title: generated.title,
    desc: `${generated.desc}限 ${generated.expiresIn} 日内交付。`,
    regionId: activity.regionId,
    resourceId: generated.resourceId,
    quantity: generated.quantity,
    minQuality: generated.minQuality,
    rewardCoin,
    rewardMetrics: generated.rewardMetrics ?? { market: 1, life: 1 },
    rewardAttributes: generated.rewardAttributes ?? { commerce: 1 },
    routeIds,
    routeRisk,
    reputationAtCreation: reputation,
    sourceActivityId: activity.id,
    orderKind,
    createdDay: state.calendar.day,
    expiresDay: state.calendar.day + generated.expiresIn,
    status: 'active',
  };

  const flags = new Set(state.flags);
  flags.add(`activity-order:${activity.id}`);
  flags.add(`${orderKind}-order:${activity.id}`);
  for (const flag of generated.flags ?? []) flags.add(flag);

  return {
    state: {
      ...state,
      flags: [...flags],
      activeOrders: [order, ...(state.activeOrders ?? [])].slice(0, 12),
    },
    note: `；添出节令单「${order.title}」，需 ${order.quantity} 份${resourceName(content, order.resourceId)}，限 ${generated.expiresIn} 日`,
  };
}

type ActivityStallCycleState = {
  active: boolean;
  label?: string;
  crowdBonus: number;
  revenueBonus: number;
  flags: string[];
};

type ActivityStallCandidate = {
  resourceId: string;
  itemId?: string;
  itemName: string;
  quality: number;
};

type ActivityStallComboResult = {
  combo: ActivityStallComboDef;
  consumedExtraResourceId?: string;
};

function activityStallStrategy(
  stall: ActivityStallDef,
  strategyId: string | undefined,
): ActivityStallStrategyDef | null {
  if (!strategyId) return null;
  return stall.strategies?.find((strategy) => strategy.id === strategyId) ?? null;
}

function activityStallCycleState(state: GameState, stall: ActivityStallDef): ActivityStallCycleState {
  const cycle = stall.dayCycle;
  if (!cycle) return { active: true, crowdBonus: 0, revenueBonus: 0, flags: [] };
  const cycleDays = Math.max(1, cycle.cycleDays);
  const offset = Math.max(1, cycle.offset);
  const active = ((state.calendar.day - offset) % cycleDays + cycleDays) % cycleDays === 0;
  return {
    active,
    label: active ? cycle.label : `${cycle.label}外`,
    crowdBonus: active ? cycle.crowdBonus ?? 0 : 0,
    revenueBonus: active ? cycle.revenueBonus ?? 0 : 0,
    flags: active ? cycle.flags ?? [] : [],
  };
}

function activityStallStage(
  stall: ActivityStallDef,
  priorRuns: number,
): ActivityStallStageDef | null {
  return [...(stall.stages ?? [])]
    .sort((a, b) => b.minRuns - a.minRuns)
    .find((stage) => priorRuns >= stage.minRuns) ?? null;
}

function isLastActivityStallStage(stall: ActivityStallDef, stage: ActivityStallStageDef | null) {
  if (!stage || !stall.stages?.length) return false;
  const last = [...stall.stages].sort((a, b) => b.minRuns - a.minRuns)[0];
  return last?.id === stage.id;
}

function createPendingActivityStallClosing(
  state: GameState,
  activity: ActivityDef,
  stall: ActivityStallDef,
  record: NightMarketStallRecord,
): PendingActivityStallClosing {
  return {
    id: `stall-closing-${activity.id}-${state.calendar.day}-${state.turn}`,
    activityId: activity.id,
    recordId: record.id,
    npcId: activity.npcId,
    regionId: activity.regionId,
    subregionId: activity.subregionId,
    stageId: record.stageId,
    stageTitle: record.stageTitle,
    stallTitle: stall.title,
    crowd: record.crowd,
    revenue: record.revenue,
    createdDay: state.calendar.day,
  };
}

function shouldCreateActivityStallClosing(
  state: GameState,
  activity: ActivityDef,
  stall: ActivityStallDef,
  stage: ActivityStallStageDef | null,
) {
  return Boolean(
    isLastActivityStallStage(stall, stage) &&
      stall.closingChoices?.length &&
      !state.pendingActivityStallClosing &&
      !state.flags.includes(`stall-closing-resolved:${activity.id}`),
  );
}

function itemInstanceDisplayName(content: GameContent, item: ItemInstance) {
  return item.displayName ?? resourceName(content, item.resourceId);
}

function activityStallCandidate(
  state: GameState,
  content: GameContent,
  stall: ActivityStallDef,
): ActivityStallCandidate | null {
  const stockIds = new Set(stall.stockResourceIds);
  const minQuality = stall.minQuality ?? 0;
  const trackedForStock = state.itemInstances.filter(
    (item) =>
      stockIds.has(item.resourceId) &&
      (item.status ?? 'held') === 'held' &&
      (state.resources[item.resourceId] ?? 0) > 0,
  );
  const trackedResourceIds = new Set(trackedForStock.map((item) => item.resourceId));
  const tracked = trackedForStock
    .filter((item) => item.quality >= minQuality)
    .sort((a, b) => b.quality - a.quality || a.createdTurn - b.createdTurn)[0];
  if (tracked) {
    return {
      resourceId: tracked.resourceId,
      itemId: tracked.id,
      itemName: itemInstanceDisplayName(content, tracked),
      quality: tracked.quality,
    };
  }

  const resourceId = stall.stockResourceIds.find(
    (candidate) => (state.resources[candidate] ?? 0) > 0 && !trackedResourceIds.has(candidate),
  );
  if (!resourceId) return null;
  return {
    resourceId,
    itemName: resourceName(content, resourceId),
    quality: Number(Math.max(minQuality, 0.52).toFixed(2)),
  };
}

function activityStallComboCandidate(
  state: GameState,
  combo: ActivityStallComboDef,
  candidate: ActivityStallCandidate,
): ActivityStallComboResult | null {
  if (!combo.resourceIds.includes(candidate.resourceId)) return null;
  const matched = combo.resourceIds.filter((resourceId) => (state.resources[resourceId] ?? 0) > 0);
  if (matched.length < (combo.minMatched ?? 2)) return null;
  const consumedExtraResourceId = combo.consumeExtra
    ? combo.resourceIds.find((resourceId) => resourceId !== candidate.resourceId && (state.resources[resourceId] ?? 0) > 0)
    : undefined;
  return { combo, consumedExtraResourceId };
}

function activityStallCombo(
  state: GameState,
  stall: ActivityStallDef,
  candidate: ActivityStallCandidate | null,
  preferredComboId?: string,
): ActivityStallComboResult | null {
  if (!candidate) return null;
  const combos = stall.combos ?? [];
  const preferred = preferredComboId ? combos.find((combo) => combo.id === preferredComboId) : undefined;
  if (preferred) {
    const result = activityStallComboCandidate(state, preferred, candidate);
    if (result) return result;
  }
  for (const combo of combos) {
    if (combo.id === preferredComboId) continue;
    const result = activityStallComboCandidate(state, combo, candidate);
    if (result) return result;
  }
  return null;
}

function activityStallCustomerScore(
  customer: ActivityStallCustomerDef,
  candidate: ActivityStallCandidate | null,
  combo: ActivityStallComboResult | null,
) {
  let score = (customer.crowdBonus ?? 0) + (customer.revenueBonus ?? 0) * 0.1;
  if (candidate && customer.preferredResourceIds?.includes(candidate.resourceId)) score += 24;
  if (combo && customer.preferredComboIds?.includes(combo.combo.id)) score += 32;
  return score;
}

function activityStallCustomer(
  stall: ActivityStallDef,
  candidate: ActivityStallCandidate | null,
  combo: ActivityStallComboResult | null,
  preferredCustomerId?: string,
): ActivityStallCustomerDef | null {
  const customers = stall.customers ?? [];
  const preferred = preferredCustomerId
    ? customers.find((customer) => customer.id === preferredCustomerId)
    : undefined;
  if (preferred) return preferred;
  return [...customers]
    .sort((a, b) =>
      activityStallCustomerScore(b, candidate, combo) - activityStallCustomerScore(a, candidate, combo) ||
      a.id.localeCompare(b.id),
    )[0] ?? null;
}

function activityStallCrowd(
  state: GameState,
  activity: ActivityDef,
  stall: ActivityStallDef,
  candidate: ActivityStallCandidate | null,
  cycle: ActivityStallCycleState,
  quality: number,
  combo: ActivityStallComboResult | null,
  customer: ActivityStallCustomerDef | null,
  strategy: ActivityStallStrategyDef | null,
) {
  const reputation = regionReputationOf(state, activity.regionId);
  const base = stall.crowdBase ?? 16;
  const itemBonus = candidate ? quality * 34 : -8;
  const peopleBonus = (state.profile.attributes.people ?? 0) * 0.75;
  return Math.max(
    0,
    Math.round(
      base +
        itemBonus +
        peopleBonus +
        reputation * 0.2 +
        cycle.crowdBonus +
        (combo?.combo.crowdBonus ?? 0) +
        (customer?.crowdBonus ?? 0) +
        (strategy?.crowdBonus ?? 0),
    ),
  );
}

function activityStallRevenue(
  state: GameState,
  content: GameContent,
  activity: ActivityDef,
  stall: ActivityStallDef,
  candidate: ActivityStallCandidate,
  cycle: ActivityStallCycleState,
  combo: ActivityStallComboResult | null,
  customer: ActivityStallCustomerDef | null,
  strategy: ActivityStallStrategyDef | null,
) {
  const resourceValue = content.resources?.find((resource) => resource.id === candidate.resourceId)?.value ?? 12;
  const reputation = regionReputationOf(state, activity.regionId);
  const qualityFactor = 0.7 + candidate.quality * 0.85;
  return Math.max(
    1,
    Math.round(
      stall.baseRevenue +
        resourceValue * qualityFactor +
        (state.profile.attributes.commerce ?? 0) * 0.45 +
        reputation * 0.12 +
        cycle.revenueBonus +
        (combo?.combo.revenueBonus ?? 0) +
        (customer?.revenueBonus ?? 0) +
        (strategy?.revenueBonus ?? 0),
    ),
  );
}

function applyActivityStall(
  state: GameState,
  content: GameContent,
  activity: ActivityDef,
  quality: number,
  stallStrategyId?: string,
): { state: GameState; note: string } {
  const stall = activity.reward.stall;
  if (!stall) return { state, note: '' };

  const strategy = activityStallStrategy(stall, stallStrategyId);
  const priorRuns = (state.nightMarketStallRecords ?? []).filter(
    (record) => record.activityId === activity.id,
  ).length;
  const stage = activityStallStage(stall, priorRuns);
  const cycle = activityStallCycleState(state, stall);
  const candidate = activityStallCandidate(state, content, stall);
  const combo = activityStallCombo(state, stall, candidate, strategy?.preferredComboId);
  const customer = activityStallCustomer(stall, candidate, combo, strategy?.preferredCustomerId);
  const crowd = activityStallCrowd(
    state,
    activity,
    stall,
    candidate,
    cycle,
    candidate?.quality ?? quality,
    combo,
    customer,
    strategy,
  );
  const revenue = candidate ? activityStallRevenue(state, content, activity, stall, candidate, cycle, combo, customer, strategy) : 0;
  const flags = new Set(state.flags);
  flags.add(`night-stall:${activity.id}`);
  flags.add(candidate ? `night-stall-sale:${activity.id}` : `night-stall-empty:${activity.id}`);
  if (activity.kind === 'festival') flags.add(`festival-stall:${activity.id}`);
  if (candidate) flags.add(`night-stall-resource:${candidate.resourceId}`);
  if (combo) {
    flags.add(`stall-combo:${activity.id}:${combo.combo.id}`);
    for (const flag of combo.combo.flags ?? []) flags.add(flag);
  }
  if (customer) {
    flags.add(`stall-customer:${activity.id}:${customer.id}`);
    for (const flag of customer.flags ?? []) flags.add(flag);
  }
  if (strategy) {
    flags.add(`stall-strategy:${activity.id}:${strategy.id}`);
    for (const flag of strategy.flags ?? []) flags.add(flag);
  }
  for (const flag of cycle.flags) flags.add(flag);
  for (const flag of stall.flags ?? []) flags.add(flag);
  if (stage) {
    flags.add(`stall-stage:${activity.id}:${stage.id}`);
    for (const flag of stage.flags ?? []) flags.add(flag);
    if (isLastActivityStallStage(stall, stage)) flags.add(`stall-chain-completed:${activity.id}`);
  }

  const resources: ResourcePool = {
    ...state.resources,
    coin: (state.resources.coin ?? 0) + revenue,
  };
  if (candidate) resources[candidate.resourceId] = Math.max(0, (resources[candidate.resourceId] ?? 0) - 1);
  if (combo?.consumedExtraResourceId) {
    resources[combo.consumedExtraResourceId] = Math.max(0, (resources[combo.consumedExtraResourceId] ?? 0) - 1);
  }

  const soldText = candidate
    ? `灯下售出「${candidate.itemName}」，人气 ${crowd}，入账 ${revenue} 文。`
    : '灯谜有人围听，但摊面暂无可售作品，只记下客流和来客口味。';
  const comboText = combo
    ? `摊位组合「${combo.combo.title}」：${combo.combo.desc}${combo.consumedExtraResourceId ? `，另用${resourceName(content, combo.consumedExtraResourceId)}` : ''}。`
    : '';
  const customerText = customer ? `本轮主客群「${customer.title}」：${customer.desc}` : '';
  const strategyText = strategy ? `摊位策略「${strategy.title}」：${strategy.desc}` : '';
  const stageText = stage ? `${stage.title}：${stage.summary}` : '';
  const summary = [soldText, strategyText, comboText, customerText, stageText].filter(Boolean).join(' ');
  const record = {
    id: `stall-${activity.id}-${state.calendar.day}-${state.turn}-${priorRuns + 1}`,
    activityId: activity.id,
    npcId: activity.npcId,
    regionId: activity.regionId,
    subregionId: activity.subregionId,
    title: stall.title,
    day: state.calendar.day,
    phase: state.calendar.phase,
    cycleLabel: cycle.label,
    stageId: stage?.id,
    stageTitle: stage?.title,
    strategyId: strategy?.id,
    strategyTitle: strategy?.title,
    customerId: customer?.id,
    customerTitle: customer?.title,
    comboId: combo?.combo.id,
    comboTitle: combo?.combo.title,
    consumedExtraResourceId: combo?.consumedExtraResourceId,
    consumedExtraResourceName: combo?.consumedExtraResourceId ? resourceName(content, combo.consumedExtraResourceId) : undefined,
    itemResourceId: candidate?.resourceId,
    itemName: candidate?.itemName,
    itemQuality: candidate?.quality,
    crowd,
    revenue,
    summary,
  };
  const pendingActivityStallClosing = shouldCreateActivityStallClosing(state, activity, stall, stage)
    ? createPendingActivityStallClosing(state, activity, stall, record)
    : state.pendingActivityStallClosing;

  let next: GameState = {
    ...state,
    resources,
    flags: [...flags],
    pendingActivityStallClosing,
    itemInstances: candidate?.itemId
      ? state.itemInstances.filter((item) => item.id !== candidate.itemId)
      : state.itemInstances,
    nightMarketStallRecords: [record, ...(state.nightMarketStallRecords ?? [])].slice(0, 36),
  };

  if (activity.npcId) {
    const runtime = next.npcStates[activity.npcId] ?? emptyNpcState();
    const knownTopics = new Set(runtime.knownTopics);
    knownTopics.add('night-market-stall');
    knownTopics.add(`stall:${activity.id}`);
    if (candidate) knownTopics.add(`stall-resource:${candidate.resourceId}`);
    if (combo) knownTopics.add(`stall-combo:${combo.combo.id}`);
    if (customer) knownTopics.add(`stall-customer:${customer.id}`);
    if (strategy) knownTopics.add(`stall-strategy:${strategy.id}`);
    for (const topic of stall.topics ?? []) knownTopics.add(topic);
    for (const topic of stage?.topics ?? []) knownTopics.add(topic);
    for (const topic of combo?.combo.topics ?? []) knownTopics.add(topic);
    for (const topic of customer?.topics ?? []) knownTopics.add(topic);
    for (const topic of strategy?.topics ?? []) knownTopics.add(topic);
    const currentAffinity = runtime.affinity || next.npcAffinity[activity.npcId] || 0;
    const affinityBonus = candidate ? 2 : 1;
    const nextAffinity = Math.min(AFFINITY_MAX, currentAffinity + affinityBonus);
    next = {
      ...next,
      npcAffinity: { ...next.npcAffinity, [activity.npcId]: nextAffinity },
      npcStates: {
        ...next.npcStates,
        [activity.npcId]: {
          ...runtime,
          affinity: nextAffinity,
          stage: relationshipStageForAffinity(nextAffinity),
          lastTalkTurn: next.turn,
          knownTopics: [...knownTopics],
          revealedIntelIds: runtime.revealedIntelIds ?? [],
          usedFunctionDays: runtime.usedFunctionDays ?? {},
        },
      },
    };
  }

  const metricDelta = mergeNumberDeltas(stall.metrics, stage?.metrics, combo?.combo.metrics, customer?.metrics, strategy?.metrics) as Partial<Metrics>;
  if (Object.keys(metricDelta).length > 0) next = applyEffect(next, { metrics: metricDelta });
  const attributeDelta = mergeNumberDeltas(
    stall.attributes as Partial<Record<PlayerAttributeKey, number>> | undefined,
    stage?.attributes as Partial<Record<PlayerAttributeKey, number>> | undefined,
    combo?.combo.attributes as Partial<Record<PlayerAttributeKey, number>> | undefined,
    customer?.attributes as Partial<Record<PlayerAttributeKey, number>> | undefined,
    strategy?.attributes as Partial<Record<PlayerAttributeKey, number>> | undefined,
  );
  next = applyProfileXp(next, attributeDelta);
  const reputationDelta =
    (stall.regionReputationDelta ?? 0) +
    (stage?.regionReputationDelta ?? 0) +
    (combo?.combo.regionReputationDelta ?? 0) +
    (customer?.regionReputationDelta ?? 0) +
    (strategy?.regionReputationDelta ?? 0) +
    (candidate ? 1 : 0);
  next = grantRegionReputation(next, content, activity.regionId, reputationDelta, `经营「${stall.title}」`);

  const note = candidate
    ? `；${stall.title}售出「${candidate.itemName}」，夜市人气 ${crowd}，另入 ${revenue} 文${strategy ? `，走「${strategy.title}」` : ''}${combo ? `，成「${combo.combo.title}」` : ''}${customer ? `，主客为「${customer.title}」` : ''}`
    : `；${stall.title}已开摊，但暂无可售作品`;
  return { state: next, note: stage ? `${note}；${stage.title}` : note };
}

function canPayResourceCost(state: GameState, cost: ResourcePool | undefined) {
  return Object.entries(cost ?? {}).every(([key, amount]) => (state.resources[key] ?? 0) >= amount);
}

function resourceCostShortage(state: GameState, content: GameContent, cost: ResourcePool | undefined) {
  const shortage = Object.entries(cost ?? {}).find(([key, amount]) => (state.resources[key] ?? 0) < amount);
  return shortage ? resourceName(content, shortage[0]) : null;
}

function closingChoiceResourceDelta(choice: ActivityStallClosingChoiceDef): ResourcePool | undefined {
  const delta: ResourcePool = { ...(choice.resources ?? {}) };
  for (const [key, amount] of Object.entries(choice.resourceCost ?? {})) {
    delta[key] = (delta[key] ?? 0) - amount;
  }
  return Object.keys(delta).length ? delta : undefined;
}

function createActivityStallClosingFollowUpOrder(
  state: GameState,
  content: GameContent,
  activity: ActivityDef,
  pending: PendingActivityStallClosing,
  choice: ActivityStallClosingChoiceDef,
): GameState {
  const followUp = choice.followUpOrder;
  const npcId = followUp?.npcId ?? pending.npcId ?? activity.npcId;
  if (!followUp || !npcId) return state;

  const followUpFlag = `stall-closing-followup-order:${activity.id}:${choice.id}`;
  if (
    state.flags.includes(followUpFlag) ||
    (state.activeOrders ?? []).some((order) => order.status === 'active' && order.id.includes(followUpFlag))
  ) {
    return state;
  }

  const quantity = Math.max(1, Math.floor(followUp.quantity));
  const minQuality = Math.min(0.95, Math.max(0.35, Number(followUp.minQuality.toFixed(2))));
  const expiresIn = Math.max(1, followUp.expiresIn ?? 7);
  const routeIds = [...new Set(followUp.routeIds ?? [])];
  const orderKind = followUp.orderKind ?? (routeIds.length > 0 ? 'route' : 'festival');
  const reputation = regionReputationOf(state, pending.regionId);
  const crowdPremium = Math.min(10, Math.floor(pending.crowd / 20));
  const revenuePremium = Math.min(10, Math.floor(pending.revenue / 24));
  const reputationPremium = Math.round(reputation * 0.08);
  const rewardCoin = Math.max(6, followUp.rewardCoin + crowdPremium + revenuePremium + reputationPremium);
  const order: ActiveOrder = {
    id: `stall-closing-order-${activity.id}-${choice.id}-${state.calendar.day}-${state.turn}-${(state.activeOrders ?? []).length + 1}`,
    npcId,
    title: followUp.title,
    desc: `${followUp.desc} 收灯记载：「${choice.title}」。需 ${quantity} 份${resourceName(content, followUp.resourceId)}，品相不低于 ${Math.round(minQuality * 100)}，限 ${expiresIn} 日内交付。`,
    regionId: pending.regionId,
    resourceId: followUp.resourceId,
    quantity,
    minQuality,
    rewardCoin,
    rewardMetrics: followUp.rewardMetrics ?? { market: 1, life: 1 },
    rewardAttributes: followUp.rewardAttributes ?? { commerce: 1, people: 1 },
    routeIds,
    routeRisk: orderRouteRisk(state, content, routeIds),
    reputationAtCreation: reputation,
    sourceActivityId: activity.id,
    orderKind,
    createdDay: state.calendar.day,
    expiresDay: state.calendar.day + expiresIn,
    status: 'active',
  };

  const flags = new Set(state.flags);
  flags.add(followUpFlag);
  flags.add(`stall-closing-followup:${choice.id}`);
  flags.add(`${orderKind}-order:${activity.id}`);
  for (const flag of followUp.flags ?? []) flags.add(flag);

  let next: GameState = {
    ...state,
    flags: [...flags],
    activeOrders: [order, ...(state.activeOrders ?? [])].slice(0, 12),
    log: pushLog(state.log, `收灯后续登记「${order.title}」，需 ${order.quantity} 份${resourceName(content, order.resourceId)}，限 ${expiresIn} 日。`),
  };
  next = grantRegionReputation(
    next,
    content,
    pending.regionId,
    followUp.regionReputationDelta ?? 1,
    `收灯后续「${order.title}」`,
  );
  return next;
}

function resolveActivityStallClosing(state: GameState, content: GameContent, choiceId: string): GameState {
  const pending = state.pendingActivityStallClosing;
  if (!pending) return state;
  const activity = (content.activities ?? []).find((item) => item.id === pending.activityId);
  const stall = activity?.reward.stall;
  if (!activity || !stall?.closingChoices?.length) {
    return {
      ...state,
      pendingActivityStallClosing: null,
      log: pushLog(state.log, '收灯数据已经失效，本次待处理事项已撤销。'),
    };
  }
  const choice = stall.closingChoices.find((item) => item.id === choiceId);
  if (!choice) return { ...state, log: pushLog(state.log, '请选择一条可执行的收灯处置。') };
  if (!canPayResourceCost(state, choice.resourceCost)) {
    return {
      ...state,
      log: pushLog(state.log, `收灯所需资源不足：${resourceCostShortage(state, content, choice.resourceCost) ?? '资源'}。`),
    };
  }

  const updatedRecords = (state.nightMarketStallRecords ?? []).map((record) =>
    record.id === pending.recordId
      ? {
          ...record,
          closingChoiceId: choice.id,
          closingChoiceTitle: choice.title,
          closingSummary: choice.summary,
          summary: `${record.summary} ${choice.summary}`,
        }
      : record,
  );
  let next: GameState = {
    ...state,
    pendingActivityStallClosing: null,
    nightMarketStallRecords: updatedRecords,
  };
  next = applyEffect(next, {
    resources: closingChoiceResourceDelta(choice),
    metrics: choice.metrics,
    setFlags: [
      'stall-closing-resolved',
      `stall-closing-resolved:${activity.id}`,
      `stall-closing-choice:${activity.id}:${choice.id}`,
      ...(choice.flags ?? []),
    ],
    logMessage: `收灯夜选择「${choice.title}」：${choice.summary}`,
  });
  next = applyProfileXp(next, profileXpFromAttributes(choice.attributes));
  next = grantRegionReputation(
    next,
    content,
    pending.regionId,
    choice.regionReputationDelta ?? 0,
    `收灯夜「${choice.title}」`,
  );
  next = createActivityStallClosingFollowUpOrder(next, content, activity, pending, choice);

  if (pending.npcId) {
    const runtime = next.npcStates[pending.npcId] ?? emptyNpcState();
    const knownTopics = new Set(runtime.knownTopics);
    knownTopics.add(`stall-closing:${activity.id}`);
    knownTopics.add(`stall-closing-choice:${choice.id}`);
    for (const topic of choice.topics ?? []) knownTopics.add(topic);
    for (const topic of choice.followUpOrder?.topics ?? []) knownTopics.add(topic);
    const currentAffinity = runtime.affinity || next.npcAffinity[pending.npcId] || 0;
    const nextAffinity = Math.min(AFFINITY_MAX, currentAffinity + (choice.npcAffinity ?? 2));
    next = {
      ...next,
      npcAffinity: { ...next.npcAffinity, [pending.npcId]: nextAffinity },
      npcStates: {
        ...next.npcStates,
        [pending.npcId]: {
          ...runtime,
          affinity: nextAffinity,
          stage: relationshipStageForAffinity(nextAffinity),
          lastTalkTurn: next.turn,
          knownTopics: [...knownTopics],
          revealedIntelIds: runtime.revealedIntelIds ?? [],
          usedFunctionDays: runtime.usedFunctionDays ?? {},
        },
      },
    };
  }

  return recompute(next);
}

function applyActivityProgress(
  state: GameState,
  content: GameContent,
  activity: ActivityDef,
  quality: number,
) {
  const routeIds = [...new Set(activity.reward.routeIds ?? [])];
  const flags = new Set(state.flags);
  for (const routeId of routeIds) flags.add(`route-known:${routeId}`);
  if (routeIds.length > 0) flags.add(`activity-routes:${activity.id}`);

  let next: GameState = {
    ...state,
    flags: [...flags],
    completedActivities: [...new Set([...state.completedActivities, activity.id])],
  };
  next = grantRegionReputation(
    next,
    content,
    activity.regionId,
    activityReputationGain(activity, quality),
    `完成「${activity.name}」`,
  );
  next = grantRouteStability(
    next,
    content,
    routeIds,
    routeStabilityGainByActivity(activity, quality),
    `完成「${activity.name}」`,
  );

  const notes: string[] = [];
  const routeNames = routeNamesForIds(content, routeIds);
  if (routeNames.length > 0) notes.push(`记下路线：${routeNames.join('、')}`);

  if (!activity.npcId) {
    return { state: next, note: notes.length ? `；${notes.join('；')}` : '' };
  }

  const npc = (content.npcs ?? []).find((item) => item.id === activity.npcId);
  if (!npc) return { state: next, note: notes.length ? `；${notes.join('；')}` : '' };

  const runtime = next.npcStates[npc.id] ?? emptyNpcState();
  const cur = runtime.affinity || next.npcAffinity[npc.id] || 0;
  const gain = activityAffinityGain(activity, quality);
  const nextAffinity = Math.min(AFFINITY_MAX, cur + gain);
  const knownTopics = new Set(runtime.knownTopics);
  for (const topic of npc.knowledgeTags ?? []) knownTopics.add(topic);
  knownTopics.add(`activity:${activity.id}`);
  knownTopics.add(`activity-kind:${activity.kind}`);
  for (const tag of activity.reward.descriptorTags ?? []) knownTopics.add(tag);
  for (const routeId of routeIds) knownTopics.add(`route:${routeId}`);

  const runtimeForIntel: NpcRuntimeState = {
    ...runtime,
    knownTopics: [...knownTopics],
  };
  const intel = revealNpcIntel(next, npc, runtimeForIntel, nextAffinity);
  const npcState: NpcRuntimeState = {
    ...runtime,
    affinity: nextAffinity,
    stage: relationshipStageForAffinity(nextAffinity),
    lastTalkTurn: next.turn,
    knownTopics: intel.knownTopics,
    revealedIntelIds: intel.revealedIntelIds,
    usedFunctionDays: runtime.usedFunctionDays ?? {},
  };

  next = {
    ...next,
    flags: intel.flags,
    npcAffinity: { ...next.npcAffinity, [npc.id]: nextAffinity },
    npcStates: { ...next.npcStates, [npc.id]: npcState },
  };

  notes.push(`「${npc.name}」好感 ${cur}→${nextAffinity}`);
  if (intel.newlyRevealed.length > 0) notes.push(`听得「${intel.newlyRevealed.join('」「')}」`);
  return { state: next, note: notes.length ? `；${notes.join('；')}` : '' };
}

function performActivity(
  state: GameState,
  content: GameContent,
  activityId: string,
  quality = 0.72,
  stallStrategyId?: string,
): GameState {
  const activity = (content.activities ?? []).find((item) => item.id === activityId);
  if (!activity) return state;
  if (state.pendingActivityStallClosing) {
    return { ...state, log: pushLog(state.log, '请先处理当前收灯夜选择，再安排新的地区活动。') };
  }
  if (activity.regionId !== state.currentRegion || activity.subregionId !== state.currentSubregion) {
    return { ...state, log: pushLog(state.log, '这项活动不在当前小地区，先动身前往对应地点。') };
  }
  if (activity.once && state.completedActivities.includes(activityId)) {
    return { ...state, log: pushLog(state.log, `「${activity.name}」已经完成过了。`) };
  }
  if (activity.availablePhases && !activity.availablePhases.includes(state.calendar.phase)) {
    const phaseList = activity.availablePhases.map((phase) => TIME_PHASE_LABEL[phase]).join(' / ');
    return { ...state, log: pushLog(state.log, `「${activity.name}」须在${phaseList}进行。`) };
  }
  if (stallStrategyId && !activity.reward.stall) {
    return { ...state, log: pushLog(state.log, `「${activity.name}」没有可选摊位策略。`) };
  }
  if (stallStrategyId && activity.reward.stall && !activityStallStrategy(activity.reward.stall, stallStrategyId)) {
    return { ...state, log: pushLog(state.log, `「${activity.name}」没有这条摊位策略。`) };
  }
  if ((state.resources.labor ?? 0) < activity.laborCost) {
    return { ...state, log: pushLog(state.log, `工时不足，无法体验「${activity.name}」。`) };
  }
  for (const [key, amount] of Object.entries(activity.resourceCost ?? {})) {
    if ((state.resources[key] ?? 0) < amount) {
      return { ...state, log: pushLog(state.log, `物料不足，无法体验「${activity.name}」（缺 ${key}）。`) };
    }
  }

  const resources: ResourcePool = {
    ...state.resources,
    labor: (state.resources.labor ?? 0) - activity.laborCost,
  };
  for (const [key, amount] of Object.entries(activity.resourceCost ?? {})) {
    resources[key] = (resources[key] ?? 0) - amount;
  }
  for (const [key, amount] of Object.entries(activity.reward.resources ?? {})) {
    resources[key] = (resources[key] ?? 0) + amount;
  }
  const itemInstancesAfterCost = consumeItemInstances(state.itemInstances, activity.resourceCost ?? {});

  const flags = new Set(state.flags);
  for (const flag of activity.reward.flags ?? []) flags.add(flag);

  const firstRewardResource = Object.keys(activity.reward.resources ?? {}).find(
    (key) => key !== 'coin' && key !== 'labor',
  );
  const itemInstance = firstRewardResource
    ? createItemInstance(
        state,
        content,
        firstRewardResource,
        undefined,
        quality,
        [activity.kind, ...(activity.reward.descriptorTags ?? [])],
        { sourceActivityId: activity.id },
      )
    : null;

  const activityLog = `${activity.detail}（${activity.name}：${activity.miniGames.join(' / ')}）`;
  const beforeProgress: GameState = {
    ...state,
    resources,
    flags: [...flags],
    itemInstances: itemInstance ? [itemInstance, ...itemInstancesAfterCost].slice(0, 80) : itemInstancesAfterCost,
    log: itemInstance ? pushLog(state.log, itemInstance.appraisal) : state.log,
  };
  const progress = applyActivityProgress(beforeProgress, content, activity, quality);
  const generatedOrder = activityGeneratedOrder(progress.state, content, activity, quality);
  const stall = applyActivityStall(generatedOrder.state, content, activity, quality, stallStrategyId);
  const next: GameState = {
    ...stall.state,
    log: pushLog(stall.state.log, `${activityLog}${progress.note}${generatedOrder.note}${stall.note}`),
  };
  const withEffect = activity.reward.metrics
    ? applyEffect(next, { metrics: activity.reward.metrics })
    : recompute(next);
  return applyProfileXp(withEffect, profileXpFromAttributes(activity.reward.attributes));
}

/** 前往一个已解锁的地区 */
function travel(state: GameState, content: GameContent, regionId: string, routeId?: string): GameState {
  if (!state.unlockedRegions.includes(regionId)) {
    return { ...state, log: pushLog(state.log, '该地区尚未解锁，无法前往。') };
  }
  if (state.currentRegion === regionId) return state;
  const region = (content.regions ?? []).find((r) => r.id === regionId);
  const route = routeId
    ? allRouteSpecs(content).find(
        (candidate) =>
          candidate.id === routeId &&
          (
            (candidate.fromRegionId === state.currentRegion && candidate.toRegionId === regionId) ||
            (candidate.toRegionId === state.currentRegion && candidate.fromRegionId === regionId)
          ),
      )
    : null;
  const landingSubregionId = route?.landingSubregionIds?.[regionId];
  const landingSubregion = region?.subregions.find((subregion) => subregion.id === landingSubregionId);
  return {
    ...state,
    currentRegion: regionId,
    currentSubregion: landingSubregion?.id ?? region?.subregions[0]?.id ?? regionId,
    log: pushLog(state.log, `起程前往「${region?.name ?? regionId}」。`),
  };
}

/** 在当前大地区内切换小地区 */
function travelSubregion(state: GameState, content: GameContent, subregionId: string): GameState {
  const region = (content.regions ?? []).find((r) => r.id === state.currentRegion);
  const subregion = region?.subregions.find((s) => s.id === subregionId);
  if (!region || !subregion) {
    return { ...state, log: pushLog(state.log, '该小地区暂不可达。') };
  }
  if (state.currentSubregion === subregionId) return state;
  return {
    ...state,
    currentSubregion: subregionId,
    log: pushLog(state.log, `转往「${region.name} · ${subregion.name}」。`),
  };
}

function trackLoreEntry(state: GameState, content: GameContent, loreEntryId: string): GameState {
  const entry = (content.loreEntries ?? []).find((item) => item.id === loreEntryId);
  if (!entry?.regionId || !isLoreEntryUnlocked(entry, state)) return state;
  if (state.trackedLoreEntryId === loreEntryId) return state;
  return {
    ...state,
    trackedLoreEntryId: loreEntryId,
    log: pushLog(state.log, `行脚目标标记为「${entry.title}」。请回到街景寻找通道或出入口。`),
  };
}

function allRouteSpecs(content: GameContent): RouteSpec[] {
  const seen = new Set<string>();
  const routes: RouteSpec[] = [];
  for (const spec of content.regionContent ?? []) {
    for (const route of spec.routes) {
      if (seen.has(route.id)) continue;
      seen.add(route.id);
      routes.push(route);
    }
  }
  return routes;
}

function findUnlockRoute(state: GameState, content: GameContent, targetRegionId: string): RouteSpec | null {
  return (
    allRouteSpecs(content).find((route) => {
      const forward = route.toRegionId === targetRegionId && state.unlockedRegions.includes(route.fromRegionId);
      const reverse = route.fromRegionId === targetRegionId && state.unlockedRegions.includes(route.toRegionId);
      return forward || reverse;
    }) ?? null
  );
}

function routeRequirementFailure(state: GameState, route: RouteSpec): string | null {
  const req = route.requirements;
  if (!req) return null;
  for (const flag of req.flags ?? []) {
    if (!state.flags.includes(flag)) return `还缺路线线索「${flag}」。`;
  }
  for (const activityId of req.completedActivities ?? []) {
    if (!state.completedActivities.includes(activityId)) return `还未完成活动「${activityId}」。`;
  }
  for (const questId of req.completedQuests ?? []) {
    if (!state.completedQuests.includes(questId)) return `还未完成委托「${questId}」。`;
  }
  for (const [key, value] of Object.entries(req.attributes ?? {}) as [PlayerAttributeKey, number][]) {
    if ((state.profile.attributes[key] ?? 0) < value) return `「${key}」阅历不足。`;
  }
  return null;
}

/** 花费解锁一个与已解锁地区相邻的新地区 */
function unlockRegion(state: GameState, content: GameContent, regionId: string): GameState {
  const regions = content.regions ?? [];
  const target = regions.find((r) => r.id === regionId);
  if (!target) return state;
  if (state.unlockedRegions.includes(regionId)) return state;
  const route = findUnlockRoute(state, content, regionId);

  // 需与某已解锁地区相邻
  const adjacent = state.unlockedRegions.some((uid) => {
    const r = regions.find((x) => x.id === uid);
    return r?.neighbors.includes(regionId) || target.neighbors.includes(uid);
  });
  if (!adjacent && !route) {
    return { ...state, log: pushLog(state.log, `「${target.name}」与已探地区不相邻，无法直达。`) };
  }
  if (route) {
    const failure = routeRequirementFailure(state, route);
    if (failure) {
      return { ...state, log: pushLog(state.log, `「${route.name}」尚不能开通：${failure}${route.unlockHint}`) };
    }
  }
  const unlockCost = routeCostWithIntel(route ?? undefined, state.flags, REGION_UNLOCK_COST);
  if ((state.resources.coin ?? 0) < unlockCost) {
    return {
      ...state,
      log: pushLog(state.log, `路资不足，解锁「${target.name}」需 ${unlockCost} 文。`),
    };
  }
  const discount = routeIntelDiscount(route ?? undefined, state.flags, REGION_UNLOCK_COST);
  const opened: GameState = {
    ...state,
    resources: { ...state.resources, coin: (state.resources.coin ?? 0) - unlockCost },
    unlockedRegions: [...state.unlockedRegions, regionId],
    routeStability: route ? addRouteStability(state.routeStability, [route.id], 6) : state.routeStability,
    log: pushLog(state.log, route
      ? `打通「${route.name}」，解锁新地区「${target.name}」。${discount > 0 ? `凭路线情报省下 ${discount} 文。` : ''}${route.preview ?? ''}`
      : `打通商路，解锁新地区「${target.name}」。`),
  };
  const withTargetReputation = grantRegionReputation(opened, content, target.id, 3, '初次落脚');
  const originId =
    route?.fromRegionId === target.id ? route.toRegionId : route?.fromRegionId ?? state.currentRegion;
  return grantRegionReputation(withTargetReputation, content, originId, 1, '打通商路');
}

interface ReportRegionStanding {
  id: string;
  name: string;
  score: number;
  label: string;
  ending?: RegionDef['ending'];
}

function rankedRegionStandings(state: GameState, content: GameContent): ReportRegionStanding[] {
  const regions = new Map((content.regions ?? []).map((region) => [region.id, region]));
  return Object.entries(state.regionReputation ?? {})
    .map(([id]) => {
      const region = regions.get(id);
      const score = regionReputationOf(state, id);
      return {
        id,
        name: region?.name ?? regionNameFor(content, id),
        score,
        label: regionReputationLabel(score),
        ending: region?.ending,
      };
    })
    .filter((standing) => standing.score > 0)
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
}

function socialTitleForReport(state: GameState, content: GameContent, top: ReportRegionStanding | null): string {
  const closedSupplyRecords = state.supplyCrisisRecords.filter((record) => record.status === 'closed').length;
  const stabilizedSupply = state.flags.some((flag) => flag.startsWith('supply-followup-stabilized:'));
  const completedQinhuaiStall = state.flags.includes('stall-chain-completed:jn-qinhuai-lantern');
  const completedHomeVisitReferral = state.flags.some((flag) => flag.startsWith('homevisit-referral-completed:'));

  if (top && top.score >= 80) return `${top.name}坐地匠首`;
  if (completedQinhuaiStall || state.nightMarketStallRecords.length >= 3) return '秦淮灯市掌摊人';
  if (closedSupplyRecords >= 2 || stabilizedSupply) return '稳路掌柜';
  if (completedHomeVisitReferral) return '珍品阁荐藏匠';
  if (state.homeVisitRecords.length >= 2) return '珍品阁待客匠';
  if (top && top.score >= 60) return `${top.name}望重匠人`;
  if (top && top.score >= 36) return `${top.name}可信行匠`;
  if (top && top.score >= 12) return `${top.name}有名行匠`;
  return content.regions?.length ? '行脚百工匠' : '无名匠人';
}

function soldItemsForReport(state: Pick<GameState, 'itemInstances'>): ItemInstance[] {
  return state.itemInstances
    .filter((item) => item.status === 'sold' && (item.soldForCoin ?? 0) > 0)
    .sort(
      (a, b) =>
        (b.soldForCoin ?? 0) - (a.soldForCoin ?? 0) ||
        itemEffectiveQuality(b) - itemEffectiveQuality(a) ||
        b.createdTurn - a.createdTurn,
    );
}

function soldItemLocationLabel(content: GameContent, item: ItemInstance): string {
  const regionId = item.soldAtRegionId ?? item.originRegionId;
  const region = regionNameFor(content, regionId);
  if (!item.soldAtSubregionId) return region;
  return `${region} · ${subregionNameFor(content, regionId, item.soldAtSubregionId)}`;
}

function buildRegionalReportHighlights(
  state: GameState,
  content: GameContent,
  top: ReportRegionStanding | null,
): string[] {
  const highlights: string[] = [];
  if (top) {
    highlights.push(`最认你的地方是「${top.name}」：声望 ${top.score}，乡评为「${top.label}」。`);
  }

  const soldItems = soldItemsForReport(state);
  const bestSoldItem = soldItems[0];
  if (bestSoldItem) {
    const totalRevenue = soldItems.reduce((sum, item) => sum + (item.soldForCoin ?? 0), 0);
    const totalNote = soldItems.length > 1 ? `；本局常规售出 ${soldItems.length} 件，合计 ${totalRevenue} 文` : '';
    highlights.push(
      `最有行市回声的常规售出作品是「${itemShortName(bestSoldItem, content)}」，成交 ${bestSoldItem.soldForCoin ?? 0} 文，成交地「${soldItemLocationLabel(content, bestSoldItem)}」${totalNote}。`,
    );
  }

  const bestStall = [...state.nightMarketStallRecords].sort(
    (a, b) => b.revenue - a.revenue || b.crowd - a.crowd,
  )[0];
  if (bestStall) {
    const customer = bestStall.customerTitle ? `，迎过「${bestStall.customerTitle}」` : '';
    const combo = bestStall.comboTitle ? `，成了「${bestStall.comboTitle}」摊位` : '';
    highlights.push(
      `最热闹的一次市集是「${bestStall.title}」${customer}${combo}，人气 ${bestStall.crowd}，收入 ${bestStall.revenue} 文。`,
    );
  }

  const bestVisit = [...state.homeVisitRecords].sort(
    (a, b) => (b.itemQuality ?? 0) - (a.itemQuality ?? 0) || b.day - a.day,
  )[0];
  if (bestVisit) {
    const item = bestVisit.itemName ? `，看中了「${bestVisit.itemName}」` : '';
    const referral = bestVisit.referralTitle ? `，并牵出「${bestVisit.referralTitle}」` : '';
    highlights.push(`百工院留下「${bestVisit.title}」记录${item}${referral}：${bestVisit.summary}`);
  }

  const completedReferrals = state.flags.filter((flag) => flag.startsWith('homevisit-referral-completed:')).length;
  if (completedReferrals > 0) {
    highlights.push(`珍品阁收藏转介绍成交 ${completedReferrals} 单，陈列作品开始把远客和后续订单带回百工院。`);
  }

  const completedQinhuaiFollowUps = qinhuaiClosingFollowUpOrders(state, 'completed');
  if (completedQinhuaiFollowUps.length > 0) {
    const titles = completedQinhuaiFollowUps.map((order) => `「${order.title}」`).join('、');
    highlights.push(`秦淮收灯后的回头单成交 ${completedQinhuaiFollowUps.length} 单（${titles}），灯市从一轮热闹延成了来年预约。`);
  }

  if (state.supplyCrisisRecords.length > 0) {
    const closed = state.supplyCrisisRecords.filter((record) => record.status === 'closed').length;
    const strained = state.supplyCrisisRecords.filter((record) => record.status === 'strained').length;
    const aftershocks = state.supplyCrisisRecords.filter((record) => record.aftershockApplied).length;
    const aftershockNote = aftershocks > 0 ? `，${aftershocks} 次短缺余波已记入账本` : '';
    highlights.push(
      `商路断供簿记录 ${state.supplyCrisisRecords.length} 次处置，其中 ${closed} 次收束、${strained} 次仍紧绷${aftershockNote}。`,
    );
  }

  const busiestRoute = Object.entries(state.routeEscortRuns)
    .filter(([, runs]) => runs > 0)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
  if (busiestRoute) {
    highlights.push(`最常往返的护商线是「${routeNameForId(content, busiestRoute[0])}」，累计护送 ${busiestRoute[1]} 次。`);
  }

  return highlights;
}

function regionEndingText(standing: ReportRegionStanding): string {
  const ending = standing.ending;
  if (!ending) {
    return `${standing.name}已经留下百工院的足迹，只待后续补成更具体的地方结局。`;
  }
  if (standing.score >= 80) return ending.pillar;
  if (standing.score >= 60) return ending.honored;
  return ending.trusted;
}

function buildRegionalOutcomes(standings: ReportRegionStanding[]): string[] {
  return standings
    .filter((standing) => standing.score >= 36)
    .map((standing) => `【${standing.name}】${regionEndingText(standing)}`);
}

const REPORT_RELATIONSHIP_LABELS: Record<RelationshipStage, string> = {
  stranger: '初识',
  familiar: '熟络',
  trusted: '信任',
  confidant: '知己',
};

function npcAffinityForReport(state: GameState, npcId: string): number {
  return Math.max(state.npcAffinity[npcId] ?? 0, state.npcStates[npcId]?.affinity ?? 0);
}

function qinhuaiClosingFollowUpOrders(state: GameState, status?: ActiveOrder['status']): ActiveOrder[] {
  return (state.activeOrders ?? []).filter(
    (order) =>
      order.sourceActivityId === 'jn-qinhuai-lantern' &&
      order.id.startsWith('stall-closing-order-jn-qinhuai-lantern-') &&
      (!status || order.status === status),
  );
}

function collectorReputationAddendum(
  state: GameState,
  renewedFlag: string,
  returnResolvedFlag: string,
  renewedText: string,
  returnResolvedText: string,
): string {
  if (state.flags.includes(renewedFlag)) return renewedText;
  if (state.flags.includes(returnResolvedFlag)) return returnResolvedText;
  return '';
}

function relationshipOutcomeAddendum(state: GameState, npc: NpcDef): string {
  if (npc.id === 'jn-qiao-zhaoye') {
    const completedFollowUps = qinhuaiClosingFollowUpOrders(state, 'completed');
    if (completedFollowUps.length > 0) {
      const titles = completedFollowUps.map((order) => order.title).join('、');
      return `收灯后的${titles}已经回流成单，她把百工院记进来年灯市名单。`;
    }
    if (state.flags.includes('stall-closing-resolved:jn-qinhuai-lantern')) {
      return '收灯簿里已有你的摊位、人情和灯谜，她愿意替百工院留一盏来年的灯。';
    }
  }
  if (npc.id === 'hz-wang-zhiniang') {
    return collectorReputationAddendum(
      state,
      'collector-reputation-stationery-renewed',
      'homevisit-wang-collector-return-resolved',
      '文房藏客已经愿意按入藏簿续订册页，她把纸墨来路、人情凭据和百工院名声钉在同一本账上。',
      '文房藏客完成复看后，她把原样、复单和藏印都留进纸谷声誉档。',
    );
  }
  if (npc.id === 'sj-pingyao-qipo') {
    return collectorReputationAddendum(
      state,
      'collector-reputation-polish-renewed',
      'homevisit-pingyao-client-return-resolved',
      '票号旧识已经按推光样柜续订漆柜，她把北地信用和慢工漆面一起交给百工院保管。',
      '票号旧识完成复看后，她把掌温、光口和验样凭记都写进北地漆档。',
    );
  }
  if (npc.id === 'ln-he-yunsha') {
    return collectorReputationAddendum(
      state,
      'collector-reputation-textile-renewed',
      'homevisit-yunsha-merchant-return-resolved',
      '货栈藏客已经按晒场色档续订香云纱，她把日色、河泥和船期信用都接进百工院的染织名声。',
      '货栈藏客完成复看后，她把原样、复单和天气批次都写进岭南晒场色档。',
    );
  }
  if (npc.id === 'xy-losang') {
    return collectorReputationAddendum(
      state,
      'collector-reputation-thangka-renewed',
      'homevisit-losang-patron-return-resolved',
      '雪域来客已经按净室礼法续簿续订唐卡，他把度量、矿彩和敬意都托给百工院的远行声誉。',
      '雪域来客完成复看后，他把原样、复单和度量留签都写进净室礼法档。',
    );
  }
  if (npc.id === 'xu-a-yue') {
    return collectorReputationAddendum(
      state,
      'collector-reputation-jade-renewed',
      'homevisit-ayue-collector-return-resolved',
      '识玉行客已经按玉柜伦理续簿续订顺料玉作，她把水线、绺裂和材料伦理一起交给百工院守口碑。',
      '识玉行客完成复看后，她把原样、复单和水线留凭都写进西域玉柜声誉档。',
    );
  }
  return '';
}

function buildRelationshipOutcomes(state: GameState, content: GameContent): string[] {
  return (content.npcs ?? [])
    .map((npc) => ({ npc, affinity: npcAffinityForReport(state, npc.id) }))
    .filter(({ npc, affinity }) => affinity >= 50 && Boolean(npc.endingInfluence))
    .sort((a, b) => b.affinity - a.affinity || a.npc.id.localeCompare(b.npc.id))
    .slice(0, 4)
    .map(({ npc, affinity }) => {
      const label = REPORT_RELATIONSHIP_LABELS[relationshipStageForAffinity(affinity)];
      const addendum = relationshipOutcomeAddendum(state, npc);
      return `【${npc.name} · ${label}】${npc.endingInfluence}${addendum ? ` ${addendum}` : ''}`;
    });
}

/** 生成结局命运报告 */
function generateReport(state: GameState, content: GameContent): GameReport {
  const m = state.metrics;
  const survivingCrafts = state.crafts.filter((c) => c.unlocked).map((c) => c.craftId);
  const regionStandings = rankedRegionStandings(state, content);
  const topRegion = regionStandings[0] ?? null;
  const socialTitle = socialTitleForReport(state, content, topRegion);
  const regionalOutcomes = buildRegionalOutcomes(regionStandings);
  const relationshipOutcomes = buildRelationshipOutcomes(state, content);

  const highest = METRIC_KEYS.reduce((a, b) => (m[a] >= m[b] ? a : b));
  const lowest = METRIC_KEYS.reduce((a, b) => (m[a] <= m[b] ? a : b));

  let title = '平稳传承的百工镇';
  if (m.heritage >= 70 && m.market < 40) title = '清贵孤高的百工镇';
  else if (m.market >= 70 && m.heritage < 40) title = '红火却失魂的百工镇';
  else if (METRIC_KEYS.every((k) => m[k] >= 45 && m[k] <= 75)) title = '四时调和的百工镇';
  else if (METRIC_KEYS.some((k) => m[k] <= 15)) title = '风雨飘摇的百工镇';

  const highlights = [
    `最鲜明的底色是「${METRIC_LABELS[highest]}」（${m[highest]}）。`,
    `最脆弱的一环是「${METRIC_LABELS[lowest]}」（${m[lowest]}）。`,
    `共有 ${survivingCrafts.length} 门手艺在镇上延续。`,
    ...buildRegionalReportHighlights(state, content, topRegion),
  ];

  const summary =
    `历经 ${state.turn} 季的经营，这座百工镇以「${METRIC_LABELS[highest]}」立身，` +
    `却也为「${METRIC_LABELS[lowest]}」付出了代价。乡里最终给你的称呼是「${socialTitle}」。` +
    '传承从无标准答案，这是属于你的一种回答。';

  const epilogue = generateEpilogue(state, m);

  return {
    title,
    socialTitle,
    summary,
    finalMetrics: { ...m },
    survivingCrafts,
    highlights,
    regionalOutcomes,
    relationshipOutcomes,
    epilogue,
  };
}

/** 个性化尾声：以玩家名号与「守正/趋时」抉择走向，给出呼应或反差的收束之语 */
function generateEpilogue(state: GameState, m: Metrics): string {
  const name = state.playerName.trim() || '无名匠人';
  const tradition = state.flags.includes('oath-tradition');
  const market = state.flags.includes('oath-market');
  const keptTradition = state.flags.includes('kept-tradition');
  const chasedTrend = state.flags.includes('chased-trend');

  let path: string;
  if (tradition) {
    path =
      m.heritage >= 55
        ? `当年灯下立心「守正」，${name}终究守住了那道不肯减的工序——传承度 ${m.heritage}，是对旧誓最体面的回答。`
        : `当年立心「守正」，${name}却在世道里磨得退了几步；传承度只余 ${m.heritage}，老师傅的匾额，沉了些。`;
  } else if (market) {
    path =
      m.market >= 55
        ? `当年立心「趋时」，${name}让手艺先活了下来——市场度 ${m.market}，热闹是真的热闹，只是夜深时仍会想起那半边匾。`
        : `当年立心「趋时」，${name}却没能等到回暖；市场度仅 ${m.market}，趋时也未必趋得过时势。`;
  } else {
    path = `${name}没有在开局许下分明的誓言，却用一季又一季的取舍，写下了自己的答案。`;
  }

  let echo = '';
  if (keptTradition) echo = '审美风向突变那年，你选择不随波——这份固执，镇上人记得。';
  else if (chasedTrend) echo = '审美风向突变那年，你顺势改了样式——是聪明，也是一点不得已。';

  return echo ? `${path}\n${echo}` : path;
}

/** 检测并解锁新达成的成就（在每次 action 结算后调用） */
function checkAchievements(state: GameState, content: GameContent): GameState {
  const defs = content.achievements ?? [];
  if (defs.length === 0) return state;
  const unlocked = new Set(state.achievements);
  const newly = defs.filter((a) => !unlocked.has(a.id) && a.predicate(state));
  if (newly.length === 0) return state;
  let log = state.log;
  for (const a of newly) log = pushLog(log, `★ 解锁成就「${a.name}」——${a.desc}`);
  return { ...state, achievements: [...state.achievements, ...newly.map((a) => a.id)], log };
}

/** 顶层 reducer */
export function gameReducer(
  state: GameState,
  action: GameAction,
  content: GameContent,
): GameState {
  return checkAchievements(reduce(state, action, content), content);
}

/**
 * 选择「当前应当呈现的下一个剧情节点」：第一个已触发且尚未看过的节点。
 * 纯函数，供 UI 调用决定是否弹出剧情卡。
 */
export function nextStoryBeat(state: GameState, content: GameContent): StoryBeat | null {
  const beats = content.story ?? [];
  const seen = new Set(state.seenStory);
  return beats.find((b) => !seen.has(b.id) && b.trigger(state)) ?? null;
}

/** 内部规则分发（不含成就检测） */
function reduce(
  state: GameState,
  action: GameAction,
  content: GameContent,
): GameState {
  switch (action.type) {
    case 'NEW_GAME':
      return createInitialState(
        content.crafts,
        content.apprentices,
        action.seed ?? Date.now() % 2147483647,
        state.maxTurns,
        content.regions ?? [],
        action.playerName ?? '',
      );

    case 'RUN_PROCESS':
      if (state.status !== 'playing') return state;
      return runProcess(state, content, action.craftId, action.skipStepIds, action.techniqueChoices, action.focusChecks);

    case 'UPGRADE_WORKSHOP':
      if (state.status !== 'playing') return state;
      return upgradeWorkshop(state, content, action.upgradeId);

    case 'EXPAND_WORKSHOP_SPACE':
      if (state.status !== 'playing') return state;
      return expandWorkshopSpace(state, content, action.craftId);

    case 'TAKE_ORDER': {
      if (state.status !== 'playing') return state;
      const craftDef = content.crafts.find((c) => c.id === action.craftId);
      const name = craftDef?.name ?? '手艺';
      const outputId = craftDef?.outputResourceId;
      const locationFailure = localCraftAccessFailure(state, content, action.craftId);
      if (locationFailure) return { ...state, log: pushLog(state.log, locationFailure) };
      // 闭环交付：必须已亲手制作出成品库存，方能交付订单换取市场收入
      if (!outputId || availableResourceAmount(state, outputId) < 1) {
        return {
          ...state,
          log: pushLog(state.log, `「${name}」还没有可交付的成品，先去亲手制作一件再接单。`),
        };
      }
      const product = content.resources?.find((r) => r.id === outputId);
      const productName = product?.name ?? outputId;
      const craftState = findCraftState(state, action.craftId);
      const heritage = craftState?.metrics.heritage ?? 50;
      const price = orderPrice(product?.value ?? 12, heritage);
      const marketItem = quickMarketOrderItemIndex(state, content, outputId);
      if (marketItem.issue) return { ...state, log: pushLog(state.log, marketItem.issue) };
      const afterOrder = applyEffect(state, {
        resources: { coin: price, [outputId]: -1 },
        craftMetrics: { [action.craftId]: { market: 6, heritage: 2, spirit: 1 } },
        logMessage: `交付一笔「${name}」订单，售出「${productName}」×1，进账 ${price} 文，真品口碑使市场看好。`,
      });
      const afterStock = marketItem.index !== null
        ? {
            ...afterOrder,
            itemInstances: state.itemInstances.filter((_, index) => index !== marketItem.index),
          }
        : afterOrder;
      return applyProfileXp(afterStock, { commerce: 2 });
    }

    case 'HOLD_EXHIBITION': {
      if (state.status !== 'playing') return state;
      if ((state.resources.coin ?? 0) < 8) {
        return { ...state, log: pushLog(state.log, '钱袋空空，办不起这场展演。') };
      }
      const afterExhibition = applyEffect(state, {
        resources: { coin: -8 },
        metrics: { spirit: 5, life: 5, market: 2 },
        logMessage: '举办了一场手艺展演，镇上人气与精气神都旺了起来。',
      });
      return applyProfileXp(afterExhibition, { people: 1, mind: 1 });
    }

    case 'RESOLVE_EVENT': {
      if (!state.pendingEvent) return state;
      const choice = state.pendingEvent.choices.find((c) => c.id === action.choiceId);
      if (!choice) return state;
      const afterEffect = applyEffect(state, choice.effect);
      return { ...afterEffect, pendingEvent: null };
    }

    case 'RESOLVE_ESCORT_CRISIS':
      if (state.status !== 'playing') return state;
      return resolveEscortCrisis(state, content, action.choiceId);

    case 'RESOLVE_SUPPLY_CRISIS':
      if (state.status !== 'playing') return state;
      return resolveSupplyCrisis(state, content, action.choiceId);

    case 'RESOLVE_ACTIVITY_STALL_CLOSING':
      if (state.status !== 'playing') return state;
      return resolveActivityStallClosing(state, content, action.choiceId);

    case 'STABILIZE_SUPPLY_ROUTE':
      if (state.status !== 'playing') return state;
      return stabilizeSupplyRoute(state, content, action.recordId);

    case 'ADVANCE_TIME':
      if (state.status !== 'playing') return state;
      return advanceTimePhase(state, content);

    case 'END_TURN':
      if (state.status !== 'playing') return state;
      return endTurn(state, content);

    case 'PLANT_CROP':
      if (state.status !== 'playing') return state;
      return plantCrop(state, content, action.plotId, action.cropId);

    case 'WATER_PLOT':
      if (state.status !== 'playing') return state;
      return waterPlot(state, content, action.plotId);

    case 'HARVEST_CROP':
      if (state.status !== 'playing') return state;
      return harvestCrop(state, content, action.plotId);

    case 'PERFORM_ACTIVITY':
      if (state.status !== 'playing') return state;
      return performActivity(state, content, action.activityId, action.quality ?? 0.72, action.stallStrategyId);

    case 'GATHER_RESOURCE':
      if (state.status !== 'playing') return state;
      return gatherResource(state, content, action.industryId, action.quality ?? 1);

    case 'TRAVEL':
      if (state.status !== 'playing') return state;
      return travel(state, content, action.regionId, action.routeId);

    case 'TRAVEL_SUBREGION':
      if (state.status !== 'playing') return state;
      return travelSubregion(state, content, action.subregionId);

    case 'UNLOCK_REGION':
      if (state.status !== 'playing') return state;
      return unlockRegion(state, content, action.regionId);

    case 'TRACK_LORE_ENTRY':
      if (state.status !== 'playing') return state;
      return trackLoreEntry(state, content, action.loreEntryId);

    case 'CLEAR_LORE_TRACKING':
      return state.trackedLoreEntryId ? { ...state, trackedLoreEntryId: null } : state;

    case 'SEEN_STORY': {
      if (state.seenStory.includes(action.storyId)) return state;
      const seenStory = [...state.seenStory, action.storyId];
      // 分支选择：查找该节点选项，应用其标记与日志
      const beat = (content.story ?? []).find((b) => b.id === action.storyId);
      const choice = beat?.choices?.find((c) => c.id === action.choiceId);
      if (!choice) return { ...state, seenStory };
      const flags = new Set(state.flags);
      for (const f of choice.setFlags ?? []) flags.add(f);
      const msg = choice.logMessage?.replace(/\{name\}/g, state.playerName.trim() || '无名匠人');
      return {
        ...state,
        seenStory,
        flags: [...flags],
        log: msg ? pushLog(state.log, msg) : state.log,
      };
    }

    case 'TALK_NPC':
      if (state.status !== 'playing') return state;
      return talkNpc(state, content, action.npcId);

    case 'COMPLETE_QUEST':
      if (state.status !== 'playing') return state;
      return completeQuest(state, content, action.questId);

    case 'NAME_ITEM':
      if (state.status !== 'playing') return state;
      return nameItem(state, content, action.itemId, action.displayName);

    case 'DISPLAY_ITEM':
      if (state.status !== 'playing') return state;
      return displayItem(state, content, action.itemId);

    case 'GIFT_ITEM':
      if (state.status !== 'playing') return state;
      return giftItem(state, content, action.itemId, action.npcId);

    case 'SELL_ITEM':
      if (state.status !== 'playing') return state;
      return sellItem(state, content, action.itemId);

    case 'REPAIR_ITEM':
      if (state.status !== 'playing') return state;
      return repairItem(state, content, action.itemId, action.defectId, action.repairOptionId);

    case 'INSCRIBE_ITEM':
      if (state.status !== 'playing') return state;
      return inscribeItem(state, content, action.itemId, action.npcId, action.inscription);

    case 'USE_NPC_FUNCTION':
      if (state.status !== 'playing') return state;
      return useNpcFunction(
        state,
        content,
        action.npcId,
        action.functionKind,
        action.itemId,
        action.collabChoiceId,
        action.homeVisitChoiceId,
      );

    case 'FULFILL_ORDER':
      if (state.status !== 'playing') return state;
      return fulfillOrder(state, content, action.orderId);

    default:
      return state;
  }
}

/** 每次对话好感度增量与上限 */
const AFFINITY_PER_TALK = 8;
const AFFINITY_MAX = 100;

function pickNpcLine(npc: NpcDef, stage: RelationshipStage, rngValue: number) {
  const lines = npc.relationshipLines?.[stage] ?? npc.greetings;
  if (!lines.length) return '';
  return lines[Math.floor(rngValue * lines.length)] ?? lines[0];
}

function revealNpcIntel(
  state: GameState,
  npc: NpcDef,
  runtime: NpcRuntimeState,
  affinity: number,
) {
  const revealed = new Set(runtime.revealedIntelIds ?? []);
  const knownTopics = new Set(runtime.knownTopics);
  for (const topic of npc.knowledgeTags ?? []) knownTopics.add(topic);
  const flags = new Set(state.flags);
  const newlyRevealed: string[] = [];
  for (const intel of npc.intel ?? []) {
    if (affinity < intel.unlockAffinity || revealed.has(intel.id)) continue;
    revealed.add(intel.id);
    newlyRevealed.push(intel.title);
    knownTopics.add(intel.id);
    for (const topic of intel.topics ?? []) knownTopics.add(topic);
    for (const routeId of intel.routeIds ?? []) knownTopics.add(`route:${routeId}`);
    for (const flag of intel.setFlags ?? []) flags.add(flag);
  }
  return {
    flags: [...flags],
    knownTopics: [...knownTopics],
    revealedIntelIds: [...revealed],
    newlyRevealed,
  };
}

/** 与 NPC 对话一次：好感度上升（封顶 100），并记录寒暄日志 */
function talkNpc(state: GameState, content: GameContent, npcId: string): GameState {
  const npc = (content.npcs ?? []).find((n) => n.id === npcId);
  if (!npc) return state;
  const runtime = state.npcStates[npcId] ?? emptyNpcState();
  const cur = runtime.affinity || state.npcAffinity[npcId] || 0;
  const peopleBonus = Math.max(0, Math.floor(((state.profile.attributes.people ?? 5) - 5) / 5));
  const nextAffinity = Math.min(AFFINITY_MAX, cur + AFFINITY_PER_TALK + peopleBonus);
  const rng = createRng(state.seed + hashText(npcId) + runtime.talks * 97 + state.turn * 17);
  const nextStage = relationshipStageForAffinity(nextAffinity);
  const lineRoll = rng.next();
  const greeting = pickNpcLine(npc, nextStage, lineRoll);
  const greetingIndex = Math.floor(lineRoll * Math.max(1, (npc.relationshipLines?.[nextStage] ?? npc.greetings).length));
  const intel = revealNpcIntel(state, npc, runtime, nextAffinity);
  const npcState: NpcRuntimeState = {
    ...runtime,
    affinity: nextAffinity,
    stage: nextStage,
    talks: runtime.talks + 1,
    lastTalkTurn: state.turn,
    lastGreetingIndex: greetingIndex,
    knownTopics: intel.knownTopics,
    revealedIntelIds: intel.revealedIntelIds,
    usedFunctionDays: runtime.usedFunctionDays ?? {},
  };
  const intelLog = intel.newlyRevealed.length ? `；听得「${intel.newlyRevealed.join('」「')}」` : '';
  return applyProfileXp({
    ...state,
    flags: intel.flags,
    npcAffinity: { ...state.npcAffinity, [npcId]: nextAffinity },
    npcStates: { ...state.npcStates, [npcId]: npcState },
    log: pushLog(state.log, `与「${npc.name}」攀谈：${greeting}${intelLog}（好感 ${cur}→${nextAffinity}，关系：${npcState.stage}）`),
  }, { people: 1, knowledge: npc.knowledgeTags?.length ? 1 : 0 });
}

function nameItem(
  state: GameState,
  content: GameContent,
  itemId: string,
  displayName?: string,
): GameState {
  const target = state.itemInstances.find((item) => item.id === itemId);
  if (!target) return state;
  if (itemIsTransferredAway(target)) {
    return { ...state, log: pushLog(state.log, transferredItemActionMessage(target, '题名')) };
  }
  if (itemEffectiveQuality(target) < MASTERWORK_MIN_QUALITY) {
    const defectNote = target.defects?.length ? `（${itemDefectSummary(target)}）` : '';
    return { ...state, log: pushLog(state.log, `这件作品品相尚浅${defectNote}，还不足以列为代表作。`) };
  }
  const flags = new Set(state.flags);
  flags.add('named-first-masterwork');
  const named = {
    ...withNamedItem(state, content, target),
    displayName: displayName?.trim() || target.displayName || suggestItemTitle(target, content),
  };
  return applyProfileXp({
    ...state,
    flags: [...flags],
    itemInstances: state.itemInstances.map((item) => (item.id === itemId ? named : item)),
    log: pushLog(state.log, `为「${resourceName(content, target.resourceId)}」题名「${named.displayName}」。`),
  }, { mind: 1 });
}

function displayItem(state: GameState, content: GameContent, itemId: string): GameState {
  const target = state.itemInstances.find((item) => item.id === itemId);
  if (!target) return state;
  if (itemIsTransferredAway(target)) {
    return { ...state, log: pushLog(state.log, transferredItemActionMessage(target, '陈列')) };
  }
  const named = { ...withNamedItem(state, content, target), status: 'displayed' as const };
  const defects = itemDefects(target);
  const flags = new Set(state.flags);
  if (itemEffectiveQuality(target) >= MASTERWORK_MIN_QUALITY && defects.length === 0) flags.add('displayed-first-masterwork');
  if (defects.length > 0) {
    flags.add('displayed-defective-item');
    for (const defect of defects) flags.add(`displayed-defect:${defect.id}`);
  }
  const displayLog = defects.length > 0
    ? `将「${named.displayName}」收入珍品陈列，但${itemDefectSummary(target)}，更像一件待讲解的返修样本。`
    : `将「${named.displayName}」收入珍品陈列，来客已能看见你的手上功夫。`;
  const withDisplay = {
    ...state,
    flags: [...flags],
    itemInstances: state.itemInstances.map((item) => (item.id === itemId ? named : item)),
    log: pushLog(state.log, displayLog),
  };
  return applyProfileXp(applyEffect(withDisplay, { metrics: defects.length > 0 ? { spirit: 1, life: 1 } : { spirit: 3, life: 1 } }), { mind: 1 });
}

function repairItem(
  state: GameState,
  content: GameContent,
  itemId: string,
  defectId: string,
  repairOptionId: string,
): GameState {
  const target = state.itemInstances.find((item) => item.id === itemId);
  if (!target) return state;
  if (itemIsTransferredAway(target)) {
    return { ...state, log: pushLog(state.log, transferredItemActionMessage(target, '返修')) };
  }
  const defect = (target.defects ?? []).find((entry) => entry.id === defectId);
  if (!defect) {
    return { ...state, log: pushLog(state.log, '这件作品没有对应缺陷可返修。') };
  }
  if (!defect.repairOptionIds.includes(repairOptionId)) {
    return { ...state, log: pushLog(state.log, `「${defect.label}」不能用这套方法返修。`) };
  }
  const repair = repairOptionFor(content, target, repairOptionId);
  if (!repair) {
    return { ...state, log: pushLog(state.log, '尚未找到这套返修工艺。') };
  }
  const { option } = repair;
  const mentorRepair = mentorGuidedRepair(state, defect, option);
  const laborCost = mentorRepair ? Math.max(1, option.laborCost - 1) : option.laborCost;
  if ((state.resources.labor ?? 0) < laborCost) {
    return { ...state, log: pushLog(state.log, `返修「${defect.label}」需要 ${laborCost} 工时。`) };
  }
  const missing = missingResourcesForCost(state, option.resourceCost);
  if (missing.length > 0) {
    const missingLabel = missing
      .map(([resourceId, amount]) => `${resourceName(content, resourceId)}×${amount}`)
      .join('、');
    return { ...state, log: pushLog(state.log, `返修「${defect.label}」缺少材料：${missingLabel}。`) };
  }

  const removeIds = new Set([defect.id, ...(option.removeDefectIds ?? [])]);
  const dimensions: Partial<Record<ItemQualityDimension, number>> = { ...(target.qualityDimensions ?? {}) };
  const mentorDimensionBonus = mentorRepair ? 0.02 : 0;
  for (const [dimension, delta] of Object.entries(option.improveDimensions ?? {}) as [ItemQualityDimension, number][]) {
    dimensions[dimension] = Number(clampQuality((dimensions[dimension] ?? target.quality) + delta + mentorDimensionBonus).toFixed(3));
  }
  const qualityDelta = option.qualityDelta + (mentorRepair ? 0.02 : 0);
  const mentorRepairNote = mentorRepair ? ' 按师傅所授先校过病根，返修收束更稳。' : '';
  const repaired = withNamedItem(state, content, {
    ...target,
    quality: Number(clampQuality(target.quality + qualityDelta).toFixed(3)),
    qualityDimensions: dimensions,
    defects: (target.defects ?? []).filter((entry) => !removeIds.has(entry.id)),
    repairHistory: [
      {
        id: `repair-${target.id}-${state.calendar.day}-${(target.repairHistory ?? []).length + 1}`,
        defectId: defect.id,
        optionId: option.id,
        day: state.calendar.day,
        phase: state.calendar.phase,
        qualityDelta,
        summary: `${option.description}${mentorRepair ? '（按师傅所授先校病根）' : ''}`,
        mentorGuided: mentorRepair,
        sourceStageId: defect.sourceStageId,
        sourceStageName: defect.sourceStageName,
      },
      ...(target.repairHistory ?? []),
    ].slice(0, 8),
    descriptors: [...new Set([...target.descriptors, ...(option.descriptors ?? []), ...(mentorRepair ? ['师承返修'] : [])])].slice(0, 8),
    appraisal: `${target.appraisal} ${option.appraisalAppend}${mentorRepairNote}`,
  });
  const resources: ResourcePool = {
    ...state.resources,
    labor: (state.resources.labor ?? 0) - laborCost,
  };
  for (const [resourceId, amount] of Object.entries(option.resourceCost ?? {})) {
    resources[resourceId] = (resources[resourceId] ?? 0) - amount;
  }
  const flags = new Set(state.flags);
  flags.add(`item-repaired:${option.id}`);
  flags.add(`item-defect-repaired:${defect.id}`);
  if (mentorRepair) {
    flags.add(`mentor-repair-used:${option.id}`);
    flags.add(`mentor-repair-defect:${defect.id}`);
  }
  for (const flag of option.flags ?? []) flags.add(flag);
  const costLabel = resourceCostLabel(content, option.resourceCost);
  const costNote = costLabel ? `，耗 ${costLabel}` : '';
  const base = {
    ...state,
    resources,
    flags: [...flags],
    itemInstances: state.itemInstances.map((item) => (item.id === itemId ? repaired : item)),
  };
  const withEffect = applyEffect(base, {
    metrics: option.metrics ?? {},
    logMessage:
      `返修「${itemShortName(repaired, content)}」的「${defect.label}」：${option.label}${costNote}，` +
      `品相 ${Math.round(target.quality * 100)}→${Math.round(repaired.quality * 100)}${mentorRepair ? '，师傅所授使收束更稳' : ''}。`,
  });
  return applyProfileXp(withEffect, mergeProfileXp({ craft: 1 }, profileXpFromAttributes(option.attributes)));
}

function bestGiftPreference(npc: NpcDef, item: ItemInstance) {
  const matches = (npc.preferences ?? []).filter((preference) => {
    if (preference.minQuality !== undefined && itemEffectiveQuality(item) < preference.minQuality) return false;
    if (preference.resourceIds && !preference.resourceIds.includes(item.resourceId)) return false;
    if (preference.craftIds && (!item.sourceCraftId || !preference.craftIds.includes(item.sourceCraftId))) {
      return false;
    }
    if (preference.originRegionIds && !preference.originRegionIds.includes(item.originRegionId)) return false;
    if (
      preference.descriptorIncludes &&
      !preference.descriptorIncludes.some((word) =>
        item.descriptors.some((descriptor) => descriptor.includes(word)) ||
        item.appraisal.includes(word) ||
        item.inscription?.includes(word),
      )
    ) {
      return false;
    }
    return true;
  });
  return matches.sort((a, b) => b.affinityBonus - a.affinityBonus)[0] ?? null;
}

function giftItem(state: GameState, content: GameContent, itemId: string, npcId: string): GameState {
  const target = state.itemInstances.find((item) => item.id === itemId);
  const npc = (content.npcs ?? []).find((item) => item.id === npcId);
  if (!target || !npc) return state;
  if (target.status === 'gifted') {
    return { ...state, log: pushLog(state.log, '这件作品已经赠出。') };
  }
  if (target.status === 'sold') {
    return { ...state, log: pushLog(state.log, '这件作品已经售出，不能再赠予他人。') };
  }
  if ((state.resources[target.resourceId] ?? 0) < 1) {
    return { ...state, log: pushLog(state.log, '库存中已没有这件作品可赠。') };
  }
  const named = {
    ...withNamedItem(state, content, target),
    status: 'gifted' as const,
    giftedToNpcId: npcId,
  };
  const runtime = state.npcStates[npcId] ?? emptyNpcState();
  const cur = runtime.affinity || state.npcAffinity[npcId] || 0;
  const preference = bestGiftPreference(npc, target);
  const defects = itemDefects(target);
  const baseGain = Math.max(4, Math.round(5 + target.quality * 8));
  const gain = Math.max(1, baseGain + (preference?.affinityBonus ?? (npc.preferences?.length ? -2 : 0)) - itemDefectSeverity(target) * 2);
  const nextAffinity = Math.min(AFFINITY_MAX, cur + gain);
  const intel = revealNpcIntel(state, npc, runtime, nextAffinity);
  const npcState: NpcRuntimeState = {
    ...runtime,
    affinity: nextAffinity,
    stage: relationshipStageForAffinity(nextAffinity),
    lastTalkTurn: state.turn,
    knownTopics: intel.knownTopics,
    revealedIntelIds: intel.revealedIntelIds,
  };
  const flags = new Set(state.flags);
  for (const flag of intel.flags) flags.add(flag);
  if (itemEffectiveQuality(target) >= MASTERWORK_MIN_QUALITY && defects.length === 0) flags.add('gifted-first-masterwork');
  if (defects.length > 0) {
    flags.add('gifted-defective-item');
    for (const defect of defects) flags.add(`gifted-defect:${defect.id}`);
  }
  const preferenceNote = preference ? `，正合其意「${preference.label}」` : npc.preferences?.length ? '，但并非其偏好' : '';
  const defectNote = defects.length > 0 ? `，只是${itemDefectSummary(target)}，情分打了折` : '';
  const intelLog = intel.newlyRevealed.length ? `；又听得「${intel.newlyRevealed.join('」「')}」` : '';
  return applyProfileXp({
    ...state,
    flags: [...flags],
    resources: {
      ...state.resources,
      [target.resourceId]: Math.max(0, (state.resources[target.resourceId] ?? 0) - 1),
    },
    npcAffinity: { ...state.npcAffinity, [npcId]: nextAffinity },
    npcStates: { ...state.npcStates, [npcId]: npcState },
    itemInstances: state.itemInstances.map((item) => (item.id === itemId ? named : item)),
    log: pushLog(state.log, `把「${named.displayName}」赠予「${npc.name}」${preferenceNote}${defectNote}${intelLog}（好感 ${cur}→${nextAffinity}）。`),
  }, { people: 2, commerce: npc.role === 'vendor' ? 1 : 0 });
}

function sellItem(state: GameState, content: GameContent, itemId: string): GameState {
  const target = state.itemInstances.find((item) => item.id === itemId);
  if (!target) return state;
  if (target.status === 'gifted') {
    return { ...state, log: pushLog(state.log, '这件作品已经赠出，不能再售出。') };
  }
  if (target.status === 'sold') {
    return { ...state, log: pushLog(state.log, '这件作品已经售出。') };
  }
  if ((state.resources[target.resourceId] ?? 0) < 1) {
    return { ...state, log: pushLog(state.log, '库存中已没有这件作品可售。') };
  }

  const named = withNamedItem(state, content, target);
  const saleValue = itemSaleValue(content, state, named);
  const locationLabel = `${regionNameFor(content, state.currentRegion)} · ${subregionNameFor(content, state.currentRegion, state.currentSubregion)}`;
  const sold: ItemInstance = {
    ...named,
    status: 'sold',
    soldForCoin: saleValue,
    soldAtDay: state.calendar.day,
    soldAtPhase: state.calendar.phase,
    soldAtRegionId: state.currentRegion,
    soldAtSubregionId: state.currentSubregion,
    appraisal: `${named.appraisal} 后于「${locationLabel}」售出，成交 ${saleValue} 文。`,
  };
  const flags = new Set(state.flags);
  flags.add('item-sold');
  flags.add(`item-sold:${target.resourceId}`);
  if (target.status === 'displayed') flags.add('displayed-item-sold');
  if (itemEffectiveQuality(target) >= MASTERWORK_MIN_QUALITY && itemDefects(target).length === 0) {
    flags.add('sold-first-masterwork');
  }
  return applyProfileXp({
    ...state,
    flags: [...flags],
    resources: {
      ...state.resources,
      [target.resourceId]: Math.max(0, (state.resources[target.resourceId] ?? 0) - 1),
      coin: (state.resources.coin ?? 0) + saleValue,
    },
    itemInstances: state.itemInstances.map((item) => (item.id === itemId ? sold : item)),
    log: pushLog(state.log, `售出「${itemShortName(sold, content)}」，入账 ${saleValue} 文。`),
  }, { commerce: 2, people: target.status === 'displayed' ? 1 : 0 });
}

function inscribeItem(
  state: GameState,
  content: GameContent,
  itemId: string,
  npcId: string | undefined,
  inscription: string,
): GameState {
  const target = state.itemInstances.find((item) => item.id === itemId);
  if (!target) return state;
  if (itemIsTransferredAway(target)) {
    return { ...state, log: pushLog(state.log, transferredItemActionMessage(target, '题跋')) };
  }
  const npc = npcId ? (content.npcs ?? []).find((item) => item.id === npcId) : null;
  const named = withNamedItem(state, content, target);
  const collaboratorNpcIds = new Set(named.collaboratorNpcIds ?? []);
  if (npcId) collaboratorNpcIds.add(npcId);
  const inscribed = {
    ...named,
    collaboratorNpcIds: [...collaboratorNpcIds],
    inscription,
  };
  const flags = new Set(state.flags);
  flags.add('inscribed-first-masterwork');
  return applyProfileXp({
    ...state,
    flags: [...flags],
    itemInstances: state.itemInstances.map((item) => (item.id === itemId ? inscribed : item)),
    log: pushLog(state.log, `${npc?.name ?? '来客'}为「${inscribed.displayName}」题跋：${inscription}`),
  }, { knowledge: 1, mind: 1 });
}

function routeNameForId(content: GameContent, routeId: string) {
  const route = (content.regionContent ?? [])
    .flatMap((entry) => entry.routes)
    .find((candidate) => candidate.id === routeId);
  return route?.name ?? routeId;
}

function currentRegionRouteIds(state: GameState, content: GameContent) {
  const routes = (content.regionContent ?? []).flatMap((entry) => entry.routes);
  return routes
    .filter((route) => route.fromRegionId === state.currentRegion || route.toRegionId === state.currentRegion)
    .map((route) => route.id);
}

function routeById(content: GameContent, routeId: string): RouteSpec | null {
  return allRouteSpecs(content).find((route) => route.id === routeId) ?? null;
}

function npcRouteIdsForAction(state: GameState, content: GameContent, npc: NpcDef): string[] {
  return [
    ...new Set(
      (npc.intel ?? [])
        .flatMap((intel) => intel.routeIds ?? [])
        .concat(npc.regionId === state.currentRegion ? currentRegionRouteIds(state, content) : []),
    ),
  ];
}

function escortCandidateRoutes(state: GameState, content: GameContent, npc: NpcDef): RouteSpec[] {
  const unlocked = new Set(state.unlockedRegions);
  return npcRouteIdsForAction(state, content, npc)
    .map((routeId) => routeById(content, routeId))
    .filter((route): route is RouteSpec => Boolean(route))
    .filter((route) => unlocked.has(route.fromRegionId) || unlocked.has(route.toRegionId))
    .sort((a, b) => routeRiskScore(state, b) - routeRiskScore(state, a));
}

function escortQuality(state: GameState, npc: NpcDef, route: RouteSpec): number {
  const attributes = state.profile.attributes;
  const preparation =
    attributes.stamina * 1.4 +
    attributes.commerce * 0.9 +
    regionReputationOf(state, npc.regionId) * 0.25 +
    routeStabilityOf(state, route.id) * 0.2 +
    (routeIntelKnown(route, state.flags) ? 6 : 0);
  return Math.max(0.35, Math.min(0.96, Number(((60 + preparation - routeRiskScore(state, route)) / 100).toFixed(2))));
}

function escortStabilityGain(quality: number): number {
  if (quality >= 0.78) return 11;
  if (quality >= 0.58) return 8;
  return 5;
}

function escortQualityLabel(quality: number): string {
  if (quality >= 0.78) return '稳妥';
  if (quality >= 0.58) return '可交差';
  return '惊险';
}

function escortEncounterFlag(encounterId: string) {
  return `escort-encounter:${encounterId}`;
}

function escortEncounterForRoute(state: GameState, content: GameContent, routeId: string) {
  const runCount = state.routeEscortRuns[routeId] ?? 0;
  const flags = new Set(state.flags);
  return (content.escortEncounters ?? [])
    .filter((encounter) => encounter.routeIds.includes(routeId))
    .filter((encounter) => runCount >= (encounter.minEscortRuns ?? 0))
    .filter((encounter) => !encounter.once || !state.flags.includes(escortEncounterFlag(encounter.id)))
    .filter((encounter) => !encounter.requiredFlags?.some((flag) => !flags.has(flag)))
    .filter((encounter) => !encounter.blockedFlags?.some((flag) => flags.has(flag)))
    .sort((a, b) => (b.minEscortRuns ?? 0) - (a.minEscortRuns ?? 0) || a.id.localeCompare(b.id))[0] ?? null;
}

function resolveEscortEncounter(encounter: EscortEncounterDef | null, quality: number) {
  if (!encounter) return null;
  const success = quality >= encounter.minQuality;
  const outcome = success ? encounter.success : encounter.failure;
  return { encounter, success, outcome };
}

function mergeEscortOutcome(
  base: EscortEncounterOutcomeDef | undefined,
  extra: Partial<EscortEncounterOutcomeDef> | undefined,
): EscortEncounterOutcomeDef | undefined {
  if (!base && !extra) return undefined;
  return {
    log: `${base?.log ?? ''}${extra?.log ?? ''}`,
    flags: [...(base?.flags ?? []), ...(extra?.flags ?? [])],
    rewardCoin: (base?.rewardCoin ?? 0) + (extra?.rewardCoin ?? 0),
    routeStabilityDelta: (base?.routeStabilityDelta ?? 0) + (extra?.routeStabilityDelta ?? 0),
    regionReputationDelta: (base?.regionReputationDelta ?? 0) + (extra?.regionReputationDelta ?? 0),
    metrics: mergeMetricDelta(base?.metrics ?? {}, extra?.metrics ?? {}),
    attributes: mergeProfileXp(
      profileXpFromAttributes(base?.attributes),
      profileXpFromAttributes(extra?.attributes),
    ),
  };
}

function beginEscortCrisis(
  state: GameState,
  npc: NpcDef,
  route: RouteSpec,
  encounter: EscortEncounterDef,
  quality: number,
  risk: number,
): GameState {
  const pending: PendingEscortCrisis = {
    id: `escort-crisis-${encounter.id}-${state.turn}-${state.calendar.day}-${state.calendar.phase}`,
    npcId: npc.id,
    routeId: route.id,
    encounterId: encounter.id,
    quality,
    risk,
    createdDay: state.calendar.day,
  };
  return {
    ...state,
    pendingEscortCrisis: pending,
    log: pushLog(
      state.log,
      `随「${npc.name}」护送「${route.name}」时遭遇「${encounter.title}」，需要先定下处置。`,
    ),
  };
}

function settleEscortRun(
  state: GameState,
  content: GameContent,
  npc: NpcDef,
  runtime: NpcRuntimeState,
  route: RouteSpec,
  quality: number,
  risk: number,
  encounter: EscortEncounterDef | null,
  choice?: EscortCrisisChoiceDef,
): GameState {
  const encounterResult = resolveEscortEncounter(encounter, quality);
  const choiceOutcome = choice
    ? (encounterResult?.success ? choice.success : choice.failure)
    : undefined;
  const encounterOutcome = mergeEscortOutcome(encounterResult?.outcome, choiceOutcome);
  const stabilityGain = escortStabilityGain(quality) + (encounterOutcome?.routeStabilityDelta ?? 0);
  const rewardCoin = Math.max(6, Math.round(6 + risk * 0.16 + quality * 10 + (encounterOutcome?.rewardCoin ?? 0)));
  const regionGain = (quality >= 0.78 ? 3 : 2) + (encounterOutcome?.regionReputationDelta ?? 0);
  const affinityResult = updateNpcAffinityAfterFunction(
    state,
    npc.id,
    runtime,
    'escort',
    quality >= 0.78 ? 5 : 4,
  );
  const knownTopics = new Set(runtime.knownTopics);
  for (const topic of npc.knowledgeTags ?? []) knownTopics.add(topic);
  knownTopics.add(`route:${route.id}`);
  knownTopics.add(`escort:${route.id}`);
  if (encounterResult) {
    knownTopics.add(`escort-encounter:${encounterResult.encounter.id}`);
    for (const topic of encounterResult.encounter.topics ?? []) knownTopics.add(topic);
  }
  if (choice) {
    knownTopics.add(`escort-choice:${choice.id}`);
    for (const topic of choice.topics ?? []) knownTopics.add(topic);
  }
  const nextRuntime = {
    ...affinityResult.runtime,
    knownTopics: [...knownTopics],
  };
  const flags = [`npc-escort:${npc.id}`, `escort:${route.id}`, `route-known:${route.id}`];
  if (encounterResult) {
    flags.push(
      escortEncounterFlag(encounterResult.encounter.id),
      `escort-encounter-${encounterResult.success ? 'success' : 'failure'}:${encounterResult.encounter.id}`,
    );
    flags.push(...(encounterOutcome?.flags ?? []));
  }
  if (choice) flags.push(`escort-choice:${choice.id}`, ...(choice.flags ?? []));
  const base = functionBaseState(
    { ...state, pendingEscortCrisis: null },
    npc.id,
    nextRuntime,
    'escort',
    flags,
  );
  const withEscortRun: GameState = {
    ...base,
    routeEscortRuns: {
      ...base.routeEscortRuns,
      [route.id]: (base.routeEscortRuns[route.id] ?? 0) + 1,
    },
  };
  const choiceLog = choice ? `；抉择「${choice.label}」：${choice.desc}` : '';
  const encounterLog = encounterResult
    ? `；事件「${encounterResult.encounter.title}」：${encounterResult.encounter.desc}${choiceLog}${encounterOutcome?.log ?? ''}`
    : '';
  const withEffect = applyEffect(withEscortRun, {
    resources: { labor: -ESCORT_LABOR_COST, coin: rewardCoin },
    metrics: mergeMetricDelta({ market: 1, life: quality >= 0.78 ? 1 : 0 }, encounterOutcome?.metrics ?? {}),
    logMessage:
      `随「${npc.name}」护送「${route.name}」，路况${routeRiskLabel(risk)}，` +
      `结果${escortQualityLabel(quality)}，入账 ${rewardCoin} 文（好感 ${affinityResult.cur}→${affinityResult.nextAffinity}）${encounterLog}。`,
  });
  const withProfile = applyProfileXp(
    withEffect,
    mergeProfileXp({ stamina: 1, commerce: 1 }, profileXpFromAttributes(encounterOutcome?.attributes)),
  );
  let next = grantRouteStability(withProfile, content, [route.id], stabilityGain, `护送「${route.name}」`);
  next = grantRegionReputation(next, content, route.fromRegionId, regionGain, `护送「${route.name}」`);
  const toRegionGain = regionGain > 0 ? Math.max(1, regionGain - 1) : regionGain;
  return grantRegionReputation(next, content, route.toRegionId, toRegionGain, `护送「${route.name}」`);
}

function resolveEscortCrisis(state: GameState, content: GameContent, choiceId: string): GameState {
  const pending = state.pendingEscortCrisis;
  if (!pending) return state;
  const npc = (content.npcs ?? []).find((candidate) => candidate.id === pending.npcId);
  const route = routeById(content, pending.routeId);
  const encounter = (content.escortEncounters ?? []).find((candidate) => candidate.id === pending.encounterId) ?? null;
  if (!npc || !route || !encounter) {
    return {
      ...state,
      pendingEscortCrisis: null,
      log: pushLog(state.log, '护商危机数据已失效，已撤销本次待处理事件。'),
    };
  }
  const choice = encounter.choices?.find((candidate) => candidate.id === choiceId);
  if (!choice) return { ...state, log: pushLog(state.log, '请选择一条可行的护商处置。') };
  if ((state.resources.labor ?? 0) < ESCORT_LABOR_COST) {
    return { ...state, log: pushLog(state.log, '工时不足，暂不能结算当前护商危机。') };
  }
  const runtime = state.npcStates[pending.npcId] ?? emptyNpcState();
  const quality = Number(clampQuality(pending.quality + (choice.qualityDelta ?? 0)).toFixed(2));
  return settleEscortRun(state, content, npc, runtime, route, quality, pending.risk, encounter, choice);
}

function supplyCrisisFlag(pending: PendingSupplyCrisis, choiceId: string) {
  return `supply-crisis:${choiceId}:${pending.routeId}`;
}

function supplyCrisisResourceLabel(content: GameContent, pending: PendingSupplyCrisis) {
  return pending.resourceId ? resourceName(content, pending.resourceId) : '商路补给';
}

const SUPPLY_CRISIS_CHOICE_LABEL: Record<SupplyCrisisChoiceId, string> = {
  'buy-relief': '垫资补货',
  'send-workers': '派人护路',
  'accept-shortage': '承受短缺',
};

function supplyRecordResourceLabel(content: GameContent, record: SupplyCrisisRecord) {
  return record.resourceId ? resourceName(content, record.resourceId) : '商路补给';
}

function createSupplyCrisisRecord(
  state: GameState,
  pending: PendingSupplyCrisis,
  choiceId: SupplyCrisisChoiceId,
  summary: string,
): SupplyCrisisRecord {
  const strained = choiceId === 'accept-shortage';
  return {
    id: `supply-record-${pending.routeId}-${state.turn}-${state.calendar.day}-${state.supplyCrisisRecords.length + 1}`,
    routeId: pending.routeId,
    resourceId: pending.resourceId,
    risk: pending.risk,
    severity: pending.severity,
    choiceId,
    choiceLabel: SUPPLY_CRISIS_CHOICE_LABEL[choiceId],
    createdDay: pending.createdDay,
    resolvedDay: state.calendar.day,
    followUpDay: state.calendar.day + (strained ? 1 : 2),
    status: strained ? 'strained' : 'watch',
    coinCost: pending.coinCost,
    laborCost: pending.laborCost,
    summary,
  };
}

function addSupplyCrisisRecord(state: GameState, record: SupplyCrisisRecord): GameState {
  return {
    ...state,
    supplyCrisisRecords: [record, ...(state.supplyCrisisRecords ?? [])].slice(0, 24),
  };
}

function supplyFollowUpCost(record: SupplyCrisisRecord) {
  if (record.status === 'strained') {
    return { labor: record.severity + 1, coin: record.severity * 3 };
  }
  return { labor: 1, coin: 0 };
}

function resolveSupplyCrisis(state: GameState, content: GameContent, choiceId: string): GameState {
  const pending = state.pendingSupplyCrisis;
  if (!pending) return state;
  const route = routeById(content, pending.routeId);
  if (!route) {
    return {
      ...state,
      pendingSupplyCrisis: null,
      log: pushLog(state.log, '断供危机数据已失效，已撤销本次待处理事件。'),
    };
  }
  const resourceLabel = supplyCrisisResourceLabel(content, pending);
  const baseFlags = ['supply-crisis-resolved', `supply-crisis-route:${route.id}`, supplyCrisisFlag(pending, choiceId)];

  if (choiceId === 'buy-relief') {
    if ((state.resources.coin ?? 0) < pending.coinCost) {
      return { ...state, log: pushLog(state.log, `钱袋不足，垫资补货需要 ${pending.coinCost} 文。`) };
    }
    const summary = `垫资 ${pending.coinCost} 文稳住 ${resourceLabel}，还需在镇务中复盘商户账目。`;
    const record = createSupplyCrisisRecord(state, pending, 'buy-relief', summary);
    let next = applyEffect(
      addSupplyCrisisRecord({ ...state, pendingSupplyCrisis: null }, record),
      {
        resources: { coin: -pending.coinCost },
        metrics: { market: 1 },
        setFlags: baseFlags,
        logMessage: `为「${route.name}」垫资补货，先花 ${pending.coinCost} 文稳住 ${resourceLabel} 供应。`,
      },
    );
    next = grantRouteStability(next, content, [route.id], 3 + pending.severity, `断供补货「${route.name}」`);
    next = grantRegionReputation(next, content, route.fromRegionId, 1, `断供补货「${route.name}」`);
    return grantRegionReputation(next, content, route.toRegionId, 1, `断供补货「${route.name}」`);
  }

  if (choiceId === 'send-workers') {
    if ((state.resources.labor ?? 0) < pending.laborCost) {
      return { ...state, log: pushLog(state.log, `工时不足，派人护路需要 ${pending.laborCost} 工时。`) };
    }
    const summary = `调出 ${pending.laborCost} 工时护住 ${resourceLabel}，还需回访沿路脚店确认补给。`;
    const record = createSupplyCrisisRecord(state, pending, 'send-workers', summary);
    let next = applyProfileXp(
      applyEffect(
        addSupplyCrisisRecord({ ...state, pendingSupplyCrisis: null }, record),
        {
          resources: { labor: -pending.laborCost },
          metrics: { life: 1, market: 1 },
          setFlags: baseFlags,
          logMessage: `调出 ${pending.laborCost} 工时护住「${route.name}」，让 ${resourceLabel} 绕开最紧的一段路。`,
        },
      ),
      { stamina: 1, commerce: 1 },
    );
    next = grantRouteStability(next, content, [route.id], 4 + pending.severity, `派人护路「${route.name}」`);
    return grantRegionReputation(next, content, route.fromRegionId, 1, `派人护路「${route.name}」`);
  }

  if (choiceId === 'accept-shortage') {
    const shortageAmount = pending.resourceId
      ? Math.min(pending.severity, Math.max(0, state.resources[pending.resourceId] ?? 0))
      : 0;
    const resourceDelta = pending.resourceId && shortageAmount > 0
      ? { [pending.resourceId]: -shortageAmount }
      : undefined;
    const summary = `${resourceLabel}${shortageAmount > 0 ? `短少 ${shortageAmount}` : '名声受损'}，必须尽快在镇务中复盘稳路。`;
    const record = createSupplyCrisisRecord(state, pending, 'accept-shortage', summary);
    let next = applyEffect(
      addSupplyCrisisRecord({ ...state, pendingSupplyCrisis: null }, record),
      {
        resources: resourceDelta,
        metrics: { market: -1, life: -1 },
        setFlags: [...baseFlags, 'supply-crisis-shortage-accepted'],
        logMessage: `「${route.name}」断供未能及时补救，${resourceLabel}${shortageAmount > 0 ? `短少 ${shortageAmount}` : '名声受损'}。`,
      },
    );
    next = grantRouteStability(next, content, [route.id], -(3 + pending.severity), `承受断供「${route.name}」`);
    next = grantRegionReputation(next, content, route.fromRegionId, -1, `承受断供「${route.name}」`);
    return grantRegionReputation(next, content, route.toRegionId, -1, `承受断供「${route.name}」`);
  }

  return { ...state, log: pushLog(state.log, '请选择一条可行的断供处置。') };
}

function stabilizeSupplyRoute(state: GameState, content: GameContent, recordId: string): GameState {
  const record = (state.supplyCrisisRecords ?? []).find((candidate) => candidate.id === recordId);
  if (!record) return { ...state, log: pushLog(state.log, '没有找到这条断供记录。') };
  if (record.status === 'closed') return { ...state, log: pushLog(state.log, '这条断供记录已经复盘收束。') };
  const route = routeById(content, record.routeId);
  if (!route) return { ...state, log: pushLog(state.log, '断供记录对应的商路已经失效。') };
  const cost = supplyFollowUpCost(record);
  if ((state.resources.labor ?? 0) < cost.labor) {
    return { ...state, log: pushLog(state.log, `工时不足，复盘稳路需要 ${cost.labor} 工时。`) };
  }
  if ((state.resources.coin ?? 0) < cost.coin) {
    return { ...state, log: pushLog(state.log, `钱囊不足，复盘稳路需要 ${cost.coin} 文。`) };
  }
  const resourceLabel = supplyRecordResourceLabel(content, record);
  const records = (state.supplyCrisisRecords ?? []).map((candidate) =>
    candidate.id === record.id
      ? {
          ...candidate,
          status: 'closed' as const,
          summary: `${candidate.summary} 已复盘 ${route.name} 的商户账与脚店补给。`,
        }
      : candidate,
  );
  let next = applyEffect(
    { ...state, supplyCrisisRecords: records },
    {
      resources: { labor: -cost.labor, coin: -cost.coin },
      metrics: record.status === 'strained' ? { market: 1, life: 1 } : { market: 1 },
      setFlags: [`supply-followup:${record.id}`, `supply-followup-stabilized:${route.id}`],
      logMessage:
        `复盘「${route.name}」断供账，补齐 ${resourceLabel} 的沿路凭信，` +
        `耗 ${cost.labor} 工时${cost.coin > 0 ? `、${cost.coin} 文` : ''}。`,
    },
  );
  next = applyProfileXp(next, { commerce: 1, people: record.status === 'strained' ? 1 : 0 });
  next = grantRouteStability(next, content, [route.id], 2 + record.severity, `断供复盘「${route.name}」`);
  next = grantRegionReputation(next, content, route.fromRegionId, 1, `断供复盘「${route.name}」`);
  return grantRegionReputation(next, content, route.toRegionId, record.status === 'strained' ? 1 : 0, `断供复盘「${route.name}」`);
}

function settleSupplyCrisisFollowUps(state: GameState, content: GameContent): GameState {
  const records = state.supplyCrisisRecords ?? [];
  let next = state;
  let changed = false;
  const updatedRecords = records.map((record) => {
    if (record.status !== 'strained' || record.aftershockApplied || record.followUpDay > state.calendar.day) {
      return record;
    }
    changed = true;
    const route = routeById(content, record.routeId);
    if (!route) {
      return {
        ...record,
        status: 'watch' as const,
        aftershockApplied: true,
        summary: `${record.summary} 后续商路资料缺失，已转入观察。`,
      };
    }
    const resourceLabel = supplyRecordResourceLabel(content, record);
    next = applyEffect(next, {
      metrics: { market: -1 },
      setFlags: [`supply-crisis-aftershock:${route.id}`],
      logMessage:
        `「${route.name}」断供余波未平，${resourceLabel} 行商压价观望，需在镇务中复盘稳路。`,
    });
    next = grantRouteStability(next, content, [route.id], -(2 + record.severity), `断供余波「${route.name}」`);
    next = grantRegionReputation(next, content, route.fromRegionId, -1, `断供余波「${route.name}」`);
    next = grantRegionReputation(next, content, route.toRegionId, -1, `断供余波「${route.name}」`);
    return {
      ...record,
      status: 'watch' as const,
      aftershockApplied: true,
      summary: `${record.summary} 余波已显，行商压价观望，仍可复盘稳路。`,
    };
  });
  return changed ? { ...next, supplyCrisisRecords: updatedRecords } : next;
}

type SparStyle = 'calligraphy' | 'forge' | 'tea' | 'textile' | 'craft' | 'trade';

interface SparProfile {
  style: SparStyle;
  name: string;
  method: string;
  attributes: Partial<Record<PlayerAttributeKey, number>>;
  masteryAttributes: Partial<Record<PlayerAttributeKey, number>>;
  metrics: Partial<Metrics>;
  topics: string[];
  primaryAttributes: PlayerAttributeKey[];
}

function sparProfileForNpc(npc: NpcDef): SparProfile {
  const tags = new Set(npc.knowledgeTags ?? []);
  if (tags.has('calligraphy') || tags.has('literati') || tags.has('stationery')) {
    return {
      style: 'calligraphy',
      name: '书法问答',
      method: '以诗句、用笔和器物题名互相试探',
      attributes: { knowledge: 2, mind: 1 },
      masteryAttributes: { people: 1 },
      metrics: { spirit: 1 },
      topics: ['calligraphy', 'inscription'],
      primaryAttributes: ['knowledge', 'mind'],
    };
  }
  if (tags.has('metal') || tags.has('sword') || tags.has('gold-leaf') || tags.has('silver') || tags.has('ornament')) {
    return {
      style: 'forge',
      name: '锻打较艺',
      method: '听火色、试手劲，校一段材料性情',
      attributes: { craft: 2, stamina: 1 },
      masteryAttributes: { knowledge: 1 },
      metrics: { heritage: 1 },
      topics: ['metalwork', 'tool-handling'],
      primaryAttributes: ['craft', 'stamina'],
    };
  }
  if (tags.has('tea') || tags.has('farming') || tags.has('yard') || tags.has('solar-term')) {
    return {
      style: 'tea',
      name: '茶事农时',
      method: '辨水候、看苗势，把日常经验落到手上',
      attributes: { mind: 1, knowledge: 1, people: 1 },
      masteryAttributes: { craft: 1 },
      metrics: { life: 1 },
      topics: ['daily-practice', 'seasonal-life'],
      primaryAttributes: ['knowledge', 'mind'],
    };
  }
  if (
    tags.has('textile') ||
    tags.has('brocade') ||
    tags.has('dye') ||
    tags.has('embroidery') ||
    tags.has('umbrella') ||
    tags.has('paper') ||
    tags.has('ink') ||
    tags.has('ceramic') ||
    tags.has('lacquer') ||
    tags.has('stone') ||
    tags.has('jade') ||
    tags.has('painting') ||
    tags.has('pigment')
  ) {
    return {
      style: 'textile',
      name: '工法拆招',
      method: '拆一段工序的节律、材料和手势',
      attributes: { craft: 2, knowledge: 1 },
      masteryAttributes: { mind: 1 },
      metrics: { heritage: 1, spirit: 1 },
      topics: ['craft-practice'],
      primaryAttributes: ['craft', 'knowledge'],
    };
  }
  if (tags.has('route') || tags.has('trade') || tags.has('logistics') || tags.has('consignment')) {
    return {
      style: 'trade',
      name: '路账推演',
      method: '推一张货单的路资、时限和人情担保',
      attributes: { commerce: 2, knowledge: 1 },
      masteryAttributes: { people: 1 },
      metrics: { market: 1 },
      topics: ['route-risk', 'trade-ledger'],
      primaryAttributes: ['commerce', 'knowledge'],
    };
  }
  return {
    style: 'craft',
    name: '手艺切磋',
    method: '照着本地规矩试一回手上功夫',
    attributes: { craft: 1, knowledge: 1, mind: 1 },
    masteryAttributes: { people: 1 },
    metrics: { heritage: 1 },
    topics: ['craft-practice'],
    primaryAttributes: ['craft', 'knowledge'],
  };
}

function sparQuality(state: GameState, npc: NpcDef, profile: SparProfile, affinity: number) {
  const playerScore = profile.primaryAttributes.reduce(
    (sum, key) => sum + (state.profile.attributes[key] ?? 0),
    0,
  ) / Math.max(1, profile.primaryAttributes.length);
  const craft = npc.anchorCraftId ? findCraftState(state, npc.anchorCraftId) : undefined;
  const craftScore = craft ? (craft.metrics.heritage + craft.metrics.spirit) / 2 : 18;
  const phaseBonus = state.calendar.phase === 'dusk' || state.calendar.phase === 'night' ? 0.03 : 0;
  const roll = ((stableTextHash(`${state.seed}:${state.turn}:${state.calendar.day}:${npc.id}`) % 21) - 10) / 100;
  return Number(clampQuality(0.38 + affinity / 240 + playerScore / 230 + craftScore / 280 + phaseBonus + roll).toFixed(2));
}

function sparQualityLabel(quality: number) {
  if (quality >= 0.82) return '压住场';
  if (quality >= 0.66) return '互有胜负';
  if (quality >= 0.5) return '勉强跟上';
  return '露了怯';
}

function mergeMetricDelta(base: Partial<Metrics>, add: Partial<Metrics>) {
  const next = { ...base };
  for (const key of METRIC_KEYS) {
    if (add[key] !== undefined) next[key] = (next[key] ?? 0) + (add[key] as number);
  }
  return next;
}

function markNpcFunctionUsed(
  runtime: NpcRuntimeState,
  functionKind: NpcFunctionKind,
  day: number,
  affinity: number,
  extra?: Partial<NpcRuntimeState>,
): NpcRuntimeState {
  return {
    ...runtime,
    ...extra,
    affinity,
    stage: relationshipStageForAffinity(affinity),
    lastTalkTurn: extra?.lastTalkTurn ?? runtime.lastTalkTurn,
    usedFunctionDays: {
      ...(runtime.usedFunctionDays ?? {}),
      [functionKind]: day,
    },
  };
}

function functionAffinityGain(functionKind: NpcFunctionKind) {
  if (functionKind === 'escort') return 4;
  if (functionKind === 'spar') return 4;
  if (functionKind === 'collab') return 5;
  if (functionKind === 'appraisal') return 4;
  return 3;
}

function updateNpcAffinityAfterFunction(
  state: GameState,
  npcId: string,
  runtime: NpcRuntimeState,
  functionKind: NpcFunctionKind,
  gain = functionAffinityGain(functionKind),
) {
  const cur = runtime.affinity || state.npcAffinity[npcId] || 0;
  const nextAffinity = Math.min(AFFINITY_MAX, cur + gain);
  return {
    cur,
    nextAffinity,
    runtime: markNpcFunctionUsed(runtime, functionKind, state.calendar.day, nextAffinity, {
      lastTalkTurn: state.turn,
    }),
  };
}

function itemShortName(item: ItemInstance, content: GameContent) {
  return item.displayName ?? resourceName(content, item.resourceId);
}

function resourceCostLabel(content: GameContent, cost: ResourcePool | undefined) {
  return Object.entries(cost ?? {})
    .filter(([, amount]) => amount > 0)
    .map(([resourceId, amount]) => `${resourceName(content, resourceId)}×${amount}`)
    .join('、');
}

function missingResourcesForCost(state: GameState, cost: ResourcePool | undefined) {
  return Object.entries(cost ?? {}).filter(([, amount]) => amount > 0)
    .filter(([resourceId, amount]) => availableResourceAmount(state, resourceId) < amount);
}

function mergeResourceCosts(...costs: Array<ResourcePool | undefined>): ResourcePool | undefined {
  const merged: ResourcePool = {};
  for (const cost of costs) {
    for (const [resourceId, amount] of Object.entries(cost ?? {})) {
      if (amount > 0) merged[resourceId] = (merged[resourceId] ?? 0) + amount;
    }
  }
  return Object.keys(merged).length > 0 ? merged : undefined;
}

function resourceDeltaFromCost(cost: ResourcePool | undefined): ResourcePool {
  const delta: ResourcePool = {};
  for (const [resourceId, amount] of Object.entries(cost ?? {})) {
    if (amount > 0) delta[resourceId] = -amount;
  }
  return delta;
}

function collabRecipeMatchesItem(recipe: CollabRecipeDef, item: ItemInstance) {
  const hasResourceScope = (recipe.resourceIds?.length ?? 0) > 0;
  const hasCraftScope = (recipe.craftIds?.length ?? 0) > 0;
  if (!hasResourceScope && !hasCraftScope) return true;
  if (hasResourceScope && recipe.resourceIds?.includes(item.resourceId)) return true;
  if (hasCraftScope && item.sourceCraftId && recipe.craftIds?.includes(item.sourceCraftId)) return true;
  return false;
}

function collabRecipeForItem(content: GameContent, npcId: string, item: ItemInstance) {
  return (content.collabRecipes ?? []).find((recipe) =>
    recipe.npcId === npcId && collabRecipeMatchesItem(recipe, item)
  ) ?? null;
}

function collabChoiceForRecipe(recipe: CollabRecipeDef, choiceId?: string): CollabRecipeChoiceDef | null {
  if (!recipe.choices?.length) return null;
  if (!choiceId) return recipe.choices[0];
  return recipe.choices.find((choice) => choice.id === choiceId) ?? null;
}

function collabChoiceLabel(choice: CollabRecipeChoiceDef | null) {
  return choice ? ` · ${choice.label}` : '';
}

function collabPartnerNpcIds(choice: CollabRecipeChoiceDef | null, primaryNpcId: string): string[] {
  return [...new Set(choice?.partnerNpcIds ?? [])].filter((partnerId) => partnerId && partnerId !== primaryNpcId);
}

function collabTrialScore(state: GameState, npcId: string, item: ItemInstance): number {
  const attributes = state.profile.attributes;
  const playerFinesse = ((attributes.craft ?? 0) + (attributes.knowledge ?? 0) + (attributes.mind ?? 0)) / 3;
  const affinity = Math.max(state.npcAffinity[npcId] ?? 0, state.npcStates[npcId]?.affinity ?? 0);
  return Number(clampQuality(item.quality + affinity / 500 + playerFinesse / 600).toFixed(3));
}

function applyCollabPartnerMemory(
  state: GameState,
  recipe: CollabRecipeDef,
  choice: CollabRecipeChoiceDef | null,
  partnerNpcIds: string[],
  extraTopics: string[] = [],
): GameState {
  if (partnerNpcIds.length === 0) return state;
  let next = state;
  for (const partnerNpcId of partnerNpcIds) {
    const runtime = next.npcStates[partnerNpcId] ?? emptyNpcState();
    const cur = runtime.affinity || next.npcAffinity[partnerNpcId] || 0;
    const nextAffinity = Math.min(AFFINITY_MAX, cur + 2);
    const knownTopics = new Set(runtime.knownTopics);
    knownTopics.add(`collab-partner:${recipe.id}`);
    knownTopics.add(`collab-partner-with:${recipe.npcId}`);
    if (choice) knownTopics.add(`collab-choice:${choice.id}`);
    for (const topic of recipe.topics ?? []) knownTopics.add(topic);
    for (const topic of choice?.topics ?? []) knownTopics.add(topic);
    for (const topic of extraTopics) knownTopics.add(topic);
    next = {
      ...next,
      npcAffinity: { ...next.npcAffinity, [partnerNpcId]: nextAffinity },
      npcStates: {
        ...next.npcStates,
        [partnerNpcId]: {
          ...runtime,
          affinity: nextAffinity,
          stage: relationshipStageForAffinity(nextAffinity),
          lastTalkTurn: next.turn,
          knownTopics: [...knownTopics],
        },
      },
    };
  }
  return next;
}

function homeVisitMatchesItem(visit: HomeVisitDef, item: ItemInstance) {
  if (visit.minQuality !== undefined && itemEffectiveQuality(item) < visit.minQuality) return false;
  if (visit.focusResourceIds?.includes(item.resourceId)) return true;
  if (visit.focusCraftIds && item.sourceCraftId && visit.focusCraftIds.includes(item.sourceCraftId)) return true;
  if (
    visit.descriptorIncludes?.some((word) =>
      item.descriptors.some((descriptor) => descriptor.includes(word)) ||
      item.appraisal.includes(word) ||
      item.inscription?.includes(word) ||
      item.displayName?.includes(word),
    )
  ) {
    return true;
  }
  return !visit.focusResourceIds?.length && !visit.focusCraftIds?.length && !visit.descriptorIncludes?.length;
}

function bestDisplayedItemForVisit(items: ItemInstance[], visit: HomeVisitDef | null) {
  return items
    .filter((item) => item.status === 'displayed')
    .filter((item) => !visit || homeVisitMatchesItem(visit, item))
    .sort((a, b) => itemEffectiveQuality(b) - itemEffectiveQuality(a) || b.quality - a.quality || a.createdTurn - b.createdTurn)[0] ?? null;
}

function homeVisitAvailable(state: GameState, visit: HomeVisitDef) {
  const flags = new Set(state.flags);
  if (visit.requiredFlags?.some((flag) => !flags.has(flag))) return false;
  if (visit.blockedFlags?.some((flag) => flags.has(flag))) return false;
  return true;
}

function homeVisitPriority(visit: HomeVisitDef) {
  return (visit.requiredFlags?.length ?? 0) * 10 + (visit.blockedFlags?.length ?? 0);
}

function homeVisitCandidate(state: GameState, content: GameContent, npcId: string) {
  const displayedItems = state.itemInstances.filter((item) => item.status === 'displayed');
  const candidates = (content.homeVisits ?? [])
    .filter((visit) => visit.npcId === npcId && homeVisitAvailable(state, visit))
    .map((visit) => ({ visit, item: bestDisplayedItemForVisit(displayedItems, visit) }))
    .filter((candidate): candidate is { visit: HomeVisitDef; item: ItemInstance } => Boolean(candidate.item))
    .sort((a, b) => homeVisitPriority(b.visit) - homeVisitPriority(a.visit) || a.visit.id.localeCompare(b.visit.id));
  if (candidates[0]) return candidates[0];
  return { visit: null, item: bestDisplayedItemForVisit(displayedItems, null) };
}

function homeVisitChoiceForVisit(visit: HomeVisitDef | null, choiceId?: string): HomeVisitChoiceDef | null {
  if (!visit?.choices?.length || !choiceId) return null;
  return visit.choices.find((choice) => choice.id === choiceId) ?? null;
}

function applyHomeVisitChoiceToItem(
  state: GameState,
  content: GameContent,
  item: ItemInstance | null,
  npc: NpcDef,
  choice: HomeVisitChoiceDef | null,
): ItemInstance[] {
  if (!item || !choice || (!choice.inscription && !choice.appraisalAppend)) return state.itemInstances;
  const named = withNamedItem(state, content, item);
  const inscription = choice.inscription
    ? named.inscription
      ? `${named.inscription} / ${choice.inscription}`
      : choice.inscription
    : named.inscription;
  const appraisal = choice.appraisalAppend
    ? `${named.appraisal} ${choice.appraisalAppend}`
    : named.appraisal;
  const nextItem: ItemInstance = {
    ...named,
    collaboratorNpcIds: [...new Set([...(named.collaboratorNpcIds ?? []), npc.id])],
    inscription,
    appraisal,
  };
  return state.itemInstances.map((candidate) => (candidate.id === item.id ? nextItem : candidate));
}

interface HomeVisitReferralResult {
  order: ActiveOrder;
  flags: string[];
  topics: string[];
  regionReputationDelta: number;
  note: string;
}

function homeVisitReferralRewardCoin(
  state: GameState,
  content: GameContent,
  item: ItemInstance,
  referral: HomeVisitReferralOrderDef,
  resourceId: string,
  quantity: number,
) {
  if (referral.rewardCoin !== undefined) return referral.rewardCoin;
  const rank = resourceTierRank(content, resourceId);
  const value = content.resources?.find((resource) => resource.id === resourceId)?.value ?? (rank >= 3 ? 18 : rank >= 2 ? 12 : 6);
  const reputation = regionReputationOf(state, item.originRegionId);
  return Math.max(12, Math.round(value * quantity + item.quality * 18 + reputation * 0.12 + 8));
}

function createHomeVisitReferralOrder(
  state: GameState,
  content: GameContent,
  npc: NpcDef,
  item: ItemInstance | null,
  choice: HomeVisitChoiceDef | null,
  recordId: string,
): HomeVisitReferralResult | null {
  const referral = choice?.referralOrder;
  if (!item || !choice || choice.kind !== 'collect' || !referral) return null;
  const named = withNamedItem(state, content, item);
  const itemName = itemShortName(named, content);
  const resourceId = referral.resourceId ?? item.resourceId;
  const rank = resourceTierRank(content, resourceId);
  const quantity = referral.quantity ?? (rank >= 3 ? 1 : 2);
  const minQuality = Math.min(
    0.9,
    Math.max(0.45, Number((referral.minQuality ?? Math.max(0.48, item.quality - 0.08)).toFixed(2))),
  );
  const expiresIn = referral.expiresIn ?? 8;
  const order: ActiveOrder = {
    id: `homevisit-order-${choice.id}-${state.calendar.day}-${state.turn}-${(state.activeOrders ?? []).length + 1}`,
    npcId: npc.id,
    regionId: item.originRegionId || npc.regionId,
    title: referral.title,
    desc: `${referral.desc} 参照珍品阁「${itemName}」的陈列标准，需 ${quantity} 份${resourceName(content, resourceId)}，品相不低于 ${Math.round(minQuality * 100)}。`,
    resourceId,
    quantity,
    minQuality,
    rewardCoin: homeVisitReferralRewardCoin(state, content, item, referral, resourceId, quantity),
    rewardMetrics: mergeMetricDelta({ market: 1, heritage: 1 }, referral.rewardMetrics ?? {}),
    rewardAttributes: mergeNumberDeltas<PlayerAttributeKey>({ commerce: 1, people: 1 }, referral.rewardAttributes),
    reputationAtCreation: regionReputationOf(state, item.originRegionId || npc.regionId),
    sourceHomeVisitRecordId: recordId,
    sourceHomeVisitChoiceId: choice.id,
    orderKind: 'referral',
    createdDay: state.calendar.day,
    expiresDay: state.calendar.day + expiresIn,
    status: 'active',
  };
  return {
    order,
    flags: [`homevisit-referral:${choice.id}`, `homevisit-referral-order:${order.id}`, ...(referral.flags ?? [])],
    topics: ['homevisit-referral', 'collection-referral', ...(referral.topics ?? [])],
    regionReputationDelta: referral.regionReputationDelta ?? 1,
    note: `并留下转介绍订单「${order.title}」`,
  };
}

function functionBaseState(
  state: GameState,
  npcId: string,
  runtime: NpcRuntimeState,
  functionKind: NpcFunctionKind,
  flags: Iterable<string> = [],
) {
  const nextFlags = new Set(state.flags);
  nextFlags.add(`npc-function:${functionKind}:${npcId}`);
  for (const flag of flags) nextFlags.add(flag);
  return {
    ...state,
    flags: [...nextFlags],
    npcAffinity: { ...state.npcAffinity, [npcId]: runtime.affinity },
    npcStates: { ...state.npcStates, [npcId]: runtime },
  };
}

function resourceTierRank(content: GameContent, resourceId: string) {
  const tier = content.resources?.find((resource) => resource.id === resourceId)?.tier;
  if (tier === 'product') return 3;
  if (tier === 'material') return 2;
  if (tier === 'raw') return 1;
  return 0;
}

interface OrderResourceCandidate {
  resourceId: string;
  sourceWeight: number;
}

const WEATHER_ORDER_PATTERNS: Record<GameWeather, RegExp> = {
  clear: /晴|晒|日光|耐晒|晒场/,
  rain: /雨|伞|防潮|水路|河|船/,
  snow: /雪|高寒|补给|驿|山路/,
};

const WEATHER_RESOURCE_BONUS: Record<GameWeather, Record<string, number>> = {
  clear: { gambieredSilk: 28 },
  rain: { oilpaperUmbrella: 38 },
  snow: { tea: 12, bambooWare: 8, thangka: 6 },
};

function orderResourceCandidates(npc: NpcDef, content: GameContent): OrderResourceCandidate[] {
  const candidates = new Map<string, number>();
  const add = (resourceId: string | undefined, weight: number) => {
    if (!resourceId) return;
    candidates.set(resourceId, Math.max(candidates.get(resourceId) ?? 0, weight));
  };
  for (const resourceId of (npc.preferences ?? []).flatMap((preference) => preference.resourceIds ?? [])) {
    add(resourceId, 55);
  }
  const craftOutput = content.crafts.find((craft) => craft.id === npc.anchorCraftId)?.outputResourceId;
  add(craftOutput, 48);
  const activityOutput = Object.keys(
    (content.activities ?? []).find((activity) => activity.id === npc.anchorCraftId)?.reward.resources ?? {},
  ).filter((key) => key !== 'coin' && key !== 'labor');
  for (const resourceId of activityOutput) add(resourceId, 38);
  for (const resourceId of (content.resources ?? [])
    .filter((resource) => resource.tier === 'product')
    .map((resource) => resource.id)) {
    add(resourceId, 10);
  }
  return [...candidates.entries()].map(([resourceId, sourceWeight]) => ({ resourceId, sourceWeight }));
}

function orderCandidateScore(
  state: GameState,
  content: GameContent,
  npc: NpcDef,
  candidate: OrderResourceCandidate,
  affinity: number,
) {
  const rank = resourceTierRank(content, candidate.resourceId);
  const reputation = regionReputationOf(state, npc.regionId);
  const highReputationDemand = rank >= 3 ? reputation * 0.36 : Math.max(0, 28 - reputation) * 0.22;
  const relationshipTrust = Math.min(18, affinity * 0.22);
  const deterministicTieBreak = stableTextHash(`${npc.id}:${candidate.resourceId}:${state.calendar.day}`) % 9;
  return (
    candidate.sourceWeight +
    orderWeatherCandidateBonus(npc, candidate.resourceId, state.calendar.weather) +
    rank * 12 +
    highReputationDemand +
    relationshipTrust +
    deterministicTieBreak
  );
}

function orderWeatherCandidateBonus(npc: NpcDef, resourceId: string, weather: GameWeather) {
  let bonus = WEATHER_RESOURCE_BONUS[weather][resourceId] ?? 0;
  const pattern = WEATHER_ORDER_PATTERNS[weather];
  for (const preference of npc.preferences ?? []) {
    if (preference.resourceIds?.includes(resourceId) && pattern.test(preference.label)) bonus += 18;
  }
  return Math.min(56, bonus);
}

function orderWeatherTerms(npc: NpcDef, resourceId: string, weather: GameWeather) {
  const hasWeatherPreference = orderWeatherCandidateBonus(npc, resourceId, weather) > 0;
  if (weather === 'rain' && hasWeatherPreference) {
    return {
      rewardPremium: resourceId === 'oilpaperUmbrella' ? 14 : 8,
      minQualityDelta: resourceId === 'oilpaperUmbrella' ? 0.03 : 0.01,
      expiresIn: resourceId === 'oilpaperUmbrella' ? 5 : 6,
      note: resourceId === 'oilpaperUmbrella'
        ? '雨季急单，伞面要齐整，交期也更紧。'
        : '雨水扰市，客人更在意防潮与准时。',
    };
  }
  if (weather === 'clear' && hasWeatherPreference) {
    return {
      rewardPremium: 8,
      minQualityDelta: 0.02,
      expiresIn: 6,
      note: '晴日正宜晒制，客人愿为及时交付加钱。',
    };
  }
  if (weather === 'snow' && hasWeatherPreference) {
    return {
      rewardPremium: 12,
      minQualityDelta: 0.02,
      expiresIn: 6,
      note: '雪路补给吃紧，交期留得不多。',
    };
  }
  return { rewardPremium: 0, minQualityDelta: 0, expiresIn: 7, note: '' };
}

interface NpcOrderTerms {
  orderKind: ActiveOrder['orderKind'];
  titleSuffix: string;
  descLead: string;
  creditNote: string;
  depositCoin: number;
  rewardPremium: number;
  minQualityDelta: number;
  expiresInDelta: number;
  creditTrustScore?: number;
}

function orderTrustScore(
  state: GameState,
  npc: NpcDef,
  affinity: number,
  reputation: number,
  routeRisk: number,
) {
  const attrs = state.profile.attributes;
  const routeKnownBonus = (npc.intel ?? [])
    .flatMap((intel) => intel.routeIds ?? [])
    .some((routeId) => state.flags.includes(`route-known:${routeId}`)) ? 8 : 0;
  const piaohaoBonus = state.flags.includes('sanjin-piaohao-credit-note') || state.flags.includes('piaohao-credit') ? 26 : 0;
  const consignmentBonus = state.flags.includes('fang-route-ledger-advice') ? 8 : 0;
  return Math.max(0, Math.min(100, Math.round(
    reputation * 0.65 +
    affinity * 0.45 +
    (attrs.commerce ?? 0) * 1.15 +
    (attrs.people ?? 0) * 0.7 +
    routeKnownBonus +
    piaohaoBonus +
    consignmentBonus -
    routeRisk * 0.18,
  )));
}

function npcOrderTerms(
  state: GameState,
  npc: NpcDef,
  affinity: number,
  reputation: number,
  routeRisk: number,
): NpcOrderTerms {
  const tags = new Set(npc.knowledgeTags ?? []);
  const trust = orderTrustScore(state, npc, affinity, reputation, routeRisk);
  if (npc.id === 'sj-lei-zhanggui') {
    const depositCoin = trust >= 62 ? 0 : trust >= 42 ? 6 : 12;
    return {
      orderKind: 'credit',
      titleSuffix: '信用押货单',
      descLead: '票号看的是兑付、押货与失约成本。',
      creditNote: depositCoin > 0
        ? `信用 ${trust}，票号先收 ${depositCoin} 文保票，按期交付返还；误期会伤票号信用。`
        : `信用 ${trust}，票号愿先垫保票，不另收押金；误期会伤票号信用。`,
      depositCoin,
      rewardPremium: depositCoin + (trust >= 62 ? 10 : 6),
      minQualityDelta: trust >= 62 ? 0.03 : 0.05,
      expiresInDelta: trust >= 62 ? -1 : 0,
      creditTrustScore: trust,
    };
  }
  if (npc.id === 'jj-song-yasi') {
    const palaceBacker =
      state.flags.includes('collector-reputation-palace-renewed') ||
      state.flags.includes('palace-order-ready') ||
      state.flags.includes('jingji-official-permit');
    const permitTrust = Math.min(100, trust + (palaceBacker ? 14 : 0));
    const formalPermit = permitTrust >= 72;
    const depositCoin = formalPermit ? 0 : permitTrust >= 48 ? 8 : 16;
    return {
      orderKind: 'palace',
      titleSuffix: formalPermit ? '官样采办许可单' : '官样采办预审单',
      descLead: '官署门房先审名帖、商誉与担保。',
      creditNote: depositCoin > 0
        ? `采办商誉 ${permitTrust}，先押 ${depositCoin} 文名帖保金；误期会折损门房担保。`
        : `采办商誉 ${permitTrust}，宋押司愿免押名帖，只按宫样验收结果结账；误期仍会折损门房担保。`,
      depositCoin,
      rewardPremium: depositCoin + (formalPermit ? 18 : 10),
      minQualityDelta: formalPermit ? 0.08 : 0.12,
      expiresInDelta: formalPermit ? 0 : -1,
      creditTrustScore: permitTrust,
    };
  }
  if (npc.id === 'jn-fang-jiheng' || tags.has('consignment')) {
    const depositCoin = trust >= 62 ? 0 : trust >= 38 ? 5 : 9;
    return {
      orderKind: 'consignment',
      titleSuffix: '码头寄售单',
      descLead: '码头寄售先看货名、仓单和准时交付。',
      creditNote: depositCoin > 0
        ? `商誉 ${trust}，先押 ${depositCoin} 文仓单押金，交付时连同货款返还；误期押金不退。`
        : `商誉 ${trust}，方季衡愿免押仓单，只按交付结果结账；误期会损码头信用。`,
      depositCoin,
      rewardPremium: depositCoin + 5,
      minQualityDelta: 0.03,
      expiresInDelta: -1,
      creditTrustScore: trust,
    };
  }
  return {
    orderKind: 'npc',
    titleSuffix: '订单',
    descLead: '',
    creditNote: '',
    depositCoin: 0,
    rewardPremium: 0,
    minQualityDelta: 0,
    expiresInDelta: 0,
    creditTrustScore: undefined,
  };
}

function orderRouteIdsForNpc(
  state: GameState,
  content: GameContent,
  npc: NpcDef,
  reputation: number,
): string[] {
  const routeIds = [
    ...new Set(
      (npc.intel ?? [])
        .flatMap((intel) => intel.routeIds ?? [])
        .concat(npc.regionId === state.currentRegion ? currentRegionRouteIds(state, content) : []),
    ),
  ];
  if (reputation >= 60) return routeIds.slice(0, 3);
  if (reputation >= 24) return routeIds.slice(0, 2);
  return routeIds.slice(0, 1);
}

function orderRouteRisk(state: GameState, content: GameContent, routeIds: string[]) {
  const routeMap = new Map(allRouteSpecs(content).map((route) => [route.id, route]));
  return routeIds.reduce((max, routeId) => {
    const route = routeMap.get(routeId);
    return route ? Math.max(max, routeRiskScore(state, route)) : max;
  }, 0);
}

function createNpcOrder(
  state: GameState,
  content: GameContent,
  npc: NpcDef,
  affinity: number,
): ActiveOrder {
  const candidates = orderResourceCandidates(npc, content);
  const resourceId = candidates
    .sort((a, b) => orderCandidateScore(state, content, npc, b, affinity) - orderCandidateScore(state, content, npc, a, affinity))[0]
    ?.resourceId ?? 'bambooWare';
  const rank = resourceTierRank(content, resourceId);
  const reputation = regionReputationOf(state, npc.regionId);
  const routeIds = orderRouteIdsForNpc(state, content, npc, reputation);
  const routeRisk = orderRouteRisk(state, content, routeIds);
  const weatherTerms = orderWeatherTerms(npc, resourceId, state.calendar.weather);
  const orderTerms = npcOrderTerms(state, npc, affinity, reputation, routeRisk);
  const quantity =
    rank >= 3
      ? 1 + (reputation >= 70 ? 1 : 0)
      : Math.max(1, 2 + (reputation >= 36 ? 1 : 0) - (rank <= 1 ? 1 : 0));
  const baseValue = content.resources?.find((resource) => resource.id === resourceId)?.value ?? (rank >= 2 ? 12 : 6);
  const reputationPremium = Math.round(reputation * (rank >= 3 ? 0.28 : 0.12));
  const riskPremium = routeRisk > 0 ? Math.round(routeRisk * 0.18) : 0;
  const rewardCoin = Math.max(8, Math.round(
    baseValue * quantity +
    8 +
    affinity / 8 +
    reputationPremium +
    riskPremium +
    weatherTerms.rewardPremium +
    orderTerms.rewardPremium,
  ));
  const minQuality = Math.min(
    0.88,
    Number((
      (rank >= 3 ? 0.52 : 0.42) +
      reputation * 0.002 +
      routeRisk * 0.001 +
      weatherTerms.minQualityDelta +
      orderTerms.minQualityDelta
    ).toFixed(2)),
  );
  const itemName = resourceName(content, resourceId);
  const routeNote = routeIds.length > 0
    ? `还要照看${routeNamesForIds(content, routeIds).slice(0, 2).join('、')}的路况。`
    : '这是一张本地熟客单。';
  const expiresIn = Math.max(3, weatherTerms.expiresIn + orderTerms.expiresInDelta);
  const deadlineNote = expiresIn < 7 ? `限 ${expiresIn} 日内交付。` : '';
  const creditNote = orderTerms.creditNote ? `${orderTerms.descLead}${orderTerms.creditNote}` : '';
  return {
    id: `order-${npc.id}-${state.calendar.day}-${state.turn}-${(state.activeOrders ?? []).length + 1}`,
    npcId: npc.id,
    regionId: npc.regionId,
    title: `${npc.name}的${itemName}${orderTerms.titleSuffix}`,
    desc: `${npc.name}要 ${quantity} 份${itemName}，看重来路、品相和能否按时交付。${routeNote}${weatherTerms.note}${deadlineNote}${creditNote}`,
    resourceId,
    quantity,
    minQuality,
    rewardCoin,
    rewardMetrics: { market: 2, life: 1 },
    rewardAttributes: { commerce: 2, people: 1 },
    routeIds,
    routeRisk,
    reputationAtCreation: reputation,
    orderKind: orderTerms.orderKind,
    depositCoin: orderTerms.depositCoin,
    creditTrustScore: orderTerms.creditTrustScore,
    creditNote: orderTerms.creditNote,
    createdDay: state.calendar.day,
    expiresDay: state.calendar.day + expiresIn,
    status: 'active',
  };
}

function activeOrderForNpc(state: GameState, npcId: string) {
  return (state.activeOrders ?? []).find((order) => order.npcId === npcId && order.status === 'active') ?? null;
}

function consumeOrderItems(items: ItemInstance[], order: ActiveOrder) {
  let remaining = order.quantity;
  return items.filter((item) => {
    if (remaining <= 0) return true;
    if (
      itemIsUnavailableForConsumption(item) ||
      item.resourceId !== order.resourceId ||
      !orderItemMeetsRequirements(item, order)
    ) {
      return true;
    }
    remaining -= 1;
    return false;
  });
}

function fulfillOrder(state: GameState, content: GameContent, orderId: string): GameState {
  const order = (state.activeOrders ?? []).find((candidate) => candidate.id === orderId);
  if (!order || order.status !== 'active') return state;
  if (order.expiresDay !== undefined && order.expiresDay < state.calendar.day) {
    return expireOrdersForDay(state, content, state.calendar.day);
  }
  if (availableResourceAmount(state, order.resourceId) < order.quantity) {
    return {
      ...state,
      log: pushLog(state.log, `库存不足，无法交付「${order.title}」。`),
    };
  }
  const deliveryIssue = orderDeliveryIssue(state, order, content);
  if (deliveryIssue) return { ...state, log: pushLog(state.log, deliveryIssue) };

  const npc = (content.npcs ?? []).find((item) => item.id === order.npcId);
  const runtime = state.npcStates[order.npcId] ?? emptyNpcState();
  const cur = runtime.affinity || state.npcAffinity[order.npcId] || 0;
  const nextAffinity = Math.min(AFFINITY_MAX, cur + 6);
  const npcState: NpcRuntimeState = {
    ...runtime,
    affinity: nextAffinity,
    stage: relationshipStageForAffinity(nextAffinity),
    lastTalkTurn: state.turn,
    usedFunctionDays: runtime.usedFunctionDays ?? {},
  };
  const flags = new Set(state.flags);
  flags.add(`order-completed:${order.id}`);
  flags.add(`npc-order-completed:${order.npcId}`);
  if (order.orderKind && order.orderKind !== 'npc') {
    flags.add(`${order.orderKind}-order-completed:${order.npcId}`);
  }
  if ((order.depositCoin ?? 0) > 0) flags.add(`deposit-refunded:${order.npcId}`);
  if (order.sourceActivityId) {
    flags.add(`activity-order-completed:${order.sourceActivityId}`);
    if (order.orderKind) flags.add(`${order.orderKind}-order-completed:${order.sourceActivityId}`);
  }
  if (order.sourceHomeVisitRecordId) flags.add(`homevisit-order-completed:${order.sourceHomeVisitRecordId}`);
  if (order.sourceHomeVisitChoiceId) flags.add(`homevisit-referral-completed:${order.sourceHomeVisitChoiceId}`);
  for (const routeId of order.routeIds ?? []) flags.add(`route-known:${routeId}`);

  const base: GameState = {
    ...state,
    resources: {
      ...state.resources,
      [order.resourceId]: (state.resources[order.resourceId] ?? 0) - order.quantity,
      coin: (state.resources.coin ?? 0) + order.rewardCoin,
    },
    itemInstances: consumeOrderItems(state.itemInstances, order),
    activeOrders: (state.activeOrders ?? []).map((candidate) =>
      candidate.id === order.id ? { ...candidate, status: 'completed' } : candidate,
    ),
    flags: [...flags],
    npcAffinity: { ...state.npcAffinity, [order.npcId]: nextAffinity },
    npcStates: { ...state.npcStates, [order.npcId]: npcState },
    log: pushLog(
      state.log,
      `交付「${order.title}」，入账 ${order.rewardCoin} 文${(order.depositCoin ?? 0) > 0 ? `（含押金返还 ${order.depositCoin} 文）` : ''}（${npc?.name ?? order.npcId}好感 ${cur}→${nextAffinity}）。`,
    ),
  };
  const withMetrics = order.rewardMetrics ? applyEffect(base, { metrics: order.rewardMetrics }) : recompute(base);
  const withProfile = applyProfileXp(withMetrics, order.rewardAttributes ?? { commerce: 1 });
  const withRoutes = grantRouteStability(withProfile, content, order.routeIds, 2, `交付「${order.title}」`);
  return grantRegionReputation(withRoutes, content, order.regionId ?? npc?.regionId ?? state.currentRegion, 3, `交付「${order.title}」`);
}

function useNpcFunction(
  state: GameState,
  content: GameContent,
  npcId: string,
  functionKind: NpcFunctionKind,
  itemId?: string,
  collabChoiceId?: string,
  homeVisitChoiceId?: string,
): GameState {
  const npc = (content.npcs ?? []).find((candidate) => candidate.id === npcId);
  if (!npc) return state;
  const label = NPC_FUNCTION_LABELS[functionKind] ?? functionKind;
  if (!(npc.functions ?? []).includes(functionKind)) {
    return { ...state, log: pushLog(state.log, `「${npc.name}」暂不能提供「${label}」。`) };
  }
  if (functionKind === 'quest') {
    return { ...state, log: pushLog(state.log, `「${npc.name}」的委托已列在委托栏中，可按条件交付。`) };
  }
  const runtime = state.npcStates[npcId] ?? emptyNpcState();
  const affinity = runtime.affinity || state.npcAffinity[npcId] || 0;
  const requiredAffinity = npcFunctionRequirement(functionKind);
  if (affinity < requiredAffinity) {
    return {
      ...state,
      log: pushLog(state.log, `「${npc.name}」还不愿提供「${label}」（好感 ${affinity}/${requiredAffinity}）。`),
    };
  }
  if (runtime.usedFunctionDays?.[functionKind] === state.calendar.day) {
    return { ...state, log: pushLog(state.log, `今日已向「${npc.name}」请过「${label}」，明日再来。`) };
  }
  if (npcFunctionNeedsItem(functionKind) && !itemId) {
    return { ...state, log: pushLog(state.log, `请选择一件作品，再请「${npc.name}」进行「${label}」。`) };
  }

  if (functionKind === 'mentor') {
    const affinityResult = updateNpcAffinityAfterFunction(state, npcId, runtime, functionKind);
    const intel = revealNpcIntel(state, npc, runtime, Math.min(AFFINITY_MAX, affinity + 8));
    const lessons = craftMentorLessons(content, npc, affinityResult.runtime);
    const knownTopics = new Set(intel.knownTopics);
    const lessonFlags: string[] = [];
    for (const lesson of lessons) {
      knownTopics.add(`craft-mentor:${lesson.spec.craftId}`);
      knownTopics.add(`craft-interaction:${lesson.spec.id}`);
      if (lesson.stage) knownTopics.add(`craft-stage:${lesson.stage.id}`);
      if (lesson.defect) knownTopics.add(`craft-defect:${lesson.defect.id}`);
      if (lesson.repair) knownTopics.add(`craft-repair:${lesson.repair.id}`);
      lessonFlags.push(`craft-mentor:${lesson.spec.craftId}`, `craft-interaction:${lesson.spec.id}`);
      if (lesson.stage) lessonFlags.push(`craft-mentor-stage:${lesson.stage.id}`);
      if (lesson.defect) lessonFlags.push(`craft-mentor-defect:${lesson.defect.id}`);
      if (lesson.repair) lessonFlags.push(`craft-mentor-repair:${lesson.repair.id}`);
    }
    const nextRuntime = {
      ...affinityResult.runtime,
      knownTopics: [...knownTopics],
      revealedIntelIds: intel.revealedIntelIds,
    };
    const intelLog = intel.newlyRevealed.length ? `，并点出「${intel.newlyRevealed.join('」「')}」` : '';
    const lessonLog = lessons.length
      ? `；${lessons.map((lesson) => craftMentorLessonLine(content, lesson)).join('；')}`
      : '';
    const base = functionBaseState(
      { ...state, flags: intel.flags },
      npcId,
      nextRuntime,
      functionKind,
      [`npc-mentor:${npcId}`, ...lessonFlags],
    );
    return applyProfileXp(
      applyEffect(base, {
        metrics: lessons.length ? { heritage: 1 } : undefined,
        logMessage: `向「${npc.name}」请教手艺${intelLog}${lessonLog}（好感 ${affinityResult.cur}→${affinityResult.nextAffinity}）。`,
      }),
      { craft: 1 + lessons.length, knowledge: 2, mind: 1 },
    );
  }

  if (functionKind === 'route') {
    const routeIds = [
      ...new Set(
        (npc.intel ?? []).flatMap((intel) => intel.routeIds ?? []).concat(currentRegionRouteIds(state, content)),
      ),
    ].slice(0, 4);
    const affinityResult = updateNpcAffinityAfterFunction(state, npcId, runtime, functionKind);
    const knownTopics = new Set(runtime.knownTopics);
    for (const topic of npc.knowledgeTags ?? []) knownTopics.add(topic);
    for (const routeId of routeIds) knownTopics.add(`route:${routeId}`);
    const nextRuntime = {
      ...affinityResult.runtime,
      knownTopics: [...knownTopics],
    };
    const routeNames = routeIds.map((routeId) => routeNameForId(content, routeId)).join('、') || '本地小路';
    const flags = [`npc-route:${npcId}`, ...routeIds.map((routeId) => `route-known:${routeId}`)];
    const stableRoutes = grantRouteStability(
      functionBaseState(state, npcId, nextRuntime, functionKind, flags),
      content,
      routeIds,
      5,
      `请「${npc.name}」指路`,
    );
    return applyProfileXp(
      {
        ...stableRoutes,
        log: pushLog(
          stableRoutes.log,
          `「${npc.name}」替你梳理路线：${routeNames}（好感 ${affinityResult.cur}→${affinityResult.nextAffinity}）。`,
        ),
      },
      { knowledge: 1, commerce: 1 },
    );
  }

  if (functionKind === 'escort') {
    if (state.pendingEscortCrisis) {
      return { ...state, log: pushLog(state.log, '已有护商危机待处理，请先做出处置。') };
    }
    if ((state.resources.labor ?? 0) < ESCORT_LABOR_COST) {
      return { ...state, log: pushLog(state.log, `工时不足，无法请「${npc.name}」安排护商。`) };
    }
    const route = escortCandidateRoutes(state, content, npc)[0];
    if (!route) {
      return { ...state, log: pushLog(state.log, `「${npc.name}」暂时没有可安排的护商路线。`) };
    }
    const risk = routeRiskScore(state, route);
    const quality = escortQuality(state, npc, route);
    const encounter = escortEncounterForRoute(state, content, route.id);
    if (encounter?.choices?.length) return beginEscortCrisis(state, npc, route, encounter, quality, risk);
    return settleEscortRun(state, content, npc, runtime, route, quality, risk, encounter);
  }

  if (functionKind === 'spar') {
    if ((state.resources.labor ?? 0) < SPAR_LABOR_COST) {
      return { ...state, log: pushLog(state.log, `工时不足，无法与「${npc.name}」切磋。`) };
    }
    const profile = sparProfileForNpc(npc);
    const quality = sparQuality(state, npc, profile, affinity);
    const affinityResult = updateNpcAffinityAfterFunction(
      state,
      npcId,
      runtime,
      functionKind,
      quality >= 0.82 ? 6 : quality >= 0.5 ? 4 : 3,
    );
    const knownTopics = new Set(runtime.knownTopics);
    for (const topic of npc.knowledgeTags ?? []) knownTopics.add(topic);
    for (const topic of profile.topics) knownTopics.add(topic);
    knownTopics.add(`spar:${profile.style}`);
    if (npc.anchorCraftId) knownTopics.add(`anchor:${npc.anchorCraftId}`);
    const nextRuntime = {
      ...affinityResult.runtime,
      knownTopics: [...knownTopics],
    };
    const flags = [`npc-spar:${npcId}`, `spar-style:${profile.style}`];
    if (quality >= 0.82) flags.push(`spar-mastered:${npcId}`);
    const base = functionBaseState(state, npcId, nextRuntime, functionKind, flags);
    const metricDelta = mergeMetricDelta(profile.metrics, quality >= 0.82 ? { spirit: 1 } : {});
    const attributeDelta = mergeProfileXp(
      profile.attributes,
      quality >= 0.82 ? profile.masteryAttributes : quality < 0.5 ? { mind: 1 } : {},
    );
    const withEffect = applyEffect(base, {
      resources: { labor: -SPAR_LABOR_COST },
      metrics: metricDelta,
      logMessage:
        `与「${npc.name}」切磋「${profile.name}」：${profile.method}，` +
        `结果${sparQualityLabel(quality)}（${Math.round(quality * 100)} 分，好感 ${affinityResult.cur}→${affinityResult.nextAffinity}）。`,
    });
    const withProfile = applyProfileXp(withEffect, attributeDelta);
    if (quality >= 0.82) {
      return grantRegionReputation(withProfile, content, npc.regionId, 1, `与「${npc.name}」切磋`);
    }
    return withProfile;
  }

  if (functionKind === 'order') {
    const existing = activeOrderForNpc(state, npcId);
    if (existing) {
      return {
        ...state,
        log: pushLog(
          state.log,
          `「${npc.name}」已有一张未交付订单：${existing.title}，先备齐 ${existing.quantity} 份${resourceName(content, existing.resourceId)}。`,
        ),
      };
    }
    const affinityResult = updateNpcAffinityAfterFunction(state, npcId, runtime, functionKind);
    const order = createNpcOrder(state, content, npc, affinityResult.nextAffinity);
    const depositCoin = order.depositCoin ?? 0;
    if (depositCoin > (state.resources.coin ?? 0)) {
      return {
        ...state,
        log: pushLog(
          state.log,
          `接「${order.title}」需先押 ${depositCoin} 文，当前钱袋不足。`,
        ),
      };
    }
    const orderFlags = [`npc-order:${npcId}`];
    if (order.orderKind && order.orderKind !== 'npc') orderFlags.push(`${order.orderKind}-order:${npcId}`);
    if (depositCoin > 0) orderFlags.push(`deposit-order:${npcId}`);
    const base = {
      ...functionBaseState(state, npcId, affinityResult.runtime, functionKind, orderFlags),
      activeOrders: [order, ...(state.activeOrders ?? [])].slice(0, 12),
    };
    const depositNote = depositCoin > 0 ? `已先押 ${depositCoin} 文；` : '';
    return applyProfileXp(
      applyEffect(base, {
        resources: depositCoin > 0 ? { coin: -depositCoin } : undefined,
        metrics: { market: 2, life: 1 },
        logMessage: `「${npc.name}」递来订单「${order.title}」：${depositNote}${order.desc}（好感 ${affinityResult.cur}→${affinityResult.nextAffinity}）。`,
      }),
      { commerce: 2, people: 1 },
    );
  }

  if (functionKind === 'homeVisit') {
    const affinityResult = updateNpcAffinityAfterFunction(state, npcId, runtime, functionKind);
    const { visit, item } = homeVisitCandidate(state, content, npcId);
    const choice = homeVisitChoiceForVisit(visit, homeVisitChoiceId);
    if (homeVisitChoiceId && visit?.choices?.length && !choice) {
      return {
        ...state,
        log: pushLog(state.log, `「${visit.title}」没有这条来访分支。`),
      };
    }
    if (homeVisitChoiceId && !visit) {
      return {
        ...state,
        log: pushLog(state.log, `当前没有可供「${npc.name}」选择参观的陈列主题。`),
      };
    }
    const knownTopics = new Set(affinityResult.runtime.knownTopics);
    for (const topic of npc.knowledgeTags ?? []) knownTopics.add(topic);
    knownTopics.add('home-visit');
    const flags = [`npc-home-visit:${npcId}`, `baigongyuan-visitor:${npcId}`];
    if (item) {
      knownTopics.add('gallery-visit');
      knownTopics.add(`display:${item.resourceId}`);
      flags.push(`gallery-visit:${npcId}`, `gallery-visit-item:${item.id}`);
    }
    if (visit) {
      knownTopics.add(`homevisit:${visit.id}`);
      for (const topic of visit.topics ?? []) knownTopics.add(topic);
      flags.push(`homevisit:${visit.id}`, ...(visit.flags ?? []));
    }
    if (choice) {
      knownTopics.add(`homevisit-choice:${choice.id}`);
      knownTopics.add(`homevisit-kind:${choice.kind}`);
      for (const topic of choice.topics ?? []) knownTopics.add(topic);
      flags.push(`homevisit-choice:${choice.id}`, `homevisit-kind:${choice.kind}`, ...(choice.flags ?? []));
    }
    const recordId = `homevisit-${npcId}-${state.calendar.day}-${state.calendar.phase}-${(state.homeVisitRecords ?? []).length + 1}`;
    const itemName = item ? itemShortName(withNamedItem(state, content, item), content) : undefined;
    const referral = createHomeVisitReferralOrder(state, content, npc, item ?? null, choice, recordId);
    if (referral) {
      for (const topic of referral.topics) knownTopics.add(topic);
      flags.push(...referral.flags);
    }
    const nextRuntime = {
      ...affinityResult.runtime,
      knownTopics: [...knownTopics],
    };
    const summary = item && visit
      ? choice?.line ?? visit.line
      : item
        ? `「${npc.name}」在珍品阁看过「${itemName}」，说百工院终于不只是仓房，也有能让人停步的物件。`
        : `「${npc.name}」来百工院走动，看过田圃、仓房和工棚，约定日后再来细看陈列。`;
    const record = {
      id: recordId,
      npcId,
      title: visit?.title ?? (item ? '珍品阁参观' : '百工院来访'),
      day: state.calendar.day,
      phase: state.calendar.phase,
      choiceId: choice?.id,
      choiceLabel: choice?.label,
      choiceKind: choice?.kind,
      itemId: item?.id,
      itemName,
      itemResourceId: item?.resourceId,
      itemQuality: item?.quality,
      referralOrderId: referral?.order.id,
      referralTitle: referral?.order.title,
      summary,
    };
    const base: GameState = {
      ...functionBaseState(state, npcId, nextRuntime, functionKind, flags),
      itemInstances: applyHomeVisitChoiceToItem(state, content, item ?? null, npc, choice),
      homeVisitRecords: [record, ...(state.homeVisitRecords ?? [])].slice(0, 24),
      activeOrders: referral ? [referral.order, ...(state.activeOrders ?? [])].slice(0, 12) : state.activeOrders,
    };
    const metricDelta = item
      ? mergeMetricDelta(
        mergeMetricDelta(
          { life: 2, spirit: 2, market: item.quality >= MASTERWORK_MIN_QUALITY ? 1 : 0 },
          visit?.metrics ?? {},
        ),
        choice?.metrics ?? {},
      )
      : { life: 2, spirit: 1 };
    const logMessage = item
      ? `「${npc.name}」来百工院参观「${itemName}」${choice ? `，选「${choice.label}」` : ''}：${summary}${referral ? `，${referral.note}` : ''}（好感 ${affinityResult.cur}→${affinityResult.nextAffinity}）。`
      : `已约「${npc.name}」日后来百工院走动，院中生活气更足（好感 ${affinityResult.cur}→${affinityResult.nextAffinity}）。`;
    const withEffect = applyEffect(base, {
      metrics: metricDelta,
      logMessage,
    });
    const withProfile = applyProfileXp(
      withEffect,
      mergeProfileXp(
        { people: 2, mind: 1 },
        profileXpFromAttributes(visit?.attributes),
        profileXpFromAttributes(choice?.attributes),
      ),
    );
    const reputationDelta = (visit?.regionReputationDelta ?? 0) + (choice?.regionReputationDelta ?? 0) + (referral?.regionReputationDelta ?? 0);
    if (item && reputationDelta > 0) {
      return grantRegionReputation(
        withProfile,
        content,
        item.originRegionId || npc.regionId,
        reputationDelta,
        `百工院参观「${itemName}」`,
      );
    }
    return withProfile;
  }

  const target = state.itemInstances.find((item) => item.id === itemId);
  if (!target || itemIsTransferredAway(target)) {
    return { ...state, log: pushLog(state.log, `没有可供「${npc.name}」${label}的作品。`) };
  }

  if (functionKind === 'collab') {
    if (target.collaboratorNpcIds?.includes(npcId)) {
      return { ...state, log: pushLog(state.log, `「${npc.name}」已经参与过「${itemShortName(target, content)}」。`) };
    }
    const recipe = collabRecipeForItem(content, npcId, target);
    if (recipe) {
      const choice = collabChoiceForRecipe(recipe, collabChoiceId);
      if (collabChoiceId && recipe.choices?.length && !choice) {
        return {
          ...state,
          log: pushLog(state.log, `「${recipe.title}」没有这条联作分支。`),
        };
      }
      const minQuality = choice?.minQuality ?? recipe.minQuality;
      if (minQuality !== undefined && target.quality < minQuality) {
        return {
          ...state,
          log: pushLog(
            state.log,
            `「${itemShortName(target, content)}」品相尚浅，未到「${recipe.title}${collabChoiceLabel(choice)}」所需的 ${Math.round(minQuality * 100)} 分。`,
          ),
        };
      }
      const requiredResources = mergeResourceCosts(recipe.requiredResources, choice?.requiredResources);
      const missingResources = missingResourcesForCost(state, requiredResources);
      if (missingResources.length > 0) {
        const missingLabel = missingResources
          .map(([resourceId, amount]) => `${resourceName(content, resourceId)}×${amount}`)
          .join('、');
        return {
          ...state,
          log: pushLog(state.log, `「${recipe.title}${collabChoiceLabel(choice)}」缺少联作材料：${missingLabel}。`),
        };
      }
      const failure = choice?.failure;
      const trialScore = failure ? collabTrialScore(state, npcId, target) : null;
      const failedTrial = Boolean(failure && trialScore !== null && trialScore < failure.trialThreshold);
      const affinityResult = updateNpcAffinityAfterFunction(
        state,
        npcId,
        runtime,
        functionKind,
        failedTrial ? (failure?.npcAffinity ?? 1) : undefined,
      );
      const knownTopics = new Set(affinityResult.runtime.knownTopics);
      for (const topic of npc.knowledgeTags ?? []) knownTopics.add(topic);
      knownTopics.add(`collab:${recipe.id}`);
      if (choice) knownTopics.add(`collab-choice:${choice.id}`);
      for (const topic of recipe.topics ?? []) knownTopics.add(topic);
      for (const topic of choice?.topics ?? []) knownTopics.add(topic);
      if (failedTrial && failure && choice) {
        knownTopics.add(`collab-failure:${recipe.id}`);
        knownTopics.add(`collab-failure-choice:${choice.id}`);
        for (const topic of failure.topics ?? []) knownTopics.add(topic);
      }
      const nextRuntime = {
        ...affinityResult.runtime,
        knownTopics: [...knownTopics],
      };
      const partnerNpcIds = collabPartnerNpcIds(choice, npcId);
      const collaboratorNpcIds = [...new Set([...(target.collaboratorNpcIds ?? []), npcId, ...partnerNpcIds])];
      const named = withNamedItem(state, content, target);
      const commonFlags = [
        `npc-collab:${npcId}`,
        `collab-recipe:${recipe.id}`,
        ...(choice ? [`collab-choice:${choice.id}`] : []),
        ...partnerNpcIds.flatMap((partnerNpcId) => [
          `collab-partner:${partnerNpcId}`,
          ...(choice ? [`collab-choice-partner:${choice.id}:${partnerNpcId}`] : []),
        ]),
      ];
      if (failedTrial && failure && choice) {
        const failureTopics = [
          `collab-failure:${recipe.id}`,
          `collab-failure-choice:${choice.id}`,
          ...(failure.topics ?? []),
        ];
        const descriptors = [...new Set([...named.descriptors, ...(failure.descriptors ?? [])])].slice(0, 6);
        const failedItem: ItemInstance = {
          ...named,
          collaboratorNpcIds,
          descriptors,
          quality: Number(clampQuality(target.quality - (failure.qualityPenalty ?? 0.02)).toFixed(3)),
          appraisal: `${target.appraisal} ${failure.appraisalAppend}`,
        };
        const flags = [
          ...commonFlags,
          `collab-failure:${recipe.id}`,
          `collab-failure-choice:${choice.id}`,
          ...(failure.flags ?? []),
        ];
        const costLabel = resourceCostLabel(content, requiredResources);
        const costNote = costLabel ? `，耗 ${costLabel}` : '';
        const updatedItems = state.itemInstances.map((item) => (item.id === target.id ? failedItem : item));
        const base = {
          ...functionBaseState(state, npcId, nextRuntime, functionKind, flags),
          itemInstances: consumeItemInstancesExcept(updatedItems, requiredResources ?? {}, target.id),
        };
        const withEffect = applyEffect(base, {
          resources: resourceDeltaFromCost(requiredResources),
          metrics: failure.metrics ?? {},
          logMessage:
            `与「${npc.name}」联作「${itemShortName(failedItem, content)}」失手，走「${recipe.title}${collabChoiceLabel(choice)}」未压住火候${costNote}，` +
            `试手 ${Math.round((trialScore ?? 0) * 100)}/${Math.round(failure.trialThreshold * 100)}，品相 ${Math.round(target.quality * 100)}→${Math.round(failedItem.quality * 100)}（好感 ${affinityResult.cur}→${affinityResult.nextAffinity}）。`,
        });
        return applyProfileXp(
          applyCollabPartnerMemory(withEffect, recipe, choice, partnerNpcIds, failureTopics),
          mergeProfileXp({ craft: 1, mind: 1 }, profileXpFromAttributes(failure.attributes)),
        );
      }
      const bonus = recipe.qualityBonus + (choice?.qualityBonus ?? 0) + (affinity >= 50 ? 0.02 : 0);
      const descriptors = [
        ...new Set([...named.descriptors, ...(recipe.descriptors ?? []), ...(choice?.descriptors ?? [])]),
      ].slice(0, 6);
      const appraisalAppend = [recipe.appraisalAppend, choice?.appraisalAppend].filter(Boolean).join(' ');
      const collaborated: ItemInstance = {
        ...named,
        collaboratorNpcIds,
        descriptors,
        quality: Math.min(choice?.maxQuality ?? recipe.maxQuality ?? 0.99, Number((target.quality + bonus).toFixed(3))),
        appraisal: `${target.appraisal} ${appraisalAppend}`,
      };
      const flags = [
        ...commonFlags,
        ...(recipe.flags ?? []),
        ...(choice?.flags ?? []),
      ];
      if (collaborated.quality >= MASTERWORK_MIN_QUALITY) flags.push('collaborative-masterwork');
      const costLabel = resourceCostLabel(content, requiredResources);
      const costNote = costLabel ? `，耗 ${costLabel}` : '';
      const methodText = choice ? `${recipe.method} ${choice.desc}` : recipe.method;
      const updatedItems = state.itemInstances.map((item) => (item.id === target.id ? collaborated : item));
      const base = {
        ...functionBaseState(state, npcId, nextRuntime, functionKind, flags),
        itemInstances: consumeItemInstancesExcept(updatedItems, requiredResources ?? {}, target.id),
      };
      const withEffect = applyEffect(base, {
        resources: resourceDeltaFromCost(requiredResources),
        metrics: mergeMetricDelta(recipe.metrics ?? {}, choice?.metrics ?? {}),
        logMessage:
          `与「${npc.name}」联作「${itemShortName(collaborated, content)}」，走「${recipe.title}${collabChoiceLabel(choice)}」：${methodText}${costNote}，` +
          `品相 ${Math.round(target.quality * 100)}→${Math.round(collaborated.quality * 100)}（好感 ${affinityResult.cur}→${affinityResult.nextAffinity}）。`,
      });
      return applyProfileXp(
        applyCollabPartnerMemory(withEffect, recipe, choice, partnerNpcIds),
        mergeProfileXp(
          { craft: 2, people: 1 },
          profileXpFromAttributes(recipe.attributes),
          profileXpFromAttributes(choice?.attributes),
        ),
      );
    }
    const affinityResult = updateNpcAffinityAfterFunction(state, npcId, runtime, functionKind);
    const collaboratorNpcIds = [...new Set([...(target.collaboratorNpcIds ?? []), npcId])];
    const bonus = affinity >= 50 ? 0.06 : 0.04;
    const named = withNamedItem(state, content, target);
    const collaborated: ItemInstance = {
      ...named,
      collaboratorNpcIds,
      quality: Math.min(0.98, Number((target.quality + bonus).toFixed(3))),
      appraisal: `${target.appraisal} 「${npc.name}」参与修整后，作品多了一层可辨的地方手法。`,
    };
    const flags = [`npc-collab:${npcId}`];
    if (collaborated.quality >= MASTERWORK_MIN_QUALITY) flags.push('collaborative-masterwork');
    return applyProfileXp(
      {
        ...functionBaseState(state, npcId, affinityResult.runtime, functionKind, flags),
        itemInstances: state.itemInstances.map((item) => (item.id === itemId ? collaborated : item)),
        log: pushLog(
          state.log,
          `与「${npc.name}」联作「${itemShortName(collaborated, content)}」，品相 ${Math.round(target.quality * 100)}→${Math.round(collaborated.quality * 100)}（好感 ${affinityResult.cur}→${affinityResult.nextAffinity}）。`,
        ),
      },
      { craft: 2, people: 1 },
    );
  }

  if (functionKind === 'appraisal') {
    const affinityResult = updateNpcAffinityAfterFunction(state, npcId, runtime, functionKind);
    const named = withNamedItem(state, content, target);
    const descriptor = target.descriptors[0] ?? '可辨';
    const defect = highestSeverityDefect(target);
    const repairHint = defect
      ? repairOptionFor(content, target, defect.repairOptionIds[0])?.option.label
      : null;
    const repairSourceStage = target.repairHistory?.find((record) => record.sourceStageName)?.sourceStageName;
    const repairSourceNote = repairSourceStage ? `，尤其「${repairSourceStage}」这一手救得干净` : '';
    const verdict = defect
      ? `${npc.name}评曰：${descriptor}之气虽有，先看「${defect.label}」${defectSourceNote(defect)}；${repairHint ? `若能${repairHint}，` : ''}再谈题名交付。`
      : target.repairHistory?.length
        ? `${npc.name}评曰：${descriptor}之气已成，返修履历反让此物有了来路${repairSourceNote}，仍须让人记得作者。`
        : `${npc.name}评曰：${descriptor}之气已成，仍须让人记得作者。`;
    const collaboratorNpcIds = [...new Set([...(named.collaboratorNpcIds ?? []), npcId])];
    const appraised: ItemInstance = {
      ...named,
      collaboratorNpcIds,
      inscription: named.inscription ? `${named.inscription} / ${verdict}` : verdict,
    };
    const flags = [`npc-appraisal:${npcId}`];
    if (defect) {
      flags.push('appraised-defective-item', `npc-appraisal-defect:${defect.id}`);
    } else if (itemEffectiveQuality(target) >= MASTERWORK_MIN_QUALITY) {
      flags.push('appraised-masterwork');
    }
    return applyProfileXp(
      {
        ...functionBaseState(state, npcId, affinityResult.runtime, functionKind, flags),
        itemInstances: state.itemInstances.map((item) => (item.id === itemId ? appraised : item)),
        log: pushLog(
          state.log,
          `请「${npc.name}」鉴评「${itemShortName(appraised, content)}」：${verdict}（好感 ${affinityResult.cur}→${affinityResult.nextAffinity}）。`,
        ),
      },
      { knowledge: 2, commerce: 1, mind: 1 },
    );
  }

  return state;
}

function findQuestInscribeTarget(state: GameState, quest: QuestDef): ItemInstance | null {
  const reward = quest.reward.inscribe;
  if (!reward) return null;
  const minQuality = reward.minQuality ?? MASTERWORK_MIN_QUALITY;
  const candidates = state.itemInstances.filter((item) => {
    if (itemIsTransferredAway(item)) return false;
    if (itemEffectiveQuality(item) < minQuality) return false;
    if (reward.resourceIds && !reward.resourceIds.includes(item.resourceId)) return false;
    return (state.resources[item.resourceId] ?? 0) > 0 || item.status === 'displayed';
  });
  return candidates.sort((a, b) => itemEffectiveQuality(b) - itemEffectiveQuality(a) || b.quality - a.quality)[0] ?? null;
}

function mergeProfileXp(
  base: Partial<Record<PlayerAttributeKey, number>>,
  ...adds: Array<Partial<Record<PlayerAttributeKey, number>> | undefined>
) {
  const next = { ...base };
  for (const add of adds) {
    for (const [key, value] of Object.entries(add ?? {}) as [PlayerAttributeKey, number][]) {
      next[key] = (next[key] ?? 0) + value;
    }
  }
  return next;
}

/** 交付一个任务：校验好感度门槛与达成条件，发放奖励并标记完成 */
function completeQuest(state: GameState, content: GameContent, questId: string): GameState {
  const quest = (content.quests ?? []).find((q) => q.id === questId);
  if (!quest) return state;
  if (state.completedQuests.includes(questId)) return state;
  const npc = (content.npcs ?? []).find((n) => n.id === quest.npcId);
  const npcName = npc?.name ?? quest.npcId;
  const affinity = state.npcAffinity[quest.npcId] ?? 0;
  if (affinity < quest.requireAffinity) {
    return {
      ...state,
      log: pushLog(state.log, `「${npcName}」尚未足够信任你（好感 ${affinity}/${quest.requireAffinity}），暂不便托付。`),
    };
  }
  if (!quest.condition(state)) {
    return { ...state, log: pushLog(state.log, `任务「${quest.title}」的条件尚未达成。`) };
  }
  for (const [key, amount] of Object.entries(quest.cost ?? {})) {
    if ((state.resources[key] ?? 0) < amount) {
      return { ...state, log: pushLog(state.log, `任务「${quest.title}」缺少交付物：${key}×${amount}。`) };
    }
  }
  // 发放奖励
  const rewardResources: ResourcePool = {};
  for (const [key, amount] of Object.entries(quest.cost ?? {})) {
    rewardResources[key] = (rewardResources[key] ?? 0) - amount;
  }
  if (quest.reward.coin) rewardResources.coin = (rewardResources.coin ?? 0) + quest.reward.coin;
  for (const [key, amount] of Object.entries(quest.reward.resources ?? {})) {
    rewardResources[key] = (rewardResources[key] ?? 0) + amount;
  }
  const effect: GameEffect = {
    resources: rewardResources,
    metrics: quest.reward.metrics,
    setFlags: quest.reward.flags,
    logMessage: quest.completeLog.replace(/\{name\}/g, state.playerName.trim() || '无名匠人'),
  };
  const withCost = {
    ...state,
    itemInstances: consumeItemInstances(state.itemInstances, quest.cost ?? {}),
  };
  let rewarded = applyEffect(withCost, effect);
  if (quest.reward.inscribe) {
    const target = findQuestInscribeTarget(rewarded, quest);
    rewarded = target
      ? inscribeItem(
          rewarded,
          content,
          target.id,
          quest.reward.inscribe.collaboratorNpcId ?? quest.npcId,
          quest.reward.inscribe.inscription,
        )
      : { ...rewarded, log: pushLog(rewarded.log, '尚无合格作品可题跋。') };
  }
  const xp = mergeProfileXp(
    { commerce: quest.reward.coin ? 1 : 0, people: 1 },
    profileXpFromAttributes(quest.reward.attributes),
  );
  const withProfile = applyProfileXp(
    { ...rewarded, completedQuests: [...rewarded.completedQuests, questId] },
    xp,
  );
  return grantRegionReputation(withProfile, content, npc?.regionId ?? state.currentRegion, 5, `完成委托「${quest.title}」`);
}
