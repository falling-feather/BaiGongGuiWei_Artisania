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

function huizhouState(): GameState {
  const state = buildRegionChapterSmokeState(content, 'chapter-huizhou-paper-merchant');
  if (!state) throw new Error('Missing huizhou chapter smoke state');
  return {
    ...state,
    activeOrders: [],
    resources: { ...state.resources, coin: 9999, xuanPaper: 12, huiInk: 12, sheInkstone: 12 },
    npcAffinity: { ...state.npcAffinity, 'hz-wang-zhiniang': 36, 'hz-cheng-yuanzhou': 36 },
  };
}

function stationeryItem(
  resourceId: 'xuanPaper' | 'huiInk' | 'sheInkstone',
  id: string,
  state: GameState,
  quality = 0.74,
  status: ItemInstance['status'] = 'held',
): ItemInstance {
  const craftByResource = {
    xuanPaper: 'xuan-paper',
    huiInk: 'hui-ink',
    sheInkstone: 'she-inkstone',
  } as const;
  const subregionByResource = {
    xuanPaper: 'huizhou-paper-valley',
    huiInk: 'huizhou-ink-alley',
    sheInkstone: 'huizhou-she-stone',
  } as const;
  return {
    id,
    resourceId,
    sourceCraftId: craftByResource[resourceId],
    originRegionId: 'huizhou',
    originSubregionId: subregionByResource[resourceId],
    createdTurn: state.turn,
    quality,
    descriptors: ['纸墨有账', '徽商藏客可验'],
    appraisal: '一件能让文房藏客、押货信用和路线担保互相查验的文房样。',
    displayName: status === 'displayed' ? '徽州文房信用陈列样' : '徽州文房信用复样',
    status,
  };
}

function activeOrder(state: GameState, predicate: (order: ActiveOrder) => boolean): ActiveOrder {
  const order = state.activeOrders.find((candidate) => candidate.status === 'active' && predicate(candidate));
  if (!order) throw new Error('Missing expected active order');
  return order;
}

function prepareStationeryCreditPrereqs(base: GameState): GameState {
  const displayed = stationeryItem('xuanPaper', 'display-huizhou-stationery-ledger', base, 0.76, 'displayed');
  const replica = stationeryItem('xuanPaper', 'held-huizhou-stationery-ledger', base, 0.74);
  let state: GameState = {
    ...base,
    currentSubregion: 'huizhou-paper-valley',
    itemInstances: [displayed, replica, ...base.itemInstances],
  };

  state = gameReducer(
    state,
    {
      type: 'USE_NPC_FUNCTION',
      npcId: 'hz-wang-zhiniang',
      functionKind: 'homeVisit',
      homeVisitChoiceId: 'stationery-collection-ledger',
    },
    content,
  );
  const firstRecord = state.homeVisitRecords[0];
  const firstOrder = activeOrder(state, (order) => order.id === firstRecord.referralOrderId);
  state = gameReducer(state, { type: 'FULFILL_ORDER', orderId: firstOrder.id }, content);

  state = gameReducer(
    {
      ...state,
      calendar: { ...state.calendar, day: state.calendar.day + 1, phase: 'morning' },
      resources: { ...state.resources, xuanPaper: (state.resources.xuanPaper ?? 0) + 1 },
    },
    {
      type: 'USE_NPC_FUNCTION',
      npcId: 'hz-wang-zhiniang',
      functionKind: 'homeVisit',
      homeVisitChoiceId: 'collector-continued-ledger',
    },
    content,
  );
  expect(state.flags).toContain('collector-reputation-stationery-renewed');

  state = gameReducer(
    {
      ...state,
      currentSubregion: 'huizhou-merchant-hall',
      calendar: { ...state.calendar, day: state.calendar.day + 1, phase: 'morning' },
    },
    { type: 'PERFORM_ACTIVITY', activityId: 'hz-merchant-hall', quality: 0.84 },
    content,
  );
  expect(state.flags).toContain('huizhou-merchant-credit');
  return state;
}

