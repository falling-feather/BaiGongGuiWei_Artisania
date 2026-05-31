/**
 * 手艺数据 —— 数据驱动内容的核心。
 * 新增手艺 = 在此追加一个 Craft 对象，无需改动 engine 逻辑。
 * 内置详尽示范：蓝染、竹编（含丰富工序与省略影响）。
 * 其余各地区招牌非遗工艺经 sigCraft(...) 批量补齐（V0.8.0），统一三段工序，
 * 与 regions.ts 的 signatureCrafts id 一一对应，加入即上地图并自动呈现为整页网页。
 */
import type { Craft } from '../engine/types';

/**
 * 招牌工艺工厂：生成「备料选材(可省略) → 核心工序A → 核心工序B」三段工序的手艺。
 * - mat / mat2：核心工序消耗的（可由产业获得的）材料；
 * - rawMat：尚无产业产出的天然原料，放在「可省略」备料步，保证手艺始终可跑。
 */
function sigCraft(o: {
  id: string;
  name: string;
  region: string;
  blurb: string;
  output: string;
  mat?: string;
  mat2?: string;
  rawMat?: string;
  core1: string;
  core1desc: string;
  core2: string;
  core2desc: string;
  prepDesc: string;
  base?: Partial<{ heritage: number; market: number; life: number; spirit: number }>;
  tags: string[];
  risks: string[];
}): Craft {
  const coreCost: Record<string, number> = {};
  if (o.mat) coreCost[o.mat] = 1;
  if (o.mat2) coreCost[o.mat2] = 1;
  const prepCost: Record<string, number> = o.rawMat ? { [o.rawMat]: 1 } : {};
  const deps = o.rawMat ? [o.rawMat] : o.mat ? [o.mat, ...(o.mat2 ? [o.mat2] : [])] : [];
  return {
    id: o.id,
    name: o.name,
    region: o.region,
    blurb: o.blurb,
    resources: deps,
    synergyTags: o.tags,
    risks: o.risks,
    baseMetrics: {
      heritage: o.base?.heritage ?? 62,
      market: o.base?.market ?? 35,
      life: o.base?.life ?? 50,
      spirit: o.base?.spirit ?? 55,
    },
    outputResourceId: o.output,
    processChain: [
      {
        id: `${o.id}-prep`,
        name: '备料选材',
        description: o.prepDesc,
        resourceCost: prepCost,
        laborCost: 1,
        metricImpact: { heritage: 1, life: 1 },
        skippable: true,
        skipImpact: { market: 3, heritage: -3 },
      },
      {
        id: `${o.id}-a`,
        name: o.core1,
        description: o.core1desc,
        resourceCost: coreCost,
        laborCost: 2,
        metricImpact: { heritage: 3, spirit: 1 },
        skippable: false,
      },
      {
        id: `${o.id}-b`,
        name: o.core2,
        description: o.core2desc,
        resourceCost: {},
        laborCost: 2,
        metricImpact: { heritage: 2, market: 1, life: 1 },
        skippable: false,
      },
    ],
  };
}

