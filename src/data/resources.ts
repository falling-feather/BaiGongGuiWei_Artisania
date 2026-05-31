/**
 * 资源目录 —— 供应链的「物料词典」。
 * 三层：raw 原矿/天然物 → material 半成品/可运输材料 → product 成品。
 * 详见 doc/项目规划.md §18。新增资源 = 在此追加一个 ResourceDef，无需改引擎。
 *
 * 注意：本文件为「世界主干」静态数据，尚未接入 reducer 结算逻辑；
 *       现有 M0 经济仍使用 crafts.ts 内的旧资源键（plantDye/water/cloth/bamboo…）。
 */
import type { ResourceDef } from '../engine/types';

export const RESOURCES: ResourceDef[] = [
  // ── 原矿 / 天然物（raw）：靠基础产业在产地采集 ──
  { id: 'ironOre', name: '铁矿', tier: 'raw', blurb: '可冶炼成铁锭的矿石。' },
  { id: 'copperOre', name: '铜矿', tier: 'raw', blurb: '可炼成铜料的矿石。' },
  { id: 'silverOre', name: '银矿', tier: 'raw', blurb: '可提炼银料的矿石。' },
  { id: 'goldOre', name: '金砂', tier: 'raw', blurb: '高原与戈壁中淘取的金。' },
  { id: 'kaolin', name: '高岭土', tier: 'raw', blurb: '制瓷之本，淘洗后成瓷土。' },
  { id: 'cocoonSilk', name: '蚕丝', tier: 'raw', blurb: '桑蚕吐丝，织造的源头。' },
  { id: 'ramie', name: '苎麻', tier: 'raw', blurb: '织夏布的麻纤维。' },
  { id: 'kapok', name: '木棉', tier: 'raw', blurb: '黎锦纺纱的原料。' },
  { id: 'bambooRaw', name: '竹', tier: 'raw', blurb: '编织与造纸的山林之材。' },
  { id: 'timber', name: '木材', tier: 'raw', blurb: '木作与家具的用料。' },
  { id: 'rawLacquer', name: '生漆', tier: 'raw', blurb: '割自漆树的天然大漆。' },
  { id: 'indigoPlant', name: '靛蓝草', tier: 'raw', blurb: '蓝染的植物染料来源。' },
  { id: 'brineSalt', name: '盐（卤/海）', tier: 'raw', blurb: '井盐或海盐，民生与酿造之需。' },
  { id: 'teaLeaf', name: '茶青', tier: 'raw', blurb: '新采茶叶，制茶的原料。' },
  { id: 'jadeRough', name: '玉石', tier: 'raw', blurb: '和田与各地玉料。' },
  { id: 'duanStone', name: '端石', tier: 'raw', blurb: '制端砚的名石。' },
  { id: 'sheStone', name: '歙石', tier: 'raw', blurb: '制歙砚的名石。' },
  { id: 'shoushanStone', name: '寿山石', tier: 'raw', blurb: '雕印钮的名石。' },
  { id: 'coal', name: '煤', tier: 'raw', blurb: '冶炼与烧窑的燃料。' },
  { id: 'mineralPigment', name: '矿物颜料', tier: 'raw', blurb: '研磨矿石而得，唐卡与彩绘用。' },
  { id: 'oxhide', name: '牛皮', tier: 'raw', blurb: '皮影雕镂的载体。' },
  { id: 'birchBark', name: '桦皮', tier: 'raw', blurb: '关东桦皮工艺的原料。' },
  { id: 'aquilaria', name: '沉香', tier: 'raw', blurb: '海岛香料，制香与药用。' },
  { id: 'pineSoot', name: '松烟', tier: 'raw', blurb: '烧松取烟，制墨之本。' },
  { id: 'qingtanBark', name: '青檀皮', tier: 'raw', blurb: '宣纸捞造的纤维原料。' },

  // ── 半成品 / 材料（material）：可跨区运输与交易 ──
  { id: 'ironIngot', name: '铁锭', tier: 'material', blurb: '冶铁所得，可锻打成器。', refinedFrom: ['ironOre', 'coal'] },
  { id: 'copperStock', name: '铜料', tier: 'material', blurb: '炼铜所得，景泰蓝与铜器之料。', refinedFrom: ['copperOre', 'coal'] },
  { id: 'silverStock', name: '银料', tier: 'material', blurb: '提炼所得，银饰锻制之料。', refinedFrom: ['silverOre'] },
  { id: 'porcelainClay', name: '瓷土', tier: 'material', blurb: '淘洗炼制的制瓷泥料。', refinedFrom: ['kaolin'] },
  { id: 'rawSilkThread', name: '生丝', tier: 'material', blurb: '罫丝所得，染线织造之料。', refinedFrom: ['cocoonSilk'] },
  { id: 'dyedThread', name: '染线', tier: 'material', blurb: '染色后的丝线，织锦绣品所需。', refinedFrom: ['rawSilkThread', 'indigoVat'] },
  { id: 'indigoVat', name: '靛染液', tier: 'material', blurb: '建缸养出的活性蓝靛染液。', refinedFrom: ['indigoPlant'] },
  { id: 'lacquerRefined', name: '漆料', tier: 'material', blurb: '精制大漆，可层层髹涂。', refinedFrom: ['rawLacquer'] },
  { id: 'paperSheet', name: '纸', tier: 'material', blurb: '捞造而成的手工纸。', refinedFrom: ['qingtanBark', 'bambooRaw'] },
  { id: 'inkStick', name: '墨锭', tier: 'material', blurb: '松烟与胶捶制的墨。', refinedFrom: ['pineSoot'] },
  { id: 'pigmentRefined', name: '颜料', tier: 'material', blurb: '研漂后的可用颜料。', refinedFrom: ['mineralPigment'] },
  { id: 'tea', name: '茶', tier: 'material', blurb: '制成的成品茶，可饮可贸。', refinedFrom: ['teaLeaf'] },
  { id: 'bambooSplit', name: '竹篾', tier: 'material', blurb: '刮青剖丝后的细篾，编织所需。', refinedFrom: ['bambooRaw'] },

  // ── 成品（product）：订单交付 / 展览 / 馈赠 ──
  { id: 'celadonWare', name: '青瓷', tier: 'product', blurb: '龙泉窑温润如玉的青瓷。', refinedFrom: ['porcelainClay'] },
  { id: 'treasureSword', name: '宝剑', tier: 'product', blurb: '龙泉锻制的名剑。', refinedFrom: ['ironIngot'] },
  { id: 'silverOrnament', name: '银饰', tier: 'product', blurb: '苗家錾打的银饰盛装。', refinedFrom: ['silverStock'] },
  { id: 'cloisonne', name: '景泰蓝', tier: 'product', blurb: '铜胎掐丝点蓝的珐琅重器。', refinedFrom: ['copperStock', 'pigmentRefined'] },
  { id: 'indigoCloth', name: '蓝染布', tier: 'product', blurb: '扎染浸染而成的蓝白之布。', refinedFrom: ['indigoVat'] },
  { id: 'bambooWare', name: '竹编器', tier: 'product', blurb: '经纬编织的竹编精品。', refinedFrom: ['bambooSplit'] },
  { id: 'brocade', name: '织锦', tier: 'product', blurb: '云锦蜀锦等提花织物。', refinedFrom: ['dyedThread'] },
  { id: 'thangka', name: '唐卡', tier: 'product', blurb: '矿物颜料绘就的藏传卷轴画。', refinedFrom: ['pigmentRefined', 'paperSheet'] },
];

/** 资源索引：id -> ResourceDef */
export const RESOURCE_INDEX: Record<string, ResourceDef> = Object.fromEntries(
  RESOURCES.map((r) => [r.id, r]),
);
