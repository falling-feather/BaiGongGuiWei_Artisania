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

function sanjinState(): GameState {
  const state = buildRegionChapterSmokeState(content, 'chapter-sanjin-piaohao-lacquer');
  if (!state) throw new Error('Missing sanjin chapter smoke state');
  return {
    ...state,
    currentSubregion: 'sanjin-piaohao',
    activeOrders: [],
    resources: { ...state.resources, coin: 9999, pingyaoLacquer: 12 },
    regionReputation: { ...state.regionReputation, sanjin: 20 },
    npcAffinity: { ...state.npcAffinity, 'sj-lei-zhanggui': 22, 'sj-pingyao-qipo': 36 },
    flags: [
      ...new Set([
        ...state.flags.filter((flag) => flag !== 'route-known:route-jingji-sanjin-official'),
        'sanjin-piaohao-credit-note',
      ]),
    ],
    profile: {
      ...state.profile,
      attributes: { ...state.profile.attributes, commerce: 16, people: 2 },
      attributeXp: { ...state.profile.attributeXp, commerce: 16, people: 2 },
    },
  };
}

function requestLeiOrder(state: GameState): { state: GameState; order: ActiveOrder } {
  const next = gameReducer(
    state,
    { type: 'USE_NPC_FUNCTION', npcId: 'sj-lei-zhanggui', functionKind: 'order' },
    content,
  );
  const order = next.activeOrders.find((item) => item.npcId === 'sj-lei-zhanggui' && item.status === 'active');
  if (!order) throw new Error('Missing Lei Zhanggui credit order');
  return { state: next, order };
}

function activeOrder(state: GameState, predicate: (order: ActiveOrder) => boolean): ActiveOrder {
  const order = state.activeOrders.find((candidate) => candidate.status === 'active' && predicate(candidate));
  if (!order) throw new Error('Missing expected active order');
  return order;
}

function expireOrder(state: GameState, order: ActiveOrder): GameState {
  return gameReducer(
    {
      ...state,
      calendar: { ...state.calendar, day: (order.expiresDay ?? state.calendar.day) + 1 },
    },
    { type: 'FULFILL_ORDER', orderId: order.id },
    content,
  );
}

function pingyaoItem(
  id: string,
  state: GameState,
  quality = 0.76,
  status: ItemInstance['status'] = 'held',
): ItemInstance {
  return {
    id,
    resourceId: 'pingyaoLacquer',
    sourceCraftId: 'pingyao-lacquer',
    originRegionId: 'sanjin',
    originSubregionId: 'sanjin-lacquer-yard',
    createdTurn: state.turn,
    quality,
    descriptors: ['slow polish', 'steady lacquer'],
    appraisal: 'The lacquer face is steady enough for a ticket-house cabinet sample.',
    displayName: status === 'displayed' ? 'Pingyao polish cabinet sample' : 'Pingyao polish renewal piece',
    status,
  };
}

function withPolishGallery(state: GameState): GameState {
  return {
    ...state,
    currentSubregion: 'sanjin-lacquer-yard',
    resources: { ...state.resources, pingyaoLacquer: (state.resources.pingyaoLacquer ?? 0) + 3 },
    itemInstances: [
      pingyaoItem('display-sanjin-polish-cabinet', state, 0.78, 'displayed'),
      pingyaoItem('held-sanjin-polish-referral', state, 0.74),
      pingyaoItem('held-sanjin-polish-renewal', state, 0.8),
      ...state.itemInstances,
    ],
  };
}

function runPolishLedgerRenewal(state: GameState): {
  afterSample: GameState;
  renewed: GameState;
  renewalOrder: ActiveOrder;
  beforeRenewalReputation: number;
} {
  const visited = gameReducer(
    withPolishGallery(state),
    {
      type: 'USE_NPC_FUNCTION',
      npcId: 'sj-pingyao-qipo',
      functionKind: 'homeVisit',
      homeVisitChoiceId: 'polish-sample-cabinet',
    },
    content,
  );
  const sampleRecord = visited.homeVisitRecords[0];
  const sampleOrder = activeOrder(visited, (candidate) => candidate.id === sampleRecord.referralOrderId);
  const afterSample = gameReducer(visited, { type: 'FULFILL_ORDER', orderId: sampleOrder.id }, content);
  const returned = gameReducer(
    {
      ...afterSample,
      calendar: { ...afterSample.calendar, day: afterSample.calendar.day + 1, phase: 'morning' },
    },
    {
      type: 'USE_NPC_FUNCTION',
      npcId: 'sj-pingyao-qipo',
      functionKind: 'homeVisit',
      homeVisitChoiceId: 'polish-credit-ledger',
    },
    content,
  );
  const returnRecord = returned.homeVisitRecords[0];
  const renewalOrder = activeOrder(returned, (candidate) => candidate.id === returnRecord.referralOrderId);
  const beforeRenewalReputation = returned.regionReputation.sanjin ?? 0;
  const renewed = gameReducer(returned, { type: 'FULFILL_ORDER', orderId: renewalOrder.id }, content);

  return { afterSample, renewed, renewalOrder, beforeRenewalReputation };
}

