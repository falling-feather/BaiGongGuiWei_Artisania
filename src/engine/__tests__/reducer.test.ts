import { describe, it, expect } from 'vitest';
import { gameReducer, nextStoryBeat } from '../reducer';
import { createInitialState } from '../state';
import type { GameContent } from '../reducer';
import { CRAFTS } from '../../data/crafts';
import { STARTING_APPRENTICES } from '../../data/apprentices';
import { EVENTS } from '../../data/events';
import { INDUSTRIES } from '../../data/industries';
import { REGIONS } from '../../data/regions';
import { ACHIEVEMENTS } from '../../data/achievements';
import { STORY_BEATS, renderStoryLine } from '../../data/story';
import { RESOURCES } from '../../data/resources';
import { ALL_NPCS, NPCS } from '../../data/npcs';
import { QUESTS } from '../../data/quests';
import { ITEM_DESCRIPTOR_RULES } from '../../data/itemDescriptors';
import { ACTIVITY_CHALLENGES } from '../../data/activityChallenges';
import { REGION_ACTIVITIES, REGION_CONTENT, REGION_ROUTES } from '../../data/regionContent';
import { localIndustriesForRegion } from '../../data/regionEconomy';
import { SUBREGION_CONTENT, localIndustriesForSubregion } from '../../data/subregionContent';
import { orderPrice } from '../reducer';
import { routeStabilityOf } from '../routeStability';
import { buildRegionSpec } from '../../game/regionSpec';

const content: GameContent = {
  crafts: CRAFTS,
  apprentices: STARTING_APPRENTICES,
  events: EVENTS,
  industries: INDUSTRIES,
  regions: REGIONS,
  achievements: ACHIEVEMENTS,
  resources: RESOURCES,
  npcs: ALL_NPCS,
  quests: QUESTS,
  activities: REGION_ACTIVITIES,
  regionContent: REGION_CONTENT,
  subregionContent: SUBREGION_CONTENT,
  itemDescriptorRules: ITEM_DESCRIPTOR_RULES,
};

function freshState() {
  return createInitialState(content.crafts, content.apprentices, 12345, undefined, content.regions);
}

const demoContent: GameContent = { ...content, events: [] };

function endDemoDay(state: ReturnType<typeof freshState>) {
  return gameReducer(
    { ...state, pendingEvent: null, calendar: { ...state.calendar, phase: 'night' } },
    { type: 'ADVANCE_TIME' },
    demoContent,
  );
}

function forgeHighQualitySword(seedState: ReturnType<typeof freshState> = freshState()) {
  let s = gameReducer(seedState, { type: 'TRAVEL_SUBREGION', subregionId: 'jiangnan-longquan' }, content);
  s = { ...s, resources: { ...s.resources, ironOre: 4, coal: 4, labor: 20 } };
  s = gameReducer(s, { type: 'GATHER_RESOURCE', industryId: 'smelt-iron', quality: 1 }, content);
  const ingotId = s.itemInstances.find((item) => item.resourceId === 'ironIngot')?.id;
  s = gameReducer(s, { type: 'RUN_PROCESS', craftId: 'longquan-sword', skipStepIds: [] }, content);
  return { state: s, ingotId };
}

