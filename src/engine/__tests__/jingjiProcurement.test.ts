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

function jingjiState(): GameState {
  const state = buildRegionChapterSmokeState(content, 'chapter-jingji-palace-procurement');
  if (!state) throw new Error('Missing jingji chapter smoke state');
  return {
    ...state,
    currentSubregion: 'jingji-official-gate',
    activeOrders: [],
    resources: { ...state.resources, coin: 9999 },
    npcAffinity: { ...state.npcAffinity, 'jj-song-yasi': 24 },
  };
}

function withProcurementTrust(
  state: GameState,
  options: {
    reputation: number;
    commerce: number;
    people: number;
    affinity: number;
    palaceBacker?: boolean;
  },
): GameState {
  const attributes = {
    ...state.profile.attributes,
    commerce: options.commerce,
    people: options.people,
  };
  return {
    ...state,
    regionReputation: { ...state.regionReputation, jingji: options.reputation },
    npcAffinity: { ...state.npcAffinity, 'jj-song-yasi': options.affinity },
    profile: {
      ...state.profile,
      attributes,
      attributeXp: { ...state.profile.attributeXp, commerce: options.commerce, people: options.people },
    },
    flags: [
      ...new Set([
        ...state.flags.filter((flag) => flag !== 'collector-reputation-palace-renewed'),
        ...(options.palaceBacker ? ['collector-reputation-palace-renewed'] : []),
      ]),
    ],
  };
}

