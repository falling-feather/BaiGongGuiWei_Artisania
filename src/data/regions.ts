/**
 * 地区目录 —— 世界主干（地区优先设计，详见 doc/项目规划.md 第三部分 §17/§19）。
 * 每个地区有自己的地貌主题、基础产业、特产资源与招牌手艺，并与相邻地区相连。
 * 新增地区 = 在此追加一个 RegionDef，引擎/场景不改（数据驱动）。
 *
 * 注意：signatureCrafts 中部分 craftId 为规划中、尚未在 crafts.ts 实现；
 *       目前已实现的有 'indigo-dyeing'（蓝染）、'bamboo-weaving'（竹编）。
 *       本文件为静态数据层，尚未接入 reducer / 地图生成逻辑。
 */
import type { RegionDef, SubregionDef } from '../engine/types';

const REGION_SUBREGIONS: Record<string, SubregionDef[]> = {
  jiangnan: [
    { id: 'jiangnan-suhang', name: '苏杭水市', role: '主街市', blurb: '河港、茶肆与百工作坊交错，是江南行脚的起点。', traits: ['水路', '市集', '手艺'] },
    { id: 'jiangnan-longquan', name: '龙泉山坊', role: '铸剑山坊', blurb: '山溪入炉，剑铺与陶坊沿坡而列。', traits: ['练剑', '矿冶', '山溪'] },
    { id: 'jiangnan-taihu', name: '太湖织埠', role: '织造埠头', blurb: '湖风吹动织坊帘幕，丝行、伞铺与船坞相邻。', traits: ['织造', '湖港', '商货'] },
  ],
  bashu: [
    { id: 'bashu-jinli', name: '锦里工巷', role: '城内工巷', blurb: '蜀锦、漆器与茶肆在窄巷里层层展开。', traits: ['织造', '茶肆', '市井'] },
    { id: 'bashu-bamboo-sea', name: '青神竹海', role: '竹林郊野', blurb: '竹料、茶叶与山道驿站相互连通。', traits: ['竹林', '采料', '山路'] },
  ],
  lingnan: [
    { id: 'lingnan-harbor', name: '珠江商港', role: '海贸港口', blurb: '船桅、货栈与骑楼街组成外贸前沿。', traits: ['海贸', '码头', '货栈'] },
    { id: 'lingnan-forge', name: '佛山冶坊', role: '冶铸街区', blurb: '铁炉火色映着祠堂石阶，适合冶铸与交易。', traits: ['冶铸', '祠堂', '订单'] },
  ],
  qiandian: [
    { id: 'qiandian-miao-village', name: '苗寨银巷', role: '山寨工巷', blurb: '银匠、染缸与鼓楼围成层层寨巷。', traits: ['银饰', '染坊', '山寨'] },
    { id: 'qiandian-tea-road', name: '茶马驿道', role: '驿道郊野', blurb: '马铃与茶篓穿过云雾，是远行与采料的节点。', traits: ['驿道', '茶叶', '山雾'] },
  ],
  jingchu: [
    { id: 'jingchu-lake-market', name: '江湖渡市', role: '渡口市集', blurb: '芦荡、渡船与漆作坊串起水上集镇。', traits: ['湖泊', '渡口', '漆作'] },
    { id: 'jingchu-mine-yard', name: '铜铁矿场', role: '矿冶外场', blurb: '矿车、炉棚与木栈桥构成粗粝生产区。', traits: ['矿冶', '木栈', '重工'] },
  ],
  ganpo: [
    { id: 'ganpo-kiln-town', name: '窑火瓷镇', role: '窑区街镇', blurb: '瓷行、柴堆与龙窑烟囱沿街排开。', traits: ['制瓷', '窑火', '柴运'] },
    { id: 'ganpo-kaolin-hill', name: '高岭矿丘', role: '矿山郊野', blurb: '瓷土矿、溪水与运坯小路通往窑镇。', traits: ['瓷土', '丘陵', '采料'] },
  ],
  huizhou: [
    { id: 'huizhou-ink-alley', name: '墨砚深巷', role: '文房街巷', blurb: '墨坊、砚铺与马头墙围合成静雅街区。', traits: ['文房', '徽商', '深巷'] },
    { id: 'huizhou-paper-valley', name: '青檀纸谷', role: '溪谷工坊', blurb: '纸槽沿溪排开，山风带着青檀皮香。', traits: ['造纸', '溪谷', '山林'] },
  ],
  jingji: [
    { id: 'jingji-palace-yard', name: '宫造大院', role: '宫廷工坊', blurb: '御用工坊、漕运货栈与城墙影子相接。', traits: ['宫造', '漕运', '重器'] },
    { id: 'jingji-market-gate', name: '都门市口', role: '都城市口', blurb: '商旅入城，贵重材料与订单在此集散。', traits: ['都城', '交易', '订单'] },
  ],
  sanjin: [
    { id: 'sanjin-piaohao', name: '票号古街', role: '金融街区', blurb: '票号、醋坊与漆作院同在黄土古街。', traits: ['票号', '醋坊', '漆作'] },
    { id: 'sanjin-coal-yard', name: '煤铁窑塬', role: '矿冶塬区', blurb: '煤场与铁炉沿土塬起伏，是北地重工的底盘。', traits: ['煤铁', '窑洞', '塬地'] },
  ],
  xueyu: [
    { id: 'xueyu-thangka-court', name: '唐卡画院', role: '高原画院', blurb: '经幡与画室在雪光中展开，矿物颜料格外珍贵。', traits: ['唐卡', '颜料', '经幡'] },
    { id: 'xueyu-snow-pass', name: '雪山驿口', role: '高寒驿口', blurb: '牦牛队与玛尼堆守着冰河边的通路。', traits: ['雪山', '驿口', '稀有料'] },
  ],
  xiyu: [
    { id: 'xiyu-bazaar', name: '绿洲巴扎', role: '丝路集市', blurb: '驼队、玉行与织毯铺在葡萄架下交易。', traits: ['巴扎', '美玉', '丝路'] },
    { id: 'xiyu-jade-yard', name: '昆仑玉场', role: '玉石外场', blurb: '戈壁风沙中，玉料筛选与铜器修补并行。', traits: ['玉石', '戈壁', '商队'] },
  ],
};