describe('Huizhou merchant credit longline', () => {
  it('binds Cheng Yuanzhou credit return into the Huizhou chapter spec', () => {
    const chapter = REGION_CHAPTERS.find((item) => item.id === 'chapter-huizhou-paper-merchant');
    const cheng = ALL_NPCS.find((item) => item.id === 'hz-cheng-yuanzhou');
    const visit = HOME_VISITS.find((item) => item.id === 'homevisit-cheng-stationery-credit-return');

    expect(chapter?.status).toBe('chapter-ready');
    expect(cheng?.functions).toEqual(expect.arrayContaining(['homeVisit', 'order']));
    expect(chapter?.homeVisitIds).toEqual(
      expect.arrayContaining(['homevisit-wang-collector-return', 'homevisit-cheng-stationery-credit-return']),
    );
    expect(chapter?.orderHooks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ source: 'homeVisit', id: 'homevisit-cheng-stationery-credit-return', readsItemState: true }),
        expect.objectContaining({ source: 'activity', id: 'hz-merchant-hall', readsItemState: true }),
      ]),
    );
    expect(visit?.requiredFlags).toEqual(
      expect.arrayContaining(['collector-reputation-stationery-renewed', 'huizhou-merchant-credit']),
    );
  });

  it('opens Cheng Yuanzhou credit referral only when the deposit can be paid', () => {
    const prereq = prepareStationeryCreditPrereqs(huizhouState());
    const displayedInk = stationeryItem('huiInk', 'display-cheng-hui-ink-credit-ledger', prereq, 0.78, 'displayed');
    const heldInk = stationeryItem('huiInk', 'held-cheng-hui-ink-credit-ledger', prereq, 0.74);
    const withGallery: GameState = {
      ...prereq,
      calendar: { ...prereq.calendar, day: prereq.calendar.day + 1, phase: 'morning' },
      itemInstances: [displayedInk, heldInk, ...prereq.itemInstances],
      resources: { ...prereq.resources, huiInk: (prereq.resources.huiInk ?? 0) + 1 },
    };

    const blocked = gameReducer(
      { ...withGallery, resources: { ...withGallery.resources, coin: 0 } },
      {
        type: 'USE_NPC_FUNCTION',
        npcId: 'hz-cheng-yuanzhou',
        functionKind: 'homeVisit',
        homeVisitChoiceId: 'cheng-hui-ink-credit-ledger',
      },
      content,
    );
    expect(blocked.homeVisitRecords.length).toBe(withGallery.homeVisitRecords.length);
    expect(blocked.activeOrders.some((order) => order.sourceHomeVisitChoiceId === 'cheng-hui-ink-credit-ledger')).toBe(false);
    expect(blocked.log[0]).toContain('钱袋不足');

    const opened = gameReducer(
      withGallery,
      {
        type: 'USE_NPC_FUNCTION',
        npcId: 'hz-cheng-yuanzhou',
        functionKind: 'homeVisit',
        homeVisitChoiceId: 'cheng-hui-ink-credit-ledger',
      },
      content,
    );
    const record = opened.homeVisitRecords[0];
    const creditOrder = activeOrder(opened, (order) => order.id === record.referralOrderId);

    expect(record).toMatchObject({
      npcId: 'hz-cheng-yuanzhou',
      title: '徽商文房信用回访',
      choiceId: 'cheng-hui-ink-credit-ledger',
      referralTitle: '徽商徽墨信用单',
      itemId: displayedInk.id,
    });
    expect(creditOrder).toMatchObject({
      npcId: 'hz-cheng-yuanzhou',
      orderKind: 'credit',
      sourceHomeVisitChoiceId: 'cheng-hui-ink-credit-ledger',
      resourceId: 'huiInk',
      minQuality: 0.64,
      depositCoin: 8,
      creditTrustScore: 62,
      routeIds: ['route-jiangnan-huizhou-paper', 'route-ganpo-huizhou-merchant'],
    });
    expect(opened.resources.coin).toBe(withGallery.resources.coin - 8);
    expect(opened.flags).toContain('deposit-order:hz-cheng-yuanzhou');
    expect(opened.flags).toContain('credit-order:hz-cheng-yuanzhou');

    const delivered = gameReducer(opened, { type: 'FULFILL_ORDER', orderId: creditOrder.id }, content);
    expect(delivered.activeOrders.find((order) => order.id === creditOrder.id)?.status).toBe('completed');
    expect(delivered.flags).toContain('credit-order-completed:hz-cheng-yuanzhou');
    expect(delivered.flags).toContain('homevisit-referral-completed:cheng-hui-ink-credit-ledger');
    expect(delivered.flags).toContain('deposit-refunded:hz-cheng-yuanzhou');
    expect(delivered.itemInstances.find((item) => item.id === displayedInk.id)?.status).toBe('displayed');
  });
});