describe('Sanjin ticket-house credit recovery', () => {
  it('binds the chapter to ticket-house credit, polish return visits, and hand-polish collab', () => {
    const chapter = REGION_CHAPTERS.find((item) => item.id === 'chapter-sanjin-piaohao-lacquer');
    const returnVisit = HOME_VISITS.find((item) => item.id === 'homevisit-pingyao-client-return');

    expect(chapter?.characterNpcIds).toEqual(
      expect.arrayContaining([expect.objectContaining({ npcId: 'sj-lei-zhanggui', role: 'trade' })]),
    );
    expect(chapter?.orderHooks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ source: 'activity', id: 'sj-piaohao', readsItemState: true }),
        expect.objectContaining({ source: 'homeVisit', id: 'homevisit-pingyao-client-return', readsItemState: true }),
        expect.objectContaining({ source: 'collab', id: 'collab-pingyao-hand-polish', readsItemState: true }),
      ]),
    );
    expect(chapter?.homeVisitIds).toEqual(
      expect.arrayContaining(['homevisit-pingyao-polish-room', 'homevisit-pingyao-client-return']),
    );
    expect(chapter?.collabRecipeIds).toContain('collab-pingyao-hand-polish');
    expect(returnVisit?.requiredFlags).toContain('homevisit-referral-completed:polish-sample-cabinet');
  });

  it('penalizes new Lei Zhanggui credit orders after default and restores terms after polish-ledger payback', () => {
    const opened = requestLeiOrder(sanjinState());
    const beforeDefaultReputation = opened.state.regionReputation.sanjin ?? 0;

    expect(opened.order.orderKind).toBe('credit');
    expect(opened.order.depositCoin).toBe(0);
    expect(opened.order.creditTrustScore).toBeGreaterThanOrEqual(62);

    const defaulted = expireOrder(opened.state, opened.order);
    expect(defaulted.activeOrders.find((item) => item.id === opened.order.id)?.status).toBe('expired');
    expect(defaulted.flags).toContain('credit-default:sj-lei-zhanggui');
    expect(defaulted.flags).toContain('credit-order-expired:sj-lei-zhanggui');
    expect(defaulted.regionReputation.sanjin).toBeLessThan(beforeDefaultReputation);

    const penalized = requestLeiOrder(defaulted);
    expect(penalized.order.creditTrustScore ?? 0).toBeLessThan(opened.order.creditTrustScore ?? 0);
    expect(penalized.order.depositCoin).toBeGreaterThan(opened.order.depositCoin ?? 0);
    expect(penalized.order.creditNote).toContain('旧失约未补');

    const { renewed, renewalOrder, beforeRenewalReputation } = runPolishLedgerRenewal(defaulted);
    expect(renewalOrder).toMatchObject({
      orderKind: 'referral',
      sourceHomeVisitChoiceId: 'polish-credit-ledger',
      resourceId: 'pingyaoLacquer',
      minQuality: 0.66,
    });
    expect(renewed.activeOrders.find((item) => item.id === renewalOrder.id)?.status).toBe('completed');
    expect(renewed.flags).toContain('homevisit-referral-completed:polish-credit-ledger');
    expect(renewed.flags).toContain('collector-reputation-polish-renewed');
    expect(renewed.flags).toContain('credit-default-repaired:sj-lei-zhanggui');
    expect(renewed.flags).toContain('credit-default-recovered:polish-credit-ledger');
    expect(renewed.flags).toContain('sanjin-credit-payback-restored');
    expect(renewed.regionReputation.sanjin).toBeGreaterThan(beforeRenewalReputation);

    const restored = requestLeiOrder({
      ...renewed,
      calendar: { ...renewed.calendar, day: renewed.calendar.day + 1 },
    });
    expect(restored.order.creditTrustScore ?? 0).toBeGreaterThan(penalized.order.creditTrustScore ?? 0);
    expect(restored.order.depositCoin).toBeLessThan(penalized.order.depositCoin ?? 0);
    expect(restored.order.creditNote).toContain('旧失约已由漆柜续订单补回');
  });

  it('keeps the polish-ledger reputation chain neutral when no Lei default exists', () => {
    const { renewed } = runPolishLedgerRenewal(sanjinState());

    expect(renewed.flags).toContain('homevisit-referral-completed:polish-credit-ledger');
    expect(renewed.flags).toContain('collector-reputation-polish-renewed');
    expect(renewed.flags).not.toContain('credit-default-repaired:sj-lei-zhanggui');
    expect(renewed.flags).not.toContain('credit-default-recovered:polish-credit-ledger');
    expect(renewed.flags).not.toContain('sanjin-credit-payback-restored');
  });
});
