import { describe, it, expect } from 'vitest';
import { gameReducer, itemDefectSummary, nextStoryBeat, orderPrice } from '../reducer';
import { loreProgress, unlockedLoreEntries } from '../lore';
import { createInitialState } from '../state';
import type { GameContent } from '../reducer';
import type { ActiveOrder, GameState, ItemInstance } from '../types';
import { CRAFTS } from '../../data/crafts';
import { STARTING_APPRENTICES } from '../../data/apprentices';
import { EVENTS } from '../../data/events';
import { INDUSTRIES } from '../../data/industries';
import { REGIONS } from '../../data/regions';
import { ACHIEVEMENTS } from '../../data/achievements';
import { STORY_BEATS, renderStoryLine } from '../../data/story';
import { RESOURCES } from '../../data/resources';
import { ALL_NPCS, NPCS } from '../../data/npcs';
import { QUESTS } from '../../data/quests';
import { ITEM_DESCRIPTOR_RULES } from '../../data/itemDescriptors';
import { LORE_ENTRIES } from '../../data/loreEntries';
import { CRAFT_INTERACTIONS } from '../../data/craftInteractions';
import { WORKSHOP_UPGRADES } from '../../data/workshopUpgrades';
import { ACTIVITY_CHALLENGES } from '../../data/activityChallenges';
import { COLLAB_RECIPES, ESCORT_ENCOUNTERS, HOME_VISITS, REGION_ACTIVITIES, REGION_CONTENT, REGION_ROUTES } from '../../data/regionContent';
import { localIndustriesForRegion } from '../../data/regionEconomy';
import { SUBREGION_CONTENT, localIndustriesForSubregion } from '../../data/subregionContent';
import { routeStabilityOf } from '../routeStability';
import { buildRegionSpec } from '../../game/regionSpec';

