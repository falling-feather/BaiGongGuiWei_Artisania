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
} from './types';
import { applyDelta, aggregateTownMetrics, METRIC_KEYS, METRIC_LABELS } from './metrics';
import { createInitialState, LABOR_PER_TURN } from './state';
import { createRng, weightedPick } from './rng';

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
}

/** 解锁一个新地区的费用（文） */
const REGION_UNLOCK_COST = 30;

/** 每回合自然补充的资源（轻量半成品回补，模拟持续供料） */
const TURN_RESOURCE_REGEN: Record<string, number> = {
  indigoVat: 2,
  bambooSplit: 2,
};

const MAX_LOG = 50;

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
  const outputId = craftDef.outputResourceId;
  if (outputId) {
    resources[outputId] = (resources[outputId] ?? 0) + 1;
    const productName = content.resources?.find((r) => r.id === outputId)?.name ?? outputId;
    productNote = `，得「${productName}」×1`;
  }

  const crafts = state.crafts.map((c) =>
    c.craftId === craftId ? { ...c, metrics: craftMetrics, produced: c.produced + 1 } : c,
  );

  const skipNote = stepsSkipped.length > 0 ? `（省略了 ${stepsSkipped.length} 道工序）` : '';
  const next: GameState = {
    ...state,
    resources,
    crafts,
    log: pushLog(state.log, `「${craftDef.name}」完成一批出品${skipNote}${productNote}，入账 ${incomeBase} 文。`),
  };
  return recompute(next);
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

  return {
    ...state,
    resources,
    log: pushLog(
      state.log,
      `「${industry.name}」产出 ${produced} 份${quality >= 0.8 ? '上品' : ''}。`,
    ),
  };
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
    log: pushLog(state.log, `起程前往「${region?.name ?? regionId}」。`),
  };
}

/** 花费解锁一个与已解锁地区相邻的新地区 */
function unlockRegion(state: GameState, content: GameContent, regionId: string): GameState {
  const regions = content.regions ?? [];
  const target = regions.find((r) => r.id === regionId);
  if (!target) return state;
  if (state.unlockedRegions.includes(regionId)) return state;

  // 需与某已解锁地区相邻
  const adjacent = state.unlockedRegions.some((uid) => {
    const r = regions.find((x) => x.id === uid);
    return r?.neighbors.includes(regionId) || target.neighbors.includes(uid);
  });
  if (!adjacent) {
    return { ...state, log: pushLog(state.log, `「${target.name}」与已探地区不相邻，无法直达。`) };
  }
  if ((state.resources.coin ?? 0) < REGION_UNLOCK_COST) {
    return {
      ...state,
      log: pushLog(state.log, `路资不足，解锁「${target.name}」需 ${REGION_UNLOCK_COST} 文。`),
    };
  }
  return {
    ...state,
    resources: { ...state.resources, coin: (state.resources.coin ?? 0) - REGION_UNLOCK_COST },
    unlockedRegions: [...state.unlockedRegions, regionId],
    log: pushLog(state.log, `打通商路，解锁新地区「${target.name}」。`),
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
      return applyEffect(state, {
        resources: { coin: price, [outputId]: -1 },
        craftMetrics: { [action.craftId]: { market: 6, heritage: 2, spirit: 1 } },
        logMessage: `交付一笔「${name}」订单，售出「${productName}」×1，进账 ${price} 文，真品口碑使市场看好。`,
      });
    }

    case 'HOLD_EXHIBITION': {
      if (state.status !== 'playing') return state;
      if ((state.resources.coin ?? 0) < 8) {
        return { ...state, log: pushLog(state.log, '钱袋空空，办不起这场展演。') };
      }
      return applyEffect(state, {
        resources: { coin: -8 },
        metrics: { spirit: 5, life: 5, market: 2 },
        logMessage: '举办了一场手艺展演，镇上人气与精气神都旺了起来。',
      });
    }

    case 'RESOLVE_EVENT': {
      if (!state.pendingEvent) return state;
      const choice = state.pendingEvent.choices.find((c) => c.id === action.choiceId);
      if (!choice) return state;
      const afterEffect = applyEffect(state, choice.effect);
      return { ...afterEffect, pendingEvent: null };
    }

    case 'END_TURN':
      if (state.status !== 'playing') return state;
      return endTurn(state, content);

    case 'GATHER_RESOURCE':
      if (state.status !== 'playing') return state;
      return gatherResource(state, content, action.industryId, action.quality ?? 1);

    case 'TRAVEL':
      if (state.status !== 'playing') return state;
      return travel(state, content, action.regionId);

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

    default:
      return state;
  }
}

/** 每次对话好感度增量与上限 */
const AFFINITY_PER_TALK = 8;
const AFFINITY_MAX = 100;

/** 与 NPC 对话一次：好感度上升（封顶 100），并记录寒暄日志 */
function talkNpc(state: GameState, content: GameContent, npcId: string): GameState {
  const npc = (content.npcs ?? []).find((n) => n.id === npcId);
  if (!npc) return state;
  const cur = state.npcAffinity[npcId] ?? 0;
  const next = Math.min(AFFINITY_MAX, cur + AFFINITY_PER_TALK);
  const greeting = npc.greetings[Math.floor(Math.random() * Math.max(1, npc.greetings.length))] ?? '';
  return {
    ...state,
    npcAffinity: { ...state.npcAffinity, [npcId]: next },
    log: pushLog(state.log, `与「${npc.name}」攀谈：${greeting}（好感 ${cur}→${next}）`),
  };
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
  // 发放奖励
  const effect: GameEffect = {
    resources: {
      ...(quest.reward.coin ? { coin: quest.reward.coin } : {}),
      ...(quest.reward.resources ?? {}),
    },
    metrics: quest.reward.metrics,
    logMessage: quest.completeLog.replace(/\{name\}/g, state.playerName.trim() || '无名匠人'),
  };
  const rewarded = applyEffect(state, effect);
  return { ...rewarded, completedQuests: [...rewarded.completedQuests, questId] };
}
