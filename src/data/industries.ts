/**
 * 基础产业目录 —— 手艺的上游，把「原矿/天然物」加工成「半成品/材料」。
 * 详见 doc/项目规划.md §18。每条产业对应一个微交互小游戏（MiniGameType）。
 * 新增产业 = 在此追加一个 IndustryDef。静态数据层，尚未接入 reducer。
 */
import type { IndustryDef } from '../engine/types';

export const INDUSTRIES: IndustryDef[] = [
  // —— 一层 · 采集（仅耗工时，从本地特产采出原料；input 为空，由 localResources 授权）——
  { id: 'harvest-cocoon', name: '采桑养蚕', blurb: '采桑育蚕，收得蚕茧。', miniGame: 'repeat_endure', input: {}, output: 'cocoonSilk', yield: 2, laborCost: 1 },
  { id: 'harvest-iron-ore', name: '开采铁矿', blurb: '入山凿取铁矿石。', miniGame: 'rhythm', input: {}, output: 'ironOre', yield: 2, laborCost: 1 },
  { id: 'harvest-copper-ore', name: '开采铜矿', blurb: '凿取铜矿石。', miniGame: 'rhythm', input: {}, output: 'copperOre', yield: 2, laborCost: 1 },
  { id: 'harvest-silver-ore', name: '开采银矿', blurb: '采掘含银矿石。', miniGame: 'rhythm', input: {}, output: 'silverOre', yield: 2, laborCost: 1 },
  { id: 'harvest-coal', name: '挖煤', blurb: '掘取煤炭作燃料。', miniGame: 'rhythm', input: {}, output: 'coal', yield: 2, laborCost: 1 },
  { id: 'harvest-kaolin', name: '采高岭土', blurb: '采掘瓷石高岭。', miniGame: 'drag_path', input: {}, output: 'kaolin', yield: 2, laborCost: 1 },
  { id: 'harvest-tea-leaf', name: '采茶青', blurb: '上山采摘鲜茶叶。', miniGame: 'drag_path', input: {}, output: 'teaLeaf', yield: 2, laborCost: 1 },
  { id: 'harvest-indigo', name: '割靛草', blurb: '收割蓝靛草。', miniGame: 'drag_path', input: {}, output: 'indigoPlant', yield: 2, laborCost: 1 },
  { id: 'harvest-bamboo', name: '伐竹', blurb: '砍取毛竹原料。', miniGame: 'drag_path', input: {}, output: 'bambooRaw', yield: 2, laborCost: 1 },
  { id: 'harvest-lacquer', name: '割生漆', blurb: '割取漆树生漆。', miniGame: 'timing_hold', input: {}, output: 'rawLacquer', yield: 2, laborCost: 1 },
  { id: 'harvest-pine-soot', name: '烧松取烟', blurb: '燃松枝收松烟，制墨之本。', miniGame: 'timing_hold', input: {}, output: 'pineSoot', yield: 2, laborCost: 1 },
  { id: 'harvest-qingtan', name: '剥青檀皮', blurb: '剥取青檀树皮，捞纸的纤维原料。', miniGame: 'drag_path', input: {}, output: 'qingtanBark', yield: 2, laborCost: 1 },
  { id: 'harvest-pigment', name: '采矿物颜料', blurb: '采凿矿石以备研磨成颜料。', miniGame: 'rhythm', input: {}, output: 'mineralPigment', yield: 2, laborCost: 1 },

  // —— 二层 · 精炼（原料 → 半成品/材料）——
  { id: 'smelt-iron', name: '冶铁', blurb: '铁矿入炉，控火出铁锭。', miniGame: 'timing_hold', input: { ironOre: 2, coal: 1 }, output: 'ironIngot', yield: 1, laborCost: 2 },
  { id: 'smelt-copper', name: '炼铜', blurb: '铜矿熔炼成铜料。', miniGame: 'timing_hold', input: { copperOre: 2, coal: 1 }, output: 'copperStock', yield: 1, laborCost: 2 },
  { id: 'refine-silver', name: '提银', blurb: '银矿提炼成银料。', miniGame: 'timing_hold', input: { silverOre: 2 }, output: 'silverStock', yield: 1, laborCost: 2 },
  { id: 'mine-kaolin', name: '淘练瓷土', blurb: '高岭淘洗练成瓷土。', miniGame: 'ratio_mix', input: { kaolin: 2 }, output: 'porcelainClay', yield: 1, laborCost: 1 },
  { id: 'sericulture', name: '缫丝', blurb: '蚕茧缫成生丝。', miniGame: 'repeat_endure', input: { cocoonSilk: 2 }, output: 'rawSilkThread', yield: 1, laborCost: 1 },
  { id: 'build-indigo', name: '建靛养缸', blurb: '靛草发酵成活性染液。', miniGame: 'ratio_mix', input: { indigoPlant: 2 }, output: 'indigoVat', yield: 1, laborCost: 1 },
  { id: 'tap-lacquer', name: '精制漆料', blurb: '生漆滤晒成可用漆料。', miniGame: 'timing_hold', input: { rawLacquer: 2 }, output: 'lacquerRefined', yield: 1, laborCost: 1 },
  { id: 'make-paper', name: '捞纸', blurb: '青檀皮/竹料捞造成纸。', miniGame: 'repeat_endure', input: { qingtanBark: 2 }, output: 'paperSheet', yield: 1, laborCost: 1 },
  { id: 'make-ink', name: '制墨', blurb: '松烟和胶捶制成墨锭。', miniGame: 'rhythm', input: { pineSoot: 2 }, output: 'inkStick', yield: 1, laborCost: 1 },
  { id: 'grind-pigment', name: '研磨颜料', blurb: '矿石研漂成颜料。', miniGame: 'ratio_mix', input: { mineralPigment: 2 }, output: 'pigmentRefined', yield: 1, laborCost: 1 },
  { id: 'pick-tea', name: '炒青制茶', blurb: '鲜叶杀青制成茶。', miniGame: 'timing_hold', input: { teaLeaf: 2 }, output: 'tea', yield: 1, laborCost: 1 },
  { id: 'split-bamboo', name: '刮青剖篾', blurb: '选竹刮青剖成细篾。', miniGame: 'drag_path', input: { bambooRaw: 2 }, output: 'bambooSplit', yield: 1, laborCost: 1 },

  // —— 三层 · 制作（材料 → 成品，多为跨区供应链的终点）——
  { id: 'weave-brocade', name: '织锦', blurb: '生丝染色织成华美锦缎。', miniGame: 'drag_path', input: { rawSilkThread: 2 }, output: 'brocade', yield: 1, laborCost: 2 },
  { id: 'forge-sword', name: '锻剑', blurb: '铁锭反复折叠锻打成名剑。', miniGame: 'rhythm', input: { ironIngot: 2 }, output: 'treasureSword', yield: 1, laborCost: 2 },
  { id: 'cast-cloisonne', name: '掐丝珐琅', blurb: '铜胎掐丝点蓝烧成景泰蓝。', miniGame: 'aim_place', input: { copperStock: 1, pigmentRefined: 1 }, output: 'cloisonne', yield: 1, laborCost: 2 },
];

/** 产业索引：id -> IndustryDef */
export const INDUSTRY_INDEX: Record<string, IndustryDef> = Object.fromEntries(
  INDUSTRIES.map((i) => [i.id, i]),
);
