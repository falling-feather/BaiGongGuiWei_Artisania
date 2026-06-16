import { describe, expect, it } from 'vitest';
import { gameReducer, type ActiveOrder, type GameContent, type GameState, type ItemInstance } from '../index';
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

function chapterState(chapterId: string, npcId: string, flags: string[]): GameState {
  const state = buildRegionChapterSmokeState(content, chapterId);
  if (!state) throw new Error(`Missing chapter smoke state: ${chapterId}`);
  return {
    ...state,
    activeOrders: [],
    flags: [...new Set([...state.flags, ...flags])],
    resources: { ...state.resources, coin: 9999 },
    npcAffinity: { ...state.npcAffinity, [npcId]: 40 },
  };
}

function item(
  id: string,
  state: GameState,
  resourceId: string,
  sourceCraftId: string | undefined,
  originRegionId: string,
  originSubregionId: string,
  status: ItemInstance['status'],
  quality = 0.74,
): ItemInstance {
  return {
    id,
    resourceId,
    sourceCraftId,
    originRegionId,
    originSubregionId,
    createdTurn: state.turn,
    quality,
    descriptors: ['F2 ready 区复样', '长线订单读数'],
    appraisal: '适合 F2 ready 区补密度测试的陈列样。',
    displayName: id.includes('display') ? `${resourceId} 陈列样` : `${resourceId} 交付样`,
    status,
  };
}

function activeOrder(state: GameState, predicate: (order: ActiveOrder) => boolean): ActiveOrder {
  const order = state.activeOrders.find(predicate);
  if (!order) throw new Error('Expected active order');
  return order;
}