function requestSongProcurement(state: GameState): { state: GameState; order: ActiveOrder } {
  const next = gameReducer(
    state,
    { type: 'USE_NPC_FUNCTION', npcId: 'jj-song-yasi', functionKind: 'order' },
    content,
  );
  const order = next.activeOrders.find((item) => item.npcId === 'jj-song-yasi' && item.status === 'active');
  if (!order) throw new Error('Missing Song Yasi procurement order');
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

function procurementItem(order: ActiveOrder, state: GameState, index: number): ItemInstance {
  return {
    id: `jingji-procurement-${index}`,
    resourceId: order.resourceId,
    sourceCraftId: order.resourceId === 'filigreeOrnament' ? 'filigree' : order.resourceId === 'treasureSword' ? 'longquan-sword' : 'cloisonne',
    originRegionId: 'jingji',
    originSubregionId: 'jingji-palace-yard',
    createdTurn: state.turn + index,
    quality: Math.min(0.96, order.minQuality + 0.12),
    descriptors: ['官样准', '凭据全'],
    appraisal: '一件可按官样采办验收的重器。',
    status: 'held',
  };
}

function cloisonneItem(
  id: string,
  state: GameState,
  quality = 0.78,
  status: ItemInstance['status'] = 'held',
): ItemInstance {
  return {
    id,
    resourceId: 'cloisonne',
    sourceCraftId: 'cloisonne',
    originRegionId: 'jingji',
    originSubregionId: 'jingji-palace-yard',
    createdTurn: state.turn,
    quality,
    descriptors: ['宫样丝线准', '铜料账清', '蓝款可验'],
    appraisal: '一件可对上铜料、矿彩和门房名帖的景泰蓝重器。',
    displayName: status === 'displayed' ? '京畿漕运复验宫样' : '京畿官样采办复器',
    status,
  };
}

describe('Jingji palace procurement gating', () => {
  it('binds Song Yasi as the chapter procurement gatekeeper', () => {
    const chapter = REGION_CHAPTERS.find((item) => item.id === 'chapter-jingji-palace-procurement');
    const song = ALL_NPCS.find((item) => item.id === 'jj-song-yasi');

    expect(chapter?.status).toBe('chapter-ready');
    expect(song?.functions).toEqual(expect.arrayContaining(['order', 'route', 'escort', 'homeVisit']));
    expect(chapter?.orderHooks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ source: 'activity', id: 'jj-official-gate', readsItemState: true }),
        expect.objectContaining({ source: 'activity', id: 'jj-appraisal-market', readsItemState: true }),
        expect.objectContaining({ source: 'homeVisit', id: 'homevisit-lan-palace-return', readsItemState: true }),
        expect.objectContaining({ source: 'homeVisit', id: 'homevisit-song-canal-ledger-return', readsItemState: true }),
        expect.objectContaining({ source: 'collab', id: 'collab-lan-cloisonne-blue', readsItemState: true }),
        expect.objectContaining({ source: 'escort', id: 'escort-jingji-canal-tribute-recheck' }),
      ]),
    );
    expect(chapter?.homeVisitIds).toContain('homevisit-song-canal-ledger-return');
    expect(chapter?.escortEncounterIds).toContain('escort-jingji-canal-tribute-recheck');
    expect(chapter?.orderHooks.find((hook) => hook.id === 'jj-official-gate')?.note).toContain('担保折损');
    expect(chapter?.nextActions.some((item) => item.includes('采办许可'))).toBe(false);
  });

  it('uses reputation and palace backer flags to upgrade pre-review into a formal permit order', () => {
    const base = jingjiState();
    const preReview = requestSongProcurement(
      withProcurementTrust(base, {
        reputation: 34,
        commerce: 18,
        people: 10,
        affinity: 24,
      }),
    );
    const formal = requestSongProcurement(
      withProcurementTrust(base, {
        reputation: 34,
        commerce: 18,
        people: 10,
        affinity: 24,
        palaceBacker: true,
      }),
    );

    expect(preReview.order.orderKind).toBe('palace');
    expect(preReview.order.title).toContain('官样采办预审单');
    expect(preReview.order.depositCoin).toBeGreaterThan(0);
    expect(preReview.state.flags).toContain('palace-order:jj-song-yasi');
    expect(preReview.state.flags).toContain('deposit-order:jj-song-yasi');

    expect(formal.order.orderKind).toBe('palace');
    expect(formal.order.title).toContain('官样采办许可单');
    expect(formal.order.depositCoin).toBe(0);
    expect(formal.order.creditTrustScore ?? 0).toBeGreaterThan(preReview.order.creditTrustScore ?? 0);
    expect(formal.order.creditNote).toContain('采办商誉');
    expect(formal.state.flags).toContain('palace-order:jj-song-yasi');
    expect(formal.state.flags).not.toContain('deposit-order:jj-song-yasi');
  });

  it('lets canal tribute ledger results adjust Song Yasi procurement trust', () => {
    const base = withProcurementTrust(jingjiState(), {
      reputation: 34,
      commerce: 18,
      people: 10,
      affinity: 24,
    });
    const neutral = requestSongProcurement(base);
    const cleared = requestSongProcurement({
      ...base,
      flags: [...base.flags, 'jingji-canal-tribute-cleared'],
    });
    const stalled = requestSongProcurement({
      ...base,
      flags: [...base.flags, 'jingji-canal-tribute-stalled'],
    });
    const rechecked = requestSongProcurement({
      ...base,
      flags: [...base.flags, 'jingji-canal-tribute-recheck-cleared'],
    });

    expect(cleared.order.creditTrustScore ?? 0).toBeGreaterThan(neutral.order.creditTrustScore ?? 0);
    expect(cleared.order.creditNote).toContain('漕运料账已清');
    expect(rechecked.order.creditTrustScore ?? 0).toBeGreaterThan(neutral.order.creditTrustScore ?? 0);
    expect(rechecked.order.creditNote).toContain('漕运复验入簿');
    expect(stalled.order.creditTrustScore ?? 0).toBeLessThan(neutral.order.creditTrustScore ?? 0);
    expect(stalled.order.creditNote).toContain('漕运料账滞着');
  });

  it('feeds the canal recheck escort result into Song Yasi home-visit procurement', () => {
    const routeId = 'route-jiangnan-jingji-canal';
    let state: GameState = withProcurementTrust(
      {
        ...jingjiState(),
        unlockedRegions: [...new Set([...jingjiState().unlockedRegions, 'jiangnan', 'jingji'])],
        resources: { ...jingjiState().resources, labor: 999, cloisonne: 12, copperStock: 12, pigmentRefined: 12 },
        routeStability: { ...jingjiState().routeStability, [routeId]: 18, 'route-jingji-sanjin-official': 100 },
        flags: [...jingjiState().flags, 'route-known:route-jiangnan-jingji-canal'],
      },
      {
        reputation: 72,
        commerce: 70,
        people: 50,
        affinity: 42,
        palaceBacker: true,
      },
    );

    state = gameReducer(state, { type: 'USE_NPC_FUNCTION', npcId: 'jj-song-yasi', functionKind: 'escort' }, content);
    expect(state.pendingEscortCrisis?.encounterId).toBe('escort-jingji-canal-tribute');
    state = gameReducer(state, { type: 'RESOLVE_ESCORT_CRISIS', choiceId: 'seal-tribute-manifest' }, content);
    expect(state.flags).toContain('jingji-canal-tribute-cleared');
    expect(state.routeEscortRuns[routeId]).toBe(1);

    state = gameReducer(
      {
        ...state,
        calendar: { ...state.calendar, day: state.calendar.day + 1, phase: 'morning' },
      },
      { type: 'USE_NPC_FUNCTION', npcId: 'jj-song-yasi', functionKind: 'escort' },
      content,
    );
    expect(state.pendingEscortCrisis?.encounterId).toBe('escort-jingji-canal-tribute-recheck');
    state = gameReducer(state, { type: 'RESOLVE_ESCORT_CRISIS', choiceId: 'audit-canal-material-ledger' }, content);
    expect(state.flags).toContain('jingji-canal-tribute-recheck-cleared');
    expect(state.flags).toContain('jingji-canal-material-ledger-stat-ready');

    const displayed = cloisonneItem('display-song-canal-ledger-return', state, 0.8, 'displayed');
    const replica = cloisonneItem('held-song-canal-ledger-return', state, 0.78);
    const returned = gameReducer(
      {
        ...state,
        calendar: { ...state.calendar, day: state.calendar.day + 1, phase: 'morning' },
        itemInstances: [displayed, replica, ...state.itemInstances],
      },
      {
        type: 'USE_NPC_FUNCTION',
        npcId: 'jj-song-yasi',
        functionKind: 'homeVisit',
        homeVisitChoiceId: 'song-canal-recheck-ledger',
      },
      content,
    );
    const record = returned.homeVisitRecords[0];
    const referral = activeOrder(returned, (order) => order.id === record.referralOrderId);

    expect(record).toMatchObject({
      npcId: 'jj-song-yasi',
      title: '漕运料账复验',
      choiceId: 'song-canal-recheck-ledger',
      referralTitle: '漕运复验官样采办单',
      itemId: displayed.id,
    });
    expect(referral).toMatchObject({
      npcId: 'jj-song-yasi',
      orderKind: 'palace',
      sourceHomeVisitChoiceId: 'song-canal-recheck-ledger',
      resourceId: 'cloisonne',
      minQuality: 0.72,
      depositCoin: 0,
      creditTrustScore: 78,
      routeIds: ['route-jiangnan-jingji-canal', 'route-jingji-sanjin-official'],
    });
    expect(referral.creditNote).toContain('漕运复验入簿');
    expect(returned.flags).toContain('homevisit-song-canal-ledger-return-resolved');

    const delivered = gameReducer(returned, { type: 'FULFILL_ORDER', orderId: referral.id }, content);
    expect(delivered.activeOrders.find((order) => order.id === referral.id)?.status).toBe('completed');
    expect(delivered.flags).toContain('homevisit-referral-completed:song-canal-recheck-ledger');
    expect(delivered.flags).toContain('palace-order-completed:jj-song-yasi');
  });

  it('damages Song Yasi backing when a palace procurement permit expires', () => {
    const opened = requestSongProcurement(
      withProcurementTrust(jingjiState(), {
        reputation: 34,
        commerce: 18,
        people: 10,
        affinity: 24,
      }),
    );
    const beforeRep = opened.state.regionReputation.jingji ?? 0;
    const expired = expireOrder(opened.state, opened.order);
    const renewed = requestSongProcurement({
      ...expired,
      calendar: { ...expired.calendar, day: expired.calendar.day + 1 },
    });

    expect(opened.order.orderKind).toBe('palace');
    expect(opened.order.depositCoin).toBeGreaterThan(0);
    expect(expired.activeOrders.find((item) => item.id === opened.order.id)?.status).toBe('expired');
    expect(expired.flags).toContain('palace-order-expired:jj-song-yasi');
    expect(expired.flags).toContain('deposit-forfeited:jj-song-yasi');
    expect(expired.flags).toContain('jingji-official-permit-backer-damaged');
    expect(expired.flags).toContain('jingji-palace-procurement-expired');
    expect(expired.regionReputation.jingji).toBeLessThan(beforeRep);
    expect(renewed.order.creditTrustScore ?? 0).toBeLessThan(opened.order.creditTrustScore ?? 0);
    expect(renewed.order.creditNote).toContain('门房担保折损');
  });

  it('lets high-reputation formal palace procurement complete through clean tracked work', () => {
    const { state, order } = requestSongProcurement(
      withProcurementTrust(jingjiState(), {
        reputation: 76,
        commerce: 42,
        people: 32,
        affinity: 42,
        palaceBacker: true,
      }),
    );
    const beforeRep = state.regionReputation.jingji ?? 0;
    const ready = {
      ...state,
      resources: {
        ...state.resources,
        [order.resourceId]: (state.resources[order.resourceId] ?? 0) + order.quantity,
      },
      itemInstances: [
        ...Array.from({ length: order.quantity }, (_, index) => procurementItem(order, state, index)),
        ...state.itemInstances,
      ],
    };
    const delivered = gameReducer(ready, { type: 'FULFILL_ORDER', orderId: order.id }, content);

    expect(order.title).toContain('官样采办许可单');
    expect(order.orderKind).toBe('palace');
    expect(order.reputationAtCreation).toBe(76);
    expect(order.minQuality).toBeGreaterThanOrEqual(0.74);
    expect(delivered.activeOrders.find((item) => item.id === order.id)?.status).toBe('completed');
    expect(delivered.flags).toContain(`order-completed:${order.id}`);
    expect(delivered.flags).toContain('palace-order-completed:jj-song-yasi');
    expect(delivered.regionReputation.jingji).toBeGreaterThan(beforeRep);
  });
});