export function firstSubregionIdForRegion(regionId: string): string {
  return REGION_SUBREGIONS[regionId]?.[0]?.id ?? regionId;
}

const BASE_REGIONS: Array<Omit<RegionDef, 'subregions'>> = [
  {
    id: 'jiangnan',
    name: '江南',
    blurb: '河网密布、沿海多商的水乡商埠。',
    terrain: {
      base: '水网 + 石板街',
      obstacles: ['河道', '石拱桥', '乌篷船'],
      landmarks: ['白墙黛瓦', '戏台', '当铺', '丝行'],
      palette: ['#8a9aa0', '#cfe3d8'],
    },
    industries: ['sericulture', 'weave-brocade', 'smelt-iron', 'forge-sword', 'mine-kaolin', 'pick-tea'],
    localResources: ['cocoonSilk', 'brineSalt', 'kaolin', 'ironOre', 'teaLeaf'],
    signatureCrafts: ['celadon', 'longquan-sword', 'kesi', 'oilpaper-umbrella', 'bamboo-weaving'],
    neighbors: ['jinling', 'huizhou', 'ganpo', 'minhai', 'jingji'],
    traits: ['富庶', '重商', '商路枢纽'],
    startUnlocked: true,
  },
  {
    id: 'bashu',
    name: '巴蜀',
    blurb: '四面环山的红盆地，竹海梯田、栈道江流。',
    terrain: {
      base: '山地梯田',
      obstacles: ['陡坡', '栈道', '竹林', '江流'],
      landmarks: ['吊脚楼', '盐井架', '茶肆', '铸铁炉房'],
      palette: ['#b07a4a', '#6f8f5a'],
    },
    industries: ['smelt-iron', 'split-bamboo', 'pick-tea'],
    localResources: ['ironOre', 'brineSalt', 'bambooRaw', 'teaLeaf'],
    signatureCrafts: ['shu-brocade', 'shu-embroidery', 'qingshen-bamboo', 'chengdu-lacquer'],
    neighbors: ['qiandian', 'jingchu', 'guanzhong'],
    traits: ['物产厚', '多山难行', '铁与丹砂主产地'],
    startUnlocked: false,
  },
  {
    id: 'lingnan',
    name: '岭南',
    blurb: '珠江三角洲、海贸门户与冶铸重镇。',
    terrain: {
      base: '海岸 + 骑楼街',
      obstacles: ['码头', '海面', '商船'],
      landmarks: ['骑楼', '祠堂', '铸铁炉房', '货栈'],
      palette: ['#d98e54', '#3f7fa6'],
    },
    industries: ['smelt-iron', 'sericulture'],
    localResources: ['ironOre', 'cocoonSilk', 'duanStone'],
    signatureCrafts: ['canton-embroidery', 'gambiered-silk', 'shiwan-pottery', 'duan-inkstone', 'zhuang-brocade'],
    neighbors: ['qiandian', 'minhai', 'qiongya'],
    traits: ['海贸门户', '冶铸强', '出口订单多'],
    startUnlocked: false,
  },
  {
    id: 'qiandian',
    name: '黔滇',
    blurb: '云贵高原、群山梯田与多民族聚居。',
    terrain: {
      base: '高山梯田',
      obstacles: ['峡谷', '吊脚楼群', '山雾'],
      landmarks: ['苗寨鼓楼', '银匠铺', '染缸院', '茶马驿'],
      palette: ['#3b5b8c', '#d8dde0'],
    },
    industries: ['refine-silver', 'smelt-copper', 'build-indigo', 'pick-tea'],
    localResources: ['silverOre', 'copperOre', 'indigoPlant', 'teaLeaf'],
    signatureCrafts: ['miao-silver', 'batik', 'indigo-dyeing', 'jianshui-pottery', 'wutong-silver'],
    neighbors: ['bashu', 'lingnan', 'jingchu'],
    traits: ['贵金属铜主产区', '民族工艺丰富', '深山交通不便'],
    startUnlocked: false,
  },
  {
    id: 'jingchu',
    name: '荆楚',
    blurb: '长江中游的江湖水乡，铜铁矿冶之地。',
    terrain: {
      base: '江湖水乡',
      obstacles: ['湖泊', '芦荡', '渡口'],
      landmarks: ['漆作坊', '矿冶场', '绣楼'],
      palette: ['#5a6f8c', '#7a8a5a'],
    },
    industries: ['smelt-copper', 'smelt-iron', 'tap-lacquer', 'sericulture'],
    localResources: ['copperOre', 'ironOre', 'rawLacquer', 'cocoonSilk'],
    signatureCrafts: ['chu-lacquer', 'xiang-embroidery', 'tujia-brocade'],
    neighbors: ['bashu', 'qiandian', 'zhongyuan', 'ganpo'],
    traits: ['铜铁矿冶', '江湖纵横'],
    startUnlocked: false,
  },
  {
    id: 'ganpo',
    name: '赣鄱',
    blurb: '丘陵盆地、鄱阳湖畔，瓷土与窑火之乡。',
    terrain: {
      base: '丘陵 + 窑区',
      obstacles: ['河运', '柴堆', '龙窑'],
      landmarks: ['窑房烟囱', '瓷行', '高岭矿'],
      palette: ['#c8a05a', '#a64b2a'],
    },
    industries: ['mine-kaolin'],
    localResources: ['kaolin', 'coal', 'timber', 'ramie'],
    signatureCrafts: ['jingdezhen-porcelain', 'xiabu'],
    neighbors: ['jiangnan', 'minhai', 'huizhou', 'jingchu'],
    traits: ['瓷土与制瓷中心', '分工极细'],
    startUnlocked: false,
  },
  {
    id: 'huizhou',
    name: '徽州',
    blurb: '黄山余脉的深山幽谷，文房之乡。',
    terrain: {
      base: '深山溪谷',
      obstacles: ['山墙', '马头墙', '溪桥'],
      landmarks: ['墨坊', '纸槽', '砚铺'],
      palette: ['#2e2e2e', '#5a6f72'],
    },
    industries: ['make-paper', 'make-ink', 'pick-tea'],
    localResources: ['qingtanBark', 'pineSoot', 'sheStone', 'timber', 'teaLeaf'],
    signatureCrafts: ['xuan-paper', 'hui-ink', 'she-inkstone', 'hui-carving'],
    neighbors: ['jiangnan', 'ganpo'],
    traits: ['文房之乡', '徽商回流'],
    startUnlocked: false,
  },
  {
    id: 'jingji',
    name: '京畿',
    blurb: '华北平原上的都城宫苑，宫造重器之地。',
    terrain: {
      base: '平原宫苑',
      obstacles: ['城墙', '宫门', '漕河'],
      landmarks: ['御用工坊', '作坊大院', '漕运码头'],
      palette: ['#a6342b', '#caa84a'],
    },
    industries: ['smelt-iron'],
    localResources: ['ironOre', 'brineSalt', 'mineralPigment'],
    signatureCrafts: ['cloisonne', 'filigree', 'carved-lacquer', 'inner-painting'],
    neighbors: ['sanjin', 'zhongyuan', 'guandong', 'jiangnan'],
    traits: ['宫廷重工', '做奢侈精品', '金银铜依赖外区'],
    startUnlocked: false,
  },
  {
    id: 'sanjin',
    name: '三晋',
    blurb: '黄土高原的沟壑古城，煤铁醋漆与票号。',
    terrain: {
      base: '黄土沟壑',
      obstacles: ['窑洞', '土塬', '古城墙'],
      landmarks: ['票号', '醋坊', '漆作'],
      palette: ['#c9a85a', '#6b4f2a'],
    },
    industries: ['smelt-iron', 'tap-lacquer'],
    localResources: ['coal', 'ironOre', 'rawLacquer'],
    signatureCrafts: ['pingyao-lacquer', 'aged-vinegar', 'jin-furniture'],
    neighbors: ['jingji', 'zhongyuan', 'guanzhong'],
    traits: ['能源与金融', '煤铁供冶炼', '票号借贷'],
    startUnlocked: false,
  },
  {
    id: 'xueyu',
    name: '雪域高原',
    blurb: '高寒雪山与经幡碉房，金银唐卡之源。',
    terrain: {
      base: '雪原高山',
      obstacles: ['雪坡', '玛尼堆', '冰河'],
      landmarks: ['碉房', '经幡', '唐卡画室'],
      palette: ['#eef2f5', '#9a2b2b'],
    },
    industries: ['refine-silver', 'grind-pigment', 'make-paper'],
    localResources: ['goldOre', 'silverOre', 'mineralPigment'],
    signatureCrafts: ['thangka', 'tibetan-paper', 'tibetan-silver', 'tibetan-incense'],
    neighbors: ['bashu', 'xiyu'],
    traits: ['金银与天然颜料源头', '路途艰险', '原料珍稀'],
    startUnlocked: false,
  },
  {
    id: 'xiyu',
    name: '西域',
    blurb: '沙漠绿洲与丝路巴扎，美玉与商货交汇。',
    terrain: {
      base: '沙漠绿洲',
      obstacles: ['沙丘', '葡萄架', '戈壁'],
      landmarks: ['巴扎集市', '玉行', '驼队客栈'],
      palette: ['#d8b35a', '#3f8a7a'],
    },
    industries: ['smelt-copper', 'sericulture'],
    localResources: ['jadeRough', 'cocoonSilk', 'copperOre'],
    signatureCrafts: ['jade-carving', 'atlas-silk', 'carpet', 'copperware'],
    neighbors: ['xueyu'],
    traits: ['美玉与丝路集市', '东西货物交汇', '稀有材料黑市'],
    startUnlocked: false,
  },
];

/** 大地区目录：每个大地区包含多个可探索小地区。 */
export const REGIONS: RegionDef[] = BASE_REGIONS.map((region) => ({
  ...region,
  subregions: REGION_SUBREGIONS[region.id] ?? [
    {
      id: `${region.id}-core`,
      name: `${region.name}主街`,
      role: '主街区',
      blurb: region.blurb,
      traits: region.traits,
    },
  ],
}));

/** 地区索引：id -> RegionDef */
export const REGION_INDEX: Record<string, RegionDef> = Object.fromEntries(
  REGIONS.map((r) => [r.id, r]),
);