describe('F2 ready region density closures', () => {
  it('turns the Bashu tea-horse aftertalk into a Linqiong iron return order', () => {
    const base = chapterState('chapter-bashu-tea-horse-brocade', 'bs-mabang-ayue', [
      'tea-horse-closing-load-ledger',
      'route-order-completed:bs-tea-horse-post',
    ]);
    const displayed = item('display-bashu-linqiong-iron', base, 'ironIngot', undefined, 'bashu', 'bashu-linqiong-iron', 'displayed');
    const replica = item('held-bashu-linqiong-iron', base, 'ironIngot', undefined, 'bashu', 'bashu-linqiong-iron', 'held', 0.72);

    const opened = gameReducer(
      { ...base, itemInstances: [displayed, replica, ...base.itemInstances] },
      {
        type: 'USE_NPC_FUNCTION',
        npcId: 'bs-mabang-ayue',
        functionKind: 'homeVisit',
        homeVisitChoiceId: 'ayue-linqiong-iron-ledger-order',
      },
      content,
    );
    const record = opened.homeVisitRecords[0];
    const order = activeOrder(opened, (candidate) => candidate.id === record.referralOrderId);

    expect(record).toMatchObject({
      npcId: 'bs-mabang-ayue',
      title: '茶马会后日谈 · 临邛铁料回流',
      choiceId: 'ayue-linqiong-iron-ledger-order',
      choiceKind: 'collect',
      referralTitle: '临邛铁料回流单',
      itemId: displayed.id,
    });
    expect(order).toMatchObject({
      npcId: 'bs-mabang-ayue',
      orderKind: 'route',
      sourceHomeVisitChoiceId: 'ayue-linqiong-iron-ledger-order',
      resourceId: 'ironIngot',
      minQuality: 0.6,
      routeIds: ['route-bashu-qiandian-tea-horse', 'route-bashu-xueyu-snow-pass'],
    });
    expect(opened.flags).toContain('bashu-linqiong-iron-return-ready');

    const delivered = gameReducer(opened, { type: 'FULFILL_ORDER', orderId: order.id }, content);
    expect(delivered.flags).toContain('homevisit-referral-completed:ayue-linqiong-iron-ledger-order');
    expect(delivered.flags).toContain('route-order-completed:bs-mabang-ayue');
    expect(delivered.itemInstances.find((candidate) => candidate.id === displayed.id)?.status).toBe('displayed');
    expect(delivered.itemInstances.some((candidate) => candidate.id === replica.id)).toBe(false);
  });

  it('turns the Lingnan Qilou ship ledger into a Duan/Shiwan export difference order', () => {
    const base = chapterState('chapter-lingnan-harbor-gambiered', 'ln-wu-haichao', [
      'qilou-closing-ship-date-ledger',
      'route-order-completed:ln-qilou-night-market',
    ]);
    const displayed = item('display-lingnan-duan-inkstone', base, 'duanInkstone', 'duan-inkstone', 'lingnan', 'lingnan-duan-stone', 'displayed');
    const replica = item('held-lingnan-duan-inkstone', base, 'duanInkstone', 'duan-inkstone', 'lingnan', 'lingnan-duan-stone', 'held', 0.72);

    const opened = gameReducer(
      { ...base, itemInstances: [displayed, replica, ...base.itemInstances] },
      {
        type: 'USE_NPC_FUNCTION',
        npcId: 'ln-wu-haichao',
        functionKind: 'homeVisit',
        homeVisitChoiceId: 'wu-duan-shiwan-ship-ledger-order',
      },
      content,
    );
    const record = opened.homeVisitRecords[0];
    const order = activeOrder(opened, (candidate) => candidate.id === record.referralOrderId);

    expect(record).toMatchObject({
      npcId: 'ln-wu-haichao',
      title: '骑楼船期后日谈 · 佛山端石分账',
      choiceId: 'wu-duan-shiwan-ship-ledger-order',
      referralTitle: '端陶船期复样单',
      itemId: displayed.id,
    });
    expect(order).toMatchObject({
      npcId: 'ln-wu-haichao',
      orderKind: 'route',
      sourceHomeVisitChoiceId: 'wu-duan-shiwan-ship-ledger-order',
      resourceId: 'duanInkstone',
      minQuality: 0.64,
      routeIds: ['route-qiandian-lingnan-harbor'],
    });
    expect(opened.flags).toContain('lingnan-duan-shiwan-ship-ledger-ready');

    const delivered = gameReducer(opened, { type: 'FULFILL_ORDER', orderId: order.id }, content);
    expect(delivered.flags).toContain('homevisit-referral-completed:wu-duan-shiwan-ship-ledger-order');
    expect(delivered.flags).toContain('route-order-completed:ln-wu-haichao');
    expect(delivered.itemInstances.find((candidate) => candidate.id === displayed.id)?.status).toBe('displayed');
    expect(delivered.itemInstances.some((candidate) => candidate.id === replica.id)).toBe(false);
  });

  it('turns the Ganpo kiln fair return into a kaolin and river-firewood route order', () => {
    const base = chapterState('chapter-ganpo-kiln-firewood', 'gp-chai-yazi', [
      'kiln-closing-river-yard-seconds',
      'route-order-completed:gp-kiln-opening-fair',
    ]);
    const displayed = item('display-ganpo-kiln-sample', base, 'jingdezhenPorcelain', 'jingdezhen-porcelain', 'ganpo', 'ganpo-kiln-town', 'displayed');
    const replica = item('held-ganpo-kiln-sample', base, 'jingdezhenPorcelain', 'jingdezhen-porcelain', 'ganpo', 'ganpo-kiln-town', 'held', 0.72);

    const opened = gameReducer(
      { ...base, itemInstances: [displayed, replica, ...base.itemInstances] },
      {
        type: 'USE_NPC_FUNCTION',
        npcId: 'gp-chai-yazi',
        functionKind: 'homeVisit',
        homeVisitChoiceId: 'chai-river-kaolin-ledger-order',
      },
      content,
    );
    const record = opened.homeVisitRecords[0];
    const order = activeOrder(opened, (candidate) => candidate.id === record.referralOrderId);

    expect(record).toMatchObject({
      npcId: 'gp-chai-yazi',
      title: '河运柴场回访 · 瓷土窑样路账',
      choiceId: 'chai-river-kaolin-ledger-order',
      referralTitle: '瓷土柴路复窑单',
      itemId: displayed.id,
    });
    expect(order).toMatchObject({
      npcId: 'gp-chai-yazi',
      orderKind: 'route',
      sourceHomeVisitChoiceId: 'chai-river-kaolin-ledger-order',
      resourceId: 'jingdezhenPorcelain',
      minQuality: 0.66,
      routeIds: ['route-jiangnan-ganpo-kiln', 'route-jingchu-ganpo-lake', 'route-ganpo-huizhou-merchant'],
    });
    expect(opened.flags).toContain('ganpo-river-kaolin-ledger-ready');

    const delivered = gameReducer(opened, { type: 'FULFILL_ORDER', orderId: order.id }, content);
    expect(delivered.flags).toContain('homevisit-referral-completed:chai-river-kaolin-ledger-order');
    expect(delivered.flags).toContain('route-order-completed:gp-chai-yazi');
    expect(delivered.itemInstances.find((candidate) => candidate.id === displayed.id)?.status).toBe('displayed');
    expect(delivered.itemInstances.some((candidate) => candidate.id === replica.id)).toBe(false);
  });

  it('turns the Xiyu bazaar rare sample into an Atlas silk caravan-risk order', () => {
    const base = chapterState('chapter-xiyu-bazaar-caravan', 'xu-guli', [
      'bazaar-closing-rare-consign',
      'route-known:route-xueyu-xiyu-caravan',
    ]);
    const displayed = item('display-xiyu-atlas-silk', base, 'atlasSilk', 'atlas-silk', 'xiyu', 'xiyu-atlas-loom', 'displayed');
    const replica = item('held-xiyu-atlas-silk', base, 'atlasSilk', 'atlas-silk', 'xiyu', 'xiyu-atlas-loom', 'held', 0.72);

    const opened = gameReducer(
      { ...base, itemInstances: [displayed, replica, ...base.itemInstances] },
      {
        type: 'USE_NPC_FUNCTION',
        npcId: 'xu-guli',
        functionKind: 'homeVisit',
        homeVisitChoiceId: 'guli-atlas-route-ledger-order',
      },
      content,
    );
    const record = opened.homeVisitRecords[0];
    const order = activeOrder(opened, (candidate) => candidate.id === record.referralOrderId);

    expect(record).toMatchObject({
      npcId: 'xu-guli',
      title: '巴扎织样回访 · 艾德莱斯路账',
      choiceId: 'guli-atlas-route-ledger-order',
      referralTitle: '艾德莱斯路账复样单',
      itemId: displayed.id,
    });
    expect(order).toMatchObject({
      npcId: 'xu-guli',
      orderKind: 'route',
      sourceHomeVisitChoiceId: 'guli-atlas-route-ledger-order',
      resourceId: 'atlasSilk',
      minQuality: 0.66,
      routeIds: ['route-xueyu-xiyu-caravan'],
    });
    expect(opened.flags).toContain('xiyu-atlas-bazaar-route-ledger-ready');

    const delivered = gameReducer(opened, { type: 'FULFILL_ORDER', orderId: order.id }, content);
    expect(delivered.flags).toContain('homevisit-referral-completed:guli-atlas-route-ledger-order');
    expect(delivered.flags).toContain('route-order-completed:xu-guli');
    expect(delivered.itemInstances.find((candidate) => candidate.id === displayed.id)?.status).toBe('displayed');
    expect(delivered.itemInstances.some((candidate) => candidate.id === replica.id)).toBe(false);
  });
});
