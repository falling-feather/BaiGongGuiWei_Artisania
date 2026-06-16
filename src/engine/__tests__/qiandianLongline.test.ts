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

function qiandianState(): GameState {
  const state = buildRegionChapterSmokeState(content, 'chapter-qiandian-silver-tea-road');
  if (!state) throw new Error('Missing qiandian chapter smoke state');
  return {
    ...state,
    npcAffinity: {
      ...state.npcAffinity,
      'qd-yinniang-alan': 36,
      'qd-mu-luozi': 36,
      'qd-danqing-sao': 36,
      'qd-tongshan-ke': 36,
    },
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
    resourceId: 'silverOrnament',
    sourceCraftId: 'miao-silver',
    originRegionId: 'qiandian',
    originSubregionId: 'qiandian-miao-village',
    createdTurn: state.turn,
    quality,
    descriptors: ['礼纹清楚', '坠势稳定'],
    appraisal: '一件适合礼俗复样的苗银饰。',
    displayName: id.includes('display') ? '黔滇礼银陈列样' : '黔滇礼银复样',
    status,
  };
}

function copperSilverItem(
  id: string,
  state: GameState,
  quality = 0.74,
  status: ItemInstance['status'] = 'held',
): ItemInstance {
  return {
    id,
    resourceId: 'wutongSilver',
    sourceCraftId: 'wutong-silver',
    originRegionId: 'qiandian',
    originSubregionId: 'qiandian-dongchuan-copper',
    createdTurn: state.turn,
    quality,
    descriptors: ['东川铜胎稳', '银线入账清'],
    appraisal: '一件能对上东川矿口、铜料亏耗和银线配比的乌铜走银样。',
    displayName: id.includes('display') ? '东川铜银料账陈列样' : '东川铜银复样',
    status,
  };
}

function batikItem(
  id: string,
  state: GameState,
  quality = 0.74,
  status: ItemInstance['status'] = 'held',
): ItemInstance {
  return {
    id,
    resourceId: 'batikCloth',
    sourceCraftId: 'batik',
    originRegionId: 'qiandian',
    originSubregionId: 'qiandian-miao-village',
    createdTurn: state.turn,
    quality,
    descriptors: ['蜡线稳', '蓝白染纹清', '茶马路引可验'],
    appraisal: '一匹能让蜡线、蓝白层次和港样路引互相作证的蜡染布。',
    displayName: id.includes('display') ? '黔滇蜡染港样陈列' : '黔滇蜡染港样复单',
    status,
  };
}

function activeOrder(state: GameState, predicate: (order: ActiveOrder) => boolean): ActiveOrder {
  const order = state.activeOrders.find((candidate) => candidate.status === 'active' && predicate(candidate));
  if (!order) throw new Error('Missing expected active order');
  return order;
}

function reportFor(state: GameState): GameState {
  return gameReducer(
    {
      ...state,
      turn: state.maxTurns,
      pendingEvent: null,
      pendingEscortCrisis: null,
      pendingSupplyCrisis: null,
      pendingActivityStallClosing: null,
    },
    { type: 'END_TURN' },
    content,
  );
}

