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

function jingchuState(): GameState {
  const state = buildRegionChapterSmokeState(content, 'chapter-jingchu-ferry-lacquer');
  if (!state) throw new Error('Missing jingchu chapter smoke state');
  return {
    ...state,
    npcAffinity: {
      ...state.npcAffinity,
      'jc-qinglu': 36,
      'jc-yeshu': 36,
      'jc-xiong-zhuxi': 36,
      'jc-wen-xiuniang': 36,
    },
  };
}

function dayeMaterialItem(
  id: string,
  state: GameState,
  quality = 0.72,
  status: ItemInstance['status'] = 'held',
): ItemInstance {
  return {
    id,
    resourceId: 'ironIngot',
    sourceActivityId: 'jc-daye-mine',
    originRegionId: 'jingchu',
    originSubregionId: 'jingchu-mine-yard',
    createdTurn: state.turn,
    quality,
    descriptors: ['大冶铁声清', '铜铁分矿有账'],
    appraisal: '一份能对上大冶矿色、炉口配筐和铜铁耗损的熟料样。',
    displayName: id.includes('display') ? '大冶铜铁料账陈列样' : '大冶熟料复样',
    status,
  };
}

function xiangEmbroideryItem(
  id: string,
  state: GameState,
  quality = 0.74,
  status: ItemInstance['status'] = 'held',
): ItemInstance {
  return {
    id,
    resourceId: 'xiangEmbroidery',
    sourceCraftId: 'xiang-embroidery',
    originRegionId: 'jingchu',
    originSubregionId: 'jingchu-xiang-embroidery',
    createdTurn: state.turn,
    quality,
    descriptors: ['湘绣针脚清', '水路防潮有账'],
    appraisal: '一幅能说明针脚、丝料和防潮交付条件的湘绣样。',
    displayName: id.includes('display') ? '湘绣水路样账陈列' : '湘绣水路复样',
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

describe('Jingchu Daye ore longline', () => {
  it('binds Daye ore material feedback into the Jingchu chapter spec', () => {
    const chapter = REGION_CHAPTERS.find((item) => item.id === 'chapter-jingchu-ferry-lacquer');
    const activity = REGION_ACTIVITIES.find((item) => item.id === 'jc-daye-mine');
    const ferry = REGION_ACTIVITIES.find((item) => item.id === 'jc-ferry-market');
    const embroidery = REGION_ACTIVITIES.find((item) => item.id === 'jc-xiang-embroidery');
    const yeshu = ALL_NPCS.find((item) => item.id === 'jc-yeshu');
    const wen = ALL_NPCS.find((item) => item.id === 'jc-wen-xiuniang');
    const visit = HOME_VISITS.find((item) => item.id === 'homevisit-yeshu-daye-ore-ledger');

    expect(chapter?.status).toBe('chapter-ready');
    expect(yeshu?.functions).toEqual(expect.arrayContaining(['homeVisit', 'appraisal', 'order']));
    expect(wen?.functions).toEqual(expect.arrayContaining(['homeVisit', 'appraisal', 'order']));
    expect(activity?.reward.flags).toContain('jingchu-daye-ore-ledger-open');
    expect(embroidery?.reward.flags).toContain('jingchu-xiang-embroidery-ledger-open');
    expect(ferry?.reward.stall?.stages?.map((stage) => stage.id)).toEqual([
      'open-water-check',
      'barge-sample-barter',
      'close-route-ledger',
    ]);
    expect(ferry?.reward.stall?.closingChoices?.map((choice) => choice.id)).toEqual([
      'seal-lake-route-ledger',
      'send-ore-barge-ledger',
    ]);
    expect(visit).toMatchObject({
      npcId: 'jc-yeshu',
      requiredFlags: ['jingchu-daye-ore-ledger-open'],
      blockedFlags: ['homevisit-yeshu-daye-ore-ledger-resolved'],
      minQuality: 0.58,
    });
    expect(visit?.focusResourceIds).toEqual(
      expect.arrayContaining(['ironIngot', 'copperStock', 'treasureSword', 'cloisonne', 'copperware']),
    );
    expect(chapter?.homeVisitIds).toEqual(
      expect.arrayContaining([
        'homevisit-yeshu-daye-ore-ledger',
        'homevisit-xiong-lacquer-restoration',
        'homevisit-wen-xiang-embroidery-ledger',
      ]),
    );
    expect(chapter?.orderHooks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ source: 'homeVisit', id: 'homevisit-yeshu-daye-ore-ledger', readsItemState: true }),
        expect.objectContaining({ source: 'homeVisit', id: 'homevisit-wen-xiang-embroidery-ledger', readsItemState: true }),
      ]),
    );
    expect(chapter?.nextActions).not.toContain('补大冶矿场铜铁料状态反馈与矿口回访');
  });

  it('turns the Daye mine activity into an ore-ledger feedback visit and refined-material order', () => {
    const base = jingchuState();
    const displayed = dayeMaterialItem('display-yeshu-daye-ore-ledger', base, 0.74, 'displayed');
    const replica = dayeMaterialItem('held-yeshu-daye-ore-replica', base, 0.7);
    let state: GameState = {
      ...base,
      currentSubregion: 'jingchu-mine-yard',
      resources: {
        ...base.resources,
        ironIngot: (base.resources.ironIngot ?? 0) + 3,
        copperStock: (base.resources.copperStock ?? 0) + 2,
        copperOre: (base.resources.copperOre ?? 0) + 1,
        ironOre: (base.resources.ironOre ?? 0) + 1,
      },
      itemInstances: [displayed, replica, ...base.itemInstances],
    };

    const unavailable = gameReducer(
      state,
      {
        type: 'USE_NPC_FUNCTION',
        npcId: 'jc-yeshu',
        functionKind: 'homeVisit',
        homeVisitChoiceId: 'yeshu-daye-ore-ledger-order',
      },
      content,
    );
    expect(unavailable.homeVisitRecords.length).toBe(0);
    expect(unavailable.flags).not.toContain('homevisit-yeshu-daye-ore-ledger-resolved');

    state = gameReducer(state, { type: 'PERFORM_ACTIVITY', activityId: 'jc-daye-mine', quality: 0.84 }, content);
    expect(state.flags).toContain('jingchu-daye-ore-ledger-open');
    expect(state.completedActivities).toContain('jc-daye-mine');
    expect(state.npcStates['jc-yeshu']?.knownTopics).toContain('activity:jc-daye-mine');

    const returned = gameReducer(
      state,
      {
        type: 'USE_NPC_FUNCTION',
        npcId: 'jc-yeshu',
        functionKind: 'homeVisit',
        homeVisitChoiceId: 'yeshu-daye-ore-ledger-order',
      },
      content,
    );
    const record = returned.homeVisitRecords[0];
    const referral = activeOrder(returned, (order) => order.id === record.referralOrderId);

    expect(record).toMatchObject({
      npcId: 'jc-yeshu',
      title: '大冶铜铁料账',
      choiceId: 'yeshu-daye-ore-ledger-order',
      choiceKind: 'collect',
      referralTitle: '大冶熟料复样单',
      itemId: displayed.id,
    });
    expect(referral).toMatchObject({
      npcId: 'jc-yeshu',
      orderKind: 'referral',
      sourceHomeVisitRecordId: record.id,
      sourceHomeVisitChoiceId: 'yeshu-daye-ore-ledger-order',
      resourceId: 'ironIngot',
      quantity: 1,
      minQuality: 0.62,
    });
    expect(returned.flags).toContain('homevisit:homevisit-yeshu-daye-ore-ledger');
    expect(returned.flags).toContain('jingchu-daye-material-read');
    expect(returned.flags).toContain('homevisit-yeshu-daye-ore-ledger-resolved');
    expect(returned.flags).toContain('jingchu-daye-ore-ledger-ready');
    expect(returned.flags).toContain('homevisit-referral:yeshu-daye-ore-ledger-order');

    const delivered = gameReducer(returned, { type: 'FULFILL_ORDER', orderId: referral.id }, content);
    expect(delivered.activeOrders.find((candidate) => candidate.id === referral.id)?.status).toBe('completed');
    expect(delivered.flags).toContain(`homevisit-order-completed:${record.id}`);
    expect(delivered.flags).toContain('homevisit-referral-completed:yeshu-daye-ore-ledger-order');
    expect(delivered.itemInstances.find((item) => item.id === displayed.id)?.status).toBe('displayed');
    expect(delivered.itemInstances.some((item) => item.id === replica.id)).toBe(false);

    const ended = reportFor({
      ...delivered,
      npcAffinity: { ...delivered.npcAffinity, 'jc-yeshu': 80 },
    });
    expect(ended.report?.relationshipOutcomes?.some((line) => line.includes('冶叔') && line.includes('大冶熟料复样'))).toBe(true);
  });

  it('turns Xiang embroidery and the ferry closing ledger into a water-route sample order', () => {
    const base = jingchuState();
    const displayed = xiangEmbroideryItem('display-wen-xiang-water-ledger', base, 0.76, 'displayed');
    const replica = xiangEmbroideryItem('held-wen-xiang-water-ledger', base, 0.74);
    let state: GameState = {
      ...base,
      currentSubregion: 'jingchu-xiang-embroidery',
      resources: {
        ...base.resources,
        xiangEmbroidery: 12,
        rawSilkThread: 12,
        chuLacquer: 12,
        oilpaperUmbrella: 12,
        ironIngot: 12,
        tea: 12,
      },
      itemInstances: [displayed, replica, ...base.itemInstances],
    };

    const unavailable = gameReducer(
      state,
      {
        type: 'USE_NPC_FUNCTION',
        npcId: 'jc-wen-xiuniang',
        functionKind: 'homeVisit',
        homeVisitChoiceId: 'wen-xiang-sample-ledger',
      },
      content,
    );
    expect(unavailable.homeVisitRecords.length).toBe(0);

    state = gameReducer(state, { type: 'PERFORM_ACTIVITY', activityId: 'jc-xiang-embroidery', quality: 0.84 }, content);
    expect(state.flags).toContain('jingchu-xiang-embroidery-ledger-open');

    for (let run = 0; run < 3; run += 1) {
      state = gameReducer(
        {
          ...state,
          currentSubregion: 'jingchu-lake-market',
          calendar: { ...state.calendar, day: state.calendar.day + (run === 0 ? 0 : 1), phase: 'morning' },
        },
        { type: 'PERFORM_ACTIVITY', activityId: 'jc-ferry-market', quality: 0.88, stallStrategyId: 'damp-proof-first' },
        content,
      );
    }
    state = gameReducer(state, { type: 'RESOLVE_ACTIVITY_STALL_CLOSING', choiceId: 'seal-lake-route-ledger' }, content);
    expect(state.flags).toContain('jingchu-ferry-lake-route-ledger');
    expect(state.flags).toContain('route-known:route-jingchu-ganpo-lake');

    const returned = gameReducer(
      {
        ...state,
        calendar: { ...state.calendar, day: state.calendar.day + 1, phase: 'morning' },
      },
      {
        type: 'USE_NPC_FUNCTION',
        npcId: 'jc-wen-xiuniang',
        functionKind: 'homeVisit',
        homeVisitChoiceId: 'wen-xiang-sample-ledger',
      },
      content,
    );
    const record = returned.homeVisitRecords[0];
    const referral = activeOrder(returned, (order) => order.id === record.referralOrderId);

    expect(record).toMatchObject({
      npcId: 'jc-wen-xiuniang',
      title: '湘绣水路样账',
      choiceId: 'wen-xiang-sample-ledger',
      referralTitle: '湘绣水路复样单',
      itemId: displayed.id,
    });
    expect(referral).toMatchObject({
      npcId: 'jc-wen-xiuniang',
      orderKind: 'route',
      sourceHomeVisitChoiceId: 'wen-xiang-sample-ledger',
      resourceId: 'xiangEmbroidery',
      minQuality: 0.64,
      routeIds: ['route-jingchu-ganpo-lake'],
    });
    expect(returned.flags).toContain('homevisit-wen-xiang-embroidery-ledger-resolved');

    const delivered = gameReducer(returned, { type: 'FULFILL_ORDER', orderId: referral.id }, content);
    expect(delivered.activeOrders.find((candidate) => candidate.id === referral.id)?.status).toBe('completed');
    expect(delivered.flags).toContain('homevisit-referral-completed:wen-xiang-sample-ledger');
    expect(delivered.flags).toContain('route-order-completed:jc-wen-xiuniang');

    const ended = reportFor({
      ...delivered,
      npcAffinity: { ...delivered.npcAffinity, 'jc-wen-xiuniang': 80 },
    });
    expect(ended.report?.relationshipOutcomes?.some((line) => line.includes('文绣娘') && line.includes('湘绣绣样续单'))).toBe(true);
  });
});
