import type { ActivityDef, NpcDef, RegionContentSpec } from '../engine/types';

function act(
  id: string,
  regionId: string,
  subregionId: string,
  name: string,
  kind: ActivityDef['kind'],
  npcId: string | undefined,
  miniGames: ActivityDef['miniGames'],
  blurb: string,
  detail: string,
  reward: ActivityDef['reward'],
  laborCost = 1,
  resourceCost?: ActivityDef['resourceCost'],
): ActivityDef {
  return {
    id,
    regionId,
    subregionId,
    name,
    kind,
    npcId,
    miniGames,
    blurb,
    detail,
    laborCost,
    resourceCost,
    reward,
  };
}

function npc(
  id: string,
  name: string,
  regionId: string,
  subregionId: string,
  profession: string,
  anchorId: string,
  greetings: string[],
  knowledgeTags: string[] = [],
): NpcDef {
  return {
    id,
    name,
    role: 'vendor',
    regionId,
    subregionId,
    profession,
    personality: 'placeholder',
    knowledgeTags,
    anchorCraftId: anchorId,
    greetings,
  };
}

export const REGION_ACTIVITIES: ActivityDef[] = [
  act('jn-lanxi-orchid', 'jiangnan', 'jiangnan-jinling', '兰溪竹林', 'training', 'jn-ning-ciqiu', ['drag_path', 'couplet_choice'], '采兰、谈诗、赠花与题跋。', '你在竹影里采得一枝兰，又同宁辞秋拆了半首旧诗。', { resources: { tea: 1 }, attributes: { knowledge: 2, mind: 1 }, flags: ['met-ning-poetry'], descriptorTags: ['literati'] }),
  act('jn-qinhuai-lantern', 'jiangnan', 'jiangnan-jinling', '秦淮灯市', 'festival', 'jn-qiao-zhaoye', ['couplet_choice', 'aim_place'], '灯谜、灯彩订单与夜市摆摊。', '灯火沿水铺开，你帮乔照夜定下灯面与谜底。', { resources: { coin: 8 }, attributes: { people: 1, commerce: 1 }, metrics: { life: 1 }, flags: ['seen-qinhuai-lantern'], descriptorTags: ['festival-orders'] }),
  act('jn-cloud-brocade-office', 'jiangnan', 'jiangnan-taihu', '云锦局', 'workshop', 'jn-shen-yunsuo', ['rhythm', 'drag_path'], '织造、配色、织机联作。', '沈云梭让你跟着织机节律投梭，线路一顺，纹样便活了。', { resources: { rawSilkThread: 1 }, attributes: { craft: 1, knowledge: 1 }, descriptorTags: ['textile', 'brocade'] }, 1, { cocoonSilk: 1 }),
  act('jn-gold-leaf-shop', 'jiangnan', 'jiangnan-jinling', '金箔作', 'workshop', 'jn-gu-bojin', ['rhythm'], '锤金箔与宫造材料。', '顾薄金只许你试三锤，金叶薄得像一口气。', { resources: { coin: 6 }, attributes: { craft: 1, mind: 1 }, flags: ['learned-gold-leaf'], descriptorTags: ['metalwork'] }),
  act('jn-longquan-sword-forge', 'jiangnan', 'jiangnan-longquan', '龙泉剑炉', 'workshop', 'jn-lu-hanquan', ['rhythm', 'timing_hold', 'appraise_select'], '采矿、冶铁、锻剑链路样板。', '陆寒泉让你听铁声、看火色，记下“铁净而火不躁”四字。', { resources: { ironOre: 2 }, attributes: { craft: 2, stamina: 1 }, flags: ['longquan-sword-primer'], descriptorTags: ['metal', 'weapon'] }, 1),
  act('jn-celadon-kiln', 'jiangnan', 'jiangnan-longquan', '青瓷窑', 'workshop', 'jn-ye-qingzhan', ['drag_path', 'timing_hold'], '拉坯、施釉与开窑。', '叶青盏拨开窑灰，看釉色从青白里透出一点玉意。', { resources: { porcelainClay: 1 }, attributes: { craft: 1, mind: 1 }, descriptorTags: ['ceramic'] }, 1, { kaolin: 1 }),
  act('jn-lake-tea-house', 'jiangnan', 'jiangnan-linan', '湖畔茶肆', 'life', 'jn-su-xiaocha', ['timing_hold'], '烹茶、听闻与社交。', '茶汤起沫时，邻桌商人正谈起徽州纸谷的路价。', { resources: { tea: 1 }, attributes: { people: 1, knowledge: 1 }, flags: ['heard-huizhou-paper-route'], descriptorTags: ['daily'] }, 1, { teaLeaf: 1 }),
  act('jn-paper-umbrella-shop', 'jiangnan', 'jiangnan-linan', '油纸伞铺', 'workshop', 'jn-lin-yuqiao', ['aim_place', 'repeat_endure'], '制伞与雨季订单。', '林雨桥教你绷伞面，伞骨一齐，雨声也像有了格律。', { resources: { oilpaperUmbrella: 1 }, attributes: { craft: 1, commerce: 1 }, descriptorTags: ['bamboo', 'paper'] }, 2, { bambooSplit: 1, paperSheet: 1 }),
  act('jn-yard-fields', 'jiangnan', 'jiangnan-baigongyuan', '百工院田圃', 'life', 'jn-xiaoman', ['crop_calendar'], '种靛草、桑、茶的生活底盘。', '小满把三块田圃分给你，提醒你雨前要看苗色，晴时要记得浇水。', { attributes: { stamina: 1, knowledge: 1 }, flags: ['learned-yard-farming'], descriptorTags: ['farming'] }),

  act('bs-bamboo-sea', 'bashu', 'bashu-bamboo-sea', '青神竹海', 'resource', 'bs-luo-qingmie', ['drag_path', 'repeat_endure'], '伐竹、剖篾与竹编修习。', '罗青篾挑出一根顺直青竹，让你先学分丝。', { resources: { bambooRaw: 3 }, attributes: { craft: 1, stamina: 1 }, descriptorTags: ['bamboo'] }),
  act('bs-jinguan-loom', 'bashu', 'bashu-jinli', '锦官织楼', 'workshop', 'bs-zhuo-jinniang', ['rhythm', 'drag_path'], '蜀锦、配色与织机。', '卓锦娘验过线色，准你试一段小花本。', { resources: { brocade: 1 }, attributes: { craft: 2 }, descriptorTags: ['brocade'] }, 2, { rawSilkThread: 1 }),
  act('bs-linqiong-forge', 'bashu', 'bashu-linqiong-iron', '临邛铁炉', 'workshop', 'bs-deng-lusheng', ['timing_hold'], '冶铁与炼好铁锭。', '邓炉生盯着火口，让你在火色将白未白时出铁。', { resources: { ironIngot: 1 }, attributes: { craft: 1, stamina: 1 }, descriptorTags: ['metal'] }, 2, { ironOre: 2, coal: 1 }),
  act('bs-tea-horse-post', 'bashu', 'bashu-tea-horse', '茶马驿', 'route', 'bs-mabang-ayue', ['route_plan'], '护送、换茶与开路。', '马帮阿越把山路画在桌上，问你货轻还是路稳更要紧。', { resources: { tea: 2 }, attributes: { commerce: 1, stamina: 1 }, flags: ['heard-snow-pass'], descriptorTags: ['route', 'trade'] }),

  act('ln-pearl-river-harbor', 'lingnan', 'lingnan-harbor', '珠江货栈', 'trade', 'ln-wu-haichao', ['route_plan'], '外销订单与奇货交换。', '伍海潮验了样货，提醒你船期误不得。', { resources: { coin: 12 }, attributes: { commerce: 2 }, flags: ['lingnan-export-contact'], descriptorTags: ['trade'] }),
  act('ln-foshan-forge', 'lingnan', 'lingnan-forge', '佛山炉房', 'workshop', 'ln-liang-tiexian', ['timing_hold', 'rhythm'], '冶铸与铁器修造。', '梁铁线让你试修一件旧铁器，火要足，锤要稳。', { resources: { ironIngot: 1 }, attributes: { craft: 1, stamina: 1 }, descriptorTags: ['metal'] }, 2, { ironOre: 2 }),
  act('ln-gambiered-yard', 'lingnan', 'lingnan-gambiered-yard', '莨绸晒场', 'workshop', 'ln-he-yunsha', ['repeat_endure', 'timing_hold'], '薯莨浸染与河泥涂覆。', '日光正好，何云纱让你把绸反复摊晒。', { resources: { gambieredSilk: 1 }, attributes: { craft: 1, mind: 1 }, descriptorTags: ['textile', 'dye'] }, 2, { rawSilkThread: 1, indigoVat: 1 }),
  act('ln-duan-inkstone-pit', 'lingnan', 'lingnan-duan-stone', '端砚石坑', 'resource', 'ln-tan-yanbo', ['appraise_select', 'drag_path'], '相石与开砚。', '谭砚伯敲了三块端石，要你听哪块声音更润。', { resources: { duanStone: 2 }, attributes: { knowledge: 2 }, descriptorTags: ['stone', 'stationery'] }),

  act('qd-miao-silver-shop', 'qiandian', 'qiandian-miao-village', '苗寨银铺', 'workshop', 'qd-yinniang-alan', ['timing_hold', 'aim_place'], '熔银、拉丝与錾花。', '银娘阿岚先讲纹样来历，再许你动锤。', { resources: { silverOrnament: 1 }, attributes: { craft: 2, people: 1 }, descriptorTags: ['silver', 'ornament'] }, 2, { silverStock: 1 }),
  act('qd-batik-yard', 'qiandian', 'qiandian-miao-village', '蜡染院', 'workshop', 'qd-danqing-sao', ['drag_path', 'repeat_endure'], '蜡刀点画与浸染脱蜡。', '丹青嫂说冰纹不是错，是布自己开的花。', { resources: { batikCloth: 1 }, attributes: { craft: 1, knowledge: 1 }, descriptorTags: ['dye', 'textile'] }, 2, { indigoVat: 1 }),
  act('qd-dongchuan-mine', 'qiandian', 'qiandian-dongchuan-copper', '东川矿口', 'resource', 'qd-tongshan-ke', ['rhythm', 'timing_hold'], '采铜与炼铜。', '铜山客把矿灯递给你，矿脉深处声音发闷。', { resources: { copperOre: 3 }, attributes: { stamina: 1, knowledge: 1 }, descriptorTags: ['metal'] }),
  act('qd-tea-horse-road', 'qiandian', 'qiandian-tea-road', '茶马驿道', 'route', 'qd-mu-luozi', ['route_plan'], '驮运、换茶与开路。', '木骡子把铃挂到马鞍上，教你听路上的风。', { resources: { teaLeaf: 2 }, attributes: { commerce: 1, stamina: 1 }, flags: ['tea-horse-contact'], descriptorTags: ['route'] }),

  act('jc-ferry-market', 'jingchu', 'jingchu-lake-market', '渡口市集', 'trade', 'jc-qinglu', ['route_plan', 'timing_hold'], '水路运输与鱼获。', '船娘清芦借你一段水路，把芦荡里的风向讲清。', { resources: { coin: 8 }, attributes: { commerce: 1, people: 1 }, descriptorTags: ['route'] }),
  act('jc-daye-mine', 'jingchu', 'jingchu-mine-yard', '大冶矿场', 'resource', 'jc-yeshu', ['rhythm'], '铜铁采集与炉料。', '冶叔让你别贪矿脉，先挑成色最稳的一筐。', { resources: { copperOre: 2, ironOre: 2 }, attributes: { stamina: 1, knowledge: 1 }, descriptorTags: ['metal'] }),
  act('jc-chu-lacquer-yard', 'jingchu', 'jingchu-chu-lacquer', '楚漆坊', 'workshop', 'jc-xiong-zhuxi', ['repeat_endure', 'drag_path'], '髹漆与朱黑彩绘。', '熊朱漆把朱黑二色调开，云气纹在灯下像要游走。', { resources: { chuLacquer: 1 }, attributes: { craft: 1, mind: 1 }, descriptorTags: ['lacquer'] }, 2, { lacquerRefined: 1 }),
  act('jc-xiang-embroidery', 'jingchu', 'jingchu-xiang-embroidery', '湘绣楼', 'workshop', 'jc-wen-xiuniang', ['drag_path'], '掺针与鬅毛点睛。', '文绣娘说针脚就是性情，急不得。', { resources: { xiangEmbroidery: 1 }, attributes: { craft: 2 }, descriptorTags: ['embroidery'] }, 2, { rawSilkThread: 1 }),

  act('gp-kaolin-hill', 'ganpo', 'ganpo-kaolin-hill', '高岭矿丘', 'resource', 'gp-shi-bai', ['drag_path', 'ratio_mix'], '采瓷土与淘洗。', '石白捻开瓷土，教你看白度和砂心。', { resources: { kaolin: 3 }, attributes: { knowledge: 1, stamina: 1 }, descriptorTags: ['ceramic'] }),
  act('gp-throwing-room', 'ganpo', 'ganpo-kiln-town', '拉坯坊', 'workshop', 'gp-tang-pishou', ['drag_path'], '拉坯与利坯。', '唐坯手扶住你的手腕，坯体一稳，气也稳了。', { resources: { porcelainClay: 1 }, attributes: { craft: 1, mind: 1 }, descriptorTags: ['ceramic'] }, 1, { kaolin: 1 }),
  act('gp-dragon-kiln', 'ganpo', 'ganpo-kiln-town', '龙窑', 'workshop', 'gp-wen-yaotou', ['timing_hold'], '烧窑与开窑。', '窑头老温只看火舌，不看钟点。', { resources: { jingdezhenPorcelain: 1 }, attributes: { craft: 2 }, descriptorTags: ['ceramic'] }, 2, { porcelainClay: 1, coal: 1 }),
  act('gp-river-wood-yard', 'ganpo', 'ganpo-river-wood', '河运柴场', 'route', 'gp-chai-yazi', ['route_plan'], '运柴与议价。', '柴牙子把窑柴码成山，问你要赶窑期还是省路费。', { resources: { coal: 2, timber: 1 }, attributes: { commerce: 1 }, descriptorTags: ['route'] }),

  act('hz-paper-valley', 'huizhou', 'huizhou-paper-valley', '青檀纸谷', 'resource', 'hz-wang-zhiniang', ['drag_path', 'repeat_endure'], '剥青檀与捞纸。', '汪纸娘把帘子压入水面，纸浆在指缝间像云。', { resources: { qingtanBark: 3 }, attributes: { craft: 1, mind: 1 }, descriptorTags: ['paper'] }),
  act('hz-ink-workshop', 'huizhou', 'huizhou-ink-alley', '松烟墨坊', 'workshop', 'hz-cheng-moshou', ['timing_hold', 'rhythm'], '烧烟、和胶与捶墨。', '程墨守让你听墨锤落下的闷声，太急就散。', { resources: { inkStick: 1 }, attributes: { craft: 1, mind: 1 }, descriptorTags: ['ink'] }, 1, { pineSoot: 2 }),
  act('hz-she-stone-pit', 'huizhou', 'huizhou-she-stone', '歙石山坑', 'resource', 'hz-xu-yanshi', ['appraise_select'], '相石与开砚。', '许砚石不说答案，只让你把石声记在心里。', { resources: { sheStone: 2 }, attributes: { knowledge: 2 }, descriptorTags: ['stone'] }),
  act('hz-merchant-hall', 'huizhou', 'huizhou-merchant-hall', '徽商会馆', 'trade', 'hz-cheng-yuanzhou', ['route_plan'], '借贷、押货与远商。', '程远舟翻开账册，先看你的商誉，再谈路费。', { resources: { coin: 10 }, attributes: { commerce: 2 }, flags: ['huizhou-merchant-credit'], descriptorTags: ['trade'] }),

  act('jj-cloisonne-yard', 'jingji', 'jingji-palace-yard', '景泰蓝坊', 'workshop', 'jj-lan-daqi', ['aim_place', 'timing_hold'], '制胎、掐丝、点蓝、烧蓝。', '蓝大器只让你点一小格蓝釉，却要求丝线稳如界尺。', { resources: { cloisonne: 1 }, attributes: { craft: 2, commerce: 1 }, flags: ['palace-craft-seen'], descriptorTags: ['luxury', 'metal'] }, 2, { copperStock: 1, pigmentRefined: 1 }),
  act('jj-filigree-shop', 'jingji', 'jingji-palace-yard', '花丝作', 'workshop', 'jj-jin-suoniang', ['aim_place'], '拉丝、攒焊与镶嵌。', '金琐娘把银丝绕在指尖，细到像一缕月光。', { resources: { filigreeOrnament: 1 }, attributes: { craft: 2 }, descriptorTags: ['ornament'] }, 2, { silverStock: 1, copperStock: 1 }),
  act('jj-official-gate', 'jingji', 'jingji-official-gate', '官署门房', 'trade', 'jj-song-yasi', ['dialogue_check'], '采办许可与名声审查。', '宋押司不看你带多少货，先问这货是谁保的名。', { attributes: { people: 1, commerce: 1 }, flags: ['met-palace-clerk'], descriptorTags: ['trade'] }),
  act('jj-appraisal-market', 'jingji', 'jingji-market-gate', '都门市口', 'trade', 'jj-meng-zhangyan', ['appraise_select'], '鉴宝、估价与拍卖。', '孟掌眼把器物转了半圈，三句话里有两句是价。', { resources: { coin: 16 }, attributes: { commerce: 2, knowledge: 1 }, descriptorTags: ['trade'] }),

  act('sj-piaohao', 'sanjin', 'sanjin-piaohao', '日升票号', 'trade', 'sj-lei-zhanggui', ['route_plan'], '汇兑、借贷与押货。', '雷掌柜写下一张小票，告诉你信用也会磨损。', { resources: { coin: 12 }, attributes: { commerce: 2 }, flags: ['piaohao-credit'], descriptorTags: ['trade'] }),
  act('sj-coal-iron-yard', 'sanjin', 'sanjin-coal-yard', '煤铁窑塬', 'resource', 'sj-yaoyuan-han', ['rhythm', 'timing_hold'], '采煤与炼铁。', '窑塬汉把煤灰抹在炉边，火一旺，铁声就清了。', { resources: { coal: 3, ironOre: 2 }, attributes: { stamina: 1, knowledge: 1 }, descriptorTags: ['metal'] }),
  act('sj-pingyao-lacquer', 'sanjin', 'sanjin-lacquer-yard', '推光漆院', 'workshop', 'sj-pingyao-qipo', ['repeat_endure'], '推光与描金。', '平遥漆婆说掌温不能骗漆面。', { resources: { pingyaoLacquer: 1 }, attributes: { craft: 1, mind: 1 }, descriptorTags: ['lacquer'] }, 2, { lacquerRefined: 1 }),
  act('sj-vinegar-yard', 'sanjin', 'sanjin-vinegar-yard', '清徐醋坊', 'life', 'sj-cu-langzhong', ['timing_hold'], '发酵、晒醋与冬捞冰。', '醋郎中闻了闻缸口，说酸气要厚，不要冲。', { resources: { agedVinegar: 1 }, attributes: { knowledge: 1, mind: 1 }, descriptorTags: ['food'] }),

  act('xy-thangka-court', 'xueyu', 'xueyu-thangka-court', '唐卡画院', 'training', 'xy-losang', ['calligraphy_trace', 'ratio_mix'], '起稿、描线与矿彩。', '洛桑画师先讲度量经，再许你调一笔矿彩。', { resources: { thangka: 1 }, attributes: { craft: 1, mind: 2 }, flags: ['thangka-respect'], descriptorTags: ['painting', 'religion'] }, 2, { pigmentRefined: 1, paperSheet: 1 }),
  act('xy-pigment-valley', 'xueyu', 'xueyu-pigment-valley', '颜料矿谷', 'resource', 'xy-shicai-tong', ['rhythm', 'appraise_select'], '采矿物颜料。', '石彩童递来一块彩石，颜色沉得像雪下的火。', { resources: { mineralPigment: 3 }, attributes: { knowledge: 1, stamina: 1 }, descriptorTags: ['pigment'] }),
  act('xy-snow-pass', 'xueyu', 'xueyu-snow-pass', '雪山驿口', 'route', 'xy-yak-captain', ['route_plan'], '高寒行路与补给。', '牦牛队长把风口标在雪上，提醒你少带虚货。', { resources: { coin: 10 }, attributes: { stamina: 2, commerce: 1 }, flags: ['snow-pass-known'], descriptorTags: ['route'] }),
  act('xy-silver-tent', 'xueyu', 'xueyu-silver-tent', '银器帐房', 'workshop', 'xy-baiyinshu', ['rhythm', 'aim_place'], '锻银、錾花与镶石。', '白银叔把银片锻薄，纹路跟着经幡影子起伏。', { resources: { tibetanSilver: 1 }, attributes: { craft: 2 }, descriptorTags: ['silver'] }, 2, { silverStock: 1, copperStock: 1 }),

  act('xiyu-bazaar-trade', 'xiyu', 'xiyu-bazaar', '绿洲巴扎', 'trade', 'xu-sali', ['route_plan'], '换货、议价与稀有材料。', '胡商萨里笑着开价，话里三分货，七分路。', { resources: { jadeRough: 1 }, attributes: { commerce: 2, people: 1 }, flags: ['bazaar-contact'], descriptorTags: ['trade'] }, 1, { coin: 8 }),
  act('xiyu-jade-yard', 'xiyu', 'xiyu-jade-yard', '昆仑玉场', 'resource', 'xu-a-yue', ['appraise_select', 'drag_path'], '相玉、开料与雕琢。', '玉师阿月不让你先下刀，只让你顺着绺裂看半日。', { resources: { jadeRough: 2 }, attributes: { knowledge: 2 }, descriptorTags: ['jade'] }),
  act('xiyu-caravan-post', 'xiyu', 'xiyu-caravan-post', '驼队驿站', 'route', 'xu-tuoling-shu', ['route_plan'], '沙路、补给与护商。', '驼铃叔把水袋挂到驼背上，说沙路最忌侥幸。', { resources: { coin: 10 }, attributes: { stamina: 1, commerce: 1 }, flags: ['caravan-route-known'], descriptorTags: ['route'] }),
  act('xiyu-atlas-loom', 'xiyu', 'xiyu-atlas-loom', '艾德莱斯织坊', 'workshop', 'xu-guli', ['aim_place', 'rhythm'], '扎经染色与织绸。', '丝娘古丽把经线扎出云霞，颜色像在布上跳。', { resources: { atlasSilk: 1 }, attributes: { craft: 2 }, descriptorTags: ['textile'] }, 2, { rawSilkThread: 1, indigoVat: 1 }),
];

