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

function xueyuState(): GameState {
  const state = buildRegionChapterSmokeState(content, 'chapter-xueyu-thangka-snowpass');
  if (!state) throw new Error('Missing xueyu chapter smoke state');
  return {
    ...state,
    activeOrders: [],
    resources: { ...state.resources, coin: 9999, thangka: 12, pigmentRefined: 12, tibetanSilver: 12, silverStock: 12, copperStock: 12 },
    npcAffinity: {
      ...state.npcAffinity,
      'xy-losang': 36,
      'xy-yak-captain': 36,
      'xy-shicai-tong': 36,
      'xy-baiyinshu': 36,
    },
  };
}

function thangkaItem(
  id: string,
  state: GameState,
  quality = 0.76,
  status: ItemInstance['status'] = 'held',
): ItemInstance {
  return {
    id,
    resourceId: 'thangka',
    sourceCraftId: 'thangka',
    originRegionId: 'xueyu',
    originSubregionId: 'xueyu-thangka-court',
    createdTurn: state.turn,
    quality,
    descriptors: ['矿彩有度', '敬意清正'],
    appraisal: '矿彩层次清楚，度量分寸稳当。',
    displayName: status === 'displayed' ? '雪域净室唐卡' : '雪域净室复样',
    status,
  };
}

function pigmentItem(
  id: string,
  state: GameState,
  quality = 0.74,
  status: ItemInstance['status'] = 'held',
): ItemInstance {
  return {
    id,
    resourceId: 'pigmentRefined',
    sourceCraftId: 'thangka',
    originRegionId: 'xueyu',
    originSubregionId: 'xueyu-pigment-valley',
    createdTurn: state.turn,
    quality,
    descriptors: ['矿彩分层', '雪路设色有账'],
    appraisal: '一份能对上采石、研磨和唐卡设色层次的熟矿彩。',
    displayName: status === 'displayed' ? '雪域矿彩料账陈列' : '雪域矿彩复样',
    status,
  };
}

function silverItem(
  id: string,
  state: GameState,
  quality = 0.74,
  status: ItemInstance['status'] = 'held',
): ItemInstance {
  return {
    id,
    resourceId: 'tibetanSilver',
    sourceCraftId: 'tibetan-silver',
    originRegionId: 'xueyu',
    originSubregionId: 'xueyu-silver-tent',
    createdTurn: state.turn,
    quality,
    descriptors: ['银片听锤', '雪口镶纹稳'],
    appraisal: '一件银片厚实、镶口经得起高原风雪的藏银器。',
    displayName: status === 'displayed' ? '雪口银器料账陈列' : '雪口藏银复样',
    status,
  };
}

function activeOrder(state: GameState, predicate: (order: ActiveOrder) => boolean): ActiveOrder {
  const order = state.activeOrders.find((candidate) => candidate.status === 'active' && predicate(candidate));
  if (!order) throw new Error('Missing expected active order');
  return order;
}

function withHeldThangka(state: GameState, id: string, quality = 0.76): GameState {
  return {
    ...state,
    resources: { ...state.resources, thangka: (state.resources.thangka ?? 0) + 1 },
    itemInstances: [thangkaItem(id, state, quality), ...state.itemInstances],
  };
}

function beginReverentHallReferral(state: GameState): { state: GameState; order: ActiveOrder; displayed: ItemInstance } {
  const displayed = thangkaItem('display-xueyu-ritual-thangka', state, 0.78, 'displayed');
  const replica = thangkaItem('held-xueyu-ritual-thangka-replica', state, 0.74);
  const withGallery = {
    ...state,
    currentSubregion: 'xueyu-thangka-court',
    itemInstances: [displayed, replica, ...state.itemInstances],
    resources: { ...state.resources, thangka: (state.resources.thangka ?? 0) + 2 },
  };
  const visited = gameReducer(
    withGallery,
    {
      type: 'USE_NPC_FUNCTION',
      npcId: 'xy-losang',
      functionKind: 'homeVisit',
      homeVisitChoiceId: 'reverent-loan-hall',
    },
    content,
  );
  const record = visited.homeVisitRecords[0];
  const order = activeOrder(visited, (candidate) => candidate.id === record.referralOrderId);

  expect(record).toMatchObject({
    title: '矿彩净室',
    choiceId: 'reverent-loan-hall',
    referralTitle: '净室供展复单',
    itemId: displayed.id,
  });
  expect(order).toMatchObject({
    npcId: 'xy-losang',
    orderKind: 'referral',
    sourceHomeVisitChoiceId: 'reverent-loan-hall',
    resourceId: 'thangka',
    minQuality: 0.64,
  });
  return { state: visited, order, displayed };
}