const content: GameContent = {
  crafts: CRAFTS,
  apprentices: STARTING_APPRENTICES,
  events: EVENTS,
  industries: INDUSTRIES,
  regions: REGIONS,
  achievements: ACHIEVEMENTS,
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

function freshState() {
  return createInitialState(content.crafts, content.apprentices, 12345, undefined, content.regions);
}

const demoContent: GameContent = { ...content, events: [] };

function endDemoDay(state: ReturnType<typeof freshState>) {
  return gameReducer(
    { ...state, pendingEvent: null, calendar: { ...state.calendar, phase: 'night' } },
    { type: 'ADVANCE_TIME' },
    demoContent,
  );
}

function forgeHighQualitySword(seedState: ReturnType<typeof freshState> = freshState()) {
  let s = gameReducer(seedState, { type: 'TRAVEL_SUBREGION', subregionId: 'jiangnan-longquan' }, content);
  s = { ...s, resources: { ...s.resources, ironOre: 4, coal: 4, labor: 20 } };
  s = gameReducer(s, { type: 'GATHER_RESOURCE', industryId: 'smelt-iron', quality: 1 }, content);
  const ingotId = s.itemInstances.find((item) => item.resourceId === 'ironIngot')?.id;
  s = gameReducer(s, { type: 'RUN_PROCESS', craftId: 'longquan-sword', skipStepIds: [] }, content);
  return { state: s, ingotId };
}

function forgeDefectiveSword(seedState: ReturnType<typeof freshState> = freshState()) {
  let s = gameReducer(seedState, { type: 'TRAVEL_SUBREGION', subregionId: 'jiangnan-longquan' }, content);
  s = { ...s, resources: { ...s.resources, ironOre: 2, coal: 4, labor: 20 } };
  s = gameReducer(s, { type: 'GATHER_RESOURCE', industryId: 'smelt-iron', quality: 0 }, content);
  s = gameReducer(s, { type: 'RUN_PROCESS', craftId: 'longquan-sword', skipStepIds: ['longquan-sword-prep'] }, content);
  return { state: s, sword: s.itemInstances.find((item) => item.resourceId === 'treasureSword')! };
}

function fireDefectiveCeladon(seedState: ReturnType<typeof freshState> = freshState()) {
  let s = gameReducer(seedState, { type: 'TRAVEL_SUBREGION', subregionId: 'jiangnan-longquan' }, content);
  s = { ...s, resources: { ...s.resources, coal: 4, labor: 24 } };
  s = gameReducer(s, { type: 'GATHER_RESOURCE', industryId: 'harvest-kaolin', quality: 0 }, content);
  s = gameReducer(s, { type: 'GATHER_RESOURCE', industryId: 'mine-kaolin', quality: 0 }, content);
  s = gameReducer(s, { type: 'RUN_PROCESS', craftId: 'celadon', skipStepIds: ['celadon-prep'] }, content);
  return { state: s, celadon: s.itemInstances.find((item) => item.resourceId === 'celadonWare')! };
}

function craftDefectiveUmbrella(seedState: ReturnType<typeof freshState> = freshState()) {
  let s: ReturnType<typeof freshState> = {
    ...seedState,
    currentRegion: 'huizhou',
    currentSubregion: 'huizhou-paper-valley',
    resources: { ...seedState.resources, labor: 40 },
  };
  s = gameReducer(s, { type: 'GATHER_RESOURCE', industryId: 'harvest-qingtan', quality: 0.5 }, content);
  s = gameReducer(s, { type: 'GATHER_RESOURCE', industryId: 'make-paper', quality: 0.5 }, content);
  s = { ...s, currentRegion: 'jiangnan', currentSubregion: 'jiangnan-linan' };
  s = gameReducer(s, { type: 'GATHER_RESOURCE', industryId: 'harvest-bamboo', quality: 0.5 }, content);
  s = gameReducer(s, { type: 'GATHER_RESOURCE', industryId: 'split-bamboo', quality: 0.5 }, content);
  s = gameReducer(s, { type: 'RUN_PROCESS', craftId: 'oilpaper-umbrella', skipStepIds: ['oilpaper-umbrella-prep'] }, content);
  return { state: s, umbrella: s.itemInstances.find((item) => item.resourceId === 'oilpaperUmbrella')! };
}

function weaveDefectiveKesi(seedState: ReturnType<typeof freshState> = freshState()) {
  let s = gameReducer(seedState, { type: 'TRAVEL_SUBREGION', subregionId: 'jiangnan-taihu' }, content);
  s = { ...s, resources: { ...s.resources, pigmentRefined: 1, labor: 32 } };
  s = gameReducer(s, { type: 'GATHER_RESOURCE', industryId: 'harvest-cocoon', quality: 0.35 }, content);
  s = gameReducer(s, { type: 'GATHER_RESOURCE', industryId: 'sericulture', quality: 0.35 }, content);
  s = gameReducer(s, { type: 'RUN_PROCESS', craftId: 'kesi', skipStepIds: ['kesi-prep'] }, content);
  return { state: s, kesi: s.itemInstances.find((item) => item.resourceId === 'kesiSilk')! };
}

function weaveDefectiveShuBrocade(seedState: ReturnType<typeof freshState> = freshState()) {
  let s = gameReducer(seedState, { type: 'TRAVEL_SUBREGION', subregionId: 'jiangnan-taihu' }, content);
  s = { ...s, resources: { ...s.resources, labor: 56 } };
  for (let i = 0; i < 2; i += 1) {
    s = gameReducer(s, { type: 'GATHER_RESOURCE', industryId: 'harvest-cocoon', quality: 0.25 }, content);
    s = gameReducer(s, { type: 'GATHER_RESOURCE', industryId: 'sericulture', quality: 0.25 }, content);
  }
  s = { ...s, unlockedRegions: [...new Set([...s.unlockedRegions, 'bashu'])] };
  s = gameReducer(s, { type: 'TRAVEL', regionId: 'bashu' }, content);
  s = gameReducer(s, { type: 'RUN_PROCESS', craftId: 'shu-brocade', skipStepIds: ['shu-brocade-prep'] }, content);
  return { state: s, brocade: s.itemInstances.find((item) => item.resourceId === 'brocade')! };
}

function dyeDefectiveGambieredSilk(seedState: ReturnType<typeof freshState> = freshState()) {
  let s = gameReducer(seedState, { type: 'TRAVEL_SUBREGION', subregionId: 'jiangnan-suhang' }, content);
  s = { ...s, calendar: { ...s.calendar, weather: 'clear' }, resources: { ...s.resources, labor: 64 } };
  s = gameReducer(s, { type: 'GATHER_RESOURCE', industryId: 'harvest-indigo', quality: 0.25 }, content);
  s = gameReducer(s, { type: 'GATHER_RESOURCE', industryId: 'build-indigo', quality: 0.25 }, content);
  s = { ...s, unlockedRegions: [...new Set([...s.unlockedRegions, 'lingnan'])] };
  s = gameReducer(s, { type: 'TRAVEL', regionId: 'lingnan' }, content);
  s = gameReducer(s, { type: 'TRAVEL_SUBREGION', subregionId: 'lingnan-gambiered-yard' }, content);
  s = gameReducer(s, { type: 'GATHER_RESOURCE', industryId: 'harvest-cocoon', quality: 0.25 }, content);
  s = gameReducer(s, { type: 'GATHER_RESOURCE', industryId: 'sericulture', quality: 0.25 }, content);
  s = gameReducer(s, { type: 'RUN_PROCESS', craftId: 'gambiered-silk', skipStepIds: ['gambiered-silk-prep'] }, content);
  return { state: s, silk: s.itemInstances.find((item) => item.resourceId === 'gambieredSilk')! };
}

function craftDefectiveMiaoSilver(seedState: ReturnType<typeof freshState> = freshState()) {
  let s = gameReducer(seedState, { type: 'TRAVEL_SUBREGION', subregionId: 'jiangnan-longquan' }, content);
  s = { ...s, calendar: { ...s.calendar, weather: 'clear' }, resources: { ...s.resources, labor: 72 } };
  s = gameReducer(s, { type: 'GATHER_RESOURCE', industryId: 'harvest-coal', quality: 0.25 }, content);
  s = { ...s, unlockedRegions: [...new Set([...s.unlockedRegions, 'qiandian'])] };
  s = gameReducer(s, { type: 'TRAVEL', regionId: 'qiandian' }, content);
  s = gameReducer(s, { type: 'GATHER_RESOURCE', industryId: 'harvest-silver-ore', quality: 0.2 }, content);
  s = gameReducer(s, { type: 'GATHER_RESOURCE', industryId: 'refine-silver', quality: 0.2 }, content);
  s = gameReducer(s, { type: 'TRAVEL_SUBREGION', subregionId: 'qiandian-dongchuan-copper' }, content);
  s = gameReducer(s, { type: 'GATHER_RESOURCE', industryId: 'harvest-copper-ore', quality: 0.2 }, content);
  s = gameReducer(s, { type: 'GATHER_RESOURCE', industryId: 'smelt-copper', quality: 0.2 }, content);
  s = gameReducer(s, { type: 'TRAVEL_SUBREGION', subregionId: 'qiandian-miao-village' }, content);
  s = gameReducer(s, { type: 'RUN_PROCESS', craftId: 'miao-silver', skipStepIds: ['miao-silver-prep'] }, content);
  return { state: s, ornament: s.itemInstances.find((item) => item.resourceId === 'silverOrnament')! };
}

function craftDefectiveChuLacquer(seedState: ReturnType<typeof freshState> = freshState()) {
  let s: ReturnType<typeof freshState> = {
    ...seedState,
    calendar: { ...seedState.calendar, weather: 'clear' },
    unlockedRegions: [...new Set([...seedState.unlockedRegions, 'xueyu', 'jingchu'])],
    resources: { ...seedState.resources, labor: 88 },
  };
  s = gameReducer(s, { type: 'TRAVEL', regionId: 'xueyu' }, content);
  s = gameReducer(s, { type: 'GATHER_RESOURCE', industryId: 'harvest-pigment', quality: 0.25 }, content);
  s = gameReducer(s, { type: 'GATHER_RESOURCE', industryId: 'grind-pigment', quality: 0.25 }, content);
  s = gameReducer(s, { type: 'TRAVEL', regionId: 'jingchu' }, content);
  s = gameReducer(s, { type: 'TRAVEL_SUBREGION', subregionId: 'jingchu-chu-lacquer' }, content);
  for (let i = 0; i < 2; i += 1) {
    s = gameReducer(s, { type: 'GATHER_RESOURCE', industryId: 'harvest-lacquer', quality: 0.25 }, content);
    s = gameReducer(s, { type: 'GATHER_RESOURCE', industryId: 'tap-lacquer', quality: 0.25 }, content);
  }
  s = gameReducer(s, { type: 'RUN_PROCESS', craftId: 'chu-lacquer', skipStepIds: ['chu-lacquer-prep'] }, content);
  return { state: s, lacquer: s.itemInstances.find((item) => item.resourceId === 'chuLacquer')! };
}

function fireDefectiveJingdezhenPorcelain(seedState: ReturnType<typeof freshState> = freshState()) {
  let s: ReturnType<typeof freshState> = {
    ...seedState,
    calendar: { ...seedState.calendar, weather: 'clear' },
    unlockedRegions: [...new Set([...seedState.unlockedRegions, 'xueyu', 'ganpo'])],
    resources: { ...seedState.resources, labor: 96 },
  };
  s = gameReducer(s, { type: 'TRAVEL', regionId: 'xueyu' }, content);
  s = gameReducer(s, { type: 'GATHER_RESOURCE', industryId: 'harvest-pigment', quality: 0.25 }, content);
  s = gameReducer(s, { type: 'GATHER_RESOURCE', industryId: 'grind-pigment', quality: 0.25 }, content);
  s = gameReducer(s, { type: 'TRAVEL', regionId: 'ganpo' }, content);
  s = gameReducer(s, { type: 'TRAVEL_SUBREGION', subregionId: 'ganpo-kaolin-hill' }, content);
  s = gameReducer(s, { type: 'GATHER_RESOURCE', industryId: 'harvest-kaolin', quality: 0.25 }, content);
  s = gameReducer(s, { type: 'GATHER_RESOURCE', industryId: 'mine-kaolin', quality: 0.25 }, content);
  s = gameReducer(s, { type: 'TRAVEL_SUBREGION', subregionId: 'ganpo-kiln-town' }, content);
  s = gameReducer(s, { type: 'RUN_PROCESS', craftId: 'jingdezhen-porcelain', skipStepIds: ['jingdezhen-porcelain-prep'] }, content);
  return { state: s, porcelain: s.itemInstances.find((item) => item.resourceId === 'jingdezhenPorcelain')! };
}

function craftDefectiveXuanPaper(seedState: ReturnType<typeof freshState> = freshState()) {
  let s: ReturnType<typeof freshState> = {
    ...seedState,
    calendar: { ...seedState.calendar, weather: 'clear' },
    unlockedRegions: [...new Set([...seedState.unlockedRegions, 'huizhou'])],
    resources: { ...seedState.resources, labor: 96 },
  };
  s = gameReducer(s, { type: 'TRAVEL_SUBREGION', subregionId: 'jiangnan-linan' }, content);
  s = gameReducer(s, { type: 'GATHER_RESOURCE', industryId: 'harvest-bamboo', quality: 0.25 }, content);
  s = gameReducer(s, { type: 'TRAVEL', regionId: 'huizhou' }, content);
  s = gameReducer(s, { type: 'TRAVEL_SUBREGION', subregionId: 'huizhou-paper-valley' }, content);
  for (let i = 0; i < 2; i += 1) {
    s = gameReducer(s, { type: 'GATHER_RESOURCE', industryId: 'harvest-qingtan', quality: 0.25 }, content);
    s = gameReducer(s, { type: 'GATHER_RESOURCE', industryId: 'make-paper', quality: 0.25 }, content);
  }
  s = gameReducer(s, { type: 'RUN_PROCESS', craftId: 'xuan-paper', skipStepIds: ['xuan-paper-prep'] }, content);
  return { state: s, paper: s.itemInstances.find((item) => item.resourceId === 'xuanPaper')! };
}

function craftDefectiveCloisonne(seedState: ReturnType<typeof freshState> = freshState()) {
  let s: ReturnType<typeof freshState> = {
    ...seedState,
    calendar: { ...seedState.calendar, weather: 'clear' },
    unlockedRegions: [...new Set([...seedState.unlockedRegions, 'qiandian', 'xueyu', 'jingji'])],
    resources: { ...seedState.resources, labor: 128 },
  };
  s = gameReducer(s, { type: 'TRAVEL_SUBREGION', subregionId: 'jiangnan-longquan' }, content);
  for (let i = 0; i < 2; i += 1) {
    s = gameReducer(s, { type: 'GATHER_RESOURCE', industryId: 'harvest-coal', quality: 0.25 }, content);
  }
  s = gameReducer(s, { type: 'TRAVEL', regionId: 'qiandian' }, content);
  s = gameReducer(s, { type: 'TRAVEL_SUBREGION', subregionId: 'qiandian-dongchuan-copper' }, content);
  for (let i = 0; i < 2; i += 1) {
    s = gameReducer(s, { type: 'GATHER_RESOURCE', industryId: 'harvest-copper-ore', quality: 0.2 }, content);
  }
  for (let i = 0; i < 2; i += 1) {
    s = gameReducer(s, { type: 'GATHER_RESOURCE', industryId: 'smelt-copper', quality: 0.2 }, content);
  }
  s = gameReducer(s, { type: 'TRAVEL', regionId: 'xueyu' }, content);
  s = gameReducer(s, { type: 'TRAVEL_SUBREGION', subregionId: 'xueyu-pigment-valley' }, content);
  for (let i = 0; i < 3; i += 1) {
    s = gameReducer(s, { type: 'GATHER_RESOURCE', industryId: 'harvest-pigment', quality: 0.2 }, content);
  }
  for (let i = 0; i < 3; i += 1) {
    s = gameReducer(s, { type: 'GATHER_RESOURCE', industryId: 'grind-pigment', quality: 0.2 }, content);
  }
  s = gameReducer(s, { type: 'TRAVEL', regionId: 'jingji' }, content);
  s = gameReducer(s, { type: 'TRAVEL_SUBREGION', subregionId: 'jingji-palace-yard' }, content);
  s = gameReducer(s, { type: 'RUN_PROCESS', craftId: 'cloisonne', skipStepIds: ['cloisonne-prep'] }, content);
  return { state: s, cloisonne: s.itemInstances.find((item) => item.resourceId === 'cloisonne')! };
}

function craftDefectivePingyaoLacquer(seedState: ReturnType<typeof freshState> = freshState()) {
  let s: ReturnType<typeof freshState> = {
    ...seedState,
    calendar: { ...seedState.calendar, weather: 'clear' },
    unlockedRegions: [...new Set([...seedState.unlockedRegions, 'xueyu', 'sanjin'])],
    resources: { ...seedState.resources, labor: 112 },
  };
  s = gameReducer(s, { type: 'TRAVEL', regionId: 'xueyu' }, content);
  s = gameReducer(s, { type: 'TRAVEL_SUBREGION', subregionId: 'xueyu-pigment-valley' }, content);
  for (let i = 0; i < 2; i += 1) {
    s = gameReducer(s, { type: 'GATHER_RESOURCE', industryId: 'harvest-pigment', quality: 0.2 }, content);
    s = gameReducer(s, { type: 'GATHER_RESOURCE', industryId: 'grind-pigment', quality: 0.2 }, content);
  }
  s = gameReducer(s, { type: 'TRAVEL', regionId: 'sanjin' }, content);
  s = gameReducer(s, { type: 'TRAVEL_SUBREGION', subregionId: 'sanjin-lacquer-yard' }, content);
  s = gameReducer(s, { type: 'GATHER_RESOURCE', industryId: 'harvest-lacquer', quality: 0.2 }, content);
  s = gameReducer(s, { type: 'GATHER_RESOURCE', industryId: 'tap-lacquer', quality: 0.2 }, content);
  s = gameReducer(s, { type: 'RUN_PROCESS', craftId: 'pingyao-lacquer', skipStepIds: ['pingyao-lacquer-prep'] }, content);
  return { state: s, lacquer: s.itemInstances.find((item) => item.resourceId === 'pingyaoLacquer')! };
}

describe('gameReducer', () => {
  it('NEW_GAME 重置为可游玩状态', () => {
    const s = gameReducer(freshState(), { type: 'NEW_GAME', seed: 1 }, content);
    expect(s.status).toBe('playing');
    expect(s.turn).toBe(1);
    expect(s.crafts.length).toBeGreaterThan(0);
  });

  it('TRACK_LORE_ENTRY 只设置行脚目标，不改变当前位置', () => {
    const s0 = {
      ...freshState(),
      unlockedRegions: REGIONS.map((region) => region.id),
      currentRegion: 'jiangnan',
      currentSubregion: 'jiangnan-longquan',
    };
    const s1 = gameReducer(s0, { type: 'TRACK_LORE_ENTRY', loreEntryId: 'subregion-ganpo-kiln-town' }, content);

    expect(s1.trackedLoreEntryId).toBe('subregion-ganpo-kiln-town');
    expect(s1.currentRegion).toBe('jiangnan');
    expect(s1.currentSubregion).toBe('jiangnan-longquan');
    expect(s1.log.some((line) => line.includes('行脚目标'))).toBe(true);

    const s2 = gameReducer(s1, { type: 'CLEAR_LORE_TRACKING' }, content);
    expect(s2.trackedLoreEntryId).toBeNull();
    expect(s2.currentRegion).toBe('jiangnan');
    expect(s2.currentSubregion).toBe('jiangnan-longquan');
  });

  it('RUN_PROCESS 会产出并消耗人力', () => {
    const s0 = freshState();
    const craftId = s0.crafts[0].craftId;
    const s1 = gameReducer(s0, { type: 'RUN_PROCESS', craftId, skipStepIds: [] }, content);
    const before = s0.crafts.find((c) => c.craftId === craftId)!;
    const after = s1.crafts.find((c) => c.craftId === craftId)!;
    expect(after.produced).toBe(before.produced + 1);
    expect(s1.resources.labor).toBeLessThan(s0.resources.labor);
    expect(s1.itemInstances[0]?.resourceId).toBe(content.crafts[0].outputResourceId);
    expect(s1.itemInstances[0]?.appraisal.length).toBeGreaterThan(0);
  });

  it('RUN_PROCESS 会按工艺交互规格写入质量维度与可返修缺陷', () => {
    let s = gameReducer(freshState(), { type: 'TRAVEL_SUBREGION', subregionId: 'jiangnan-longquan' }, content);
    s = { ...s, resources: { ...s.resources, ironOre: 2, coal: 4, labor: 20 } };
    s = gameReducer(s, { type: 'GATHER_RESOURCE', industryId: 'smelt-iron', quality: 0 }, content);
    s = gameReducer(s, { type: 'RUN_PROCESS', craftId: 'longquan-sword', skipStepIds: ['longquan-sword-prep'] }, content);

    const sword = s.itemInstances.find((item) => item.resourceId === 'treasureSword')!;

    expect(sword.qualityDimensions?.resilience).toBeLessThan(0.62);
    expect(sword.defects?.some((defect) => defect.id === 'sword-brittle-core')).toBe(true);
    expect(sword.defects?.find((defect) => defect.id === 'sword-brittle-core')?.sourceStageName).toBe('选铁定剑形');
    expect(itemDefectSummary(sword)).toContain('病根：省略「选铁定剑形」关联工序');
    expect(sword.appraisal).toContain('可择法返修');
  });

  it('RUN_PROCESS 会把师傅授艺转成后续制作的维度加成与看样记录', () => {
    let baseline = gameReducer(freshState(), { type: 'TRAVEL_SUBREGION', subregionId: 'jiangnan-longquan' }, content);
    baseline = { ...baseline, resources: { ...baseline.resources, ironOre: 2, coal: 4, labor: 20 } };
    baseline = gameReducer(baseline, { type: 'GATHER_RESOURCE', industryId: 'smelt-iron', quality: 0 }, content);
    baseline = gameReducer(baseline, { type: 'RUN_PROCESS', craftId: 'longquan-sword', skipStepIds: ['longquan-sword-prep'] }, content);
    const unmentoredSword = baseline.itemInstances.find((item) => item.resourceId === 'treasureSword')!;

    let guided = gameReducer(freshState(), { type: 'TRAVEL_SUBREGION', subregionId: 'jiangnan-longquan' }, content);
    guided = {
      ...guided,
      npcAffinity: { ...guided.npcAffinity, 'jn-ning-ciqiu': 8 },
      resources: { ...guided.resources, ironOre: 2, coal: 4, labor: 20 },
    };
    guided = gameReducer(guided, { type: 'USE_NPC_FUNCTION', npcId: 'jn-ning-ciqiu', functionKind: 'mentor' }, content);
    guided = gameReducer(guided, { type: 'GATHER_RESOURCE', industryId: 'smelt-iron', quality: 0 }, content);
    guided = gameReducer(guided, { type: 'RUN_PROCESS', craftId: 'longquan-sword', skipStepIds: ['longquan-sword-prep'] }, content);
    const mentoredSword = guided.itemInstances.find((item) => item.resourceId === 'treasureSword')!;
    const unmentoredDefect = unmentoredSword.defects?.find((defect) => defect.id === 'sword-brittle-core');
    const mentoredDefect = mentoredSword.defects?.find((defect) => defect.id === 'sword-brittle-core');

    expect(guided.flags).toContain('craft-mentor-used:longquan-sword');
    expect(mentoredSword.descriptors).toContain('师傅看样');
    expect(mentoredSword.appraisal).toContain('师傅看样');
    expect(mentoredSword.quality).toBeGreaterThan(unmentoredSword.quality);
    expect(mentoredSword.qualityDimensions?.resilience ?? 0).toBeGreaterThan(
      unmentoredSword.qualityDimensions?.resilience ?? 0,
    );
    expect(unmentoredDefect?.severity).toBe(2);
    expect(mentoredDefect?.severity).toBe(1);
    expect(mentoredDefect?.mitigatedByMentor).toBe(true);
    expect(mentoredSword.appraisal).toContain('师傅已压低');
    expect(itemDefectSummary(mentoredSword)).toContain('师傅压过');
  });

  it('工艺制作、交单、扩建和工坊升级必须在当前小地区开放的工坊点进行', () => {
    const base = freshState();
    const away = {
      ...base,
      resources: {
        ...base.resources,
        coin: 80,
        ironIngot: 4,
        coal: 4,
        treasureSword: 1,
        labor: 20,
      },
    };

    const craftedAway = gameReducer(
      away,
      { type: 'RUN_PROCESS', craftId: 'longquan-sword', skipStepIds: [] },
      content,
    );
    expect(craftedAway.resources.treasureSword).toBe(1);
    expect(craftedAway.log.join('\n')).toContain('暂不能进行「龙泉宝剑」');
    expect(craftedAway.log.join('\n')).toContain('龙泉山坊');

    const deliveredAway = gameReducer(away, { type: 'TAKE_ORDER', craftId: 'longquan-sword' }, content);
    expect(deliveredAway.resources.treasureSword).toBe(1);
    expect(deliveredAway.resources.coin).toBe(80);
    expect(deliveredAway.log.join('\n')).toContain('暂不能进行「龙泉宝剑」');

    const expandedAway = gameReducer(away, { type: 'EXPAND_WORKSHOP_SPACE', craftId: 'longquan-sword' }, content);
    expect(expandedAway.workshopSpaces.find((space) => space.craftId === 'longquan-sword')).toBeUndefined();
    expect(expandedAway.resources.coin).toBe(80);
    expect(expandedAway.log.join('\n')).toContain('暂不能进行「龙泉宝剑」');

    const upgradedAway = gameReducer(
      away,
      { type: 'UPGRADE_WORKSHOP', upgradeId: 'upgrade-longquan-quench-trough' },
      content,
    );
    expect(upgradedAway.workshopUpgrades.map((upgrade) => upgrade.id)).not.toContain(
      'upgrade-longquan-quench-trough',
    );
    expect(upgradedAway.log.join('\n')).toContain('请前往「龙泉山坊」的工坊点');
  });

  it('EXPAND_WORKSHOP_SPACE 会扩充本地工坊容量并消耗钱与工时', () => {
    const base = gameReducer(freshState(), { type: 'TRAVEL_SUBREGION', subregionId: 'jiangnan-longquan' }, content);
    const s = { ...base, resources: { ...base.resources, coin: 30, labor: 5 } };

    const expanded = gameReducer(s, { type: 'EXPAND_WORKSHOP_SPACE', craftId: 'longquan-sword' }, content);
    const record = expanded.workshopSpaces.find((space) => space.craftId === 'longquan-sword');

    expect(record?.capacity).toBe(2);
    expect(record?.expansions).toBe(1);
    expect(expanded.resources.coin).toBe(10);
    expect(expanded.resources.labor).toBe(4);
    expect(expanded.flags).toContain('workshop-space-expanded:longquan-sword');
    expect(expanded.flags).toContain('workshop-space:longquan-sword:2');
    expect(expanded.log.join('\n')).toContain('新增 1 格整备空间');
  });

  it('UPGRADE_WORKSHOP 会安置工坊升级并影响后续制作工时与作品描述', () => {
    let s = gameReducer(freshState(), { type: 'TRAVEL_SUBREGION', subregionId: 'jiangnan-longquan' }, content);
    s = { ...s, resources: { ...s.resources, ironIngot: 1, coal: 1, labor: 20 } };
    s = gameReducer(s, { type: 'RUN_PROCESS', craftId: 'longquan-sword', skipStepIds: [] }, content);
    s = { ...s, resources: { ...s.resources, coin: 40, ironIngot: 2, coal: 2, labor: 20 } };

    const upgraded = gameReducer(s, { type: 'UPGRADE_WORKSHOP', upgradeId: 'upgrade-longquan-quench-trough' }, content);

    expect(upgraded.workshopUpgrades.map((upgrade) => upgrade.id)).toContain('upgrade-longquan-quench-trough');
    expect(upgraded.flags).toContain('workshop-upgrade:upgrade-longquan-quench-trough');
    expect(upgraded.flags).toContain('workshop-line:longquan-fire');
    expect(upgraded.resources.coin).toBe(28);
    expect(upgraded.resources.ironIngot).toBe(1);
    expect(upgraded.resources.coal).toBe(1);

    const laborBefore = upgraded.resources.labor ?? 0;
    const crafted = gameReducer(upgraded, { type: 'RUN_PROCESS', craftId: 'longquan-sword', skipStepIds: [] }, content);
    const sword = crafted.itemInstances.find((item) => item.resourceId === 'treasureSword')!;

    expect(laborBefore - (crafted.resources.labor ?? 0)).toBe(4);
    expect(sword.descriptors).toContain('温槽校火');
    expect(sword.appraisal).toContain('工坊已用温槽校火整备');
  });

  it('UPGRADE_WORKSHOP 会阻止跳过前置并叠加二阶工坊效果', () => {
    let s = gameReducer(freshState(), { type: 'TRAVEL_SUBREGION', subregionId: 'jiangnan-longquan' }, content);
    s = {
      ...s,
      resources: { ...s.resources, coin: 100, ironIngot: 4, coal: 4, treasureSword: 1, labor: 20 },
      crafts: s.crafts.map((craft) =>
        craft.craftId === 'longquan-sword' ? { ...craft, produced: 3 } : craft,
      ),
      regionReputation: { ...s.regionReputation, jiangnan: 12 },
      profile: {
        ...s.profile,
        attributes: { ...s.profile.attributes, craft: 3 },
      },
    };

    const blocked = gameReducer(s, { type: 'UPGRADE_WORKSHOP', upgradeId: 'upgrade-longquan-trial-ledger' }, content);
    expect(blocked.workshopUpgrades.map((upgrade) => upgrade.id)).not.toContain('upgrade-longquan-trial-ledger');
    expect(blocked.log.join('\n')).toContain('前置工坊');

    const tierOne = gameReducer(s, { type: 'UPGRADE_WORKSHOP', upgradeId: 'upgrade-longquan-quench-trough' }, content);
    const spaceBlocked = gameReducer(
      tierOne,
      { type: 'UPGRADE_WORKSHOP', upgradeId: 'upgrade-longquan-trial-ledger' },
      content,
    );
    expect(spaceBlocked.workshopUpgrades.map((upgrade) => upgrade.id)).not.toContain(
      'upgrade-longquan-trial-ledger',
    );
    expect(spaceBlocked.log.join('\n')).toContain('请先扩建工坊');

    const expanded = gameReducer(tierOne, { type: 'EXPAND_WORKSHOP_SPACE', craftId: 'longquan-sword' }, content);
    expect(expanded.workshopSpaces.find((space) => space.craftId === 'longquan-sword')?.capacity).toBe(2);

    const tierTwo = gameReducer(
      expanded,
      { type: 'UPGRADE_WORKSHOP', upgradeId: 'upgrade-longquan-trial-ledger' },
      content,
    );

    expect(tierTwo.workshopUpgrades.map((upgrade) => upgrade.id)).toEqual(
      expect.arrayContaining(['upgrade-longquan-quench-trough', 'upgrade-longquan-trial-ledger']),
    );
    expect(tierTwo.flags).toContain('workshop-tier2:longquan-trial-ledger');
    expect(tierTwo.resources.coin).toBe(44);
    expect(tierTwo.resources.treasureSword).toBe(0);

    const laborBefore = tierTwo.resources.labor ?? 0;
    const crafted = gameReducer(tierTwo, { type: 'RUN_PROCESS', craftId: 'longquan-sword', skipStepIds: [] }, content);
    const sword = crafted.itemInstances.find((item) => item.resourceId === 'treasureSword')!;

    expect(laborBefore - (crafted.resources.labor ?? 0)).toBe(3);
    expect(sword.descriptors).toEqual(expect.arrayContaining(['温槽校火', '试剑留谱']));
    expect(sword.appraisal).toContain('工坊已用温槽校火、试剑留谱整备');
  });

  it('UPGRADE_WORKSHOP 会把对应工艺的重缺陷压低为可返修轻缺陷', () => {
    let s = gameReducer(freshState(), { type: 'TRAVEL_SUBREGION', subregionId: 'jiangnan-longquan' }, content);
    s = {
      ...s,
      resources: { ...s.resources, coin: 40, ironOre: 4, coal: 4, labor: 28 },
      crafts: s.crafts.map((craft) =>
        craft.craftId === 'longquan-sword' ? { ...craft, produced: 1 } : craft,
      ),
    };
    s = gameReducer(s, { type: 'GATHER_RESOURCE', industryId: 'smelt-iron', quality: 0 }, content);
    s = gameReducer(s, { type: 'GATHER_RESOURCE', industryId: 'smelt-iron', quality: 0 }, content);
    s = gameReducer(s, { type: 'UPGRADE_WORKSHOP', upgradeId: 'upgrade-longquan-quench-trough' }, content);
    s = gameReducer(s, { type: 'RUN_PROCESS', craftId: 'longquan-sword', skipStepIds: ['longquan-sword-prep'] }, content);

    const sword = s.itemInstances.find((item) => item.resourceId === 'treasureSword')!;
    const defect = sword.defects?.find((entry) => entry.id === 'sword-brittle-core');

    expect(defect?.severity).toBe(1);
    expect(defect?.mitigatedByWorkshop).toBe(true);
    expect(sword.appraisal).toContain('工坊已压低');
    expect(itemDefectSummary(sword)).toContain('工坊压过');
  });

  it('REPAIR_ITEM 会消耗材料并移除对应缺陷', () => {
    let s = gameReducer(freshState(), { type: 'TRAVEL_SUBREGION', subregionId: 'jiangnan-longquan' }, content);
    s = { ...s, resources: { ...s.resources, ironOre: 2, coal: 4, labor: 20 } };
    s = gameReducer(s, { type: 'GATHER_RESOURCE', industryId: 'smelt-iron', quality: 0 }, content);
    s = gameReducer(s, { type: 'RUN_PROCESS', craftId: 'longquan-sword', skipStepIds: ['longquan-sword-prep'] }, content);
    const sword = s.itemInstances.find((item) => item.resourceId === 'treasureSword')!;
    const coalBefore = s.resources.coal ?? 0;

    const repairedState = gameReducer(
      s,
      {
        type: 'REPAIR_ITEM',
        itemId: sword.id,
        defectId: 'sword-brittle-core',
        repairOptionId: 'sword-temper-again',
      },
      content,
    );
    const repaired = repairedState.itemInstances.find((item) => item.id === sword.id)!;

    expect(repaired.defects?.some((defect) => defect.id === 'sword-brittle-core')).toBe(false);
    expect(repaired.repairHistory?.[0]?.optionId).toBe('sword-temper-again');
    expect(repaired.quality).toBeGreaterThan(sword.quality);
    expect(repaired.qualityDimensions?.resilience).toBeGreaterThan(sword.qualityDimensions?.resilience ?? 0);
    expect(repairedState.resources.coal).toBe(coalBefore - 1);
    expect(repairedState.flags).toContain('item-defect-repaired:sword-brittle-core');
  });

  it('REPAIR_ITEM 会把师傅授艺转成返修工时减免与师承履历', () => {
    let s = gameReducer(freshState(), { type: 'TRAVEL_SUBREGION', subregionId: 'jiangnan-longquan' }, content);
    s = {
      ...s,
      npcAffinity: { ...s.npcAffinity, 'jn-ning-ciqiu': 8 },
      resources: { ...s.resources, ironOre: 2, coal: 4, labor: 20 },
    };
    s = gameReducer(s, { type: 'USE_NPC_FUNCTION', npcId: 'jn-ning-ciqiu', functionKind: 'mentor' }, content);
    s = gameReducer(s, { type: 'GATHER_RESOURCE', industryId: 'smelt-iron', quality: 0 }, content);
    s = gameReducer(s, { type: 'RUN_PROCESS', craftId: 'longquan-sword', skipStepIds: ['longquan-sword-prep'] }, content);
    const sword = s.itemInstances.find((item) => item.resourceId === 'treasureSword')!;
    const laborBefore = s.resources.labor ?? 0;
    const resilienceBefore = sword.qualityDimensions?.resilience ?? 0;

    const repairedState = gameReducer(
      s,
      {
        type: 'REPAIR_ITEM',
        itemId: sword.id,
        defectId: 'sword-brittle-core',
        repairOptionId: 'sword-temper-again',
      },
      content,
    );
    const repaired = repairedState.itemInstances.find((item) => item.id === sword.id)!;

    expect(repairedState.resources.labor).toBe(laborBefore - 1);
    expect(repaired.quality).toBeCloseTo(Number((sword.quality + 0.07).toFixed(3)), 3);
    expect(repaired.qualityDimensions?.resilience ?? 0).toBeGreaterThan(resilienceBefore + 0.14);
    expect(repaired.repairHistory?.[0]?.mentorGuided).toBe(true);
    expect(repaired.repairHistory?.[0]?.summary).toContain('师傅所授');
    expect(repaired.descriptors).toContain('师承返修');
    expect(repaired.appraisal).toContain('师傅所授');
    expect(repairedState.flags).toContain('mentor-repair-used:sword-temper-again');
    expect(repairedState.flags).toContain('mentor-repair-defect:sword-brittle-core');
  });

  it('FULFILL_ORDER 会拒收带重缺陷的高要求作品，返修后才可交付', () => {
    let { state: s, sword } = forgeDefectiveSword();
    const polishedButFlawed: ItemInstance = { ...sword, quality: 0.76 };
    const order: ActiveOrder = {
      id: 'test-flawed-sword-order',
      npcId: 'jn-ning-ciqiu',
      regionId: 'jiangnan',
      title: '宁辞秋的礼剑鉴收',
      desc: '礼剑要先过文人眼，带脆心不可交。',
      resourceId: 'treasureSword',
      quantity: 1,
      minQuality: 0.7,
      rewardCoin: 60,
      orderKind: 'credit',
      createdDay: s.calendar.day,
      status: 'active',
    };
    s = {
      ...s,
      resources: { ...s.resources, treasureSword: 1, coal: 4, labor: 20 },
      itemInstances: s.itemInstances.map((item) => (item.id === sword.id ? polishedButFlawed : item)),
      activeOrders: [order],
    };

    const blocked = gameReducer(s, { type: 'FULFILL_ORDER', orderId: order.id }, content);
    expect(blocked.activeOrders.find((item) => item.id === order.id)?.status).toBe('active');
    expect(blocked.resources.treasureSword).toBe(1);
    expect(blocked.log[0]).toContain('脆心');

    const repaired = gameReducer(
      blocked,
      {
        type: 'REPAIR_ITEM',
        itemId: sword.id,
        defectId: 'sword-brittle-core',
        repairOptionId: 'sword-temper-again',
      },
      content,
    );
    const delivered = gameReducer(repaired, { type: 'FULFILL_ORDER', orderId: order.id }, content);

    expect(delivered.activeOrders.find((item) => item.id === order.id)?.status).toBe('completed');
    expect(delivered.resources.treasureSword).toBe(0);
    expect(delivered.flags).toContain(`order-completed:${order.id}`);
  });

  it('青瓷链路会从低质瓷土生成坯釉缺陷，返修后可交付信用单', () => {
    let { state: s, celadon } = fireDefectiveCeladon();
    const order: ActiveOrder = {
      id: 'test-celadon-credit-order',
      npcId: 'jn-ye-qingzhan',
      regionId: 'jiangnan',
      title: '叶青盏的开窑样器验收',
      desc: '青瓷样器要先修正坯形，才可写入窑口账。',
      resourceId: 'celadonWare',
      quantity: 1,
      minQuality: 0.35,
      rewardCoin: 45,
      orderKind: 'credit',
      createdDay: s.calendar.day,
      status: 'active',
    };
    s = { ...s, activeOrders: [order] };

    expect(celadon.defects?.map((defect) => defect.id)).toEqual(
      expect.arrayContaining(['celadon-warped-body', 'celadon-gray-glaze']),
    );
    expect(celadon.appraisal).toContain('可择法返修');

    const blocked = gameReducer(s, { type: 'FULFILL_ORDER', orderId: order.id }, content);
    expect(blocked.activeOrders.find((item) => item.id === order.id)?.status).toBe('active');
    expect(blocked.resources.celadonWare).toBe(1);
    expect(blocked.log[0]).toContain('坯形偏斜');

    const repaired = gameReducer(
      blocked,
      {
        type: 'REPAIR_ITEM',
        itemId: celadon.id,
        defectId: 'celadon-warped-body',
        repairOptionId: 'celadon-retrim-body',
      },
      content,
    );
    const repairedCeladon = repaired.itemInstances.find((item) => item.id === celadon.id)!;
    expect(repairedCeladon.defects?.some((defect) => defect.id === 'celadon-warped-body')).toBe(false);
    expect(repairedCeladon.repairHistory?.[0]?.optionId).toBe('celadon-retrim-body');
    expect(repairedCeladon.descriptors).toContain('回坯修口');
    expect(repairedCeladon.qualityDimensions?.form).toBeGreaterThan(celadon.qualityDimensions?.form ?? 0);

    const delivered = gameReducer(repaired, { type: 'FULFILL_ORDER', orderId: order.id }, content);
    expect(delivered.activeOrders.find((item) => item.id === order.id)?.status).toBe('completed');
    expect(delivered.resources.celadonWare).toBe(0);
    expect(delivered.flags).toContain('item-defect-repaired:celadon-warped-body');
    expect(delivered.flags).toContain(`order-completed:${order.id}`);
  });

  it('叶青盏授艺会压低青瓷坯形缺陷并指导返修', () => {
    let s = gameReducer(freshState(), { type: 'TRAVEL_SUBREGION', subregionId: 'jiangnan-longquan' }, content);
    s = {
      ...s,
      npcAffinity: { ...s.npcAffinity, 'jn-ye-qingzhan': 8 },
      resources: { ...s.resources, coal: 4, labor: 24 },
    };
    s = gameReducer(s, { type: 'USE_NPC_FUNCTION', npcId: 'jn-ye-qingzhan', functionKind: 'mentor' }, content);
    s = gameReducer(s, { type: 'GATHER_RESOURCE', industryId: 'harvest-kaolin', quality: 0 }, content);
    s = gameReducer(s, { type: 'GATHER_RESOURCE', industryId: 'mine-kaolin', quality: 0 }, content);
    s = gameReducer(s, { type: 'RUN_PROCESS', craftId: 'celadon', skipStepIds: ['celadon-prep'] }, content);
    const celadon = s.itemInstances.find((item) => item.resourceId === 'celadonWare')!;
    const warped = celadon.defects?.find((defect) => defect.id === 'celadon-warped-body');
    const laborBefore = s.resources.labor ?? 0;

    expect(s.flags).toContain('craft-mentor:celadon');
    expect(s.flags).toContain('craft-mentor-used:celadon');
    expect(s.flags).toContain('craft-mentor-defect:celadon-warped-body');
    expect(celadon.descriptors).toContain('师傅看样');
    expect(warped?.severity).toBe(1);
    expect(warped?.mitigatedByMentor).toBe(true);
    expect(itemDefectSummary(celadon)).toContain('师傅压过');

    const repairedState = gameReducer(
      s,
      {
        type: 'REPAIR_ITEM',
        itemId: celadon.id,
        defectId: 'celadon-warped-body',
        repairOptionId: 'celadon-retrim-body',
      },
      content,
    );
    const repairedCeladon = repairedState.itemInstances.find((item) => item.id === celadon.id)!;

    expect(repairedState.resources.labor).toBe(laborBefore - 1);
    expect(repairedCeladon.repairHistory?.[0]?.mentorGuided).toBe(true);
    expect(repairedCeladon.descriptors).toContain('师承返修');
    expect(repairedState.flags).toContain('mentor-repair-used:celadon-retrim-body');
    expect(repairedState.flags).toContain('mentor-repair-defect:celadon-warped-body');
  });

  it('油纸伞雨季急单会按缺陷有效品相拒收，校骨补油后可交付', () => {
    let { state: s, umbrella } = craftDefectiveUmbrella();
    s = {
      ...s,
      calendar: { ...s.calendar, weather: 'rain' },
      npcAffinity: { ...s.npcAffinity, 'jn-lin-yuqiao': 12 },
    };
    s = gameReducer(s, { type: 'USE_NPC_FUNCTION', npcId: 'jn-lin-yuqiao', functionKind: 'order' }, content);
    const order = s.activeOrders[0];

    expect(order.resourceId).toBe('oilpaperUmbrella');
    expect(order.desc).toContain('雨季急单');
    expect(umbrella.defects?.map((defect) => defect.id)).toEqual(
      expect.arrayContaining(['umbrella-rib-misaligned', 'umbrella-leaky-oil']),
    );

    const blocked = gameReducer(s, { type: 'FULFILL_ORDER', orderId: order.id }, content);
    expect(blocked.activeOrders.find((item) => item.id === order.id)?.status).toBe('active');
    expect(blocked.resources.oilpaperUmbrella).toBe(1);
    expect(blocked.log[0]).toContain('缺陷折损');
    expect(blocked.log[0]).toContain('选竹裁纸');

    const repaired = gameReducer(
      blocked,
      {
        type: 'REPAIR_ITEM',
        itemId: umbrella.id,
        defectId: 'umbrella-rib-misaligned',
        repairOptionId: 'umbrella-realign-ribs',
      },
      content,
    );
    const repairedUmbrella = repaired.itemInstances.find((item) => item.id === umbrella.id)!;
    expect(repairedUmbrella.defects?.some((defect) => defect.id === 'umbrella-rib-misaligned')).toBe(false);
    expect(repairedUmbrella.repairHistory?.[0]?.optionId).toBe('umbrella-realign-ribs');
    expect(repairedUmbrella.qualityDimensions?.handling).toBeGreaterThan(umbrella.qualityDimensions?.handling ?? 0);

    const fullyRepaired = gameReducer(
      repaired,
      {
        type: 'REPAIR_ITEM',
        itemId: umbrella.id,
        defectId: 'umbrella-leaky-oil',
        repairOptionId: 'umbrella-reoil-canopy',
      },
      content,
    );
    const delivered = gameReducer(fullyRepaired, { type: 'FULFILL_ORDER', orderId: order.id }, content);
    expect(delivered.activeOrders.find((item) => item.id === order.id)?.status).toBe('completed');
    expect(delivered.resources.oilpaperUmbrella).toBe(0);
    expect(delivered.flags).toContain('item-defect-repaired:umbrella-rib-misaligned');
    expect(delivered.flags).toContain('item-defect-repaired:umbrella-leaky-oil');
    expect(delivered.flags).toContain('npc-order-completed:jn-lin-yuqiao');
  });

  it('林雨桥授艺会压低油纸伞伞骨缺陷并指导返修', () => {
    let s = freshState();
    s = { ...s, npcAffinity: { ...s.npcAffinity, 'jn-lin-yuqiao': 8 } };
    s = gameReducer(s, { type: 'USE_NPC_FUNCTION', npcId: 'jn-lin-yuqiao', functionKind: 'mentor' }, content);
    const crafted = craftDefectiveUmbrella(s);
    s = crafted.state;
    const umbrella = crafted.umbrella;
    const ribDefect = umbrella.defects?.find((defect) => defect.id === 'umbrella-rib-misaligned');
    const laborBefore = s.resources.labor ?? 0;

    expect(s.flags).toContain('craft-mentor:oilpaper-umbrella');
    expect(s.flags).toContain('craft-mentor-used:oilpaper-umbrella');
    expect(s.flags).toContain('craft-mentor-defect:umbrella-rib-misaligned');
    expect(umbrella.descriptors).toContain('师傅看样');
    expect(ribDefect?.severity).toBe(1);
    expect(ribDefect?.mitigatedByMentor).toBe(true);
    expect(itemDefectSummary(umbrella)).toContain('师傅压过');

    const repairedState = gameReducer(
      s,
      {
        type: 'REPAIR_ITEM',
        itemId: umbrella.id,
        defectId: 'umbrella-rib-misaligned',
        repairOptionId: 'umbrella-realign-ribs',
      },
      content,
    );
    const repairedUmbrella = repairedState.itemInstances.find((item) => item.id === umbrella.id)!;

    expect(repairedState.resources.labor).toBe(laborBefore - 1);
    expect(repairedUmbrella.repairHistory?.[0]?.mentorGuided).toBe(true);
    expect(repairedUmbrella.descriptors).toContain('师承返修');
    expect(repairedState.flags).toContain('mentor-repair-used:umbrella-realign-ribs');
    expect(repairedState.flags).toContain('mentor-repair-defect:umbrella-rib-misaligned');
  });

  it('缂丝雅玩订单会拒收断纬乱纹，补纬续纹后可交付', () => {
    let { state: s, kesi } = weaveDefectiveKesi();
    const order: ActiveOrder = {
      id: 'test-kesi-pattern-order',
      npcId: 'jn-shen-yunsuo',
      regionId: 'jiangnan',
      title: '沈云梭的缂丝雅玩验收',
      desc: '缂丝样张要先续上断纬，才可入花本档。',
      resourceId: 'kesiSilk',
      quantity: 1,
      minQuality: 0.45,
      rewardCoin: 42,
      orderKind: 'referral',
      createdDay: s.calendar.day,
      status: 'active',
    };
    s = { ...s, resources: { ...s.resources, rawSilkThread: 1 }, activeOrders: [order] };

    expect(kesi.defects?.map((defect) => defect.id)).toEqual(
      expect.arrayContaining(['kesi-broken-weft', 'kesi-fuzzy-face']),
    );
    expect(kesi.appraisal).toContain('断纬乱纹');

    const blocked = gameReducer(s, { type: 'FULFILL_ORDER', orderId: order.id }, content);
    expect(blocked.activeOrders.find((item) => item.id === order.id)?.status).toBe('active');
    expect(blocked.resources.kesiSilk).toBe(1);
    expect(blocked.log[0]).toContain('断纬乱纹');

    const repaired = gameReducer(
      blocked,
      {
        type: 'REPAIR_ITEM',
        itemId: kesi.id,
        defectId: 'kesi-broken-weft',
        repairOptionId: 'kesi-rethread-weft',
      },
      content,
    );
    const repairedKesi = repaired.itemInstances.find((item) => item.id === kesi.id)!;
    expect(repairedKesi.defects?.some((defect) => defect.id === 'kesi-broken-weft')).toBe(false);
    expect(repairedKesi.defects?.some((defect) => defect.id === 'kesi-fuzzy-face')).toBe(true);
    expect(repairedKesi.repairHistory?.[0]?.optionId).toBe('kesi-rethread-weft');
    expect(repairedKesi.descriptors).toContain('补纬续纹');
    expect(repairedKesi.qualityDimensions?.grain).toBeGreaterThan(kesi.qualityDimensions?.grain ?? 0);

    const delivered = gameReducer(repaired, { type: 'FULFILL_ORDER', orderId: order.id }, content);
    expect(delivered.activeOrders.find((item) => item.id === order.id)?.status).toBe('completed');
    expect(delivered.resources.kesiSilk).toBe(0);
    expect(delivered.flags).toContain('item-defect-repaired:kesi-broken-weft');
    expect(delivered.flags).toContain(`order-completed:${order.id}`);
  });

  it('沈云梭授艺会压低缂丝断纬缺陷并指导返修', () => {
    let s = freshState();
    s = { ...s, npcAffinity: { ...s.npcAffinity, 'jn-shen-yunsuo': 8 } };
    s = gameReducer(s, { type: 'USE_NPC_FUNCTION', npcId: 'jn-shen-yunsuo', functionKind: 'mentor' }, content);
    const crafted = weaveDefectiveKesi(s);
    s = crafted.state;
    s = { ...s, resources: { ...s.resources, rawSilkThread: 1 } };
    const kesi = crafted.kesi;
    const brokenWeft = kesi.defects?.find((defect) => defect.id === 'kesi-broken-weft');
    const laborBefore = s.resources.labor ?? 0;

    expect(s.flags).toContain('craft-mentor:kesi');
    expect(s.flags).toContain('craft-mentor-used:kesi');
    expect(s.flags).toContain('craft-mentor-defect:kesi-broken-weft');
    expect(kesi.descriptors).toContain('师傅看样');
    expect(brokenWeft?.severity).toBe(1);
    expect(brokenWeft?.mitigatedByMentor).toBe(true);
    expect(itemDefectSummary(kesi)).toContain('师傅压过');

    const repaired = gameReducer(
      s,
      {
        type: 'REPAIR_ITEM',
        itemId: kesi.id,
        defectId: 'kesi-broken-weft',
        repairOptionId: 'kesi-rethread-weft',
      },
      content,
    );
    const fixed = repaired.itemInstances.find((item) => item.id === kesi.id)!;

    expect(repaired.resources.labor).toBe(laborBefore - 1);
    expect(fixed.repairHistory?.[0]?.mentorGuided).toBe(true);
    expect(fixed.descriptors).toContain('师承返修');
    expect(repaired.flags).toContain('mentor-repair-used:kesi-rethread-weft');
    expect(repaired.flags).toContain('mentor-repair-defect:kesi-broken-weft');
  });

  it('蜀锦跨区供丝链会生成断花缺陷，补纬续花后可交付锦官雅单', () => {
    let { state: s, brocade } = weaveDefectiveShuBrocade();
    const order: ActiveOrder = {
      id: 'test-shu-brocade-pattern-order',
      npcId: 'bs-zhuo-jinniang',
      regionId: 'bashu',
      title: '卓锦娘的锦官花本验收',
      desc: '蜀锦样段要先续上断花，才可交给锦官织楼留样。',
      resourceId: 'brocade',
      quantity: 1,
      minQuality: 0.4,
      rewardCoin: 46,
      orderKind: 'referral',
      createdDay: s.calendar.day,
      status: 'active',
    };
    s = { ...s, activeOrders: [order] };

    expect(s.currentRegion).toBe('bashu');
    expect(s.currentSubregion).toBe('bashu-jinli');
    expect(brocade.originRegionId).toBe('bashu');
    expect(brocade.sourceItemIds?.length).toBeGreaterThan(0);
    expect(brocade.defects?.map((defect) => defect.id)).toEqual(
      expect.arrayContaining(['brocade-broken-pattern', 'brocade-loose-edge']),
    );
    expect(s.resources.rawSilkThread).toBe(1);

    const blocked = gameReducer(s, { type: 'FULFILL_ORDER', orderId: order.id }, content);
    expect(blocked.activeOrders.find((item) => item.id === order.id)?.status).toBe('active');
    expect(blocked.resources.brocade).toBe(1);
    expect(blocked.log[0]).toContain('断花');

    const repaired = gameReducer(
      blocked,
      {
        type: 'REPAIR_ITEM',
        itemId: brocade.id,
        defectId: 'brocade-broken-pattern',
        repairOptionId: 'brocade-needle-mend',
      },
      content,
    );
    const repairedBrocade = repaired.itemInstances.find((item) => item.id === brocade.id)!;
    expect(repaired.resources.rawSilkThread).toBe(0);
    expect(repairedBrocade.defects?.some((defect) => defect.id === 'brocade-broken-pattern')).toBe(false);
    expect(repairedBrocade.defects?.some((defect) => defect.id === 'brocade-loose-edge')).toBe(true);
    expect(repairedBrocade.descriptors).toContain('补纬续花');
    expect(repairedBrocade.qualityDimensions?.form).toBeGreaterThan(brocade.qualityDimensions?.form ?? 0);

    const delivered = gameReducer(repaired, { type: 'FULFILL_ORDER', orderId: order.id }, content);
    expect(delivered.activeOrders.find((item) => item.id === order.id)?.status).toBe('completed');
    expect(delivered.resources.brocade).toBe(0);
    expect(delivered.flags).toContain('item-defect-repaired:brocade-broken-pattern');
    expect(delivered.flags).toContain(`order-completed:${order.id}`);
  });

  it('卓锦娘授艺会压低蜀锦断花缺陷并指导返修', () => {
    let s = freshState();
    s = { ...s, npcAffinity: { ...s.npcAffinity, 'bs-zhuo-jinniang': 8 } };
    s = gameReducer(s, { type: 'USE_NPC_FUNCTION', npcId: 'bs-zhuo-jinniang', functionKind: 'mentor' }, content);
    const crafted = weaveDefectiveShuBrocade(s);
    s = crafted.state;
    const brocade = crafted.brocade;
    const brokenPattern = brocade.defects?.find((defect) => defect.id === 'brocade-broken-pattern');
    const laborBefore = s.resources.labor ?? 0;

    expect(s.flags).toContain('craft-mentor:shu-brocade');
    expect(s.flags).toContain('craft-mentor-used:shu-brocade');
    expect(s.flags).toContain('craft-mentor-defect:brocade-broken-pattern');
    expect(brocade.descriptors).toContain('师傅看样');
    expect(brokenPattern?.severity).toBe(1);
    expect(brokenPattern?.mitigatedByMentor).toBe(true);
    expect(itemDefectSummary(brocade)).toContain('师傅压过');

    const repaired = gameReducer(
      s,
      {
        type: 'REPAIR_ITEM',
        itemId: brocade.id,
        defectId: 'brocade-broken-pattern',
        repairOptionId: 'brocade-needle-mend',
      },
      content,
    );
    const fixed = repaired.itemInstances.find((item) => item.id === brocade.id)!;

    expect(repaired.resources.labor).toBe(laborBefore - 1);
    expect(fixed.repairHistory?.[0]?.mentorGuided).toBe(true);
    expect(fixed.descriptors).toContain('师承返修');
    expect(repaired.flags).toContain('mentor-repair-used:brocade-needle-mend');
    expect(repaired.flags).toContain('mentor-repair-defect:brocade-broken-pattern');
  });

  it('香云纱跨区制靛链会生成泥痕缺陷，温洗退泥后可交付晒场样单', () => {
    let { state: s, silk } = dyeDefectiveGambieredSilk();
    const order: ActiveOrder = {
      id: 'test-gambiered-sun-yard-order',
      npcId: 'ln-he-yunsha',
      regionId: 'lingnan',
      title: '何云纱的晒场复看样',
      desc: '香云纱样段要先退去重泥痕，才可交给岭南货栈复看色层。',
      resourceId: 'gambieredSilk',
      quantity: 1,
      minQuality: 0.4,
      rewardCoin: 44,
      createdDay: s.calendar.day,
      status: 'active',
      orderKind: 'referral',
    };
    s = { ...s, activeOrders: [order, ...s.activeOrders] };

    expect(s.currentRegion).toBe('lingnan');
    expect(s.currentSubregion).toBe('lingnan-gambiered-yard');
    expect(silk.originRegionId).toBe('lingnan');
    expect(silk.sourceItemIds?.length).toBeGreaterThan(0);
    expect(silk.defects?.map((defect) => defect.id)).toEqual(
      expect.arrayContaining(['gambiered-floating-color', 'gambiered-mud-mark']),
    );

    const blocked = gameReducer(s, { type: 'FULFILL_ORDER', orderId: order.id }, content);
    expect(blocked.activeOrders.find((item) => item.id === order.id)?.status).toBe('active');
    expect(blocked.resources.gambieredSilk).toBe(1);
    expect(blocked.log[0]).toContain('泥痕');

    const repaired = gameReducer(
      blocked,
      {
        type: 'REPAIR_ITEM',
        itemId: silk.id,
        defectId: 'gambiered-mud-mark',
        repairOptionId: 'gambiered-wash-mud',
      },
      content,
    );
    const repairedSilk = repaired.itemInstances.find((item) => item.id === silk.id)!;
    expect(repairedSilk.defects?.some((defect) => defect.id === 'gambiered-mud-mark')).toBe(false);
    expect(repairedSilk.defects?.some((defect) => defect.id === 'gambiered-floating-color')).toBe(true);
    expect(repairedSilk.descriptors).toContain('温洗退泥');
    expect(repairedSilk.qualityDimensions?.form).toBeGreaterThan(silk.qualityDimensions?.form ?? 0);

    const delivered = gameReducer(repaired, { type: 'FULFILL_ORDER', orderId: order.id }, content);
    expect(delivered.activeOrders.find((item) => item.id === order.id)?.status).toBe('completed');
    expect(delivered.resources.gambieredSilk).toBe(0);
    expect(delivered.flags).toContain('item-defect-repaired:gambiered-mud-mark');
    expect(delivered.flags).toContain(`order-completed:${order.id}`);
  });

  it('何云纱授艺会压低香云纱泥痕缺陷并指导返修', () => {
    let s = freshState();
    s = { ...s, npcAffinity: { ...s.npcAffinity, 'ln-he-yunsha': 8 } };
    s = gameReducer(s, { type: 'USE_NPC_FUNCTION', npcId: 'ln-he-yunsha', functionKind: 'mentor' }, content);
    const crafted = dyeDefectiveGambieredSilk(s);
    s = crafted.state;
    const silk = crafted.silk;
    const mudMark = silk.defects?.find((defect) => defect.id === 'gambiered-mud-mark');
    const laborBefore = s.resources.labor ?? 0;

    expect(s.flags).toContain('craft-mentor:gambiered-silk');
    expect(s.flags).toContain('craft-mentor-used:gambiered-silk');
    expect(s.flags).toContain('craft-mentor-defect:gambiered-mud-mark');
    expect(silk.descriptors).toContain('师傅看样');
    expect(mudMark?.severity).toBe(1);
    expect(mudMark?.mitigatedByMentor).toBe(true);
    expect(itemDefectSummary(silk)).toContain('师傅压过');

    const repaired = gameReducer(
      s,
      {
        type: 'REPAIR_ITEM',
        itemId: silk.id,
        defectId: 'gambiered-mud-mark',
        repairOptionId: 'gambiered-wash-mud',
      },
      content,
    );
    const fixed = repaired.itemInstances.find((item) => item.id === silk.id)!;

    expect(repaired.resources.labor).toBe(laborBefore - 1);
    expect(fixed.repairHistory?.[0]?.mentorGuided).toBe(true);
    expect(fixed.descriptors).toContain('师承返修');
    expect(repaired.flags).toContain('mentor-repair-used:gambiered-wash-mud');
    expect(repaired.flags).toContain('mentor-repair-defect:gambiered-mud-mark');
  });

  it('苗银跨区备煤采银炼铜链会生成焊痕缺陷，锉焊重抛后可交付礼俗样单', () => {
    let { state: s, ornament } = craftDefectiveMiaoSilver();
    const order: ActiveOrder = {
      id: 'test-miao-silver-etiquette-order',
      npcId: 'qd-yinniang-alan',
      regionId: 'qiandian',
      title: '银娘阿岚的礼俗银样验收',
      desc: '苗银礼俗样要先收住外露焊痕，才可带去鼓楼讲纹样来历。',
      resourceId: 'silverOrnament',
      quantity: 1,
      minQuality: 0.4,
      rewardCoin: 43,
      createdDay: s.calendar.day,
      status: 'active',
      orderKind: 'referral',
    };
    s = { ...s, activeOrders: [order, ...s.activeOrders] };

    expect(s.currentRegion).toBe('qiandian');
    expect(s.currentSubregion).toBe('qiandian-miao-village');
    expect(ornament.originRegionId).toBe('qiandian');
    expect(ornament.sourceItemIds?.length).toBeGreaterThanOrEqual(2);
    expect(ornament.defects?.map((defect) => defect.id)).toEqual(
      expect.arrayContaining(['silver-visible-solder', 'silver-heavy-fit']),
    );

    const blocked = gameReducer(s, { type: 'FULFILL_ORDER', orderId: order.id }, content);
    expect(blocked.activeOrders.find((item) => item.id === order.id)?.status).toBe('active');
    expect(blocked.resources.silverOrnament).toBe(1);
    expect(blocked.log[0]).toContain('焊痕外露');

    const repaired = gameReducer(
      blocked,
      {
        type: 'REPAIR_ITEM',
        itemId: ornament.id,
        defectId: 'silver-visible-solder',
        repairOptionId: 'silver-file-polish',
      },
      content,
    );
    const repairedOrnament = repaired.itemInstances.find((item) => item.id === ornament.id)!;
    expect(repairedOrnament.defects?.some((defect) => defect.id === 'silver-visible-solder')).toBe(false);
    expect(repairedOrnament.defects?.some((defect) => defect.id === 'silver-heavy-fit')).toBe(true);
    expect(repairedOrnament.descriptors).toContain('锉焊重抛');
    expect(repairedOrnament.qualityDimensions?.finish).toBeGreaterThan(ornament.qualityDimensions?.finish ?? 0);

    const delivered = gameReducer(repaired, { type: 'FULFILL_ORDER', orderId: order.id }, content);
    expect(delivered.activeOrders.find((item) => item.id === order.id)?.status).toBe('completed');
    expect(delivered.resources.silverOrnament).toBe(0);
    expect(delivered.flags).toContain('item-defect-repaired:silver-visible-solder');
    expect(delivered.flags).toContain(`order-completed:${order.id}`);
  });

  it('银娘阿岚授艺会压低苗银焊痕缺陷并指导返修', () => {
    let s = freshState();
    s = { ...s, npcAffinity: { ...s.npcAffinity, 'qd-yinniang-alan': 8 } };
    s = gameReducer(s, { type: 'USE_NPC_FUNCTION', npcId: 'qd-yinniang-alan', functionKind: 'mentor' }, content);
    const crafted = craftDefectiveMiaoSilver(s);
    s = crafted.state;
    const ornament = crafted.ornament;
    const visibleSolder = ornament.defects?.find((defect) => defect.id === 'silver-visible-solder');
    const laborBefore = s.resources.labor ?? 0;

    expect(s.flags).toContain('craft-mentor:miao-silver');
    expect(s.flags).toContain('craft-mentor-used:miao-silver');
    expect(s.flags).toContain('craft-mentor-defect:silver-visible-solder');
    expect(ornament.descriptors).toContain('师傅看样');
    expect(visibleSolder?.severity).toBe(1);
    expect(visibleSolder?.mitigatedByMentor).toBe(true);
    expect(itemDefectSummary(ornament)).toContain('师傅压过');

    const repaired = gameReducer(
      s,
      {
        type: 'REPAIR_ITEM',
        itemId: ornament.id,
        defectId: 'silver-visible-solder',
        repairOptionId: 'silver-file-polish',
      },
      content,
    );
    const fixed = repaired.itemInstances.find((item) => item.id === ornament.id)!;

    expect(repaired.resources.labor).toBe(laborBefore - 1);
    expect(fixed.repairHistory?.[0]?.mentorGuided).toBe(true);
    expect(fixed.descriptors).toContain('师承返修');
    expect(repaired.flags).toContain('mentor-repair-used:silver-file-polish');
    expect(repaired.flags).toContain('mentor-repair-defect:silver-visible-solder');
  });

  it('楚漆跨区矿彩链会生成起泡缺陷，磨泡补漆后可交付修复样柜', () => {
    let { state: s, lacquer } = craftDefectiveChuLacquer();
    const order: ActiveOrder = {
      id: 'test-chu-lacquer-restoration-order',
      npcId: 'jc-xiong-zhuxi',
      regionId: 'jingchu',
      title: '熊朱漆的楚漆修复样柜',
      desc: '楚漆修复样要先磨平起泡，才可入百工院修复样柜。',
      resourceId: 'chuLacquer',
      quantity: 1,
      minQuality: 0.4,
      rewardCoin: 45,
      createdDay: s.calendar.day,
      status: 'active',
      orderKind: 'referral',
    };
    s = { ...s, activeOrders: [order, ...s.activeOrders] };

    expect(s.currentRegion).toBe('jingchu');
    expect(s.currentSubregion).toBe('jingchu-chu-lacquer');
    expect(lacquer.originRegionId).toBe('jingchu');
    expect(lacquer.sourceItemIds?.length).toBeGreaterThanOrEqual(2);
    expect(lacquer.defects?.map((defect) => defect.id)).toEqual(
      expect.arrayContaining(['lacquer-bubble', 'lacquer-dim-pattern']),
    );
    expect(s.resources.lacquerRefined).toBe(1);

    const blocked = gameReducer(s, { type: 'FULFILL_ORDER', orderId: order.id }, content);
    expect(blocked.activeOrders.find((item) => item.id === order.id)?.status).toBe('active');
    expect(blocked.resources.chuLacquer).toBe(1);
    expect(blocked.log[0]).toContain('起泡');

    const repaired = gameReducer(
      blocked,
      {
        type: 'REPAIR_ITEM',
        itemId: lacquer.id,
        defectId: 'lacquer-bubble',
        repairOptionId: 'lacquer-sand-recoat',
      },
      content,
    );
    const repairedLacquer = repaired.itemInstances.find((item) => item.id === lacquer.id)!;
    expect(repaired.resources.lacquerRefined).toBe(0);
    expect(repairedLacquer.defects?.some((defect) => defect.id === 'lacquer-bubble')).toBe(false);
    expect(repairedLacquer.defects?.some((defect) => defect.id === 'lacquer-dim-pattern')).toBe(true);
    expect(repairedLacquer.descriptors).toContain('磨泡补漆');
    expect(repairedLacquer.qualityDimensions?.finish).toBeGreaterThan(lacquer.qualityDimensions?.finish ?? 0);

    const delivered = gameReducer(repaired, { type: 'FULFILL_ORDER', orderId: order.id }, content);
    expect(delivered.activeOrders.find((item) => item.id === order.id)?.status).toBe('completed');
    expect(delivered.resources.chuLacquer).toBe(0);
    expect(delivered.flags).toContain('item-defect-repaired:lacquer-bubble');
    expect(delivered.flags).toContain(`order-completed:${order.id}`);
  });

  it('熊朱漆授艺会压低楚漆起泡缺陷并指导返修', () => {
    let s = freshState();
    s = { ...s, npcAffinity: { ...s.npcAffinity, 'jc-xiong-zhuxi': 8 } };
    s = gameReducer(s, { type: 'USE_NPC_FUNCTION', npcId: 'jc-xiong-zhuxi', functionKind: 'mentor' }, content);
    const crafted = craftDefectiveChuLacquer(s);
    s = crafted.state;
    const lacquer = crafted.lacquer;
    const bubble = lacquer.defects?.find((defect) => defect.id === 'lacquer-bubble');
    const laborBefore = s.resources.labor ?? 0;

    expect(s.flags).toContain('craft-mentor:chu-lacquer');
    expect(s.flags).toContain('craft-mentor-used:chu-lacquer');
    expect(s.flags).toContain('craft-mentor-defect:lacquer-bubble');
    expect(lacquer.descriptors).toContain('师傅看样');
    expect(bubble?.severity).toBe(1);
    expect(bubble?.mitigatedByMentor).toBe(true);
    expect(itemDefectSummary(lacquer)).toContain('师傅压过');

    const repaired = gameReducer(
      s,
      {
        type: 'REPAIR_ITEM',
        itemId: lacquer.id,
        defectId: 'lacquer-bubble',
        repairOptionId: 'lacquer-sand-recoat',
      },
      content,
    );
    const fixed = repaired.itemInstances.find((item) => item.id === lacquer.id)!;

    expect(repaired.resources.labor).toBe(laborBefore - 1);
    expect(fixed.repairHistory?.[0]?.mentorGuided).toBe(true);
    expect(fixed.descriptors).toContain('师承返修');
    expect(repaired.flags).toContain('mentor-repair-used:lacquer-sand-recoat');
    expect(repaired.flags).toContain('mentor-repair-defect:lacquer-bubble');
  });

  it('景德镇瓷跨区矿彩链会生成坯釉缺陷，修足补缮后可交付窑口样器', () => {
    let { state: s, porcelain } = fireDefectiveJingdezhenPorcelain();
    const order: ActiveOrder = {
      id: 'test-jingdezhen-porcelain-kiln-order',
      npcId: 'gp-wen-yaotou',
      regionId: 'ganpo',
      title: '窑头老温的开窑样器',
      desc: '瓷镇样器要先校正坯体，再把惊釉转成可讲的残瓷纹理。',
      resourceId: 'jingdezhenPorcelain',
      quantity: 1,
      minQuality: 0.4,
      rewardCoin: 48,
      createdDay: s.calendar.day,
      status: 'active',
      orderKind: 'referral',
    };
    s = { ...s, activeOrders: [order, ...s.activeOrders] };

    expect(s.currentRegion).toBe('ganpo');
    expect(s.currentSubregion).toBe('ganpo-kiln-town');
    expect(porcelain.originRegionId).toBe('ganpo');
    expect(porcelain.sourceItemIds?.length).toBeGreaterThanOrEqual(2);
    expect(porcelain.defects?.map((defect) => defect.id)).toEqual(
      expect.arrayContaining(['porcelain-warped-body', 'porcelain-crazing']),
    );

    const blocked = gameReducer(s, { type: 'FULFILL_ORDER', orderId: order.id }, content);
    expect(blocked.activeOrders.find((item) => item.id === order.id)?.status).toBe('active');
    expect(blocked.resources.jingdezhenPorcelain).toBe(1);
    expect(blocked.log[0]).toContain('惊釉');

    const shapeRepaired = gameReducer(
      blocked,
      {
        type: 'REPAIR_ITEM',
        itemId: porcelain.id,
        defectId: 'porcelain-warped-body',
        repairOptionId: 'porcelain-grind-foot',
      },
      content,
    );
    const shaped = shapeRepaired.itemInstances.find((item) => item.id === porcelain.id)!;
    expect(shaped.defects?.some((defect) => defect.id === 'porcelain-warped-body')).toBe(false);
    expect(shaped.defects?.some((defect) => defect.id === 'porcelain-crazing')).toBe(true);
    expect(shaped.qualityDimensions?.form).toBeGreaterThan(porcelain.qualityDimensions?.form ?? 0);

    const stillBlocked = gameReducer(shapeRepaired, { type: 'FULFILL_ORDER', orderId: order.id }, content);
    expect(stillBlocked.activeOrders.find((item) => item.id === order.id)?.status).toBe('active');
    expect(stillBlocked.log[0]).toContain('惊釉');

    const fullyRepaired = gameReducer(
      stillBlocked,
      {
        type: 'REPAIR_ITEM',
        itemId: porcelain.id,
        defectId: 'porcelain-crazing',
        repairOptionId: 'porcelain-kintsugi-study',
      },
      content,
    );
    const fixedPorcelain = fullyRepaired.itemInstances.find((item) => item.id === porcelain.id)!;
    expect(fixedPorcelain.defects?.length ?? 0).toBe(0);
    expect(fixedPorcelain.qualityDimensions?.spirit).toBeGreaterThan(shaped.qualityDimensions?.spirit ?? 0);

    const delivered = gameReducer(fullyRepaired, { type: 'FULFILL_ORDER', orderId: order.id }, content);
    expect(delivered.activeOrders.find((item) => item.id === order.id)?.status).toBe('completed');
    expect(delivered.resources.jingdezhenPorcelain).toBe(0);
    expect(delivered.flags).toContain('item-defect-repaired:porcelain-warped-body');
    expect(delivered.flags).toContain('item-defect-repaired:porcelain-crazing');
    expect(delivered.flags).toContain(`order-completed:${order.id}`);
  });

  it('窑头老温授艺会压低景德镇瓷坯体缺陷并指导返修', () => {
    let s = freshState();
    s = { ...s, npcAffinity: { ...s.npcAffinity, 'gp-wen-yaotou': 8 } };
    s = gameReducer(s, { type: 'USE_NPC_FUNCTION', npcId: 'gp-wen-yaotou', functionKind: 'mentor' }, content);
    const crafted = fireDefectiveJingdezhenPorcelain(s);
    s = crafted.state;
    const porcelain = crafted.porcelain;
    const warpedBody = porcelain.defects?.find((defect) => defect.id === 'porcelain-warped-body');
    const laborBefore = s.resources.labor ?? 0;

    expect(s.flags).toContain('craft-mentor:jingdezhen-porcelain');
    expect(s.flags).toContain('craft-mentor-used:jingdezhen-porcelain');
    expect(s.flags).toContain('craft-mentor-defect:porcelain-warped-body');
    expect(warpedBody?.severity).toBe(1);
    expect(warpedBody?.mitigatedByMentor).toBe(true);
    expect(itemDefectSummary(porcelain)).toContain('师傅压过');

    const repaired = gameReducer(
      s,
      {
        type: 'REPAIR_ITEM',
        itemId: porcelain.id,
        defectId: 'porcelain-warped-body',
        repairOptionId: 'porcelain-grind-foot',
      },
      content,
    );
    const fixed = repaired.itemInstances.find((item) => item.id === porcelain.id)!;

    expect(repaired.resources.labor).toBe(laborBefore - 1);
    expect(fixed.repairHistory?.[0]?.mentorGuided).toBe(true);
    expect(repaired.flags).toContain('mentor-repair-used:porcelain-grind-foot');
    expect(repaired.flags).toContain('mentor-repair-defect:porcelain-warped-body');
  });

  it('宣纸跨区竹料链会生成纸筋缺陷，补浆压平后可交付文房入藏册页', () => {
    let { state: s, paper } = craftDefectiveXuanPaper();
    const order: ActiveOrder = {
      id: 'test-xuan-paper-ledger-order',
      npcId: 'hz-wang-zhiniang',
      regionId: 'huizhou',
      title: '汪纸娘的文房入藏册页',
      desc: '文房入藏册页要先补住纸筋，再把帘纹压平，才可作题跋底纸。',
      resourceId: 'xuanPaper',
      quantity: 1,
      minQuality: 0.4,
      rewardCoin: 42,
      createdDay: s.calendar.day,
      status: 'active',
      orderKind: 'referral',
    };
    s = { ...s, activeOrders: [order, ...s.activeOrders] };

    expect(s.currentRegion).toBe('huizhou');
    expect(s.currentSubregion).toBe('huizhou-paper-valley');
    expect(paper.originRegionId).toBe('huizhou');
    expect(paper.sourceItemIds?.length).toBeGreaterThanOrEqual(2);
    expect(paper.defects?.map((defect) => defect.id)).toEqual(
      expect.arrayContaining(['paper-brittle-fiber', 'paper-uneven-chain']),
    );
    expect(s.resources.paperSheet).toBe(1);

    const blocked = gameReducer(s, { type: 'FULFILL_ORDER', orderId: order.id }, content);
    expect(blocked.activeOrders.find((item) => item.id === order.id)?.status).toBe('active');
    expect(blocked.resources.xuanPaper).toBe(1);
    expect(blocked.log[0]).toContain('纸筋弱');

    const fiberRepaired = gameReducer(
      blocked,
      {
        type: 'REPAIR_ITEM',
        itemId: paper.id,
        defectId: 'paper-brittle-fiber',
        repairOptionId: 'paper-starch-mend',
      },
      content,
    );
    const strengthened = fiberRepaired.itemInstances.find((item) => item.id === paper.id)!;
    expect(fiberRepaired.resources.paperSheet).toBe(0);
    expect(strengthened.defects?.some((defect) => defect.id === 'paper-brittle-fiber')).toBe(false);
    expect(strengthened.defects?.some((defect) => defect.id === 'paper-uneven-chain')).toBe(true);
    expect(strengthened.qualityDimensions?.resilience).toBeGreaterThan(paper.qualityDimensions?.resilience ?? 0);

    const flattened = gameReducer(
      fiberRepaired,
      {
        type: 'REPAIR_ITEM',
        itemId: paper.id,
        defectId: 'paper-uneven-chain',
        repairOptionId: 'paper-repress',
      },
      content,
    );
    const fixedPaper = flattened.itemInstances.find((item) => item.id === paper.id)!;
    expect(fixedPaper.defects?.length ?? 0).toBe(0);
    expect(fixedPaper.qualityDimensions?.grain).toBeGreaterThan(strengthened.qualityDimensions?.grain ?? 0);

    const delivered = gameReducer(flattened, { type: 'FULFILL_ORDER', orderId: order.id }, content);
    expect(delivered.activeOrders.find((item) => item.id === order.id)?.status).toBe('completed');
    expect(delivered.resources.xuanPaper).toBe(0);
    expect(delivered.flags).toContain('item-defect-repaired:paper-brittle-fiber');
    expect(delivered.flags).toContain('item-defect-repaired:paper-uneven-chain');
    expect(delivered.flags).toContain(`order-completed:${order.id}`);
  });

  it('汪纸娘授艺会压低宣纸纸筋缺陷并指导补浆托裱', () => {
    let s = freshState();
    s = { ...s, npcAffinity: { ...s.npcAffinity, 'hz-wang-zhiniang': 8 } };
    s = gameReducer(s, { type: 'USE_NPC_FUNCTION', npcId: 'hz-wang-zhiniang', functionKind: 'mentor' }, content);
    const crafted = craftDefectiveXuanPaper(s);
    s = crafted.state;
    const paper = crafted.paper;
    const brittleFiber = paper.defects?.find((defect) => defect.id === 'paper-brittle-fiber');
    const laborBefore = s.resources.labor ?? 0;

    expect(s.flags).toContain('craft-mentor:xuan-paper');
    expect(s.flags).toContain('craft-mentor-used:xuan-paper');
    expect(s.flags).toContain('craft-mentor-defect:paper-brittle-fiber');
    expect(brittleFiber?.severity).toBe(1);
    expect(brittleFiber?.mitigatedByMentor).toBe(true);
    expect(itemDefectSummary(paper)).toContain('师傅压过');

    const repaired = gameReducer(
      s,
      {
        type: 'REPAIR_ITEM',
        itemId: paper.id,
        defectId: 'paper-brittle-fiber',
        repairOptionId: 'paper-starch-mend',
      },
      content,
    );
    const fixed = repaired.itemInstances.find((item) => item.id === paper.id)!;

    expect(repaired.resources.labor).toBe(laborBefore - 1);
    expect(repaired.resources.paperSheet).toBe(0);
    expect(fixed.repairHistory?.[0]?.mentorGuided).toBe(true);
    expect(repaired.flags).toContain('mentor-repair-used:paper-starch-mend');
    expect(repaired.flags).toContain('mentor-repair-defect:paper-brittle-fiber');
  });

  it('景泰蓝跨区铜料矿彩链会生成脱丝塌蓝，补丝补蓝后可交付宫造验样', () => {
    let { state: s, cloisonne } = craftDefectiveCloisonne();
    const order: ActiveOrder = {
      id: 'test-cloisonne-palace-order',
      npcId: 'jj-lan-daqi',
      regionId: 'jingji',
      title: '蓝大器的宫造验样',
      desc: '宫造验样要铜胎、丝线与蓝釉都站得住，脱丝与塌蓝都须先返修。',
      resourceId: 'cloisonne',
      quantity: 1,
      minQuality: 0.4,
      rewardCoin: 56,
      createdDay: s.calendar.day,
      status: 'active',
      orderKind: 'palace',
    };
    s = { ...s, activeOrders: [order, ...s.activeOrders] };

    expect(s.currentRegion).toBe('jingji');
    expect(s.currentSubregion).toBe('jingji-palace-yard');
    expect(cloisonne.originRegionId).toBe('jingji');
    expect(cloisonne.sourceItemIds?.length).toBeGreaterThanOrEqual(2);
    expect(cloisonne.defects?.map((defect) => defect.id)).toEqual(
      expect.arrayContaining(['cloisonne-loose-wire', 'cloisonne-low-enamel']),
    );
    expect(s.resources.copperStock).toBe(1);
    expect(s.resources.pigmentRefined).toBe(2);

    const blocked = gameReducer(s, { type: 'FULFILL_ORDER', orderId: order.id }, content);
    expect(blocked.activeOrders.find((item) => item.id === order.id)?.status).toBe('active');
    expect(blocked.resources.cloisonne).toBe(1);
    expect(blocked.log[0]).toContain('脱丝');

    const wireRepaired = gameReducer(
      blocked,
      {
        type: 'REPAIR_ITEM',
        itemId: cloisonne.id,
        defectId: 'cloisonne-loose-wire',
        repairOptionId: 'cloisonne-reset-wire',
      },
      content,
    );
    const rewired = wireRepaired.itemInstances.find((item) => item.id === cloisonne.id)!;
    expect(wireRepaired.resources.copperStock).toBe(0);
    expect(wireRepaired.resources.pigmentRefined).toBe(1);
    expect(rewired.defects?.some((defect) => defect.id === 'cloisonne-loose-wire')).toBe(false);
    expect(rewired.defects?.some((defect) => defect.id === 'cloisonne-low-enamel')).toBe(true);
    expect(rewired.qualityDimensions?.form).toBeGreaterThan(cloisonne.qualityDimensions?.form ?? 0);

    const enamelRepaired = gameReducer(
      wireRepaired,
      {
        type: 'REPAIR_ITEM',
        itemId: cloisonne.id,
        defectId: 'cloisonne-low-enamel',
        repairOptionId: 'cloisonne-refill-enamel',
      },
      content,
    );
    const fixedCloisonne = enamelRepaired.itemInstances.find((item) => item.id === cloisonne.id)!;
    expect(enamelRepaired.resources.pigmentRefined).toBe(0);
    expect(fixedCloisonne.defects?.length ?? 0).toBe(0);
    expect(fixedCloisonne.qualityDimensions?.finish).toBeGreaterThan(rewired.qualityDimensions?.finish ?? 0);

    const delivered = gameReducer(enamelRepaired, { type: 'FULFILL_ORDER', orderId: order.id }, content);
    expect(delivered.activeOrders.find((item) => item.id === order.id)?.status).toBe('completed');
    expect(delivered.resources.cloisonne).toBe(0);
    expect(delivered.flags).toContain('item-defect-repaired:cloisonne-loose-wire');
    expect(delivered.flags).toContain('item-defect-repaired:cloisonne-low-enamel');
    expect(delivered.flags).toContain(`order-completed:${order.id}`);
  });

  it('蓝大器授艺会压低景泰蓝脱丝缺陷并指导补丝复烧', () => {
    let s = freshState();
    s = { ...s, npcAffinity: { ...s.npcAffinity, 'jj-lan-daqi': 8 } };
    s = gameReducer(s, { type: 'USE_NPC_FUNCTION', npcId: 'jj-lan-daqi', functionKind: 'mentor' }, content);
    const crafted = craftDefectiveCloisonne(s);
    s = crafted.state;
    const cloisonne = crafted.cloisonne;
    const looseWire = cloisonne.defects?.find((defect) => defect.id === 'cloisonne-loose-wire');
    const laborBefore = s.resources.labor ?? 0;

    expect(s.flags).toContain('craft-mentor:cloisonne');
    expect(s.flags).toContain('craft-mentor-used:cloisonne');
    expect(s.flags).toContain('craft-mentor-defect:cloisonne-loose-wire');
    expect(cloisonne.descriptors).toContain('师傅看样');
    expect(looseWire?.severity).toBe(1);
    expect(looseWire?.mitigatedByMentor).toBe(true);
    expect(itemDefectSummary(cloisonne)).toContain('师傅压过');

    const repaired = gameReducer(
      s,
      {
        type: 'REPAIR_ITEM',
        itemId: cloisonne.id,
        defectId: 'cloisonne-loose-wire',
        repairOptionId: 'cloisonne-reset-wire',
      },
      content,
    );
    const fixed = repaired.itemInstances.find((item) => item.id === cloisonne.id)!;

    expect(repaired.resources.labor).toBe(laborBefore - 1);
    expect(repaired.resources.copperStock).toBe(0);
    expect(repaired.resources.pigmentRefined).toBe(1);
    expect(fixed.repairHistory?.[0]?.mentorGuided).toBe(true);
    expect(fixed.descriptors).toContain('师承返修');
    expect(repaired.flags).toContain('mentor-repair-used:cloisonne-reset-wire');
    expect(repaired.flags).toContain('mentor-repair-defect:cloisonne-loose-wire');
  });

  it('平遥推光漆跨区矿彩链会生成光面描金缺陷，慢推重描后可交付票号样柜', () => {
    let { state: s, lacquer } = craftDefectivePingyaoLacquer();
    const order: ActiveOrder = {
      id: 'test-pingyao-lacquer-cabinet-order',
      npcId: 'sj-pingyao-qipo',
      regionId: 'sanjin',
      title: '平遥漆婆的票号推光样柜',
      desc: '票号旧识要一件经得住掌温复看的推光漆器，光面与描金都不能浮。',
      resourceId: 'pingyaoLacquer',
      quantity: 1,
      minQuality: 0.4,
      rewardCoin: 44,
      createdDay: s.calendar.day,
      status: 'active',
      orderKind: 'referral',
    };
    s = { ...s, activeOrders: [order, ...s.activeOrders] };

    expect(s.currentRegion).toBe('sanjin');
    expect(s.currentSubregion).toBe('sanjin-lacquer-yard');
    expect(lacquer.originRegionId).toBe('sanjin');
    expect(lacquer.sourceItemIds?.length).toBeGreaterThanOrEqual(2);
    expect(lacquer.defects?.map((defect) => defect.id)).toEqual(
      expect.arrayContaining(['pingyao-cloudy-gloss', 'pingyao-gold-float']),
    );
    expect(s.resources.pigmentRefined).toBe(1);

    const blocked = gameReducer(s, { type: 'FULFILL_ORDER', orderId: order.id }, content);
    expect(blocked.activeOrders.find((item) => item.id === order.id)?.status).toBe('active');
    expect(blocked.resources.pingyaoLacquer).toBe(1);
    expect(blocked.log[0]).toContain('光面发虚');

    const glossRepaired = gameReducer(
      blocked,
      {
        type: 'REPAIR_ITEM',
        itemId: lacquer.id,
        defectId: 'pingyao-cloudy-gloss',
        repairOptionId: 'pingyao-slow-polish',
      },
      content,
    );
    const slowPolished = glossRepaired.itemInstances.find((item) => item.id === lacquer.id)!;
    expect(slowPolished.defects?.some((defect) => defect.id === 'pingyao-cloudy-gloss')).toBe(false);
    expect(slowPolished.defects?.some((defect) => defect.id === 'pingyao-gold-float')).toBe(true);
    expect(slowPolished.qualityDimensions?.finish).toBeGreaterThan(lacquer.qualityDimensions?.finish ?? 0);

    const goldRepaired = gameReducer(
      glossRepaired,
      {
        type: 'REPAIR_ITEM',
        itemId: lacquer.id,
        defectId: 'pingyao-gold-float',
        repairOptionId: 'pingyao-regild',
      },
      content,
    );
    const fixedLacquer = goldRepaired.itemInstances.find((item) => item.id === lacquer.id)!;
    expect(goldRepaired.resources.pigmentRefined).toBe(0);
    expect(fixedLacquer.defects?.length ?? 0).toBe(0);
    expect(fixedLacquer.qualityDimensions?.spirit).toBeGreaterThan(slowPolished.qualityDimensions?.spirit ?? 0);

    const delivered = gameReducer(goldRepaired, { type: 'FULFILL_ORDER', orderId: order.id }, content);
    expect(delivered.activeOrders.find((item) => item.id === order.id)?.status).toBe('completed');
    expect(delivered.resources.pingyaoLacquer).toBe(0);
    expect(delivered.flags).toContain('item-defect-repaired:pingyao-cloudy-gloss');
    expect(delivered.flags).toContain('item-defect-repaired:pingyao-gold-float');
    expect(delivered.flags).toContain(`order-completed:${order.id}`);
  });

  it('平遥漆婆授艺会压低推光漆光面缺陷并指导慢镜推光', () => {
    let s = freshState();
    s = { ...s, npcAffinity: { ...s.npcAffinity, 'sj-pingyao-qipo': 8 } };
    s = gameReducer(s, { type: 'USE_NPC_FUNCTION', npcId: 'sj-pingyao-qipo', functionKind: 'mentor' }, content);
    const crafted = craftDefectivePingyaoLacquer(s);
    s = crafted.state;
    const lacquer = crafted.lacquer;
    const cloudyGloss = lacquer.defects?.find((defect) => defect.id === 'pingyao-cloudy-gloss');
    const laborBefore = s.resources.labor ?? 0;

    expect(s.flags).toContain('craft-mentor:pingyao-lacquer');
    expect(s.flags).toContain('craft-mentor-used:pingyao-lacquer');
    expect(s.flags).toContain('craft-mentor-defect:pingyao-cloudy-gloss');
    expect(lacquer.descriptors).toContain('师傅看样');
    expect(cloudyGloss?.severity).toBe(1);
    expect(cloudyGloss?.mitigatedByMentor).toBe(true);
    expect(itemDefectSummary(lacquer)).toContain('师傅压过');

    const repaired = gameReducer(
      s,
      {
        type: 'REPAIR_ITEM',
        itemId: lacquer.id,
        defectId: 'pingyao-cloudy-gloss',
        repairOptionId: 'pingyao-slow-polish',
      },
      content,
    );
    const fixed = repaired.itemInstances.find((item) => item.id === lacquer.id)!;

    expect(repaired.resources.labor).toBe(laborBefore - 1);
    expect(fixed.repairHistory?.[0]?.mentorGuided).toBe(true);
    expect(fixed.descriptors).toContain('师承返修');
    expect(repaired.flags).toContain('mentor-repair-used:pingyao-slow-polish');
    expect(repaired.flags).toContain('mentor-repair-defect:pingyao-cloudy-gloss');
  });

  it('USE_NPC_FUNCTION 鉴评会点名缺陷并提示返修方向', () => {
    let { state: s, sword } = forgeDefectiveSword();
    s = { ...s, npcAffinity: { ...s.npcAffinity, 'jn-ning-ciqiu': 12 } };

    s = gameReducer(
      s,
      { type: 'USE_NPC_FUNCTION', npcId: 'jn-ning-ciqiu', functionKind: 'appraisal', itemId: sword.id },
      content,
    );
    const appraised = s.itemInstances.find((item) => item.id === sword.id)!;

    expect(appraised.inscription).toContain('脆心');
    expect(appraised.inscription).toContain('选铁定剑形');
    expect(appraised.inscription).toContain('回火复整');
    expect(s.flags).toContain('appraised-defective-item');
    expect(s.flags).toContain('npc-appraisal-defect:sword-brittle-core');
    expect(s.flags).not.toContain('appraised-masterwork');
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

  it('TAKE_ORDER 会同步移除已售出的物品评鉴实例', () => {
    let s = freshState();
    s = gameReducer(s, { type: 'RUN_PROCESS', craftId: 'indigo-dyeing', skipStepIds: [] }, content);
    const beforeCount = s.itemInstances.length;
    s = gameReducer(s, { type: 'TAKE_ORDER', craftId: 'indigo-dyeing' }, content);
    expect(s.itemInstances.length).toBe(beforeCount - 1);
    expect(s.itemInstances.some((item) => item.resourceId === 'indigoCloth')).toBe(false);
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

  it('END_TURN 会结算已安置工坊的季节维护费', () => {
    let s = gameReducer(freshState(), { type: 'TRAVEL_SUBREGION', subregionId: 'jiangnan-longquan' }, content);
    s = {
      ...s,
      pendingEvent: null,
      resources: { ...s.resources, coin: 100, ironIngot: 4, coal: 4, treasureSword: 1, labor: 20 },
      crafts: s.crafts.map((craft) =>
        craft.craftId === 'longquan-sword' ? { ...craft, produced: 3 } : craft,
      ),
      regionReputation: { ...s.regionReputation, jiangnan: 12 },
      profile: { ...s.profile, attributes: { ...s.profile.attributes, craft: 3 } },
    };
    s = gameReducer(s, { type: 'UPGRADE_WORKSHOP', upgradeId: 'upgrade-longquan-quench-trough' }, content);
    s = gameReducer(s, { type: 'EXPAND_WORKSHOP_SPACE', craftId: 'longquan-sword' }, content);
    s = gameReducer(s, { type: 'UPGRADE_WORKSHOP', upgradeId: 'upgrade-longquan-trial-ledger' }, content);
    const coinBefore = s.resources.coin ?? 0;

    const ended = gameReducer(s, { type: 'END_TURN' }, demoContent);

    expect(ended.resources.coin).toBe(coinBefore - 3);
    expect(ended.resources.labor).toBe(7);
    expect(
      ended.workshopUpgrades.find((upgrade) => upgrade.id === 'upgrade-longquan-quench-trough')?.maintenancePaid,
    ).toBe(1);
    expect(
      ended.workshopUpgrades.find((upgrade) => upgrade.id === 'upgrade-longquan-trial-ledger')?.maintenancePaid,
    ).toBe(1);
    expect(ended.log.join('\n')).toContain('工坊维护');
  });

  it('END_TURN 会记录付不起维护费的工坊欠账并压低对应工艺指标', () => {
    const s0 = freshState();
    const before = s0.crafts.find((craft) => craft.craftId === 'longquan-sword')!.metrics;
    const s = {
      ...s0,
      pendingEvent: null,
      resources: { ...s0.resources, coin: 1, labor: 0 },
      workshopUpgrades: [
        {
          id: 'upgrade-longquan-quench-trough',
          craftId: 'longquan-sword',
          title: '龙泉温槽',
          kind: 'tool' as const,
          tier: 1,
          day: 1,
          phase: 'morning' as const,
        },
        {
          id: 'upgrade-longquan-trial-ledger',
          craftId: 'longquan-sword',
          title: '龙泉试剑簿',
          kind: 'brand' as const,
          tier: 2,
          day: 1,
          phase: 'morning' as const,
        },
      ],
    };

    const ended = gameReducer(s, { type: 'END_TURN' }, demoContent);
    const after = ended.crafts.find((craft) => craft.craftId === 'longquan-sword')!.metrics;

    expect(ended.workshopUpgrades[0].maintenancePaid).toBe(1);
    expect(ended.workshopUpgrades[1].maintenanceMissed).toBe(1);
    expect(ended.flags).toContain('workshop-maintenance-missed:upgrade-longquan-trial-ledger');
    expect(ended.flags).toContain('workshop-maintenance-missed-craft:longquan-sword');
    expect(after.market).toBe(before.market - 1);
    expect(after.spirit).toBe(before.spirit - 1);
    expect(ended.log.join('\n')).toContain('龙泉试剑簿');
  });

  it('END_TURN 会对低稳定已通商路施加季节压力', () => {
    const s0 = freshState();
    const s = {
      ...s0,
      unlockedRegions: [...s0.unlockedRegions, 'huizhou'],
      pendingEvent: null,
      regionReputation: { ...s0.regionReputation, jiangnan: 0, huizhou: 0 },
      routeStability: { ...s0.routeStability, 'route-jiangnan-huizhou-paper': 10 },
    };
    const s1 = gameReducer(s, { type: 'END_TURN' }, content);
    expect(routeStabilityOf(s1, 'route-jiangnan-huizhou-paper')).toBeLessThan(
      routeStabilityOf(s, 'route-jiangnan-huizhou-paper'),
    );
  });

  it('END_TURN 会把高风险商路短少升级为待处理断供危机', () => {
    const routeId = 'route-xueyu-xiyu-caravan';
    const s0 = freshState();
    const s = {
      ...s0,
      seed: 67,
      unlockedRegions: [...new Set([...s0.unlockedRegions, 'xueyu', 'xiyu'])],
      pendingEvent: null,
      resources: { ...s0.resources, coin: 40, goldOre: 2 },
      regionReputation: { ...s0.regionReputation, xueyu: 0, xiyu: 0 },
      routeStability: { ...s0.routeStability, [routeId]: 15 },
    };

    const s1 = gameReducer(s, { type: 'END_TURN' }, content);

    expect(s1.pendingSupplyCrisis?.routeId).toBe(routeId);
    expect(s1.pendingSupplyCrisis?.resourceId).toBe('goldOre');
    expect(s1.pendingEvent).toBeNull();
    expect(s1.resources.goldOre).toBe(2);
    expect(routeStabilityOf(s1, routeId)).toBeLessThan(routeStabilityOf(s, routeId));

    const blocked = gameReducer(s1, { type: 'ADVANCE_TIME' }, content);
    expect(blocked.pendingSupplyCrisis).not.toBeNull();
    expect(blocked.calendar.phase).toBe(s1.calendar.phase);
  });

  it('RESOLVE_SUPPLY_CRISIS 垫资补货会清空危机并稳住商路', () => {
    const routeId = 'route-xueyu-xiyu-caravan';
    const s0 = freshState();
    const s = {
      ...s0,
      seed: 67,
      unlockedRegions: [...new Set([...s0.unlockedRegions, 'xueyu', 'xiyu'])],
      pendingEvent: null,
      resources: { ...s0.resources, coin: 50, goldOre: 2 },
      regionReputation: { ...s0.regionReputation, xueyu: 0, xiyu: 0 },
      routeStability: { ...s0.routeStability, [routeId]: 15 },
    };
    const crisis = gameReducer(s, { type: 'END_TURN' }, content);
    const coinBefore = crisis.resources.coin ?? 0;
    const stabilityBefore = routeStabilityOf(crisis, routeId);
    const cost = crisis.pendingSupplyCrisis?.coinCost ?? 0;

    const resolved = gameReducer(crisis, { type: 'RESOLVE_SUPPLY_CRISIS', choiceId: 'buy-relief' }, content);

    expect(resolved.pendingSupplyCrisis).toBeNull();
    expect(resolved.flags).toContain(`supply-crisis:buy-relief:${routeId}`);
    expect(resolved.supplyCrisisRecords[0]?.choiceId).toBe('buy-relief');
    expect(resolved.supplyCrisisRecords[0]?.status).toBe('watch');
    expect(resolved.resources.coin).toBe(coinBefore - cost);
    expect(resolved.resources.goldOre).toBe(2);
    expect(routeStabilityOf(resolved, routeId)).toBeGreaterThan(stabilityBefore);
    expect(resolved.regionReputation.xueyu).toBeGreaterThanOrEqual(crisis.regionReputation.xueyu ?? 0);
  });

  it('RESOLVE_SUPPLY_CRISIS 承受短缺会扣资源并压低商路稳定', () => {
    const routeId = 'route-xueyu-xiyu-caravan';
    const s0 = freshState();
    const s = {
      ...s0,
      seed: 67,
      unlockedRegions: [...new Set([...s0.unlockedRegions, 'xueyu', 'xiyu'])],
      pendingEvent: null,
      resources: { ...s0.resources, goldOre: 2 },
      regionReputation: { ...s0.regionReputation, xueyu: 1, xiyu: 1 },
      routeStability: { ...s0.routeStability, [routeId]: 10 },
    };
    const crisis = gameReducer(s, { type: 'END_TURN' }, content);
    const stabilityBefore = routeStabilityOf(crisis, routeId);
    const severity = crisis.pendingSupplyCrisis?.severity ?? 1;

    const resolved = gameReducer(crisis, { type: 'RESOLVE_SUPPLY_CRISIS', choiceId: 'accept-shortage' }, content);

    expect(resolved.pendingSupplyCrisis).toBeNull();
    expect(resolved.flags).toContain(`supply-crisis:accept-shortage:${routeId}`);
    expect(resolved.flags).toContain('supply-crisis-shortage-accepted');
    expect(resolved.supplyCrisisRecords[0]?.choiceId).toBe('accept-shortage');
    expect(resolved.supplyCrisisRecords[0]?.status).toBe('strained');
    expect(resolved.resources.goldOre).toBe(2 - severity);
    expect(routeStabilityOf(resolved, routeId)).toBeLessThan(stabilityBefore);
    expect(resolved.regionReputation.xueyu).toBeLessThan(crisis.regionReputation.xueyu);
  });

  it('STABILIZE_SUPPLY_ROUTE 会收束断供复盘并稳住商路', () => {
    const routeId = 'route-xueyu-xiyu-caravan';
    const s0 = freshState();
    const s = {
      ...s0,
      seed: 67,
      unlockedRegions: [...new Set([...s0.unlockedRegions, 'xueyu', 'xiyu'])],
      pendingEvent: null,
      resources: { ...s0.resources, coin: 30, goldOre: 2, labor: 8 },
      regionReputation: { ...s0.regionReputation, xueyu: 1, xiyu: 1 },
      routeStability: { ...s0.routeStability, [routeId]: 10 },
    };
    const crisis = gameReducer(s, { type: 'END_TURN' }, content);
    const resolved = gameReducer(crisis, { type: 'RESOLVE_SUPPLY_CRISIS', choiceId: 'accept-shortage' }, content);
    const record = resolved.supplyCrisisRecords[0]!;
    const stabilityBefore = routeStabilityOf(resolved, routeId);

    const stabilized = gameReducer(resolved, { type: 'STABILIZE_SUPPLY_ROUTE', recordId: record.id }, content);

    expect(stabilized.supplyCrisisRecords[0]?.status).toBe('closed');
    expect(stabilized.flags).toContain(`supply-followup-stabilized:${routeId}`);
    expect(stabilized.resources.labor).toBeLessThan(resolved.resources.labor);
    expect(routeStabilityOf(stabilized, routeId)).toBeGreaterThan(stabilityBefore);
  });

  it('未复盘的断供短缺会在次日形成余波', () => {
    const routeId = 'route-xueyu-xiyu-caravan';
    const s0 = freshState();
    const s = {
      ...s0,
      seed: 67,
      unlockedRegions: [...new Set([...s0.unlockedRegions, 'xueyu', 'xiyu'])],
      pendingEvent: null,
      resources: { ...s0.resources, goldOre: 2 },
      regionReputation: { ...s0.regionReputation, xueyu: 3, xiyu: 3 },
      routeStability: { ...s0.routeStability, [routeId]: 10 },
    };
    const crisis = gameReducer(s, { type: 'END_TURN' }, content);
    const resolved = gameReducer(crisis, { type: 'RESOLVE_SUPPLY_CRISIS', choiceId: 'accept-shortage' }, content);
    const readyForNextDay = {
      ...resolved,
      pendingEvent: null,
      calendar: { ...resolved.calendar, phase: 'night' as const },
      routeStability: { ...resolved.routeStability, [routeId]: 70 },
    };
    const stabilityBefore = routeStabilityOf(readyForNextDay, routeId);

    const next = gameReducer(readyForNextDay, { type: 'ADVANCE_TIME' }, demoContent);

    expect(next.flags).toContain(`supply-crisis-aftershock:${routeId}`);
    expect(next.supplyCrisisRecords[0]?.status).toBe('watch');
    expect(next.supplyCrisisRecords[0]?.aftershockApplied).toBe(true);
    expect(routeStabilityOf(next, routeId)).toBeLessThan(stabilityBefore);
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
    expect(s.regionReputation.jiangnan).toBe(5);
    expect(s.routeStability).toEqual({});
    expect(s.routeEscortRuns).toEqual({});
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
    let s = gameReducer(freshState(), { type: 'TRAVEL_SUBREGION', subregionId: 'jiangnan-longquan' }, content);
    s = { ...s, resources: { ...s.resources, ironOre: 4, coal: 2 } };
    const before = s.resources.labor;
    const s1 = gameReducer(s, { type: 'GATHER_RESOURCE', industryId: 'smelt-iron', quality: 1 }, content);
    expect((s1.resources.ironIngot ?? 0)).toBeGreaterThan(0);
    expect(s1.resources.ironOre).toBeLessThan(s.resources.ironOre);
    expect(s1.resources.labor).toBeLessThan(before);
    expect(s1.itemInstances[0]?.resourceId).toBe('ironIngot');
    expect(s1.itemInstances[0]?.sourceIndustryId).toBe('smelt-iron');
  });

  it('GATHER_RESOURCE 采集业（仅耗工时）按本地特产授权产出', () => {
    // 江南特产 cocoonSilk → harvest-cocoon 为采集业，仅耗工时
    const s = gameReducer(freshState(), { type: 'TRAVEL_SUBREGION', subregionId: 'jiangnan-taihu' }, content);
    const s1 = gameReducer(s, { type: 'GATHER_RESOURCE', industryId: 'harvest-cocoon', quality: 1 }, content);
    expect((s1.resources.cocoonSilk ?? 0)).toBeGreaterThan(0);
    expect(s1.resources.labor).toBeLessThan(s.resources.labor);
    expect(s1.itemInstances[0]?.resourceId).toBe('cocoonSilk');
    expect(s1.itemInstances[0]?.sourceIndustryId).toBe('harvest-cocoon');
    expect(s1.itemInstances[0]?.appraisal.length).toBeGreaterThan(0);
  });

  it('雨天露天采集会提高植物类产量并写入天气日志', () => {
    const s = gameReducer(freshState(), { type: 'TRAVEL_SUBREGION', subregionId: 'jiangnan-taihu' }, content);
    const clear = gameReducer(
      { ...s, calendar: { ...s.calendar, weather: 'clear' } },
      { type: 'GATHER_RESOURCE', industryId: 'harvest-cocoon', quality: 1 },
      content,
    );
    const rainy = gameReducer(
      { ...s, calendar: { ...s.calendar, weather: 'rain' } },
      { type: 'GATHER_RESOURCE', industryId: 'harvest-cocoon', quality: 1 },
      content,
    );

    expect(rainy.resources.cocoonSilk).toBeGreaterThan(clear.resources.cocoonSilk ?? 0);
    expect(rainy.log.join('\n')).toContain('雨水正润');
  });

  it('地区经济：镇务与街景共享本地采集/精炼产业列表', () => {
    const jiangnan = REGIONS.find((r) => r.id === 'jiangnan');
    const regionalIds = localIndustriesForRegion(jiangnan, INDUSTRIES).map((industry) => industry.id);
    expect(regionalIds).toContain('smelt-iron');
    const suhangIds = localIndustriesForSubregion(jiangnan, 'jiangnan-suhang', INDUSTRIES).map(
      (industry) => industry.id,
    );
    expect(suhangIds).toEqual(
      expect.arrayContaining(['harvest-indigo', 'harvest-bamboo', 'build-indigo', 'split-bamboo']),
    );
    expect(suhangIds).not.toContain('smelt-iron');
    const longquanIds = localIndustriesForSubregion(jiangnan, 'jiangnan-longquan', INDUSTRIES).map(
      (industry) => industry.id,
    );
    expect(longquanIds).toEqual(expect.arrayContaining(['harvest-iron-ore', 'smelt-iron', 'forge-sword']));
  });

  it('逐地区内容数据库：活动均落在已定义地区与小地区中', () => {
    expect(new Set(REGION_CONTENT.map((item) => item.regionId))).toEqual(new Set(REGIONS.map((item) => item.id)));
    for (const activity of REGION_ACTIVITIES) {
      const region = REGIONS.find((item) => item.id === activity.regionId);
      expect(region, activity.id).toBeTruthy();
      expect(region?.subregions.some((subregion) => subregion.id === activity.subregionId)).toBe(true);
      expect(REGION_CONTENT.find((item) => item.regionId === activity.regionId)?.activityIds).toContain(
        activity.id,
      );
    }
    for (const entry of SUBREGION_CONTENT) {
      const region = REGIONS.find((item) => item.id === entry.regionId);
      expect(region, entry.subregionId).toBeTruthy();
      expect(region?.subregions.some((subregion) => subregion.id === entry.subregionId)).toBe(true);
      const regionalIndustryIds = new Set(localIndustriesForRegion(region, INDUSTRIES).map((industry) => industry.id));
      for (const industryId of entry.industryIds) {
        expect(regionalIndustryIds.has(industryId), `${entry.subregionId}:${industryId}`).toBe(true);
      }
      for (const craftId of entry.craftIds) {
        expect(region?.signatureCrafts.includes(craftId), `${entry.subregionId}:${craftId}`).toBe(true);
      }
    }
  });

  it('逐地区内容数据库：路线均有结构化端点与解锁提示', () => {
    const regionIds = new Set(REGIONS.map((item) => item.id));
    const routesById = new Map(REGION_CONTENT.flatMap((item) => item.routes).map((route) => [route.id, route]));
    const routes = [...routesById.values()];
    expect(routesById.size).toBeGreaterThan(0);
    for (const route of routes) {
      expect(regionIds.has(route.fromRegionId)).toBe(true);
      expect(regionIds.has(route.toRegionId)).toBe(true);
      expect(route.name.length).toBeGreaterThan(0);
      expect(route.unlockHint.length).toBeGreaterThan(0);
    }
  });

  it('活动挑战库覆盖所有新增 miniGame 原型，并与活动 miniGame 对齐', () => {
    const activityById = new Map(REGION_ACTIVITIES.map((activity) => [activity.id, activity]));
    const plannedMiniGames = new Set([
      'couplet_choice',
      'calligraphy_trace',
      'crop_calendar',
      'appraise_select',
      'route_plan',
      'dialogue_check',
    ]);
    const challengeIds = new Set<string>();
    for (const challenge of ACTIVITY_CHALLENGES) {
      const activity = activityById.get(challenge.activityId);
      expect(activity, challenge.activityId).toBeTruthy();
      expect(activity?.miniGames).toContain(challenge.miniGame);
      expect(challengeIds.has(challenge.id)).toBe(false);
      challengeIds.add(challenge.id);
      expect(challenge.choices.length).toBeGreaterThanOrEqual(2);
      for (const choice of challenge.choices) {
        expect(choice.quality).toBeGreaterThanOrEqual(0);
        expect(choice.quality).toBeLessThanOrEqual(1);
        expect(choice.feedback.length).toBeGreaterThan(0);
      }
      if (challenge.rounds?.length) {
        const roundIds = new Set<string>();
        expect(challenge.rounds.length).toBeGreaterThanOrEqual(2);
        for (const round of challenge.rounds) {
          expect(roundIds.has(round.id), `${challenge.id}:${round.id}`).toBe(false);
          roundIds.add(round.id);
          expect(round.prompt.length, round.id).toBeGreaterThan(0);
          expect(round.choices.length, round.id).toBeGreaterThanOrEqual(2);
          const roundChoiceIds = new Set<string>();
          for (const choice of round.choices) {
            expect(roundChoiceIds.has(choice.id), `${challenge.id}:${round.id}:${choice.id}`).toBe(false);
            roundChoiceIds.add(choice.id);
            expect(choice.label.length, choice.id).toBeGreaterThan(0);
            expect(choice.quality, choice.id).toBeGreaterThanOrEqual(0);
            expect(choice.quality, choice.id).toBeLessThanOrEqual(1);
            expect(choice.feedback.length, choice.id).toBeGreaterThan(0);
          }
        }
      }
    }
    const covered = new Set(ACTIVITY_CHALLENGES.map((challenge) => challenge.activityId));
    const uncovered = REGION_ACTIVITIES.filter((activity) =>
      activity.miniGames.some((miniGame) => plannedMiniGames.has(miniGame)),
    )
      .filter((activity) => !covered.has(activity.id))
      .map((activity) => activity.id);
    expect(uncovered).toEqual([]);
  });

  it('秦淮灯谜接入三轮连答内容，并能形成高低质量差异', () => {
    const challenge = ACTIVITY_CHALLENGES.find((item) => item.activityId === 'jn-qinhuai-lantern');
    expect(challenge).toBeTruthy();
    const rounds = challenge?.rounds ?? [];
    expect(rounds).toHaveLength(3);
    expect(rounds.map((round) => round.id)).toEqual(['lantern-face', 'riddle-bone', 'guest-flow']);
    expect(rounds.flatMap((round) => round.choices.map((choice) => choice.id))).toContain('tea-and-proof');

    const bestAverage = rounds
      .map((round) => Math.max(...round.choices.map((choice) => choice.quality)))
      .reduce((sum, quality) => sum + quality, 0) / rounds.length;
    const weakAverage = rounds
      .map((round) => Math.min(...round.choices.map((choice) => choice.quality)))
      .reduce((sum, quality) => sum + quality, 0) / rounds.length;
    expect(bestAverage).toBeGreaterThan(0.88);
    expect(weakAverage).toBeLessThan(0.5);
  });

  it('逐地区内容数据库：夜市摊位策略均指向有效客群和组合', () => {
    for (const activity of REGION_ACTIVITIES) {
      const stall = activity.reward.stall;
      if (!stall?.strategies?.length) continue;
      const strategyIds = new Set<string>();
      const customerIds = new Set((stall.customers ?? []).map((customer) => customer.id));
      const comboIds = new Set((stall.combos ?? []).map((combo) => combo.id));
      for (const strategy of stall.strategies) {
        expect(strategyIds.has(strategy.id), `${activity.id}:${strategy.id}`).toBe(false);
        strategyIds.add(strategy.id);
        expect(strategy.title.length, strategy.id).toBeGreaterThan(0);
        expect(strategy.desc.length, strategy.id).toBeGreaterThan(0);
        if (strategy.preferredCustomerId) {
          expect(customerIds.has(strategy.preferredCustomerId), strategy.id).toBe(true);
        }
        if (strategy.preferredComboId) {
          expect(comboIds.has(strategy.preferredComboId), strategy.id).toBe(true);
        }
      }
    }
  });

  it('逐地区内容数据库：夜市收灯选择具备有效成本、奖励和路线标记', () => {
    const routeIds = new Set(REGION_ROUTES.map((route) => route.id));
    const resourceIds = new Set(RESOURCES.map((resource) => resource.id));
    const npcIds = new Set(ALL_NPCS.map((npc) => npc.id));
    for (const activity of REGION_ACTIVITIES) {
      const choices = activity.reward.stall?.closingChoices ?? [];
      if (choices.length === 0) continue;
      const choiceIds = new Set<string>();
      for (const choice of choices) {
        expect(choiceIds.has(choice.id), `${activity.id}:${choice.id}`).toBe(false);
        choiceIds.add(choice.id);
        expect(choice.title.length, choice.id).toBeGreaterThan(0);
        expect(choice.desc.length, choice.id).toBeGreaterThan(0);
        expect(choice.summary.length, choice.id).toBeGreaterThan(0);
        for (const amount of Object.values(choice.resourceCost ?? {})) {
          expect(amount, choice.id).toBeGreaterThan(0);
        }
        for (const flag of choice.flags ?? []) {
          if (flag.startsWith('route-known:')) {
            expect(routeIds.has(flag.replace('route-known:', '')), flag).toBe(true);
          }
        }
        expect(choice.followUpOrder, choice.id).toBeDefined();
        if (choice.followUpOrder) {
          const order = choice.followUpOrder;
          expect(order.title.length, choice.id).toBeGreaterThan(0);
          expect(order.desc.length, choice.id).toBeGreaterThan(0);
          expect(resourceIds.has(order.resourceId), order.resourceId).toBe(true);
          if (order.npcId) expect(npcIds.has(order.npcId), order.npcId).toBe(true);
          expect(order.quantity, choice.id).toBeGreaterThan(0);
          expect(order.minQuality, choice.id).toBeGreaterThanOrEqual(0.35);
          expect(order.rewardCoin, choice.id).toBeGreaterThan(0);
          expect(order.expiresIn ?? 1, choice.id).toBeGreaterThan(0);
          for (const routeId of order.routeIds ?? []) {
            expect(routeIds.has(routeId), `${choice.id}:${routeId}`).toBe(true);
          }
          for (const flag of order.flags ?? []) {
            if (flag.startsWith('route-known:')) {
              expect(routeIds.has(flag.replace('route-known:', '')), flag).toBe(true);
            }
          }
        }
      }
    }
  });

  it('PERFORM_ACTIVITY 在当前小地区结算生活/商贸活动并生成评鉴文本', () => {
    let s = freshState();
    s = gameReducer(s, { type: 'TRAVEL_SUBREGION', subregionId: 'jiangnan-linan' }, content);
    s = { ...s, resources: { ...s.resources, teaLeaf: 1, labor: 4 } };
    const beforeKnowledge = s.profile.attributes.knowledge;

    const s1 = gameReducer(s, { type: 'PERFORM_ACTIVITY', activityId: 'jn-lake-tea-house', quality: 0.9 }, content);

    expect(s1.resources.tea).toBe((s.resources.tea ?? 0) + 1);
    expect(s1.resources.teaLeaf).toBe((s.resources.teaLeaf ?? 0) - 1);
    expect(s1.profile.attributes.knowledge).toBeGreaterThan(beforeKnowledge);
    expect(s1.completedActivities).toContain('jn-lake-tea-house');
    expect(s1.regionReputation.jiangnan).toBeGreaterThan(s.regionReputation.jiangnan);
    expect(s1.flags).toContain('route-known:route-jiangnan-huizhou-paper');
    expect(routeStabilityOf(s1, 'route-jiangnan-huizhou-paper')).toBeGreaterThan(
      routeStabilityOf(s, 'route-jiangnan-huizhou-paper'),
    );
    expect(s1.npcStates['jn-su-xiaocha']?.knownTopics).toContain('route:route-jiangnan-huizhou-paper');
    expect(s1.npcAffinity['jn-su-xiaocha']).toBeGreaterThan(0);
    expect(s1.itemInstances[0]?.resourceId).toBe('tea');
    expect(s1.itemInstances[0]?.sourceActivityId).toBe('jn-lake-tea-house');
    expect(s1.itemInstances[0]?.appraisal.length).toBeGreaterThan(0);
  });

  it('PERFORM_ACTIVITY 按挑战质量推进关联 NPC 好感与活动记忆', () => {
    let s = gameReducer(freshState(), { type: 'TRAVEL_SUBREGION', subregionId: 'jiangnan-linan' }, content);
    s = { ...s, resources: { ...s.resources, teaLeaf: 2, labor: 4 } };

    const low = gameReducer(s, { type: 'PERFORM_ACTIVITY', activityId: 'jn-lake-tea-house', quality: 0.42 }, content);
    const high = gameReducer(s, { type: 'PERFORM_ACTIVITY', activityId: 'jn-lake-tea-house', quality: 0.92 }, content);

    expect(low.npcAffinity['jn-su-xiaocha']).toBeLessThan(high.npcAffinity['jn-su-xiaocha']);
    expect(low.regionReputation.jiangnan).toBeLessThan(high.regionReputation.jiangnan);
    expect(high.completedActivities).toContain('jn-lake-tea-house');
    expect(high.npcStates['jn-su-xiaocha']?.knownTopics).toContain('activity:jn-lake-tea-house');
  });

  it('PERFORM_ACTIVITY 拒绝不在当前小地区的活动', () => {
    const s = freshState();
    const s1 = gameReducer(s, { type: 'PERFORM_ACTIVITY', activityId: 'jn-lake-tea-house' }, content);
    expect(s1.resources.tea ?? 0).toBe(s.resources.tea ?? 0);
    expect(s1.itemInstances.length).toBe(0);
  });

  it('PERFORM_ACTIVITY 按时段限制秦淮灯市夜间事件', () => {
    let s = gameReducer(freshState(), { type: 'TRAVEL_SUBREGION', subregionId: 'jiangnan-jinling' }, content);
    const morning = gameReducer(s, { type: 'PERFORM_ACTIVITY', activityId: 'jn-qinhuai-lantern', quality: 0.9 }, content);
    expect(morning.flags).not.toContain('seen-qinhuai-lantern');
    expect(morning.activeOrders).toEqual([]);

    s = { ...s, calendar: { ...s.calendar, phase: 'dusk' } };
    const dusk = gameReducer(s, { type: 'PERFORM_ACTIVITY', activityId: 'jn-qinhuai-lantern', quality: 0.9 }, content);
    expect(dusk.flags).toContain('seen-qinhuai-lantern');
    expect(dusk.flags).toContain('festival-order:jn-qinhuai-lantern');
    expect(dusk.resources.coin).toBeGreaterThan(s.resources.coin ?? 0);
    expect(dusk.itemInstances.some((item) => item.resourceId === 'coin')).toBe(false);
    const order = dusk.activeOrders[0];
    expect(order.npcId).toBe('jn-qiao-zhaoye');
    expect(order.orderKind).toBe('festival');
    expect(order.sourceActivityId).toBe('jn-qinhuai-lantern');
    expect(order.resourceId).toBe('bambooWare');
    expect(order.expiresDay).toBe(dusk.calendar.day + 3);
    expect(order.desc).toContain('灯市');
  });

  it('秦淮灯市节令单遵守小灯期，并可交付完成', () => {
    let s = gameReducer(freshState(), { type: 'TRAVEL_SUBREGION', subregionId: 'jiangnan-jinling' }, content);
    s = { ...s, calendar: { ...s.calendar, day: 2, phase: 'dusk' }, resources: { ...s.resources, labor: 6 } };
    const offDay = gameReducer(s, { type: 'PERFORM_ACTIVITY', activityId: 'jn-qinhuai-lantern', quality: 0.9 }, content);
    expect(offDay.flags).toContain('seen-qinhuai-lantern');
    expect(offDay.flags).not.toContain('festival-order:jn-qinhuai-lantern');
    expect(offDay.activeOrders).toEqual([]);

    s = { ...s, calendar: { ...s.calendar, day: 4, phase: 'dusk' } };
    s = gameReducer(s, { type: 'PERFORM_ACTIVITY', activityId: 'jn-qinhuai-lantern', quality: 0.9 }, content);
    expect(s.activeOrders.length).toBe(1);
    const duplicate = gameReducer(s, { type: 'PERFORM_ACTIVITY', activityId: 'jn-qinhuai-lantern', quality: 0.9 }, content);
    expect(duplicate.activeOrders.length).toBe(1);

    const order = s.activeOrders[0];
    const ready = {
      ...s,
      resources: { ...s.resources, [order.resourceId]: order.quantity, coin: 0 },
    };
    const delivered = gameReducer(ready, { type: 'FULFILL_ORDER', orderId: order.id }, content);
    expect(delivered.activeOrders.find((item) => item.id === order.id)?.status).toBe('completed');
    expect(delivered.flags).toContain('activity-order-completed:jn-qinhuai-lantern');
    expect(delivered.flags).toContain('festival-order-completed:jn-qinhuai-lantern');
    expect(delivered.npcAffinity['jn-qiao-zhaoye']).toBeGreaterThan(s.npcAffinity['jn-qiao-zhaoye']);
    expect(delivered.regionReputation.jiangnan).toBeGreaterThan(s.regionReputation.jiangnan);
  });

  it('秦淮灯市夜市摆摊会售出高品作品并写入节令榜', () => {
    let s = gameReducer(freshState(), { type: 'TRAVEL_SUBREGION', subregionId: 'jiangnan-jinling' }, content);
    const item: ItemInstance = {
      id: 'test-qinhuai-bamboo-ware',
      resourceId: 'bambooWare',
      originRegionId: 'jiangnan',
      originSubregionId: 'jiangnan-jinling',
      createdTurn: s.turn,
      quality: 0.86,
      descriptors: ['细篾匀', '灯骨稳'],
      appraisal: '这件竹编灯骨细密匀称，适合灯市陈列。',
      displayName: '细篾灯骨',
      status: 'held',
    };
    s = {
      ...s,
      calendar: { ...s.calendar, day: 1, phase: 'dusk' },
      resources: { ...s.resources, bambooWare: 1, tea: 1, labor: 6 },
      itemInstances: [item, ...s.itemInstances],
    };
    const beforeCoin = s.resources.coin ?? 0;
    const beforeReputation = s.regionReputation.jiangnan ?? 0;

    const next = gameReducer(s, { type: 'PERFORM_ACTIVITY', activityId: 'jn-qinhuai-lantern', quality: 0.9 }, content);

    expect(next.resources.bambooWare).toBe(0);
    expect(next.resources.tea).toBe(0);
    expect(next.resources.coin).toBeGreaterThan(beforeCoin + 8);
    expect(next.itemInstances.some((candidate) => candidate.id === item.id)).toBe(false);
    expect(next.flags).toContain('night-stall-sale:jn-qinhuai-lantern');
    expect(next.flags).toContain('festival-stall:jn-qinhuai-lantern');
    expect(next.flags).toContain('stall-stage:jn-qinhuai-lantern:open');
    expect(next.flags).toContain('stall-combo:jn-qinhuai-lantern:lantern-tea-tray');
    expect(next.flags).toContain('stall-customer:jn-qinhuai-lantern:lantern-family-guests');
    expect(next.regionReputation.jiangnan).toBeGreaterThan(beforeReputation);
    expect(next.npcStates['jn-qiao-zhaoye']?.knownTopics).toContain('night-market-stall');
    expect(next.npcStates['jn-qiao-zhaoye']?.knownTopics).toContain('stall-combo:lantern-tea-tray');
    expect(next.npcStates['jn-qiao-zhaoye']?.knownTopics).toContain('stall-customer:lantern-family-guests');
    expect(next.nightMarketStallRecords[0]).toMatchObject({
      activityId: 'jn-qinhuai-lantern',
      title: '秦淮夜市摊',
      itemResourceId: 'bambooWare',
      itemName: '细篾灯骨',
      comboId: 'lantern-tea-tray',
      comboTitle: '灯茶小案',
      customerId: 'lantern-family-guests',
      customerTitle: '携童看灯人',
      consumedExtraResourceId: 'tea',
      stageId: 'open',
      cycleLabel: '秦淮小灯期',
    });
    expect(next.nightMarketStallRecords[0].summary).toContain('灯茶小案');
    expect(next.nightMarketStallRecords[0].summary).toContain('携童看灯人');
    expect(next.nightMarketStallRecords[0].revenue).toBeGreaterThan(0);
    expect(next.nightMarketStallRecords[0].crowd).toBeGreaterThan(0);
  });

  it('秦淮灯市可主动选择摊位策略影响客群、组合与记录', () => {
    let s = gameReducer(freshState(), { type: 'TRAVEL_SUBREGION', subregionId: 'jiangnan-jinling' }, content);
    s = {
      ...s,
      calendar: { ...s.calendar, day: 1, phase: 'dusk' },
      resources: { ...s.resources, brocade: 1, tea: 1, labor: 6 },
    };
    const beforeCoin = s.resources.coin ?? 0;

    const next = gameReducer(
      s,
      {
        type: 'PERFORM_ACTIVITY',
        activityId: 'jn-qinhuai-lantern',
        quality: 0.9,
        stallStrategyId: 'merchant-sample-wall',
      },
      content,
    );

    expect(next.resources.brocade).toBe(0);
    expect(next.resources.tea).toBe(1);
    expect(next.resources.coin).toBeGreaterThan(beforeCoin + 20);
    expect(next.flags).toContain('stall-strategy:jn-qinhuai-lantern:merchant-sample-wall');
    expect(next.flags).toContain('qinhuai-strategy-merchant');
    expect(next.flags).toContain('stall-combo:jn-qinhuai-lantern:brocade-lantern-screen');
    expect(next.flags).toContain('stall-customer:jn-qinhuai-lantern:river-merchant-guests');
    expect(next.npcStates['jn-qiao-zhaoye']?.knownTopics).toContain('stall-strategy:merchant-sample-wall');
    expect(next.npcStates['jn-qiao-zhaoye']?.knownTopics).toContain('merchant-sample-wall');
    expect(next.nightMarketStallRecords[0]).toMatchObject({
      activityId: 'jn-qinhuai-lantern',
      strategyId: 'merchant-sample-wall',
      strategyTitle: '外埠货样',
      itemResourceId: 'brocade',
      comboId: 'brocade-lantern-screen',
      customerId: 'river-merchant-guests',
    });
    expect(next.nightMarketStallRecords[0].summary).toContain('外埠货样');
    expect(next.log.join('\n')).toContain('走「外埠货样」');
  });

  it('PERFORM_ACTIVITY 会拒绝不存在的摊位策略且不消耗工时', () => {
    let s = gameReducer(freshState(), { type: 'TRAVEL_SUBREGION', subregionId: 'jiangnan-jinling' }, content);
    s = {
      ...s,
      calendar: { ...s.calendar, day: 1, phase: 'dusk' },
      resources: { ...s.resources, bambooWare: 1, labor: 6 },
    };

    const next = gameReducer(
      s,
      {
        type: 'PERFORM_ACTIVITY',
        activityId: 'jn-qinhuai-lantern',
        quality: 0.9,
        stallStrategyId: 'missing-strategy',
      },
      content,
    );

    expect(next.resources.labor).toBe(s.resources.labor);
    expect(next.nightMarketStallRecords).toHaveLength(0);
    expect(next.log[0]).toContain('没有这条摊位策略');
  });

  it('秦淮灯市多夜摆摊会推进开灯、旺市、收灯事件链', () => {
    let s = gameReducer(freshState(), { type: 'TRAVEL_SUBREGION', subregionId: 'jiangnan-jinling' }, content);
    s = {
      ...s,
      calendar: { ...s.calendar, day: 1, phase: 'dusk' },
      resources: { ...s.resources, bambooWare: 3, labor: 8 },
    };

    s = gameReducer(s, { type: 'PERFORM_ACTIVITY', activityId: 'jn-qinhuai-lantern', quality: 0.82 }, content);
    s = {
      ...s,
      calendar: { ...s.calendar, day: 2, phase: 'dusk' },
    };
    s = gameReducer(s, { type: 'PERFORM_ACTIVITY', activityId: 'jn-qinhuai-lantern', quality: 0.78 }, content);
    s = {
      ...s,
      calendar: { ...s.calendar, day: 3, phase: 'night' },
    };
    s = gameReducer(s, { type: 'PERFORM_ACTIVITY', activityId: 'jn-qinhuai-lantern', quality: 0.88 }, content);

    expect(s.nightMarketStallRecords).toHaveLength(3);
    expect(s.nightMarketStallRecords.map((record) => record.stageId)).toEqual(['closing', 'busy', 'open']);
    expect(s.flags).toContain('stall-stage:jn-qinhuai-lantern:open');
    expect(s.flags).toContain('stall-stage:jn-qinhuai-lantern:busy');
    expect(s.flags).toContain('stall-stage:jn-qinhuai-lantern:closing');
    expect(s.flags).toContain('stall-chain-completed:jn-qinhuai-lantern');
    expect(s.flags).toContain('qinhuai-lantern-closing-night');
    expect(s.activeOrders.filter((order) => order.sourceActivityId === 'jn-qinhuai-lantern')).toHaveLength(1);
    expect(s.resources.bambooWare).toBe(0);
    expect(s.nightMarketStallRecords[0].summary).toContain('完整记忆');
    expect(s.pendingActivityStallClosing).toMatchObject({
      activityId: 'jn-qinhuai-lantern',
      recordId: s.nightMarketStallRecords[0].id,
      stageId: 'closing',
    });
  });

  it('秦淮收灯选择会回写节令榜、NPC 见闻和地区声望', () => {
    let s = gameReducer(freshState(), { type: 'TRAVEL_SUBREGION', subregionId: 'jiangnan-jinling' }, content);
    s = {
      ...s,
      calendar: { ...s.calendar, day: 1, phase: 'dusk' },
      resources: { ...s.resources, bambooWare: 3, labor: 8 },
    };
    s = gameReducer(s, { type: 'PERFORM_ACTIVITY', activityId: 'jn-qinhuai-lantern', quality: 0.82 }, content);
    s = { ...s, calendar: { ...s.calendar, day: 2, phase: 'dusk' } };
    s = gameReducer(s, { type: 'PERFORM_ACTIVITY', activityId: 'jn-qinhuai-lantern', quality: 0.78 }, content);
    s = { ...s, calendar: { ...s.calendar, day: 3, phase: 'night' } };
    s = gameReducer(s, { type: 'PERFORM_ACTIVITY', activityId: 'jn-qinhuai-lantern', quality: 0.88 }, content);

    const beforeReputation = s.regionReputation.jiangnan ?? 0;
    const beforeAffinity = s.npcAffinity['jn-qiao-zhaoye'] ?? 0;
    s = gameReducer(s, { type: 'RESOLVE_ACTIVITY_STALL_CLOSING', choiceId: 'archive-riddle-ledger' }, content);

    expect(s.pendingActivityStallClosing).toBeNull();
    expect(s.flags).toContain('stall-closing-resolved:jn-qinhuai-lantern');
    expect(s.flags).toContain('stall-closing-choice:jn-qinhuai-lantern:archive-riddle-ledger');
    expect(s.flags).toContain('qinhuai-closing-riddle-ledger');
    expect(s.flags).toContain('stall-closing-followup-order:jn-qinhuai-lantern:archive-riddle-ledger');
    expect(s.flags).toContain('qinhuai-next-year-riddle-order');
    expect(s.nightMarketStallRecords[0]).toMatchObject({
      closingChoiceId: 'archive-riddle-ledger',
      closingChoiceTitle: '归档灯谜簿',
    });
    expect(s.nightMarketStallRecords[0].summary).toContain('灯谜簿');
    expect(s.npcStates['jn-qiao-zhaoye']?.knownTopics).toContain('lantern-riddle-ledger');
    expect(s.npcStates['jn-qiao-zhaoye']?.knownTopics).toContain('next-year-lantern-booking');
    expect(s.npcAffinity['jn-qiao-zhaoye']).toBeGreaterThan(beforeAffinity);
    expect(s.regionReputation.jiangnan).toBeGreaterThan(beforeReputation);

    const followUpOrder = s.activeOrders.find((order) =>
      order.id.startsWith('stall-closing-order-jn-qinhuai-lantern-archive-riddle-ledger'),
    );
    expect(followUpOrder).toMatchObject({
      npcId: 'jn-qiao-zhaoye',
      title: '来年灯谜底本预约',
      resourceId: 'paperSheet',
      quantity: 2,
      orderKind: 'festival',
      sourceActivityId: 'jn-qinhuai-lantern',
      status: 'active',
    });
    expect(followUpOrder?.rewardCoin ?? 0).toBeGreaterThanOrEqual(22);

    const ready = {
      ...s,
      resources: { ...s.resources, paperSheet: (s.resources.paperSheet ?? 0) + (followUpOrder?.quantity ?? 0) },
    };
    const delivered = gameReducer(ready, { type: 'FULFILL_ORDER', orderId: followUpOrder!.id }, content);
    expect(delivered.flags).toContain(`order-completed:${followUpOrder!.id}`);
    expect(delivered.flags).toContain('festival-order-completed:jn-qinhuai-lantern');

    const ended = gameReducer(
      {
        ...delivered,
        turn: delivered.maxTurns,
        pendingEvent: null,
        pendingEscortCrisis: null,
        pendingSupplyCrisis: null,
        pendingActivityStallClosing: null,
        npcAffinity: { ...delivered.npcAffinity, 'jn-qiao-zhaoye': 72 },
      },
      { type: 'END_TURN' },
      content,
    );
    expect(ended.report?.highlights.some((line) => line.includes('秦淮收灯后的回头单成交') && line.includes('来年灯谜底本预约'))).toBe(true);
    expect(ended.report?.relationshipOutcomes?.some((line) => line.includes('乔照夜') && line.includes('来年灯市名单'))).toBe(true);
  });

  it('秦淮收灯选择会校验资源成本并阻止时辰跳过', () => {
    let s = gameReducer(freshState(), { type: 'TRAVEL_SUBREGION', subregionId: 'jiangnan-jinling' }, content);
    s = {
      ...s,
      calendar: { ...s.calendar, day: 1, phase: 'dusk' },
      resources: { ...s.resources, bambooWare: 3, labor: 8 },
    };
    s = gameReducer(s, { type: 'PERFORM_ACTIVITY', activityId: 'jn-qinhuai-lantern', quality: 0.82 }, content);
    s = { ...s, calendar: { ...s.calendar, day: 2, phase: 'dusk' } };
    s = gameReducer(s, { type: 'PERFORM_ACTIVITY', activityId: 'jn-qinhuai-lantern', quality: 0.78 }, content);
    s = { ...s, calendar: { ...s.calendar, day: 3, phase: 'night' } };
    s = gameReducer(s, { type: 'PERFORM_ACTIVITY', activityId: 'jn-qinhuai-lantern', quality: 0.88 }, content);

    s = { ...s, resources: { ...s.resources, coin: 0 } };
    const blocked = gameReducer(s, { type: 'RESOLVE_ACTIVITY_STALL_CLOSING', choiceId: 'share-river-lanterns' }, content);
    expect(blocked.pendingActivityStallClosing).not.toBeNull();
    expect(blocked.nightMarketStallRecords[0].closingChoiceId).toBeUndefined();
    expect(blocked.log[0]).toContain('收灯所需资源不足');

    const advanced = gameReducer(blocked, { type: 'ADVANCE_TIME' }, content);
    expect(advanced.calendar.phase).toBe('night');
    expect(advanced.log[0]).toContain('收灯夜选择');
  });

  it('绿洲巴扎是节令摊位，可售货并推进开市/旺市/散市并接收灯货约', () => {
    let s = freshState();
    const jade: ItemInstance = {
      id: 'test-bazaar-jade',
      resourceId: 'jadeCarving',
      originRegionId: 'xiyu',
      originSubregionId: 'xiyu-bazaar',
      createdTurn: s.turn,
      quality: 0.84,
      descriptors: ['温润', '因材'],
      appraisal: '一件顺玉成形的小玉作，适合巴扎换货。',
      displayName: '顺玉护件',
      status: 'held',
    };
    s = {
      ...s,
      currentRegion: 'xiyu',
      currentSubregion: 'xiyu-bazaar',
      unlockedRegions: [...new Set([...s.unlockedRegions, 'xueyu', 'xiyu'])],
      calendar: { ...s.calendar, day: 1, phase: 'dusk' },
      resources: { ...s.resources, jadeCarving: 1, tibetanSilver: 1, labor: 8 },
      itemInstances: [jade, ...s.itemInstances],
    };
    const beforeCoin = s.resources.coin ?? 0;
    const beforeReputation = s.regionReputation.xiyu ?? 0;

    // 开市晨：售出一件玉作，命中玉佩护件组合与识玉行客
    s = gameReducer(
      s,
      { type: 'PERFORM_ACTIVITY', activityId: 'xiyu-bazaar-trade', quality: 0.9, stallStrategyId: 'connoisseur-rare-table' },
      content,
    );
    expect(s.resources.jadeCarving).toBe(0);
    expect(s.resources.coin).toBeGreaterThan(beforeCoin);
    expect(s.itemInstances.some((it) => it.id === jade.id)).toBe(false);
    expect(s.flags).toContain('festival-stall:xiyu-bazaar-trade');
    expect(s.flags).toContain('stall-stage:xiyu-bazaar-trade:open');
    expect(s.flags).toContain('stall-strategy:xiyu-bazaar-trade:connoisseur-rare-table');
    expect(s.regionReputation.xiyu).toBeGreaterThan(beforeReputation);
    expect(s.nightMarketStallRecords[0]).toMatchObject({
      activityId: 'xiyu-bazaar-trade',
      title: '绿洲巴扎摊',
      itemResourceId: 'jadeCarving',
      stageId: 'open',
      cycleLabel: '巴扎赶集期',
    });

    // 旺市晌、散市暮
    s = { ...s, calendar: { ...s.calendar, day: 2, phase: 'dusk' }, resources: { ...s.resources, jadeCarving: 1, tibetanSilver: 1, labor: 8 } };
    s = gameReducer(s, { type: 'PERFORM_ACTIVITY', activityId: 'xiyu-bazaar-trade', quality: 0.8 }, content);
    expect(s.flags).toContain('stall-stage:xiyu-bazaar-trade:busy');

    s = { ...s, calendar: { ...s.calendar, day: 3, phase: 'dusk' }, resources: { ...s.resources, carpet: 1, copperware: 1, tea: 1, labor: 8 } };
    s = gameReducer(s, { type: 'PERFORM_ACTIVITY', activityId: 'xiyu-bazaar-trade', quality: 0.8 }, content);
    expect(s.flags).toContain('stall-stage:xiyu-bazaar-trade:closing');
    expect(s.pendingActivityStallClosing?.activityId).toBe('xiyu-bazaar-trade');

    // 散市选择：立巴扎货约，生成来季货约预约后续单
    s = gameReducer(s, { type: 'RESOLVE_ACTIVITY_STALL_CLOSING', choiceId: 'seal-barter-contract' }, content);
    expect(s.pendingActivityStallClosing).toBeNull();
    expect(s.flags).toContain('bazaar-closing-barter-contract');
    const followUp = s.activeOrders.find((o) => o.title === '来季巴扎货约预约');
    expect(followUp?.title).toBe('来季巴扎货约预约');
    expect(followUp?.resourceId).toBe('jadeCarving');
    expect(s.npcStates['xu-sali']?.knownTopics).toContain('bazaar-contract');
  });

  it('赣鄱瓷镇开窑会会推进瓷样摊、归档火色簿并生成复样单', () => {
    const base = freshState();
    let s: GameState = {
      ...base,
      currentRegion: 'ganpo',
      currentSubregion: 'ganpo-kiln-town',
      unlockedRegions: [...new Set([...base.unlockedRegions, 'ganpo', 'huizhou', 'jingchu'])],
      calendar: { ...base.calendar, day: 2, phase: 'afternoon' },
      resources: {
        ...base.resources,
        porcelainClay: 3,
        coal: 3,
        celadonWare: 1,
        pigmentRefined: 1,
        labor: 10,
      },
    };

    const beforeCoin = s.resources.coin ?? 0;
    const beforeReputation = s.regionReputation.ganpo ?? 0;

    s = gameReducer(
      s,
      {
        type: 'PERFORM_ACTIVITY',
        activityId: 'gp-kiln-opening-fair',
        quality: 0.88,
        stallStrategyId: 'fire-color-ranking',
      },
      content,
    );
    expect(s.flags).toContain('festival-stall:gp-kiln-opening-fair');
    expect(s.flags).toContain('stall-stage:gp-kiln-opening-fair:test-shard');
    expect(s.flags).toContain('stall-strategy:gp-kiln-opening-fair:fire-color-ranking');
    expect(s.flags).toContain('kiln-opening-trial-order-open');
    expect(s.resources.coin).toBeGreaterThan(beforeCoin);
    expect(s.regionReputation.ganpo).toBeGreaterThan(beforeReputation);
    expect(s.nightMarketStallRecords[0]).toMatchObject({
      activityId: 'gp-kiln-opening-fair',
      title: '开窑瓷样摊',
      itemResourceId: 'jingdezhenPorcelain',
      stageId: 'test-shard',
      strategyId: 'fire-color-ranking',
      cycleLabel: '开窑日',
    });
    expect(s.activeOrders.some((order) => order.title === '开窑试片急单')).toBe(true);

    s = {
      ...s,
      calendar: { ...s.calendar, day: 3, phase: 'dusk' },
      resources: { ...s.resources, porcelainClay: 3, coal: 3, celadonWare: 1, labor: 10 },
    };
    s = gameReducer(s, { type: 'PERFORM_ACTIVITY', activityId: 'gp-kiln-opening-fair', quality: 0.78 }, content);
    expect(s.flags).toContain('stall-stage:gp-kiln-opening-fair:market-review');

    s = {
      ...s,
      calendar: { ...s.calendar, day: 4, phase: 'night' },
      resources: { ...s.resources, porcelainClay: 3, coal: 3, pigmentRefined: 1, labor: 10 },
    };
    s = gameReducer(s, { type: 'PERFORM_ACTIVITY', activityId: 'gp-kiln-opening-fair', quality: 0.82 }, content);
    expect(s.flags).toContain('stall-stage:gp-kiln-opening-fair:ledger-closing');
    expect(s.flags).toContain('stall-chain-completed:gp-kiln-opening-fair');
    expect(s.pendingActivityStallClosing).toMatchObject({
      activityId: 'gp-kiln-opening-fair',
      stageId: 'ledger-closing',
    });

    const beforeAffinity = s.npcAffinity['gp-wen-yaotou'] ?? 0;
    s = gameReducer(s, { type: 'RESOLVE_ACTIVITY_STALL_CLOSING', choiceId: 'archive-fire-color-ledger' }, content);
    expect(s.pendingActivityStallClosing).toBeNull();
    expect(s.flags).toContain('kiln-closing-fire-color-ledger');
    expect(s.flags).toContain('stall-closing-choice:gp-kiln-opening-fair:archive-fire-color-ledger');
    expect(s.flags).toContain('stall-closing-followup-order:gp-kiln-opening-fair:archive-fire-color-ledger');
    expect(s.nightMarketStallRecords[0]).toMatchObject({
      closingChoiceId: 'archive-fire-color-ledger',
      closingChoiceTitle: '归档火色簿',
    });
    expect(s.npcAffinity['gp-wen-yaotou']).toBeGreaterThan(beforeAffinity);
    expect(s.npcStates['gp-wen-yaotou']?.knownTopics).toContain('fire-color-ledger');
    expect(s.npcStates['gp-wen-yaotou']?.knownTopics).toContain('fire-color-return-order');

    const followUp = s.activeOrders.find((order) => order.title === '瓷镇火色复样单');
    expect(followUp).toMatchObject({
      npcId: 'gp-wen-yaotou',
      resourceId: 'jingdezhenPorcelain',
      quantity: 1,
      orderKind: 'festival',
      sourceActivityId: 'gp-kiln-opening-fair',
      status: 'active',
    });
  });

  it('巴蜀茶马会会推进货摊阶段、封账路书并生成轻担茶约', () => {
    const base = freshState();
    let s: GameState = {
      ...base,
      currentRegion: 'bashu',
      currentSubregion: 'bashu-tea-horse',
      unlockedRegions: [...new Set([...base.unlockedRegions, 'bashu', 'qiandian', 'xueyu'])],
      calendar: { ...base.calendar, day: 1, phase: 'morning' },
      resources: {
        ...base.resources,
        tea: 3,
        teaLeaf: 2,
        bambooWare: 2,
        ironIngot: 1,
        labor: 10,
      },
    };

    const beforeCoin = s.resources.coin ?? 0;
    const beforeReputation = s.regionReputation.bashu ?? 0;

    s = gameReducer(
      s,
      {
        type: 'PERFORM_ACTIVITY',
        activityId: 'bs-tea-horse-post',
        quality: 0.9,
        stallStrategyId: 'load-ledger-table',
      },
      content,
    );
    expect(s.flags).toContain('festival-stall:bs-tea-horse-post');
    expect(s.flags).toContain('stall-stage:bs-tea-horse-post:open-post');
    expect(s.flags).toContain('stall-strategy:bs-tea-horse-post:load-ledger-table');
    expect(s.flags).toContain('tea-horse-supply-order-open');
    expect(s.resources.coin).toBeGreaterThan(beforeCoin);
    expect(s.regionReputation.bashu).toBeGreaterThan(beforeReputation);
    expect(s.nightMarketStallRecords[0]).toMatchObject({
      activityId: 'bs-tea-horse-post',
      title: '茶马会货摊',
      itemResourceId: 'tea',
      stageId: 'open-post',
      strategyId: 'load-ledger-table',
      comboId: 'tea-bamboo-load',
      customerId: 'mabang-carriers',
      cycleLabel: '茶马会',
    });
    expect(s.npcStates['bs-mabang-ayue']?.knownTopics).toContain('stall-combo:tea-bamboo-load');

    s = {
      ...s,
      calendar: { ...s.calendar, day: 2, phase: 'afternoon' },
      resources: { ...s.resources, tea: 3, teaLeaf: 2, bambooWare: 1, labor: 10 },
    };
    s = gameReducer(
      s,
      {
        type: 'PERFORM_ACTIVITY',
        activityId: 'bs-tea-horse-post',
        quality: 0.82,
        stallStrategyId: 'border-tea-contract',
      },
      content,
    );
    expect(s.flags).toContain('stall-stage:bs-tea-horse-post:barter-noon');
    expect(s.flags).toContain('stall-strategy:bs-tea-horse-post:border-tea-contract');

    s = {
      ...s,
      calendar: { ...s.calendar, day: 3, phase: 'dusk' },
      resources: { ...s.resources, tea: 3, ironIngot: 1, labor: 10 },
    };
    s = gameReducer(
      s,
      {
        type: 'PERFORM_ACTIVITY',
        activityId: 'bs-tea-horse-post',
        quality: 0.86,
        stallStrategyId: 'snow-pass-account',
      },
      content,
    );
    expect(s.flags).toContain('stall-stage:bs-tea-horse-post:ledger-close');
    expect(s.flags).toContain('stall-chain-completed:bs-tea-horse-post');
    expect(s.pendingActivityStallClosing).toMatchObject({
      activityId: 'bs-tea-horse-post',
      stageId: 'ledger-close',
    });

    const beforeAffinity = s.npcAffinity['bs-mabang-ayue'] ?? 0;
    s = gameReducer(s, { type: 'RESOLVE_ACTIVITY_STALL_CLOSING', choiceId: 'archive-load-ledger' }, content);
    expect(s.pendingActivityStallClosing).toBeNull();
    expect(s.flags).toContain('tea-horse-closing-load-ledger');
    expect(s.flags).toContain('stall-closing-choice:bs-tea-horse-post:archive-load-ledger');
    expect(s.flags).toContain('stall-closing-followup-order:bs-tea-horse-post:archive-load-ledger');
    expect(s.flags).toContain('route-known:route-bashu-qiandian-tea-horse');
    expect(s.npcAffinity['bs-mabang-ayue']).toBeGreaterThan(beforeAffinity);
    expect(s.npcStates['bs-mabang-ayue']?.knownTopics).toContain('tea-horse-load-ledger');
    expect(s.npcStates['bs-mabang-ayue']?.knownTopics).toContain('light-load-tea-order');
    expect(s.nightMarketStallRecords[0]).toMatchObject({
      closingChoiceId: 'archive-load-ledger',
      closingChoiceTitle: '归档货重路书',
    });

    const followUp = s.activeOrders.find((order) => order.title === '马帮轻担茶约');
    expect(followUp).toMatchObject({
      npcId: 'bs-mabang-ayue',
      resourceId: 'tea',
      quantity: 2,
      orderKind: 'route',
      sourceActivityId: 'bs-tea-horse-post',
      status: 'active',
    });

    const ready = {
      ...s,
      resources: { ...s.resources, tea: (s.resources.tea ?? 0) + (followUp?.quantity ?? 0) },
    };
    const delivered = gameReducer(ready, { type: 'FULFILL_ORDER', orderId: followUp!.id }, content);
    expect(delivered.flags).toContain(`order-completed:${followUp!.id}`);
    expect(delivered.flags).toContain('route-order-completed:bs-tea-horse-post');
    expect(delivered.regionReputation.bashu).toBeGreaterThan(s.regionReputation.bashu ?? 0);
  });

  it('岭南骑楼夜市会推进船期摊位、归档样账并生成外销复样单', () => {
    const base = freshState();
    let s: GameState = {
      ...base,
      currentRegion: 'lingnan',
      currentSubregion: 'lingnan-harbor',
      unlockedRegions: [...new Set([...base.unlockedRegions, 'lingnan', 'qiandian'])],
      calendar: { ...base.calendar, day: 2, phase: 'dusk' },
      resources: {
        ...base.resources,
        gambieredSilk: 2,
        cantonEmbroidery: 1,
        tea: 2,
        shiwanWare: 1,
        duanInkstone: 1,
        ironIngot: 1,
        labor: 10,
      },
    };

    const beforeCoin = s.resources.coin ?? 0;
    const beforeReputation = s.regionReputation.lingnan ?? 0;

    s = gameReducer(
      s,
      {
        type: 'PERFORM_ACTIVITY',
        activityId: 'ln-qilou-night-market',
        quality: 0.9,
        stallStrategyId: 'ship-date-ledger-table',
      },
      content,
    );
    expect(s.flags).toContain('festival-stall:ln-qilou-night-market');
    expect(s.flags).toContain('stall-stage:ln-qilou-night-market:open-awning');
    expect(s.flags).toContain('stall-strategy:ln-qilou-night-market:ship-date-ledger-table');
    expect(s.flags).toContain('qilou-ship-date-order-open');
    expect(s.resources.coin).toBeGreaterThan(beforeCoin);
    expect(s.regionReputation.lingnan).toBeGreaterThan(beforeReputation);
    expect(s.nightMarketStallRecords[0]).toMatchObject({
      activityId: 'ln-qilou-night-market',
      title: '骑楼夜市摊',
      itemResourceId: 'gambieredSilk',
      stageId: 'open-awning',
      strategyId: 'ship-date-ledger-table',
      comboId: 'sail-date-silk-roll',
      customerId: 'harbor-exporters',
      cycleLabel: '骑楼开市夜',
    });
    expect(s.activeOrders.some((order) => order.title === '骑楼船期急单')).toBe(true);
    expect(s.npcStates['ln-wu-haichao']?.knownTopics).toContain('stall-combo:sail-date-silk-roll');

    s = {
      ...s,
      calendar: { ...s.calendar, day: 3, phase: 'night' },
      resources: { ...s.resources, tea: 2, shiwanWare: 1, labor: 10 },
    };
    s = gameReducer(
      s,
      {
        type: 'PERFORM_ACTIVITY',
        activityId: 'ln-qilou-night-market',
        quality: 0.84,
        stallStrategyId: 'rain-awning-supper',
      },
      content,
    );
    expect(s.flags).toContain('stall-stage:ln-qilou-night-market:night-bargain');
    expect(s.flags).toContain('stall-strategy:ln-qilou-night-market:rain-awning-supper');

    s = {
      ...s,
      calendar: { ...s.calendar, day: 4, phase: 'dusk' },
      resources: { ...s.resources, gambieredSilk: 2, duanInkstone: 1, ironIngot: 1, labor: 10 },
    };
    s = gameReducer(
      s,
      {
        type: 'PERFORM_ACTIVITY',
        activityId: 'ln-qilou-night-market',
        quality: 0.86,
        stallStrategyId: 'wenfang-cargo-ledger',
      },
      content,
    );
    expect(s.flags).toContain('stall-stage:ln-qilou-night-market:ship-date-close');
    expect(s.flags).toContain('stall-chain-completed:ln-qilou-night-market');
    expect(s.pendingActivityStallClosing).toMatchObject({
      activityId: 'ln-qilou-night-market',
      stageId: 'ship-date-close',
    });

    const beforeAffinity = s.npcAffinity['ln-wu-haichao'] ?? 0;
    s = gameReducer(s, { type: 'RESOLVE_ACTIVITY_STALL_CLOSING', choiceId: 'archive-ship-date-ledger' }, content);
    expect(s.pendingActivityStallClosing).toBeNull();
    expect(s.flags).toContain('qilou-closing-ship-date-ledger');
    expect(s.flags).toContain('stall-closing-choice:ln-qilou-night-market:archive-ship-date-ledger');
    expect(s.flags).toContain('stall-closing-followup-order:ln-qilou-night-market:archive-ship-date-ledger');
    expect(s.flags).toContain('route-known:route-qiandian-lingnan-harbor');
    expect(s.npcAffinity['ln-wu-haichao']).toBeGreaterThan(beforeAffinity);
    expect(s.npcStates['ln-wu-haichao']?.knownTopics).toContain('qilou-ship-date-ledger');
    expect(s.npcStates['ln-wu-haichao']?.knownTopics).toContain('qilou-return-sample-order');
    expect(s.nightMarketStallRecords[0]).toMatchObject({
      closingChoiceId: 'archive-ship-date-ledger',
      closingChoiceTitle: '归档船期样账',
    });

    const followUp = s.activeOrders.find((order) => order.title === '骑楼船期样单');
    expect(followUp).toMatchObject({
      npcId: 'ln-wu-haichao',
      resourceId: 'gambieredSilk',
      quantity: 1,
      orderKind: 'route',
      sourceActivityId: 'ln-qilou-night-market',
      status: 'active',
    });

    const ready = {
      ...s,
      resources: { ...s.resources, gambieredSilk: (s.resources.gambieredSilk ?? 0) + (followUp?.quantity ?? 0) },
    };
    const delivered = gameReducer(ready, { type: 'FULFILL_ORDER', orderId: followUp!.id }, content);
    expect(delivered.flags).toContain(`order-completed:${followUp!.id}`);
    expect(delivered.flags).toContain('route-order-completed:ln-qilou-night-market');
    expect(delivered.regionReputation.lingnan).toBeGreaterThan(s.regionReputation.lingnan ?? 0);
  });

  it('地图规格会带出当前小地区活动点和占位 NPC 锚点', () => {
    const s = gameReducer(
      freshState(),
      { type: 'TRAVEL_SUBREGION', subregionId: 'jiangnan-longquan' },
      content,
    );
    const spec = buildRegionSpec('jiangnan', s);
    expect(spec?.activities.map((activity) => activity.id)).toContain('jn-longquan-sword-forge');
    expect(spec?.industries.map((industry) => industry.id)).toContain('smelt-iron');
    expect(spec?.industries.map((industry) => industry.id)).not.toContain('build-indigo');
    expect(spec?.crafts.map((craft) => craft.id)).toEqual(expect.arrayContaining(['celadon', 'longquan-sword']));
    expect(spec?.crafts.map((craft) => craft.id)).not.toContain('indigo-dyeing');
    expect(spec?.subregionGates.map((gate) => gate.subregionId)).toContain('jiangnan-suhang');
    expect(spec?.subregionGates.map((gate) => gate.subregionId)).not.toContain('jiangnan-longquan');
    const lu = spec?.npcs.find((npc) => npc.id === 'jn-lu-hanquan');
    expect(lu?.anchorId).toBe('jn-longquan-sword-forge');
  });

  it('地图规格会按天气日程选择 NPC 所在小地区', () => {
    const rainy = {
      ...freshState(),
      currentSubregion: 'jiangnan-linan',
      calendar: { ...freshState().calendar, phase: 'morning' as const, weather: 'rain' as const },
    };
    const rainySpec = buildRegionSpec('jiangnan', rainy);
    expect(rainySpec?.npcs.map((npc) => npc.id)).toContain('jn-lin-yuqiao');

    const away = { ...rainy, currentSubregion: 'jiangnan-taihu' };
    const awaySpec = buildRegionSpec('jiangnan', away);
    expect(awaySpec?.npcs.map((npc) => npc.id)).not.toContain('jn-lin-yuqiao');
  });

  it('每条大地区邻接都有结构化路线定义', () => {
    const routePairs = new Set(
      REGION_ROUTES.map((route) => [route.fromRegionId, route.toRegionId].sort().join('|')),
    );
    for (const region of REGIONS) {
      for (const neighborId of region.neighbors) {
        if (!REGIONS.some((candidate) => candidate.id === neighborId)) continue;
        expect(routePairs.has([region.id, neighborId].sort().join('|'))).toBe(true);
      }
    }
  });

  it('地图出入口会携带路线名、路资和解锁提示', () => {
    const s = freshState();
    for (const region of REGIONS) {
      const spec = buildRegionSpec(region.id, s);
      expect(spec?.gates.length).toBe(region.neighbors.length);
      for (const gate of spec?.gates ?? []) {
        expect(gate.routeId).toBeTruthy();
        expect(gate.routeName).toBeTruthy();
        expect(gate.unlockCost).toBeGreaterThan(0);
        expect(gate.unlockHint).toBeTruthy();
      }
    }
  });

  it('GATHER_RESOURCE 拒绝本地不具备的产业', () => {
    const s = freshState(); // 江南不具备 refine-silver（提银）
    const s1 = gameReducer(s, { type: 'GATHER_RESOURCE', industryId: 'refine-silver' }, content);
    expect(s1.resources.silverStock ?? 0).toBe(0);
  });

  it('GATHER_RESOURCE rejects industries outside the current subregion', () => {
    const s0 = freshState();
    const s = { ...s0, resources: { ...s0.resources, ironOre: 4, coal: 4 } };
    const s1 = gameReducer(s, { type: 'GATHER_RESOURCE', industryId: 'smelt-iron', quality: 1 }, content);
    expect(s1.resources.ironIngot ?? 0).toBe(0);
    expect(s1.itemInstances.length).toBe(s.itemInstances.length);
    expect(s1.log.length).toBeGreaterThan(s.log.length);
  });

  it('UNLOCK_REGION 解锁相邻地区并扣除路资', () => {
    let s = freshState();
    s = { ...s, resources: { ...s.resources, coin: 100 } };
    // 江南相邻 huizhou（徽州）
    const s1 = gameReducer(s, { type: 'UNLOCK_REGION', regionId: 'huizhou' }, content);
    expect(s1.unlockedRegions).toContain('huizhou');
    expect(s1.resources.coin).toBeLessThan(s.resources.coin);
    expect(s1.regionReputation.huizhou).toBe(3);
    expect(s1.regionReputation.jiangnan).toBeGreaterThan(s.regionReputation.jiangnan);
    expect(routeStabilityOf(s1, 'route-jiangnan-huizhou-paper')).toBeGreaterThan(routeStabilityOf(s, 'route-jiangnan-huizhou-paper'));
    expect(s1.log.some((line) => line.includes('江南纸墨路'))).toBe(true);
  });

  it('UNLOCK_REGION 掌握路线情报后会降低开路路资', () => {
    let s = freshState();
    s = {
      ...s,
      flags: [...s.flags, 'route-known:route-jiangnan-huizhou-paper'],
      resources: { ...s.resources, coin: 100 },
    };
    const s1 = gameReducer(s, { type: 'UNLOCK_REGION', regionId: 'huizhou' }, content);
    expect(s1.unlockedRegions).toContain('huizhou');
    expect(s1.resources.coin).toBe(77);
    expect(s1.log.some((line) => line.includes('省下 7 文'))).toBe(true);
  });

  it('UNLOCK_REGION 会执行路线属性门槛', () => {
    let s = freshState();
    s = { ...s, resources: { ...s.resources, coin: 100 } };
    const blocked = gameReducer(s, { type: 'UNLOCK_REGION', regionId: 'jingji' }, content);
    expect(blocked.unlockedRegions).not.toContain('jingji');

    s = { ...s, profile: { ...s.profile, attributes: { ...s.profile.attributes, commerce: 8 } } };
    const opened = gameReducer(s, { type: 'UNLOCK_REGION', regionId: 'jingji' }, content);
    expect(opened.unlockedRegions).toContain('jingji');
    expect(opened.resources.coin).toBe(64);
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

  it('供应链：RUN_PROCESS 同步消耗已记录的半成品实例', () => {
    let s = freshState();
    const marker = {
      id: 'tracked-indigo-vat',
      resourceId: 'indigoVat',
      originRegionId: s.currentRegion,
      originSubregionId: s.currentSubregion,
      createdTurn: s.turn,
      quality: 0.8,
      descriptors: ['tracked'],
      appraisal: 'tracked vat',
    };
    s = {
      ...s,
      resources: { ...s.resources, indigoVat: 3 },
      itemInstances: [marker],
    };
    const s1 = gameReducer(
      s,
      { type: 'RUN_PROCESS', craftId: 'indigo-dyeing', skipStepIds: [] },
      content,
    );
    expect(s1.itemInstances.some((item) => item.id === marker.id)).toBe(false);
    expect(s1.itemInstances[0]?.resourceId).toBe('indigoCloth');
  });

  it('龙泉链路：上游铁锭品质会传入最终剑器实例', () => {
    const { state: s, ingotId } = forgeHighQualitySword();
    const sword = s.itemInstances[0];
    expect(sword.resourceId).toBe('treasureSword');
    expect(sword.sourceCraftId).toBe('longquan-sword');
    expect(sword.sourceItemIds).toContain(ingotId);
    expect(sword.quality).toBeGreaterThan(0.75);
    expect(sword.descriptors.some((word) => ['仙逸', '寒光', '百折', '刚柔并济'].includes(word))).toBe(true);
  });

  it('代表作：高品质作品可题名、陈列并赠予 NPC', () => {
    let s = forgeHighQualitySword().state;
    const swordId = s.itemInstances[0].id;

    s = gameReducer(s, { type: 'NAME_ITEM', itemId: swordId }, content);
    let sword = s.itemInstances.find((item) => item.id === swordId)!;
    expect(sword.displayName).toBeTruthy();
    expect(sword.authorName).toBe('无名匠人');
    expect(s.flags).toContain('named-first-masterwork');

    s = gameReducer(s, { type: 'DISPLAY_ITEM', itemId: swordId }, content);
    sword = s.itemInstances.find((item) => item.id === swordId)!;
    expect(sword.status).toBe('displayed');
    expect(s.flags).toContain('displayed-first-masterwork');

    const beforeGiftStock = s.resources.treasureSword ?? 0;
    s = gameReducer(s, { type: 'GIFT_ITEM', itemId: swordId, npcId: 'jn-ning-ciqiu' }, content);
    sword = s.itemInstances.find((item) => item.id === swordId)!;
    expect(sword.status).toBe('gifted');
    expect(sword.giftedToNpcId).toBe('jn-ning-ciqiu');
    expect(s.resources.treasureSword).toBe(beforeGiftStock - 1);
    expect(s.npcAffinity['jn-ning-ciqiu']).toBeGreaterThanOrEqual(18);
    expect(s.flags).toContain('ning-mentioned-huizhou-stationery');
    expect(s.npcStates['jn-ning-ciqiu'].revealedIntelIds).toContain('intel-ning-stationery-route');
    expect(s.log[0]).toContain('正合其意');
  });

  it('代表作：常规售出会保留履历并退出赠礼与订单消耗链路', () => {
    let s = forgeHighQualitySword().state;
    const swordId = s.itemInstances[0].id;
    s = gameReducer(s, { type: 'NAME_ITEM', itemId: swordId }, content);
    const beforeCoin = s.resources.coin ?? 0;
    const beforeStock = s.resources.treasureSword ?? 0;

    s = gameReducer(s, { type: 'SELL_ITEM', itemId: swordId }, content);

    const sold = s.itemInstances.find((item) => item.id === swordId)!;
    expect(sold.status).toBe('sold');
    expect(sold.soldForCoin).toBeGreaterThan(0);
    expect(sold.soldAtDay).toBe(s.calendar.day);
    expect(sold.soldAtRegionId).toBe(s.currentRegion);
    expect(s.resources.coin).toBe(beforeCoin + sold.soldForCoin!);
    expect(s.resources.treasureSword).toBe(beforeStock - 1);
    expect(s.flags).toContain('item-sold');
    expect(s.flags).toContain('item-sold:treasureSword');

    const afterSoldStock = s.resources.treasureSword ?? 0;
    const blockedGift = gameReducer(s, { type: 'GIFT_ITEM', itemId: swordId, npcId: 'jn-ning-ciqiu' }, content);
    expect(blockedGift.itemInstances.find((item) => item.id === swordId)?.status).toBe('sold');
    expect(blockedGift.resources.treasureSword).toBe(afterSoldStock);

    const replica: ItemInstance = {
      ...sold,
      id: 'held-treasure-sword-replica',
      displayName: '试铸副剑',
      status: 'held',
      soldForCoin: undefined,
      soldAtDay: undefined,
      soldAtPhase: undefined,
      soldAtRegionId: undefined,
      soldAtSubregionId: undefined,
      createdTurn: sold.createdTurn + 1,
    };
    const order: ActiveOrder = {
      id: 'test-sold-item-order',
      npcId: 'jn-ning-ciqiu',
      title: '试收龙泉剑',
      desc: '测试已售作品不会被订单交付误消耗。',
      regionId: 'jiangnan',
      resourceId: 'treasureSword',
      quantity: 1,
      minQuality: 0.7,
      rewardCoin: 40,
      createdDay: blockedGift.calendar.day,
      status: 'active',
    };
    const ready = {
      ...blockedGift,
      resources: { ...blockedGift.resources, treasureSword: 1 },
      itemInstances: [sold, replica, ...blockedGift.itemInstances.filter((item) => item.id !== swordId)],
      activeOrders: [order],
    };

    const delivered = gameReducer(ready, { type: 'FULFILL_ORDER', orderId: order.id }, content);
    expect(delivered.itemInstances.find((item) => item.id === swordId)?.status).toBe('sold');
    expect(delivered.itemInstances.some((item) => item.id === replica.id)).toBe(false);
    expect(delivered.resources.treasureSword).toBe(0);
    expect(delivered.activeOrders.find((item) => item.id === order.id)?.status).toBe('completed');

    const ended = gameReducer(
      {
        ...delivered,
        turn: delivered.maxTurns,
        pendingEvent: null,
        pendingEscortCrisis: null,
        pendingSupplyCrisis: null,
        pendingActivityStallClosing: null,
      },
      { type: 'END_TURN' },
      content,
    );
    expect(ended.status).toBe('ended');
    expect(
      ended.report?.highlights.some(
        (line) =>
          line.includes('常规售出作品') &&
          line.includes(sold.displayName!) &&
          line.includes(`${sold.soldForCoin}`),
      ),
    ).toBe(true);
  });

  it('百工院来访：NPC 会参观已陈列代表作并留下珍品阁记录', () => {
    let s = forgeHighQualitySword().state;
    const swordId = s.itemInstances[0].id;
    s = gameReducer(s, { type: 'NAME_ITEM', itemId: swordId }, content);
    s = gameReducer(s, { type: 'DISPLAY_ITEM', itemId: swordId }, content);
    const displayed = s.itemInstances.find((item) => item.id === swordId)!;
    const beforeRep = s.regionReputation.jiangnan ?? 0;
    s = { ...s, npcAffinity: { ...s.npcAffinity, 'jn-ning-ciqiu': 24 } };

    s = gameReducer(s, { type: 'USE_NPC_FUNCTION', npcId: 'jn-ning-ciqiu', functionKind: 'homeVisit' }, content);

    expect(s.flags).toContain('npc-home-visit:jn-ning-ciqiu');
    expect(s.flags).toContain('homevisit:homevisit-ning-masterwork-critique');
    expect(s.flags).toContain('baigongyuan-gallery-open');
    expect(s.homeVisitRecords[0]).toMatchObject({
      npcId: 'jn-ning-ciqiu',
      title: '珍品阁夜评',
      itemId: swordId,
      itemName: displayed.displayName,
      itemResourceId: 'treasureSword',
    });
    expect(s.homeVisitRecords[0].summary).toContain('器物若肯入人间');
    expect(s.npcStates['jn-ning-ciqiu'].knownTopics).toContain('gallery-visit');
    expect(s.npcStates['jn-ning-ciqiu'].knownTopics).toContain('homevisit:homevisit-ning-masterwork-critique');
    expect(s.regionReputation.jiangnan).toBeGreaterThan(beforeRep);
    expect(s.log.some((entry) => entry.includes('来百工院参观'))).toBe(true);
  });

  it('百工院来访：暂无陈列时只记录院中走动，不写珍品阁参观', () => {
    let s = freshState();
    s = { ...s, npcAffinity: { ...s.npcAffinity, 'jn-qiao-zhaoye': 24 } };

    s = gameReducer(s, { type: 'USE_NPC_FUNCTION', npcId: 'jn-qiao-zhaoye', functionKind: 'homeVisit' }, content);

    expect(s.flags).toContain('npc-home-visit:jn-qiao-zhaoye');
    expect(s.flags).not.toContain('gallery-visit:jn-qiao-zhaoye');
    expect(s.homeVisitRecords[0]).toMatchObject({
      npcId: 'jn-qiao-zhaoye',
      title: '百工院来访',
    });
    expect(s.homeVisitRecords[0].itemId).toBeUndefined();
    expect(s.npcStates['jn-qiao-zhaoye'].knownTopics).toContain('home-visit');
    expect(s.log[0]).toContain('百工院走动');
  });

  it('百工院来访：外地 NPC 会读取陈列作品并写入地区声望与见闻', () => {
    let s = freshState();
    const paper: ItemInstance = {
      id: 'display-huizhou-xuan-paper',
      resourceId: 'xuanPaper',
      sourceCraftId: 'xuan-paper',
      originRegionId: 'huizhou',
      originSubregionId: 'huizhou-paper-valley',
      createdTurn: s.turn,
      quality: 0.72,
      descriptors: ['润墨稳定', '纸骨清正'],
      appraisal: '纸性清润，适合题跋。',
      displayName: '澄心堂宣纸样',
      authorName: '测试匠',
      status: 'displayed',
    };
    const beforeRep = s.regionReputation.huizhou ?? 0;
    s = {
      ...s,
      itemInstances: [paper, ...s.itemInstances],
      resources: { ...s.resources, xuanPaper: (s.resources.xuanPaper ?? 0) + 1 },
      npcAffinity: { ...s.npcAffinity, 'hz-wang-zhiniang': 28 },
    };

    s = gameReducer(
      s,
      {
        type: 'USE_NPC_FUNCTION',
        npcId: 'hz-wang-zhiniang',
        functionKind: 'homeVisit',
        homeVisitChoiceId: 'stationery-inscription',
      },
      content,
    );
    const updatedPaper = s.itemInstances.find((item) => item.id === paper.id)!;

    expect(s.flags).toContain('npc-home-visit:hz-wang-zhiniang');
    expect(s.flags).toContain('homevisit:homevisit-wang-paper-inscription');
    expect(s.flags).toContain('baigongyuan-stationery-display');
    expect(s.flags).toContain('homevisit-choice:stationery-inscription');
    expect(s.flags).toContain('homevisit-kind:inscribe');
    expect(s.flags).toContain('homevisit-choice-wang-stationery-inscription');
    expect(s.homeVisitRecords[0]).toMatchObject({
      npcId: 'hz-wang-zhiniang',
      title: '纸谷题看',
      choiceId: 'stationery-inscription',
      choiceLabel: '题跋留名',
      choiceKind: 'inscribe',
      itemId: paper.id,
      itemName: paper.displayName,
      itemResourceId: 'xuanPaper',
    });
    expect(s.homeVisitRecords[0].summary).toContain('题跋不是压角');
    expect(updatedPaper.inscription).toContain('纸墨有骨');
    expect(updatedPaper.appraisal).toContain('纸墨题跋');
    expect(s.npcStates['hz-wang-zhiniang'].knownTopics).toContain('homevisit:homevisit-wang-paper-inscription');
    expect(s.npcStates['hz-wang-zhiniang'].knownTopics).toContain('homevisit-choice:stationery-inscription');
    expect(s.npcStates['hz-wang-zhiniang'].knownTopics).toContain('homevisit-kind:inscribe');
    expect(s.npcStates['hz-wang-zhiniang'].knownTopics).toContain('paper-inscription');
    expect(s.npcStates['hz-wang-zhiniang'].knownTopics).toContain('stationery-inscription');
    expect(s.npcStates['hz-wang-zhiniang'].knownTopics).toContain('display:xuanPaper');
    expect(s.regionReputation.huizhou).toBeGreaterThan(beforeRep);
    expect(s.log.some((entry) => entry.includes('澄心堂宣纸样'))).toBe(true);
  });

  it('百工院来访：收藏分支会生成荐藏订单并在交付后进入结局轨迹', () => {
    let s = freshState();
    const paper: ItemInstance = {
      id: 'display-huizhou-xuan-paper',
      resourceId: 'xuanPaper',
      sourceCraftId: 'xuan-paper',
      originRegionId: 'huizhou',
      originSubregionId: 'huizhou-paper-valley',
      createdTurn: s.turn,
      quality: 0.72,
      descriptors: ['润墨稳定', '纸骨清正'],
      appraisal: '纸性清润，适合题跋。',
      displayName: '澄心堂宣纸样',
      authorName: '测试匠',
      status: 'displayed',
    };
    const replica: ItemInstance = {
      ...paper,
      id: 'held-huizhou-xuan-paper-replica',
      displayName: '澄心堂复样',
      status: 'held',
      quality: 0.7,
      createdTurn: s.turn + 1,
    };
    s = {
      ...s,
      itemInstances: [paper, replica, ...s.itemInstances],
      resources: { ...s.resources, xuanPaper: (s.resources.xuanPaper ?? 0) + 2 },
      npcAffinity: { ...s.npcAffinity, 'hz-wang-zhiniang': 28 },
    };

    s = gameReducer(
      s,
      {
        type: 'USE_NPC_FUNCTION',
        npcId: 'hz-wang-zhiniang',
        functionKind: 'homeVisit',
        homeVisitChoiceId: 'stationery-collection-ledger',
      },
      content,
    );

    const record = s.homeVisitRecords[0];
    const order = s.activeOrders.find((item) => item.id === record.referralOrderId)!;
    expect(record).toMatchObject({
      choiceId: 'stationery-collection-ledger',
      choiceKind: 'collect',
      referralTitle: '文房入藏复单',
    });
    expect(order).toMatchObject({
      npcId: 'hz-wang-zhiniang',
      orderKind: 'referral',
      sourceHomeVisitRecordId: record.id,
      sourceHomeVisitChoiceId: 'stationery-collection-ledger',
      resourceId: 'xuanPaper',
      quantity: 1,
      status: 'active',
    });
    expect(order.desc).toContain('澄心堂宣纸样');
    expect(s.flags).toContain('homevisit-referral:stationery-collection-ledger');
    expect(s.flags).toContain(`homevisit-referral-order:${order.id}`);
    expect(s.npcStates['hz-wang-zhiniang'].knownTopics).toContain('homevisit-referral');
    expect(s.npcStates['hz-wang-zhiniang'].knownTopics).toContain('paper-ledger-order');

    const delivered = gameReducer(s, { type: 'FULFILL_ORDER', orderId: order.id }, content);
    expect(delivered.activeOrders.find((item) => item.id === order.id)?.status).toBe('completed');
    expect(delivered.flags).toContain(`homevisit-order-completed:${record.id}`);
    expect(delivered.flags).toContain('homevisit-referral-completed:stationery-collection-ledger');
    expect(delivered.flags).toContain('referral-order-completed:hz-wang-zhiniang');
    expect(delivered.itemInstances.find((item) => item.id === paper.id)?.status).toBe('displayed');
    expect(delivered.itemInstances.some((item) => item.id === replica.id)).toBe(false);

    const returned = gameReducer(
      {
        ...delivered,
        calendar: { ...delivered.calendar, day: delivered.calendar.day + 1 },
        resources: { ...delivered.resources, xuanPaper: (delivered.resources.xuanPaper ?? 0) + 1 },
      },
      {
        type: 'USE_NPC_FUNCTION',
        npcId: 'hz-wang-zhiniang',
        functionKind: 'homeVisit',
        homeVisitChoiceId: 'collector-continued-ledger',
      },
      content,
    );
    const returnRecord = returned.homeVisitRecords[0];
    const renewalOrder = returned.activeOrders.find((item) => item.id === returnRecord.referralOrderId)!;
    expect(returnRecord).toMatchObject({
      title: '藏客回访 · 文房声誉',
      choiceId: 'collector-continued-ledger',
      choiceKind: 'collect',
      referralTitle: '藏客续订册页',
    });
    expect(returned.flags).toContain('homevisit:homevisit-wang-collector-return');
    expect(returned.flags).toContain('homevisit-wang-collector-return-resolved');
    expect(returned.flags).toContain('collector-reputation-stationery-renewed');
    expect(returned.npcStates['hz-wang-zhiniang'].knownTopics).toContain('collector-return');
    expect(returned.npcStates['hz-wang-zhiniang'].knownTopics).toContain('collector-ledger-renewal');
    expect(renewalOrder).toMatchObject({
      title: '藏客续订册页',
      orderKind: 'referral',
      sourceHomeVisitRecordId: returnRecord.id,
      sourceHomeVisitChoiceId: 'collector-continued-ledger',
      resourceId: 'xuanPaper',
      minQuality: 0.64,
      status: 'active',
    });

    const ended = gameReducer({ ...returned, turn: returned.maxTurns }, { type: 'END_TURN' }, content);
    expect(ended.report?.socialTitle).toBe('珍品阁荐藏匠');
    expect(ended.report?.highlights.some((line) => line.includes('珍品阁收藏转介绍成交 1 单'))).toBe(true);
  });

  it('百工院来访：推光样柜复单交付后会解锁票号藏客回访与续订', () => {
    let s = freshState();
    const lacquer: ItemInstance = {
      id: 'display-pingyao-polish-cabinet',
      resourceId: 'pingyaoLacquer',
      sourceCraftId: 'pingyao-lacquer',
      originRegionId: 'sanjin',
      originSubregionId: 'sanjin-lacquer-yard',
      createdTurn: s.turn,
      quality: 0.74,
      descriptors: ['掌温沉亮', '金线稳'],
      appraisal: '漆面沉稳，适合入柜。',
      displayName: '晋商推光样柜',
      authorName: '测试匠',
      status: 'displayed',
    };
    const replica: ItemInstance = {
      ...lacquer,
      id: 'held-pingyao-polish-replica',
      displayName: '晋商推光复样',
      status: 'held',
      quality: 0.72,
      createdTurn: s.turn + 1,
    };
    s = {
      ...s,
      itemInstances: [lacquer, replica, ...s.itemInstances],
      resources: { ...s.resources, pingyaoLacquer: (s.resources.pingyaoLacquer ?? 0) + 2 },
      npcAffinity: { ...s.npcAffinity, 'sj-pingyao-qipo': 30 },
    };

    s = gameReducer(
      s,
      {
        type: 'USE_NPC_FUNCTION',
        npcId: 'sj-pingyao-qipo',
        functionKind: 'homeVisit',
        homeVisitChoiceId: 'polish-sample-cabinet',
      },
      content,
    );

    const record = s.homeVisitRecords[0];
    const order = s.activeOrders.find((item) => item.id === record.referralOrderId)!;
    expect(record).toMatchObject({
      title: '掌温看漆',
      choiceId: 'polish-sample-cabinet',
      choiceKind: 'collect',
      referralTitle: '推光样柜复单',
      itemName: '晋商推光样柜',
    });
    expect(order).toMatchObject({
      npcId: 'sj-pingyao-qipo',
      regionId: 'sanjin',
      orderKind: 'referral',
      sourceHomeVisitRecordId: record.id,
      sourceHomeVisitChoiceId: 'polish-sample-cabinet',
      resourceId: 'pingyaoLacquer',
      status: 'active',
    });
    expect(order.desc).toContain('晋商推光样柜');
    expect(s.flags).toContain('homevisit-referral:polish-sample-cabinet');
    expect(s.npcStates['sj-pingyao-qipo'].knownTopics).toContain('polish-referral');

    const delivered = gameReducer(s, { type: 'FULFILL_ORDER', orderId: order.id }, content);
    expect(delivered.activeOrders.find((item) => item.id === order.id)?.status).toBe('completed');
    expect(delivered.flags).toContain(`homevisit-order-completed:${record.id}`);
    expect(delivered.flags).toContain('homevisit-referral-completed:polish-sample-cabinet');
    expect(delivered.itemInstances.find((item) => item.id === lacquer.id)?.status).toBe('displayed');
    expect(delivered.itemInstances.some((item) => item.id === replica.id)).toBe(false);

    const returned = gameReducer(
      {
        ...delivered,
        calendar: { ...delivered.calendar, day: delivered.calendar.day + 1 },
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
    const renewalOrder = returned.activeOrders.find((item) => item.id === returnRecord.referralOrderId)!;
    expect(returnRecord).toMatchObject({
      title: '藏客回访 · 推光声誉',
      choiceId: 'polish-credit-ledger',
      choiceKind: 'collect',
      referralTitle: '票号漆柜续订单',
      itemName: '晋商推光样柜',
    });
    expect(returned.flags).toContain('homevisit:homevisit-pingyao-client-return');
    expect(returned.flags).toContain('homevisit-pingyao-client-return-resolved');
    expect(returned.flags).toContain('collector-reputation-polish-renewed');
    expect(returned.npcStates['sj-pingyao-qipo'].knownTopics).toContain('collector-return');
    expect(returned.npcStates['sj-pingyao-qipo'].knownTopics).toContain('polish-credit-ledger');
    expect(renewalOrder).toMatchObject({
      title: '票号漆柜续订单',
      orderKind: 'referral',
      sourceHomeVisitRecordId: returnRecord.id,
      sourceHomeVisitChoiceId: 'polish-credit-ledger',
      resourceId: 'pingyaoLacquer',
      minQuality: 0.66,
      rewardCoin: 44,
      status: 'active',
    });
  });

  it('百工院来访：染样复单交付后会解锁岭南藏客回访与续订', () => {
    let s = freshState();
    const silk: ItemInstance = {
      id: 'display-lingnan-dyed-swatch',
      resourceId: 'gambieredSilk',
      sourceCraftId: 'gambiered-silk',
      originRegionId: 'lingnan',
      originSubregionId: 'lingnan-gambiered-yard',
      createdTurn: s.turn,
      quality: 0.76,
      descriptors: ['日晒层次', '河泥沉色'],
      appraisal: '绸面沉润，适合留作染样。',
      displayName: '岭南晒场染样',
      authorName: '测试匠',
      status: 'displayed',
    };
    const replica: ItemInstance = {
      ...silk,
      id: 'held-lingnan-dyed-swatch-replica',
      displayName: '岭南晒场复样',
      status: 'held',
      quality: 0.73,
      createdTurn: s.turn + 1,
    };
    s = {
      ...s,
      itemInstances: [silk, replica, ...s.itemInstances],
      resources: { ...s.resources, gambieredSilk: (s.resources.gambieredSilk ?? 0) + 2 },
      npcAffinity: { ...s.npcAffinity, 'ln-he-yunsha': 30 },
    };

    s = gameReducer(
      s,
      {
        type: 'USE_NPC_FUNCTION',
        npcId: 'ln-he-yunsha',
        functionKind: 'homeVisit',
        homeVisitChoiceId: 'dyed-swatch-archive',
      },
      content,
    );

    const record = s.homeVisitRecords[0];
    const order = s.activeOrders.find((item) => item.id === record.referralOrderId)!;
    expect(record).toMatchObject({
      title: '日色验绸',
      choiceId: 'dyed-swatch-archive',
      choiceKind: 'collect',
      referralTitle: '染样校色复单',
      itemName: '岭南晒场染样',
    });
    expect(order).toMatchObject({
      npcId: 'ln-he-yunsha',
      regionId: 'lingnan',
      orderKind: 'referral',
      sourceHomeVisitRecordId: record.id,
      sourceHomeVisitChoiceId: 'dyed-swatch-archive',
      resourceId: 'gambieredSilk',
      status: 'active',
    });
    expect(order.desc).toContain('岭南晒场染样');
    expect(s.flags).toContain('homevisit-referral:dyed-swatch-archive');
    expect(s.npcStates['ln-he-yunsha'].knownTopics).toContain('dyed-swatch-referral');

    const delivered = gameReducer(s, { type: 'FULFILL_ORDER', orderId: order.id }, content);
    expect(delivered.activeOrders.find((item) => item.id === order.id)?.status).toBe('completed');
    expect(delivered.flags).toContain(`homevisit-order-completed:${record.id}`);
    expect(delivered.flags).toContain('homevisit-referral-completed:dyed-swatch-archive');
    expect(delivered.itemInstances.find((item) => item.id === silk.id)?.status).toBe('displayed');
    expect(delivered.itemInstances.some((item) => item.id === replica.id)).toBe(false);

    const returned = gameReducer(
      {
        ...delivered,
        calendar: { ...delivered.calendar, day: delivered.calendar.day + 1 },
      },
      {
        type: 'USE_NPC_FUNCTION',
        npcId: 'ln-he-yunsha',
        functionKind: 'homeVisit',
        homeVisitChoiceId: 'textile-color-ledger',
      },
      content,
    );
    const returnRecord = returned.homeVisitRecords[0];
    const renewalOrder = returned.activeOrders.find((item) => item.id === returnRecord.referralOrderId)!;
    expect(returnRecord).toMatchObject({
      title: '藏客回访 · 染样声誉',
      choiceId: 'textile-color-ledger',
      choiceKind: 'collect',
      referralTitle: '晒场色档续订单',
      itemName: '岭南晒场染样',
    });
    expect(returned.flags).toContain('homevisit:homevisit-yunsha-merchant-return');
    expect(returned.flags).toContain('homevisit-yunsha-merchant-return-resolved');
    expect(returned.flags).toContain('collector-reputation-textile-renewed');
    expect(returned.npcStates['ln-he-yunsha'].knownTopics).toContain('collector-return');
    expect(returned.npcStates['ln-he-yunsha'].knownTopics).toContain('textile-color-ledger');
    expect(renewalOrder).toMatchObject({
      title: '晒场色档续订单',
      orderKind: 'referral',
      sourceHomeVisitRecordId: returnRecord.id,
      sourceHomeVisitChoiceId: 'textile-color-ledger',
      resourceId: 'gambieredSilk',
      minQuality: 0.65,
      rewardCoin: 42,
      status: 'active',
    });

    const ended = gameReducer(
      {
        ...returned,
        npcAffinity: { ...returned.npcAffinity, 'ln-he-yunsha': 80 },
        turn: returned.maxTurns,
        pendingEvent: null,
        pendingEscortCrisis: null,
        pendingSupplyCrisis: null,
        pendingActivityStallClosing: null,
      },
      { type: 'END_TURN' },
      content,
    );
    expect(
      ended.report?.relationshipOutcomes?.some(
        (line) => line.includes('何云纱') && line.includes('晒场色档') && line.includes('货栈藏客'),
      ),
    ).toBe(true);
  });

  it('百工院来访：净室供展复单交付后会解锁雪域藏客回访与续订', () => {
    let s = freshState();
    const thangka: ItemInstance = {
      id: 'display-xueyu-ritual-thangka',
      resourceId: 'thangka',
      sourceCraftId: 'thangka',
      originRegionId: 'xueyu',
      originSubregionId: 'xueyu-thangka-court',
      createdTurn: s.turn,
      quality: 0.77,
      descriptors: ['矿彩有度', '敬意清正'],
      appraisal: '矿彩层次清楚，度量分寸稳当。',
      displayName: '雪域净室唐卡',
      authorName: '测试匠',
      status: 'displayed',
    };
    const replica: ItemInstance = {
      ...thangka,
      id: 'held-xueyu-ritual-thangka-replica',
      displayName: '雪域净室复样',
      status: 'held',
      quality: 0.74,
      createdTurn: s.turn + 1,
    };
    s = {
      ...s,
      itemInstances: [thangka, replica, ...s.itemInstances],
      resources: { ...s.resources, thangka: (s.resources.thangka ?? 0) + 2 },
      npcAffinity: { ...s.npcAffinity, 'xy-losang': 30 },
    };

    s = gameReducer(
      s,
      {
        type: 'USE_NPC_FUNCTION',
        npcId: 'xy-losang',
        functionKind: 'homeVisit',
        homeVisitChoiceId: 'reverent-loan-hall',
      },
      content,
    );

    const record = s.homeVisitRecords[0];
    const order = s.activeOrders.find((item) => item.id === record.referralOrderId)!;
    expect(record).toMatchObject({
      title: '矿彩净室',
      choiceId: 'reverent-loan-hall',
      choiceKind: 'collect',
      referralTitle: '净室供展复单',
      itemName: '雪域净室唐卡',
    });
    expect(order).toMatchObject({
      npcId: 'xy-losang',
      regionId: 'xueyu',
      orderKind: 'referral',
      sourceHomeVisitRecordId: record.id,
      sourceHomeVisitChoiceId: 'reverent-loan-hall',
      resourceId: 'thangka',
      status: 'active',
    });
    expect(order.desc).toContain('雪域净室唐卡');
    expect(s.flags).toContain('homevisit-referral:reverent-loan-hall');
    expect(s.npcStates['xy-losang'].knownTopics).toContain('reverent-referral');

    const delivered = gameReducer(s, { type: 'FULFILL_ORDER', orderId: order.id }, content);
    expect(delivered.activeOrders.find((item) => item.id === order.id)?.status).toBe('completed');
    expect(delivered.flags).toContain(`homevisit-order-completed:${record.id}`);
    expect(delivered.flags).toContain('homevisit-referral-completed:reverent-loan-hall');
    expect(delivered.itemInstances.find((item) => item.id === thangka.id)?.status).toBe('displayed');
    expect(delivered.itemInstances.some((item) => item.id === replica.id)).toBe(false);

    const returned = gameReducer(
      {
        ...delivered,
        calendar: { ...delivered.calendar, day: delivered.calendar.day + 1 },
      },
      {
        type: 'USE_NPC_FUNCTION',
        npcId: 'xy-losang',
        functionKind: 'homeVisit',
        homeVisitChoiceId: 'ritual-gallery-ledger',
      },
      content,
    );
    const returnRecord = returned.homeVisitRecords[0];
    const renewalOrder = returned.activeOrders.find((item) => item.id === returnRecord.referralOrderId)!;
    expect(returnRecord).toMatchObject({
      title: '藏客回访 · 净室声誉',
      choiceId: 'ritual-gallery-ledger',
      choiceKind: 'collect',
      referralTitle: '净室供展续单',
      itemName: '雪域净室唐卡',
    });
    expect(returned.flags).toContain('homevisit:homevisit-losang-patron-return');
    expect(returned.flags).toContain('homevisit-losang-patron-return-resolved');
    expect(returned.flags).toContain('collector-reputation-thangka-renewed');
    expect(returned.npcStates['xy-losang'].knownTopics).toContain('collector-return');
    expect(returned.npcStates['xy-losang'].knownTopics).toContain('ritual-gallery-ledger');
    expect(renewalOrder).toMatchObject({
      title: '净室供展续单',
      orderKind: 'referral',
      sourceHomeVisitRecordId: returnRecord.id,
      sourceHomeVisitChoiceId: 'ritual-gallery-ledger',
      resourceId: 'thangka',
      minQuality: 0.66,
      rewardCoin: 48,
      status: 'active',
    });

    const ended = gameReducer(
      {
        ...returned,
        npcAffinity: { ...returned.npcAffinity, 'xy-losang': 80 },
        turn: returned.maxTurns,
        pendingEvent: null,
        pendingEscortCrisis: null,
        pendingSupplyCrisis: null,
        pendingActivityStallClosing: null,
      },
      { type: 'END_TURN' },
      content,
    );
    expect(
      ended.report?.relationshipOutcomes?.some(
        (line) => line.includes('洛桑画师') && line.includes('净室礼法续簿') && line.includes('雪域来客'),
      ),
    ).toBe(true);
  });

  it('百工院来访：玉柜留样复单交付后会解锁西域藏客回访与续订', () => {
    let s = freshState();
    const jade: ItemInstance = {
      id: 'display-xiyu-jade-cabinet',
      resourceId: 'jadeCarving',
      sourceCraftId: 'jade-carving',
      originRegionId: 'xiyu',
      originSubregionId: 'xiyu-jade-yard',
      createdTurn: s.turn,
      quality: 0.78,
      descriptors: ['水线成窗', '顺绺开意'],
      appraisal: '顺着水线开意，玉料脾性清楚。',
      displayName: '西域顺料玉作',
      authorName: '测试匠',
      status: 'displayed',
    };
    const replica: ItemInstance = {
      ...jade,
      id: 'held-xiyu-jade-replica',
      displayName: '西域顺料复样',
      status: 'held',
      quality: 0.75,
      createdTurn: s.turn + 1,
    };
    s = {
      ...s,
      itemInstances: [jade, replica, ...s.itemInstances],
      resources: { ...s.resources, jadeCarving: (s.resources.jadeCarving ?? 0) + 2 },
      npcAffinity: { ...s.npcAffinity, 'xu-a-yue': 30 },
    };

    s = gameReducer(
      s,
      {
        type: 'USE_NPC_FUNCTION',
        npcId: 'xu-a-yue',
        functionKind: 'homeVisit',
        homeVisitChoiceId: 'jade-cabinet-ledger',
      },
      content,
    );

    const record = s.homeVisitRecords[0];
    const order = s.activeOrders.find((item) => item.id === record.referralOrderId)!;
    expect(record).toMatchObject({
      title: '顺玉开柜',
      choiceId: 'jade-cabinet-ledger',
      choiceKind: 'collect',
      referralTitle: '玉柜留样复单',
      itemName: '西域顺料玉作',
    });
    expect(order).toMatchObject({
      npcId: 'xu-a-yue',
      regionId: 'xiyu',
      orderKind: 'referral',
      sourceHomeVisitRecordId: record.id,
      sourceHomeVisitChoiceId: 'jade-cabinet-ledger',
      resourceId: 'jadeCarving',
      status: 'active',
    });
    expect(order.desc).toContain('西域顺料玉作');
    expect(s.flags).toContain('homevisit-referral:jade-cabinet-ledger');
    expect(s.npcStates['xu-a-yue'].knownTopics).toContain('jade-referral');

    const delivered = gameReducer(s, { type: 'FULFILL_ORDER', orderId: order.id }, content);
    expect(delivered.activeOrders.find((item) => item.id === order.id)?.status).toBe('completed');
    expect(delivered.flags).toContain(`homevisit-order-completed:${record.id}`);
    expect(delivered.flags).toContain('homevisit-referral-completed:jade-cabinet-ledger');
    expect(delivered.itemInstances.find((item) => item.id === jade.id)?.status).toBe('displayed');
    expect(delivered.itemInstances.some((item) => item.id === replica.id)).toBe(false);

    const returned = gameReducer(
      {
        ...delivered,
        calendar: { ...delivered.calendar, day: delivered.calendar.day + 1 },
      },
      {
        type: 'USE_NPC_FUNCTION',
        npcId: 'xu-a-yue',
        functionKind: 'homeVisit',
        homeVisitChoiceId: 'jade-ethics-ledger',
      },
      content,
    );
    const returnRecord = returned.homeVisitRecords[0];
    const renewalOrder = returned.activeOrders.find((item) => item.id === returnRecord.referralOrderId)!;
    expect(returnRecord).toMatchObject({
      title: '藏客回访 · 玉柜声誉',
      choiceId: 'jade-ethics-ledger',
      choiceKind: 'collect',
      referralTitle: '玉柜顺料续订单',
      itemName: '西域顺料玉作',
    });
    expect(returned.flags).toContain('homevisit:homevisit-ayue-collector-return');
    expect(returned.flags).toContain('homevisit-ayue-collector-return-resolved');
    expect(returned.flags).toContain('collector-reputation-jade-renewed');
    expect(returned.npcStates['xu-a-yue'].knownTopics).toContain('collector-return');
    expect(returned.npcStates['xu-a-yue'].knownTopics).toContain('jade-ethics-ledger');
    expect(renewalOrder).toMatchObject({
      title: '玉柜顺料续订单',
      orderKind: 'referral',
      sourceHomeVisitRecordId: returnRecord.id,
      sourceHomeVisitChoiceId: 'jade-ethics-ledger',
      resourceId: 'jadeCarving',
      minQuality: 0.72,
      rewardCoin: 64,
      status: 'active',
    });

    const ended = gameReducer(
      {
        ...returned,
        npcAffinity: { ...returned.npcAffinity, 'xu-a-yue': 80 },
        turn: returned.maxTurns,
        pendingEvent: null,
        pendingEscortCrisis: null,
        pendingSupplyCrisis: null,
        pendingActivityStallClosing: null,
      },
      { type: 'END_TURN' },
      content,
    );
    expect(
      ended.report?.relationshipOutcomes?.some(
        (line) => line.includes('玉师阿月') && line.includes('玉柜伦理续簿') && line.includes('识玉行客'),
      ),
    ).toBe(true);
  });

  it('赣鄱联作：窑头老温分水画青联作会拉入蓝釉生作协同方', () => {
    let s = freshState();
    const porcelain: ItemInstance = {
      id: 'held-ganpo-blue-white',
      resourceId: 'jingdezhenPorcelain',
      sourceCraftId: 'jingdezhen-porcelain',
      originRegionId: 'ganpo',
      originSubregionId: 'ganpo-kiln-town',
      createdTurn: s.turn,
      quality: 0.6,
      descriptors: ['胎薄'],
      appraisal: '一件火色尚稳的瓷坯。',
      status: 'held',
    };
    s = {
      ...s,
      resources: { ...s.resources, porcelainClay: 1, coal: 1, pigmentRefined: 1 },
      npcAffinity: { ...s.npcAffinity, 'gp-wen-yaotou': 30 },
      itemInstances: [porcelain],
    };

    s = gameReducer(
      s,
      {
        type: 'USE_NPC_FUNCTION',
        npcId: 'gp-wen-yaotou',
        functionKind: 'collab',
        itemId: porcelain.id,
        collabChoiceId: 'blue-water-collab',
      },
      content,
    );
    const collaborated = s.itemInstances.find((item) => item.id === porcelain.id)!;
    expect(collaborated.collaboratorNpcIds).toContain('gp-wen-yaotou');
    expect(collaborated.collaboratorNpcIds).toContain('gp-lan-yousheng');
    expect(collaborated.descriptors).toContain('火色匀');
    expect(collaborated.descriptors).toContain('青花分水');
    expect(collaborated.appraisal).toContain('窑火分级法');
    expect(s.flags).toContain('collab-recipe:collab-wen-kiln-open');
    expect(s.flags).toContain('collab-choice:blue-water-collab');
    expect(s.flags).toContain('collab-partner:gp-lan-yousheng');
    expect(s.flags).toContain('kiln-open-collab-worked');
    expect(s.flags).toContain('kiln-choice-blue-water-collab');
    expect(s.npcStates['gp-lan-yousheng'].knownTopics).toContain('collab-partner:collab-wen-kiln-open');
    expect(s.resources.porcelainClay).toBe(0);
    expect(s.resources.pigmentRefined).toBe(0);
  });

  it('百工院来访：赣鄱窑样复烧单交付后会解锁瓷行藏客回访与续订', () => {
    let s = freshState();
    const porcelain: ItemInstance = {
      id: 'display-ganpo-kiln-sample',
      resourceId: 'jingdezhenPorcelain',
      sourceCraftId: 'jingdezhen-porcelain',
      originRegionId: 'ganpo',
      originSubregionId: 'ganpo-kiln-town',
      createdTurn: s.turn,
      quality: 0.78,
      descriptors: ['火色匀', '釉光润'],
      appraisal: '釉面火色到位，适合留作窑样。',
      displayName: '瓷镇窑样器',
      authorName: '测试匠',
      status: 'displayed',
    };
    const replica: ItemInstance = {
      ...porcelain,
      id: 'held-ganpo-kiln-sample-replica',
      displayName: '瓷镇窑样复样',
      status: 'held',
      quality: 0.75,
      createdTurn: s.turn + 1,
    };
    s = {
      ...s,
      itemInstances: [porcelain, replica, ...s.itemInstances],
      resources: { ...s.resources, jingdezhenPorcelain: (s.resources.jingdezhenPorcelain ?? 0) + 2 },
      npcAffinity: { ...s.npcAffinity, 'gp-wen-yaotou': 30 },
    };

    s = gameReducer(
      s,
      {
        type: 'USE_NPC_FUNCTION',
        npcId: 'gp-wen-yaotou',
        functionKind: 'homeVisit',
        homeVisitChoiceId: 'kiln-sample-archive',
      },
      content,
    );
    const record = s.homeVisitRecords[0];
    const order = s.activeOrders.find((item) => item.id === record.referralOrderId)!;
    expect(record).toMatchObject({
      title: '窑火验瓷',
      choiceId: 'kiln-sample-archive',
      choiceKind: 'collect',
      referralTitle: '窑样复烧单',
      itemName: '瓷镇窑样器',
    });
    expect(order).toMatchObject({
      npcId: 'gp-wen-yaotou',
      regionId: 'ganpo',
      orderKind: 'referral',
      sourceHomeVisitChoiceId: 'kiln-sample-archive',
      resourceId: 'jingdezhenPorcelain',
      status: 'active',
    });
    expect(s.flags).toContain('homevisit-referral:kiln-sample-archive');

    const delivered = gameReducer(s, { type: 'FULFILL_ORDER', orderId: order.id }, content);
    expect(delivered.flags).toContain('homevisit-referral-completed:kiln-sample-archive');
    expect(delivered.itemInstances.some((item) => item.id === replica.id)).toBe(false);

    const returned = gameReducer(
      {
        ...delivered,
        calendar: { ...delivered.calendar, day: delivered.calendar.day + 1 },
      },
      {
        type: 'USE_NPC_FUNCTION',
        npcId: 'gp-wen-yaotou',
        functionKind: 'homeVisit',
        homeVisitChoiceId: 'kiln-grade-ledger',
      },
      content,
    );
    const returnRecord = returned.homeVisitRecords[0];
    const renewalOrder = returned.activeOrders.find((item) => item.id === returnRecord.referralOrderId)!;
    expect(returnRecord).toMatchObject({
      title: '藏客回访 · 窑火声誉',
      choiceId: 'kiln-grade-ledger',
      referralTitle: '窑样复烧续订单',
      itemName: '瓷镇窑样器',
    });
    expect(returned.flags).toContain('homevisit:homevisit-wen-kiln-return');
    expect(returned.flags).toContain('homevisit-wen-kiln-return-resolved');
    expect(returned.flags).toContain('collector-reputation-porcelain-renewed');
    expect(renewalOrder).toMatchObject({
      title: '窑样复烧续订单',
      orderKind: 'referral',
      resourceId: 'jingdezhenPorcelain',
      minQuality: 0.66,
      status: 'active',
    });
  });

  it('京畿联作：蓝大器掐丝点蓝联作会按分支拉入金琐娘或宋押司', () => {
    let s = freshState();
    const cloisonne: ItemInstance = {
      id: 'held-jingji-cloisonne',
      resourceId: 'cloisonne',
      sourceCraftId: 'cloisonne',
      originRegionId: 'jingji',
      originSubregionId: 'jingji-palace-yard',
      createdTurn: s.turn,
      quality: 0.64,
      descriptors: ['丝稳'],
      appraisal: '一件丝路尚稳的景泰蓝坯。',
      status: 'held',
    };
    s = {
      ...s,
      resources: { ...s.resources, copperStock: 1, pigmentRefined: 1, silverStock: 1 },
      npcAffinity: { ...s.npcAffinity, 'jj-lan-daqi': 30 },
      itemInstances: [cloisonne],
    };

    s = gameReducer(
      s,
      {
        type: 'USE_NPC_FUNCTION',
        npcId: 'jj-lan-daqi',
        functionKind: 'collab',
        itemId: cloisonne.id,
        collabChoiceId: 'filigree-frame-collab',
      },
      content,
    );
    const collaborated = s.itemInstances.find((item) => item.id === cloisonne.id)!;
    expect(collaborated.collaboratorNpcIds).toContain('jj-lan-daqi');
    expect(collaborated.collaboratorNpcIds).toContain('jj-jin-suoniang');
    expect(collaborated.descriptors).toContain('丝稳如界尺');
    expect(collaborated.descriptors).toContain('花丝镶边');
    expect(collaborated.appraisal).toContain('掐丝点蓝法');
    expect(s.flags).toContain('collab-recipe:collab-lan-cloisonne-blue');
    expect(s.flags).toContain('collab-choice:filigree-frame-collab');
    expect(s.flags).toContain('collab-partner:jj-jin-suoniang');
    expect(s.flags).toContain('cloisonne-collab-worked');
    expect(s.npcStates['jj-jin-suoniang'].knownTopics).toContain('collab-partner:collab-lan-cloisonne-blue');
    expect(s.resources.copperStock).toBe(0);
    expect(s.resources.silverStock).toBe(0);
  });

  it('百工院来访：京畿宫样采办单交付后会解锁采办藏客回访与续订', () => {
    let s = freshState();
    const cloisonne: ItemInstance = {
      id: 'display-jingji-palace-sample',
      resourceId: 'cloisonne',
      sourceCraftId: 'cloisonne',
      originRegionId: 'jingji',
      originSubregionId: 'jingji-palace-yard',
      createdTurn: s.turn,
      quality: 0.82,
      descriptors: ['丝稳如界尺', '蓝正不塌'],
      appraisal: '丝路稳、蓝阶正，配得上宫样。',
      displayName: '宫造样件器',
      authorName: '测试匠',
      status: 'displayed',
    };
    const replica: ItemInstance = {
      ...cloisonne,
      id: 'held-jingji-palace-sample-replica',
      displayName: '宫造样件复样',
      status: 'held',
      quality: 0.79,
      createdTurn: s.turn + 1,
    };
    s = {
      ...s,
      itemInstances: [cloisonne, replica, ...s.itemInstances],
      resources: { ...s.resources, cloisonne: (s.resources.cloisonne ?? 0) + 2 },
      npcAffinity: { ...s.npcAffinity, 'jj-lan-daqi': 30 },
    };

    s = gameReducer(
      s,
      {
        type: 'USE_NPC_FUNCTION',
        npcId: 'jj-lan-daqi',
        functionKind: 'homeVisit',
        homeVisitChoiceId: 'palace-sample-archive',
      },
      content,
    );
    const record = s.homeVisitRecords[0];
    const order = s.activeOrders.find((item) => item.id === record.referralOrderId)!;
    expect(record).toMatchObject({
      title: '宫造验样',
      choiceId: 'palace-sample-archive',
      choiceKind: 'collect',
      referralTitle: '宫样采办单',
      itemName: '宫造样件器',
    });
    expect(order).toMatchObject({
      npcId: 'jj-lan-daqi',
      regionId: 'jingji',
      orderKind: 'referral',
      sourceHomeVisitChoiceId: 'palace-sample-archive',
      resourceId: 'cloisonne',
      status: 'active',
    });

    const delivered = gameReducer(s, { type: 'FULFILL_ORDER', orderId: order.id }, content);
    expect(delivered.flags).toContain('homevisit-referral-completed:palace-sample-archive');
    expect(delivered.itemInstances.some((item) => item.id === replica.id)).toBe(false);

    const returned = gameReducer(
      {
        ...delivered,
        calendar: { ...delivered.calendar, day: delivered.calendar.day + 1 },
      },
      {
        type: 'USE_NPC_FUNCTION',
        npcId: 'jj-lan-daqi',
        functionKind: 'homeVisit',
        homeVisitChoiceId: 'palace-grade-ledger',
      },
      content,
    );
    const returnRecord = returned.homeVisitRecords[0];
    const renewalOrder = returned.activeOrders.find((item) => item.id === returnRecord.referralOrderId)!;
    expect(returnRecord).toMatchObject({
      title: '藏客回访 · 宫造声誉',
      choiceId: 'palace-grade-ledger',
      referralTitle: '宫样采办续订单',
      itemName: '宫造样件器',
    });
    expect(returned.flags).toContain('homevisit:homevisit-lan-palace-return');
    expect(returned.flags).toContain('homevisit-lan-palace-return-resolved');
    expect(returned.flags).toContain('collector-reputation-palace-renewed');
    expect(renewalOrder).toMatchObject({
      title: '宫样采办续订单',
      orderKind: 'referral',
      resourceId: 'cloisonne',
      minQuality: 0.72,
      status: 'active',
    });
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

  it('结局报告会读取地区声望、夜市、来访与断供账簿生成称号亮点', () => {
    let s = gameReducer(freshState(), { type: 'NEW_GAME', seed: 1, playerName: '阿青' }, content);
    s = {
      ...s,
      turn: s.maxTurns,
      pendingEvent: null,
      pendingEscortCrisis: null,
      pendingSupplyCrisis: null,
      metrics: { ...s.metrics, heritage: 72, market: 58 },
      regionReputation: { ...s.regionReputation, jiangnan: 82, huizhou: 37 },
      npcAffinity: { ...s.npcAffinity, 'jn-ning-ciqiu': 80 },
      flags: [...s.flags, 'stall-chain-completed:jn-qinhuai-lantern'],
      nightMarketStallRecords: [
        {
          id: 'stall-report-test',
          activityId: 'jn-qinhuai-lantern',
          npcId: 'jn-qiao-zhaoye',
          regionId: 'jiangnan',
          subregionId: 'jiangnan-jinling',
          title: '秦淮夜市摊',
          day: 5,
          phase: 'dusk',
          customerTitle: '携童看灯人',
          comboTitle: '灯茶小案',
          itemResourceId: 'oilPaperUmbrella',
          itemName: '油纸伞',
          itemQuality: 0.86,
          crowd: 72,
          revenue: 66,
          summary: '灯下茶香留客，伞面映水。',
        },
      ],
      homeVisitRecords: [
        {
          id: 'visit-report-test',
          npcId: 'jn-ning-ciqiu',
          title: '珍品阁题看',
          day: 6,
          phase: 'afternoon',
          itemId: 'item-report-test',
          itemName: '云纹织锦',
          itemResourceId: 'brocade',
          itemQuality: 0.91,
          summary: '宁辞秋题下织机旧法。',
        },
      ],
      supplyCrisisRecords: [
        {
          id: 'supply-report-test',
          routeId: 'route-xueyu-xiyu-caravan',
          resourceId: 'tea',
          risk: 76,
          severity: 2,
          choiceId: 'send-workers',
          choiceLabel: '派人护路',
          createdDay: 4,
          resolvedDay: 4,
          followUpDay: 5,
          status: 'closed',
          coinCost: 0,
          laborCost: 2,
          summary: '驼队补给回稳。',
          aftershockApplied: true,
        },
      ],
      routeEscortRuns: { ...s.routeEscortRuns, 'route-xueyu-xiyu-caravan': 2 },
    };

    s = gameReducer(s, { type: 'END_TURN' }, content);

    expect(s.status).toBe('ended');
    expect(s.report?.socialTitle).toBe('江南坐地匠首');
    expect(s.report?.summary).toContain('江南坐地匠首');
    expect(s.report?.highlights.some((h) => h.includes('江南') && h.includes('82'))).toBe(true);
    expect(s.report?.highlights.some((h) => h.includes('秦淮夜市摊') && h.includes('携童看灯人') && h.includes('灯茶小案'))).toBe(true);
    expect(s.report?.highlights.some((h) => h.includes('珍品阁题看') && h.includes('云纹织锦'))).toBe(true);
    expect(s.report?.highlights.some((h) => h.includes('商路断供簿') && h.includes('1 次处置'))).toBe(true);
    expect(s.report?.highlights.some((h) => h.includes('高原丝路驿线') && h.includes('2 次'))).toBe(true);
    expect(s.report?.regionalOutcomes?.some((line) => line.includes('江南诸坊') && line.includes('坐地匠首'))).toBe(true);
    expect(s.report?.relationshipOutcomes?.some((line) => line.includes('宁辞秋') && line.includes('有名有款'))).toBe(true);
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

  it('TALK_NPC 会按好感解锁 NPC 地方见闻与叙事标记', () => {
    let s = freshState();
    s = gameReducer(s, { type: 'TALK_NPC', npcId: 'jn-ning-ciqiu' }, content);
    expect(s.npcAffinity['jn-ning-ciqiu']).toBe(8);
    expect(s.flags).toContain('ning-mentioned-huizhou-stationery');
    expect(s.npcStates['jn-ning-ciqiu'].knownTopics).toContain('stationery');
    expect(s.npcStates['jn-ning-ciqiu'].knownTopics).toContain('route:route-jiangnan-huizhou-paper');
    expect(s.npcStates['jn-ning-ciqiu'].revealedIntelIds).toContain('intel-ning-stationery-route');
  });

  it('USE_NPC_FUNCTION 按好感门槛和每日限制结算授艺', () => {
    let s = freshState();
    const blocked = gameReducer(s, { type: 'USE_NPC_FUNCTION', npcId: 'jn-bamboo-master', functionKind: 'mentor' }, content);
    expect(blocked.flags).not.toContain('npc-mentor:jn-bamboo-master');

    s = gameReducer(s, { type: 'TALK_NPC', npcId: 'jn-bamboo-master' }, content);
    const beforeKnowledge = s.profile.attributes.knowledge;
    s = gameReducer(s, { type: 'USE_NPC_FUNCTION', npcId: 'jn-bamboo-master', functionKind: 'mentor' }, content);
    expect(s.flags).toContain('npc-mentor:jn-bamboo-master');
    expect(s.npcStates['jn-bamboo-master'].usedFunctionDays?.mentor).toBe(s.calendar.day);
    expect(s.profile.attributes.knowledge).toBeGreaterThan(beforeKnowledge);
    const affinityAfterMentor = s.npcAffinity['jn-bamboo-master'];

    const sameDay = gameReducer(s, { type: 'USE_NPC_FUNCTION', npcId: 'jn-bamboo-master', functionKind: 'mentor' }, content);
    expect(sameDay.npcAffinity['jn-bamboo-master']).toBe(affinityAfterMentor);
  });

  it('USE_NPC_FUNCTION 授艺会读取核心工艺交互规格并沉淀师傅建议', () => {
    let s = freshState();
    s = { ...s, npcAffinity: { ...s.npcAffinity, 'jn-ning-ciqiu': 8 } };
    const beforeCraft = s.profile.attributes.craft;

    s = gameReducer(s, { type: 'USE_NPC_FUNCTION', npcId: 'jn-ning-ciqiu', functionKind: 'mentor' }, content);

    const runtime = s.npcStates['jn-ning-ciqiu'];
    expect(s.flags).toContain('craft-mentor:longquan-sword');
    expect(s.flags).toContain('craft-mentor-stage:sword-select-iron');
    expect(s.flags).toContain('craft-mentor-defect:sword-brittle-core');
    expect(s.flags).toContain('craft-mentor-repair:sword-temper-again');
    expect(runtime.knownTopics).toContain('craft-mentor:longquan-sword');
    expect(runtime.knownTopics).toContain('craft-stage:sword-select-iron');
    expect(runtime.knownTopics).toContain('craft-defect:sword-brittle-core');
    expect(runtime.knownTopics).toContain('craft-repair:sword-temper-again');
    expect(s.profile.attributes.craft).toBeGreaterThan(beforeCraft + 1);
    expect(s.log[0]).toContain('龙泉山坊');
    expect(s.log[0]).toContain('选铁定剑形');
    expect(s.log[0]).toContain('脆心');
    expect(s.log[0]).toContain('回火复整');
  });

  it('TALK_NPC 不会清空 NPC 功能行动的当日冷却', () => {
    let s = freshState();
    s = gameReducer(s, { type: 'TALK_NPC', npcId: 'jn-bamboo-master' }, content);
    s = gameReducer(s, { type: 'USE_NPC_FUNCTION', npcId: 'jn-bamboo-master', functionKind: 'mentor' }, content);
    const afterMentor = s.npcAffinity['jn-bamboo-master'];

    s = gameReducer(s, { type: 'TALK_NPC', npcId: 'jn-bamboo-master' }, content);
    expect(s.npcStates['jn-bamboo-master'].usedFunctionDays?.mentor).toBe(s.calendar.day);
    const repeated = gameReducer(s, { type: 'USE_NPC_FUNCTION', npcId: 'jn-bamboo-master', functionKind: 'mentor' }, content);
    expect(repeated.npcAffinity['jn-bamboo-master']).toBe(s.npcAffinity['jn-bamboo-master']);
    expect(repeated.npcAffinity['jn-bamboo-master']).toBeGreaterThan(afterMentor);
  });

  it('USE_NPC_FUNCTION 路线指点会写入路线情报', () => {
    let s = freshState();
    s = { ...s, npcAffinity: { ...s.npcAffinity, 'jn-fang-jiheng': 8 } };
    s = gameReducer(s, { type: 'USE_NPC_FUNCTION', npcId: 'jn-fang-jiheng', functionKind: 'route' }, content);
    expect(s.flags).toContain('npc-route:jn-fang-jiheng');
    expect(s.flags).toContain('route-known:route-jiangnan-huizhou-paper');
    expect(s.npcStates['jn-fang-jiheng'].knownTopics).toContain('route:route-jiangnan-huizhou-paper');
    expect(routeStabilityOf(s, 'route-jiangnan-huizhou-paper')).toBeGreaterThan(48);
    expect(s.profile.attributes.commerce).toBeGreaterThan(5);
  });

  it('USE_NPC_FUNCTION 护商会消耗工时、稳定路线并写入护商记忆', () => {
    let s = freshState();
    s = {
      ...s,
      npcAffinity: { ...s.npcAffinity, 'jn-fang-jiheng': 10 },
      resources: { ...s.resources, labor: 4, coin: 0 },
      routeStability: { ...s.routeStability, 'route-jiangnan-huizhou-paper': 20 },
    };
    const beforeStability = routeStabilityOf(s, 'route-jiangnan-huizhou-paper');

    s = gameReducer(s, { type: 'USE_NPC_FUNCTION', npcId: 'jn-fang-jiheng', functionKind: 'escort' }, content);

    expect(s.flags).toContain('npc-escort:jn-fang-jiheng');
    expect(s.flags).toContain('escort:route-jiangnan-huizhou-paper');
    expect(s.flags).toContain('route-known:route-jiangnan-huizhou-paper');
    expect(s.routeEscortRuns['route-jiangnan-huizhou-paper']).toBe(1);
    expect(routeStabilityOf(s, 'route-jiangnan-huizhou-paper')).toBeGreaterThan(beforeStability);
    expect(s.resources.labor).toBe(2);
    expect(s.resources.coin).toBeGreaterThan(0);
    expect(s.profile.attributes.stamina).toBeGreaterThan(5);
    expect(s.regionReputation.jiangnan).toBeGreaterThan(5);
    expect(s.npcStates['jn-fang-jiheng'].usedFunctionDays?.escort).toBe(s.calendar.day);

    const sameDay = gameReducer(s, { type: 'USE_NPC_FUNCTION', npcId: 'jn-fang-jiheng', functionKind: 'escort' }, content);
    expect(sameDay.routeEscortRuns['route-jiangnan-huizhou-paper']).toBe(1);
  });

  it('茶马道护商会结算首段专属事件成功分支', () => {
    let s = freshState();
    const routeId = 'route-bashu-qiandian-tea-horse';
    s = {
      ...s,
      unlockedRegions: [...new Set([...s.unlockedRegions, 'bashu', 'qiandian'])],
      npcAffinity: { ...s.npcAffinity, 'bs-mabang-ayue': 20 },
      resources: { ...s.resources, labor: 4, coin: 0 },
      flags: [...s.flags, 'route-known:route-bashu-qiandian-tea-horse'],
      regionReputation: { ...s.regionReputation, bashu: 35, qiandian: 20 },
      routeStability: {
        ...s.routeStability,
        [routeId]: 18,
        'route-bashu-xueyu-snow-pass': 100,
      },
      profile: {
        ...s.profile,
        attributes: { ...s.profile.attributes, stamina: 80, commerce: 70 },
      },
    };
    const beforeStability = routeStabilityOf(s, routeId);

    s = gameReducer(s, { type: 'USE_NPC_FUNCTION', npcId: 'bs-mabang-ayue', functionKind: 'escort' }, content);

    expect(s.pendingEscortCrisis?.encounterId).toBe('escort-tea-horse-load-ledger');
    expect(s.routeEscortRuns[routeId] ?? 0).toBe(0);
    expect(s.flags).not.toContain('escort-encounter:escort-tea-horse-load-ledger');
    const blockedTime = gameReducer(s, { type: 'ADVANCE_TIME' }, content);
    expect(blockedTime.calendar.phase).toBe(s.calendar.phase);

    s = gameReducer(s, { type: 'RESOLVE_ESCORT_CRISIS', choiceId: 'rebalance-tea-salt-load' }, content);

    expect(s.pendingEscortCrisis).toBeNull();
    expect(s.routeEscortRuns[routeId]).toBe(1);
    expect(s.flags).toContain('escort-encounter:escort-tea-horse-load-ledger');
    expect(s.flags).toContain('escort-encounter-success:escort-tea-horse-load-ledger');
    expect(s.flags).toContain('tea-horse-ledger-balanced');
    expect(s.flags).toContain('escort-choice:rebalance-tea-salt-load');
    expect(s.npcStates['bs-mabang-ayue'].knownTopics).toContain('tea-horse-ledger');
    expect(routeStabilityOf(s, routeId)).toBeGreaterThan(beforeStability);
    expect(s.log.some((line) => line.includes('茶篓负重簿'))).toBe(true);
  });

  it('护商事件链会按前置稳货选择进入夜铃认路后续阶段', () => {
    let s = freshState();
    const routeId = 'route-bashu-qiandian-tea-horse';
    s = {
      ...s,
      unlockedRegions: [...new Set([...s.unlockedRegions, 'bashu', 'qiandian'])],
      npcAffinity: { ...s.npcAffinity, 'bs-mabang-ayue': 20 },
      resources: { ...s.resources, labor: 4 },
      flags: [
        ...s.flags,
        'route-known:route-bashu-qiandian-tea-horse',
        'escort-encounter:escort-tea-horse-load-ledger',
        'escort-choice:rebalance-tea-salt-load',
      ],
      routeEscortRuns: { ...s.routeEscortRuns, [routeId]: 1 },
      routeStability: {
        ...s.routeStability,
        [routeId]: 20,
        'route-bashu-xueyu-snow-pass': 100,
      },
      profile: {
        ...s.profile,
        attributes: { ...s.profile.attributes, stamina: 80, commerce: 70 },
      },
    };

    s = gameReducer(s, { type: 'USE_NPC_FUNCTION', npcId: 'bs-mabang-ayue', functionKind: 'escort' }, content);

    expect(s.routeEscortRuns[routeId]).toBe(2);
    expect(s.flags).toContain('escort-encounter:escort-tea-horse-night-bell');
    expect(s.flags).toContain('tea-horse-night-bell-read');
    expect(s.npcStates['bs-mabang-ayue'].knownTopics).toContain('tea-horse-night-bell');
  });

  it('护商事件链会按前置险走选择进入雾口补账后续阶段', () => {
    let s = freshState();
    const routeId = 'route-bashu-qiandian-tea-horse';
    s = {
      ...s,
      unlockedRegions: [...new Set([...s.unlockedRegions, 'bashu', 'qiandian'])],
      npcAffinity: { ...s.npcAffinity, 'bs-mabang-ayue': 20 },
      resources: { ...s.resources, labor: 4 },
      flags: [
        ...s.flags,
        'route-known:route-bashu-qiandian-tea-horse',
        'escort-encounter:escort-tea-horse-load-ledger',
        'escort-choice:press-through-fog-pass',
      ],
      routeEscortRuns: { ...s.routeEscortRuns, [routeId]: 1 },
      routeStability: {
        ...s.routeStability,
        [routeId]: 20,
        'route-bashu-xueyu-snow-pass': 100,
      },
      profile: {
        ...s.profile,
        attributes: { ...s.profile.attributes, stamina: 80, commerce: 70, people: 40 },
      },
    };
    const beforeStability = routeStabilityOf(s, routeId);
    const beforeReputation = s.regionReputation.bashu ?? 0;

    s = gameReducer(s, { type: 'USE_NPC_FUNCTION', npcId: 'bs-mabang-ayue', functionKind: 'escort' }, content);

    expect(s.routeEscortRuns[routeId]).toBe(2);
    expect(s.flags).toContain('escort-encounter:escort-tea-horse-fog-debt');
    expect(s.flags).toContain('tea-horse-fog-debt-settled');
    expect(s.flags).not.toContain('escort-encounter:escort-tea-horse-night-bell');
    expect(s.npcStates['bs-mabang-ayue'].knownTopics).toContain('tea-horse-fog-debt');
    expect(routeStabilityOf(s, routeId)).toBeGreaterThan(beforeStability);
    expect(s.regionReputation.bashu).toBeGreaterThan(beforeReputation);
  });

  it('赣鄱柴运护商：窑柴赶期簿是选择型危机，处置后才结算', () => {
    let s = freshState();
    const routeId = 'route-ganpo-huizhou-merchant';
    s = {
      ...s,
      currentRegion: 'ganpo',
      unlockedRegions: [...new Set([...s.unlockedRegions, 'ganpo', 'huizhou'])],
      npcAffinity: { ...s.npcAffinity, 'gp-chai-yazi': 20 },
      resources: { ...s.resources, labor: 4 },
      flags: [...s.flags, 'route-known:route-ganpo-huizhou-merchant'],
      regionReputation: { ...s.regionReputation, ganpo: 30, huizhou: 20 },
      routeStability: { ...s.routeStability, [routeId]: 18 },
      profile: {
        ...s.profile,
        attributes: { ...s.profile.attributes, stamina: 70, commerce: 60 },
      },
    };
    const beforeStability = routeStabilityOf(s, routeId);

    s = gameReducer(s, { type: 'USE_NPC_FUNCTION', npcId: 'gp-chai-yazi', functionKind: 'escort' }, content);
    expect(s.pendingEscortCrisis?.encounterId).toBe('escort-ganpo-kiln-firewood');
    // 待处理危机会拦下时辰推进
    const blocked = gameReducer(s, { type: 'ADVANCE_TIME' }, content);
    expect(blocked.calendar.phase).toBe(s.calendar.phase);

    s = gameReducer(s, { type: 'RESOLVE_ESCORT_CRISIS', choiceId: 'dry-firewood-first' }, content);
    expect(s.pendingEscortCrisis).toBeNull();
    expect(s.routeEscortRuns[routeId]).toBe(1);
    expect(s.flags).toContain('escort-encounter:escort-ganpo-kiln-firewood');
    expect(s.flags).toContain('escort-encounter-success:escort-ganpo-kiln-firewood');
    expect(s.flags).toContain('escort-choice:dry-firewood-first');
    expect(s.flags).toContain('ganpo-kiln-firewood-on-schedule');
    expect(routeStabilityOf(s, routeId)).toBeGreaterThan(beforeStability);
    expect(s.log.some((line) => line.includes('窑柴赶期簿'))).toBe(true);
  });

  it('京畿漕运护商：漕运料账簿处置成功会稳住宫造料路', () => {
    let s = freshState();
    const routeId = 'route-jiangnan-jingji-canal';
    s = {
      ...s,
      currentRegion: 'jingji',
      unlockedRegions: [...new Set([...s.unlockedRegions, 'jiangnan', 'jingji'])],
      npcAffinity: { ...s.npcAffinity, 'jj-song-yasi': 20 },
      resources: { ...s.resources, labor: 4 },
      flags: [...s.flags, 'route-known:route-jiangnan-jingji-canal'],
      regionReputation: { ...s.regionReputation, jingji: 30, jiangnan: 20 },
      routeStability: { ...s.routeStability, [routeId]: 18 },
      profile: {
        ...s.profile,
        attributes: { ...s.profile.attributes, stamina: 60, commerce: 75, people: 40 },
      },
    };
    const beforeStability = routeStabilityOf(s, routeId);

    s = gameReducer(s, { type: 'USE_NPC_FUNCTION', npcId: 'jj-song-yasi', functionKind: 'escort' }, content);
    expect(s.pendingEscortCrisis?.encounterId).toBe('escort-jingji-canal-tribute');

    s = gameReducer(s, { type: 'RESOLVE_ESCORT_CRISIS', choiceId: 'seal-tribute-manifest' }, content);
    expect(s.pendingEscortCrisis).toBeNull();
    expect(s.flags).toContain('escort-encounter-success:escort-jingji-canal-tribute');
    expect(s.flags).toContain('escort-choice:seal-tribute-manifest');
    expect(s.flags).toContain('jingji-canal-tribute-cleared');
    expect(routeStabilityOf(s, routeId)).toBeGreaterThan(beforeStability);
    expect(s.log.some((line) => line.includes('漕运料账簿'))).toBe(true);
  });

  it('驼道护商事件失败会写入短缺记忆并压低路线稳定', () => {
    let s = freshState();
    const routeId = 'route-xueyu-xiyu-caravan';
    s = {
      ...s,
      unlockedRegions: [...new Set([...s.unlockedRegions, 'xueyu', 'xiyu'])],
      npcAffinity: { ...s.npcAffinity, 'xu-tuoling-shu': 12 },
      resources: { ...s.resources, labor: 4 },
      routeStability: { ...s.routeStability, [routeId]: 10 },
    };
    const beforeStability = routeStabilityOf(s, routeId);

    s = gameReducer(s, { type: 'USE_NPC_FUNCTION', npcId: 'xu-tuoling-shu', functionKind: 'escort' }, content);

    expect(s.pendingEscortCrisis?.encounterId).toBe('escort-caravan-water-ledger');
    expect(s.routeEscortRuns[routeId] ?? 0).toBe(0);

    s = gameReducer(s, { type: 'RESOLVE_ESCORT_CRISIS', choiceId: 'force-contract-through-sand' }, content);

    expect(s.pendingEscortCrisis).toBeNull();
    expect(s.routeEscortRuns[routeId]).toBe(1);
    expect(s.flags).toContain('escort-encounter:escort-caravan-water-ledger');
    expect(s.flags).toContain('escort-encounter-failure:escort-caravan-water-ledger');
    expect(s.flags).toContain('caravan-water-ledger-short');
    expect(s.flags).toContain('escort-choice:force-contract-through-sand');
    expect(s.npcStates['xu-tuoling-shu'].knownTopics).toContain('caravan-water-ledger');
    expect(routeStabilityOf(s, routeId)).toBeLessThan(beforeStability);
    expect(s.log.some((line) => line.includes('沙路水账'))).toBe(true);
  });

  it('USE_NPC_FUNCTION 切磋会消耗工时、写入实践记忆并推进好感', () => {
    let s = freshState();
    s = {
      ...s,
      npcAffinity: { ...s.npcAffinity, 'jn-ning-ciqiu': 12 },
      resources: { ...s.resources, labor: 3 },
    };
    const beforeKnowledge = s.profile.attributes.knowledge;

    s = gameReducer(s, { type: 'USE_NPC_FUNCTION', npcId: 'jn-ning-ciqiu', functionKind: 'spar' }, content);

    expect(s.resources.labor).toBe(2);
    expect(s.flags).toContain('npc-spar:jn-ning-ciqiu');
    expect(s.flags).toContain('spar-style:calligraphy');
    expect(s.npcStates['jn-ning-ciqiu'].knownTopics).toContain('spar:calligraphy');
    expect(s.npcStates['jn-ning-ciqiu'].knownTopics).toContain('calligraphy');
    expect(s.npcStates['jn-ning-ciqiu'].usedFunctionDays?.spar).toBe(s.calendar.day);
    expect(s.npcAffinity['jn-ning-ciqiu']).toBeGreaterThan(12);
    expect(s.profile.attributes.knowledge).toBeGreaterThan(beforeKnowledge);
    expect(s.log[0]).toContain('切磋');

    const sameDay = gameReducer(s, { type: 'USE_NPC_FUNCTION', npcId: 'jn-ning-ciqiu', functionKind: 'spar' }, content);
    expect(sameDay.resources.labor).toBe(2);
    expect(sameDay.npcAffinity['jn-ning-ciqiu']).toBe(s.npcAffinity['jn-ning-ciqiu']);
  });

  it('高质量切磋会沉淀地区声望，实践型外地 NPC 也开放切磋', () => {
    expect(ALL_NPCS.find((item) => item.id === 'bs-luo-qingmie')?.functions).toContain('spar');
    expect(ALL_NPCS.find((item) => item.id === 'bs-mabang-ayue')?.functions).not.toContain('spar');

    let s = freshState();
    s = {
      ...s,
      npcAffinity: { ...s.npcAffinity, 'jn-ning-ciqiu': 80 },
      resources: { ...s.resources, labor: 3 },
      profile: {
        ...s.profile,
        attributes: { ...s.profile.attributes, knowledge: 90, mind: 90 },
        attributeXp: { ...s.profile.attributeXp, knowledge: 90, mind: 90 },
      },
    };
    const beforeReputation = s.regionReputation.jiangnan;

    s = gameReducer(s, { type: 'USE_NPC_FUNCTION', npcId: 'jn-ning-ciqiu', functionKind: 'spar' }, content);

    expect(s.flags).toContain('spar-mastered:jn-ning-ciqiu');
    expect(s.regionReputation.jiangnan).toBeGreaterThan(beforeReputation);
    expect(s.profile.attributes.people).toBeGreaterThan(5);
  });

  it('USE_NPC_FUNCTION 订单会生成可交付的具体 NPC 订单', () => {
    let s = freshState();
    s = { ...s, npcAffinity: { ...s.npcAffinity, 'jn-bamboo-master': 12 } };
    s = gameReducer(s, { type: 'USE_NPC_FUNCTION', npcId: 'jn-bamboo-master', functionKind: 'order' }, content);

    const order = s.activeOrders[0];
    expect(order.npcId).toBe('jn-bamboo-master');
    expect(order.status).toBe('active');
    expect(order.regionId).toBe('jiangnan');
    expect(order.quantity).toBeGreaterThan(0);
    expect(order.rewardCoin).toBeGreaterThan(0);
    expect(order.routeRisk).toBeGreaterThanOrEqual(0);
    expect(order.reputationAtCreation).toBe(s.regionReputation.jiangnan);
    expect(s.flags).toContain('npc-order:jn-bamboo-master');
  });

  it('方季衡寄售单会先扣押金，交付后返还并写入寄售完成', () => {
    let s = freshState();
    s = {
      ...s,
      npcAffinity: { ...s.npcAffinity, 'jn-fang-jiheng': 12 },
      resources: { ...s.resources, coin: 20 },
    };

    s = gameReducer(s, { type: 'USE_NPC_FUNCTION', npcId: 'jn-fang-jiheng', functionKind: 'order' }, content);

    const order = s.activeOrders[0];
    expect(order.orderKind).toBe('consignment');
    expect(order.depositCoin).toBeGreaterThan(0);
    expect(order.creditTrustScore).toBeGreaterThanOrEqual(0);
    expect(order.desc).toContain('仓单押金');
    expect(s.resources.coin).toBe(20 - (order.depositCoin ?? 0));
    expect(s.flags).toContain('consignment-order:jn-fang-jiheng');
    expect(s.flags).toContain('deposit-order:jn-fang-jiheng');

    const beforeCoin = s.resources.coin ?? 0;
    const ready = { ...s, resources: { ...s.resources, [order.resourceId]: order.quantity } };
    const delivered = gameReducer(ready, { type: 'FULFILL_ORDER', orderId: order.id }, content);

    expect(delivered.resources.coin).toBe(beforeCoin + order.rewardCoin);
    expect(delivered.flags).toContain('consignment-order-completed:jn-fang-jiheng');
    expect(delivered.flags).toContain('deposit-refunded:jn-fang-jiheng');
    expect(delivered.activeOrders.find((item) => item.id === order.id)?.status).toBe('completed');
  });

  it('寄售押金不足时不会接单，也不会占用当日订单功能', () => {
    let s = freshState();
    s = {
      ...s,
      npcAffinity: { ...s.npcAffinity, 'jn-fang-jiheng': 12 },
      resources: { ...s.resources, coin: 0 },
    };

    const next = gameReducer(s, { type: 'USE_NPC_FUNCTION', npcId: 'jn-fang-jiheng', functionKind: 'order' }, content);

    expect(next.activeOrders).toEqual([]);
    expect(next.flags).not.toContain('npc-order:jn-fang-jiheng');
    expect(next.npcStates['jn-fang-jiheng']?.usedFunctionDays?.order).toBeUndefined();
    expect(next.log[0]).toContain('需先押');
  });

  it('雷掌柜高信用订单可免押，过期会写入票号失约', () => {
    let s = freshState();
    s = {
      ...s,
      npcAffinity: { ...s.npcAffinity, 'sj-lei-zhanggui': 40 },
      regionReputation: { ...s.regionReputation, sanjin: 25 },
      resources: { ...s.resources, coin: 5 },
      flags: [...s.flags, 'sanjin-piaohao-credit-note'],
      profile: {
        ...s.profile,
        attributes: { ...s.profile.attributes, commerce: 60, people: 30 },
      },
    };

    s = gameReducer(s, { type: 'USE_NPC_FUNCTION', npcId: 'sj-lei-zhanggui', functionKind: 'order' }, content);

    const order = s.activeOrders[0];
    expect(order.orderKind).toBe('credit');
    expect(order.depositCoin).toBe(0);
    expect(order.creditTrustScore).toBeGreaterThanOrEqual(62);
    expect(order.desc).toContain('票号');
    expect(s.resources.coin).toBe(5);
    expect(s.flags).toContain('credit-order:sj-lei-zhanggui');

    const expiredState = {
      ...s,
      calendar: { ...s.calendar, day: (order.expiresDay ?? s.calendar.day) + 1 },
    };
    const expired = gameReducer(expiredState, { type: 'FULFILL_ORDER', orderId: order.id }, content);

    expect(expired.activeOrders.find((item) => item.id === order.id)?.status).toBe('expired');
    expect(expired.flags).toContain('credit-default:sj-lei-zhanggui');
    expect(expired.flags).toContain('credit-order-expired:sj-lei-zhanggui');
    expect(expired.regionReputation.sanjin).toBeLessThan(s.regionReputation.sanjin);
  });

  it('雨天林雨桥订单会优先生成油纸伞急单并缩短交期', () => {
    let s = freshState();
    s = {
      ...s,
      currentSubregion: 'jiangnan-linan',
      calendar: { ...s.calendar, weather: 'rain' },
      npcAffinity: { ...s.npcAffinity, 'jn-lin-yuqiao': 12 },
    };

    s = gameReducer(s, { type: 'USE_NPC_FUNCTION', npcId: 'jn-lin-yuqiao', functionKind: 'order' }, content);

    const order = s.activeOrders[0];
    expect(order.resourceId).toBe('oilpaperUmbrella');
    expect(order.expiresDay).toBe(s.calendar.day + 5);
    expect(order.desc).toContain('雨季急单');
    expect(order.minQuality).toBeGreaterThan(0.52);
  });

  it('过期 NPC 订单不能再交付，并会标记为 expired', () => {
    let s = freshState();
    s = { ...s, npcAffinity: { ...s.npcAffinity, 'jn-bamboo-master': 12 } };
    s = gameReducer(s, { type: 'USE_NPC_FUNCTION', npcId: 'jn-bamboo-master', functionKind: 'order' }, content);
    const order = s.activeOrders[0];
    s = {
      ...s,
      calendar: { ...s.calendar, day: (order.expiresDay ?? s.calendar.day) + 1 },
      resources: { ...s.resources, [order.resourceId]: order.quantity, coin: 0 },
    };

    const next = gameReducer(s, { type: 'FULFILL_ORDER', orderId: order.id }, content);
    expect(next.activeOrders.find((item) => item.id === order.id)?.status).toBe('expired');
    expect(next.resources.coin).toBe(0);
  });

  it('FULFILL_ORDER 会消耗目标资源、结算赏钱并完成订单', () => {
    let s = freshState();
    s = { ...s, npcAffinity: { ...s.npcAffinity, 'jn-bamboo-master': 12 } };
    s = gameReducer(s, { type: 'USE_NPC_FUNCTION', npcId: 'jn-bamboo-master', functionKind: 'order' }, content);
    const order = s.activeOrders[0];
    s = {
      ...s,
      resources: { ...s.resources, [order.resourceId]: order.quantity, coin: 0 },
    };

    const next = gameReducer(s, { type: 'FULFILL_ORDER', orderId: order.id }, content);
    expect(next.resources[order.resourceId]).toBe(0);
    expect(next.resources.coin).toBe(order.rewardCoin);
    expect(next.activeOrders.find((item) => item.id === order.id)?.status).toBe('completed');
    expect(next.flags).toContain(`order-completed:${order.id}`);
    expect(next.npcAffinity['jn-bamboo-master']).toBeGreaterThan(s.npcAffinity['jn-bamboo-master']);
    expect(next.regionReputation.jiangnan).toBeGreaterThan(s.regionReputation.jiangnan);
    expect(routeStabilityOf(next, order.routeIds?.[0])).toBeGreaterThan(routeStabilityOf(s, order.routeIds?.[0]));
  });

  it('USE_NPC_FUNCTION 联作和鉴评会写入作品实例', () => {
    let s = forgeHighQualitySword().state;
    const swordId = s.itemInstances[0].id;
    s = { ...s, npcAffinity: { ...s.npcAffinity, 'jn-ning-ciqiu': 24 } };
    const beforeQuality = s.itemInstances[0].quality;

    s = gameReducer(s, { type: 'USE_NPC_FUNCTION', npcId: 'jn-ning-ciqiu', functionKind: 'collab', itemId: swordId }, content);
    let sword = s.itemInstances.find((item) => item.id === swordId)!;
    expect(sword.collaboratorNpcIds).toContain('jn-ning-ciqiu');
    expect(sword.quality).toBeGreaterThan(beforeQuality);
    expect(s.flags).toContain('npc-collab:jn-ning-ciqiu');

    s = gameReducer(s, { type: 'USE_NPC_FUNCTION', npcId: 'jn-ning-ciqiu', functionKind: 'appraisal', itemId: swordId }, content);
    sword = s.itemInstances.find((item) => item.id === swordId)!;
    expect(sword.inscription).toContain('宁辞秋');
    expect(s.flags).toContain('npc-appraisal:jn-ning-ciqiu');
  });

  it('USE_NPC_FUNCTION 沈云梭联作会消耗丝线并写入云锦工序记忆', () => {
    const base = freshState();
    const brocade: ItemInstance = {
      id: 'test-yunjin-brocade',
      resourceId: 'brocade',
      sourceIndustryId: 'weave-brocade',
      originRegionId: 'jiangnan',
      originSubregionId: 'jiangnan-jinling',
      createdTurn: base.turn,
      quality: 0.62,
      descriptors: ['织面稳'],
      appraisal: '一段织锦已有可辨纹路。',
      status: 'held' as const,
    };
    let s: ReturnType<typeof freshState> = {
      ...base,
      resources: { ...base.resources, rawSilkThread: 2, brocade: 1 },
      npcAffinity: { ...base.npcAffinity, 'jn-shen-yunsuo': 24 },
      itemInstances: [brocade],
    };
    const beforeCraft = s.profile.attributes.craft;

    s = gameReducer(
      s,
      { type: 'USE_NPC_FUNCTION', npcId: 'jn-shen-yunsuo', functionKind: 'collab', itemId: brocade.id },
      content,
    );
    const collaborated = s.itemInstances.find((item) => item.id === brocade.id)!;

    expect(s.resources.rawSilkThread).toBe(0);
    expect(collaborated.quality).toBe(0.73);
    expect(collaborated.collaboratorNpcIds).toContain('jn-shen-yunsuo');
    expect(collaborated.descriptors).toContain('通经稳');
    expect(collaborated.descriptors).toContain('宫样准');
    expect(collaborated.appraisal).toContain('挑花通经法');
    expect(collaborated.appraisal).toContain('宫样校花');
    expect(s.flags).toContain('collab-recipe:collab-yunjin-pick-weft');
    expect(s.flags).toContain('collab-choice:palace-pattern-proof');
    expect(s.flags).toContain('yunjin-collab-worked');
    expect(s.flags).toContain('yunjin-choice-palace-pattern-proof');
    expect(s.flags).toContain('collaborative-masterwork');
    expect(s.npcStates['jn-shen-yunsuo'].knownTopics).toContain('yunjin-collab');
    expect(s.npcStates['jn-shen-yunsuo'].knownTopics).toContain('collab-choice:palace-pattern-proof');
    expect(s.npcStates['jn-shen-yunsuo'].knownTopics).toContain('pattern-archive');
    expect(s.profile.attributes.craft).toBeGreaterThan(beforeCraft);
  });

  it('USE_NPC_FUNCTION 沈云梭云锦联作缺料时不会占用当日功能', () => {
    const base = freshState();
    const brocade: ItemInstance = {
      id: 'test-yunjin-brocade-lack',
      resourceId: 'brocade',
      sourceIndustryId: 'weave-brocade',
      originRegionId: 'jiangnan',
      originSubregionId: 'jiangnan-jinling',
      createdTurn: base.turn,
      quality: 0.62,
      descriptors: ['织面稳'],
      appraisal: '一段织锦已有可辨纹路。',
      status: 'held' as const,
    };
    const s: ReturnType<typeof freshState> = {
      ...base,
      resources: { ...base.resources, rawSilkThread: 0, brocade: 1 },
      npcAffinity: { ...base.npcAffinity, 'jn-shen-yunsuo': 24 },
      itemInstances: [brocade],
    };

    const next = gameReducer(
      s,
      { type: 'USE_NPC_FUNCTION', npcId: 'jn-shen-yunsuo', functionKind: 'collab', itemId: brocade.id },
      content,
    );

    expect(next.itemInstances[0].quality).toBe(brocade.quality);
    expect(next.flags).not.toContain('collab-recipe:collab-yunjin-pick-weft');
    expect(next.npcAffinity['jn-shen-yunsuo']).toBe(24);
    expect(next.npcStates['jn-shen-yunsuo']?.usedFunctionDays?.collab).toBeUndefined();
    expect(next.log[0]).toContain('缺少联作材料');
  });

  it('USE_NPC_FUNCTION 外地专属联作会扣材料、改作品并写入多地区协同记忆', () => {
    const base = freshState();
    const paper: ItemInstance = {
      id: 'test-huizhou-xuan-paper-collab',
      resourceId: 'xuanPaper',
      sourceCraftId: 'xuan-paper',
      originRegionId: 'huizhou',
      originSubregionId: 'huizhou-paper-valley',
      createdTurn: base.turn,
      quality: 0.59,
      descriptors: ['润墨稳'],
      appraisal: '一张纸性尚稳的宣纸样。',
      status: 'held' as const,
    };
    let s: ReturnType<typeof freshState> = {
      ...base,
      resources: { ...base.resources, paperSheet: 1, inkStick: 1, xuanPaper: 1 },
      npcAffinity: { ...base.npcAffinity, 'hz-wang-zhiniang': 28 },
      itemInstances: [paper],
    };
    const beforeMind = s.profile.attributes.mind;
    const beforeKnowledge = s.profile.attributes.knowledge;

    s = gameReducer(
      s,
      {
        type: 'USE_NPC_FUNCTION',
        npcId: 'hz-wang-zhiniang',
        functionKind: 'collab',
        itemId: paper.id,
        collabChoiceId: 'inscription-space',
      },
      content,
    );
    const collaborated = s.itemInstances.find((item) => item.id === paper.id)!;

    expect(s.resources.paperSheet).toBe(0);
    expect(s.resources.inkStick).toBe(0);
    expect(collaborated.quality).toBe(0.68);
    expect(collaborated.collaboratorNpcIds).toContain('hz-wang-zhiniang');
    expect(collaborated.collaboratorNpcIds).toContain('jn-ning-ciqiu');
    expect(collaborated.descriptors).toContain('纸性托名');
    expect(collaborated.descriptors).toContain('题位清');
    expect(collaborated.appraisal).toContain('纸墨托名法');
    expect(collaborated.appraisal).toContain('题跋位置');
    expect(s.flags).toContain('collab-recipe:collab-wang-paper-mount');
    expect(s.flags).toContain('collab-choice:inscription-space');
    expect(s.flags).toContain('collab-partner:jn-ning-ciqiu');
    expect(s.flags).toContain('collab-choice-partner:inscription-space:jn-ning-ciqiu');
    expect(s.flags).toContain('paper-ink-collab-worked');
    expect(s.flags).toContain('paper-collab-choice-inscription-space');
    expect(s.npcStates['hz-wang-zhiniang'].knownTopics).toContain('paper-collab');
    expect(s.npcStates['hz-wang-zhiniang'].knownTopics).toContain('collab-choice:inscription-space');
    expect(s.npcStates['hz-wang-zhiniang'].knownTopics).toContain('collection-ready');
    expect(s.npcStates['hz-wang-zhiniang'].knownTopics).toContain('stationery-lineage');
    expect(s.npcStates['jn-ning-ciqiu'].knownTopics).toContain('collab-partner:collab-wang-paper-mount');
    expect(s.npcStates['jn-ning-ciqiu'].knownTopics).toContain('collab-choice:inscription-space');
    expect(s.npcStates['jn-ning-ciqiu'].knownTopics).toContain('collection-ready');
    expect(s.npcStates['jn-ning-ciqiu'].usedFunctionDays?.collab).toBeUndefined();
    expect(s.npcAffinity['jn-ning-ciqiu']).toBeGreaterThan(0);
    expect(s.profile.attributes.mind).toBeGreaterThan(beforeMind);
    expect(s.profile.attributes.knowledge).toBeGreaterThan(beforeKnowledge);

    const textileBase = freshState();
    const gambieredSilk: ItemInstance = {
      id: 'test-lingnan-gambiered-collab',
      resourceId: 'gambieredSilk',
      sourceCraftId: 'gambiered-silk',
      originRegionId: 'lingnan',
      originSubregionId: 'lingnan-gambiered-yard',
      createdTurn: textileBase.turn,
      quality: 0.61,
      descriptors: ['沉色尚稳'],
      appraisal: '一匹晒场色层尚稳的香云纱。',
      status: 'held' as const,
    };
    let textileState: ReturnType<typeof freshState> = {
      ...textileBase,
      resources: { ...textileBase.resources, rawSilkThread: 1, indigoVat: 1, gambieredSilk: 1 },
      npcAffinity: { ...textileBase.npcAffinity, 'ln-he-yunsha': 28 },
      itemInstances: [gambieredSilk],
    };

    textileState = gameReducer(
      textileState,
      {
        type: 'USE_NPC_FUNCTION',
        npcId: 'ln-he-yunsha',
        functionKind: 'collab',
        itemId: gambieredSilk.id,
        collabChoiceId: 'market-fast-cure',
      },
      content,
    );
    const collaboratedTextile = textileState.itemInstances.find((item) => item.id === gambieredSilk.id)!;

    expect(textileState.resources.rawSilkThread).toBe(0);
    expect(textileState.resources.indigoVat).toBe(0);
    expect(collaboratedTextile.quality).toBeGreaterThan(gambieredSilk.quality);
    expect(collaboratedTextile.collaboratorNpcIds).toContain('ln-he-yunsha');
    expect(collaboratedTextile.collaboratorNpcIds).toContain('ln-wu-haichao');
    expect(collaboratedTextile.descriptors).toContain('船期可验');
    expect(collaboratedTextile.appraisal).toContain('伍海潮');
    expect(textileState.flags).toContain('collab-recipe:collab-yunsha-sun-cure');
    expect(textileState.flags).toContain('collab-choice:market-fast-cure');
    expect(textileState.flags).toContain('collab-partner:ln-wu-haichao');
    expect(textileState.flags).toContain('collab-choice-partner:market-fast-cure:ln-wu-haichao');
    expect(textileState.flags).toContain('gambiered-partner-wu-export-schedule');
    expect(textileState.npcStates['ln-he-yunsha'].knownTopics).toContain('export-schedule');
    expect(textileState.npcStates['ln-wu-haichao'].knownTopics).toContain(
      'collab-partner:collab-yunsha-sun-cure',
    );
    expect(textileState.npcStates['ln-wu-haichao'].knownTopics).toContain('collab-choice:market-fast-cure');
    expect(textileState.npcStates['ln-wu-haichao'].knownTopics).toContain('export-schedule');
    expect(textileState.npcStates['ln-wu-haichao'].usedFunctionDays?.collab).toBeUndefined();
    expect(textileState.npcAffinity['ln-wu-haichao']).toBeGreaterThan(0);
  });

  it('USE_NPC_FUNCTION 高风险专属联作试手不足会进入返修失败分支', () => {
    const base = freshState();
    const lacquer: ItemInstance = {
      id: 'test-pingyao-risk-polish',
      resourceId: 'pingyaoLacquer',
      sourceCraftId: 'pingyao-lacquer',
      originRegionId: 'sanjin',
      originSubregionId: 'sanjin-lacquer-yard',
      createdTurn: base.turn,
      quality: 0.59,
      descriptors: ['漆面尚稳'],
      appraisal: '一件漆面未完全收光的平遥漆器。',
      status: 'held' as const,
    };
    let s: ReturnType<typeof freshState> = {
      ...base,
      resources: { ...base.resources, lacquerRefined: 2, pingyaoLacquer: 1 },
      npcAffinity: { ...base.npcAffinity, 'sj-pingyao-qipo': 24 },
      itemInstances: [lacquer],
    };
    const beforeMind = s.profile.attributes.mind;

    s = gameReducer(
      s,
      {
        type: 'USE_NPC_FUNCTION',
        npcId: 'sj-pingyao-qipo',
        functionKind: 'collab',
        itemId: lacquer.id,
        collabChoiceId: 'mirror-slow-polish',
      },
      content,
    );
    const failed = s.itemInstances.find((item) => item.id === lacquer.id)!;

    expect(s.resources.lacquerRefined).toBe(0);
    expect(failed.quality).toBe(0.56);
    expect(failed.collaboratorNpcIds).toContain('sj-pingyao-qipo');
    expect(failed.descriptors).toContain('浮亮未收');
    expect(failed.descriptors).toContain('返修痕');
    expect(failed.descriptors).not.toContain('镜光厚');
    expect(failed.appraisal).toContain('返修痕');
    expect(s.flags).toContain('collab-recipe:collab-pingyao-hand-polish');
    expect(s.flags).toContain('collab-choice:mirror-slow-polish');
    expect(s.flags).toContain('collab-failure:collab-pingyao-hand-polish');
    expect(s.flags).toContain('collab-failure-choice:mirror-slow-polish');
    expect(s.flags).toContain('pingyao-choice-mirror-slow-polish-failed');
    expect(s.flags).not.toContain('pingyao-polish-collab-worked');
    expect(s.flags).not.toContain('pingyao-choice-mirror-slow-polish');
    expect(s.npcStates['sj-pingyao-qipo'].knownTopics).toContain('collab-failure:collab-pingyao-hand-polish');
    expect(s.npcStates['sj-pingyao-qipo'].knownTopics).toContain('collab-failure-choice:mirror-slow-polish');
    expect(s.npcStates['sj-pingyao-qipo'].knownTopics).toContain('mirror-polish-failure');
    expect(s.npcStates['sj-pingyao-qipo'].usedFunctionDays?.collab).toBe(s.calendar.day);
    expect(s.npcAffinity['sj-pingyao-qipo']).toBe(25);
    expect(s.profile.attributes.mind).toBeGreaterThan(beforeMind);
    expect(s.log[0]).toContain('失手');

    const thangkaBase = freshState();
    const thangka: ItemInstance = {
      id: 'test-xueyu-thangka-measure-failure',
      resourceId: 'thangka',
      sourceCraftId: 'thangka',
      originRegionId: 'xueyu',
      originSubregionId: 'xueyu-thangka-court',
      createdTurn: thangkaBase.turn,
      quality: 0.61,
      descriptors: ['矿彩尚稳'],
      appraisal: '一幅矿彩层次尚稳、度量还需复核的唐卡。',
      status: 'held' as const,
    };
    let thangkaState: ReturnType<typeof freshState> = {
      ...thangkaBase,
      resources: { ...thangkaBase.resources, pigmentRefined: 2, paperSheet: 1, thangka: 1 },
      npcAffinity: { ...thangkaBase.npcAffinity, 'xy-losang': 24 },
      itemInstances: [thangka],
    };
    const beforeLosangMind = thangkaState.profile.attributes.mind;

    thangkaState = gameReducer(
      thangkaState,
      {
        type: 'USE_NPC_FUNCTION',
        npcId: 'xy-losang',
        functionKind: 'collab',
        itemId: thangka.id,
        collabChoiceId: 'measure-line-retouch',
      },
      content,
    );
    const failedThangka = thangkaState.itemInstances.find((item) => item.id === thangka.id)!;

    expect(thangkaState.resources.pigmentRefined).toBe(0);
    expect(thangkaState.resources.paperSheet).toBe(0);
    expect(failedThangka.quality).toBe(0.585);
    expect(failedThangka.collaboratorNpcIds).toContain('xy-losang');
    expect(failedThangka.descriptors).toContain('度量线偏');
    expect(failedThangka.descriptors).toContain('补彩返修');
    expect(failedThangka.descriptors).not.toContain('度量严');
    expect(failedThangka.appraisal).toContain('题材分寸');
    expect(thangkaState.flags).toContain('collab-recipe:collab-losang-mineral-layer');
    expect(thangkaState.flags).toContain('collab-choice:measure-line-retouch');
    expect(thangkaState.flags).toContain('collab-failure:collab-losang-mineral-layer');
    expect(thangkaState.flags).toContain('collab-failure-choice:measure-line-retouch');
    expect(thangkaState.flags).toContain('thangka-choice-measure-line-retouch-failed');
    expect(thangkaState.flags).not.toContain('thangka-collab-worked');
    expect(thangkaState.flags).not.toContain('thangka-choice-measure-line-retouch');
    expect(thangkaState.npcStates['xy-losang'].knownTopics).toContain('collab-failure:collab-losang-mineral-layer');
    expect(thangkaState.npcStates['xy-losang'].knownTopics).toContain(
      'collab-failure-choice:measure-line-retouch',
    );
    expect(thangkaState.npcStates['xy-losang'].knownTopics).toContain('measure-line-failure');
    expect(thangkaState.npcStates['xy-losang'].usedFunctionDays?.collab).toBe(thangkaState.calendar.day);
    expect(thangkaState.npcAffinity['xy-losang']).toBe(25);
    expect(thangkaState.profile.attributes.mind).toBeGreaterThan(beforeLosangMind);
    expect(thangkaState.log[0]).toContain('失手');
  });

  it('逐地区主要 NPC 已具备功能、偏好、见闻和人物线文本', () => {
    const questNpcIds = new Set(QUESTS.map((quest) => quest.npcId));
    const mainNpcIds = [...new Set(REGION_CONTENT.flatMap((region) => region.mainNpcIds))];
    const questRegionIds = new Set(
      QUESTS.map((quest) => ALL_NPCS.find((npc) => npc.id === quest.npcId)?.regionId).filter(Boolean),
    );
    const resourceIds = new Set(RESOURCES.map((resource) => resource.id));
    const craftIds = new Set(CRAFTS.map((craft) => craft.id));
    const npcIds = new Set(ALL_NPCS.map((npc) => npc.id));
    const routeIds = new Set(REGION_ROUTES.map((route) => route.id));
    for (const npcId of mainNpcIds) {
      const npc = ALL_NPCS.find((item) => item.id === npcId);
      expect(npc, npcId).toBeTruthy();
      expect(npc?.functions?.length ?? 0).toBeGreaterThan(0);
      expect(npc?.preferences?.length ?? 0).toBeGreaterThan(0);
      expect(npc?.intel?.length ?? 0).toBeGreaterThan(0);
      expect(npc?.relationshipLines?.familiar?.length ?? 0).toBeGreaterThan(0);
      expect(npc?.personalDilemma?.length ?? 0).toBeGreaterThan(0);
      expect(npc?.endingInfluence?.length ?? 0).toBeGreaterThan(0);
    }
    for (const recipe of COLLAB_RECIPES) {
      const npc = ALL_NPCS.find((item) => item.id === recipe.npcId);
      expect(npc?.functions, recipe.npcId).toContain('collab');
      for (const resourceId of recipe.resourceIds ?? []) {
        expect(resourceIds.has(resourceId), `${recipe.id}:${resourceId}`).toBe(true);
      }
      for (const resourceId of Object.keys(recipe.requiredResources ?? {})) {
        expect(resourceIds.has(resourceId), `${recipe.id}:${resourceId}`).toBe(true);
      }
      for (const craftId of recipe.craftIds ?? []) {
        expect(craftIds.has(craftId), `${recipe.id}:${craftId}`).toBe(true);
      }
      expect(recipe.choices?.length ?? 0, `${recipe.id}:choices`).toBeGreaterThanOrEqual(2);
      const choiceIds = new Set<string>();
      for (const choice of recipe.choices ?? []) {
        expect(choice.id.length, `${recipe.id}:choice-id`).toBeGreaterThan(0);
        expect(choice.label.trim().length, `${recipe.id}:${choice.id}:label`).toBeGreaterThan(0);
        expect(choice.desc.trim().length, `${recipe.id}:${choice.id}:desc`).toBeGreaterThan(0);
        expect(choiceIds.has(choice.id), `${recipe.id}:${choice.id}:duplicate`).toBe(false);
        choiceIds.add(choice.id);
        for (const resourceId of Object.keys(choice.requiredResources ?? {})) {
          expect(resourceIds.has(resourceId), `${recipe.id}:${choice.id}:${resourceId}`).toBe(true);
        }
        if (choice.failure) {
          expect(choice.failure.trialThreshold, `${recipe.id}:${choice.id}:failure-threshold`).toBeGreaterThan(0);
          expect(choice.failure.trialThreshold, `${recipe.id}:${choice.id}:failure-threshold`).toBeLessThanOrEqual(1);
          expect(choice.failure.trialThreshold, `${recipe.id}:${choice.id}:failure-min-quality`).toBeGreaterThan(
            choice.minQuality ?? recipe.minQuality ?? 0,
          );
          expect(choice.failure.appraisalAppend.trim().length, `${recipe.id}:${choice.id}:failure-appraisal`).toBeGreaterThan(0);
          expect(choice.failure.qualityPenalty ?? 0, `${recipe.id}:${choice.id}:failure-penalty`).toBeGreaterThanOrEqual(0);
          expect(choice.failure.flags?.length ?? 0, `${recipe.id}:${choice.id}:failure-flags`).toBeGreaterThan(0);
          expect(choice.failure.topics?.length ?? 0, `${recipe.id}:${choice.id}:failure-topics`).toBeGreaterThan(0);
        }
        const partnerIds = new Set<string>();
        for (const partnerNpcId of choice.partnerNpcIds ?? []) {
          expect(npcIds.has(partnerNpcId), `${recipe.id}:${choice.id}:partner:${partnerNpcId}`).toBe(true);
          expect(partnerNpcId, `${recipe.id}:${choice.id}:self-partner`).not.toBe(recipe.npcId);
          expect(partnerIds.has(partnerNpcId), `${recipe.id}:${choice.id}:duplicate-partner:${partnerNpcId}`).toBe(false);
          partnerIds.add(partnerNpcId);
        }
      }
    }
    for (const visit of HOME_VISITS) {
      const npc = ALL_NPCS.find((item) => item.id === visit.npcId);
      expect(npc?.functions, visit.npcId).toContain('homeVisit');
      const requiredFlags = new Set(visit.requiredFlags ?? []);
      const blockedFlags = new Set(visit.blockedFlags ?? []);
      for (const flag of requiredFlags) {
        expect(flag.trim().length, `${visit.id}:required-flag`).toBeGreaterThan(0);
        expect(blockedFlags.has(flag), `${visit.id}:required-blocked-overlap:${flag}`).toBe(false);
      }
      for (const flag of blockedFlags) {
        expect(flag.trim().length, `${visit.id}:blocked-flag`).toBeGreaterThan(0);
      }
      expect(visit.choices?.length ?? 0, `${visit.id}:choices`).toBeGreaterThanOrEqual(3);
      const choiceKinds = new Set((visit.choices ?? []).map((choice) => choice.kind));
      expect(choiceKinds.has('view'), `${visit.id}:view`).toBe(true);
      expect(choiceKinds.has('inscribe'), `${visit.id}:inscribe`).toBe(true);
      expect(choiceKinds.has('collect'), `${visit.id}:collect`).toBe(true);
      const choiceIds = new Set<string>();
      for (const choice of visit.choices ?? []) {
        expect(choice.id.length, `${visit.id}:choice-id`).toBeGreaterThan(0);
        expect(choice.label.trim().length, `${visit.id}:${choice.id}:label`).toBeGreaterThan(0);
        expect(choice.desc.trim().length, `${visit.id}:${choice.id}:desc`).toBeGreaterThan(0);
        expect(choice.line.trim().length, `${visit.id}:${choice.id}:line`).toBeGreaterThan(0);
        expect(choiceIds.has(choice.id), `${visit.id}:${choice.id}:duplicate`).toBe(false);
        choiceIds.add(choice.id);
        if (choice.kind === 'inscribe') {
          expect(choice.inscription?.trim().length ?? 0, `${visit.id}:${choice.id}:inscription`).toBeGreaterThan(0);
        }
        if (choice.kind === 'collect') {
          expect(choice.referralOrder, `${visit.id}:${choice.id}:referralOrder`).toBeTruthy();
          expect(choice.referralOrder?.title.trim().length ?? 0, `${visit.id}:${choice.id}:referral-title`).toBeGreaterThan(0);
          expect(choice.referralOrder?.desc.trim().length ?? 0, `${visit.id}:${choice.id}:referral-desc`).toBeGreaterThan(0);
          expect(choice.referralOrder?.expiresIn ?? 1, `${visit.id}:${choice.id}:referral-expires`).toBeGreaterThan(0);
          expect(choice.referralOrder?.quantity ?? 1, `${visit.id}:${choice.id}:referral-quantity`).toBeGreaterThan(0);
          const referralResourceId = choice.referralOrder?.resourceId;
          if (referralResourceId) {
            expect(resourceIds.has(referralResourceId), `${visit.id}:${choice.id}:referral-resource`).toBe(true);
          }
        }
      }
    }
    for (const encounter of ESCORT_ENCOUNTERS) {
      expect(encounter.routeIds.length, `${encounter.id}:routes`).toBeGreaterThan(0);
      for (const routeId of encounter.routeIds) expect(routeIds.has(routeId), `${encounter.id}:${routeId}`).toBe(true);
      const requiredFlags = new Set(encounter.requiredFlags ?? []);
      const blockedFlags = new Set(encounter.blockedFlags ?? []);
      for (const flag of requiredFlags) {
        expect(flag.trim().length, `${encounter.id}:required-flag`).toBeGreaterThan(0);
        expect(blockedFlags.has(flag), `${encounter.id}:required-blocked-overlap:${flag}`).toBe(false);
      }
      for (const flag of blockedFlags) {
        expect(flag.trim().length, `${encounter.id}:blocked-flag`).toBeGreaterThan(0);
      }
      if (encounter.once) expect(encounter.id.length, `${encounter.id}:once-id`).toBeGreaterThan(0);
    }
    for (const region of REGIONS) {
      expect(region.ending?.trusted?.length ?? 0, `${region.id}:trusted`).toBeGreaterThan(0);
      expect(region.ending?.honored?.length ?? 0, `${region.id}:honored`).toBeGreaterThan(0);
      expect(region.ending?.pillar?.length ?? 0, `${region.id}:pillar`).toBeGreaterThan(0);
    }
    for (const region of REGIONS) expect(questRegionIds.has(region.id), region.id).toBe(true);
    for (const npcId of [
      'bs-luo-qingmie',
      'bs-mabang-ayue',
      'qd-yinniang-alan',
      'qd-mu-luozi',
      'jj-lan-daqi',
      'jj-song-yasi',
      'ln-wu-haichao',
      'jc-qinglu',
      'gp-chai-yazi',
      'hz-wang-zhiniang',
      'sj-lei-zhanggui',
      'xy-yak-captain',
      'xu-tuoling-shu',
    ]) expect(questNpcIds.has(npcId), npcId).toBe(true);
    expect(ALL_NPCS.find((item) => item.id === 'bs-mabang-ayue')?.functions).toContain('escort');
    expect(ALL_NPCS.find((item) => item.id === 'qd-mu-luozi')?.functions).toContain('escort');
    expect(ALL_NPCS.find((item) => item.id === 'xy-yak-captain')?.functions).toContain('escort');
    expect(ALL_NPCS.find((item) => item.id === 'xu-tuoling-shu')?.functions).toContain('escort');
  });

  it('外地路线委托会写入结构化路线情报', () => {
    let s = freshState();
    s = {
      ...s,
      npcAffinity: { ...s.npcAffinity, 'bs-mabang-ayue': 8 },
      completedActivities: ['bs-tea-horse-post'],
    };
    const next = gameReducer(s, { type: 'COMPLETE_QUEST', questId: 'q-bashu-tea-horse-snow-pass' }, content);
    expect(next.completedQuests).toContain('q-bashu-tea-horse-snow-pass');
    expect(next.regionReputation.bashu).toBeGreaterThan(s.regionReputation.bashu ?? 0);
    expect(next.flags).toContain('bashu-mabang-roadbook');
    expect(next.flags).toContain('route-known:route-bashu-qiandian-tea-horse');
    expect(next.flags).toContain('route-known:route-bashu-xueyu-snow-pass');
  });

  it('后续地区路线委托会写入路线情报与地区声望', () => {
    const cases = [
      {
        questId: 'q-lingnan-export-ledger',
        npcId: 'ln-wu-haichao',
        regionId: 'lingnan',
        completedActivities: ['ln-pearl-river-harbor'],
        flags: ['lingnan-export-ledger', 'route-known:route-qiandian-lingnan-harbor'],
      },
      {
        questId: 'q-jingchu-water-ledger',
        npcId: 'jc-qinglu',
        regionId: 'jingchu',
        completedActivities: ['jc-ferry-market'],
        flags: ['jingchu-water-ledger', 'route-known:route-jingchu-ganpo-lake'],
      },
      {
        questId: 'q-ganpo-kiln-firewood',
        npcId: 'gp-chai-yazi',
        regionId: 'ganpo',
        completedActivities: ['gp-river-wood-yard'],
        flags: ['ganpo-kiln-firewood-ledger', 'route-known:route-ganpo-huizhou-merchant'],
      },
      {
        questId: 'q-huizhou-paper-ink-pledge',
        npcId: 'hz-wang-zhiniang',
        regionId: 'huizhou',
        completedActivities: ['hz-paper-valley'],
        flags: ['huizhou-paper-ink-pledge', 'route-known:route-jiangnan-huizhou-paper'],
      },
      {
        questId: 'q-sanjin-piaohao-credit',
        npcId: 'sj-lei-zhanggui',
        regionId: 'sanjin',
        completedActivities: ['sj-piaohao'],
        flags: ['sanjin-piaohao-credit-note', 'route-known:route-jingji-sanjin-official'],
      },
      {
        questId: 'q-xueyu-snow-pass-supply',
        npcId: 'xy-yak-captain',
        regionId: 'xueyu',
        completedActivities: ['xy-snow-pass'],
        flags: ['xueyu-snow-pass-supply', 'route-known:route-xueyu-xiyu-caravan'],
      },
      {
        questId: 'q-xiyu-caravan-contract',
        npcId: 'xu-tuoling-shu',
        regionId: 'xiyu',
        completedActivities: ['xiyu-caravan-post'],
        flags: ['xiyu-caravan-contract', 'route-known:route-xueyu-xiyu-caravan'],
      },
    ];

    for (const testCase of cases) {
      const s = {
        ...freshState(),
        npcAffinity: { [testCase.npcId]: 16 },
        completedActivities: testCase.completedActivities,
      };
      const next = gameReducer(s, { type: 'COMPLETE_QUEST', questId: testCase.questId }, content);
      expect(next.completedQuests, testCase.questId).toContain(testCase.questId);
      expect(next.regionReputation[testCase.regionId], testCase.questId).toBeGreaterThan(
        s.regionReputation[testCase.regionId] ?? 0,
      );
      for (const flag of testCase.flags) expect(next.flags, `${testCase.questId}:${flag}`).toContain(flag);
    }
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
    expect(s.regionReputation.jiangnan).toBeGreaterThan(5);
    expect(s.resources.coin).toBe(coinBefore + (quest.reward.coin ?? 0));
    // 重复交付无效
    const again = gameReducer(s, { type: 'COMPLETE_QUEST', questId: quest.id }, content);
    expect(again.resources.coin).toBe(s.resources.coin);
  });

  it('宁辞秋人物线：文房任务消耗纸墨，题跋任务写入代表作', () => {
    let s = forgeHighQualitySword().state;
    const swordId = s.itemInstances[0].id;
    s = {
      ...s,
      flags: [...s.flags, 'met-ning-poetry'],
      resources: { ...s.resources, paperSheet: 1, inkStick: 1 },
      npcAffinity: { ...s.npcAffinity, 'jn-ning-ciqiu': 24 },
    };

    s = gameReducer(s, { type: 'COMPLETE_QUEST', questId: 'q-ning-stationery' }, content);
    expect(s.completedQuests).toContain('q-ning-stationery');
    expect(s.resources.paperSheet).toBe(0);
    expect(s.resources.inkStick).toBe(0);
    expect(s.flags).toContain('ning-stationery-ready');

    s = gameReducer(s, { type: 'COMPLETE_QUEST', questId: 'q-ning-inscription' }, content);
    const sword = s.itemInstances.find((item) => item.id === swordId)!;
    expect(s.completedQuests).toContain('q-ning-inscription');
    expect(sword.displayName).toBeTruthy();
    expect(sword.inscription).toContain('器成于手');
    expect(sword.collaboratorNpcIds).toContain('jn-ning-ciqiu');
    expect(s.flags).toContain('ning-inscribed-masterwork');
  });

  it('龙泉人物线：陆寒泉验收亲手锻出的第一把剑', () => {
    let s = forgeHighQualitySword().state;
    s = { ...s, npcAffinity: { ...s.npcAffinity, 'jn-lu-hanquan': 16 } };
    s = gameReducer(s, { type: 'COMPLETE_QUEST', questId: 'q-longquan-first-sword' }, content);
    expect(s.completedQuests).toContain('q-longquan-first-sword');
    expect(s.flags).toContain('longquan-first-sword-approved');
  });

  it('百工志：基础词条常驻，生活活动会解锁见闻和商路词条', () => {
    const initialIds = unlockedLoreEntries(content.loreEntries, freshState()).map((entry) => entry.id);
    expect(initialIds).toEqual(
      expect.arrayContaining(['world-baigong-plaque', 'system-four-metrics', 'region-jiangnan-water-market']),
    );
    expect(initialIds).not.toContain('life-lake-tea-house');

    let s = gameReducer(freshState(), { type: 'TRAVEL_SUBREGION', subregionId: 'jiangnan-linan' }, content);
    s = { ...s, resources: { ...s.resources, teaLeaf: 1, labor: 4 } };
    s = gameReducer(s, { type: 'PERFORM_ACTIVITY', activityId: 'jn-lake-tea-house', quality: 0.9 }, content);

    const ids = unlockedLoreEntries(content.loreEntries, s).map((entry) => entry.id);
    expect(ids).toContain('life-lake-tea-house');
    expect(ids).toContain('route-jiangnan-huizhou-paper');
    expect(loreProgress(content.loreEntries, s).unlocked).toBeGreaterThan(initialIds.length);
  });

  it('百工志：工艺专注校准会解锁青瓷与校准词条', () => {
    let s = gameReducer(freshState(), { type: 'TRAVEL_SUBREGION', subregionId: 'jiangnan-longquan' }, content);
    s = { ...s, resources: { ...s.resources, porcelainClay: 1, coal: 1, labor: 10 } };
    s = gameReducer(
      s,
      {
        type: 'RUN_PROCESS',
        craftId: 'celadon',
        skipStepIds: [],
        focusChecks: [{ stageId: 'celadon-clay-select', choiceId: 'align' }],
      },
      content,
    );

    expect(s.flags).toContain('craft-focus-check-used:celadon');
    const ids = unlockedLoreEntries(content.loreEntries, s).map((entry) => entry.id);
    expect(ids).toContain('craft-celadon-clay-fire');
    expect(ids).toContain('system-focus-checks');
  });

  it('全流程 demo：家园种植→江南制作订单→解锁徽州→跨区制纸订单可自循环', () => {
    let s = gameReducer(freshState(), { type: 'TRAVEL_SUBREGION', subregionId: 'jiangnan-baigongyuan' }, demoContent);
    expect(s.currentSubregion).toBe('jiangnan-baigongyuan');

    s = gameReducer(s, { type: 'PLANT_CROP', plotId: 'yard-1', cropId: 'indigo' }, demoContent);
    expect(s.farmPlots[0].cropId).toBe('indigo');

    for (let day = 0; day < 3; day++) {
      s = gameReducer(s, { type: 'WATER_PLOT', plotId: 'yard-1' }, demoContent);
      s = endDemoDay(s);
    }
    expect(s.farmPlots[0].growth).toBe(100);

    s = gameReducer(s, { type: 'HARVEST_CROP', plotId: 'yard-1' }, demoContent);
    expect(s.farmPlots[0].cropId).toBeNull();
    expect(s.resources.indigoPlant).toBeGreaterThanOrEqual(4);

    s = gameReducer(s, { type: 'TRAVEL_SUBREGION', subregionId: 'jiangnan-suhang' }, demoContent);
    expect(s.currentSubregion).toBe('jiangnan-suhang');
    s = gameReducer(s, { type: 'GATHER_RESOURCE', industryId: 'build-indigo', quality: 1 }, demoContent);
    s = gameReducer(s, { type: 'GATHER_RESOURCE', industryId: 'build-indigo', quality: 1 }, demoContent);
    expect(s.resources.indigoVat).toBeGreaterThanOrEqual(3);

    s = endDemoDay(s);
    s = gameReducer(
      s,
      { type: 'RUN_PROCESS', craftId: 'indigo-dyeing', skipStepIds: ['harvest-indigo', 'tie-resist'] },
      demoContent,
    );
    expect(s.resources.indigoCloth).toBeGreaterThanOrEqual(1);
    const coinAfterCraft = s.resources.coin ?? 0;
    s = gameReducer(s, { type: 'TAKE_ORDER', craftId: 'indigo-dyeing' }, demoContent);
    expect(s.resources.coin).toBeGreaterThan(coinAfterCraft);

    s = gameReducer(s, { type: 'GATHER_RESOURCE', industryId: 'harvest-bamboo', quality: 1 }, demoContent);
    expect(s.resources.bambooRaw).toBeGreaterThanOrEqual(1);

    s = gameReducer(s, { type: 'UNLOCK_REGION', regionId: 'huizhou' }, demoContent);
    expect(s.unlockedRegions).toContain('huizhou');
    s = gameReducer(s, { type: 'TRAVEL', regionId: 'huizhou' }, demoContent);
    expect(s.currentRegion).toBe('huizhou');

    s = gameReducer(s, { type: 'TRAVEL_SUBREGION', subregionId: 'huizhou-paper-valley' }, demoContent);
    expect(s.currentSubregion).toBe('huizhou-paper-valley');
    s = endDemoDay(s);
    s = gameReducer(s, { type: 'GATHER_RESOURCE', industryId: 'harvest-qingtan', quality: 1 }, demoContent);
    s = gameReducer(s, { type: 'GATHER_RESOURCE', industryId: 'make-paper', quality: 1 }, demoContent);
    expect(s.resources.paperSheet).toBeGreaterThanOrEqual(1);

    s = gameReducer(s, { type: 'RUN_PROCESS', craftId: 'xuan-paper', skipStepIds: [] }, demoContent);
    expect(s.resources.xuanPaper).toBeGreaterThanOrEqual(1);
    const coinBeforePaperOrder = s.resources.coin ?? 0;
    s = gameReducer(s, { type: 'TAKE_ORDER', craftId: 'xuan-paper' }, demoContent);
    expect(s.resources.coin).toBeGreaterThan(coinBeforePaperOrder);
    expect(s.status).toBe('playing');
    expect(s.calendar.day).toBeGreaterThan(1);
    expect(s.profile.attributes.craft).toBeGreaterThan(5);
    expect(s.profile.attributes.commerce).toBeGreaterThan(5);
  });

  it('雪天田圃不能浇水，成熟作物收成会折产', () => {
    let s = gameReducer(freshState(), { type: 'TRAVEL_SUBREGION', subregionId: 'jiangnan-baigongyuan' }, demoContent);
    s = {
      ...s,
      calendar: { ...s.calendar, season: 'winter', weather: 'snow' },
      resources: { ...s.resources, labor: 3 },
      farmPlots: s.farmPlots.map((plot, index) =>
        index === 0 ? { ...plot, cropId: 'tea', plantedDay: s.calendar.day, growth: 100, wateredToday: false } : plot,
      ),
    };

    const watered = gameReducer(s, { type: 'WATER_PLOT', plotId: 'yard-1' }, demoContent);
    expect(watered.resources.labor).toBe(3);
    expect(watered.farmPlots[0].wateredToday).toBe(false);

    const harvested = gameReducer(s, { type: 'HARVEST_CROP', plotId: 'yard-1' }, demoContent);
    expect(harvested.resources.teaLeaf).toBe((s.resources.teaLeaf ?? 0) + 3);
    expect(harvested.log.join('\n')).toContain('雪寒折产');
  });
});