export const ACTIVITY_INDEX: Record<string, ActivityDef> = Object.fromEntries(
  REGION_ACTIVITIES.map((activity) => [activity.id, activity]),
);

export function activitiesForSubregion(regionId: string, subregionId: string): ActivityDef[] {
  return REGION_ACTIVITIES.filter(
    (activity) => activity.regionId === regionId && activity.subregionId === subregionId,
  );
}

export const REGION_CONTENT: RegionContentSpec[] = Array.from(
  new Set(REGION_ACTIVITIES.map((activity) => activity.regionId)),
).map((regionId) => ({
  regionId,
  routes: [],
  mainNpcIds: [
    ...new Set(REGION_ACTIVITIES.filter((activity) => activity.regionId === regionId).map((activity) => activity.npcId).filter(Boolean) as string[]),
  ],
  activityIds: REGION_ACTIVITIES.filter((activity) => activity.regionId === regionId).map((activity) => activity.id),
}));

export const PLACEHOLDER_NPCS: NpcDef[] = [
  npc('jn-lu-hanquan', '陆寒泉', 'jiangnan', 'jiangnan-longquan', '龙泉剑匠', 'jn-longquan-sword-forge', ['铁要有骨，人也要有。先听火，再动锤。'], ['sword', 'metal']),
  npc('jn-ye-qingzhan', '叶青盏', 'jiangnan', 'jiangnan-longquan', '青瓷窑师', 'jn-celadon-kiln', ['青色不是涂上去的，是火候自己养出来的。'], ['ceramic']),
  npc('jn-su-xiaocha', '苏小茶', 'jiangnan', 'jiangnan-linan', '湖畔茶师', 'jn-lake-tea-house', ['茶汤急了会涩，人心急了也一样。'], ['tea']),
  npc('jn-lin-yuqiao', '林雨桥', 'jiangnan', 'jiangnan-linan', '油纸伞师', 'jn-paper-umbrella-shop', ['伞骨齐，雨声才齐。'], ['umbrella', 'paper']),

  npc('bs-luo-qingmie', '罗青篾', 'bashu', 'bashu-bamboo-sea', '青神竹编师', 'bs-bamboo-sea', ['竹丝要顺着性子分，逆了就伤。'], ['bamboo']),
  npc('bs-zhuo-jinniang', '卓锦娘', 'bashu', 'bashu-jinli', '蜀锦织造师', 'bs-jinguan-loom', ['锦不只是亮，纹路要有章法。'], ['brocade']),
  npc('bs-deng-lusheng', '邓炉生', 'bashu', 'bashu-linqiong-iron', '临邛铁匠', 'bs-linqiong-forge', ['火色看错一寸，铁性就差一截。'], ['metal']),
  npc('bs-mabang-ayue', '马帮阿越', 'bashu', 'bashu-tea-horse', '茶马驿领路人', 'bs-tea-horse-post', ['山路认人，熟客也要敬它三分。'], ['route']),

  npc('ln-wu-haichao', '伍海潮', 'lingnan', 'lingnan-harbor', '海商', 'ln-pearl-river-harbor', ['船期不等人，货名也不等人。'], ['trade']),
  npc('ln-liang-tiexian', '梁铁线', 'lingnan', 'lingnan-forge', '佛山铁匠', 'ln-foshan-forge', ['铁线要韧，炉火要足。'], ['metal']),
  npc('ln-he-yunsha', '何云纱', 'lingnan', 'lingnan-gambiered-yard', '香云纱染整师', 'ln-gambiered-yard', ['晒场看天，染绸看耐心。'], ['textile']),
  npc('ln-tan-yanbo', '谭砚伯', 'lingnan', 'lingnan-duan-stone', '端砚师', 'ln-duan-inkstone-pit', ['石眼会说话，只是人常听不懂。'], ['stone']),

  npc('qd-yinniang-alan', '银娘阿岚', 'qiandian', 'qiandian-miao-village', '苗银匠', 'qd-miao-silver-shop', ['银饰先是礼，再是器。'], ['silver']),
  npc('qd-danqing-sao', '丹青嫂', 'qiandian', 'qiandian-miao-village', '蜡染师', 'qd-batik-yard', ['冰纹不是错，是布开的花。'], ['dye']),
  npc('qd-tongshan-ke', '铜山客', 'qiandian', 'qiandian-dongchuan-copper', '东川矿头', 'qd-dongchuan-mine', ['矿脉不是仓库，不能只会往里掏。'], ['metal']),
  npc('qd-mu-luozi', '木骡子', 'qiandian', 'qiandian-tea-road', '马帮领路人', 'qd-tea-horse-road', ['铃声稳，货就稳。'], ['route']),

  npc('jc-qinglu', '船娘清芦', 'jingchu', 'jingchu-lake-market', '渡口船家', 'jc-ferry-market', ['水路不怕远，怕不识风。'], ['route']),
  npc('jc-yeshu', '冶叔', 'jingchu', 'jingchu-mine-yard', '大冶矿工', 'jc-daye-mine', ['好矿要省着用。'], ['metal']),
  npc('jc-xiong-zhuxi', '熊朱漆', 'jingchu', 'jingchu-chu-lacquer', '楚漆匠', 'jc-chu-lacquer-yard', ['朱黑二色，画的是心里的神兽。'], ['lacquer']),
  npc('jc-wen-xiuniang', '文绣娘', 'jingchu', 'jingchu-xiang-embroidery', '湘绣师', 'jc-xiang-embroidery', ['针脚就是性情。'], ['embroidery']),

  npc('gp-shi-bai', '石白', 'ganpo', 'ganpo-kaolin-hill', '瓷土矿工', 'gp-kaolin-hill', ['好土捻开，手指先知道。'], ['ceramic']),
  npc('gp-tang-pishou', '唐坯手', 'ganpo', 'ganpo-kiln-town', '拉坯师', 'gp-throwing-room', ['坯要正，人要静。'], ['ceramic']),
  npc('gp-wen-yaotou', '窑头老温', 'ganpo', 'ganpo-kiln-town', '窑师', 'gp-dragon-kiln', ['窑火只认火色，不认嘴上把式。'], ['ceramic']),
  npc('gp-chai-yazi', '柴牙子', 'ganpo', 'ganpo-river-wood', '柴运商', 'gp-river-wood-yard', ['窑期一赶，柴价就有脾气。'], ['route']),

  npc('hz-wang-zhiniang', '汪纸娘', 'huizhou', 'huizhou-paper-valley', '宣纸匠', 'hz-paper-valley', ['纸不是薄就好，要经得住墨。'], ['paper']),
  npc('hz-cheng-moshou', '程墨守', 'huizhou', 'huizhou-ink-alley', '徽墨师', 'hz-ink-workshop', ['捶墨先捶浮气。'], ['ink']),
  npc('hz-xu-yanshi', '许砚石', 'huizhou', 'huizhou-she-stone', '歙砚师', 'hz-she-stone-pit', ['石声清不清，手底下见。'], ['stone']),
  npc('hz-cheng-yuanzhou', '程远舟', 'huizhou', 'huizhou-merchant-hall', '徽商', 'hz-merchant-hall', ['商路讲利，也讲信。'], ['trade']),

  npc('jj-lan-daqi', '蓝大器', 'jingji', 'jingji-palace-yard', '景泰蓝匠', 'jj-cloisonne-yard', ['宫造重器，错一丝都显眼。'], ['metal', 'luxury']),
  npc('jj-jin-suoniang', '金琐娘', 'jingji', 'jingji-palace-yard', '花丝师', 'jj-filigree-shop', ['银丝细，人心也要细。'], ['ornament']),
  npc('jj-song-yasi', '宋押司', 'jingji', 'jingji-official-gate', '官署小吏', 'jj-official-gate', ['名声过得去，门才开得稳。'], ['trade']),
  npc('jj-meng-zhangyan', '孟掌眼', 'jingji', 'jingji-market-gate', '鉴宝商', 'jj-appraisal-market', ['器物会说价，只是人要听得懂。'], ['appraisal']),

  npc('sj-lei-zhanggui', '雷掌柜', 'sanjin', 'sanjin-piaohao', '票号掌柜', 'sj-piaohao', ['信用是看不见的货。'], ['trade']),
  npc('sj-yaoyuan-han', '窑塬汉', 'sanjin', 'sanjin-coal-yard', '煤铁工', 'sj-coal-iron-yard', ['煤灰里也能看出火性。'], ['metal']),
  npc('sj-pingyao-qipo', '平遥漆婆', 'sanjin', 'sanjin-lacquer-yard', '推光漆匠', 'sj-pingyao-lacquer', ['掌温骗不了漆。'], ['lacquer']),
  npc('sj-cu-langzhong', '醋郎中', 'sanjin', 'sanjin-vinegar-yard', '醋坊师', 'sj-vinegar-yard', ['酸要厚，不要冲。'], ['food']),

  npc('xy-losang', '洛桑画师', 'xueyu', 'xueyu-thangka-court', '唐卡师', 'xy-thangka-court', ['先敬其意，再论其工。'], ['painting']),
  npc('xy-shicai-tong', '石彩童', 'xueyu', 'xueyu-pigment-valley', '颜料采集者', 'xy-pigment-valley', ['彩石在雪里也会发光。'], ['pigment']),
  npc('xy-yak-captain', '牦牛队长', 'xueyu', 'xueyu-snow-pass', '高原向导', 'xy-snow-pass', ['少带虚货，多带敬畏。'], ['route']),
  npc('xy-baiyinshu', '白银叔', 'xueyu', 'xueyu-silver-tent', '银器匠', 'xy-silver-tent', ['银片要听锤，也要听风。'], ['silver']),

  npc('xu-sali', '胡商萨里', 'xiyu', 'xiyu-bazaar', '巴扎商人', 'xiyu-bazaar-trade', ['价钱在嘴上，信用在路上。'], ['trade']),
  npc('xu-a-yue', '玉师阿月', 'xiyu', 'xiyu-jade-yard', '玉雕师', 'xiyu-jade-yard', ['玉料不能硬来，要顺它的势。'], ['jade']),
  npc('xu-tuoling-shu', '驼铃叔', 'xiyu', 'xiyu-caravan-post', '驼队首领', 'xiyu-caravan-post', ['沙路最忌侥幸。'], ['route']),
  npc('xu-guli', '丝娘古丽', 'xiyu', 'xiyu-atlas-loom', '艾德莱斯织师', 'xiyu-atlas-loom', ['颜色要跳，但经线不能乱。'], ['textile']),
];
