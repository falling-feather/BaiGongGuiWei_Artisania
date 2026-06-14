import { describe, expect, it } from 'vitest';
import { gameReducer, orderDeliveryIssue, type ActiveOrder, type GameContent, type GameState, type ItemInstance } from '../index';
import {
  ACHIEVEMENTS,
  ALL_NPCS,
  COLLAB_RECIPES,
  CRAFT_INTERACTIONS,
  CRAFTS,
  ESCORT_ENCOUNTERS,
  EVENTS,
  HOME_VISITS,
  INDUSTRIES,
  ITEM_DESCRIPTOR_RULES,
  LORE_ENTRIES,
  QUESTS,
  REGION_ACTIVITIES,
  REGION_CHAPTERS,
  REGION_CONTENT,
  REGIONS,
  RESOURCES,
  STARTING_APPRENTICES,
  STORY_BEATS,
  SUBREGION_CONTENT,
  WORKSHOP_UPGRADES,
} from '../../data';
import { buildRegionChapterSmokeState } from '../../dev/regionChapterSmokeScenarios';

const content: GameContent = {
  crafts: CRAFTS,
  apprentices: STARTING_APPRENTICES,
  events: EVENTS,
  industries: INDUSTRIES,
  regions: REGIONS,
  achievements: ACHIEVEMENTS,
  story: STORY_BEATS,
  resources: RESOURCES,
  npcs: ALL_NPCS,
  quests: QUESTS,
  activities: REGION_ACTIVITIES,
  regionContent: REGION_CONTENT,
  subregionContent: SUBREGION_CONTENT,
  escortEncounters: ESCORT_ENCOUNTERS,
  collabRecipes: COLLAB_RECIPES,
  homeVisits: HOME_VISITS,
  craftInteractions: CRAFT_INTERACTIONS,
  workshopUpgrades: WORKSHOP_UPGRADES,
  itemDescriptorRules: ITEM_DESCRIPTOR_RULES,
  loreEntries: LORE_ENTRIES,
};

interface M1OrderChainCase {
  chapterId: string;
  activityId: string;
  npcId: string;
  regionId: string;
  subregionId: string;
  resourceId: string;
  openFlag: string;
  routeIds: string[];
}

const M1_ORDER_CHAIN_CASES: M1OrderChainCase[] = [
  {
    chapterId: 'chapter-qiandian-silver-tea-road',
    activityId: 'qd-tea-horse-road',
    npcId: 'qd-mu-luozi',
    regionId: 'qiandian',
    subregionId: 'qiandian-tea-road',
    resourceId: 'silverOrnament',
    openFlag: 'qiandian-silver-festival-order-open',
    routeIds: [
      'route-bashu-qiandian-tea-horse',
      'route-qiandian-jingchu-mine',
      'route-qiandian-lingnan-harbor',
    ],
  },
  {
    chapterId: 'chapter-jingchu-ferry-lacquer',
    activityId: 'jc-ferry-market',
    npcId: 'jc-qinglu',
    regionId: 'jingchu',
    subregionId: 'jingchu-lake-market',
    resourceId: 'chuLacquer',
    openFlag: 'jingchu-lacquer-repair-order-open',
    routeIds: ['route-jingchu-ganpo-lake'],
  },
  {
    chapterId: 'chapter-huizhou-paper-merchant',
    activityId: 'hz-merchant-hall',
    npcId: 'hz-cheng-yuanzhou',
    regionId: 'huizhou',
    subregionId: 'huizhou-merchant-hall',
    resourceId: 'xuanPaper',
    openFlag: 'huizhou-paper-merchant-order-open',
    routeIds: ['route-jiangnan-huizhou-paper', 'route-ganpo-huizhou-merchant'],
  },
  {
    chapterId: 'chapter-jingji-palace-procurement',
    activityId: 'jj-official-gate',
    npcId: 'jj-song-yasi',
    regionId: 'jingji',
    subregionId: 'jingji-official-gate',
    resourceId: 'cloisonne',
    openFlag: 'jingji-palace-procurement-order-open',
    routeIds: ['route-jiangnan-jingji-canal', 'route-jingji-sanjin-official'],
  },
  {
    chapterId: 'chapter-sanjin-piaohao-lacquer',
    activityId: 'sj-piaohao',
    npcId: 'sj-lei-zhanggui',
    regionId: 'sanjin',
    subregionId: 'sanjin-piaohao',
    resourceId: 'pingyaoLacquer',
    openFlag: 'sanjin-credit-lacquer-order-open',
    routeIds: ['route-jingji-sanjin-official'],
  },
  {
    chapterId: 'chapter-xueyu-thangka-snowpass',
    activityId: 'xy-snow-pass',
    npcId: 'xy-yak-captain',
    regionId: 'xueyu',
    subregionId: 'xueyu-snow-pass',
    resourceId: 'thangka',
    openFlag: 'xueyu-thangka-snow-pass-order-open',
    routeIds: ['route-bashu-xueyu-snow-pass', 'route-xueyu-xiyu-caravan'],
  },
];

