import { describe, expect, it } from 'vitest';
import { gameReducer, routeStabilityOf, type ActiveOrder, type GameContent, type GameState, type ItemInstance, type WorkshopUpgradeRecord } from '../index';
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

const quietContent: GameContent = { ...content, events: [] };
const regionIds = REGIONS.map((region) => region.id);
const routeIds = [...new Set(REGION_CONTENT.flatMap((region) => region.routes.map((route) => route.id)))];

const WATCHED_ROUTE_IDS = [
  'route-bashu-xueyu-snow-pass',
  'route-xueyu-xiyu-caravan',
  'route-jiangnan-ganpo-kiln',
  'route-ganpo-huizhou-merchant',
  'route-jingji-sanjin-official',
];

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

function activeOrder(state: GameState, predicate: (order: ActiveOrder) => boolean): ActiveOrder {
  const order = state.activeOrders.find((candidate) => candidate.status === 'active' && predicate(candidate));
  if (!order) throw new Error('Missing expected active order');
  return order;
}

function requestLeiOrder(state: GameState): { state: GameState; order: ActiveOrder } {
  const next = gameReducer(
    state,
    { type: 'USE_NPC_FUNCTION', npcId: 'sj-lei-zhanggui', functionKind: 'order' },
    content,
  );
  const order = activeOrder(next, (item) => item.npcId === 'sj-lei-zhanggui');
  return { state: next, order };
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
    currentRegion: 'sanjin',
    currentSubregion: 'sanjin-lacquer-yard',
    resources: { ...state.resources, pingyaoLacquer: Math.max(3, state.resources.pingyaoLacquer ?? 0) },
    itemInstances: [
      pingyaoItem('display-f4-sanjin-polish-cabinet', state, 0.78, 'displayed'),
      pingyaoItem('held-f4-sanjin-polish-referral', state, 0.74),
      pingyaoItem('held-f4-sanjin-polish-renewal', state, 0.8),
      ...state.itemInstances,
    ],
  };
}

function runPolishLedgerRenewal(state: GameState): GameState {
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
  return gameReducer(returned, { type: 'FULFILL_ORDER', orderId: renewalOrder.id }, content);
}

function repeatDefaultCreditState(): GameState {
  const opened = requestLeiOrder(sanjinState());
  const defaulted = expireOrder(opened.state, opened.order);
  const renewed = runPolishLedgerRenewal(defaulted);
  const restored = requestLeiOrder({
    ...renewed,
    calendar: { ...renewed.calendar, day: renewed.calendar.day + 1 },
  });
  return expireOrder(restored.state, restored.order);
}

function withProcurementTrust(state: GameState): GameState {
  return {
    ...state,
    currentRegion: 'jingji',
    currentSubregion: 'jingji-official-gate',
    regionReputation: { ...state.regionReputation, jingji: 34 },
    npcAffinity: { ...state.npcAffinity, 'jj-song-yasi': 24 },
    profile: {
      ...state.profile,
      attributes: { ...state.profile.attributes, commerce: 18, people: 10 },
      attributeXp: { ...state.profile.attributeXp, commerce: 18, people: 10 },
    },
    flags: state.flags.filter(
      (flag) =>
        flag !== 'collector-reputation-palace-renewed' &&
        flag !== 'sanjin-piaohao-credit-note' &&
        flag !== 'piaohao-credit',
    ),
  };
}

function requestSongProcurement(state: GameState): { state: GameState; order: ActiveOrder } {
  const next = gameReducer(
    state,
    { type: 'USE_NPC_FUNCTION', npcId: 'jj-song-yasi', functionKind: 'order' },
    content,
  );
  const order = activeOrder(next, (item) => item.npcId === 'jj-song-yasi');
  return { state: next, order };
}

function expireDepositOrder(state: GameState): {
  state: GameState;
  order: ActiveOrder;
  coinBeforeDeposit: number;
  coinAfterDeposit: number;
  coinAfterExpiry: number;
} {
  const trusted = withProcurementTrust(state);
  const coinBeforeDeposit = trusted.resources.coin ?? 0;
  const opened = requestSongProcurement(trusted);
  const coinAfterDeposit = opened.state.resources.coin ?? 0;
  const expired = expireOrder(opened.state, opened.order);
  return {
    state: expired,
    order: opened.order,
    coinBeforeDeposit,
    coinAfterDeposit,
    coinAfterExpiry: expired.resources.coin ?? 0,
  };
}