describe('Qiandian silver ritual longline', () => {
  it('binds the M1.5 stall, home visit, and collab content into the chapter spec', () => {
    const chapter = REGION_CHAPTERS.find((item) => item.id === 'chapter-qiandian-silver-tea-road');
    const activity = REGION_ACTIVITIES.find((item) => item.id === 'qd-tea-horse-road');
    const alan = ALL_NPCS.find((item) => item.id === 'qd-yinniang-alan');
    const muluozi = ALL_NPCS.find((item) => item.id === 'qd-mu-luozi');
    const tongshan = ALL_NPCS.find((item) => item.id === 'qd-tongshan-ke');
    const danqing = ALL_NPCS.find((item) => item.id === 'qd-danqing-sao');
    const batikActivity = REGION_ACTIVITIES.find((item) => item.id === 'qd-batik-yard');

    expect(chapter?.status).toBe('chapter-ready');
    expect(alan?.functions).toEqual(expect.arrayContaining(['homeVisit', 'collab', 'order']));
    expect(muluozi?.functions).toContain('order');
    expect(tongshan?.functions).toEqual(expect.arrayContaining(['homeVisit', 'appraisal', 'order']));
    expect(danqing?.functions).toEqual(expect.arrayContaining(['homeVisit', 'appraisal', 'order']));
    expect(batikActivity?.reward.flags).toContain('qiandian-batik-harbor-ledger-open');
    expect(activity?.reward.stall?.stages?.map((stage) => stage.id)).toEqual([
      'open-ritual-sample',
      'barter-silver-dye',
      'ledger-route-close',
    ]);
    expect(activity?.reward.stall?.closingChoices?.map((choice) => choice.id)).toEqual([
      'archive-silver-ritual-ledger',
      'send-tea-road-provenance',
      'reserve-copper-silver-sample',
    ]);
    expect(chapter?.homeVisitIds).toEqual([
      'homevisit-alan-silver-ritual-case',
      'homevisit-alan-tea-road-client-return',
      'homevisit-tongshan-copper-silver-ledger',
      'homevisit-danqing-batik-harbor-return',
    ]);
    expect(chapter?.collabRecipeIds).toEqual(['collab-alan-silver-ritual-fit']);
    expect(chapter?.orderHooks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ source: 'homeVisit', id: 'homevisit-alan-silver-ritual-case', readsItemState: true }),
        expect.objectContaining({ source: 'homeVisit', id: 'homevisit-alan-tea-road-client-return', readsItemState: true }),
        expect.objectContaining({ source: 'homeVisit', id: 'homevisit-tongshan-copper-silver-ledger', readsItemState: true }),
        expect.objectContaining({ source: 'homeVisit', id: 'homevisit-danqing-batik-harbor-return', readsItemState: true }),
        expect.objectContaining({ source: 'collab', id: 'collab-alan-silver-ritual-fit', readsItemState: true }),
      ]),
    );
  });

  it('connects Danqing batik ledgers to the tea-horse harbor closing order', () => {
    const base = qiandianState();
    const displayed = batikItem('display-danqing-batik-harbor-ledger', base, 0.76, 'displayed');
    const replica = batikItem('held-danqing-batik-harbor-replica', base, 0.74);
    let state: GameState = {
      ...base,
      currentSubregion: 'qiandian-miao-village',
      resources: {
        ...base.resources,
        batikCloth: 12,
        silverOrnament: 12,
        wutongSilver: 12,
        copperStock: 12,
      },
      itemInstances: [displayed, replica, ...base.itemInstances],
    };

    const unavailable = gameReducer(
      state,
      {
        type: 'USE_NPC_FUNCTION',
        npcId: 'qd-danqing-sao',
        functionKind: 'homeVisit',
        homeVisitChoiceId: 'danqing-batik-harbor-ledger',
      },
      content,
    );
    expect(unavailable.homeVisitRecords.length).toBe(0);
    expect(unavailable.flags).not.toContain('homevisit-danqing-batik-harbor-return-resolved');

    state = gameReducer(state, { type: 'PERFORM_ACTIVITY', activityId: 'qd-batik-yard', quality: 0.84 }, content);
    expect(state.flags).toContain('qiandian-batik-harbor-ledger-open');

    for (let run = 0; run < 3; run += 1) {
      state = gameReducer(
        {
          ...state,
          currentSubregion: 'qiandian-tea-road',
          calendar: { ...state.calendar, day: state.calendar.day + (run === 0 ? 0 : 1), phase: 'morning' },
        },
        { type: 'PERFORM_ACTIVITY', activityId: 'qd-tea-horse-road', quality: 0.9, stallStrategyId: 'harbor-return-sample' },
        content,
      );
    }
    state = gameReducer(state, { type: 'RESOLVE_ACTIVITY_STALL_CLOSING', choiceId: 'reserve-copper-silver-sample' }, content);
    expect(state.flags).toContain('qiandian-closing-copper-silver-harbor');
    expect(state.flags).toContain('route-known:route-qiandian-lingnan-harbor');

    const returned = gameReducer(
      {
        ...state,
        calendar: { ...state.calendar, day: state.calendar.day + 1, phase: 'morning' },
      },
      {
        type: 'USE_NPC_FUNCTION',
        npcId: 'qd-danqing-sao',
        functionKind: 'homeVisit',
        homeVisitChoiceId: 'danqing-batik-harbor-ledger',
      },
      content,
    );
    const record = returned.homeVisitRecords[0];
    const referral = activeOrder(returned, (order) => order.id === record.referralOrderId);

    expect(record).toMatchObject({
      npcId: 'qd-danqing-sao',
      title: '蜡染港样回访',
      choiceId: 'danqing-batik-harbor-ledger',
      referralTitle: '蜡染港样续订单',
      itemId: displayed.id,
    });
    expect(referral).toMatchObject({
      npcId: 'qd-danqing-sao',
      orderKind: 'route',
      sourceHomeVisitChoiceId: 'danqing-batik-harbor-ledger',
      resourceId: 'batikCloth',
      minQuality: 0.64,
      routeIds: ['route-qiandian-lingnan-harbor'],
    });
    expect(returned.flags).toContain('homevisit-danqing-batik-harbor-return-resolved');
    expect(returned.flags).toContain('homevisit-referral:danqing-batik-harbor-ledger');

    const delivered = gameReducer(returned, { type: 'FULFILL_ORDER', orderId: referral.id }, content);
    expect(delivered.activeOrders.find((candidate) => candidate.id === referral.id)?.status).toBe('completed');
    expect(delivered.flags).toContain('homevisit-referral-completed:danqing-batik-harbor-ledger');
    expect(delivered.flags).toContain('route-order-completed:qd-danqing-sao');
    expect(delivered.itemInstances.find((item) => item.id === displayed.id)?.status).toBe('displayed');

    const ended = reportFor({
      ...delivered,
      npcAffinity: { ...delivered.npcAffinity, 'qd-danqing-sao': 80 },
    });
    expect(ended.report?.relationshipOutcomes?.some((line) => line.includes('丹青嫂') && line.includes('蜡染港样续单'))).toBe(true);
  });

  it('turns the Dongchuan mine activity into a copper-silver material feedback visit', () => {
    const base = qiandianState();
    const displayed = copperSilverItem('display-tongshan-copper-silver-ledger', base, 0.76, 'displayed');
    const replica = copperSilverItem('held-tongshan-copper-silver-replica', base, 0.72);
    let state: GameState = {
      ...base,
      currentSubregion: 'qiandian-dongchuan-copper',
      resources: {
        ...base.resources,
        wutongSilver: (base.resources.wutongSilver ?? 0) + 3,
        copperStock: (base.resources.copperStock ?? 0) + 2,
        copperOre: (base.resources.copperOre ?? 0) + 1,
      },
      itemInstances: [displayed, replica, ...base.itemInstances],
    };

    const unavailable = gameReducer(
      state,
      {
        type: 'USE_NPC_FUNCTION',
        npcId: 'qd-tongshan-ke',
        functionKind: 'homeVisit',
        homeVisitChoiceId: 'tongshan-copper-silver-ledger-order',
      },
      content,
    );
    expect(unavailable.homeVisitRecords.length).toBe(0);
    expect(unavailable.flags).not.toContain('homevisit-tongshan-copper-silver-ledger-resolved');

    state = gameReducer(state, { type: 'PERFORM_ACTIVITY', activityId: 'qd-dongchuan-mine', quality: 0.84 }, content);
    expect(state.flags).toContain('qd-dongchuan-copper-ledger-open');
    expect(state.completedActivities).toContain('qd-dongchuan-mine');
    expect(state.npcStates['qd-tongshan-ke']?.knownTopics).toContain('activity:qd-dongchuan-mine');

    const returned = gameReducer(
      state,
      {
        type: 'USE_NPC_FUNCTION',
        npcId: 'qd-tongshan-ke',
        functionKind: 'homeVisit',
        homeVisitChoiceId: 'tongshan-copper-silver-ledger-order',
      },
      content,
    );
    const record = returned.homeVisitRecords[0];
    const referral = activeOrder(returned, (order) => order.id === record.referralOrderId);

    expect(record).toMatchObject({
      npcId: 'qd-tongshan-ke',
      title: '东川铜银料账',
      choiceId: 'tongshan-copper-silver-ledger-order',
      choiceKind: 'collect',
      referralTitle: '东川铜银复样单',
      itemId: displayed.id,
    });
    expect(referral).toMatchObject({
      npcId: 'qd-tongshan-ke',
      orderKind: 'referral',
      sourceHomeVisitRecordId: record.id,
      sourceHomeVisitChoiceId: 'tongshan-copper-silver-ledger-order',
      resourceId: 'wutongSilver',
      quantity: 1,
      minQuality: 0.64,
    });
    expect(returned.flags).toContain('homevisit:homevisit-tongshan-copper-silver-ledger');
    expect(returned.flags).toContain('qiandian-copper-silver-material-read');
    expect(returned.flags).toContain('homevisit-tongshan-copper-silver-ledger-resolved');
    expect(returned.flags).toContain('qiandian-copper-silver-ledger-ready');
    expect(returned.flags).toContain('homevisit-referral:tongshan-copper-silver-ledger-order');

    const delivered = gameReducer(returned, { type: 'FULFILL_ORDER', orderId: referral.id }, content);
    expect(delivered.activeOrders.find((candidate) => candidate.id === referral.id)?.status).toBe('completed');
    expect(delivered.flags).toContain(`homevisit-order-completed:${record.id}`);
    expect(delivered.flags).toContain('homevisit-referral-completed:tongshan-copper-silver-ledger-order');
    expect(delivered.itemInstances.find((item) => item.id === displayed.id)?.status).toBe('displayed');
    expect(delivered.itemInstances.some((item) => item.id === replica.id)).toBe(false);

    const ended = reportFor({
      ...delivered,
      npcAffinity: { ...delivered.npcAffinity, 'qd-tongshan-ke': 80 },
    });
    expect(ended.report?.relationshipOutcomes?.some((line) => line.includes('铜山客') && line.includes('东川铜银复样'))).toBe(true);
  });

  it('runs the tea-horse silver stall through closing and completes its route follow-up order', () => {
    const base = qiandianState();
    let state: GameState = {
      ...base,
      resources: {
        ...base.resources,
        silverOrnament: 12,
        batikCloth: 12,
        teaLeaf: 12,
        tea: 12,
        wutongSilver: 12,
        copperStock: 12,
      },
    };

    state = gameReducer(
      state,
      { type: 'PERFORM_ACTIVITY', activityId: 'qd-tea-horse-road', quality: 0.82, stallStrategyId: 'route-provenance-ledger' },
      content,
    );
    state = {
      ...state,
      calendar: { ...state.calendar, day: state.calendar.day + 1, phase: 'morning' },
    };
    state = gameReducer(
      state,
      { type: 'PERFORM_ACTIVITY', activityId: 'qd-tea-horse-road', quality: 0.86, stallStrategyId: 'route-provenance-ledger' },
      content,
    );
    state = {
      ...state,
      calendar: { ...state.calendar, day: state.calendar.day + 1, phase: 'morning' },
    };
    state = gameReducer(
      state,
      { type: 'PERFORM_ACTIVITY', activityId: 'qd-tea-horse-road', quality: 0.9, stallStrategyId: 'route-provenance-ledger' },
      content,
    );

    expect(state.nightMarketStallRecords.map((record) => record.stageId)).toEqual([
      'ledger-route-close',
      'barter-silver-dye',
      'open-ritual-sample',
    ]);
    expect(state.flags).toContain('stall-chain-completed:qd-tea-horse-road');
    expect(state.pendingActivityStallClosing).toMatchObject({
      activityId: 'qd-tea-horse-road',
      stageId: 'ledger-route-close',
    });

    const beforeAffinity = state.npcAffinity['qd-mu-luozi'] ?? 0;
    state = gameReducer(state, { type: 'RESOLVE_ACTIVITY_STALL_CLOSING', choiceId: 'send-tea-road-provenance' }, content);
    const followUp = activeOrder(
      state,
      (order) => order.id.startsWith('stall-closing-order-qd-tea-horse-road-send-tea-road-provenance'),
    );

    expect(state.pendingActivityStallClosing).toBeNull();
    expect(state.flags).toContain('stall-closing-resolved:qd-tea-horse-road');
    expect(state.flags).toContain('stall-closing-choice:qd-tea-horse-road:send-tea-road-provenance');
    expect(state.flags).toContain('stall-closing-followup-order:qd-tea-horse-road:send-tea-road-provenance');
    expect(state.flags).toContain('route-known:route-bashu-qiandian-tea-horse');
    expect(state.flags).toContain('route-known:route-qiandian-lingnan-harbor');
    expect(state.npcAffinity['qd-mu-luozi']).toBeGreaterThan(beforeAffinity);
    expect(state.npcStates['qd-mu-luozi']?.knownTopics).toContain('tea-road-provenance-order');
    expect(followUp).toMatchObject({
      npcId: 'qd-mu-luozi',
      resourceId: 'silverOrnament',
      quantity: 1,
      minQuality: 0.6,
      orderKind: 'route',
      sourceActivityId: 'qd-tea-horse-road',
    });

    const ready = {
      ...state,
      resources: { ...state.resources, silverOrnament: (state.resources.silverOrnament ?? 0) + 1 },
      itemInstances: [silverItem('held-stall-followup-silver', state, 0.78), ...state.itemInstances],
    };
    const delivered = gameReducer(ready, { type: 'FULFILL_ORDER', orderId: followUp.id }, content);

    expect(delivered.activeOrders.find((order) => order.id === followUp.id)?.status).toBe('completed');
    expect(delivered.flags).toContain(`order-completed:${followUp.id}`);
    expect(delivered.flags).toContain('route-order-completed:qd-tea-horse-road');
  });

  it('creates a silver ritual referral order and unlocks the tea-road client return visit after delivery', () => {
    const base = qiandianState();
    const displayed = silverItem('display-silver-ritual-case', base, 0.74, 'displayed');
    const replica = silverItem('held-silver-ritual-replica', base, 0.72);
    let state: GameState = {
      ...base,
      currentSubregion: 'qiandian-miao-village',
      resources: { ...base.resources, silverOrnament: (base.resources.silverOrnament ?? 0) + 2 },
      itemInstances: [displayed, replica, ...base.itemInstances],
    };

    state = gameReducer(
      state,
      {
        type: 'USE_NPC_FUNCTION',
        npcId: 'qd-yinniang-alan',
        functionKind: 'homeVisit',
        homeVisitChoiceId: 'silver-ritual-ledger',
      },
      content,
    );
    const record = state.homeVisitRecords[0];
    const referral = activeOrder(state, (order) => order.id === record.referralOrderId);

    expect(record).toMatchObject({
      npcId: 'qd-yinniang-alan',
      title: '礼银看样',
      choiceId: 'silver-ritual-ledger',
      choiceKind: 'collect',
      referralTitle: '礼银纹样复单',
      itemId: displayed.id,
    });
    expect(referral).toMatchObject({
      npcId: 'qd-yinniang-alan',
      orderKind: 'referral',
      sourceHomeVisitRecordId: record.id,
      sourceHomeVisitChoiceId: 'silver-ritual-ledger',
      resourceId: 'silverOrnament',
      minQuality: 0.62,
    });
    expect(state.flags).toContain('homevisit:homevisit-alan-silver-ritual-case');
    expect(state.flags).toContain('homevisit-referral:silver-ritual-ledger');

    let delivered = gameReducer(state, { type: 'FULFILL_ORDER', orderId: referral.id }, content);
    expect(delivered.flags).toContain(`homevisit-order-completed:${record.id}`);
    expect(delivered.flags).toContain('homevisit-referral-completed:silver-ritual-ledger');
    expect(delivered.itemInstances.find((item) => item.id === displayed.id)?.status).toBe('displayed');
    expect(delivered.itemInstances.some((item) => item.id === replica.id)).toBe(false);

    const routeItem = silverItem('held-tea-road-route-order-silver', delivered, 0.78);
    delivered = {
      ...delivered,
      currentSubregion: 'qiandian-tea-road',
      calendar: { ...delivered.calendar, day: delivered.calendar.day + 1, phase: 'morning' },
      resources: { ...delivered.resources, silverOrnament: (delivered.resources.silverOrnament ?? 0) + 1 },
      itemInstances: [routeItem, ...delivered.itemInstances],
    };
    delivered = gameReducer(delivered, { type: 'PERFORM_ACTIVITY', activityId: 'qd-tea-horse-road', quality: 0.88 }, content);
    const routeOrder = activeOrder(
      delivered,
      (order) => order.sourceActivityId === 'qd-tea-horse-road' && order.orderKind === 'route' && order.resourceId === 'silverOrnament',
    );
    const routeDelivered = gameReducer(delivered, { type: 'FULFILL_ORDER', orderId: routeOrder.id }, content);
    expect(routeDelivered.flags).toContain('activity-order-completed:qd-tea-horse-road');

    const returned = gameReducer(
      {
        ...routeDelivered,
        calendar: { ...routeDelivered.calendar, day: routeDelivered.calendar.day + 1 },
      },
      {
        type: 'USE_NPC_FUNCTION',
        npcId: 'qd-yinniang-alan',
        functionKind: 'homeVisit',
        homeVisitChoiceId: 'silver-ritual-renewal-ledger',
      },
      content,
    );
    const returnRecord = returned.homeVisitRecords[0];
    const renewal = activeOrder(returned, (order) => order.id === returnRecord.referralOrderId);

    expect(returnRecord).toMatchObject({
      title: '藏客回访 · 茶马礼银声誉',
      choiceId: 'silver-ritual-renewal-ledger',
      choiceKind: 'collect',
      referralTitle: '茶马礼银续订单',
      itemId: displayed.id,
    });
    expect(returned.flags).toContain('homevisit:homevisit-alan-tea-road-client-return');
    expect(returned.flags).toContain('homevisit-alan-tea-road-client-return-resolved');
    expect(returned.flags).toContain('collector-reputation-silver-renewed');
    expect(renewal).toMatchObject({
      orderKind: 'referral',
      sourceHomeVisitRecordId: returnRecord.id,
      sourceHomeVisitChoiceId: 'silver-ritual-renewal-ledger',
      resourceId: 'silverOrnament',
      minQuality: 0.66,
    });
  });

  it('adds tea-road provenance through Alan collab and partner memory', () => {
    const base = qiandianState();
    const silver = silverItem('held-collab-silver-ritual', base, 0.64);
    const state = {
      ...base,
      currentSubregion: 'qiandian-miao-village',
      resources: {
        ...base.resources,
        silverStock: 1,
        copperStock: 1,
        teaLeaf: 1,
        silverOrnament: 1,
      },
      itemInstances: [silver],
    };

    const collaboratedState = gameReducer(
      state,
      {
        type: 'USE_NPC_FUNCTION',
        npcId: 'qd-yinniang-alan',
        functionKind: 'collab',
        itemId: silver.id,
        collabChoiceId: 'tea-road-provenance-tag',
      },
      content,
    );
    const collaborated = collaboratedState.itemInstances.find((item) => item.id === silver.id)!;

    expect(collaboratedState.resources.silverStock).toBe(0);
    expect(collaboratedState.resources.copperStock).toBe(0);
    expect(collaboratedState.resources.teaLeaf).toBe(0);
    expect(collaborated.quality).toBeGreaterThan(silver.quality);
    expect(collaborated.collaboratorNpcIds).toEqual(expect.arrayContaining(['qd-yinniang-alan', 'qd-mu-luozi']));
    expect(collaborated.descriptors).toEqual(expect.arrayContaining(['礼纹正', '轻坠可行', '路牌可验']));
    expect(collaboratedState.flags).toContain('collab-recipe:collab-alan-silver-ritual-fit');
    expect(collaboratedState.flags).toContain('collab-choice:tea-road-provenance-tag');
    expect(collaboratedState.flags).toContain('collab-partner:qd-mu-luozi');
    expect(collaboratedState.flags).toContain('silver-choice-tea-road-provenance');
    expect(collaboratedState.flags).toContain('route-known:route-bashu-qiandian-tea-horse');
    expect(collaboratedState.npcStates['qd-yinniang-alan'].knownTopics).toContain('tea-road-provenance-tag');
    expect(collaboratedState.npcStates['qd-mu-luozi'].knownTopics).toContain('collab-partner:collab-alan-silver-ritual-fit');
    expect(collaboratedState.npcStates['qd-mu-luozi'].knownTopics).toContain('tea-road-provenance-order');
  });
});
