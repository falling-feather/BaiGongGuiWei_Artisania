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
  CropId,
  ActivityDef,
  ItemDescriptorRule,
  ItemInstance,
  PlayerAttributes,
  RegionContentSpec,
  RouteSpec,
  NpcFunctionKind,
  ActiveOrder,
} from './types';
import { applyDelta, aggregateTownMetrics, METRIC_KEYS, METRIC_LABELS } from './metrics';
import { createCalendar, createInitialState, LABOR_PER_TURN, titleForRank } from './state';
import { createRng, weightedPick } from './rng';
import { NPC_FUNCTION_LABELS, npcFunctionNeedsItem, npcFunctionRequirement } from './npcFunctions';

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
  /** 隐藏数值转古风描述词的规则 */
  itemDescriptorRules?: ItemDescriptorRule[];
}

/** 解锁一个新地区的费用（文） */
const REGION_UNLOCK_COST = 30;

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

function clampStat(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
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

type ItemSourceContext = {
  sourceActivityId?: string;
  sourceIndustryId?: string;
  sourceItemIds?: string[];
};

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
  const descriptors = rule
    ? Object.values(rule.dimensions)
        .map((words) => pickDescriptorTier(words, quality))
        .filter(Boolean)
        .slice(0, 4)
    : [];
  const resourceName = content.resources?.find((resource) => resource.id === resourceId)?.name ?? resourceId;
  const template = rule?.templates[Math.floor(Math.max(0, Math.min(0.999, quality)) * rule.templates.length)] ??
    '此物已有可辨之质，尚待名家细评。';
  const appraisal = template
    .replace(/\{item\}/g, resourceName)
    .replace(/\{descriptors\}/g, descriptors.join('、') || '朴实可用');

  return {
    id: `${resourceId}-${state.turn}-${state.itemInstances.length + 1}-${Math.abs(hashText(appraisal)).toString(36)}`,
    resourceId,
    sourceCraftId,
    ...context,
    originRegionId: state.currentRegion,
    originSubregionId: state.currentSubregion,
    createdTurn: state.turn,
    quality,
    descriptors,
    appraisal,
    status: 'held',
  };
}