function stressWorkshopUpgrades(): WorkshopUpgradeRecord[] {
  return [
    {
      id: 'upgrade-longquan-quench-trough',
      craftId: 'longquan-sword',
      title: 'Longquan quench trough',
      kind: 'tool',
      tier: 1,
      day: 1,
      phase: 'morning',
    },
    {
      id: 'upgrade-longquan-trial-ledger',
      craftId: 'longquan-sword',
      title: 'Longquan trial ledger',
      kind: 'brand',
      tier: 2,
      day: 1,
      phase: 'morning',
    },
    {
      id: 'upgrade-jingdezhen-kiln-gauge',
      craftId: 'jingdezhen-porcelain',
      title: 'Jingdezhen kiln gauge',
      kind: 'tool',
      tier: 1,
      day: 1,
      phase: 'morning',
    },
    {
      id: 'upgrade-xuan-paper-screen-wall',
      craftId: 'xuan-paper',
      title: 'Xuan paper screen wall',
      kind: 'bench',
      tier: 1,
      day: 1,
      phase: 'morning',
    },
    {
      id: 'upgrade-pingyao-polish-cabinet',
      craftId: 'pingyao-lacquer',
      title: 'Pingyao polish cabinet',
      kind: 'brand',
      tier: 1,
      day: 1,
      phase: 'morning',
    },
  ];
}

interface LongRunFixture {
  state: GameState;
  depositOrder: ActiveOrder;
  coinBeforeDeposit: number;
  coinAfterDeposit: number;
  coinAfterDepositExpiry: number;
}

function longRunReadyState(): LongRunFixture {
  const depositProbe = expireDepositOrder(repeatDefaultCreditState());
  const defaulted = depositProbe.state;
  const resources = Object.fromEntries(
    Object.entries(defaulted.resources).map(([resourceId, amount]) => [
      resourceId,
      resourceId === 'coin' || resourceId === 'labor' ? amount : Math.min(Math.max(amount, 4), 12),
    ]),
  );
  return {
    depositOrder: depositProbe.order,
    coinBeforeDeposit: depositProbe.coinBeforeDeposit,
    coinAfterDeposit: depositProbe.coinAfterDeposit,
    coinAfterDepositExpiry: depositProbe.coinAfterExpiry,
    state: {
      ...defaulted,
      seed: 20260617,
      turn: 0,
      maxTurns: 72,
      status: 'playing',
      devMode: false,
      unlockedRegions: regionIds,
      currentRegion: 'jiangnan',
      currentSubregion: 'jiangnan-baigongyuan',
      flags: [
        ...new Set([
          ...defaulted.flags,
          'route-known:route-bashu-xueyu-snow-pass',
        ]),
      ],
      resources: {
        ...resources,
        coin: 520,
        labor: 8,
        pingyaoLacquer: Math.max(6, resources.pingyaoLacquer ?? 0),
        ironIngot: Math.max(6, resources.ironIngot ?? 0),
        coal: Math.max(6, resources.coal ?? 0),
        timber: Math.max(6, resources.timber ?? 0),
        teaLeaf: Math.max(6, resources.teaLeaf ?? 0),
      },
      regionReputation: {
        ...Object.fromEntries(regionIds.map((regionId) => [regionId, 28])),
        xueyu: 0,
        xiyu: 0,
        sanjin: 20,
        jingji: 24,
      },
      routeStability: {
        ...Object.fromEntries(routeIds.map((routeId) => [routeId, 62])),
        'route-bashu-xueyu-snow-pass': 24,
        'route-xueyu-xiyu-caravan': 6,
        'route-jiangnan-ganpo-kiln': 38,
        'route-ganpo-huizhou-merchant': 40,
        'route-jingji-sanjin-official': 36,
      },
      workshopUpgrades: stressWorkshopUpgrades(),
      pendingEvent: null,
      pendingEscortCrisis: null,
      pendingSupplyCrisis: null,
      pendingActivityStallClosing: null,
    },
  };
}

function resolvePressureIfNeeded(state: GameState): GameState {
  if (!state.pendingSupplyCrisis) return state;
  const crisis = state.pendingSupplyCrisis;
  const choiceId =
    (state.resources.coin ?? 0) >= crisis.coinCost
      ? 'buy-relief'
      : (state.resources.labor ?? 0) >= crisis.laborCost
        ? 'send-workers'
        : 'accept-shortage';
  let next = gameReducer(state, { type: 'RESOLVE_SUPPLY_CRISIS', choiceId }, quietContent);
  for (const record of next.supplyCrisisRecords.filter((candidate) => candidate.status !== 'closed')) {
    next = gameReducer(next, { type: 'STABILIZE_SUPPLY_ROUTE', recordId: record.id }, quietContent);
  }
  return next;
}

function expectResourcesNonNegative(state: GameState, label: string) {
  for (const [resourceId, amount] of Object.entries(state.resources)) {
    expect(amount, `${label}:${resourceId}`).toBeGreaterThanOrEqual(0);
  }
}

function settleLedgerByFollowUpOrder(state: GameState): GameState {
  const aftertalk = gameReducer(
    withPolishGallery({
      ...state,
      npcAffinity: { ...state.npcAffinity, 'sj-lei-zhanggui': 54 },
    }),
    {
      type: 'USE_NPC_FUNCTION',
      npcId: 'sj-lei-zhanggui',
      functionKind: 'homeVisit',
      homeVisitChoiceId: 'lei-compound-ledger-order',
    },
    content,
  );
  const record = aftertalk.homeVisitRecords[0];
  const settlementOrder = activeOrder(aftertalk, (candidate) => candidate.id === record.referralOrderId);
  return gameReducer(aftertalk, { type: 'FULFILL_ORDER', orderId: settlementOrder.id }, content);
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
    quietContent,
  );
}

