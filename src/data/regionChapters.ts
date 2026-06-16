export type RegionChapterStatus = 'chapter-ready' | 'needs-expansion';
export type RegionChapterPillarKind = 'craft' | 'life' | 'tradeRoute';
export type RegionChapterNpcRole = 'artisan' | 'trade' | 'lifeCulture';
export type RegionChapterHookSource = 'activity' | 'homeVisit' | 'collab' | 'escort' | 'proposed';

export interface RegionChapterPlayPillar {
  kind: RegionChapterPillarKind;
  label: string;
  activityIds: string[];
  craftIds?: string[];
  routeIds?: string[];
}

export interface RegionChapterNpcRef {
  npcId: string;
  role: RegionChapterNpcRole;
  note: string;
}

export interface RegionChapterOrderHook {
  source: RegionChapterHookSource;
  id: string;
  note: string;
  readsItemState?: boolean;
}

export interface RegionChapterSpec {
  id: string;
  regionId: string;
  title: string;
  summary: string;
  status: RegionChapterStatus;
  m1Package: string;
  entrySubregionIds: string[];
  playPillars: RegionChapterPlayPillar[];
  characterNpcIds: RegionChapterNpcRef[];
  orderHooks: RegionChapterOrderHook[];
  homeVisitIds: string[];
  collabRecipeIds: string[];
  escortEncounterIds: string[];
  smokeScenarioIds: string[];
  nextActions: string[];
  gaps: string[];
}