describe('gameReducer', () => {
  it('NEW_GAME 重置为可游玩状态', () => {
    const s = gameReducer(freshState(), { type: 'NEW_GAME', seed: 1 }, content);
    expect(s.status).toBe('playing');
    expect(s.turn).toBe(1);
    expect(s.crafts.length).toBeGreaterThan(0);
  });

  it('RUN_PROCESS 会产出并消耗人力', () => {
    const s0 = freshState();
    const craftId = s0.crafts[0].craftId;
    const s1 = gameReducer(s0, { type: 'RUN_PROCESS', craftId, skipStepIds: [] }, content);
    const before = s0.crafts.find((c) => c.craftId === craftId)!;
    const after = s1.crafts.find((c) => c.craftId === craftId)!;
    expect(after.produced).toBe(before.produced + 1);
    expect(s1.resources.labor).toBeLessThan(s0.resources.labor);
    expect(s1.itemInstances[0]?.resourceId).toBe(content.crafts[0].outputResourceId);
    expect(s1.itemInstances[0]?.appraisal.length).toBeGreaterThan(0);
  });

  it('TAKE_ORDER 交付成品：消耗 1 件库存并按品质入账', () => {
    let s = freshState();
    // 备好一件蓝染成品
    s = { ...s, resources: { ...s.resources, indigoCloth: 1, coin: 0 } };
    const s1 = gameReducer(s, { type: 'TAKE_ORDER', craftId: 'indigo-dyeing' }, content);
    const heritage = s.crafts.find((c) => c.craftId === 'indigo-dyeing')!.metrics.heritage;
    const expected = orderPrice(20, heritage); // indigoCloth value=20
    expect(s1.resources.indigoCloth).toBe(0);
    expect(s1.resources.coin).toBe(expected);
  });

  it('TAKE_ORDER 无成品时拒绝交付且不进账', () => {
    let s = freshState();
    s = { ...s, resources: { ...s.resources, indigoCloth: 0, coin: 5 } };
    const s1 = gameReducer(s, { type: 'TAKE_ORDER', craftId: 'indigo-dyeing' }, content);
    expect(s1.resources.coin).toBe(5);
    expect(s1.resources.indigoCloth ?? 0).toBe(0);
  });

  it('TAKE_ORDER 会同步移除已售出的物品评鉴实例', () => {
    let s = freshState();
    s = gameReducer(s, { type: 'RUN_PROCESS', craftId: 'indigo-dyeing', skipStepIds: [] }, content);
    const beforeCount = s.itemInstances.length;
    s = gameReducer(s, { type: 'TAKE_ORDER', craftId: 'indigo-dyeing' }, content);
    expect(s.itemInstances.length).toBe(beforeCount - 1);
    expect(s.itemInstances.some((item) => item.resourceId === 'indigoCloth')).toBe(false);
  });

  it('orderPrice 随传承品质单调上升', () => {
    expect(orderPrice(20, 100)).toBeGreaterThan(orderPrice(20, 0));
    expect(orderPrice(20, 50)).toBe(20);
  });

  it('END_TURN 推进季节并补给资源', () => {
    const s0 = freshState();
    const s1 = gameReducer(s0, { type: 'END_TURN' }, content);
    // 要么进入下一季，要么因抽到事件而等待处理
    expect(s1.turn === s0.turn + 1 || s1.pendingEvent !== null).toBe(true);
  });

  it('END_TURN 会对低稳定已通商路施加季节压力', () => {
    const s0 = freshState();
    const s = {
      ...s0,
      unlockedRegions: [...s0.unlockedRegions, 'huizhou'],
      pendingEvent: null,
      regionReputation: { ...s0.regionReputation, jiangnan: 0, huizhou: 0 },
      routeStability: { ...s0.routeStability, 'route-jiangnan-huizhou-paper': 10 },
    };
    const s1 = gameReducer(s, { type: 'END_TURN' }, content);
    expect(routeStabilityOf(s1, 'route-jiangnan-huizhou-paper')).toBeLessThan(
      routeStabilityOf(s, 'route-jiangnan-huizhou-paper'),
    );
  });

  it('初始状态解锁首发地区并定位', () => {
    const s = freshState();
    expect(s.unlockedRegions).toContain('jiangnan');
    expect(s.currentRegion).toBe('jiangnan');
    expect(s.currentSubregion).toBe('jiangnan-suhang');
  });

  it('初始状态包含玩家档案、日历和田圃槽位', () => {
    const s = freshState();
    expect(s.profile.title).toBe('粗手生人');
    expect(s.profile.attributes.craft).toBe(5);
    expect(s.calendar.day).toBe(1);
    expect(s.calendar.phase).toBe('morning');
    expect(s.farmPlots.length).toBeGreaterThanOrEqual(3);
    expect(s.regionReputation.jiangnan).toBe(5);
    expect(s.routeStability).toEqual({});
    expect(s.routeEscortRuns).toEqual({});
  });

  it('ADVANCE_TIME 推进日内时段，夜间后进入下一日', () => {
    let s = freshState();
    s = gameReducer(s, { type: 'ADVANCE_TIME' }, content);
    expect(s.calendar.phase).toBe('afternoon');
    s = { ...s, calendar: { ...s.calendar, phase: 'night' }, pendingEvent: null };
    const next = gameReducer(s, { type: 'ADVANCE_TIME' }, content);
    expect(next.calendar.day).toBe(s.calendar.day + 1);
    expect(next.calendar.phase).toBe('morning');
  });

  it('GATHER_RESOURCE 在本地产业产出半成品并消耗原料/人力', () => {
    // 江南具备 smelt-iron（冶铁）：消耗 ironOre+coal，产出 ironIngot
    let s = gameReducer(freshState(), { type: 'TRAVEL_SUBREGION', subregionId: 'jiangnan-longquan' }, content);
    s = { ...s, resources: { ...s.resources, ironOre: 4, coal: 2 } };
    const before = s.resources.labor;
    const s1 = gameReducer(s, { type: 'GATHER_RESOURCE', industryId: 'smelt-iron', quality: 1 }, content);
    expect((s1.resources.ironIngot ?? 0)).toBeGreaterThan(0);
    expect(s1.resources.ironOre).toBeLessThan(s.resources.ironOre);
    expect(s1.resources.labor).toBeLessThan(before);
    expect(s1.itemInstances[0]?.resourceId).toBe('ironIngot');
    expect(s1.itemInstances[0]?.sourceIndustryId).toBe('smelt-iron');
  });

  it('GATHER_RESOURCE 采集业（仅耗工时）按本地特产授权产出', () => {
    // 江南特产 cocoonSilk → harvest-cocoon 为采集业，仅耗工时
    const s = gameReducer(freshState(), { type: 'TRAVEL_SUBREGION', subregionId: 'jiangnan-taihu' }, content);
    const s1 = gameReducer(s, { type: 'GATHER_RESOURCE', industryId: 'harvest-cocoon', quality: 1 }, content);
    expect((s1.resources.cocoonSilk ?? 0)).toBeGreaterThan(0);
    expect(s1.resources.labor).toBeLessThan(s.resources.labor);
    expect(s1.itemInstances[0]?.resourceId).toBe('cocoonSilk');
    expect(s1.itemInstances[0]?.sourceIndustryId).toBe('harvest-cocoon');
    expect(s1.itemInstances[0]?.appraisal.length).toBeGreaterThan(0);
  });

  it('地区经济：镇务与街景共享本地采集/精炼产业列表', () => {
    const jiangnan = REGIONS.find((r) => r.id === 'jiangnan');
    const regionalIds = localIndustriesForRegion(jiangnan, INDUSTRIES).map((industry) => industry.id);
    expect(regionalIds).toContain('smelt-iron');
    const suhangIds = localIndustriesForSubregion(jiangnan, 'jiangnan-suhang', INDUSTRIES).map(
      (industry) => industry.id,
    );
    expect(suhangIds).toEqual(
      expect.arrayContaining(['harvest-indigo', 'harvest-bamboo', 'build-indigo', 'split-bamboo']),
    );
    expect(suhangIds).not.toContain('smelt-iron');
    const longquanIds = localIndustriesForSubregion(jiangnan, 'jiangnan-longquan', INDUSTRIES).map(
      (industry) => industry.id,
    );
    expect(longquanIds).toEqual(expect.arrayContaining(['harvest-iron-ore', 'smelt-iron', 'forge-sword']));
  });

  it('逐地区内容数据库：活动均落在已定义地区与小地区中', () => {
    expect(new Set(REGION_CONTENT.map((item) => item.regionId))).toEqual(new Set(REGIONS.map((item) => item.id)));
    for (const activity of REGION_ACTIVITIES) {
      const region = REGIONS.find((item) => item.id === activity.regionId);
      expect(region, activity.id).toBeTruthy();
      expect(region?.subregions.some((subregion) => subregion.id === activity.subregionId)).toBe(true);
      expect(REGION_CONTENT.find((item) => item.regionId === activity.regionId)?.activityIds).toContain(
        activity.id,
      );
    }
    for (const entry of SUBREGION_CONTENT) {
      const region = REGIONS.find((item) => item.id === entry.regionId);
      expect(region, entry.subregionId).toBeTruthy();
      expect(region?.subregions.some((subregion) => subregion.id === entry.subregionId)).toBe(true);
      const regionalIndustryIds = new Set(localIndustriesForRegion(region, INDUSTRIES).map((industry) => industry.id));
      for (const industryId of entry.industryIds) {
        expect(regionalIndustryIds.has(industryId), `${entry.subregionId}:${industryId}`).toBe(true);
      }
      for (const craftId of entry.craftIds) {
        expect(region?.signatureCrafts.includes(craftId), `${entry.subregionId}:${craftId}`).toBe(true);
      }
    }
  });

  it('逐地区内容数据库：路线均有结构化端点与解锁提示', () => {
    const regionIds = new Set(REGIONS.map((item) => item.id));
    const routesById = new Map(REGION_CONTENT.flatMap((item) => item.routes).map((route) => [route.id, route]));
    const routes = [...routesById.values()];
    expect(routesById.size).toBeGreaterThan(0);
    for (const route of routes) {
      expect(regionIds.has(route.fromRegionId)).toBe(true);
      expect(regionIds.has(route.toRegionId)).toBe(true);
      expect(route.name.length).toBeGreaterThan(0);
      expect(route.unlockHint.length).toBeGreaterThan(0);
    }
  });

  it('活动挑战库覆盖所有新增 miniGame 原型，并与活动 miniGame 对齐', () => {
    const activityById = new Map(REGION_ACTIVITIES.map((activity) => [activity.id, activity]));
    const plannedMiniGames = new Set([
      'couplet_choice',
      'calligraphy_trace',
      'crop_calendar',
      'appraise_select',
      'route_plan',
      'dialogue_check',
    ]);
    const challengeIds = new Set<string>();
    for (const challenge of ACTIVITY_CHALLENGES) {
      const activity = activityById.get(challenge.activityId);
      expect(activity, challenge.activityId).toBeTruthy();
      expect(activity?.miniGames).toContain(challenge.miniGame);
      expect(challengeIds.has(challenge.id)).toBe(false);
      challengeIds.add(challenge.id);
      expect(challenge.choices.length).toBeGreaterThanOrEqual(2);
      for (const choice of challenge.choices) {
        expect(choice.quality).toBeGreaterThanOrEqual(0);
        expect(choice.quality).toBeLessThanOrEqual(1);
        expect(choice.feedback.length).toBeGreaterThan(0);
      }
    }
    const covered = new Set(ACTIVITY_CHALLENGES.map((challenge) => challenge.activityId));
    const uncovered = REGION_ACTIVITIES.filter((activity) =>
      activity.miniGames.some((miniGame) => plannedMiniGames.has(miniGame)),
    )
      .filter((activity) => !covered.has(activity.id))
      .map((activity) => activity.id);
    expect(uncovered).toEqual([]);
  });

  it('PERFORM_ACTIVITY 在当前小地区结算生活/商贸活动并生成评鉴文本', () => {
    let s = freshState();
    s = gameReducer(s, { type: 'TRAVEL_SUBREGION', subregionId: 'jiangnan-linan' }, content);
    s = { ...s, resources: { ...s.resources, teaLeaf: 1, labor: 4 } };
    const beforeKnowledge = s.profile.attributes.knowledge;

    const s1 = gameReducer(s, { type: 'PERFORM_ACTIVITY', activityId: 'jn-lake-tea-house', quality: 0.9 }, content);

    expect(s1.resources.tea).toBe((s.resources.tea ?? 0) + 1);
    expect(s1.resources.teaLeaf).toBe((s.resources.teaLeaf ?? 0) - 1);
    expect(s1.profile.attributes.knowledge).toBeGreaterThan(beforeKnowledge);
    expect(s1.completedActivities).toContain('jn-lake-tea-house');
    expect(s1.regionReputation.jiangnan).toBeGreaterThan(s.regionReputation.jiangnan);
    expect(s1.flags).toContain('route-known:route-jiangnan-huizhou-paper');
    expect(routeStabilityOf(s1, 'route-jiangnan-huizhou-paper')).toBeGreaterThan(
      routeStabilityOf(s, 'route-jiangnan-huizhou-paper'),
    );
    expect(s1.npcStates['jn-su-xiaocha']?.knownTopics).toContain('route:route-jiangnan-huizhou-paper');
    expect(s1.npcAffinity['jn-su-xiaocha']).toBeGreaterThan(0);
    expect(s1.itemInstances[0]?.resourceId).toBe('tea');
    expect(s1.itemInstances[0]?.sourceActivityId).toBe('jn-lake-tea-house');
    expect(s1.itemInstances[0]?.appraisal.length).toBeGreaterThan(0);
  });

  it('PERFORM_ACTIVITY 按挑战质量推进关联 NPC 好感与活动记忆', () => {
    let s = gameReducer(freshState(), { type: 'TRAVEL_SUBREGION', subregionId: 'jiangnan-linan' }, content);
    s = { ...s, resources: { ...s.resources, teaLeaf: 2, labor: 4 } };

    const low = gameReducer(s, { type: 'PERFORM_ACTIVITY', activityId: 'jn-lake-tea-house', quality: 0.42 }, content);
    const high = gameReducer(s, { type: 'PERFORM_ACTIVITY', activityId: 'jn-lake-tea-house', quality: 0.92 }, content);

    expect(low.npcAffinity['jn-su-xiaocha']).toBeLessThan(high.npcAffinity['jn-su-xiaocha']);
    expect(low.regionReputation.jiangnan).toBeLessThan(high.regionReputation.jiangnan);
    expect(high.completedActivities).toContain('jn-lake-tea-house');
    expect(high.npcStates['jn-su-xiaocha']?.knownTopics).toContain('activity:jn-lake-tea-house');
  });

  it('PERFORM_ACTIVITY 拒绝不在当前小地区的活动', () => {
    const s = freshState();
    const s1 = gameReducer(s, { type: 'PERFORM_ACTIVITY', activityId: 'jn-lake-tea-house' }, content);
    expect(s1.resources.tea ?? 0).toBe(s.resources.tea ?? 0);
    expect(s1.itemInstances.length).toBe(0);
  });

  it('PERFORM_ACTIVITY 按时段限制秦淮灯市夜间事件', () => {
    let s = gameReducer(freshState(), { type: 'TRAVEL_SUBREGION', subregionId: 'jiangnan-jinling' }, content);
    const morning = gameReducer(s, { type: 'PERFORM_ACTIVITY', activityId: 'jn-qinhuai-lantern', quality: 0.9 }, content);
    expect(morning.flags).not.toContain('seen-qinhuai-lantern');

    s = { ...s, calendar: { ...s.calendar, phase: 'dusk' } };
    const dusk = gameReducer(s, { type: 'PERFORM_ACTIVITY', activityId: 'jn-qinhuai-lantern', quality: 0.9 }, content);
    expect(dusk.flags).toContain('seen-qinhuai-lantern');
    expect(dusk.resources.coin).toBeGreaterThan(s.resources.coin ?? 0);
    expect(dusk.itemInstances.some((item) => item.resourceId === 'coin')).toBe(false);
  });

  it('地图规格会带出当前小地区活动点和占位 NPC 锚点', () => {
    const s = gameReducer(
      freshState(),
      { type: 'TRAVEL_SUBREGION', subregionId: 'jiangnan-longquan' },
      content,
    );
    const spec = buildRegionSpec('jiangnan', s);
    expect(spec?.activities.map((activity) => activity.id)).toContain('jn-longquan-sword-forge');
    expect(spec?.industries.map((industry) => industry.id)).toContain('smelt-iron');
    expect(spec?.industries.map((industry) => industry.id)).not.toContain('build-indigo');
    expect(spec?.crafts.map((craft) => craft.id)).toEqual(expect.arrayContaining(['celadon', 'longquan-sword']));
    expect(spec?.crafts.map((craft) => craft.id)).not.toContain('indigo-dyeing');
    expect(spec?.subregionGates.map((gate) => gate.subregionId)).toContain('jiangnan-suhang');
    expect(spec?.subregionGates.map((gate) => gate.subregionId)).not.toContain('jiangnan-longquan');
    const lu = spec?.npcs.find((npc) => npc.id === 'jn-lu-hanquan');
    expect(lu?.anchorId).toBe('jn-longquan-sword-forge');
  });

  it('每条大地区邻接都有结构化路线定义', () => {
    const routePairs = new Set(
      REGION_ROUTES.map((route) => [route.fromRegionId, route.toRegionId].sort().join('|')),
    );
    for (const region of REGIONS) {
      for (const neighborId of region.neighbors) {
        if (!REGIONS.some((candidate) => candidate.id === neighborId)) continue;
        expect(routePairs.has([region.id, neighborId].sort().join('|'))).toBe(true);
      }
    }
  });

  it('地图出入口会携带路线名、路资和解锁提示', () => {
    const s = freshState();
    for (const region of REGIONS) {
      const spec = buildRegionSpec(region.id, s);
      expect(spec?.gates.length).toBe(region.neighbors.length);
      for (const gate of spec?.gates ?? []) {
        expect(gate.routeId).toBeTruthy();
        expect(gate.routeName).toBeTruthy();
        expect(gate.unlockCost).toBeGreaterThan(0);
        expect(gate.unlockHint).toBeTruthy();
      }
    }
  });

  it('GATHER_RESOURCE 拒绝本地不具备的产业', () => {
    const s = freshState(); // 江南不具备 refine-silver（提银）
    const s1 = gameReducer(s, { type: 'GATHER_RESOURCE', industryId: 'refine-silver' }, content);
    expect(s1.resources.silverStock ?? 0).toBe(0);
  });

  it('GATHER_RESOURCE rejects industries outside the current subregion', () => {
    const s0 = freshState();
    const s = { ...s0, resources: { ...s0.resources, ironOre: 4, coal: 4 } };
    const s1 = gameReducer(s, { type: 'GATHER_RESOURCE', industryId: 'smelt-iron', quality: 1 }, content);
    expect(s1.resources.ironIngot ?? 0).toBe(0);
    expect(s1.itemInstances.length).toBe(s.itemInstances.length);
    expect(s1.log.length).toBeGreaterThan(s.log.length);
  });

  it('UNLOCK_REGION 解锁相邻地区并扣除路资', () => {
    let s = freshState();
    s = { ...s, resources: { ...s.resources, coin: 100 } };
    // 江南相邻 huizhou（徽州）
    const s1 = gameReducer(s, { type: 'UNLOCK_REGION', regionId: 'huizhou' }, content);
    expect(s1.unlockedRegions).toContain('huizhou');
    expect(s1.resources.coin).toBeLessThan(s.resources.coin);
    expect(s1.regionReputation.huizhou).toBe(3);
    expect(s1.regionReputation.jiangnan).toBeGreaterThan(s.regionReputation.jiangnan);
    expect(routeStabilityOf(s1, 'route-jiangnan-huizhou-paper')).toBeGreaterThan(routeStabilityOf(s, 'route-jiangnan-huizhou-paper'));
    expect(s1.log.some((line) => line.includes('江南纸墨路'))).toBe(true);
  });

  it('UNLOCK_REGION 掌握路线情报后会降低开路路资', () => {
    let s = freshState();
    s = {
      ...s,
      flags: [...s.flags, 'route-known:route-jiangnan-huizhou-paper'],
      resources: { ...s.resources, coin: 100 },
    };
    const s1 = gameReducer(s, { type: 'UNLOCK_REGION', regionId: 'huizhou' }, content);
    expect(s1.unlockedRegions).toContain('huizhou');
    expect(s1.resources.coin).toBe(77);
    expect(s1.log.some((line) => line.includes('省下 7 文'))).toBe(true);
  });

  it('UNLOCK_REGION 会执行路线属性门槛', () => {
    let s = freshState();
    s = { ...s, resources: { ...s.resources, coin: 100 } };
    const blocked = gameReducer(s, { type: 'UNLOCK_REGION', regionId: 'jingji' }, content);
    expect(blocked.unlockedRegions).not.toContain('jingji');

    s = { ...s, profile: { ...s.profile, attributes: { ...s.profile.attributes, commerce: 8 } } };
    const opened = gameReducer(s, { type: 'UNLOCK_REGION', regionId: 'jingji' }, content);
    expect(opened.unlockedRegions).toContain('jingji');
    expect(opened.resources.coin).toBe(64);
  });

  it('TRAVEL 切换大地区时进入该地区默认小地区', () => {
    let s = freshState();
    s = { ...s, resources: { ...s.resources, coin: 100 } };
    s = gameReducer(s, { type: 'UNLOCK_REGION', regionId: 'huizhou' }, content);
    const s1 = gameReducer(s, { type: 'TRAVEL', regionId: 'huizhou' }, content);
    expect(s1.currentRegion).toBe('huizhou');
    expect(s1.currentSubregion).toBe('huizhou-ink-alley');
  });

  it('TRAVEL_SUBREGION 在当前大地区内切换小地区', () => {
    const s = freshState();
    const s1 = gameReducer(s, { type: 'TRAVEL_SUBREGION', subregionId: 'jiangnan-longquan' }, content);
    expect(s1.currentRegion).toBe('jiangnan');
    expect(s1.currentSubregion).toBe('jiangnan-longquan');
  });

  it('UNLOCK_REGION 拒绝不相邻地区', () => {
    let s = freshState();
    s = { ...s, resources: { ...s.resources, coin: 100 } };
    // 雪域与江南不相邻
    const s1 = gameReducer(s, { type: 'UNLOCK_REGION', regionId: 'xueyu' }, content);
    expect(s1.unlockedRegions).not.toContain('xueyu');
  });

  it('成就：完成首批出品后解锁「初执匠作」', () => {
    const s0 = freshState();
    expect(s0.achievements).toEqual([]);
    const craftId = s0.crafts[0].craftId;
    const s1 = gameReducer(s0, { type: 'RUN_PROCESS', craftId, skipStepIds: [] }, content);
    expect(s1.achievements).toContain('first-step');
  });

  it('开发者模式：fallingfeather 解锁全境并获得海量资源', () => {
    const dev = gameReducer(
      freshState(),
      { type: 'NEW_GAME', seed: 1, playerName: 'FallingFeather' },
      content,
    );
    expect(dev.devMode).toBe(true);
    expect(dev.playerName).toBe('FallingFeather');
    expect(dev.unlockedRegions.length).toBe(content.regions!.length);
    expect(dev.resources.coin).toBeGreaterThan(9999);

    // 推进季节后人力仍保持无限（不被重置为每季预算）
    const next = gameReducer(dev, { type: 'END_TURN' }, content);
    expect(next.resources.labor).toBeGreaterThan(9999);
  });

  it('普通玩家：名字不触发开发者模式', () => {
    const normal = gameReducer(
      freshState(),
      { type: 'NEW_GAME', seed: 1, playerName: '阿青' },
      content,
    );
    expect(normal.devMode).toBe(false);
    expect(normal.unlockedRegions.length).toBeLessThan(content.regions!.length);
  });

  it('剧情：开局触发楔子，SEEN_STORY 后接续下一节点', () => {
    const withStory: GameContent = { ...content, story: STORY_BEATS };
    const s0 = gameReducer(freshState(), { type: 'NEW_GAME', seed: 1, playerName: '阿青' }, withStory);
    const first = nextStoryBeat(s0, withStory);
    expect(first?.id).toBe('prologue');

    const s1 = gameReducer(s0, { type: 'SEEN_STORY', storyId: 'prologue' }, withStory);
    expect(s1.seenStory).toContain('prologue');
    expect(nextStoryBeat(s1, withStory)?.id).not.toBe('prologue');
  });

  it('剧情：renderStoryLine 用玩家名替换占位符，空名回退', () => {
    expect(renderStoryLine('{name}启程', '阿青')).toBe('阿青启程');
    expect(renderStoryLine('{name}启程', '   ')).toBe('无名匠人启程');
  });

  it('剧情分支：抉择写入 flag，第4季触发对应分支节点', () => {
    const withStory: GameContent = { ...content, story: STORY_BEATS };
    let s = gameReducer(freshState(), { type: 'NEW_GAME', seed: 1, playerName: '阿青' }, withStory);
    // 读楔子
    s = gameReducer(s, { type: 'SEEN_STORY', storyId: 'prologue' }, withStory);
    // 立心：选守正
    s = gameReducer(s, { type: 'SEEN_STORY', storyId: 'oath', choiceId: 'tradition' }, withStory);
    expect(s.flags).toContain('oath-tradition');

    // 推进到第 4 季
    while (s.turn < 4) {
      s = gameReducer(s, { type: 'RESOLVE_EVENT', choiceId: 'resist' }, withStory); // 清掉可能的事件
      if (s.pendingEvent) s = { ...s, pendingEvent: null };
      s = gameReducer(s, { type: 'END_TURN' }, withStory);
    }
    const beat = nextStoryBeat(s, withStory);
    expect(beat?.id).toBe('path-tradition');
  });

  it('剧情分支：事件选项写入 flag，触发回响节点', () => {
    const withStory: GameContent = { ...content, story: STORY_BEATS };
    let s = gameReducer(freshState(), { type: 'NEW_GAME', seed: 1, playerName: '阿青' }, withStory);
    s = { ...s, flags: [...s.flags, 'chased-trend'] };
    // 看过早期节点，确保 after-trend 能被选中
    s = { ...s, seenStory: ['prologue', 'oath', 'first-craft'] };
    const ids: string[] = [];
    let beat = nextStoryBeat(s, withStory);
    while (beat) {
      ids.push(beat.id);
      s = gameReducer(s, { type: 'SEEN_STORY', storyId: beat.id }, withStory);
      beat = nextStoryBeat(s, withStory);
    }
    expect(ids).toContain('after-trend');
  });

  it('供应链：RUN_PROCESS 消耗半成品并产出成品', () => {
    const s0 = freshState();
    const before = s0.resources.indigoVat ?? 0;
    const s1 = gameReducer(
      s0,
      { type: 'RUN_PROCESS', craftId: 'indigo-dyeing', skipStepIds: [] },
      content,
    );
    expect(s1.resources.indigoCloth ?? 0).toBe(1);
    expect(s1.resources.indigoVat ?? 0).toBe(before - 3);
  });

  it('供应链：RUN_PROCESS 同步消耗已记录的半成品实例', () => {
    let s = freshState();
    const marker = {
      id: 'tracked-indigo-vat',
      resourceId: 'indigoVat',
      originRegionId: s.currentRegion,
      originSubregionId: s.currentSubregion,
      createdTurn: s.turn,
      quality: 0.8,
      descriptors: ['tracked'],
      appraisal: 'tracked vat',
    };
    s = {
      ...s,
      resources: { ...s.resources, indigoVat: 3 },
      itemInstances: [marker],
    };
    const s1 = gameReducer(
      s,
      { type: 'RUN_PROCESS', craftId: 'indigo-dyeing', skipStepIds: [] },
      content,
    );
    expect(s1.itemInstances.some((item) => item.id === marker.id)).toBe(false);
    expect(s1.itemInstances[0]?.resourceId).toBe('indigoCloth');
  });

  it('龙泉链路：上游铁锭品质会传入最终剑器实例', () => {
    const { state: s, ingotId } = forgeHighQualitySword();
    const sword = s.itemInstances[0];
    expect(sword.resourceId).toBe('treasureSword');
    expect(sword.sourceCraftId).toBe('longquan-sword');
    expect(sword.sourceItemIds).toContain(ingotId);
    expect(sword.quality).toBeGreaterThan(0.75);
    expect(sword.descriptors.some((word) => ['仙逸', '寒光', '百折', '刚柔并济'].includes(word))).toBe(true);
  });

  it('代表作：高品质作品可题名、陈列并赠予 NPC', () => {
    let s = forgeHighQualitySword().state;
    const swordId = s.itemInstances[0].id;

    s = gameReducer(s, { type: 'NAME_ITEM', itemId: swordId }, content);
    let sword = s.itemInstances.find((item) => item.id === swordId)!;
    expect(sword.displayName).toBeTruthy();
    expect(sword.authorName).toBe('无名匠人');
    expect(s.flags).toContain('named-first-masterwork');

    s = gameReducer(s, { type: 'DISPLAY_ITEM', itemId: swordId }, content);
    sword = s.itemInstances.find((item) => item.id === swordId)!;
    expect(sword.status).toBe('displayed');
    expect(s.flags).toContain('displayed-first-masterwork');

    const beforeGiftStock = s.resources.treasureSword ?? 0;
    s = gameReducer(s, { type: 'GIFT_ITEM', itemId: swordId, npcId: 'jn-ning-ciqiu' }, content);
    sword = s.itemInstances.find((item) => item.id === swordId)!;
    expect(sword.status).toBe('gifted');
    expect(sword.giftedToNpcId).toBe('jn-ning-ciqiu');
    expect(s.resources.treasureSword).toBe(beforeGiftStock - 1);
    expect(s.npcAffinity['jn-ning-ciqiu']).toBeGreaterThanOrEqual(18);
    expect(s.flags).toContain('ning-mentioned-huizhou-stationery');
    expect(s.npcStates['jn-ning-ciqiu'].revealedIntelIds).toContain('intel-ning-stationery-route');
    expect(s.log[0]).toContain('正合其意');
  });

  it('供应链：半成品不足时拒绝开工，不产成品也不计数', () => {
    let s = freshState();
    s = { ...s, resources: { ...s.resources, indigoVat: 1 } };
    const s1 = gameReducer(
      s,
      { type: 'RUN_PROCESS', craftId: 'indigo-dyeing', skipStepIds: [] },
      content,
    );
    expect(s1.resources.indigoCloth ?? 0).toBe(0);
    expect(s1.crafts.find((c) => c.craftId === 'indigo-dyeing')!.produced).toBe(0);
  });

  it('个性化结局：守正抉择 + 高传承的尾声呼应玩家名号', () => {
    let s = gameReducer(freshState(), { type: 'NEW_GAME', seed: 1, playerName: '阿青' }, content);
    // 立心守正 + 风向坚守
    s = { ...s, flags: [...s.flags, 'oath-tradition', 'kept-tradition'] };
    // 拉高传承度，并推进到终局季
    s = { ...s, metrics: { ...s.metrics, heritage: 80 }, turn: s.maxTurns };
    s = gameReducer(s, { type: 'END_TURN' }, content);
    expect(s.status).toBe('ended');
    expect(s.report?.epilogue).toContain('阿青');
    expect(s.report?.epilogue).toContain('守正');
    expect(s.report?.epilogue).toContain('不随波');
  });

  it('TALK_NPC 提升好感度并封顶 100', () => {
    const npcId = NPCS[0].id;
    let s = freshState();
    expect(s.npcAffinity[npcId] ?? 0).toBe(0);
    s = gameReducer(s, { type: 'TALK_NPC', npcId }, content);
    expect(s.npcAffinity[npcId]).toBe(8);
    expect(s.npcStates[npcId].talks).toBe(1);
    expect(s.npcStates[npcId].stage).toBe('stranger');
    expect(s.profile.attributes.people).toBeGreaterThan(5);
    // 反复攀谈不超过 100
    for (let i = 0; i < 30; i++) s = gameReducer(s, { type: 'TALK_NPC', npcId }, content);
    expect(s.npcAffinity[npcId]).toBe(100);
    expect(s.npcStates[npcId].stage).toBe('confidant');
  });

  it('TALK_NPC 会按好感解锁 NPC 地方见闻与叙事标记', () => {
    let s = freshState();
    s = gameReducer(s, { type: 'TALK_NPC', npcId: 'jn-ning-ciqiu' }, content);
    expect(s.npcAffinity['jn-ning-ciqiu']).toBe(8);
    expect(s.flags).toContain('ning-mentioned-huizhou-stationery');
    expect(s.npcStates['jn-ning-ciqiu'].knownTopics).toContain('stationery');
    expect(s.npcStates['jn-ning-ciqiu'].knownTopics).toContain('route:route-jiangnan-huizhou-paper');
    expect(s.npcStates['jn-ning-ciqiu'].revealedIntelIds).toContain('intel-ning-stationery-route');
  });

  it('USE_NPC_FUNCTION 按好感门槛和每日限制结算授艺', () => {
    let s = freshState();
    const blocked = gameReducer(s, { type: 'USE_NPC_FUNCTION', npcId: 'jn-bamboo-master', functionKind: 'mentor' }, content);
    expect(blocked.flags).not.toContain('npc-mentor:jn-bamboo-master');

    s = gameReducer(s, { type: 'TALK_NPC', npcId: 'jn-bamboo-master' }, content);
    const beforeKnowledge = s.profile.attributes.knowledge;
    s = gameReducer(s, { type: 'USE_NPC_FUNCTION', npcId: 'jn-bamboo-master', functionKind: 'mentor' }, content);
    expect(s.flags).toContain('npc-mentor:jn-bamboo-master');
    expect(s.npcStates['jn-bamboo-master'].usedFunctionDays?.mentor).toBe(s.calendar.day);
    expect(s.profile.attributes.knowledge).toBeGreaterThan(beforeKnowledge);
    const affinityAfterMentor = s.npcAffinity['jn-bamboo-master'];

    const sameDay = gameReducer(s, { type: 'USE_NPC_FUNCTION', npcId: 'jn-bamboo-master', functionKind: 'mentor' }, content);
    expect(sameDay.npcAffinity['jn-bamboo-master']).toBe(affinityAfterMentor);
  });

  it('TALK_NPC 不会清空 NPC 功能行动的当日冷却', () => {
    let s = freshState();
    s = gameReducer(s, { type: 'TALK_NPC', npcId: 'jn-bamboo-master' }, content);
    s = gameReducer(s, { type: 'USE_NPC_FUNCTION', npcId: 'jn-bamboo-master', functionKind: 'mentor' }, content);
    const afterMentor = s.npcAffinity['jn-bamboo-master'];

    s = gameReducer(s, { type: 'TALK_NPC', npcId: 'jn-bamboo-master' }, content);
    expect(s.npcStates['jn-bamboo-master'].usedFunctionDays?.mentor).toBe(s.calendar.day);
    const repeated = gameReducer(s, { type: 'USE_NPC_FUNCTION', npcId: 'jn-bamboo-master', functionKind: 'mentor' }, content);
    expect(repeated.npcAffinity['jn-bamboo-master']).toBe(s.npcAffinity['jn-bamboo-master']);
    expect(repeated.npcAffinity['jn-bamboo-master']).toBeGreaterThan(afterMentor);
  });

  it('USE_NPC_FUNCTION 路线指点会写入路线情报', () => {
    let s = freshState();
    s = { ...s, npcAffinity: { ...s.npcAffinity, 'jn-fang-jiheng': 8 } };
    s = gameReducer(s, { type: 'USE_NPC_FUNCTION', npcId: 'jn-fang-jiheng', functionKind: 'route' }, content);
    expect(s.flags).toContain('npc-route:jn-fang-jiheng');
    expect(s.flags).toContain('route-known:route-jiangnan-huizhou-paper');
    expect(s.npcStates['jn-fang-jiheng'].knownTopics).toContain('route:route-jiangnan-huizhou-paper');
    expect(routeStabilityOf(s, 'route-jiangnan-huizhou-paper')).toBeGreaterThan(48);
    expect(s.profile.attributes.commerce).toBeGreaterThan(5);
  });

  it('USE_NPC_FUNCTION 护商会消耗工时、稳定路线并写入护商记忆', () => {
    let s = freshState();
    s = {
      ...s,
      npcAffinity: { ...s.npcAffinity, 'jn-fang-jiheng': 10 },
      resources: { ...s.resources, labor: 4, coin: 0 },
      routeStability: { ...s.routeStability, 'route-jiangnan-huizhou-paper': 20 },
    };
    const beforeStability = routeStabilityOf(s, 'route-jiangnan-huizhou-paper');

    s = gameReducer(s, { type: 'USE_NPC_FUNCTION', npcId: 'jn-fang-jiheng', functionKind: 'escort' }, content);

    expect(s.flags).toContain('npc-escort:jn-fang-jiheng');
    expect(s.flags).toContain('escort:route-jiangnan-huizhou-paper');
    expect(s.flags).toContain('route-known:route-jiangnan-huizhou-paper');
    expect(s.routeEscortRuns['route-jiangnan-huizhou-paper']).toBe(1);
    expect(routeStabilityOf(s, 'route-jiangnan-huizhou-paper')).toBeGreaterThan(beforeStability);
    expect(s.resources.labor).toBe(2);
    expect(s.resources.coin).toBeGreaterThan(0);
    expect(s.profile.attributes.stamina).toBeGreaterThan(5);
    expect(s.regionReputation.jiangnan).toBeGreaterThan(5);
    expect(s.npcStates['jn-fang-jiheng'].usedFunctionDays?.escort).toBe(s.calendar.day);

    const sameDay = gameReducer(s, { type: 'USE_NPC_FUNCTION', npcId: 'jn-fang-jiheng', functionKind: 'escort' }, content);
    expect(sameDay.routeEscortRuns['route-jiangnan-huizhou-paper']).toBe(1);
  });

  it('USE_NPC_FUNCTION 订单会生成可交付的具体 NPC 订单', () => {
    let s = freshState();
    s = { ...s, npcAffinity: { ...s.npcAffinity, 'jn-bamboo-master': 12 } };
    s = gameReducer(s, { type: 'USE_NPC_FUNCTION', npcId: 'jn-bamboo-master', functionKind: 'order' }, content);

    const order = s.activeOrders[0];
    expect(order.npcId).toBe('jn-bamboo-master');
    expect(order.status).toBe('active');
    expect(order.regionId).toBe('jiangnan');
    expect(order.quantity).toBeGreaterThan(0);
    expect(order.rewardCoin).toBeGreaterThan(0);
    expect(order.routeRisk).toBeGreaterThanOrEqual(0);
    expect(order.reputationAtCreation).toBe(s.regionReputation.jiangnan);
    expect(s.flags).toContain('npc-order:jn-bamboo-master');
  });

  it('FULFILL_ORDER 会消耗目标资源、结算赏钱并完成订单', () => {
    let s = freshState();
    s = { ...s, npcAffinity: { ...s.npcAffinity, 'jn-bamboo-master': 12 } };
    s = gameReducer(s, { type: 'USE_NPC_FUNCTION', npcId: 'jn-bamboo-master', functionKind: 'order' }, content);
    const order = s.activeOrders[0];
    s = {
      ...s,
      resources: { ...s.resources, [order.resourceId]: order.quantity, coin: 0 },
    };

    const next = gameReducer(s, { type: 'FULFILL_ORDER', orderId: order.id }, content);
    expect(next.resources[order.resourceId]).toBe(0);
    expect(next.resources.coin).toBe(order.rewardCoin);
    expect(next.activeOrders.find((item) => item.id === order.id)?.status).toBe('completed');
    expect(next.flags).toContain(`order-completed:${order.id}`);
    expect(next.npcAffinity['jn-bamboo-master']).toBeGreaterThan(s.npcAffinity['jn-bamboo-master']);
    expect(next.regionReputation.jiangnan).toBeGreaterThan(s.regionReputation.jiangnan);
    expect(routeStabilityOf(next, order.routeIds?.[0])).toBeGreaterThan(routeStabilityOf(s, order.routeIds?.[0]));
  });

  it('USE_NPC_FUNCTION 联作和鉴评会写入作品实例', () => {
    let s = forgeHighQualitySword().state;
    const swordId = s.itemInstances[0].id;
    s = { ...s, npcAffinity: { ...s.npcAffinity, 'jn-ning-ciqiu': 24 } };
    const beforeQuality = s.itemInstances[0].quality;

    s = gameReducer(s, { type: 'USE_NPC_FUNCTION', npcId: 'jn-ning-ciqiu', functionKind: 'collab', itemId: swordId }, content);
    let sword = s.itemInstances.find((item) => item.id === swordId)!;
    expect(sword.collaboratorNpcIds).toContain('jn-ning-ciqiu');
    expect(sword.quality).toBeGreaterThan(beforeQuality);
    expect(s.flags).toContain('npc-collab:jn-ning-ciqiu');

    s = gameReducer(s, { type: 'USE_NPC_FUNCTION', npcId: 'jn-ning-ciqiu', functionKind: 'appraisal', itemId: swordId }, content);
    sword = s.itemInstances.find((item) => item.id === swordId)!;
    expect(sword.inscription).toContain('宁辞秋');
    expect(s.flags).toContain('npc-appraisal:jn-ning-ciqiu');
  });

  it('逐地区主要 NPC 已具备功能、偏好、见闻和人物线文本', () => {
    const questNpcIds = new Set(QUESTS.map((quest) => quest.npcId));
    const mainNpcIds = [...new Set(REGION_CONTENT.flatMap((region) => region.mainNpcIds))];
    const questRegionIds = new Set(
      QUESTS.map((quest) => ALL_NPCS.find((npc) => npc.id === quest.npcId)?.regionId).filter(Boolean),
    );
    for (const npcId of mainNpcIds) {
      const npc = ALL_NPCS.find((item) => item.id === npcId);
      expect(npc, npcId).toBeTruthy();
      expect(npc?.functions?.length ?? 0).toBeGreaterThan(0);
      expect(npc?.preferences?.length ?? 0).toBeGreaterThan(0);
      expect(npc?.intel?.length ?? 0).toBeGreaterThan(0);
      expect(npc?.relationshipLines?.familiar?.length ?? 0).toBeGreaterThan(0);
      expect(npc?.personalDilemma?.length ?? 0).toBeGreaterThan(0);
      expect(npc?.endingInfluence?.length ?? 0).toBeGreaterThan(0);
    }
    for (const region of REGIONS) expect(questRegionIds.has(region.id), region.id).toBe(true);
    for (const npcId of [
      'bs-luo-qingmie',
      'bs-mabang-ayue',
      'qd-yinniang-alan',
      'qd-mu-luozi',
      'jj-lan-daqi',
      'jj-song-yasi',
      'ln-wu-haichao',
      'jc-qinglu',
      'gp-chai-yazi',
      'hz-wang-zhiniang',
      'sj-lei-zhanggui',
      'xy-yak-captain',
      'xu-tuoling-shu',
    ]) expect(questNpcIds.has(npcId), npcId).toBe(true);
    expect(ALL_NPCS.find((item) => item.id === 'bs-mabang-ayue')?.functions).toContain('escort');
    expect(ALL_NPCS.find((item) => item.id === 'qd-mu-luozi')?.functions).toContain('escort');
    expect(ALL_NPCS.find((item) => item.id === 'xy-yak-captain')?.functions).toContain('escort');
    expect(ALL_NPCS.find((item) => item.id === 'xu-tuoling-shu')?.functions).toContain('escort');
  });

  it('外地路线委托会写入结构化路线情报', () => {
    let s = freshState();
    s = {
      ...s,
      npcAffinity: { ...s.npcAffinity, 'bs-mabang-ayue': 8 },
      completedActivities: ['bs-tea-horse-post'],
    };
    const next = gameReducer(s, { type: 'COMPLETE_QUEST', questId: 'q-bashu-tea-horse-snow-pass' }, content);
    expect(next.completedQuests).toContain('q-bashu-tea-horse-snow-pass');
    expect(next.regionReputation.bashu).toBeGreaterThan(s.regionReputation.bashu ?? 0);
    expect(next.flags).toContain('bashu-mabang-roadbook');
    expect(next.flags).toContain('route-known:route-bashu-qiandian-tea-horse');
    expect(next.flags).toContain('route-known:route-bashu-xueyu-snow-pass');
  });

  it('后续地区路线委托会写入路线情报与地区声望', () => {
    const cases = [
      {
        questId: 'q-lingnan-export-ledger',
        npcId: 'ln-wu-haichao',
        regionId: 'lingnan',
        completedActivities: ['ln-pearl-river-harbor'],
        flags: ['lingnan-export-ledger', 'route-known:route-qiandian-lingnan-harbor'],
      },
      {
        questId: 'q-jingchu-water-ledger',
        npcId: 'jc-qinglu',
        regionId: 'jingchu',
        completedActivities: ['jc-ferry-market'],
        flags: ['jingchu-water-ledger', 'route-known:route-jingchu-ganpo-lake'],
      },
      {
        questId: 'q-ganpo-kiln-firewood',
        npcId: 'gp-chai-yazi',
        regionId: 'ganpo',
        completedActivities: ['gp-river-wood-yard'],
        flags: ['ganpo-kiln-firewood-ledger', 'route-known:route-ganpo-huizhou-merchant'],
      },
      {
        questId: 'q-huizhou-paper-ink-pledge',
        npcId: 'hz-wang-zhiniang',
        regionId: 'huizhou',
        completedActivities: ['hz-paper-valley'],
        flags: ['huizhou-paper-ink-pledge', 'route-known:route-jiangnan-huizhou-paper'],
      },
      {
        questId: 'q-sanjin-piaohao-credit',
        npcId: 'sj-lei-zhanggui',
        regionId: 'sanjin',
        completedActivities: ['sj-piaohao'],
        flags: ['sanjin-piaohao-credit-note', 'route-known:route-jingji-sanjin-official'],
      },
      {
        questId: 'q-xueyu-snow-pass-supply',
        npcId: 'xy-yak-captain',
        regionId: 'xueyu',
        completedActivities: ['xy-snow-pass'],
        flags: ['xueyu-snow-pass-supply', 'route-known:route-xueyu-xiyu-caravan'],
      },
      {
        questId: 'q-xiyu-caravan-contract',
        npcId: 'xu-tuoling-shu',
        regionId: 'xiyu',
        completedActivities: ['xiyu-caravan-post'],
        flags: ['xiyu-caravan-contract', 'route-known:route-xueyu-xiyu-caravan'],
      },
    ];

    for (const testCase of cases) {
      const s = {
        ...freshState(),
        npcAffinity: { [testCase.npcId]: 16 },
        completedActivities: testCase.completedActivities,
      };
      const next = gameReducer(s, { type: 'COMPLETE_QUEST', questId: testCase.questId }, content);
      expect(next.completedQuests, testCase.questId).toContain(testCase.questId);
      expect(next.regionReputation[testCase.regionId], testCase.questId).toBeGreaterThan(
        s.regionReputation[testCase.regionId] ?? 0,
      );
      for (const flag of testCase.flags) expect(next.flags, `${testCase.questId}:${flag}`).toContain(flag);
    }
  });

  it('COMPLETE_QUEST：好感不足时拒绝交付', () => {
    const quest = QUESTS[0];
    let s = freshState();
    // 满足成品条件，但好感为 0
    s = { ...s, resources: { ...s.resources, bambooWare: 1, indigoCloth: 1 } };
    s = gameReducer(s, { type: 'COMPLETE_QUEST', questId: quest.id }, content);
    expect(s.completedQuests).not.toContain(quest.id);
  });

  it('COMPLETE_QUEST：好感+条件满足时交付领赏并记完成', () => {
    const quest = QUESTS.find((q) => q.id === 'q-bamboo-basket')!;
    let s = freshState();
    s = { ...s, resources: { ...s.resources, bambooWare: 1 } };
    // 攀谈至好感达门槛
    for (let i = 0; i < 3; i++) s = gameReducer(s, { type: 'TALK_NPC', npcId: quest.npcId }, content);
    expect(s.npcAffinity[quest.npcId]).toBeGreaterThanOrEqual(quest.requireAffinity);
    const coinBefore = s.resources.coin ?? 0;
    s = gameReducer(s, { type: 'COMPLETE_QUEST', questId: quest.id }, content);
    expect(s.completedQuests).toContain(quest.id);
    expect(s.regionReputation.jiangnan).toBeGreaterThan(5);
    expect(s.resources.coin).toBe(coinBefore + (quest.reward.coin ?? 0));
    // 重复交付无效
    const again = gameReducer(s, { type: 'COMPLETE_QUEST', questId: quest.id }, content);
    expect(again.resources.coin).toBe(s.resources.coin);
  });

  it('宁辞秋人物线：文房任务消耗纸墨，题跋任务写入代表作', () => {
    let s = forgeHighQualitySword().state;
    const swordId = s.itemInstances[0].id;
    s = {
      ...s,
      flags: [...s.flags, 'met-ning-poetry'],
      resources: { ...s.resources, paperSheet: 1, inkStick: 1 },
      npcAffinity: { ...s.npcAffinity, 'jn-ning-ciqiu': 24 },
    };

    s = gameReducer(s, { type: 'COMPLETE_QUEST', questId: 'q-ning-stationery' }, content);
    expect(s.completedQuests).toContain('q-ning-stationery');
    expect(s.resources.paperSheet).toBe(0);
    expect(s.resources.inkStick).toBe(0);
    expect(s.flags).toContain('ning-stationery-ready');

    s = gameReducer(s, { type: 'COMPLETE_QUEST', questId: 'q-ning-inscription' }, content);
    const sword = s.itemInstances.find((item) => item.id === swordId)!;
    expect(s.completedQuests).toContain('q-ning-inscription');
    expect(sword.displayName).toBeTruthy();
    expect(sword.inscription).toContain('器成于手');
    expect(sword.collaboratorNpcIds).toContain('jn-ning-ciqiu');
    expect(s.flags).toContain('ning-inscribed-masterwork');
  });

  it('龙泉人物线：陆寒泉验收亲手锻出的第一把剑', () => {
    let s = forgeHighQualitySword().state;
    s = { ...s, npcAffinity: { ...s.npcAffinity, 'jn-lu-hanquan': 16 } };
    s = gameReducer(s, { type: 'COMPLETE_QUEST', questId: 'q-longquan-first-sword' }, content);
    expect(s.completedQuests).toContain('q-longquan-first-sword');
    expect(s.flags).toContain('longquan-first-sword-approved');
  });

  it('全流程 demo：家园种植→江南制作订单→解锁徽州→跨区制纸订单可自循环', () => {
    let s = gameReducer(freshState(), { type: 'TRAVEL_SUBREGION', subregionId: 'jiangnan-baigongyuan' }, demoContent);
    expect(s.currentSubregion).toBe('jiangnan-baigongyuan');

    s = gameReducer(s, { type: 'PLANT_CROP', plotId: 'yard-1', cropId: 'indigo' }, demoContent);
    expect(s.farmPlots[0].cropId).toBe('indigo');

    for (let day = 0; day < 3; day++) {
      s = gameReducer(s, { type: 'WATER_PLOT', plotId: 'yard-1' }, demoContent);
      s = endDemoDay(s);
    }
    expect(s.farmPlots[0].growth).toBe(100);

    s = gameReducer(s, { type: 'HARVEST_CROP', plotId: 'yard-1' }, demoContent);
    expect(s.farmPlots[0].cropId).toBeNull();
    expect(s.resources.indigoPlant).toBeGreaterThanOrEqual(4);

    s = gameReducer(s, { type: 'TRAVEL_SUBREGION', subregionId: 'jiangnan-suhang' }, demoContent);
    expect(s.currentSubregion).toBe('jiangnan-suhang');
    s = gameReducer(s, { type: 'GATHER_RESOURCE', industryId: 'build-indigo', quality: 1 }, demoContent);
    s = gameReducer(s, { type: 'GATHER_RESOURCE', industryId: 'build-indigo', quality: 1 }, demoContent);
    expect(s.resources.indigoVat).toBeGreaterThanOrEqual(3);

    s = endDemoDay(s);
    s = gameReducer(
      s,
      { type: 'RUN_PROCESS', craftId: 'indigo-dyeing', skipStepIds: ['harvest-indigo', 'tie-resist'] },
      demoContent,
    );
    expect(s.resources.indigoCloth).toBeGreaterThanOrEqual(1);
    const coinAfterCraft = s.resources.coin ?? 0;
    s = gameReducer(s, { type: 'TAKE_ORDER', craftId: 'indigo-dyeing' }, demoContent);
    expect(s.resources.coin).toBeGreaterThan(coinAfterCraft);

    s = gameReducer(s, { type: 'GATHER_RESOURCE', industryId: 'harvest-bamboo', quality: 1 }, demoContent);
    expect(s.resources.bambooRaw).toBeGreaterThanOrEqual(1);

    s = gameReducer(s, { type: 'UNLOCK_REGION', regionId: 'huizhou' }, demoContent);
    expect(s.unlockedRegions).toContain('huizhou');
    s = gameReducer(s, { type: 'TRAVEL', regionId: 'huizhou' }, demoContent);
    expect(s.currentRegion).toBe('huizhou');

    s = gameReducer(s, { type: 'TRAVEL_SUBREGION', subregionId: 'huizhou-paper-valley' }, demoContent);
    expect(s.currentSubregion).toBe('huizhou-paper-valley');
    s = endDemoDay(s);
    s = gameReducer(s, { type: 'GATHER_RESOURCE', industryId: 'harvest-qingtan', quality: 1 }, demoContent);
    s = gameReducer(s, { type: 'GATHER_RESOURCE', industryId: 'make-paper', quality: 1 }, demoContent);
    expect(s.resources.paperSheet).toBeGreaterThanOrEqual(1);

    s = gameReducer(s, { type: 'RUN_PROCESS', craftId: 'xuan-paper', skipStepIds: [] }, demoContent);
    expect(s.resources.xuanPaper).toBeGreaterThanOrEqual(1);
    const coinBeforePaperOrder = s.resources.coin ?? 0;
    s = gameReducer(s, { type: 'TAKE_ORDER', craftId: 'xuan-paper' }, demoContent);
    expect(s.resources.coin).toBeGreaterThan(coinBeforePaperOrder);
    expect(s.status).toBe('playing');
    expect(s.calendar.day).toBeGreaterThan(1);
    expect(s.profile.attributes.craft).toBeGreaterThan(5);
    expect(s.profile.attributes.commerce).toBeGreaterThan(5);
  });
});