describe('F4 long-run economy closure', () => {
  it('survives a 48-turn all-route economy run with upkeep, supply pressure, deposits and Sanjin interest ledgers', () => {
    const fixture = longRunReadyState();
    let state = fixture.state;

    expect(state.flags).toContain('credit-repeat-default:sj-lei-zhanggui');
    expect(state.flags).toContain('sanjin-credit-interest-accrued');
    expect(state.flags).toContain('deposit-forfeited:jj-song-yasi');
    expect(fixture.depositOrder.orderKind).toBe('palace');
    expect(fixture.depositOrder.depositCoin ?? 0).toBeGreaterThan(0);
    expect(fixture.coinAfterDeposit).toBe(fixture.coinBeforeDeposit - (fixture.depositOrder.depositCoin ?? 0));
    expect(fixture.coinAfterDepositExpiry).toBe(fixture.coinAfterDeposit);
    expect(new Set(state.activeOrders.map((order) => order.regionId).filter(Boolean)).size).toBeGreaterThanOrEqual(2);
    expect(state.economyLedgerRecords[0]).toMatchObject({
      ledgerId: 'economy-ledger-sanjin-piaohao-credit',
      event: 'credit-repeat-defaulted',
      status: 'defaulted',
      npcId: 'sj-lei-zhanggui',
      defaultCount: 2,
    });
    expect(state.economyLedgerRecords[0].interest).toBeGreaterThan(0);

    for (let i = 0; i < 48; i += 1) {
      state = gameReducer(state, { type: 'END_TURN' }, quietContent);
      state = resolvePressureIfNeeded(state);
      state = { ...state, pendingEvent: null };

      expect(state.status, `turn-${i}`).toBe('playing');
      expect(state.pendingSupplyCrisis, `turn-${i}:pendingSupplyCrisis`).toBeNull();
      expectResourcesNonNegative(state, `turn-${i}`);
      for (const routeId of routeIds) {
        expect(routeStabilityOf(state, routeId), `${i}:${routeId}`).toBeGreaterThanOrEqual(0);
        expect(routeStabilityOf(state, routeId), `${i}:${routeId}`).toBeLessThanOrEqual(100);
      }
    }

    const maintenanceEvents = state.workshopUpgrades.reduce(
      (sum, upgrade) => sum + (upgrade.maintenancePaid ?? 0) + (upgrade.maintenanceMissed ?? 0),
      0,
    );
    const maintenancePaid = state.workshopUpgrades.reduce((sum, upgrade) => sum + (upgrade.maintenancePaid ?? 0), 0);
    expect(maintenanceEvents).toBeGreaterThanOrEqual(48 * stressWorkshopUpgrades().length);
    expect(maintenancePaid).toBeGreaterThan(0);
    expect(state.workshopUpgrades.every((upgrade) => (upgrade.maintenancePaid ?? 0) > 0)).toBe(true);
    expect(state.supplyCrisisRecords.length).toBeGreaterThan(0);
    expect(state.supplyCrisisRecords.every((record) => record.status === 'closed')).toBe(true);
    expect(state.supplyCrisisRecords.some((record) => Boolean(record.resourceId))).toBe(true);
    expect(state.resources.coin ?? 0).toBeGreaterThan(0);
    for (const routeId of WATCHED_ROUTE_IDS) {
      expect(routeStabilityOf(state, routeId), routeId).toBeGreaterThan(0);
    }

    const leiName = ALL_NPCS.find((npc) => npc.id === 'sj-lei-zhanggui')?.name;
    const unsettledReport = reportFor({
      ...state,
      npcAffinity: { ...state.npcAffinity, 'sj-lei-zhanggui': 56 },
    });
    expect(unsettledReport.status).toBe('ended');
    const unsettledLeiOutcome = unsettledReport.report?.relationshipOutcomes?.find((line) =>
      Boolean(leiName && line.includes(leiName)),
    );
    expect(unsettledLeiOutcome ?? '').not.toBe('');

    const settled = settleLedgerByFollowUpOrder(state);
    expect(settled.flags).toContain('sanjin-credit-interest-settled');
    expect(settled.flags).toContain('credit-repeat-default-settled:sj-lei-zhanggui');
    expect(settled.economyLedgerRecords[0]).toMatchObject({
      ledgerId: 'economy-ledger-sanjin-piaohao-credit',
      event: 'credit-interest-settled',
      status: 'settled',
      balance: 0,
    });
    const settledReport = reportFor({
      ...settled,
      npcAffinity: { ...settled.npcAffinity, 'sj-lei-zhanggui': 56 },
    });
    const settledLeiOutcome = settledReport.report?.relationshipOutcomes?.find((line) =>
      Boolean(leiName && line.includes(leiName)),
    );
    expect(settledReport.status).toBe('ended');
    expect(settledLeiOutcome ?? '').not.toBe('');
    expect(settledLeiOutcome).not.toBe(unsettledLeiOutcome);
  });
});
