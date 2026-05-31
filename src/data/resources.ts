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
  { id: 'celadonWare', name: '青瓷', tier: 'product', blurb: '龙泉窑温润如玉的青瓷。', refinedFrom: ['porcelainClay'], value: 32 },
  { id: 'treasureSword', name: '宝剑', tier: 'product', blurb: '龙泉锻制的名剑。', refinedFrom: ['ironIngot'], value: 36 },
  { id: 'silverOrnament', name: '银饰', tier: 'product', blurb: '苗家錾打的银饰盛装。', refinedFrom: ['silverStock'], value: 28 },
  { id: 'cloisonne', name: '景泰蓝', tier: 'product', blurb: '铜胎掐丝点蓝的珐琅重器。', refinedFrom: ['copperStock', 'pigmentRefined'], value: 40 },
  { id: 'indigoCloth', name: '蓝染布', tier: 'product', blurb: '扎染浸染而成的蓝白之布。', refinedFrom: ['indigoVat'], value: 20 },
  { id: 'bambooWare', name: '竹编器', tier: 'product', blurb: '经纬编织的竹编精品。', refinedFrom: ['bambooSplit'], value: 18 },
  { id: 'brocade', name: '织锦', tier: 'product', blurb: '云锦蜀锦等提花织物。', refinedFrom: ['dyedThread'], value: 34 },
  { id: 'thangka', name: '唐卡', tier: 'product', blurb: '矿物颜料绘就的藏传卷轴画。', refinedFrom: ['pigmentRefined', 'paperSheet'], value: 38 },

  // ── 成品（product）· 各地区招牌非遗工艺产出（V0.8.0 全量补齐） ──
  { id: 'kesiSilk', name: '缂丝', tier: 'product', blurb: '通经断纬、雕琢如刻的丝织珍品。', refinedFrom: ['rawSilkThread'], value: 36 },
  { id: 'oilpaperUmbrella', name: '油纸伞', tier: 'product', blurb: '竹骨糊纸刷桐油的传统雨具。', refinedFrom: ['bambooSplit', 'paperSheet'], value: 22 },
  { id: 'shuEmbroidery', name: '蜀绣', tier: 'product', blurb: '针法严谨、片线光亮的川绣。', refinedFrom: ['rawSilkThread'], value: 30 },
  { id: 'qingshenBamboo', name: '青神竹编', tier: 'product', blurb: '细如发丝的青神竹丝编。', refinedFrom: ['bambooSplit'], value: 20 },
  { id: 'chengduLacquer', name: '成都漆器', tier: 'product', blurb: '雕银丝光、隐花填彩的蜀中漆器。', refinedFrom: ['lacquerRefined'], value: 30 },
  { id: 'cantonEmbroidery', name: '粤绣', tier: 'product', blurb: '构图繁密、色彩浓烈的广绣。', refinedFrom: ['rawSilkThread'], value: 30 },
  { id: 'gambieredSilk', name: '香云纱', tier: 'product', blurb: '薯莨染、河泥涂的莨绸。', refinedFrom: ['rawSilkThread'], value: 34 },
  { id: 'shiwanWare', name: '石湾陶', tier: 'product', blurb: '石湾公仔，胎厚釉浑的陶塑。', refinedFrom: ['porcelainClay'], value: 24 },
  { id: 'duanInkstone', name: '端砚', tier: 'product', blurb: '石质温润、发墨不损的名砚。', refinedFrom: ['duanStone'], value: 34 },
  { id: 'zhuangBrocade', name: '壮锦', tier: 'product', blurb: '纹样饱满、色彩斑斓的壮族织锦。', refinedFrom: ['rawSilkThread'], value: 28 },
  { id: 'batikCloth', name: '蜡染布', tier: 'product', blurb: '蜡刀点画、冰纹天成的蜡染。', refinedFrom: ['indigoVat'], value: 22 },
  { id: 'jianshuiWare', name: '建水紫陶', tier: 'product', blurb: '阴刻阳填、无釉磨光的紫陶。', refinedFrom: ['porcelainClay'], value: 26 },
  { id: 'wutongSilver', name: '乌铜走银', tier: 'product', blurb: '乌铜地嵌银丝的滇中绝技。', refinedFrom: ['copperStock', 'silverStock'], value: 34 },
  { id: 'chuLacquer', name: '楚式漆器', tier: 'product', blurb: '朱黑相映、瑰丽诡奇的楚漆。', refinedFrom: ['lacquerRefined'], value: 30 },
  { id: 'xiangEmbroidery', name: '湘绣', tier: 'product', blurb: '掺针施色、形神兼备的湘绣。', refinedFrom: ['rawSilkThread'], value: 30 },
  { id: 'tujiaBrocade', name: '土家织锦', tier: 'product', blurb: '西兰卡普，斜纹彩织的土家锦。', refinedFrom: ['rawSilkThread'], value: 26 },
  { id: 'jingdezhenPorcelain', name: '景德镇瓷', tier: 'product', blurb: '白如玉、明如镜的青花瓷都名瓷。', refinedFrom: ['porcelainClay'], value: 38 },
  { id: 'xiabuCloth', name: '夏布', tier: 'product', blurb: '苎麻手织、轻薄透气的夏布。', refinedFrom: ['ramie'], value: 20 },
  { id: 'xuanPaper', name: '宣纸', tier: 'product', blurb: '润墨千年、纸寿千年的书画名纸。', refinedFrom: ['paperSheet'], value: 24 },
  { id: 'huiInk', name: '徽墨', tier: 'product', blurb: '丰肌腻理、落纸如漆的名墨。', refinedFrom: ['inkStick'], value: 28 },
  { id: 'sheInkstone', name: '歙砚', tier: 'product', blurb: '罗纹眉子、涩不留笔的名砚。', refinedFrom: ['sheStone'], value: 32 },
  { id: 'huiCarving', name: '徽州木雕', tier: 'product', blurb: '层叠透雕、繁而不乱的徽派三雕。', refinedFrom: ['timber'], value: 30 },
  { id: 'filigreeOrnament', name: '花丝镶嵌', tier: 'product', blurb: '细丝攒焊、宝石镶嵌的宫廷细金工。', refinedFrom: ['silverStock'], value: 40 },
  { id: 'carvedLacquer', name: '剔红雕漆', tier: 'product', blurb: '层漆百道、剔刻成纹的雕漆。', refinedFrom: ['lacquerRefined'], value: 38 },
  { id: 'innerPainting', name: '内画', tier: 'product', blurb: '反笔于壶内壁作画的微画绝艺。', refinedFrom: ['pigmentRefined'], value: 30 },
  { id: 'pingyaoLacquer', name: '平遥推光漆器', tier: 'product', blurb: '手掌推光、描金彩绘的晋中漆器。', refinedFrom: ['lacquerRefined'], value: 32 },
  { id: 'agedVinegar', name: '老陈醋', tier: 'product', blurb: '夏伏晒、冬捞冰的山西陈醋。', value: 16 },
  { id: 'jinFurniture', name: '晋作家具', tier: 'product', blurb: '用料厚重、雕工繁复的晋作硬木家具。', refinedFrom: ['timber'], value: 32 },
  { id: 'tibetanPaper', name: '藏纸', tier: 'product', blurb: '狼毒草纤维抄造、防虫耐久的藏纸。', refinedFrom: ['bambooRaw'], value: 22 },
  { id: 'tibetanSilver', name: '藏银', tier: 'product', blurb: '錾花镶松石的高原银饰。', refinedFrom: ['silverStock'], value: 30 },
  { id: 'tibetanIncense', name: '藏香', tier: 'product', blurb: '藏药香料配伍、手搓成线的藏香。', refinedFrom: ['aquilaria'], value: 24 },
  { id: 'jadeCarving', name: '玉雕', tier: 'product', blurb: '因材施艺、温润通灵的和田玉雕。', refinedFrom: ['jadeRough'], value: 40 },
  { id: 'atlasSilk', name: '艾德莱斯绸', tier: 'product', blurb: '扎经染色、绚若云霞的西域丝绸。', refinedFrom: ['rawSilkThread'], value: 28 },
  { id: 'carpet', name: '地毯', tier: 'product', blurb: '手工打结、纹样繁丽的西域地毯。', refinedFrom: ['rawSilkThread'], value: 30 },
  { id: 'copperware', name: '铜器', tier: 'product', blurb: '錾刻镶嵌、巴扎闻名的西域铜器。', refinedFrom: ['copperStock'], value: 26 },
];


/** 资源索引：id -> ResourceDef */
export const RESOURCE_INDEX: Record<string, ResourceDef> = Object.fromEntries(
  RESOURCES.map((r) => [r.id, r]),
);