function consumedItemInstances(items: ItemInstance[], cost: ResourcePool): ItemInstance[] {
  const remaining: ResourcePool = { ...cost };
  const consumed: ItemInstance[] = [];
  for (const item of items) {
    const need = remaining[item.resourceId] ?? 0;
    if (need <= 0 || item.status === 'gifted') continue;
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
    if (need <= 0 || item.status === 'gifted') return true;
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
): GameState {
  const craftDef = content.crafts.find((c) => c.id === craftId);
  const craftState = findCraftState(state, craftId);
  if (!craftDef || !craftState) return state;

  const skipSet = new Set(skipStepIds);
  const stepsToRun = craftDef.processChain.filter(
    (step) => !(skipSet.has(step.id) && step.skippable),
  );
  const stepsSkipped = craftDef.processChain.filter(
    (step) => skipSet.has(step.id) && step.skippable,
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

  // 产出与收益：跳过工序短期提产增收，但已在 skipImpact 中折损四维
  const incomeBase = 8 + stepsSkipped.length * 2;
  resources.coin = (resources.coin ?? 0) + incomeBase;

  // 供应链终端：消耗 material 后产出一件成品（product 层）
  let productNote = '';
  let itemInstance: ItemInstance | null = null;
  const outputId = craftDef.outputResourceId;
  if (outputId) {
    resources[outputId] = (resources[outputId] ?? 0) + 1;
    const productName = resourceName(content, outputId);
    const craftQuality = Math.max(0.25, Math.min(0.98, (craftMetrics.heritage + craftMetrics.spirit) / 200));
    const quality = materialQuality === null
      ? craftQuality
      : Math.max(0.25, Math.min(0.98, craftQuality * 0.55 + materialQuality * 0.45));
    itemInstance = createItemInstance(
      state,
      content,
      outputId,
      craftDef.id,
      quality,
      craftDef.synergyTags,
      { sourceItemIds: consumedMaterials.map((item) => item.id) },
    );
    productNote = `，得「${productName}」×1（${itemInstance.descriptors.join('、') || '可用'}）`;
  }

  const crafts = state.crafts.map((c) =>
    c.craftId === craftId ? { ...c, metrics: craftMetrics, produced: c.produced + 1 } : c,
  );

  const skipNote = stepsSkipped.length > 0 ? `（省略了 ${stepsSkipped.length} 道工序）` : '';
  const next: GameState = {
    ...state,
    resources,
    crafts,
    itemInstances: itemInstance ? [itemInstance, ...itemInstancesAfterCost].slice(0, 80) : itemInstancesAfterCost,
    log: pushLog(
      itemInstance ? pushLog(state.log, itemInstance.appraisal) : state.log,
      `「${craftDef.name}」完成一批出品${skipNote}${productNote}，入账 ${incomeBase} 文。`,
    ),
  };
  return recompute(applyProfileXp(next, { craft: 2, mind: stepsSkipped.length > 0 ? 0 : 1 }));
}

function advanceTimePhase(state: GameState, content: GameContent): GameState {
  const currentIndex = TIME_PHASES.indexOf(state.calendar.phase);
  if (currentIndex < 0 || currentIndex >= TIME_PHASES.length - 1) return endTurn(state, content);
  const phase = TIME_PHASES[currentIndex + 1];
  return {
    ...state,
    calendar: { ...state.calendar, phase },
    log: pushLog(state.log, `时辰推进到${TIME_PHASE_LABEL[phase]}。`),
  };
}

/** 推进到下一回合：补给、抽事件、判定结局 */
function endTurn(state: GameState, content: GameContent): GameState {
  if (state.pendingEvent) {
    return { ...state, log: pushLog(state.log, '请先处理当前事件，再结束这一季。') };
  }

  // 到达回合上限 → 结算
  if (state.turn >= state.maxTurns) {
    const report = generateReport(state);
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

  // 抽取事件
  const rng = createRng(state.seed + state.turn * 1013);
  const event = weightedPick(content.events, rng);

  let next: GameState = {
    ...state,
    turn: state.turn + 1,
    calendar: createCalendar(state.calendar.day + 1, 'morning'),
    farmPlots: state.farmPlots.map((plot) =>
      plot.cropId
        ? { ...plot, growth: Math.min(100, plot.growth + (plot.wateredToday ? 34 : 18)), wateredToday: false }
        : { ...plot, wateredToday: false },
    ),
    resources,
    seed: rng.seed,
    pendingEvent: event ?? null,
    log: pushLog(state.log, `第 ${state.turn + 1} 季到来。`),
  };

  // 危机判定：任一镇级数值跌至冰点
  const crisisKey = METRIC_KEYS.find((k) => next.metrics[k] <= 5);
  if (crisisKey) {
    const report = generateReport(next);
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
    const isHarvest = Object.keys(industry.input).length === 0;
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

  // 结算：扣除输入与人力，按 quality 决定产量（1–3 倍 yield）
  const q = Math.max(0, Math.min(1, quality));
  const produced = Math.max(1, Math.round(industry.yield * (1 + q)));
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
      `「${industry.name}」产出 ${produced} 份${q >= 0.8 ? '上品' : ''}。`,
    ),
  }, { stamina: 1, knowledge: Object.keys(industry.input).length === 0 ? 1 : 0 });
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
  if ((state.resources.labor ?? 0) < WATER_LABOR_COST) {
    return { ...state, log: pushLog(state.log, '工时不足，今日顾不上田圃了。') };
  }
  return applyProfileXp({
    ...state,
    resources: { ...state.resources, labor: (state.resources.labor ?? 0) - WATER_LABOR_COST },
    farmPlots: state.farmPlots.map((item) =>
      item.id === plotId
        ? { ...item, wateredToday: true, growth: Math.min(100, item.growth + 8) }
        : item,
    ),
    log: pushLog(state.log, '给田圃浇了水，苗势稳了些。'),
  }, { stamina: 1, mind: 1 });
}

function harvestCrop(state: GameState, content: GameContent, plotId: string): GameState {
  if (!isFarmSubregion(state, content)) {
    return { ...state, log: pushLog(state.log, '要回到田圃边，才能收获作物。') };
  }
  const plot = state.farmPlots.find((item) => item.id === plotId);
  if (!plot?.cropId) return { ...state, log: pushLog(state.log, '这块田圃还没有作物。') };
  if (plot.growth < 100) return { ...state, log: pushLog(state.log, '作物还没成熟，再照料几日。') };
  const crop = CROP_OUTPUT[plot.cropId];
  const itemInstance = createItemInstance(
    state,
    content,
    crop.resourceId,
    undefined,
    0.72,
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
    log: pushLog(pushLog(state.log, itemInstance.appraisal), `收下${crop.name}，入仓 ${crop.amount} 份。`),
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

function routeNamesForIds(content: GameContent, routeIds: string[] | undefined) {
  return [...new Set(routeIds ?? [])].map((routeId) => routeNameForId(content, routeId));
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
): GameState {
  const activity = (content.activities ?? []).find((item) => item.id === activityId);
  if (!activity) return state;
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
  const next: GameState = {
    ...progress.state,
    log: pushLog(progress.state.log, `${activityLog}${progress.note}`),
  };
  const withEffect = activity.reward.metrics
    ? applyEffect(next, { metrics: activity.reward.metrics })
    : recompute(next);
  return applyProfileXp(withEffect, profileXpFromAttributes(activity.reward.attributes));
}

/** 前往一个已解锁的地区 */
function travel(state: GameState, content: GameContent, regionId: string): GameState {
  if (!state.unlockedRegions.includes(regionId)) {
    return { ...state, log: pushLog(state.log, '该地区尚未解锁，无法前往。') };
  }
  if (state.currentRegion === regionId) return state;
  const region = (content.regions ?? []).find((r) => r.id === regionId);
  return {
    ...state,
    currentRegion: regionId,
    currentSubregion: region?.subregions[0]?.id ?? regionId,
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
  const unlockCost = route?.unlockCost ?? route?.requirements?.coin ?? REGION_UNLOCK_COST;
  if ((state.resources.coin ?? 0) < unlockCost) {
    return {
      ...state,
      log: pushLog(state.log, `路资不足，解锁「${target.name}」需 ${unlockCost} 文。`),
    };
  }
  return {
    ...state,
    resources: { ...state.resources, coin: (state.resources.coin ?? 0) - unlockCost },
    unlockedRegions: [...state.unlockedRegions, regionId],
    log: pushLog(state.log, route
      ? `打通「${route.name}」，解锁新地区「${target.name}」。${route.preview ?? ''}`
      : `打通商路，解锁新地区「${target.name}」。`),
  };
}

/** 生成结局命运报告 */
function generateReport(state: GameState): GameReport {
  const m = state.metrics;
  const survivingCrafts = state.crafts.filter((c) => c.unlocked).map((c) => c.craftId);

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
  ];

  const summary =
    `历经 ${state.turn} 季的经营，这座百工镇以「${METRIC_LABELS[highest]}」立身，` +
    `却也为「${METRIC_LABELS[lowest]}」付出了代价。传承从无标准答案，这是属于你的一种回答。`;

  const epilogue = generateEpilogue(state, m);

  return { title, summary, finalMetrics: { ...m }, survivingCrafts, highlights, epilogue };
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
      return runProcess(state, content, action.craftId, action.skipStepIds);

    case 'TAKE_ORDER': {
      if (state.status !== 'playing') return state;
      const craftDef = content.crafts.find((c) => c.id === action.craftId);
      const name = craftDef?.name ?? '手艺';
      const outputId = craftDef?.outputResourceId;
      // 闭环交付：必须已亲手制作出成品库存，方能交付订单换取市场收入
      if (!outputId || (state.resources[outputId] ?? 0) < 1) {
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
      const soldIndex = state.itemInstances.findIndex(
        (item) => item.resourceId === outputId && (!item.status || item.status === 'held'),
      );
      const afterOrder = applyEffect(state, {
        resources: { coin: price, [outputId]: -1 },
        craftMetrics: { [action.craftId]: { market: 6, heritage: 2, spirit: 1 } },
        logMessage: `交付一笔「${name}」订单，售出「${productName}」×1，进账 ${price} 文，真品口碑使市场看好。`,
      });
      const afterStock = soldIndex >= 0
        ? {
            ...afterOrder,
            itemInstances: state.itemInstances.filter((_, index) => index !== soldIndex),
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
      return performActivity(state, content, action.activityId, action.quality ?? 0.72);

    case 'GATHER_RESOURCE':
      if (state.status !== 'playing') return state;
      return gatherResource(state, content, action.industryId, action.quality ?? 1);

    case 'TRAVEL':
      if (state.status !== 'playing') return state;
      return travel(state, content, action.regionId);

    case 'TRAVEL_SUBREGION':
      if (state.status !== 'playing') return state;
      return travelSubregion(state, content, action.subregionId);

    case 'UNLOCK_REGION':
      if (state.status !== 'playing') return state;
      return unlockRegion(state, content, action.regionId);

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

    case 'INSCRIBE_ITEM':
      if (state.status !== 'playing') return state;
      return inscribeItem(state, content, action.itemId, action.npcId, action.inscription);

    case 'USE_NPC_FUNCTION':
      if (state.status !== 'playing') return state;
      return useNpcFunction(state, content, action.npcId, action.functionKind, action.itemId);

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

const MASTERWORK_MIN_QUALITY = 0.7;

function nameItem(
  state: GameState,
  content: GameContent,
  itemId: string,
  displayName?: string,
): GameState {
  const target = state.itemInstances.find((item) => item.id === itemId);
  if (!target) return state;
  if (target.status === 'gifted') {
    return { ...state, log: pushLog(state.log, '这件作品已经赠出，不能再题名。') };
  }
  if (target.quality < MASTERWORK_MIN_QUALITY) {
    return { ...state, log: pushLog(state.log, '这件作品品相尚浅，还不足以列为代表作。') };
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
  if (target.status === 'gifted') {
    return { ...state, log: pushLog(state.log, '这件作品已经赠出，不能陈列。') };
  }
  const named = { ...withNamedItem(state, content, target), status: 'displayed' as const };
  const flags = new Set(state.flags);
  if (target.quality >= MASTERWORK_MIN_QUALITY) flags.add('displayed-first-masterwork');
  const withDisplay = {
    ...state,
    flags: [...flags],
    itemInstances: state.itemInstances.map((item) => (item.id === itemId ? named : item)),
    log: pushLog(state.log, `将「${named.displayName}」收入珍品陈列，来客已能看见你的手上功夫。`),
  };
  return applyProfileXp(applyEffect(withDisplay, { metrics: { spirit: 3, life: 1 } }), { mind: 1 });
}

function bestGiftPreference(npc: NpcDef, item: ItemInstance) {
  const matches = (npc.preferences ?? []).filter((preference) => {
    if (preference.minQuality !== undefined && item.quality < preference.minQuality) return false;
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
  const baseGain = Math.max(4, Math.round(5 + target.quality * 8));
  const gain = Math.max(2, baseGain + (preference?.affinityBonus ?? (npc.preferences?.length ? -2 : 0)));
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
  if (target.quality >= MASTERWORK_MIN_QUALITY) flags.add('gifted-first-masterwork');
  const preferenceNote = preference ? `，正合其意「${preference.label}」` : npc.preferences?.length ? '，但并非其偏好' : '';
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
    log: pushLog(state.log, `把「${named.displayName}」赠予「${npc.name}」${preferenceNote}${intelLog}（好感 ${cur}→${nextAffinity}）。`),
  }, { people: 2, commerce: npc.role === 'vendor' ? 1 : 0 });
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
  if (target.status === 'gifted') {
    return { ...state, log: pushLog(state.log, '这件作品已经赠出，题跋只能另寻作品。') };
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

function orderResourceCandidates(npc: NpcDef, content: GameContent): string[] {
  const preferred = (npc.preferences ?? []).flatMap((preference) => preference.resourceIds ?? []);
  const craftOutput = content.crafts.find((craft) => craft.id === npc.anchorCraftId)?.outputResourceId;
  const activityOutput = Object.keys(
    (content.activities ?? []).find((activity) => activity.id === npc.anchorCraftId)?.reward.resources ?? {},
  ).filter((key) => key !== 'coin' && key !== 'labor');
  const fallbackProducts = (content.resources ?? [])
    .filter((resource) => resource.tier === 'product')
    .map((resource) => resource.id);
  return [...new Set([...preferred, craftOutput, ...activityOutput, ...fallbackProducts].filter(Boolean) as string[])];
}

function createNpcOrder(
  state: GameState,
  content: GameContent,
  npc: NpcDef,
  affinity: number,
): ActiveOrder {
  const candidates = orderResourceCandidates(npc, content);
  const resourceId = candidates.sort(
    (a, b) => resourceTierRank(content, b) - resourceTierRank(content, a),
  )[0] ?? 'bambooWare';
  const rank = resourceTierRank(content, resourceId);
  const quantity = rank >= 3 ? 1 : 2;
  const baseValue = content.resources?.find((resource) => resource.id === resourceId)?.value ?? (rank >= 2 ? 12 : 6);
  const rewardCoin = Math.max(8, Math.round(baseValue * quantity + 8 + affinity / 8));
  const routeIds = [
    ...new Set((npc.intel ?? []).flatMap((intel) => intel.routeIds ?? [])),
  ];
  const itemName = resourceName(content, resourceId);
  return {
    id: `order-${npc.id}-${state.calendar.day}-${state.turn}-${(state.activeOrders ?? []).length + 1}`,
    npcId: npc.id,
    title: `${npc.name}的${itemName}订单`,
    desc: `${npc.name}要 ${quantity} 份${itemName}，看重来路、品相和能否按时交付。`,
    resourceId,
    quantity,
    minQuality: rank >= 3 ? 0.58 : 0.45,
    rewardCoin,
    rewardMetrics: { market: 2, life: 1 },
    rewardAttributes: { commerce: 2, people: 1 },
    routeIds,
    createdDay: state.calendar.day,
    expiresDay: state.calendar.day + 7,
    status: 'active',
  };
}

function activeOrderForNpc(state: GameState, npcId: string) {
  return (state.activeOrders ?? []).find((order) => order.npcId === npcId && order.status === 'active') ?? null;
}

function orderQualityFailure(state: GameState, order: ActiveOrder, content: GameContent) {
  const tracked = state.itemInstances.filter(
    (item) => item.status !== 'gifted' && item.resourceId === order.resourceId,
  );
  if (tracked.length === 0) return null;
  const eligible = tracked.filter((item) => item.quality >= order.minQuality);
  if (eligible.length < order.quantity) {
    return `「${resourceName(content, order.resourceId)}」品相不足，需 ${order.quantity} 份达到 ${Math.round(order.minQuality * 100)} 分。`;
  }
  return null;
}

function consumeOrderItems(items: ItemInstance[], order: ActiveOrder) {
  let remaining = order.quantity;
  return items.filter((item) => {
    if (remaining <= 0) return true;
    if (item.status === 'gifted' || item.resourceId !== order.resourceId || item.quality < order.minQuality) {
      return true;
    }
    remaining -= 1;
    return false;
  });
}

function fulfillOrder(state: GameState, content: GameContent, orderId: string): GameState {
  const order = (state.activeOrders ?? []).find((candidate) => candidate.id === orderId);
  if (!order || order.status !== 'active') return state;
  if ((state.resources[order.resourceId] ?? 0) < order.quantity) {
    return {
      ...state,
      log: pushLog(state.log, `库存不足，无法交付「${order.title}」。`),
    };
  }
  const qualityFailure = orderQualityFailure(state, order, content);
  if (qualityFailure) return { ...state, log: pushLog(state.log, qualityFailure) };

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
      `交付「${order.title}」，入账 ${order.rewardCoin} 文（${npc?.name ?? order.npcId}好感 ${cur}→${nextAffinity}）。`,
    ),
  };
  const withMetrics = order.rewardMetrics ? applyEffect(base, { metrics: order.rewardMetrics }) : recompute(base);
  return applyProfileXp(withMetrics, order.rewardAttributes ?? { commerce: 1 });
}

function useNpcFunction(
  state: GameState,
  content: GameContent,
  npcId: string,
  functionKind: NpcFunctionKind,
  itemId?: string,
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
    const nextRuntime = {
      ...affinityResult.runtime,
      knownTopics: intel.knownTopics,
      revealedIntelIds: intel.revealedIntelIds,
    };
    const intelLog = intel.newlyRevealed.length ? `，并点出「${intel.newlyRevealed.join('」「')}」` : '';
    return applyProfileXp(
      {
        ...functionBaseState(
          { ...state, flags: intel.flags },
          npcId,
          nextRuntime,
          functionKind,
          [`npc-mentor:${npcId}`],
        ),
        log: pushLog(
          state.log,
          `向「${npc.name}」请教手艺${intelLog}（好感 ${affinityResult.cur}→${affinityResult.nextAffinity}）。`,
        ),
      },
      { craft: 1, knowledge: 2, mind: 1 },
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
    return applyProfileXp(
      {
        ...functionBaseState(state, npcId, nextRuntime, functionKind, flags),
        log: pushLog(
          state.log,
          `「${npc.name}」替你梳理路线：${routeNames}（好感 ${affinityResult.cur}→${affinityResult.nextAffinity}）。`,
        ),
      },
      { knowledge: 1, commerce: 1 },
    );
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
    const order = createNpcOrder(state, content, npc, affinity);
    const base = {
      ...functionBaseState(state, npcId, affinityResult.runtime, functionKind, [`npc-order:${npcId}`]),
      activeOrders: [order, ...(state.activeOrders ?? [])].slice(0, 12),
    };
    return applyProfileXp(
      applyEffect(base, {
        metrics: { market: 2, life: 1 },
        logMessage: `「${npc.name}」递来订单「${order.title}」：${order.desc}（好感 ${affinityResult.cur}→${affinityResult.nextAffinity}）。`,
      }),
      { commerce: 2, people: 1 },
    );
  }

  if (functionKind === 'homeVisit') {
    const affinityResult = updateNpcAffinityAfterFunction(state, npcId, runtime, functionKind);
    const base = functionBaseState(state, npcId, affinityResult.runtime, functionKind, [`npc-home-visit:${npcId}`]);
    return applyProfileXp(
      applyEffect(base, {
        metrics: { life: 2, spirit: 1 },
        logMessage: `已约「${npc.name}」日后来百工院走动，院中生活气更足（好感 ${affinityResult.cur}→${affinityResult.nextAffinity}）。`,
      }),
      { people: 2, mind: 1 },
    );
  }

  const target = state.itemInstances.find((item) => item.id === itemId);
  if (!target || target.status === 'gifted') {
    return { ...state, log: pushLog(state.log, `没有可供「${npc.name}」${label}的作品。`) };
  }

  if (functionKind === 'collab') {
    if (target.collaboratorNpcIds?.includes(npcId)) {
      return { ...state, log: pushLog(state.log, `「${npc.name}」已经参与过「${itemShortName(target, content)}」。`) };
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
    const verdict = `${npc.name}评曰：${descriptor}之气已成，仍须让人记得作者。`;
    const collaboratorNpcIds = [...new Set([...(named.collaboratorNpcIds ?? []), npcId])];
    const appraised: ItemInstance = {
      ...named,
      collaboratorNpcIds,
      inscription: named.inscription ? `${named.inscription} / ${verdict}` : verdict,
    };
    const flags = [`npc-appraisal:${npcId}`];
    if (target.quality >= MASTERWORK_MIN_QUALITY) flags.push('appraised-masterwork');
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
    if (item.status === 'gifted') return false;
    if (item.quality < minQuality) return false;
    if (reward.resourceIds && !reward.resourceIds.includes(item.resourceId)) return false;
    return (state.resources[item.resourceId] ?? 0) > 0 || item.status === 'displayed';
  });
  return candidates.sort((a, b) => b.quality - a.quality)[0] ?? null;
}

function mergeProfileXp(
  base: Partial<Record<PlayerAttributeKey, number>>,
  add: Partial<Record<PlayerAttributeKey, number>>,
) {
  const next = { ...base };
  for (const [key, value] of Object.entries(add) as [PlayerAttributeKey, number][]) {
    next[key] = (next[key] ?? 0) + value;
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
  return applyProfileXp(
    { ...rewarded, completedQuests: [...rewarded.completedQuests, questId] },
    xp,
  );
}