/** 各地区招牌非遗工艺（与 regions.ts signatureCrafts 对应；蓝染/竹编已在下方详尽定义） */
const SIGNATURE_CRAFTS: Craft[] = [
  // —— 江南 ——
  sigCraft({ id: 'celadon', name: '龙泉青瓷', region: '江南 / 龙泉', blurb: '温润如玉、青翠含蓄的青瓷。', output: 'celadonWare', mat: 'porcelainClay', core1: '拉坯成形', core1desc: '瓷土拉坯修整成器形。', core2: '施釉入窑', core2desc: '上青釉入窑，火候定成色。', prepDesc: '淘选瓷土，定下器形。', base: { heritage: 70, market: 40 }, tags: ['ceramic', 'tableware'], risks: ['釉料配方失传', '工业瓷冲击'] }),
  sigCraft({ id: 'longquan-sword', name: '龙泉宝剑', region: '江南 / 龙泉', blurb: '折叠锻打、刚柔并济的名剑。', output: 'treasureSword', mat: 'ironIngot', core1: '折叠锻打', core1desc: '铁锭反复折叠锤锻。', core2: '淬火开刃', core2desc: '淬火研磨，开锋见光。', prepDesc: '选铁备炭，定剑形。', base: { heritage: 68, market: 42, spirit: 58 }, tags: ['metal', 'weapon'], risks: ['管制与市场窄', '机制刀剑替代'] }),
  sigCraft({ id: 'kesi', name: '缂丝', region: '江南 / 苏州', blurb: '通经断纬、雕琢如刻的丝织。', output: 'kesiSilk', mat: 'rawSilkThread', core1: '通经断纬', core1desc: '以梭代笔，挖织花纹。', core2: '修绒理面', core2desc: '修剪绒头，理平织面。', prepDesc: '理丝牵经，配色定样。', base: { heritage: 72, market: 36 }, tags: ['textile', 'art'], risks: ['工序极繁、传人稀少'] }),
  sigCraft({ id: 'oilpaper-umbrella', name: '油纸伞', region: '江南 / 余杭', blurb: '竹骨糊纸、刷桐油的雨具。', output: 'oilpaperUmbrella', mat: 'bambooSplit', mat2: 'paperSheet', core1: '制骨糊面', core1desc: '削制伞骨，糊裱伞面。', core2: '刷油绷伞', core2desc: '刷桐油晾干，绷紧成伞。', prepDesc: '选竹裁纸，备桐油。', base: { heritage: 60, market: 38, life: 56 }, tags: ['bamboo', 'paper', 'daily'], risks: ['钢架伞替代'] }),

  // —— 巴蜀 ——
  sigCraft({ id: 'shu-brocade', name: '蜀锦', region: '巴蜀 / 成都', blurb: '色彩明丽、织纹精致的提花锦。', output: 'brocade', mat: 'rawSilkThread', core1: '挑花织造', core1desc: '依花本挑织成锦。', core2: '整经修边', core2desc: '整经收边，理平锦面。', prepDesc: '染丝牵经，配花本。', base: { heritage: 70, market: 40 }, tags: ['textile', 'brocade'], risks: ['花本与织机传承难'] }),
  sigCraft({ id: 'shu-embroidery', name: '蜀绣', region: '巴蜀 / 成都', blurb: '针法严谨、片线光亮的川绣。', output: 'shuEmbroidery', mat: 'rawSilkThread', core1: '配线施针', core1desc: '分线劈丝，依稿施针。', core2: '片线光面', core2desc: '理顺片线，使绣面光亮。', prepDesc: '上绷描稿，配丝线。', base: { heritage: 66, market: 38 }, tags: ['textile', 'embroidery'], risks: ['绣工青黄不接'] }),
  sigCraft({ id: 'qingshen-bamboo', name: '青神竹编', region: '巴蜀 / 青神', blurb: '细如发丝的青神竹丝编。', output: 'qingshenBamboo', mat: 'bambooSplit', core1: '起底编织', core1desc: '起底布丝，经纬交织。', core2: '收口修形', core2desc: '收口锁边，修整器形。', prepDesc: '刮青分丝，定编法。', base: { heritage: 64, market: 36, life: 54 }, tags: ['bamboo', 'weaving'], risks: ['塑料制品替代'] }),
  sigCraft({ id: 'chengdu-lacquer', name: '成都漆器', region: '巴蜀 / 成都', blurb: '雕银丝光、隐花填彩的蜀漆。', output: 'chengduLacquer', mat: 'lacquerRefined', core1: '髹漆晾干', core1desc: '层层髹漆，逐道阴干。', core2: '雕银填彩', core2desc: '雕花戗银，填彩研磨。', prepDesc: '制胎刮灰，备漆料。', base: { heritage: 66, market: 40 }, tags: ['lacquer', 'art'], risks: ['周期长、漆料贵'] }),

  // —— 岭南 ——
  sigCraft({ id: 'canton-embroidery', name: '粤绣', region: '岭南 / 广州', blurb: '构图繁密、色彩浓烈的广绣。', output: 'cantonEmbroidery', mat: 'rawSilkThread', core1: '铺绒钉线', core1desc: '铺绒钉线，层叠施色。', core2: '缀珠点金', core2desc: '缀珠片、勾金线点缀。', prepDesc: '上绷描稿，配彩丝。', base: { heritage: 64, market: 42 }, tags: ['textile', 'embroidery'], risks: ['机绣冲击'] }),
  sigCraft({ id: 'gambiered-silk', name: '香云纱', region: '岭南 / 顺德', blurb: '薯莨染、河泥涂的莨绸。', output: 'gambieredSilk', mat: 'rawSilkThread', core1: '薯莨浸染', core1desc: '薯莨汁反复浸染晒制。', core2: '河泥涂覆', core2desc: '过乌涂河泥，氧化成色。', prepDesc: '炼绸备薯莨。', base: { heritage: 68, market: 44 }, tags: ['textile', 'dye'], risks: ['日晒工艺受地候限'] }),
  sigCraft({ id: 'shiwan-pottery', name: '石湾陶', region: '岭南 / 佛山', blurb: '石湾公仔，胎厚釉浑的陶塑。', output: 'shiwanWare', mat: 'porcelainClay', core1: '塑形捏制', core1desc: '手捏塑形，传神写意。', core2: '施釉烧成', core2desc: '施厚釉入窑烧成。', prepDesc: '炼泥定题材。', base: { heritage: 62, market: 38 }, tags: ['ceramic', 'sculpture'], risks: ['题材老化'] }),
  sigCraft({ id: 'duan-inkstone', name: '端砚', region: '岭南 / 肇庆', blurb: '石质温润、发墨不损的名砚。', output: 'duanInkstone', rawMat: 'duanStone', core1: '相石开璞', core1desc: '相石定形，开璞去脏。', core2: '雕花磨堂', core2desc: '依石眼雕花，磨平砚堂。', prepDesc: '采端石，辨石品。', base: { heritage: 70, market: 40 }, tags: ['stone', 'stationery'], risks: ['名石禁采、原料稀缺'] }),
  sigCraft({ id: 'zhuang-brocade', name: '壮锦', region: '岭南 / 广西', blurb: '纹样饱满、色彩斑斓的壮族织锦。', output: 'zhuangBrocade', mat: 'rawSilkThread', core1: '通经挑纬', core1desc: '通经断纬，挑织几何纹。', core2: '整幅修边', core2desc: '整幅收边，理平锦面。', prepDesc: '染线牵经，配纹样。', base: { heritage: 64, market: 36 }, tags: ['textile', 'brocade'], risks: ['传承群体收缩'] }),

  // —— 黔滇 ——
  sigCraft({ id: 'miao-silver', name: '苗银', region: '黔滇 / 苗寨', blurb: '苗家錾打、满身银光的盛装银饰。', output: 'silverOrnament', mat: 'silverStock', core1: '熔银拉丝', core1desc: '熔银拉丝、压片备料。', core2: '錾花焊接', core2desc: '錾刻纹样，焊接成饰。', prepDesc: '备银料定款式。', base: { heritage: 68, market: 38 }, tags: ['metal', 'ornament'], risks: ['银价波动', '机制饰品替代'] }),
  sigCraft({ id: 'batik', name: '蜡染', region: '黔滇 / 丹寨', blurb: '蜡刀点画、冰纹天成的蜡染。', output: 'batikCloth', mat: 'indigoVat', core1: '蜡刀点画', core1desc: '以蜡刀蘸蜡点画花纹。', core2: '浸染脱蜡', core2desc: '靛缸浸染，沸水脱蜡显纹。', prepDesc: '备布熔蜡。', base: { heritage: 66, market: 36, life: 54 }, tags: ['textile', 'dye'], risks: ['天然靛料减少'] }),
  sigCraft({ id: 'jianshui-pottery', name: '建水紫陶', region: '黔滇 / 建水', blurb: '阴刻阳填、无釉磨光的紫陶。', output: 'jianshuiWare', mat: 'porcelainClay', core1: '拉坯刻填', core1desc: '拉坯成形，阴刻阳填。', core2: '无釉磨光', core2desc: '烧成后无釉打磨出光。', prepDesc: '淘泥定器形。', base: { heritage: 64, market: 38 }, tags: ['ceramic', 'tableware'], risks: ['工序繁、成品率低'] }),
  sigCraft({ id: 'wutong-silver', name: '乌铜走银', region: '黔滇 / 石屏', blurb: '乌铜地嵌银丝的滇中绝技。', output: 'wutongSilver', mat: 'copperStock', mat2: 'silverStock', core1: '乌铜起地', core1desc: '炼乌铜片，刻纹起地。', core2: '走银錾纹', core2desc: '嵌走银丝，捂黑显纹。', prepDesc: '备乌铜与银料。', base: { heritage: 70, market: 40 }, tags: ['metal', 'inlay'], risks: ['配方秘传、濒危'] }),

  // —— 荆楚 ——
  sigCraft({ id: 'chu-lacquer', name: '楚式漆器', region: '荆楚 / 荆州', blurb: '朱黑相映、瑰丽诡奇的楚漆。', output: 'chuLacquer', mat: 'lacquerRefined', core1: '木胎髹漆', core1desc: '斫木为胎，层层髹漆。', core2: '朱黑彩绘', core2desc: '朱黑描绘云气神兽。', prepDesc: '制胎备漆。', base: { heritage: 68, market: 38 }, tags: ['lacquer', 'art'], risks: ['古纹样研究断层'] }),
  sigCraft({ id: 'xiang-embroidery', name: '湘绣', region: '荆楚 / 长沙', blurb: '掺针施色、形神兼备的湘绣。', output: 'xiangEmbroidery', mat: 'rawSilkThread', core1: '掺针施色', core1desc: '掺针晕色，过渡自然。', core2: '鬅毛点睛', core2desc: '鬅毛针绣狮虎毛发点睛。', prepDesc: '上绷描稿配线。', base: { heritage: 66, market: 38 }, tags: ['textile', 'embroidery'], risks: ['名绣工稀缺'] }),
  sigCraft({ id: 'tujia-brocade', name: '土家织锦', region: '荆楚 / 湘西', blurb: '西兰卡普，斜纹彩织的土家锦。', output: 'tujiaBrocade', mat: 'rawSilkThread', core1: '斜织挑花', core1desc: '腰机斜织，反面挑花。', core2: '整经收边', core2desc: '整经收边，理平成幅。', prepDesc: '染线牵经定纹。', base: { heritage: 64, market: 34 }, tags: ['textile', 'brocade'], risks: ['年轻传人少'] }),

  // —— 赣鄱 ——
  sigCraft({ id: 'jingdezhen-porcelain', name: '景德镇瓷', region: '赣鄱 / 景德镇', blurb: '白如玉、明如镜的瓷都名瓷。', output: 'jingdezhenPorcelain', mat: 'porcelainClay', core1: '拉坯利坯', core1desc: '拉坯利坯，七十二序分工。', core2: '青花入窑', core2desc: '绘青花施釉，入窑烧成。', prepDesc: '淘练瓷土，定器型。', base: { heritage: 74, market: 44 }, tags: ['ceramic', 'art'], risks: ['分工链长、人才外流'] }),
  sigCraft({ id: 'xiabu', name: '夏布', region: '赣鄱 / 万载', blurb: '苎麻手织、轻薄透气的夏布。', output: 'xiabuCloth', rawMat: 'ramie', core1: '绩麻成线', core1desc: '手工绩麻接线成纱。', core2: '手织漂整', core2desc: '上机手织，漂洗整理。', prepDesc: '剥麻刮青备苎麻。', base: { heritage: 60, market: 32, life: 54 }, tags: ['textile', 'ramie'], risks: ['绩麻费工、传承难'] }),

  // —— 徽州 ——
  sigCraft({ id: 'xuan-paper', name: '宣纸', region: '徽州 / 泾县', blurb: '润墨千年、纸寿千年的书画名纸。', output: 'xuanPaper', mat: 'paperSheet', core1: '捞帘抄纸', core1desc: '荡帘入浆，抄造成纸。', core2: '焙墙烘晒', core2desc: '贴焙墙烘干，揭纸成张。', prepDesc: '备青檀皮浆料。', base: { heritage: 72, market: 38 }, tags: ['paper', 'stationery'], risks: ['原料与水源受限'] }),
  sigCraft({ id: 'hui-ink', name: '徽墨', region: '徽州 / 歙县', blurb: '丰肌腻理、落纸如漆的名墨。', output: 'huiInk', mat: 'inkStick', core1: '和胶捶打', core1desc: '松烟和胶，反复捶打。', core2: '入模描金', core2desc: '压模成锭，描金晾干。', prepDesc: '炼烟取胶备料。', base: { heritage: 70, market: 36 }, tags: ['ink', 'stationery'], risks: ['古法松烟稀缺'] }),
  sigCraft({ id: 'she-inkstone', name: '歙砚', region: '徽州 / 婺源', blurb: '罗纹眉子、涩不留笔的名砚。', output: 'sheInkstone', rawMat: 'sheStone', core1: '选石开砚', core1desc: '相石定形，开坯去脏。', core2: '雕纹磨池', core2desc: '依纹理雕饰，磨平砚池。', prepDesc: '采歙石辨纹理。', base: { heritage: 70, market: 38 }, tags: ['stone', 'stationery'], risks: ['名坑封采、原料紧'] }),
  sigCraft({ id: 'hui-carving', name: '徽州木雕', region: '徽州 / 黟县', blurb: '层叠透雕、繁而不乱的徽派三雕。', output: 'huiCarving', rawMat: 'timber', core1: '起稿粗雕', core1desc: '依梁枋起稿，粗雕轮廓。', core2: '透雕精修', core2desc: '层层透雕，精修打磨。', prepDesc: '选料烘干定题材。', base: { heritage: 68, market: 38 }, tags: ['wood', 'carving'], risks: ['老宅拆改、技艺流失'] }),

  // —— 京畿 ——
  sigCraft({ id: 'cloisonne', name: '景泰蓝', region: '京畿 / 北京', blurb: '铜胎掐丝点蓝的珐琅重器。', output: 'cloisonne', mat: 'copperStock', mat2: 'pigmentRefined', core1: '掐丝填蓝', core1desc: '铜胎掐丝，填施珐琅釉。', core2: '烧蓝磨光', core2desc: '反复烧蓝，磨光镀金。', prepDesc: '制铜胎备釉料。', base: { heritage: 74, market: 46 }, tags: ['metal', 'enamel', 'luxury'], risks: ['工序极繁、成本高'] }),
  sigCraft({ id: 'filigree', name: '花丝镶嵌', region: '京畿 / 北京', blurb: '细丝攒焊、宝石镶嵌的宫廷细金工。', output: 'filigreeOrnament', mat: 'silverStock', core1: '花丝攒焊', core1desc: '掐花丝、攒焊成形。', core2: '镶嵌宝石', core2desc: '錾活镶嵌宝石点翠。', prepDesc: '抽丝备料定纹样。', base: { heritage: 74, market: 48 }, tags: ['metal', 'ornament', 'luxury'], risks: ['工艺秘繁、传人少'] }),
  sigCraft({ id: 'carved-lacquer', name: '剔红雕漆', region: '京畿 / 北京', blurb: '层漆百道、剔刻成纹的雕漆。', output: 'carvedLacquer', mat: 'lacquerRefined', core1: '层漆百道', core1desc: '逐道髹漆，积厚成层。', core2: '剔刻成纹', core2desc: '于漆层剔刻花纹。', prepDesc: '制胎备漆。', base: { heritage: 72, market: 44 }, tags: ['lacquer', 'luxury'], risks: ['周期极长'] }),
  sigCraft({ id: 'inner-painting', name: '内画', region: '京畿 / 北京', blurb: '反笔于壶内壁作画的微画绝艺。', output: 'innerPainting', mat: 'pigmentRefined', core1: '内壁勾线', core1desc: '弯钩竹笔伸入壶内勾线。', core2: '反笔填彩', core2desc: '反向运笔，内壁填彩。', prepDesc: '磨内壁备颜料。', base: { heritage: 68, market: 42 }, tags: ['painting', 'art'], risks: ['眼力耗损、习者少'] }),

  // —— 三晋 ——
  sigCraft({ id: 'pingyao-lacquer', name: '平遥推光漆器', region: '三晋 / 平遥', blurb: '手掌推光、描金彩绘的晋中漆器。', output: 'pingyaoLacquer', mat: 'lacquerRefined', core1: '漆胎髹涂', core1desc: '木胎刮灰，层层髹漆。', core2: '推光描金', core2desc: '手掌推光，描金彩绘。', prepDesc: '制胎备漆。', base: { heritage: 66, market: 40 }, tags: ['lacquer', 'art'], risks: ['手推光费工'] }),
  sigCraft({ id: 'aged-vinegar', name: '山西老陈醋', region: '三晋 / 清徐', blurb: '夏伏晒、冬捞冰的山西陈醋。', output: 'agedVinegar', core1: '蒸料发酵', core1desc: '蒸料拌曲，缸中发酵熏醅。', core2: '夏晒冬捞', core2desc: '夏伏晒、冬捞冰，陈酿增香。', prepDesc: '备粮制曲。', base: { heritage: 58, market: 40, life: 58 }, tags: ['food', 'ferment'], risks: ['速酿工业醋冲击'] }),
  sigCraft({ id: 'jin-furniture', name: '晋作家具', region: '三晋 / 晋中', blurb: '用料厚重、雕工繁复的晋作硬木家具。', output: 'jinFurniture', rawMat: 'timber', core1: '选料开榫', core1desc: '选硬木开料，做榫卯。', core2: '雕饰打磨', core2desc: '雕饰花板，组装打磨。', prepDesc: '选料烘干。', base: { heritage: 64, market: 42 }, tags: ['wood', 'furniture'], risks: ['硬木原料紧'] }),

  // —— 雪域高原 ——
  sigCraft({ id: 'thangka', name: '唐卡', region: '雪域 / 拉萨', blurb: '矿物颜料绘就的藏传卷轴画。', output: 'thangka', mat: 'pigmentRefined', mat2: 'paperSheet', core1: '起稿描线', core1desc: '依度量经起稿描线。', core2: '矿彩晕染', core2desc: '矿物颜料层层晕染描金。', prepDesc: '绷布上胶备颜料。', base: { heritage: 74, market: 42, spirit: 60 }, tags: ['painting', 'religion', 'art'], risks: ['天然矿料稀缺、习画极久'] }),
  sigCraft({ id: 'tibetan-paper', name: '藏纸', region: '雪域 / 尼木', blurb: '狼毒草纤维抄造、防虫耐久的藏纸。', output: 'tibetanPaper', mat: 'bambooRaw', core1: '捶浆抄造', core1desc: '捶煮成浆，浇帘抄造。', core2: '阴干压平', core2desc: '阴干揭纸，压平成张。', prepDesc: '采狼毒根备料。', base: { heritage: 64, market: 32 }, tags: ['paper', 'stationery'], risks: ['原料毒性、工艺濒危'] }),
  sigCraft({ id: 'tibetan-silver', name: '藏银', region: '雪域 / 拉萨', blurb: '錾花镶松石的高原银饰。', output: 'tibetanSilver', mat: 'silverStock', core1: '锻银成形', core1desc: '锻打银片成形。', core2: '錾花嵌石', core2desc: '錾刻吉祥纹，镶嵌松石珊瑚。', prepDesc: '备银料与宝石。', base: { heritage: 66, market: 38 }, tags: ['metal', 'ornament'], risks: ['宝石原料贵'] }),
  sigCraft({ id: 'tibetan-incense', name: '藏香', region: '雪域 / 尼木', blurb: '藏药香料配伍、手搓成线的藏香。', output: 'tibetanIncense', rawMat: 'aquilaria', core1: '配药和泥', core1desc: '诸药研磨，和水成泥。', core2: '搓制阴干', core2desc: '手搓成线，阴干成香。', prepDesc: '采集香药配方。', base: { heritage: 62, market: 36, spirit: 60 }, tags: ['incense', 'religion'], risks: ['药材采集受限'] }),

  // —— 西域 ——
  sigCraft({ id: 'jade-carving', name: '玉雕', region: '西域 / 和田', blurb: '因材施艺、温润通灵的和田玉雕。', output: 'jadeCarving', rawMat: 'jadeRough', core1: '相玉开料', core1desc: '相玉辨绺，切割开料。', core2: '因材施艺', core2desc: '依料造型，琢磨抛光。', prepDesc: '采玉辨玉质。', base: { heritage: 72, market: 48 }, tags: ['stone', 'jade', 'luxury'], risks: ['名玉枯竭、价高'] }),
  sigCraft({ id: 'atlas-silk', name: '艾德莱斯绸', region: '西域 / 和田', blurb: '扎经染色、绚若云霞的西域丝绸。', output: 'atlasSilk', mat: 'rawSilkThread', core1: '扎经染色', core1desc: '扎经分段染色，成晕染纹。', core2: '织绸成匹', core2desc: '上机织造，成绸匹。', prepDesc: '缫丝牵经备染。', base: { heritage: 66, market: 40 }, tags: ['textile', 'dye'], risks: ['手工绸竞争弱'] }),
  sigCraft({ id: 'carpet', name: '地毯', region: '西域 / 喀什', blurb: '手工打结、纹样繁丽的西域地毯。', output: 'carpet', mat: 'rawSilkThread', core1: '栽绒打结', core1desc: '依图样逐结栽绒。', core2: '平剪修整', core2desc: '平剪绒面，修整成毯。', prepDesc: '染线备图样。', base: { heritage: 64, market: 42 }, tags: ['textile', 'home'], risks: ['机织毯冲击'] }),
  sigCraft({ id: 'copperware', name: '铜器', region: '西域 / 喀什', blurb: '錾刻镶嵌、巴扎闻名的西域铜器。', output: 'copperware', mat: 'copperStock', core1: '锤揲成器', core1desc: '锤揲铜片成器形。', core2: '錾刻镶嵌', core2desc: '錾刻花纹，嵌宝点饰。', prepDesc: '备铜料定器形。', base: { heritage: 62, market: 38, life: 54 }, tags: ['metal', 'home'], risks: ['手工铜器市场窄'] }),
];