describe('Xueyu thangka snow-pass longline', () => {
  it('requires both the reverent hall referral and snow-pass supply order before patron return', () => {
    const chapter = REGION_CHAPTERS.find((item) => item.id === 'chapter-xueyu-thangka-snowpass');
    const returnVisit = HOME_VISITS.find((item) => item.id === 'homevisit-losang-patron-return');
    const shicai = ALL_NPCS.find((item) => item.id === 'xy-shicai-tong');
    const baiyinshu = ALL_NPCS.find((item) => item.id === 'xy-baiyinshu');

    expect(chapter?.status).toBe('chapter-ready');
    expect(shicai?.functions).toEqual(expect.arrayContaining(['homeVisit', 'order']));
    expect(baiyinshu?.functions).toEqual(expect.arrayContaining(['homeVisit', 'order']));
    expect(chapter?.orderHooks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ source: 'activity', id: 'xy-snow-pass', readsItemState: true }),
        expect.objectContaining({ source: 'homeVisit', id: 'homevisit-losang-patron-return', readsItemState: true }),
        expect.objectContaining({ source: 'homeVisit', id: 'homevisit-shicai-pigment-ledger', readsItemState: true }),
        expect.objectContaining({ source: 'homeVisit', id: 'homevisit-baiyinshu-silver-ledger', readsItemState: true }),
        expect.objectContaining({ source: 'collab', id: 'collab-losang-mineral-layer', readsItemState: true }),
        expect.objectContaining({ source: 'escort', id: 'escort-snow-pass-windbreak' }),
      ]),
    );
    expect(chapter?.homeVisitIds).toEqual(
      expect.arrayContaining([
        'homevisit-losang-thangka-hall',
        'homevisit-losang-patron-return',
        'homevisit-shicai-pigment-ledger',
        'homevisit-baiyinshu-silver-ledger',
      ]),
    );
    expect(returnVisit?.requiredFlags).toEqual(
      expect.arrayContaining([
        'homevisit-referral-completed:reverent-loan-hall',
        'activity-order-completed:xy-snow-pass',
      ]),
    );
  });

  it('turns pigment valley material feedback into a refined pigment route order', () => {
    const base = xueyuState();
    const displayed = pigmentItem('display-shicai-pigment-ledger', base, 0.76, 'displayed');
    const replica = pigmentItem('held-shicai-pigment-ledger', base, 0.72);
    let state: GameState = {
      ...base,
      currentSubregion: 'xueyu-pigment-valley',
      itemInstances: [displayed, replica, ...base.itemInstances],
    };

    const unavailable = gameReducer(
      state,
      {
        type: 'USE_NPC_FUNCTION',
        npcId: 'xy-shicai-tong',
        functionKind: 'homeVisit',
        homeVisitChoiceId: 'shicai-pigment-ledger-order',
      },
      content,
    );
    expect(unavailable.homeVisitRecords.length).toBe(0);

    state = gameReducer(state, { type: 'PERFORM_ACTIVITY', activityId: 'xy-pigment-valley', quality: 0.84 }, content);
    expect(state.flags).toContain('xueyu-pigment-ledger-open');

    const returned = gameReducer(
      {
        ...state,
        calendar: { ...state.calendar, day: state.calendar.day + 1, phase: 'morning' },
      },
      {
        type: 'USE_NPC_FUNCTION',
        npcId: 'xy-shicai-tong',
        functionKind: 'homeVisit',
        homeVisitChoiceId: 'shicai-pigment-ledger-order',
      },
      content,
    );
    const record = returned.homeVisitRecords[0];
    const referral = activeOrder(returned, (order) => order.id === record.referralOrderId);

    expect(record).toMatchObject({
      npcId: 'xy-shicai-tong',
      title: '矿彩料账',
      choiceId: 'shicai-pigment-ledger-order',
      referralTitle: '雪域矿彩复样单',
      itemId: displayed.id,
    });
    expect(referral).toMatchObject({
      npcId: 'xy-shicai-tong',
      orderKind: 'route',
      sourceHomeVisitChoiceId: 'shicai-pigment-ledger-order',
      resourceId: 'pigmentRefined',
      minQuality: 0.62,
      routeIds: ['route-bashu-xueyu-snow-pass'],
    });

    const delivered = gameReducer(returned, { type: 'FULFILL_ORDER', orderId: referral.id }, content);
    expect(delivered.activeOrders.find((candidate) => candidate.id === referral.id)?.status).toBe('completed');
    expect(delivered.flags).toContain('homevisit-referral-completed:shicai-pigment-ledger-order');
    expect(delivered.flags).toContain('route-order-completed:xy-shicai-tong');
  });

  it('connects snow-pass knowledge and silver tent output into a Tibetan silver route order', () => {
    const base = xueyuState();
    const displayed = silverItem('display-baiyinshu-silver-ledger', base, 0.78, 'displayed');
    const replica = silverItem('held-baiyinshu-silver-ledger', base, 0.74);
    let state: GameState = {
      ...base,
      currentSubregion: 'xueyu-snow-pass',
      itemInstances: [displayed, replica, ...base.itemInstances],
    };

    state = gameReducer(state, { type: 'PERFORM_ACTIVITY', activityId: 'xy-snow-pass', quality: 0.84 }, content);
    expect(state.flags).toContain('snow-pass-known');
    state = gameReducer(
      {
        ...state,
        currentSubregion: 'xueyu-silver-tent',
        calendar: { ...state.calendar, day: state.calendar.day + 1, phase: 'morning' },
      },
      { type: 'PERFORM_ACTIVITY', activityId: 'xy-silver-tent', quality: 0.86 },
      content,
    );
    expect(state.flags).toContain('xueyu-silver-ledger-open');

    const returned = gameReducer(
      {
        ...state,
        calendar: { ...state.calendar, day: state.calendar.day + 1, phase: 'morning' },
      },
      {
        type: 'USE_NPC_FUNCTION',
        npcId: 'xy-baiyinshu',
        functionKind: 'homeVisit',
        homeVisitChoiceId: 'baiyinshu-silver-ledger-order',
      },
      content,
    );
    const record = returned.homeVisitRecords[0];
    const referral = activeOrder(returned, (order) => order.id === record.referralOrderId);

    expect(record).toMatchObject({
      npcId: 'xy-baiyinshu',
      title: '雪口银器料账',
      choiceId: 'baiyinshu-silver-ledger-order',
      referralTitle: '雪口藏银复样单',
      itemId: displayed.id,
    });
    expect(referral).toMatchObject({
      npcId: 'xy-baiyinshu',
      orderKind: 'route',
      sourceHomeVisitChoiceId: 'baiyinshu-silver-ledger-order',
      resourceId: 'tibetanSilver',
      minQuality: 0.64,
      routeIds: ['route-xueyu-xiyu-caravan'],
    });

    const delivered = gameReducer(returned, { type: 'FULFILL_ORDER', orderId: referral.id }, content);
    expect(delivered.activeOrders.find((candidate) => candidate.id === referral.id)?.status).toBe('completed');
    expect(delivered.flags).toContain('homevisit-referral-completed:baiyinshu-silver-ledger-order');
    expect(delivered.flags).toContain('route-order-completed:xy-baiyinshu');
  });

  it('blocks the patron return after the reverent hall referral until the snow-pass order is delivered', () => {
    const { state, order } = beginReverentHallReferral(xueyuState());
    const deliveredReferral = gameReducer(state, { type: 'FULFILL_ORDER', orderId: order.id }, content);
    const attemptedReturn = gameReducer(
      {
        ...deliveredReferral,
        calendar: { ...deliveredReferral.calendar, day: deliveredReferral.calendar.day + 1 },
      },
      {
        type: 'USE_NPC_FUNCTION',
        npcId: 'xy-losang',
        functionKind: 'homeVisit',
        homeVisitChoiceId: 'ritual-gallery-ledger',
      },
      content,
    );

    expect(deliveredReferral.flags).toContain('homevisit-referral-completed:reverent-loan-hall');
    expect(deliveredReferral.flags).not.toContain('activity-order-completed:xy-snow-pass');
    expect(attemptedReturn.flags).not.toContain('homevisit:homevisit-losang-patron-return');
    expect(attemptedReturn.flags).not.toContain('collector-reputation-thangka-renewed');
    expect(attemptedReturn.activeOrders.some((candidate) => candidate.sourceHomeVisitChoiceId === 'ritual-gallery-ledger')).toBe(false);
    expect(attemptedReturn.log[0]).toContain('没有这条来访分支');
  });

  it('runs the snow-pass supply and reverent hall chain into a renewal order delivery', () => {
    const { state, order, displayed } = beginReverentHallReferral(xueyuState());
    const afterReferral = gameReducer(state, { type: 'FULFILL_ORDER', orderId: order.id }, content);
    const snowPassReady = withHeldThangka(
      {
        ...afterReferral,
        currentSubregion: 'xueyu-snow-pass',
        calendar: { ...afterReferral.calendar, day: afterReferral.calendar.day + 1, phase: 'morning' },
      },
      'held-xueyu-snow-pass-supply-thangka',
      0.8,
    );
    const snowPassOpened = gameReducer(
      snowPassReady,
      { type: 'PERFORM_ACTIVITY', activityId: 'xy-snow-pass', quality: 0.86 },
      content,
    );
    const snowPassOrder = activeOrder(
      snowPassOpened,
      (candidate) => candidate.sourceActivityId === 'xy-snow-pass' && candidate.resourceId === 'thangka',
    );
    const afterSnowPass = gameReducer(snowPassOpened, { type: 'FULFILL_ORDER', orderId: snowPassOrder.id }, content);
    const beforeReturnRep = afterSnowPass.regionReputation.xueyu ?? 0;
    const returned = gameReducer(
      {
        ...afterSnowPass,
        calendar: { ...afterSnowPass.calendar, day: afterSnowPass.calendar.day + 1 },
      },
      {
        type: 'USE_NPC_FUNCTION',
        npcId: 'xy-losang',
        functionKind: 'homeVisit',
        homeVisitChoiceId: 'ritual-gallery-ledger',
      },
      content,
    );
    const returnRecord = returned.homeVisitRecords[0];
    const renewalOrder = activeOrder(returned, (candidate) => candidate.id === returnRecord.referralOrderId);
    const renewalReady = withHeldThangka(returned, 'held-xueyu-ritual-renewal-thangka', 0.82);
    const renewed = gameReducer(renewalReady, { type: 'FULFILL_ORDER', orderId: renewalOrder.id }, content);

    expect(afterSnowPass.flags).toContain('activity-order-completed:xy-snow-pass');
    expect(afterSnowPass.flags).toContain('route-order-completed:xy-snow-pass');
    expect(returnRecord).toMatchObject({
      title: '藏客回访 · 净室声誉',
      choiceId: 'ritual-gallery-ledger',
      referralTitle: '净室供展续单',
      itemId: displayed.id,
    });
    expect(returned.flags).toContain('homevisit:homevisit-losang-patron-return');
    expect(returned.flags).toContain('homevisit-losang-patron-return-resolved');
    expect(returned.flags).toContain('collector-reputation-thangka-renewed');
    expect(returned.regionReputation.xueyu).toBeGreaterThan(beforeReturnRep);
    expect(renewalOrder).toMatchObject({
      title: '净室供展续单',
      orderKind: 'referral',
      sourceHomeVisitChoiceId: 'ritual-gallery-ledger',
      resourceId: 'thangka',
      minQuality: 0.66,
    });
    expect(renewed.activeOrders.find((candidate) => candidate.id === renewalOrder.id)?.status).toBe('completed');
    expect(renewed.flags).toContain('homevisit-referral-completed:ritual-gallery-ledger');
    expect(renewed.itemInstances.find((item) => item.id === displayed.id)?.status).toBe('displayed');
  });
});
