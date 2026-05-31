import { describe, it, expect } from 'vitest';
import { gameReducer } from '../reducer';
import { createInitialState } from '../state';
import type { GameContent } from '../reducer';
import { CRAFTS } from '../../data/crafts';
import { STARTING_APPRENTICES } from '../../data/apprentices';
import { EVENTS } from '../../data/events';
import { INDUSTRIES } from '../../data/industries';
import { REGIONS } from '../../data/regions';

const content: GameContent = {
  crafts: CRAFTS,
  apprentices: STARTING_APPRENTICES,
  events: EVENTS,
  industries: INDUSTRIES,
  regions: REGIONS,
};

function freshState() {
  return createInitialState(content.crafts, content.apprentices, 12345, undefined, content.regions);
}

describe('gameReducer', () => {
  it('NEW_GAME 重置为可游玩状态', () => {
    const s = gameReducer(freshState(), { type: 'NEW_GAME', seed: 1 }, content);
    expect(s.status).toBe('playing');
    expect(s.turn).toBe(1);
    expect(s.crafts.length).toBeGreaterThan(0);
  });

  it('RUN_PROCESS 会产出并消耗人力', () => {
    const s0 = freshState();
    const craftId = s0.crafts[0].craftId;
    const s1 = gameReducer(s0, { type: 'RUN_PROCESS', craftId, skipStepIds: [] }, content);
    const before = s0.crafts.find((c) => c.craftId === craftId)!;
    const after = s1.crafts.find((c) => c.craftId === craftId)!;
    expect(after.produced).toBe(before.produced + 1);
    expect(s1.resources.labor).toBeLessThan(s0.resources.labor);
  });

  it('END_TURN 推进季节并补给资源', () => {
    const s0 = freshState();
    const s1 = gameReducer(s0, { type: 'END_TURN' }, content);
    // 要么进入下一季，要么因抽到事件而等待处理
    expect(s1.turn === s0.turn + 1 || s1.pendingEvent !== null).toBe(true);
  });

  it('初始状态解锁首发地区并定位', () => {
    const s = freshState();
    expect(s.unlockedRegions).toContain('jiangnan');
    expect(s.currentRegion).toBe('jiangnan');
  });

  it('GATHER_RESOURCE 在本地产业产出半成品并消耗原料/人力', () => {
    // 江南具备 smelt-iron（冶铁）：消耗 ironOre+coal，产出 ironIngot
    let s = freshState();
    s = { ...s, resources: { ...s.resources, ironOre: 4, coal: 2 } };
    const before = s.resources.labor;
    const s1 = gameReducer(s, { type: 'GATHER_RESOURCE', industryId: 'smelt-iron', quality: 1 }, content);
    expect((s1.resources.ironIngot ?? 0)).toBeGreaterThan(0);
    expect(s1.resources.ironOre).toBeLessThan(s.resources.ironOre);
    expect(s1.resources.labor).toBeLessThan(before);
  });

  it('GATHER_RESOURCE 拒绝本地不具备的产业', () => {
    const s = freshState(); // 江南不具备 refine-silver（提银）
    const s1 = gameReducer(s, { type: 'GATHER_RESOURCE', industryId: 'refine-silver' }, content);
    expect(s1.resources.silverStock ?? 0).toBe(0);
  });

  it('UNLOCK_REGION 解锁相邻地区并扣除路资', () => {
    let s = freshState();
    s = { ...s, resources: { ...s.resources, coin: 100 } };
    // 江南相邻 huizhou（徽州）
    const s1 = gameReducer(s, { type: 'UNLOCK_REGION', regionId: 'huizhou' }, content);
    expect(s1.unlockedRegions).toContain('huizhou');
    expect(s1.resources.coin).toBeLessThan(s.resources.coin);
  });

  it('UNLOCK_REGION 拒绝不相邻地区', () => {
    let s = freshState();
    s = { ...s, resources: { ...s.resources, coin: 100 } };
    // 雪域与江南不相邻
    const s1 = gameReducer(s, { type: 'UNLOCK_REGION', regionId: 'xueyu' }, content);
    expect(s1.unlockedRegions).not.toContain('xueyu');
  });
});
