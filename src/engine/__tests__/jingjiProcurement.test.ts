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

describe('Jingji palace procurement gating', () => {
  it('binds Song Yasi as the chapter procurement gatekeeper', () => {
    const chapter = REGION_CHAPTERS.find((item) => item.id === 'chapter-jingji-palace-procurement');
    const song = ALL_NPCS.find((item) => item.id === 'jj-song-yasi');

    expect(song?.functions).toEqual(expect.arrayContaining(['order', 'route', 'escort']));
    expect(chapter?.orderHooks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ source: 'activity', id: 'jj-official-gate', readsItemState: true }),
        expect.objectContaining({ source: 'homeVisit', id: 'homevisit-lan-palace-return', readsItemState: true }),
        expect.objectContaining({ source: 'collab', id: 'collab-lan-cloisonne-blue', readsItemState: true }),
      ]),
    );
    expect(chapter?.nextActions.some((item) => item.includes('采办许可'))).toBe(true);
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
