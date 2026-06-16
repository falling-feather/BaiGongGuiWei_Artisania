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

function jiangnanState(): GameState {
  const state = buildRegionChapterSmokeState(content, 'chapter-jiangnan-baigong-homecoming');
  if (!state) throw new Error('Missing jiangnan chapter smoke state');
  return {
    ...state,
    activeOrders: [],
    resources: {
      ...state.resources,
      coin: 9999,
      oilpaperUmbrella: 12,
      kesiSilk: 12,
      bambooSplit: 12,
      paperSheet: 12,
      cocoonSilk: 12,
      rawSilkThread: 12,
    },
    npcAffinity: {
      ...state.npcAffinity,
      'jn-lin-yuqiao': 36,
      'jn-shen-yunsuo': 36,
    },
  };
}

function item(
  id: string,
  state: GameState,
  resourceId: 'oilpaperUmbrella' | 'kesiSilk',
  quality = 0.76,
  status: ItemInstance['status'] = 'held',
): ItemInstance {
  const umbrella = resourceId === 'oilpaperUmbrella';
  return {
    id,
    resourceId,
    sourceCraftId: umbrella ? 'oilpaper-umbrella' : 'kesi',
    originRegionId: 'jiangnan',
    originSubregionId: umbrella ? 'jiangnan-linan' : 'jiangnan-taihu',
    createdTurn: state.turn,
    quality,
    descriptors: umbrella ? ['伞骨齐整', '纸面洁净'] : ['经纬有序', '花本清楚'],
    appraisal: umbrella ? '伞骨与伞面都稳，适合雨季复样。' : '经纬分明，适合太湖花本留档。',
    displayName: umbrella
      ? status === 'displayed'
        ? '临安雨巷油纸伞'
        : '临安雨巷复伞'
      : status === 'displayed'
        ? '太湖云锦织样'
        : '太湖云锦复样',
    status,
  };
}

function activeOrder(state: GameState, predicate: (order: ActiveOrder) => boolean): ActiveOrder {
  const order = state.activeOrders.find((candidate) => candidate.status === 'active' && predicate(candidate));
  if (!order) throw new Error('Missing expected active order');
  return order;
}

function beginReferral(
  state: GameState,
  npcId: 'jn-lin-yuqiao' | 'jn-shen-yunsuo',
  resourceId: 'oilpaperUmbrella' | 'kesiSilk',
  choiceId: 'umbrella-rain-ledger' | 'cloud-brocade-pattern-archive',
): { state: GameState; order: ActiveOrder; displayed: ItemInstance } {
  const displayed = item(`display-${choiceId}`, state, resourceId, 0.78, 'displayed');
  const replica = item(`held-${choiceId}-replica`, state, resourceId, 0.74);
  const withGallery: GameState = {
    ...state,
    currentSubregion: resourceId === 'oilpaperUmbrella' ? 'jiangnan-linan' : 'jiangnan-taihu',
    itemInstances: [displayed, replica, ...state.itemInstances],
    resources: { ...state.resources, [resourceId]: (state.resources[resourceId] ?? 0) + 2 },
  };
  const visited = gameReducer(
    withGallery,
    {
      type: 'USE_NPC_FUNCTION',
      npcId,
      functionKind: 'homeVisit',
      homeVisitChoiceId: choiceId,
    },
    content,
  );
  const record = visited.homeVisitRecords[0];
  const order = activeOrder(visited, (candidate) => candidate.id === record.referralOrderId);
  return { state: visited, order, displayed };
}