function orderForActivity(state: GameState, testCase: M1OrderChainCase): ActiveOrder {
  const order = state.activeOrders.find(
    (candidate) =>
      candidate.sourceActivityId === testCase.activityId &&
      candidate.resourceId === testCase.resourceId &&
      candidate.status === 'active',
  );
  if (!order) throw new Error(`Missing generated order for ${testCase.activityId}`);
  return order;
}

function testItem(state: GameState, testCase: M1OrderChainCase, order: ActiveOrder, quality: number): ItemInstance {
  return {
    id: `${testCase.activityId}-${quality < order.minQuality ? 'low' : 'good'}-item`,
    resourceId: testCase.resourceId,
    sourceActivityId: testCase.activityId,
    originRegionId: testCase.regionId,
    originSubregionId: testCase.subregionId,
    createdTurn: state.turn,
    quality,
    descriptors: ['章节回样', '路线验收'],
    appraisal: '章节订单验收测试样。',
    displayName: `${order.title}测试样`,
    status: 'held',
  };
}

function stateWithOnlyTrackedOrderItem(state: GameState, order: ActiveOrder, item: ItemInstance): GameState {
  return {
    ...state,
    resources: {
      ...state.resources,
      [order.resourceId]: Math.max(order.quantity, state.resources[order.resourceId] ?? 0),
    },
    itemInstances: [
      item,
      ...state.itemInstances.filter((candidate) => candidate.resourceId !== order.resourceId),
    ],
  };
}

describe('M1 region chapter activity order chains', () => {
  it.each(M1_ORDER_CHAIN_CASES)('$chapterId binds a real item-state activity order hook', (testCase) => {
    const chapter = REGION_CHAPTERS.find((candidate) => candidate.id === testCase.chapterId);
    const activity = REGION_ACTIVITIES.find((candidate) => candidate.id === testCase.activityId);
    const hook = chapter?.orderHooks.find((candidate) => candidate.source === 'activity' && candidate.id === testCase.activityId);

    expect(activity?.reward.generatedOrder?.resourceId).toBe(testCase.resourceId);
    expect(activity?.reward.generatedOrder?.npcId).toBe(testCase.npcId);
    expect(activity?.reward.generatedOrder?.routeIds).toEqual(expect.arrayContaining(testCase.routeIds));
    expect(hook?.readsItemState).toBe(true);
    expect(chapter?.orderHooks.some((candidate) => candidate.id.startsWith('proposed-'))).toBe(false);
  });

  it.each(M1_ORDER_CHAIN_CASES)(
    '$activityId generates, rejects low-quality tracked work, then delivers a valid route order',
    (testCase) => {
      const initial = buildRegionChapterSmokeState(content, testCase.chapterId);
      if (!initial) throw new Error(`Missing chapter smoke state for ${testCase.chapterId}`);

      const performed = gameReducer(
        initial,
        { type: 'PERFORM_ACTIVITY', activityId: testCase.activityId, quality: 0.9 },
        content,
      );
      const order = orderForActivity(performed, testCase);

      expect(order).toMatchObject({
        npcId: testCase.npcId,
        resourceId: testCase.resourceId,
        orderKind: 'route',
        sourceActivityId: testCase.activityId,
      });
      expect(order.routeIds).toEqual(expect.arrayContaining(testCase.routeIds));
      expect(performed.flags).toContain(`activity-order:${testCase.activityId}`);
      expect(performed.flags).toContain(`route-order:${testCase.activityId}`);
      expect(performed.flags).toContain(testCase.openFlag);

      const lowQuality = Math.max(0.25, order.minQuality - 0.16);
      const blockedItem = testItem(performed, testCase, order, lowQuality);
      const blockedState = stateWithOnlyTrackedOrderItem(performed, order, blockedItem);
      const issue = orderDeliveryIssue(blockedState, order, content);
      const blocked = gameReducer(blockedState, { type: 'FULFILL_ORDER', orderId: order.id }, content);

      expect(issue).toContain('品相不足');
      expect(blocked.activeOrders.find((candidate) => candidate.id === order.id)?.status).toBe('active');
      expect(blocked.flags).not.toContain(`order-completed:${order.id}`);

      const validItem = testItem(performed, testCase, order, Math.min(0.95, order.minQuality + 0.16));
      const readyState = stateWithOnlyTrackedOrderItem(performed, order, validItem);
      const delivered = gameReducer(readyState, { type: 'FULFILL_ORDER', orderId: order.id }, content);

      expect(delivered.activeOrders.find((candidate) => candidate.id === order.id)?.status).toBe('completed');
      expect(delivered.flags).toContain(`order-completed:${order.id}`);
      expect(delivered.flags).toContain(`activity-order-completed:${testCase.activityId}`);
      expect(delivered.flags).toContain(`route-order-completed:${testCase.activityId}`);
      for (const routeId of testCase.routeIds) expect(delivered.flags).toContain(`route-known:${routeId}`);
    },
  );
});
