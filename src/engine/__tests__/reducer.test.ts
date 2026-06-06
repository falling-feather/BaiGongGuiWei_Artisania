import { describe, it, expect } from 'vitest';
import { gameReducer, nextStoryBeat } from '../reducer';
import { createInitialState } from '../state';
import type { GameContent } from '../reducer';
import { CRAFTS } from '../../data/crafts';
import { STARTING_APPRENTICES } from '../../data/apprentices';
import { EVENTS } from '../../data/events';
import { INDUSTRIES } from '../../data/industries';
import { REGIONS } from '../../data/regions';
import { ACHIEVEMENTS } from '../../data/achievements';
import { STORY_BEATS, renderStoryLine } from '../../data/story';
import { RESOURCES } from '../../data/resources';
import { NPCS } from '../../data/npcs';
import { QUESTS } from '../../data/quests';
import { orderPrice } from '../reducer';

const content: GameContent = {
  crafts: CRAFTS,
  apprentices: STARTING_APPRENTICES,
  events: EVENTS,
  industries: INDUSTRIES,
  regions: REGIONS,
  achievements: ACHIEVEMENTS,
  resources: RESOURCES,
  npcs: NPCS,
  quests: QUESTS,
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

  it('TAKE_ORDER 交付成品：消耗 1 件库存并按品质入账', () => {
    let s = freshState();
    // 备好一件蓝染成品
    s = { ...s, resources: { ...s.resources, indigoCloth: 1, coin: 0 } };
    const s1 = gameReducer(s, { type: 'TAKE_ORDER', craftId: 'indigo-dyeing' }, content);
    const heritage = s.crafts.find((c) => c.craftId === 'indigo-dyeing')!.metrics.heritage;
    const expected = orderPrice(20, heritage); // indigoCloth value=20
    expect(s1.resources.indigoCloth).toBe(0);
    expect(s1.resources.coin).toBe(expected);
  });

  it('TAKE_ORDER 无成品时拒绝交付且不进账', () => {
    let s = freshState();
    s = { ...s, resources: { ...s.resources, indigoCloth: 0, coin: 5 } };
    const s1 = gameReducer(s, { type: 'TAKE_ORDER', craftId: 'indigo-dyeing' }, content);
    expect(s1.resources.coin).toBe(5);
    expect(s1.resources.indigoCloth ?? 0).toBe(0);
  });

  it('orderPrice 随传承品质单调上升', () => {
    expect(orderPrice(20, 100)).toBeGreaterThan(orderPrice(20, 0));
    expect(orderPrice(20, 50)).toBe(20);
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
    expect(s.currentSubregion).toBe('jiangnan-suhang');
  });

  it('初始状态包含玩家档案、日历和田圃槽位', () => {
    const s = freshState();
    expect(s.profile.title).toBe('粗手生人');
    expect(s.profile.attributes.craft).toBe(5);
    expect(s.calendar.day).toBe(1);
    expect(s.calendar.phase).toBe('morning');
    expect(s.farmPlots.length).toBeGreaterThanOrEqual(3);
  });

  it('ADVANCE_TIME 推进日内时段，夜间后进入下一日', () => {
    let s = freshState();
    s = gameReducer(s, { type: 'ADVANCE_TIME' }, content);
    expect(s.calendar.phase).toBe('afternoon');
    s = { ...s, calendar: { ...s.calendar, phase: 'night' }, pendingEvent: null };
    const next = gameReducer(s, { type: 'ADVANCE_TIME' }, content);
    expect(next.calendar.day).toBe(s.calendar.day + 1);
    expect(next.calendar.phase).toBe('morning');
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

  it('GATHER_RESOURCE 采集业（仅耗工时）按本地特产授权产出', () => {
    // 江南特产 cocoonSilk → harvest-cocoon 为采集业，仅耗工时
    const s = freshState();
    const s1 = gameReducer(s, { type: 'GATHER_RESOURCE', industryId: 'harvest-cocoon', quality: 1 }, content);
    expect((s1.resources.cocoonSilk ?? 0)).toBeGreaterThan(0);
    expect(s1.resources.labor).toBeLessThan(s.resources.labor);
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

  it('TRAVEL 切换大地区时进入该地区默认小地区', () => {
    let s = freshState();
    s = { ...s, resources: { ...s.resources, coin: 100 } };
    s = gameReducer(s, { type: 'UNLOCK_REGION', regionId: 'huizhou' }, content);
    const s1 = gameReducer(s, { type: 'TRAVEL', regionId: 'huizhou' }, content);
    expect(s1.currentRegion).toBe('huizhou');
    expect(s1.currentSubregion).toBe('huizhou-ink-alley');
  });

  it('TRAVEL_SUBREGION 在当前大地区内切换小地区', () => {
    const s = freshState();
    const s1 = gameReducer(s, { type: 'TRAVEL_SUBREGION', subregionId: 'jiangnan-longquan' }, content);
    expect(s1.currentRegion).toBe('jiangnan');
    expect(s1.currentSubregion).toBe('jiangnan-longquan');
  });

  it('UNLOCK_REGION 拒绝不相邻地区', () => {
    let s = freshState();
    s = { ...s, resources: { ...s.resources, coin: 100 } };
    // 雪域与江南不相邻
    const s1 = gameReducer(s, { type: 'UNLOCK_REGION', regionId: 'xueyu' }, content);
    expect(s1.unlockedRegions).not.toContain('xueyu');
  });

  it('成就：完成首批出品后解锁「初执匠作」', () => {
    const s0 = freshState();
    expect(s0.achievements).toEqual([]);
    const craftId = s0.crafts[0].craftId;
    const s1 = gameReducer(s0, { type: 'RUN_PROCESS', craftId, skipStepIds: [] }, content);
    expect(s1.achievements).toContain('first-step');
  });

  it('开发者模式：fallingfeather 解锁全境并获得海量资源', () => {
    const dev = gameReducer(
      freshState(),
      { type: 'NEW_GAME', seed: 1, playerName: 'FallingFeather' },
      content,
    );
    expect(dev.devMode).toBe(true);
    expect(dev.playerName).toBe('FallingFeather');
    expect(dev.unlockedRegions.length).toBe(content.regions!.length);
    expect(dev.resources.coin).toBeGreaterThan(9999);

    // 推进季节后人力仍保持无限（不被重置为每季预算）
    const next = gameReducer(dev, { type: 'END_TURN' }, content);
    expect(next.resources.labor).toBeGreaterThan(9999);
  });

  it('普通玩家：名字不触发开发者模式', () => {
    const normal = gameReducer(
      freshState(),
      { type: 'NEW_GAME', seed: 1, playerName: '阿青' },
      content,
    );
    expect(normal.devMode).toBe(false);
    expect(normal.unlockedRegions.length).toBeLessThan(content.regions!.length);
  });

  it('剧情：开局触发楔子，SEEN_STORY 后接续下一节点', () => {
    const withStory: GameContent = { ...content, story: STORY_BEATS };
    const s0 = gameReducer(freshState(), { type: 'NEW_GAME', seed: 1, playerName: '阿青' }, withStory);
    const first = nextStoryBeat(s0, withStory);
    expect(first?.id).toBe('prologue');

    const s1 = gameReducer(s0, { type: 'SEEN_STORY', storyId: 'prologue' }, withStory);
    expect(s1.seenStory).toContain('prologue');
    expect(nextStoryBeat(s1, withStory)?.id).not.toBe('prologue');
  });

  it('剧情：renderStoryLine 用玩家名替换占位符，空名回退', () => {
    expect(renderStoryLine('{name}启程', '阿青')).toBe('阿青启程');
    expect(renderStoryLine('{name}启程', '   ')).toBe('无名匠人启程');
  });

  it('剧情分支：抉择写入 flag，第4季触发对应分支节点', () => {
    const withStory: GameContent = { ...content, story: STORY_BEATS };
    let s = gameReducer(freshState(), { type: 'NEW_GAME', seed: 1, playerName: '阿青' }, withStory);
    // 读楔子
    s = gameReducer(s, { type: 'SEEN_STORY', storyId: 'prologue' }, withStory);
    // 立心：选守正
    s = gameReducer(s, { type: 'SEEN_STORY', storyId: 'oath', choiceId: 'tradition' }, withStory);
    expect(s.flags).toContain('oath-tradition');

    // 推进到第 4 季
    while (s.turn < 4) {
      s = gameReducer(s, { type: 'RESOLVE_EVENT', choiceId: 'resist' }, withStory); // 清掉可能的事件
      if (s.pendingEvent) s = { ...s, pendingEvent: null };
      s = gameReducer(s, { type: 'END_TURN' }, withStory);
    }
    const beat = nextStoryBeat(s, withStory);
    expect(beat?.id).toBe('path-tradition');
  });

  it('剧情分支：事件选项写入 flag，触发回响节点', () => {
    const withStory: GameContent = { ...content, story: STORY_BEATS };
    let s = gameReducer(freshState(), { type: 'NEW_GAME', seed: 1, playerName: '阿青' }, withStory);
    s = { ...s, flags: [...s.flags, 'chased-trend'] };
    // 看过早期节点，确保 after-trend 能被选中
    s = { ...s, seenStory: ['prologue', 'oath', 'first-craft'] };
    const ids: string[] = [];
    let beat = nextStoryBeat(s, withStory);
    while (beat) {
      ids.push(beat.id);
      s = gameReducer(s, { type: 'SEEN_STORY', storyId: beat.id }, withStory);
      beat = nextStoryBeat(s, withStory);
    }
    expect(ids).toContain('after-trend');
  });

  it('供应链：RUN_PROCESS 消耗半成品并产出成品', () => {
    const s0 = freshState();
    const before = s0.resources.indigoVat ?? 0;
    const s1 = gameReducer(
      s0,
      { type: 'RUN_PROCESS', craftId: 'indigo-dyeing', skipStepIds: [] },
      content,
    );
    expect(s1.resources.indigoCloth ?? 0).toBe(1);
    expect(s1.resources.indigoVat ?? 0).toBe(before - 3);
  });

  it('供应链：半成品不足时拒绝开工，不产成品也不计数', () => {
    let s = freshState();
    s = { ...s, resources: { ...s.resources, indigoVat: 1 } };
    const s1 = gameReducer(
      s,
      { type: 'RUN_PROCESS', craftId: 'indigo-dyeing', skipStepIds: [] },
      content,
    );
    expect(s1.resources.indigoCloth ?? 0).toBe(0);
    expect(s1.crafts.find((c) => c.craftId === 'indigo-dyeing')!.produced).toBe(0);
  });

  it('个性化结局：守正抉择 + 高传承的尾声呼应玩家名号', () => {
    let s = gameReducer(freshState(), { type: 'NEW_GAME', seed: 1, playerName: '阿青' }, content);
    // 立心守正 + 风向坚守
    s = { ...s, flags: [...s.flags, 'oath-tradition', 'kept-tradition'] };
    // 拉高传承度，并推进到终局季
    s = { ...s, metrics: { ...s.metrics, heritage: 80 }, turn: s.maxTurns };
    s = gameReducer(s, { type: 'END_TURN' }, content);
    expect(s.status).toBe('ended');
    expect(s.report?.epilogue).toContain('阿青');
    expect(s.report?.epilogue).toContain('守正');
    expect(s.report?.epilogue).toContain('不随波');
  });

  it('TALK_NPC 提升好感度并封顶 100', () => {
    const npcId = NPCS[0].id;
    let s = freshState();
    expect(s.npcAffinity[npcId] ?? 0).toBe(0);
    s = gameReducer(s, { type: 'TALK_NPC', npcId }, content);
    expect(s.npcAffinity[npcId]).toBe(8);
    expect(s.npcStates[npcId].talks).toBe(1);
    expect(s.npcStates[npcId].stage).toBe('stranger');
    expect(s.profile.attributes.people).toBeGreaterThan(5);
    // 反复攀谈不超过 100
    for (let i = 0; i < 30; i++) s = gameReducer(s, { type: 'TALK_NPC', npcId }, content);
    expect(s.npcAffinity[npcId]).toBe(100);
    expect(s.npcStates[npcId].stage).toBe('confidant');
  });

  it('COMPLETE_QUEST：好感不足时拒绝交付', () => {
    const quest = QUESTS[0];
    let s = freshState();
    // 满足成品条件，但好感为 0
    s = { ...s, resources: { ...s.resources, bambooWare: 1, indigoCloth: 1 } };
    s = gameReducer(s, { type: 'COMPLETE_QUEST', questId: quest.id }, content);
    expect(s.completedQuests).not.toContain(quest.id);
  });

  it('COMPLETE_QUEST：好感+条件满足时交付领赏并记完成', () => {
    const quest = QUESTS.find((q) => q.id === 'q-bamboo-basket')!;
    let s = freshState();
    s = { ...s, resources: { ...s.resources, bambooWare: 1 } };
    // 攀谈至好感达门槛
    for (let i = 0; i < 3; i++) s = gameReducer(s, { type: 'TALK_NPC', npcId: quest.npcId }, content);
    expect(s.npcAffinity[quest.npcId]).toBeGreaterThanOrEqual(quest.requireAffinity);
    const coinBefore = s.resources.coin ?? 0;
    s = gameReducer(s, { type: 'COMPLETE_QUEST', questId: quest.id }, content);
    expect(s.completedQuests).toContain(quest.id);
    expect(s.resources.coin).toBe(coinBefore + (quest.reward.coin ?? 0));
    // 重复交付无效
    const again = gameReducer(s, { type: 'COMPLETE_QUEST', questId: quest.id }, content);
    expect(again.resources.coin).toBe(s.resources.coin);
  });
});
