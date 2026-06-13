import { describe, expect, it } from 'vitest';
import { ACHIEVEMENTS } from '../../data/achievements';
import { STARTING_APPRENTICES } from '../../data/apprentices';
import { CRAFTS } from '../../data/crafts';
import { EVENTS } from '../../data/events';
import { INDUSTRIES } from '../../data/industries';
import { ALL_NPCS } from '../../data/npcs';
import {
  PRIORITY_ANCHOR_REGION_IDS,
  PRIORITY_SCOPE_REQUIREMENTS,
} from '../../data/priorityScope';
import { REGION_CONTENT } from '../../data/regionContent';
import { REGIONS } from '../../data/regions';
import { RESOURCES } from '../../data/resources';
import { createInitialState, gameReducer, type GameContent, type GameState } from '../';

const content: GameContent = {
  crafts: CRAFTS,
  apprentices: STARTING_APPRENTICES,
  events: EVENTS,
  industries: INDUSTRIES,
  regions: REGIONS,
  achievements: ACHIEVEMENTS,
  resources: RESOURCES,
  npcs: ALL_NPCS,
  regionContent: REGION_CONTENT,
};

interface PriorityNpcOrderPlan {
  regionId: string;
  npcId: string;
}

const ORDER_PLANS: PriorityNpcOrderPlan[] = [
  { regionId: 'jiangnan', npcId: 'jn-qiao-zhaoye' },
  { regionId: 'bashu', npcId: 'bs-zhuo-jinniang' },
  { regionId: 'lingnan', npcId: 'ln-wu-haichao' },
  { regionId: 'ganpo', npcId: 'gp-wen-yaotou' },
  { regionId: 'xiyu', npcId: 'xu-a-yue' },
];

const npcById = new Map(ALL_NPCS.map((npc) => [npc.id, npc]));
const regionById = new Map(REGIONS.map((region) => [region.id, region]));

function freshState(): GameState {
  return createInitialState(CRAFTS, STARTING_APPRENTICES, 20260614, undefined, REGIONS);
}

function stateForOrderPlan(plan: PriorityNpcOrderPlan): GameState {
  const base = freshState();
  const npc = npcById.get(plan.npcId);
  const subregionId = npc?.subregionId ?? regionById.get(plan.regionId)?.subregions[0]?.id ?? plan.regionId;

  return {
    ...base,
    currentRegion: plan.regionId,
    currentSubregion: subregionId,
    unlockedRegions: [...new Set([...base.unlockedRegions, plan.regionId])],
    resources: { ...base.resources, coin: 999, labor: 99 },
    npcAffinity: { ...base.npcAffinity, [plan.npcId]: 18 },
    regionReputation: { ...base.regionReputation, [plan.regionId]: 24 },
  };
}

describe('priority NPC order feedback flow', () => {
  it('keeps one runnable NPC order feedback chain for every priority anchor region', () => {
    expect(ORDER_PLANS.map((plan) => plan.regionId)).toEqual(PRIORITY_ANCHOR_REGION_IDS);

    for (const plan of ORDER_PLANS) {
      const requirement = PRIORITY_SCOPE_REQUIREMENTS.find((entry) => entry.regionId === plan.regionId);
      const npc = npcById.get(plan.npcId);

      expect(requirement?.tier, plan.regionId).toBe('anchor');
      expect(requirement?.requiredNpcIds, plan.regionId).toContain(plan.npcId);
      expect(npc?.regionId, plan.npcId).toBe(plan.regionId);
      expect(npc?.functions, plan.npcId).toContain('order');

      let state = stateForOrderPlan(plan);
      const reputationBeforeOrder = state.regionReputation[plan.regionId] ?? 0;
      state = gameReducer(state, { type: 'USE_NPC_FUNCTION', npcId: plan.npcId, functionKind: 'order' }, content);

      const order = state.activeOrders.find((entry) => entry.npcId === plan.npcId && entry.status === 'active');
      expect(order, `${plan.npcId}:order`).toBeTruthy();
      if (!order) continue;

      expect(order.regionId).toBe(plan.regionId);
      expect(order.quantity).toBeGreaterThan(0);
      expect(order.rewardCoin).toBeGreaterThan(0);
      expect(order.minQuality).toBeGreaterThan(0);
      expect(state.flags).toContain(`npc-order:${plan.npcId}`);

      const ready = {
        ...state,
        resources: { ...state.resources, [order.resourceId]: order.quantity },
      };
      const coinBeforeDelivery = ready.resources.coin ?? 0;
      const affinityBeforeDelivery = ready.npcAffinity[plan.npcId] ?? 0;

      const delivered = gameReducer(ready, { type: 'FULFILL_ORDER', orderId: order.id }, content);

      expect(delivered.activeOrders.find((entry) => entry.id === order.id)?.status).toBe('completed');
      expect(delivered.resources[order.resourceId] ?? 0).toBe(0);
      expect(delivered.resources.coin ?? 0).toBe(coinBeforeDelivery + order.rewardCoin);
      expect(delivered.npcAffinity[plan.npcId]).toBeGreaterThan(affinityBeforeDelivery);
      expect(delivered.regionReputation[plan.regionId]).toBeGreaterThan(reputationBeforeOrder);
      expect(delivered.flags).toContain(`order-completed:${order.id}`);
      expect(delivered.flags).toContain(`npc-order-completed:${plan.npcId}`);

      for (const routeId of order.routeIds ?? []) {
        expect(delivered.flags, `${plan.npcId}:${routeId}`).toContain(`route-known:${routeId}`);
      }
    }
  });
});