describe('Jiangnan Linan and Taihu longline', () => {
  it('binds the M1.25 Linan umbrella and Taihu brocade home visits into the chapter spec', () => {
    const chapter = REGION_CHAPTERS.find((entry) => entry.id === 'chapter-jiangnan-baigong-homecoming');
    const lin = ALL_NPCS.find((entry) => entry.id === 'jn-lin-yuqiao');
    const shen = ALL_NPCS.find((entry) => entry.id === 'jn-shen-yunsuo');
    const umbrellaReturn = HOME_VISITS.find((entry) => entry.id === 'homevisit-lin-rain-client-return');
    const brocadeReturn = HOME_VISITS.find((entry) => entry.id === 'homevisit-shen-brocade-collector-return');

    expect(lin?.functions).toContain('homeVisit');
    expect(shen?.functions).toContain('homeVisit');
    expect(chapter?.homeVisitIds).toEqual(
      expect.arrayContaining([
        'homevisit-lin-rain-umbrella-gallery',
        'homevisit-lin-rain-client-return',
        'homevisit-shen-cloud-brocade-gallery',
        'homevisit-shen-brocade-collector-return',
      ]),
    );
    expect(chapter?.orderHooks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ source: 'homeVisit', id: 'homevisit-lin-rain-client-return', readsItemState: true }),
        expect.objectContaining({ source: 'homeVisit', id: 'homevisit-shen-brocade-collector-return', readsItemState: true }),
      ]),
    );
    expect(umbrellaReturn?.requiredFlags).toEqual(
      expect.arrayContaining(['homevisit-referral-completed:umbrella-rain-ledger', 'lin-rain-umbrella-frame-tested']),
    );
    expect(brocadeReturn?.requiredFlags).toEqual(
      expect.arrayContaining(['homevisit-referral-completed:cloud-brocade-pattern-archive', 'shen-cloud-brocade-rhythm-tested']),
    );
  });

  it('keeps the Linan rain umbrella return blocked until the umbrella shop activity has been run', () => {
    const { state, order } = beginReferral(
      jiangnanState(),
      'jn-lin-yuqiao',
      'oilpaperUmbrella',
      'umbrella-rain-ledger',
    );
    const afterReferral = gameReducer(state, { type: 'FULFILL_ORDER', orderId: order.id }, content);
    const attemptedReturn = gameReducer(
      {
        ...afterReferral,
        calendar: { ...afterReferral.calendar, day: afterReferral.calendar.day + 1 },
      },
      {
        type: 'USE_NPC_FUNCTION',
        npcId: 'jn-lin-yuqiao',
        functionKind: 'homeVisit',
        homeVisitChoiceId: 'umbrella-rain-renewal-ledger',
      },
      content,
    );

    expect(afterReferral.flags).toContain('homevisit-referral-completed:umbrella-rain-ledger');
    expect(afterReferral.flags).not.toContain('lin-rain-umbrella-frame-tested');
    expect(attemptedReturn.flags).not.toContain('homevisit:homevisit-lin-rain-client-return');
    expect(attemptedReturn.flags).not.toContain('collector-reputation-umbrella-renewed');
    expect(attemptedReturn.activeOrders.some((candidate) => candidate.sourceHomeVisitChoiceId === 'umbrella-rain-renewal-ledger')).toBe(false);
    expect(attemptedReturn.log[0]).toContain('没有这条来访分支');
  });

  it('runs the Linan rain umbrella gallery into a client return renewal and ending addendum', () => {
    const { state, order, displayed } = beginReferral(
      jiangnanState(),
      'jn-lin-yuqiao',
      'oilpaperUmbrella',
      'umbrella-rain-ledger',
    );
    let afterReferral = gameReducer(state, { type: 'FULFILL_ORDER', orderId: order.id }, content);
    afterReferral = gameReducer(
      {
        ...afterReferral,
        currentSubregion: 'jiangnan-linan',
        calendar: { ...afterReferral.calendar, day: afterReferral.calendar.day + 1, phase: 'morning' },
      },
      { type: 'PERFORM_ACTIVITY', activityId: 'jn-paper-umbrella-shop', quality: 0.86 },
      content,
    );
    const returned = gameReducer(
      {
        ...afterReferral,
        calendar: { ...afterReferral.calendar, day: afterReferral.calendar.day + 1 },
      },
      {
        type: 'USE_NPC_FUNCTION',
        npcId: 'jn-lin-yuqiao',
        functionKind: 'homeVisit',
        homeVisitChoiceId: 'umbrella-rain-renewal-ledger',
      },
      content,
    );
    const returnRecord = returned.homeVisitRecords[0];
    const renewalOrder = activeOrder(returned, (candidate) => candidate.id === returnRecord.referralOrderId);
    const renewed = gameReducer(
      {
        ...returned,
        itemInstances: [item('held-umbrella-rain-renewal', returned, 'oilpaperUmbrella', 0.82), ...returned.itemInstances],
        resources: { ...returned.resources, oilpaperUmbrella: (returned.resources.oilpaperUmbrella ?? 0) + 1 },
      },
      { type: 'FULFILL_ORDER', orderId: renewalOrder.id },
      content,
    );
    const ended = gameReducer(
      {
        ...renewed,
        npcAffinity: { ...renewed.npcAffinity, 'jn-lin-yuqiao': 80 },
        turn: renewed.maxTurns,
        pendingEvent: null,
        pendingEscortCrisis: null,
        pendingSupplyCrisis: null,
        pendingActivityStallClosing: null,
      },
      { type: 'END_TURN' },
      content,
    );

    expect(afterReferral.flags).toContain('lin-rain-umbrella-frame-tested');
    expect(returnRecord).toMatchObject({
      title: '藏客回访 · 雨伞声誉',
      choiceId: 'umbrella-rain-renewal-ledger',
      referralTitle: '雨巷急伞续订单',
      itemId: displayed.id,
    });
    expect(returned.flags).toContain('homevisit-lin-rain-client-return-resolved');
    expect(returned.flags).toContain('collector-reputation-umbrella-renewed');
    expect(renewalOrder).toMatchObject({
      orderKind: 'referral',
      sourceHomeVisitChoiceId: 'umbrella-rain-renewal-ledger',
      resourceId: 'oilpaperUmbrella',
      minQuality: 0.66,
    });
    expect(renewed.activeOrders.find((candidate) => candidate.id === renewalOrder.id)?.status).toBe('completed');
    expect(ended.report?.relationshipOutcomes?.some((line) => line.includes('林雨桥') && line.includes('急伞续账'))).toBe(true);
  });

  it('runs the Taihu brocade gallery into a pattern renewal and ending addendum', () => {
    const { state, order, displayed } = beginReferral(
      jiangnanState(),
      'jn-shen-yunsuo',
      'kesiSilk',
      'cloud-brocade-pattern-archive',
    );
    let afterReferral = gameReducer(state, { type: 'FULFILL_ORDER', orderId: order.id }, content);
    afterReferral = gameReducer(
      {
        ...afterReferral,
        currentSubregion: 'jiangnan-taihu',
        calendar: { ...afterReferral.calendar, day: afterReferral.calendar.day + 1, phase: 'morning' },
      },
      { type: 'PERFORM_ACTIVITY', activityId: 'jn-cloud-brocade-office', quality: 0.88 },
      content,
    );
    const returned = gameReducer(
      {
        ...afterReferral,
        calendar: { ...afterReferral.calendar, day: afterReferral.calendar.day + 1 },
      },
      {
        type: 'USE_NPC_FUNCTION',
        npcId: 'jn-shen-yunsuo',
        functionKind: 'homeVisit',
        homeVisitChoiceId: 'brocade-pattern-renewal-ledger',
      },
      content,
    );
    const returnRecord = returned.homeVisitRecords[0];
    const renewalOrder = activeOrder(returned, (candidate) => candidate.id === returnRecord.referralOrderId);
    const renewed = gameReducer(
      {
        ...returned,
        itemInstances: [item('held-brocade-pattern-renewal', returned, 'kesiSilk', 0.84), ...returned.itemInstances],
        resources: { ...returned.resources, kesiSilk: (returned.resources.kesiSilk ?? 0) + 1 },
      },
      { type: 'FULFILL_ORDER', orderId: renewalOrder.id },
      content,
    );
    const ended = gameReducer(
      {
        ...renewed,
        npcAffinity: { ...renewed.npcAffinity, 'jn-shen-yunsuo': 80 },
        turn: renewed.maxTurns,
        pendingEvent: null,
        pendingEscortCrisis: null,
        pendingSupplyCrisis: null,
        pendingActivityStallClosing: null,
      },
      { type: 'END_TURN' },
      content,
    );

    expect(afterReferral.flags).toContain('shen-cloud-brocade-rhythm-tested');
    expect(returnRecord).toMatchObject({
      title: '藏客回访 · 织样声誉',
      choiceId: 'brocade-pattern-renewal-ledger',
      referralTitle: '太湖花本续订单',
      itemId: displayed.id,
    });
    expect(returned.flags).toContain('homevisit-shen-brocade-collector-return-resolved');
    expect(returned.flags).toContain('collector-reputation-brocade-renewed');
    expect(renewalOrder).toMatchObject({
      orderKind: 'referral',
      sourceHomeVisitChoiceId: 'brocade-pattern-renewal-ledger',
      resourceId: 'kesiSilk',
      minQuality: 0.68,
    });
    expect(renewed.activeOrders.find((candidate) => candidate.id === renewalOrder.id)?.status).toBe('completed');
    expect(ended.report?.relationshipOutcomes?.some((line) => line.includes('沈云梭') && line.includes('花本续簿'))).toBe(true);
  });
});