export const CRAFTS: Craft[] = [
  {
    id: 'indigo-dyeing',
    name: '蓝染',
    region: '贵州 / 江南',
    blurb: '以植物蓝靛染布，扎结成纹，是流传千年的传统印染技艺。',
    resources: ['indigoVat'],
    synergyTags: ['textile', 'wearable', 'color'],
    risks: ['植物染料原料消失', '审美老化、被工业印染替代'],
    baseMetrics: { heritage: 70, market: 35, life: 45, spirit: 60 },
    outputResourceId: 'indigoCloth',
    processChain: [
      {
        id: 'harvest-indigo',
        name: '调靛试色',
        description: '取靛染液调色试染，定下色阶。',
        resourceCost: { indigoVat: 1 },
        laborCost: 2,
        metricImpact: { heritage: 2, spirit: 1 },
        skippable: true,
        skipImpact: { heritage: -6, market: 4, spirit: -3 },
      },
      {
        id: 'build-vat',
        name: '建缸养缸',
        description: '调配并养护染缸，靠经验把控发酵，决定染色成败。',
        resourceCost: { indigoVat: 1 },
        laborCost: 2,
        metricImpact: { heritage: 3, spirit: 2 },
        skippable: false,
      },
      {
        id: 'tie-resist',
        name: '扎结防染',
        description: '以线扎结布料形成花纹，手法千变万化。',
        resourceCost: {},
        laborCost: 1,
        metricImpact: { heritage: 1, life: 2 },
        skippable: true,
        skipImpact: { market: 3, heritage: -3 },
      },
      {
        id: 'dip-dye',
        name: '反复浸染',
        description: '多次浸染、氧化、晾晒，颜色由浅入深。',
        resourceCost: { indigoVat: 1 },
        laborCost: 2,
        metricImpact: { heritage: 2, market: 1, spirit: 1 },
        skippable: false,
      },
    ],
  },
  {
    id: 'bamboo-weaving',
    name: '竹编',
    region: '四川 / 浙江',
    blurb: '将竹材剖成篾丝，经纬交织成器，柔中带韧。',
    resources: ['bambooSplit'],
    synergyTags: ['weaving', 'home', 'lighting'],
    risks: ['市场小、学习周期长', '塑料制品替代'],
    baseMetrics: { heritage: 65, market: 40, life: 55, spirit: 50 },
    outputResourceId: 'bambooWare',
    processChain: [
      {
        id: 'select-bamboo',
        name: '选篾试手',
        description: '挑出粗细合宜的篾丝，定下编法。',
        resourceCost: { bambooSplit: 1 },
        laborCost: 1,
        metricImpact: { heritage: 1, life: 1 },
        skippable: true,
        skipImpact: { market: 3, heritage: -4 },
      },
      {
        id: 'split-strips',
        name: '理篾分丝',
        description: '将篾丝理顺分匀，最见功力。',
        resourceCost: { bambooSplit: 1 },
        laborCost: 2,
        metricImpact: { heritage: 3, spirit: 1 },
        skippable: false,
      },
      {
        id: 'weave',
        name: '经纬编织',
        description: '依图样编织成器，疏密有致。',
        resourceCost: { bambooSplit: 1 },
        laborCost: 2,
        metricImpact: { heritage: 2, market: 1, life: 2 },
        skippable: false,
      },
    ],
  },
  ...SIGNATURE_CRAFTS,
];

export const CRAFT_INDEX: Record<string, Craft> = Object.fromEntries(
  CRAFTS.map((craft) => [craft.id, craft]),
);
