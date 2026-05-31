/**
 * 基础产业目录 —— 手艺的上游，把「原矿/天然物」加工成「半成品/材料」。
 * 详见 doc/项目规划.md §18。每条产业对应一个微交互小游戏（MiniGameType）。
 * 新增产业 = 在此追加一个 IndustryDef。静态数据层，尚未接入 reducer。
 */
import type { IndustryDef } from '../engine/types';

export const INDUSTRIES: IndustryDef[] = [
  { id: 'smelt-iron', name: '冶铁', blurb: '铁矿入炉，控火出铁锭。', miniGame: 'timing_hold', input: { ironOre: 2, coal: 1 }, output: 'ironIngot', yield: 1, laborCost: 2 },
  { id: 'smelt-copper', name: '炼铜', blurb: '铜矿熔炼成铜料。', miniGame: 'timing_hold', input: { copperOre: 2, coal: 1 }, output: 'copperStock', yield: 1, laborCost: 2 },
  { id: 'refine-silver', name: '提银', blurb: '银矿提炼成银料。', miniGame: 'timing_hold', input: { silverOre: 2 }, output: 'silverStock', yield: 1, laborCost: 2 },
  { id: 'mine-kaolin', name: '采高岭', blurb: '开采并淘洗成瓷土。', miniGame: 'ratio_mix', input: { kaolin: 2 }, output: 'porcelainClay', yield: 1, laborCost: 1 },
  { id: 'sericulture', name: '种桑养蚕', blurb: '育蚕缫丝得生丝。', miniGame: 'repeat_endure', input: { cocoonSilk: 2 }, output: 'rawSilkThread', yield: 1, laborCost: 1 },
  { id: 'build-indigo', name: '建靛养缸', blurb: '靛草发酵成活性染液。', miniGame: 'ratio_mix', input: { indigoPlant: 2 }, output: 'indigoVat', yield: 1, laborCost: 1 },
  { id: 'tap-lacquer', name: '割漆精制', blurb: '生漆滤晒成可用漆料。', miniGame: 'timing_hold', input: { rawLacquer: 2 }, output: 'lacquerRefined', yield: 1, laborCost: 1 },
  { id: 'make-paper', name: '捞纸', blurb: '青檀皮/竹料捞造成纸。', miniGame: 'repeat_endure', input: { qingtanBark: 2 }, output: 'paperSheet', yield: 1, laborCost: 1 },
  { id: 'make-ink', name: '制墨', blurb: '松烟和胶捶制成墨锭。', miniGame: 'rhythm', input: { pineSoot: 2 }, output: 'inkStick', yield: 1, laborCost: 1 },
  { id: 'grind-pigment', name: '研磨颜料', blurb: '矿石研漂成颜料。', miniGame: 'ratio_mix', input: { mineralPigment: 2 }, output: 'pigmentRefined', yield: 1, laborCost: 1 },
  { id: 'pick-tea', name: '采茶制茶', blurb: '采青杀青制成茶。', miniGame: 'timing_hold', input: { teaLeaf: 2 }, output: 'tea', yield: 1, laborCost: 1 },
  { id: 'split-bamboo', name: '刮青剖篾', blurb: '选竹刮青剖成细篾。', miniGame: 'drag_path', input: { bambooRaw: 2 }, output: 'bambooSplit', yield: 1, laborCost: 1 },
];

/** 产业索引：id -> IndustryDef */
export const INDUSTRY_INDEX: Record<string, IndustryDef> = Object.fromEntries(
  INDUSTRIES.map((i) => [i.id, i]),
);