export const REGION_CHAPTERS: RegionChapterSpec[] = [
  {
    id: 'chapter-jiangnan-baigong-homecoming',
    regionId: 'jiangnan',
    title: '江南 · 百工院与水市回访',
    summary: '用百工院、龙泉剑瓷、秦淮灯市和临安茶伞支撑长期回访样板。',
    status: 'chapter-ready',
    m1Package: 'jiangnan-bashu',
    entrySubregionIds: [
      'jiangnan-suhang',
      'jiangnan-jinling',
      'jiangnan-linan',
      'jiangnan-longquan',
      'jiangnan-taihu',
      'jiangnan-baigongyuan',
    ],
    playPillars: [
      { kind: 'craft', label: '龙泉剑瓷与云锦伞作', activityIds: ['jn-longquan-sword-forge', 'jn-celadon-kiln', 'jn-cloud-brocade-office', 'jn-paper-umbrella-shop'], craftIds: ['longquan-sword', 'celadon', 'kesi', 'oilpaper-umbrella'] },
      { kind: 'life', label: '百工院田圃与湖畔茶肆', activityIds: ['jn-yard-fields', 'jn-lake-tea-house'] },
      { kind: 'tradeRoute', label: '秦淮灯市与纸墨商路', activityIds: ['jn-qinhuai-lantern'], routeIds: ['route-jiangnan-huizhou-paper', 'route-jiangnan-ganpo-kiln', 'route-jiangnan-jingji-canal'] },
    ],
    characterNpcIds: [
      { npcId: 'jn-lu-hanquan', role: 'artisan', note: '龙泉剑匠，承接剑炉工艺。' },
      { npcId: 'jn-fang-jiheng', role: 'trade', note: '码头商人，承接跨区物流。' },
      { npcId: 'jn-lin-yuqiao', role: 'artisan', note: '临安油纸伞师，承接雨季伞单。' },
      { npcId: 'jn-shen-yunsuo', role: 'artisan', note: '太湖织造师，承接缂丝与云锦织埠。' },
      { npcId: 'jn-su-xiaocha', role: 'lifeCulture', note: '湖畔茶师，承接临安茶肆与纸路消息。' },
      { npcId: 'jn-xiaoman', role: 'lifeCulture', note: '百工院田圃与生活教学入口。' },
    ],
    orderHooks: [
      { source: 'activity', id: 'jn-qinhuai-lantern', note: '灯市收束后生成后续灯彩订单。', readsItemState: true },
      { source: 'homeVisit', id: 'homevisit-ning-masterwork-critique', note: '宁辞秋读取代表作题名与品相。', readsItemState: true },
      { source: 'homeVisit', id: 'homevisit-lin-rain-umbrella-gallery', note: '临安雨伞留样读取油纸伞品相。', readsItemState: true },
      { source: 'homeVisit', id: 'homevisit-lin-rain-client-return', note: '雨季伞铺藏客回访读取原样与复单。', readsItemState: true },
      { source: 'homeVisit', id: 'homevisit-shen-cloud-brocade-gallery', note: '太湖织样留档读取缂丝 / 织锦品相。', readsItemState: true },
      { source: 'homeVisit', id: 'homevisit-shen-brocade-collector-return', note: '云锦花本藏客回访读取原样与复单。', readsItemState: true },
    ],
    homeVisitIds: [
      'homevisit-ning-masterwork-critique',
      'homevisit-qiao-lantern-gallery',
      'homevisit-xiaoman-yard-display',
      'homevisit-lin-rain-umbrella-gallery',
      'homevisit-lin-rain-client-return',
      'homevisit-shen-cloud-brocade-gallery',
      'homevisit-shen-brocade-collector-return',
    ],
    collabRecipeIds: ['collab-yunjin-pick-weft'],
    escortEncounterIds: ['escort-jingji-canal-tribute'],
    smokeScenarioIds: ['chapter-jiangnan-baigong-homecoming'],
    nextActions: ['补临安茶肆与苏小茶生活回访', '补蓝染/竹编基础工艺的专属交互深度', '补江南章节多入口 smokeBindings'],
    gaps: ['M1.25 已接入临安雨伞留样 / 回访续单与太湖云锦花本留样 / 回访续单；江南剩余转向苏小茶生活回访、蓝染 / 竹编专属工艺深度、多入口 smokeBindings 与最终美术摆位。'],
  },
  {
    id: 'chapter-bashu-tea-horse-brocade',
    regionId: 'bashu',
    title: '巴蜀 · 茶马会与蜀锦竹编',
    summary: '用茶马驿、锦里织楼、青神竹海和临邛铁炉组织山路运输章节。',
    status: 'chapter-ready',
    m1Package: 'jiangnan-bashu',
    entrySubregionIds: ['bashu-jinli', 'bashu-bamboo-sea', 'bashu-tea-horse', 'bashu-linqiong-iron'],
    playPillars: [
      { kind: 'craft', label: '蜀锦、青神竹编与临邛铁炉', activityIds: ['bs-jinguan-loom', 'bs-bamboo-sea', 'bs-linqiong-forge'], craftIds: ['shu-brocade', 'qingshen-bamboo'] },
      { kind: 'life', label: '竹海采料与山路脚程', activityIds: ['bs-bamboo-sea'] },
      { kind: 'tradeRoute', label: '茶马会与雪口路线', activityIds: ['bs-tea-horse-post'], routeIds: ['route-bashu-qiandian-tea-horse', 'route-bashu-xueyu-snow-pass', 'route-bashu-jingchu-river'] },
    ],
    characterNpcIds: [
      { npcId: 'bs-zhuo-jinniang', role: 'artisan', note: '蜀锦织造师。' },
      { npcId: 'bs-deng-lusheng', role: 'artisan', note: '临邛铁炉火候与铁料入口。' },
      { npcId: 'bs-mabang-ayue', role: 'trade', note: '茶马驿领路人。' },
      { npcId: 'bs-luo-qingmie', role: 'lifeCulture', note: '青神竹编与竹海生活入口。' },
    ],
    orderHooks: [
      { source: 'activity', id: 'bs-tea-horse-post', note: '茶马会封账后生成马帮后续单。', readsItemState: true },
      { source: 'escort', id: 'escort-tea-horse-load-ledger', note: '茶马负重簿读取路线与护商质量。' },
    ],
    homeVisitIds: ['homevisit-luo-bamboo-shelf'],
    collabRecipeIds: ['collab-luo-bamboo-split-thread'],
    escortEncounterIds: ['escort-tea-horse-load-ledger', 'escort-tea-horse-night-bell', 'escort-tea-horse-fog-debt'],
    smokeScenarioIds: ['chapter-bashu-tea-horse-brocade'],
    nextActions: ['把临邛铁炉订单回流接到铁锭与龙泉剑材料账', '把茶马会路线回访接到马帮 NPC 后日谈'],
    gaps: ['M1.20 已关闭临邛铁炉街景入口；剩余转向临邛铁料订单回流、茶马会后日谈和更多城镇生活事件。'],
  },
  {
    id: 'chapter-lingnan-harbor-gambiered',
    regionId: 'lingnan',
    title: '岭南 · 骑楼船期与香云纱',
    summary: '用珠江商港、莨绸晒场、佛山冶坊和端石坑口构成海贸晒染章节。',
    status: 'chapter-ready',
    m1Package: 'lingnan-qiandian',
    entrySubregionIds: ['lingnan-harbor', 'lingnan-gambiered-yard', 'lingnan-forge', 'lingnan-duan-stone'],
    playPillars: [
      { kind: 'craft', label: '香云纱、佛山冶铸与端砚', activityIds: ['ln-gambiered-yard', 'ln-foshan-forge', 'ln-duan-inkstone-pit'], craftIds: ['gambiered-silk', 'duan-inkstone', 'shiwan-pottery'] },
      { kind: 'life', label: '晒场看天与雨棚茶席', activityIds: ['ln-gambiered-yard', 'ln-qilou-night-market'] },
      { kind: 'tradeRoute', label: '骑楼夜市与珠江货栈', activityIds: ['ln-qilou-night-market', 'ln-pearl-river-harbor'], routeIds: ['route-qiandian-lingnan-harbor'] },
    ],
    characterNpcIds: [
      { npcId: 'ln-he-yunsha', role: 'artisan', note: '香云纱染整师。' },
      { npcId: 'ln-wu-haichao', role: 'trade', note: '海商与船期订单入口。' },
      { npcId: 'ln-tan-yanbo', role: 'lifeCulture', note: '端砚与文房文化入口。' },
    ],
    orderHooks: [
      { source: 'activity', id: 'ln-qilou-night-market', note: '骑楼夜市封账后生成船期样单。', readsItemState: true },
      { source: 'homeVisit', id: 'homevisit-yunsha-merchant-return', note: '染样藏客回访读取作品色档。', readsItemState: true },
    ],
    homeVisitIds: ['homevisit-yunsha-sun-dyed-room', 'homevisit-yunsha-merchant-return'],
    collabRecipeIds: ['collab-yunsha-sun-cure'],
    escortEncounterIds: [],
    smokeScenarioIds: ['chapter-lingnan-harbor-gambiered'],
    nextActions: ['补佛山冶坊铁器修造回流到海贸订单', '补端砚或石湾陶读取缺陷的订单', '把骑楼夜市船期回访接到伍海潮后日谈'],
    gaps: ['M1.21 已关闭佛山冶坊与端石坑口街景入口；剩余转向端砚/石湾陶长线订单、佛山铁器修造回流和骑楼夜市船期后日谈。'],
  },
  {
    id: 'chapter-qiandian-silver-tea-road',
    regionId: 'qiandian',
    title: '黔滇 · 银染茶马礼俗',
    summary: '把苗寨银巷、蜡染院、东川铜矿和茶马驿道推进为银饰礼俗章节。',
    status: 'needs-expansion',
    m1Package: 'lingnan-qiandian',
    entrySubregionIds: ['qiandian-miao-village', 'qiandian-tea-road', 'qiandian-dongchuan-copper'],
    playPillars: [
      { kind: 'craft', label: '苗银、蜡染与东川铜矿', activityIds: ['qd-miao-silver-shop', 'qd-batik-yard', 'qd-dongchuan-mine'], craftIds: ['miao-silver', 'batik', 'wutong-silver'] },
      { kind: 'life', label: '苗寨礼俗与染院生活', activityIds: ['qd-miao-silver-shop', 'qd-batik-yard'] },
      { kind: 'tradeRoute', label: '茶马驿道与铜矿路', activityIds: ['qd-tea-horse-road'], routeIds: ['route-bashu-qiandian-tea-horse', 'route-qiandian-jingchu-mine', 'route-qiandian-lingnan-harbor'] },
    ],
    characterNpcIds: [
      { npcId: 'qd-yinniang-alan', role: 'artisan', note: '苗银匠。' },
      { npcId: 'qd-tongshan-ke', role: 'artisan', note: '东川铜矿采炼与铜料账入口。' },
      { npcId: 'qd-mu-luozi', role: 'trade', note: '茶马驿道领路人。' },
      { npcId: 'qd-danqing-sao', role: 'lifeCulture', note: '蜡染与苗寨日常入口。' },
    ],
    orderHooks: [
      { source: 'activity', id: 'qd-tea-horse-road', note: '茶马驿道活动生成苗银礼俗回样单，并读取银饰作品质量。', readsItemState: true },
      { source: 'homeVisit', id: 'homevisit-alan-silver-ritual-case', note: '银娘阿岚验看礼银陈列并生成礼银纹样复单。', readsItemState: true },
      { source: 'homeVisit', id: 'homevisit-alan-tea-road-client-return', note: '礼银复单与茶马回样单完成后解锁熟路客回访续单。', readsItemState: true },
      { source: 'collab', id: 'collab-alan-silver-ritual-fit', note: '阿岚按礼俗纹样与佩戴重心校样，并可联动蜡染或茶马路牌。', readsItemState: true },
      { source: 'escort', id: 'escort-tea-horse-load-ledger', note: '茶马负重簿与黔滇路线相连。' },
    ],
    homeVisitIds: ['homevisit-alan-silver-ritual-case', 'homevisit-alan-tea-road-client-return'],
    collabRecipeIds: ['collab-alan-silver-ritual-fit'],
    escortEncounterIds: ['escort-tea-horse-load-ledger'],
    smokeScenarioIds: ['chapter-qiandian-silver-tea-road'],
    nextActions: ['补东川铜矿矿口回访与铜银材料状态反馈', '补蜡染人物回访与银染互证后日谈', '继续扩展茶马会后续分支到岭南港口回访'],
    gaps: ['M1.22 已接入 qiandian-dongchuan-copper 街景入口；剩余转向东川矿口回访、铜银材料状态反馈、蜡染人物长线回访和岭南港口回访延展。'],
  },
  {
    id: 'chapter-jingchu-ferry-lacquer',
    regionId: 'jingchu',
    title: '荆楚 · 水路楚漆修复',
    summary: '把渡口、矿场、楚漆坊和湘绣楼串成水路修复与漆绣章节。',
    status: 'needs-expansion',
    m1Package: 'jingchu-ganpo-huizhou',
    entrySubregionIds: ['jingchu-lake-market', 'jingchu-mine-yard', 'jingchu-chu-lacquer', 'jingchu-xiang-embroidery'],
    playPillars: [
      { kind: 'craft', label: '楚漆、湘绣与矿料', activityIds: ['jc-chu-lacquer-yard', 'jc-xiang-embroidery', 'jc-daye-mine'], craftIds: ['chu-lacquer', 'xiang-embroidery'] },
      { kind: 'life', label: '渡市、水泽与阴干漆作', activityIds: ['jc-ferry-market', 'jc-chu-lacquer-yard'] },
      { kind: 'tradeRoute', label: '水路运输与赣鄱湖路', activityIds: ['jc-ferry-market'], routeIds: ['route-bashu-jingchu-river', 'route-qiandian-jingchu-mine', 'route-jingchu-ganpo-lake'] },
    ],
    characterNpcIds: [
      { npcId: 'jc-xiong-zhuxi', role: 'artisan', note: '楚漆匠。' },
      { npcId: 'jc-qinglu', role: 'trade', note: '渡口船家。' },
      { npcId: 'jc-wen-xiuniang', role: 'lifeCulture', note: '湘绣楼与湖湘生活入口。' },
    ],
    orderHooks: [
      { source: 'activity', id: 'jc-ferry-market', note: '渡口市集活动生成楚漆修复追单，并读取楚漆作品质量。', readsItemState: true },
      { source: 'homeVisit', id: 'homevisit-xiong-lacquer-restoration', note: '楚漆修复家访读取作品。', readsItemState: true },
      { source: 'collab', id: 'collab-xiong-lacquer-cloud', note: '楚漆联作读漆器作品状态。', readsItemState: true },
      { source: 'escort', id: 'escort-ganpo-kiln-firewood', note: '赣鄱湖路护商把水路风险带入后续章节。' },
    ],
    homeVisitIds: ['homevisit-xiong-lacquer-restoration'],
    collabRecipeIds: ['collab-xiong-lacquer-cloud'],
    escortEncounterIds: ['escort-ganpo-kiln-firewood'],
    smokeScenarioIds: ['chapter-jingchu-ferry-lacquer'],
    nextActions: ['补大冶矿场铜铁料状态反馈与矿口回访', '补湘绣楼人物回访与绣样订单差异', '补渡口水运三阶段摊位收束'],
    gaps: ['M1.23 已关闭 jingchu-mine-yard 与 jingchu-xiang-embroidery 人工 JSON 缺口；剩余转向更长的章节活动收束、楚漆修复追单、大冶矿口材料状态反馈、湘绣楼回访和渡口水运三阶段摊位收束。'],
  },
  {
    id: 'chapter-ganpo-kiln-firewood',
    regionId: 'ganpo',
    title: '赣鄱 · 窑火瓷镇与柴运',
    summary: '把瓷镇、高岭矿丘、河运柴场和开窑会推进为窑火章节。',
    status: 'chapter-ready',
    m1Package: 'jingchu-ganpo-huizhou',
    entrySubregionIds: ['ganpo-kiln-town', 'ganpo-kaolin-hill', 'ganpo-river-wood'],
    playPillars: [
      { kind: 'craft', label: '景德镇瓷、拉坯和画坯', activityIds: ['gp-throwing-room', 'gp-blue-painting-room', 'gp-dragon-kiln'], craftIds: ['jingdezhen-porcelain'] },
      { kind: 'life', label: '高岭瓷土与窑火守候', activityIds: ['gp-kaolin-hill', 'gp-kiln-opening-fair'] },
      { kind: 'tradeRoute', label: '河运柴场与徽商路', activityIds: ['gp-river-wood-yard', 'gp-kiln-opening-fair'], routeIds: ['route-jiangnan-ganpo-kiln', 'route-jingchu-ganpo-lake', 'route-ganpo-huizhou-merchant'] },
    ],
    characterNpcIds: [
      { npcId: 'gp-wen-yaotou', role: 'artisan', note: '窑师和开窑会主轴。' },
      { npcId: 'gp-chai-yazi', role: 'trade', note: '柴运商。' },
      { npcId: 'gp-lan-yousheng', role: 'lifeCulture', note: '画坯坊与青花文化入口。' },
    ],
    orderHooks: [
      { source: 'activity', id: 'gp-kiln-opening-fair', note: '开窑会封账后生成瓷样后续单。', readsItemState: true },
      { source: 'homeVisit', id: 'homevisit-wen-kiln-return', note: '窑样藏客回访读取瓷器样品。', readsItemState: true },
      { source: 'escort', id: 'escort-ganpo-kiln-firewood', note: '窑柴赶期簿影响瓷镇柴运。' },
    ],
    homeVisitIds: ['homevisit-wen-kiln-gallery', 'homevisit-wen-kiln-return'],
    collabRecipeIds: ['collab-wen-kiln-open'],
    escortEncounterIds: ['escort-ganpo-kiln-firewood', 'escort-ganpo-kiln-firewood-followup'],
    smokeScenarioIds: ['chapter-ganpo-kiln-firewood'],
    nextActions: ['补瓷土/釉料来源对作品诊断的读取', '补河运柴场长线风险与回访差异'],
    gaps: ['章节链较完整，M1.16 已关闭 ganpo-kaolin-hill 与 ganpo-river-wood 人工 JSON 缺口；剩余转向材料读数、河运长线与多入口 smokeBindings。'],
  },
  {
    id: 'chapter-huizhou-paper-merchant',
    regionId: 'huizhou',
    title: '徽州 · 纸墨荐藏与商会信用',
    summary: '把青檀纸谷、墨砚深巷、歙石山坑和徽商会馆连成文房信用章节。',
    status: 'needs-expansion',
    m1Package: 'jingchu-ganpo-huizhou',
    entrySubregionIds: ['huizhou-paper-valley', 'huizhou-ink-alley', 'huizhou-she-stone', 'huizhou-merchant-hall'],
    playPillars: [
      { kind: 'craft', label: '宣纸、徽墨与歙砚', activityIds: ['hz-paper-valley', 'hz-ink-workshop', 'hz-she-stone-pit'], craftIds: ['xuan-paper', 'hui-ink', 'she-inkstone'] },
      { kind: 'life', label: '溪谷造纸和文房题跋', activityIds: ['hz-paper-valley', 'hz-ink-workshop'] },
      { kind: 'tradeRoute', label: '徽商会馆与纸墨商路', activityIds: ['hz-merchant-hall'], routeIds: ['route-jiangnan-huizhou-paper', 'route-ganpo-huizhou-merchant'] },
    ],
    characterNpcIds: [
      { npcId: 'hz-wang-zhiniang', role: 'artisan', note: '宣纸匠。' },
      { npcId: 'hz-cheng-yuanzhou', role: 'trade', note: '徽商会馆信用入口。' },
      { npcId: 'hz-xu-yanshi', role: 'lifeCulture', note: '歙砚与文房文化入口。' },
    ],
    orderHooks: [
      { source: 'homeVisit', id: 'homevisit-wang-collector-return', note: '文房藏客回访读取纸墨作品。', readsItemState: true },
      { source: 'collab', id: 'collab-wang-paper-mount', note: '宣纸联作读取纸张作品。', readsItemState: true },
      { source: 'activity', id: 'hz-merchant-hall', note: '徽商会馆活动生成纸墨荐藏合单，并读取宣纸作品质量。', readsItemState: true },
    ],
    homeVisitIds: ['homevisit-wang-paper-inscription', 'homevisit-wang-collector-return'],
    collabRecipeIds: ['collab-wang-paper-mount'],
    escortEncounterIds: ['escort-ganpo-kiln-firewood'],
    smokeScenarioIds: ['chapter-huizhou-paper-merchant'],
    nextActions: ['补徽商会馆荐藏回访订单链', '补商会信用风险分支', '补宣纸、徽墨、歙砚订单差异'],
    gaps: ['商会已有活动即时订单，但仍缺长线信用风险和荐藏回访分支。', '徽州纸谷、墨巷、歙石山坑与商会馆人工 JSON 已由 M1.19 收束；剩余转向文房订单差异与信用长线。'],
  },
  {
    id: 'chapter-jingji-palace-procurement',
    regionId: 'jingji',
    title: '京畿 · 宫造采办与官门凭证',
    summary: '把宫造大院、都门市口、官署门房推进为采办、宫造和通行凭证章节。',
    status: 'needs-expansion',
    m1Package: 'jingji-sanjin-xueyu-xiyu',
    entrySubregionIds: ['jingji-palace-yard', 'jingji-market-gate', 'jingji-official-gate'],
    playPillars: [
      { kind: 'craft', label: '景泰蓝与花丝宫造', activityIds: ['jj-cloisonne-yard', 'jj-filigree-shop'], craftIds: ['cloisonne', 'filigree'] },
      { kind: 'life', label: '都门鉴宝与官样规矩', activityIds: ['jj-appraisal-market', 'jj-official-gate'] },
      { kind: 'tradeRoute', label: '官署门房与漕运采办', activityIds: ['jj-appraisal-market', 'jj-official-gate'], routeIds: ['route-jiangnan-jingji-canal', 'route-jingji-sanjin-official'] },
    ],
    characterNpcIds: [
      { npcId: 'jj-lan-daqi', role: 'artisan', note: '景泰蓝匠。' },
      { npcId: 'jj-song-yasi', role: 'trade', note: '官署门房和采办许可。' },
      { npcId: 'jj-meng-zhangyan', role: 'lifeCulture', note: '都门鉴宝文化入口。' },
    ],
    orderHooks: [
      { source: 'activity', id: 'jj-official-gate', note: '官署门房活动生成官样采办单，并读取景泰蓝作品质量。', readsItemState: true },
      { source: 'activity', id: 'jj-appraisal-market', note: '都门市口活动生成官样背书单，并读取景泰蓝作品与漕运路线状态。', readsItemState: true },
      { source: 'homeVisit', id: 'homevisit-lan-palace-return', note: '宫样采办藏客回访读取作品。', readsItemState: true },
      { source: 'collab', id: 'collab-lan-cloisonne-blue', note: '景泰蓝宫造联作。', readsItemState: true },
      { source: 'escort', id: 'escort-jingji-canal-tribute', note: '漕运料账簿影响宫造采办。' },
    ],
    homeVisitIds: ['homevisit-lan-palace-gallery', 'homevisit-lan-palace-return'],
    collabRecipeIds: ['collab-lan-cloisonne-blue'],
    escortEncounterIds: ['escort-jingji-canal-tribute'],
    smokeScenarioIds: ['chapter-jingji-palace-procurement'],
    nextActions: ['内置浏览器复验都门市口、市口到官署门房、官署到江南漕运 gate', '扩展采办许可的过期担保折损与市口背书后日谈', '补更长漕运复验后续回访与多轮料账统计'],
    gaps: ['官署门房已有活动即时订单、宋押司 palace 采办商誉门槛、宫样回访续单、都门市口人工 JSON 与市口背书订单；仍缺 M3 级更长漕运复验回访和多轮料账统计。'],
  },
  {
    id: 'chapter-sanjin-piaohao-lacquer',
    regionId: 'sanjin',
    title: '三晋 · 票号信用与推光慢工',
    summary: '把票号古街、煤铁窑塬、推光漆院和清徐醋坊推进为信用与慢工章节。',
    status: 'needs-expansion',
    m1Package: 'jingji-sanjin-xueyu-xiyu',
    entrySubregionIds: ['sanjin-piaohao', 'sanjin-coal-yard', 'sanjin-lacquer-yard', 'sanjin-vinegar-yard'],
    playPillars: [
      { kind: 'craft', label: '平遥推光漆与煤铁供料', activityIds: ['sj-pingyao-lacquer', 'sj-coal-iron-yard'], craftIds: ['pingyao-lacquer', 'aged-vinegar'] },
      { kind: 'life', label: '清徐醋坊与票号街日常', activityIds: ['sj-vinegar-yard', 'sj-piaohao'] },
      { kind: 'tradeRoute', label: '票号信用与北地官路', activityIds: ['sj-piaohao'], routeIds: ['route-jingji-sanjin-official'] },
    ],
    characterNpcIds: [
      { npcId: 'sj-pingyao-qipo', role: 'artisan', note: '推光漆匠。' },
      { npcId: 'sj-lei-zhanggui', role: 'trade', note: '票号掌柜。' },
      { npcId: 'sj-yaoyuan-han', role: 'trade', note: '煤铁窑塬重货保票入口。' },
      { npcId: 'sj-cu-langzhong', role: 'lifeCulture', note: '醋坊日常与民生工艺入口。' },
    ],
    orderHooks: [
      { source: 'activity', id: 'sj-coal-iron-yard', note: '煤铁窑塬提供煤铁供料、重货账本前置和窑塬汉入口。', readsItemState: true },
      { source: 'activity', id: 'sj-vinegar-yard', note: '清徐醋坊提供老陈醋日用账前置和醋郎中入口。', readsItemState: true },
      { source: 'homeVisit', id: 'homevisit-pingyao-client-return', note: '推光漆藏客回访读取作品。', readsItemState: true },
      { source: 'homeVisit', id: 'homevisit-lei-credit-ledger-aftertalk', note: '雷掌柜复违约利钱后日谈读取漆器陈列并分支清账。', readsItemState: true },
      { source: 'homeVisit', id: 'homevisit-yaoyuan-coal-iron-ledger-return', note: '窑塬汉把雷掌柜圈出的煤铁账线转成重货保票续单。', readsItemState: true },
      { source: 'homeVisit', id: 'homevisit-cu-vinegar-ledger-return', note: '醋郎中在煤铁账清后把清徐醋坊接成民生日用账单。', readsItemState: true },
      { source: 'collab', id: 'collab-pingyao-hand-polish', note: '推光漆联作含失败返修。', readsItemState: true },
      { source: 'activity', id: 'sj-piaohao', note: '票号信用活动生成押货推光漆单，并读取漆器作品质量。', readsItemState: true },
    ],
    homeVisitIds: [
      'homevisit-pingyao-polish-room',
      'homevisit-pingyao-client-return',
      'homevisit-lei-credit-ledger-aftertalk',
      'homevisit-yaoyuan-coal-iron-ledger-return',
      'homevisit-cu-vinegar-ledger-return',
    ],
    collabRecipeIds: ['collab-pingyao-hand-polish'],
    escortEncounterIds: ['escort-jingji-canal-tribute'],
    smokeScenarioIds: ['chapter-sanjin-piaohao-lacquer'],
    nextActions: ['持续用内置浏览器复验煤铁窑塬与清徐醋坊街景 gate', '扩展多轮本金/利钱统计到 M3 长线经济'],
    gaps: ['已有票号活动即时订单、雷掌柜信用单违约、推光样柜回访、票号漆档续单回本修复、复违约利钱挂账、票号账本后日谈、煤铁保票账线、醋坊民生日用账线、煤铁窑塬与清徐醋坊人工 JSON；仍缺 M3 级多轮本金/利钱统计。'],
  },
  {
    id: 'chapter-xueyu-thangka-snowpass',
    regionId: 'xueyu',
    title: '雪域 · 唐卡净室与雪口补给',
    summary: '把唐卡画院、雪山驿口、颜料矿谷和银器帐房推进为高原补给章节。',
    status: 'needs-expansion',
    m1Package: 'jingji-sanjin-xueyu-xiyu',
    entrySubregionIds: ['xueyu-thangka-court', 'xueyu-snow-pass', 'xueyu-pigment-valley', 'xueyu-silver-tent'],
    playPillars: [
      { kind: 'craft', label: '唐卡、矿彩与银器', activityIds: ['xy-thangka-court', 'xy-pigment-valley', 'xy-silver-tent'], craftIds: ['thangka', 'tibetan-silver', 'tibetan-paper'] },
      { kind: 'life', label: '净室规矩与高原采色', activityIds: ['xy-thangka-court', 'xy-pigment-valley'] },
      { kind: 'tradeRoute', label: '雪山驿口与西域商路', activityIds: ['xy-snow-pass'], routeIds: ['route-bashu-xueyu-snow-pass', 'route-xueyu-xiyu-caravan'] },
    ],
    characterNpcIds: [
      { npcId: 'xy-losang', role: 'artisan', note: '唐卡画师。' },
      { npcId: 'xy-yak-captain', role: 'trade', note: '雪山驿口向导。' },
      { npcId: 'xy-shicai-tong', role: 'lifeCulture', note: '矿彩采集与高原材料入口。' },
      { npcId: 'xy-baiyinshu', role: 'artisan', note: '银器帐房匠人。' },
    ],
    orderHooks: [
      { source: 'activity', id: 'xy-snow-pass', note: '雪山驿口活动生成唐卡供展补给单，并读取唐卡作品质量。', readsItemState: true },
      { source: 'homeVisit', id: 'homevisit-losang-patron-return', note: '净室藏客回访读取唐卡作品。', readsItemState: true },
      { source: 'collab', id: 'collab-losang-mineral-layer', note: '唐卡联作含失败返修。', readsItemState: true },
      { source: 'escort', id: 'escort-snow-pass-windbreak', note: '雪山驿路护商影响补给章节。' },
    ],
    homeVisitIds: ['homevisit-losang-thangka-hall', 'homevisit-losang-patron-return'],
    collabRecipeIds: ['collab-losang-mineral-layer'],
    escortEncounterIds: ['escort-snow-pass-windbreak', 'escort-caravan-water-ledger'],
    smokeScenarioIds: ['chapter-xueyu-thangka-snowpass'],
    nextActions: ['补颜料矿谷/银器帐房人物回访与材料状态反馈', '补雪山驿路护商结果接入供展续单后日谈', '扩展雪域多入口章节 smokeBindings'],
    gaps: ['已有雪口活动即时订单、唐卡失败分支、净室供展回访续单与雪域四张核心人工 JSON；仍缺颜料矿谷/银器帐房人物回访、材料状态反馈与雪山驿路后日谈。'],
  },
  {
    id: 'chapter-xiyu-bazaar-caravan',
    regionId: 'xiyu',
    title: '西域 · 绿洲巴扎与驼队远行',
    summary: '把绿洲巴扎、昆仑玉场、驼队驿站和艾德莱斯织坊推进为丝路章节。',
    status: 'chapter-ready',
    m1Package: 'jingji-sanjin-xueyu-xiyu',
    entrySubregionIds: ['xiyu-bazaar', 'xiyu-jade-yard', 'xiyu-caravan-post', 'xiyu-atlas-loom'],
    playPillars: [
      { kind: 'craft', label: '玉雕与艾德莱斯织坊', activityIds: ['xiyu-jade-yard', 'xiyu-atlas-loom'], craftIds: ['jade-carving', 'atlas-silk'] },
      { kind: 'life', label: '巴扎识货与绿洲待客', activityIds: ['xiyu-bazaar-trade'] },
      { kind: 'tradeRoute', label: '驼队驿站与西域商路', activityIds: ['xiyu-caravan-post', 'xiyu-bazaar-trade'], routeIds: ['route-xueyu-xiyu-caravan'] },
    ],
    characterNpcIds: [
      { npcId: 'xu-a-yue', role: 'artisan', note: '玉雕师。' },
      { npcId: 'xu-sali', role: 'trade', note: '巴扎商人。' },
      { npcId: 'xu-guli', role: 'lifeCulture', note: '艾德莱斯织师与绿洲生活入口。' },
    ],
    orderHooks: [
      { source: 'activity', id: 'xiyu-bazaar-trade', note: '巴扎封账后生成玉作/织物后续单。', readsItemState: true },
      { source: 'homeVisit', id: 'homevisit-ayue-collector-return', note: '玉柜藏客回访读取玉作。', readsItemState: true },
      { source: 'escort', id: 'escort-caravan-water-ledger', note: '驼道水账影响远行章节。' },
    ],
    homeVisitIds: ['homevisit-ayue-jade-cabinet', 'homevisit-ayue-collector-return'],
    collabRecipeIds: ['collab-ayue-follow-vein'],
    escortEncounterIds: ['escort-caravan-water-ledger', 'escort-caravan-night-watch'],
    smokeScenarioIds: ['chapter-xiyu-bazaar-caravan'],
    nextActions: ['补巴扎后续单与长线商路风险联动', '补玉作与织坊作品的藏客和订单差异'],
    gaps: ['艾德莱斯织坊已补人工地图和专属工艺交互；仍缺巴扎长线商路风险、织坊藏客回访与订单差异。'],
  },
];

export const REGION_CHAPTER_IDS = REGION_CHAPTERS.map((chapter) => chapter.id);
