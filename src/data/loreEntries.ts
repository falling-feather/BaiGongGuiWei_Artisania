import type { LoreEntry } from '../engine/types';
import { CRAFT_INDEX } from './crafts';
import { INDUSTRY_INDEX } from './industries';
import { ALL_NPCS } from './npcs';
import { REGION_ACTIVITIES } from './regionContent';
import { REGIONS } from './regions';
import { SUBREGION_CONTENT_INDEX } from './subregionContent';

function joinNames(names: string[], emptyLabel: string): string {
  const unique = [...new Set(names.filter(Boolean))];
  return unique.length ? unique.slice(0, 5).join('、') : emptyLabel;
}

function buildSubregionLoreEntries(): LoreEntry[] {
  return REGIONS.flatMap((region) =>
    region.subregions.map((subregion) => {
      const content = SUBREGION_CONTENT_INDEX[subregion.id];
      const industryNames = (content?.industryIds ?? []).map((id) => INDUSTRY_INDEX[id]?.name ?? id);
      const craftNames = (content?.craftIds ?? []).map((id) => CRAFT_INDEX[id]?.name ?? id);
      const activityNames = REGION_ACTIVITIES.filter(
        (activity) => activity.regionId === region.id && activity.subregionId === subregion.id,
      ).map((activity) => activity.name);
      const localNpcs = ALL_NPCS.filter(
        (npc) =>
          npc.regionId === region.id &&
          (npc.subregionId === subregion.id ||
            (npc.schedule ?? []).some((rule) => rule.subregionId === subregion.id)),
      );
      const npcNames = localNpcs.map((npc) => npc.name);
      const contentBits = [
        industryNames.length ? `采料：${joinNames(industryNames, '无')}` : '',
        craftNames.length ? `工坊：${joinNames(craftNames, '无')}` : '',
        activityNames.length ? `活动：${joinNames(activityNames, '无')}` : '',
        npcNames.length ? `人物：${joinNames(npcNames, '无')}` : '',
      ].filter(Boolean);

      return {
        id: `subregion-${subregion.id}`,
        category: 'region',
        title: `${region.name} · ${subregion.name}`,
        summary: `${subregion.role}，${subregion.traits.slice(0, 3).join(' / ')}。`,
        body: [
          `${subregion.name}定位为${subregion.role}：${subregion.blurb}`,
          contentBits.length
            ? `当前可运行入口包括${contentBits.join('；')}。`
            : '当前主要承担地区动线、人物驻点或后续事件承接，仍需继续补入更多本地入口。',
          '镇务只展示这张小地区行脚卡，真正前往仍要在街景中寻找区内通道、城门、码头、驿道或其它交互点。',
        ],
        regionId: region.id,
        subregionId: subregion.id,
        npcIds: localNpcs.map((npc) => npc.id),
        tags: [
          region.name,
          subregion.name,
          subregion.role,
          ...subregion.traits,
          ...industryNames,
          ...craftNames,
          ...activityNames,
          ...npcNames,
        ],
        unlock: { regions: [region.id] },
        revealHint: `开通${region.name}后收录${subregion.name}行脚卡。`,
      };
    }),
  );
}

const MANUAL_LORE_ENTRIES = [
  {
    id: 'world-baigong-plaque',
    category: 'world',
    title: '百工匾额',
    summary: '一块把行脚、工坊和人情串在一起的旧匾。',
    body: [
      '师傅临终前留下的“百工”二字，不只是一间院子的招牌。',
      '它要求玩家把分散在各地的材料、人物、工序和交易重新连成活的网络。',
    ],
  },
  {
    id: 'system-four-metrics',
    category: 'system',
    title: '四维生态',
    summary: '传承、市场、生活、精神共同决定手艺能否长久。',
    body: [
      '传承度看工序是否守得住，市场度看作品能不能养活人，生活度看手艺是否仍贴近日常，精神度看人心是否愿意继续做下去。',
      '任何单维过高或过低都会带来偏向，百工镇的经营重点在于长期平衡。',
    ],
  },
  {
    id: 'region-jiangnan-water-market',
    category: 'region',
    title: '江南水市',
    summary: '水路、灯市、织造、茶伞丝瓷交错的起步地区。',
    body: [
      '江南不是单一材料产地，而是一组紧密相连的小地区：苏杭水市、金陵灯市、临安水市、龙泉山坊、太湖织埠和城郊百工院。',
      '玩家在这里学会从街景通道行脚，而不是依赖大地图瞬移。',
    ],
    regionId: 'jiangnan',
    unlock: { regions: ['jiangnan'] },
    revealHint: '抵达江南后解锁。',
  },
  {
    id: 'region-longquan-slope',
    category: 'region',
    title: '龙泉山坊',
    summary: '矿冶、剑炉和青瓷窑沿山溪排列。',
    body: [
      '龙泉山坊把开采、淘练、冶炼、锻造和入窑放在同一条山溪动线上。',
      '这里适合验证“采料 -> 精炼 -> 制作 -> 背包追溯 -> 售出”的完整链路。',
    ],
    regionId: 'jiangnan',
    unlock: { topics: ['craft-mentor:longquan-sword'] },
    revealHint: '向龙泉剑匠请教后解锁。',
  },
  {
    id: 'region-bashu-bamboo-sea',
    category: 'region',
    title: '巴蜀青神竹海',
    summary: '竹林、茶路和山道驿站构成巴蜀手艺的郊野入口。',
    body: [
      '青神竹海不是单纯伐竹点，它把剖篾、茶料、山路补给和茶马驿线放在同一张动线里。',
      '玩家开通巴蜀后，应能在这里理解竹编、蜀锦和茶马护商为什么会相互牵动。',
    ],
    regionId: 'bashu',
    npcIds: ['bs-luo-qingmie', 'bs-mabang-ayue'],
    tags: ['巴蜀', '竹海', '茶马'],
    unlock: { regions: ['bashu'] },
    revealHint: '开通巴蜀后解锁。',
  },
  {
    id: 'region-lingnan-gambiered-yard',
    category: 'region',
    title: '岭南莨绸晒场',
    summary: '薯莨、河泥、日光和船期共同决定香云纱的节奏。',
    body: [
      '莨绸晒场要求玩家把天气当成工艺条件，而不是背景装饰：晴晒、雨改期、复染和晒色都该影响作品来路。',
      '海商伍海潮与何云纱在这里交会，让染整工艺自然接上外销船期和岭南商货网络。',
    ],
    regionId: 'lingnan',
    npcIds: ['ln-he-yunsha', 'ln-wu-haichao'],
    tags: ['岭南', '香云纱', '船期'],
    unlock: { regions: ['lingnan'] },
    revealHint: '开通岭南后解锁。',
  },
  {
    id: 'region-qiandian-miao-village',
    category: 'region',
    title: '黔滇苗寨银巷',
    summary: '银饰、蜡染、鼓楼和山雾把礼俗与材料绑在一起。',
    body: [
      '苗寨银巷的重点不是多放几个银铺，而是让熔银、拉丝、錾花、蜡染纹样和节令礼俗能互相解释。',
      '银娘阿岚和木骡子的见闻应把苗银礼法、茶马熟路和黔滇山路风险沉淀进玩家的长期知识库。',
    ],
    regionId: 'qiandian',
    npcIds: ['qd-yinniang-alan', 'qd-mu-luozi'],
    tags: ['黔滇', '苗银', '茶马'],
    unlock: { regions: ['qiandian'] },
    revealHint: '开通黔滇后解锁。',
  },
  {
    id: 'region-jingchu-chu-lacquer',
    category: 'region',
    title: '荆楚楚漆坊',
    summary: '朱黑漆色、湿度、渡市和古纹共同支撑漆艺修复线。',
    body: [
      '楚漆坊适合承载多日工序管理：制胎、刮灰、髹漆、阴干和纹样复看都需要时间与环境。',
      '熊朱漆的漆艺线应把荆楚水泽、古器纹样和跨区器物修复连接起来，避免漆艺只停留在成品合成。',
    ],
    regionId: 'jingchu',
    npcIds: ['jc-xiong-zhuxi', 'jc-qinglu'],
    tags: ['荆楚', '楚漆', '修复'],
    unlock: { regions: ['jingchu'] },
    revealHint: '开通荆楚后解锁。',
  },
  {
    id: 'region-ganpo-kiln-town',
    category: 'region',
    title: '赣鄱窑火瓷镇',
    summary: '瓷土、画坯、窑柴和开窑会汇成高温工艺生活圈。',
    body: [
      '窑火瓷镇把采瓷土、淘练、拉坯、画坯、添柴、开窑和瓷样分级排进同一座街镇。',
      '从江南经街景商路进入这里后，玩家应能马上读到景德镇瓷工坊、窑柴河路和开窑会之间的关系。',
    ],
    regionId: 'ganpo',
    npcIds: ['gp-wen-yaotou', 'gp-lan-yousheng', 'gp-chai-yazi'],
    tags: ['赣鄱', '景德镇瓷', '窑柴'],
    unlock: { regions: ['ganpo'] },
    revealHint: '开通赣鄱后解锁。',
  },
  {
    id: 'region-huizhou-paper-valley',
    category: 'region',
    title: '徽州青檀纸谷',
    summary: '溪谷、青檀、纸槽和徽商账册共同托住文房线。',
    body: [
      '青檀纸谷应让玩家看到宣纸不是凭空出现：剥皮、浸泡、捞纸、压榨和晾纸都需要山水与耐心。',
      '汪纸娘的文房线与徽商会馆的信用线相互支撑，让纸墨不只是材料，而是题跋、藏客和后续订单的根。',
    ],
    regionId: 'huizhou',
    npcIds: ['hz-wang-zhiniang', 'hz-cheng-yuanzhou'],
    tags: ['徽州', '宣纸', '徽商'],
    unlock: { regions: ['huizhou'] },
    revealHint: '开通徽州后解锁。',
  },
  {
    id: 'region-jingji-palace-yard',
    category: 'region',
    title: '京畿宫造大院',
    summary: '宫造、漕运、采办门房和重器标准构成中后期门槛。',
    body: [
      '宫造大院不该只是高级商店。它要求玩家把跨区铜料、矿彩、声望、名帖和工艺精度同时准备好。',
      '蓝大器与宋押司分别代表“能不能做”和“能不能入册”，让宫造订单成为材料、技艺和信誉的综合验收。',
    ],
    regionId: 'jingji',
    npcIds: ['jj-lan-daqi', 'jj-song-yasi'],
    tags: ['京畿', '宫造', '漕运'],
    unlock: { regions: ['jingji'] },
    revealHint: '开通京畿后解锁。',
  },
  {
    id: 'region-sanjin-lacquer-yard',
    category: 'region',
    title: '三晋推光漆院',
    summary: '票号信用、煤铁底盘和慢工漆艺在北地院落里相互照面。',
    body: [
      '推光漆院强调掌温、耐心和返修记录，适合承接高风险联作失败后的修复与复看。',
      '平遥漆婆与票号掌柜的关系让三晋不只是资源产地，而是信用、慢工和藏客声誉共同发酵的地区。',
    ],
    regionId: 'sanjin',
    npcIds: ['sj-pingyao-qipo', 'sj-lei-zhanggui'],
    tags: ['三晋', '推光漆', '票号'],
    unlock: { regions: ['sanjin'] },
    revealHint: '开通三晋后解锁。',
  },
  {
    id: 'region-xueyu-thangka-court',
    category: 'region',
    title: '雪域唐卡画院',
    summary: '矿彩、礼法、雪山驿口和净室供展共同约束唐卡线。',
    body: [
      '唐卡画院需要把材料珍稀和题材敬意同时落到玩法里，不能只把雪域当成稀有矿彩仓库。',
      '洛桑画师的度量、牦牛队长的雪路和颜料矿谷的供给，应共同塑造“远行要守规矩”的后期体验。',
    ],
    regionId: 'xueyu',
    npcIds: ['xy-losang', 'xy-yak-captain'],
    tags: ['雪域', '唐卡', '矿彩'],
    unlock: { regions: ['xueyu'] },
    revealHint: '开通雪域高原后解锁。',
  },
  {
    id: 'region-xiyu-jade-yard',
    category: 'region',
    title: '西域昆仑玉场',
    summary: '戈壁玉料、巴扎信用和驼队水账共同决定玉作能否成名。',
    body: [
      '昆仑玉场的核心是识料和顺势：水线、绺裂、脂白和来路都应写进作品履历。',
      '玉师阿月、胡商萨里和驼铃叔把玉作、巴扎与护商补给连起来，让西域成为后期鉴材和信用玩法的入口。',
    ],
    regionId: 'xiyu',
    npcIds: ['xu-a-yue', 'xu-sali', 'xu-tuoling-shu'],
    tags: ['西域', '玉作', '巴扎'],
    unlock: { regions: ['xiyu'] },
    revealHint: '开通西域后解锁。',
  },
  {
    id: 'craft-longquan-sword-temper',
    category: 'craft',
    title: '龙泉剑：铁净而火不躁',
    summary: '选铁、折锻和淬火共同决定剑器骨性。',
    body: [
      '龙泉剑的风险不只在最后淬火。若选铁定形时根骨不稳，后续再赶工也容易留下脆心。',
      '师傅授艺、工序手法和专注校准都会写入同一件作品的阶段诊断。',
    ],
    craftId: 'longquan-sword',
    npcIds: ['jn-lu-hanquan'],
    unlock: { topics: ['craft-stage:sword-select-iron'] },
    revealHint: '请龙泉剑匠讲授选铁定剑形后解锁。',
  },
  {
    id: 'craft-celadon-clay-fire',
    category: 'craft',
    title: '龙泉青瓷：土与火',
    summary: '淘土、拉坯、施釉入窑共同养出青意。',
    body: [
      '青瓷链路从高岭土开始，经淘练成瓷土，再进入工坊定器形、拉坯、施釉入窑。',
      '背包中的阶段记录会保留每段手法、控制、风险和专注校准结果。',
    ],
    craftId: 'celadon',
    npcIds: ['jn-ye-qingzhan'],
    unlock: { flags: ['craft-focus-check-used:celadon'] },
    revealHint: '完成一次带专注校准的龙泉青瓷制作后解锁。',
  },
  {
    id: 'life-lake-tea-house',
    category: 'life',
    title: '湖畔茶肆',
    summary: '烹茶、听闻和商路消息的生活入口。',
    body: [
      '茶肆不是纯收益点，它把茶叶、人物谈资和徽州纸路消息连在一起。',
      '生活活动会写入 NPC 见闻，成为后续指路、订单和地区声望的线头。',
    ],
    regionId: 'jiangnan',
    npcIds: ['jn-su-xiaocha'],
    unlock: { topics: ['activity:jn-lake-tea-house'] },
    revealHint: '体验临安湖畔茶肆后解锁。',
  },
  {
    id: 'route-jiangnan-huizhou-paper',
    category: 'route',
    title: '江南至徽州纸路',
    summary: '茶肆闲谈背后牵出的文房供应线。',
    body: [
      '江南的竹、茶和徽州的纸墨并不是孤立库存；路线情报会降低开路成本，也会改变后续订单。',
      '当 NPC 或活动写入 route-known 标记后，商路就从地图线变成玩家掌握的地方知识。',
    ],
    unlock: { flags: ['route-known:route-jiangnan-huizhou-paper'] },
    revealHint: '获得江南至徽州纸路情报后解锁。',
  },
  {
    id: 'life-night-market-stall',
    category: 'life',
    title: '节令摊位',
    summary: '灯市、巴扎、开窑会共享的三阶段摆摊模型。',
    body: [
      '节令摊位由客群、组合和主动策略共同结算，不只是一次性活动奖励。',
      '收尾选择能生成后续订单，把一次赶集延伸成来年名单、复样单或藏客声誉。',
    ],
    unlock: { anyTopics: ['night-market-stall', 'bazaar-stall', 'kiln-opening-stall'] },
    revealHint: '参加任一三阶段节令摊位后解锁。',
  },
  {
    id: 'life-festival-closing-ledger',
    category: 'life',
    title: '收摊账与来年名单',
    summary: '节令收尾选择会把一次活动延成长线订单。',
    body: [
      '秦淮灯市、瓷镇开窑会和绿洲巴扎都不应在“卖完一摊”后结束。',
      '收摊分支会把账簿、样货或人情名单转成后续订单，成为地区声望和人物后日谈的线索。',
    ],
    tags: ['节令', '后续订单', '声望'],
    unlock: {
      anyTopics: [
        'lantern-riddle-ledger',
        'next-year-lantern-booking',
        'fire-color-ledger',
        'fire-color-return-order',
        'bazaar-contract',
        'next-season-bazaar-booking',
      ],
    },
    revealHint: '完成任一节令摊位的收尾选择后解锁。',
  },
  {
    id: 'life-oasis-bazaar',
    category: 'life',
    title: '绿洲巴扎',
    summary: '西域集市把换货、稀有材料和商队信用放到同一场景。',
    body: [
      '巴扎不是普通商店，而是丝路两端的信用试场。玩家要在玉料、织物、补给和远商需求之间做取舍。',
      '巴扎摊位沿用三阶段模型，能记录客群、组合、策略和散市后的复样单。',
    ],
    regionId: 'xiyu',
    npcIds: ['xu-sali'],
    tags: ['西域', '巴扎', '换货'],
    unlock: { anyTopics: ['bazaar-stall', 'silk-road-trade', 'barter'] },
    revealHint: '在西域绿洲巴扎参与集市后解锁。',
  },
  {
    id: 'life-kiln-opening-fair',
    category: 'life',
    title: '瓷镇开窑会',
    summary: '开窑会把火色、验瓷、河路和瓷样摊连成节令链。',
    body: [
      '赣鄱开窑会要求玩家先看试片、再评火色、最后决定瓷样流向。',
      '这条链路验证活动挑战、摊位结算、收摊分支、路线情报和后续订单能共用同一套结构。',
    ],
    regionId: 'ganpo',
    npcIds: ['gp-wen-yaotou'],
    tags: ['赣鄱', '开窑', '瓷样'],
    unlock: { anyTopics: ['kiln-opening-stall', 'kiln-fire-color', 'porcelain-market'] },
    revealHint: '参与赣鄱瓷镇开窑会后解锁。',
  },
  {
    id: 'route-tea-horse-ledger',
    category: 'route',
    title: '茶马负重簿',
    summary: '山路护商先看货重、天气和前置选择。',
    body: [
      '茶马南线的护商不是按次数平推。负重、雾口、夜铃会把玩家前一次选择带到后续阶段。',
      '成功未必只是多拿赏钱，更多时候是在提升路线稳定和马帮信任。',
    ],
    regionId: 'bashu',
    npcIds: ['bs-mabang-ayue', 'qd-mu-luozi'],
    tags: ['茶马', '护商', '路线稳定'],
    unlock: { anyTopics: ['tea-horse-ledger', 'tea-horse-night-bell', 'tea-horse-fog-debt'] },
    revealHint: '完成茶马相关护商事件后解锁。',
  },
  {
    id: 'route-oasis-water-ledger',
    category: 'route',
    title: '沙路水账',
    summary: '西域驼队把补给数、护商契约和绿洲信用绑在一起。',
    body: [
      '沙路水账要求玩家先处理水袋和负重，再决定是否继续押送远商。',
      '它和巴扎共享“信用在路上”的逻辑：路线越稳，稀有材料和复样订单越可靠。',
    ],
    regionId: 'xiyu',
    npcIds: ['xu-tuoling-shu'],
    tags: ['西域', '驼队', '补给'],
    unlock: { anyTopics: ['caravan-water-ledger', 'caravan-night-watch', 'oasis-contract'] },
    revealHint: '完成西域驼队护商或沙路补给事件后解锁。',
  },
  {
    id: 'route-kiln-firewood-river',
    category: 'route',
    title: '窑柴河路',
    summary: '瓷窑不是只缺瓷土，也缺能准时到窑口的柴。',
    body: [
      '赣鄱窑柴路线把河运、天气、开窑日程和瓷样订单绑在一起。',
      '护商失败会拖慢窑期，成功则能让开窑会和后续复烧订单更稳定。',
    ],
    regionId: 'ganpo',
    npcIds: ['gp-chai-yazi', 'gp-wen-yaotou'],
    tags: ['窑柴', '河运', '赣鄱'],
    unlock: { anyTopics: ['kiln-firewood', 'kiln-firewood-dry', 'kiln-firewood-rush', 'firewood-ledger'] },
    revealHint: '处理赣鄱窑柴护商或河路账簿后解锁。',
  },
  {
    id: 'route-canal-tribute',
    category: 'route',
    title: '漕运贡样路',
    summary: '京畿采办需要宫造标准、运河节奏和票号信用共同兜底。',
    body: [
      '通往京畿的路不只是物理距离。贡样名册、运河潮汐和官署门房会一起影响宫造订单。',
      '当玩家能处理漕运护商，景泰蓝、瓷样和票号信用才会真正进入中后期目标。',
    ],
    regionId: 'jingji',
    npcIds: ['jj-song-yasi'],
    tags: ['京畿', '漕运', '宫造'],
    unlock: { anyTopics: ['canal-tribute', 'tribute-manifest', 'official-route', 'canal-tide'] },
    revealHint: '完成京畿漕运或官样采办相关护商后解锁。',
  },
  {
    id: 'craft-yunjin-palace-pattern',
    category: 'craft',
    title: '云锦：宫样与商样',
    summary: '织造分支会在宫样严整和商样放样之间取舍。',
    body: [
      '云锦联作不只是提高品相。宫样校花更看规制，商样放样更看复用和市场。',
      '分支选择会进入作品题评、协作者记忆和后续订单候选。',
    ],
    craftId: 'yunjin',
    npcIds: ['jn-shen-yunsuo'],
    tags: ['云锦', '联作', '宫样'],
    unlock: { anyTopics: ['yunjin-collab', 'palace-pattern-proof', 'merchant-brocade-scale'] },
    revealHint: '与沈云梭完成云锦专属联作后解锁。',
  },
  {
    id: 'craft-paper-inscription-lineage',
    category: 'craft',
    title: '文房题位',
    summary: '宣纸联作把题跋、装池和藏客续订连成一条线。',
    body: [
      '文房作品的价值不只在纸张质量，也在谁题、题在何处、是否能被藏客继续追认。',
      '留题位分支可让协同 NPC 进入作品作者关系，并把人情写回百工院。',
    ],
    craftId: 'xuan-paper',
    npcIds: ['hz-wang-zhiniang', 'jn-ning-ciqiu'],
    tags: ['宣纸', '题跋', '文房'],
    unlock: { anyTopics: ['paper-collab', 'paper-inscription', 'stationery-lineage', 'inscription-space'] },
    revealHint: '完成宣纸/文房相关联作或珍品阁来访后解锁。',
  },
  {
    id: 'craft-gambiered-silk-weather',
    category: 'craft',
    title: '香云纱：日晒与船期',
    summary: '晒场工艺同时受天气、色档和外销船期牵动。',
    body: [
      '香云纱的泥染和复晒要求玩家看天色，不适合只做静态按钮。',
      '赶市定色分支会把海商船期写进作品协作者和 NPC 见闻，说明工艺选择能直接连接市场压力。',
    ],
    craftId: 'gambiered-silk',
    npcIds: ['ln-he-yunsha', 'ln-wu-haichao'],
    tags: ['岭南', '香云纱', '天气'],
    unlock: { anyTopics: ['gambiered-collab', 'gambiered-silk', 'sun-cure', 'market-fast-cure', 'export-schedule'] },
    revealHint: '完成香云纱联作或染样藏客链后解锁。',
  },
  {
    id: 'craft-polished-lacquer-slow',
    category: 'craft',
    title: '推光漆：慢镜与失手',
    summary: '高风险联作会把失败、返修和票号藏客一起写进履历。',
    body: [
      '推光漆的慢镜推光是高风险分支：试手不足会扣材料、降品相并留下返修题评。',
      '这类失败不是坏档，而是让后续修复、藏客回访和结局后日谈有可追溯的依据。',
    ],
    craftId: 'polished-lacquer',
    npcIds: ['sj-pingyao-qipo'],
    tags: ['三晋', '推光漆', '返修'],
    unlock: { anyTopics: ['polish-collab', 'slow-craft', 'mirror-polish-failure', 'polish-credit-ledger'] },
    revealHint: '尝试推光漆联作、失败返修或票号藏客回访后解锁。',
  },
  {
    id: 'craft-thangka-reverent-line',
    category: 'craft',
    title: '唐卡：礼法与度量',
    summary: '矿彩层染要求题材分寸、材料伦理和供展语境一起成立。',
    body: [
      '唐卡不能只当作稀有装饰。矿彩层染、度量补线和净室供展都需要尊重题材语境。',
      '度量补线失败会留下补彩返修，净室声誉链则会在高好感结局中继续发声。',
    ],
    craftId: 'thangka',
    npcIds: ['xy-losang'],
    tags: ['雪域', '唐卡', '礼法'],
    unlock: { anyTopics: ['thangka-collab', 'thangka-respect', 'mineral-layer', 'measure-line-failure', 'ritual-gallery-ledger'] },
    revealHint: '完成唐卡联作、净室来访或相关失败返修后解锁。',
  },
  {
    id: 'craft-jade-material-ethics',
    category: 'craft',
    title: '西域玉作：顺料伦理',
    summary: '玉料的水线、绺裂和来路会决定作品能不能长出声誉。',
    body: [
      '玉师阿月强调“因材施艺”：不能为了流行款式硬压玉料，而要顺着水线、绺裂和脂白走势开意。',
      '玉柜留样、复单和藏客回访会把材料判断写成可复看的声誉链，让西域玉作成为后期鉴材玩法的入口。',
    ],
    craftId: 'jade-carving',
    npcIds: ['xu-a-yue'],
    tags: ['西域', '玉作', '材料伦理'],
    unlock: { anyTopics: ['jade-collab', 'jade-cabinet-ledger', 'jade-cabinet-reputation', 'jade-ethics-ledger'] },
    revealHint: '完成玉作联作、玉柜留样或玉柜藏客回访后解锁。',
  },
  {
    id: 'craft-cloisonne-palace-standard',
    category: 'craft',
    title: '景泰蓝：宫造验样',
    summary: '铜胎、花丝和官样验收共同决定宫造订单能否站住。',
    body: [
      '景泰蓝中期目标强调跨区供铜、矿彩和宫造标准，不应成为开局刷钱点。',
      '官样验收分支会让协同采办 NPC、宫样题评和路线压力一起参与结算。',
    ],
    craftId: 'cloisonne',
    npcIds: ['jj-lan-daqi', 'jj-jin-suoniang'],
    tags: ['京畿', '景泰蓝', '宫造'],
    unlock: { anyTopics: ['cloisonne-collab', 'palace-standard', 'official-acceptance-collab', 'palace-order-ready'] },
    revealHint: '完成景泰蓝宫造联作或宫样采办后解锁。',
  },
  {
    id: 'craft-kiln-grading',
    category: 'craft',
    title: '瓷样分级',
    summary: '景德镇瓷线把开窑火色、青花分水和藏客复样串起来。',
    body: [
      '瓷样分级要求看火、看釉、看画坯浓淡，再决定哪些样器能进入后续复烧或藏客续订。',
      '这条链路让赣鄱不只是资源点，而是能反复回访的窑口生活圈。',
    ],
    craftId: 'jingdezhen-porcelain',
    npcIds: ['gp-wen-yaotou', 'gp-lan-yousheng'],
    tags: ['赣鄱', '景德镇瓷', '开窑'],
    unlock: { anyTopics: ['kiln-collab', 'kiln-grading', 'high-fire-craft', 'kiln-sample-archive'] },
    revealHint: '完成瓷镇联作、开窑会或瓷样珍品阁来访后解锁。',
  },
  {
    id: 'npc-collab-partner-network',
    category: 'npc',
    title: '协作者网络',
    summary: '多人联作会把旁支 NPC 写进作品履历和见闻。',
    body: [
      '多人联作不是简单加成。协同 NPC 不占用每日联作次数，却会获得自己的见闻和关系线索。',
      '当作品进入赠礼、鉴评、订单或结局时，协作者会成为可追溯的人情节点。',
    ],
    tags: ['联作', '协作者', '人物关系'],
    unlock: {
      anyTopics: [
        'collab-partner:collab-wang-paper-mount',
        'collab-partner:collab-yunsha-sun-cure',
        'collab-partner:collab-wen-kiln-open',
        'collab-partner:collab-lan-cloisonne-blue',
      ],
    },
    revealHint: '完成任意带协同 NPC 的多人联作后解锁。',
  },
  {
    id: 'npc-collector-return',
    category: 'npc',
    title: '藏客回访',
    summary: '珍品阁收藏后的复单和续订单会继续塑造人物后日谈。',
    body: [
      '藏客回访证明“收藏”不是交易终点。文房、推光、染样、净室和瓷样都能在复单后继续长出续订。',
      '这些声誉链会进入地区声望、NPC 见闻和高好感结局补句。',
    ],
    tags: ['珍品阁', '藏客', '续订单'],
    unlock: {
      anyTopics: [
        'collector-return',
        'collector-ledger-renewal',
        'polish-credit-ledger',
        'textile-color-ledger',
        'ritual-gallery-ledger',
        'kiln-grade-ledger',
      ],
    },
    revealHint: '完成任一荐藏复单后的藏客回访后解锁。',
  },
  {
    id: 'npc-spar-practice',
    category: 'npc',
    title: '切磋实践',
    summary: 'NPC 切磋把知识标签、好感和手艺成熟度转成实践记忆。',
    body: [
      '切磋不是闲聊，它会按 NPC 知识标签和玩家属性结算质量，并沉淀到 `spar:*` 见闻。',
      '这些实践记忆可作为未来人物线、师承线和工艺小游戏评价的接口。',
    ],
    tags: ['切磋', '师承', '实践'],
    unlock: { anyTopics: ['spar:calligraphy', 'spar:metalwork', 'spar:daily-life', 'spar:route-ledger'] },
    revealHint: '与具备切磋功能的 NPC 完成一次实践后解锁。',
  },
  {
    id: 'system-route-stability',
    category: 'system',
    title: '商路稳定',
    summary: '开路、护商、活动和订单都会改变路线是否可靠。',
    body: [
      '商路稳定让地图线有了经营后果。稳定越低，断供和高成本越容易出现。',
      '活动情报、NPC 指路、护商成功和订单交付都可以让路线从陌生变成熟路。',
    ],
    tags: ['商路', '断供', '路线稳定'],
    unlock: { anyTopics: ['route-risk', 'trade-ledger', 'route-accounting', 'official-route'] },
    revealHint: '通过路线活动、NPC 指路或护商了解路线风险后解锁。',
  },
  {
    id: 'system-supply-crisis',
    category: 'system',
    title: '断供危机',
    summary: '高风险路线会在季末把短缺推到玩家面前。',
    body: [
      '断供危机由已通商路、路线风险和地区声望共同触发。',
      '玩家可以垫资补货、派人护路或承受短缺；结果会进入镇务账簿，之后还能复盘稳路。',
    ],
    tags: ['断供', '镇务', '供应链'],
    unlock: { flags: ['supply-crisis-resolved'] },
    revealHint: '处理一次商路断供危机后解锁。',
  },
  {
    id: 'system-workshop-upgrades',
    category: 'system',
    title: '工坊整备',
    summary: '工具、台案、品牌和物流升级会长期影响制作。',
    body: [
      '工坊整备不是临时增益。升级会占用空间、需要维护，也会压低部分缺陷风险。',
      '二阶整备需要前置升级和扩建空间，要求玩家真正回到本地工坊点操作。',
    ],
    unlock: { flags: ['workshop-upgrade-craft:longquan-sword'] },
    revealHint: '在本地工坊安置任意整备后解锁。',
  },
  {
    id: 'system-focus-checks',
    category: 'system',
    title: '专注校准',
    summary: '察火候、卡准点、压线抢手记录每段工序的下手窗口。',
    body: [
      '专注校准是实时小游戏前的规则桥。当前用按钮选择记录下手判断，后续可由实际输入结果写回同一字段。',
      '这些记录会进入作品鉴评、品质维度、阶段风险和背包追溯。',
    ],
    unlock: { flags: ['craft-focus-check-used:celadon'] },
    revealHint: '完成一次带校准记录的制作后解锁。',
  },
  {
    id: 'npc-home-visit-gallery',
    category: 'npc',
    title: '珍品阁来访',
    summary: '高好感 NPC 会围绕陈列作品留下评价和后续订单。',
    body: [
      '家园来访让作品从库存变成人情节点：参观、题跋和收藏会留下不同记录。',
      '部分收藏分支会生成荐藏转介绍订单，并在结局报告里追加人物后日谈。',
    ],
    unlock: { topics: ['home-visit'] },
    revealHint: '邀请任意 NPC 进行家园来访后解锁。',
  },
  {
    id: 'route-escort-ledger',
    category: 'route',
    title: '护商账簿',
    summary: '护商把路线稳定、人物好感和断供风险连起来。',
    body: [
      '护商不是简单跑腿。部分路线会先生成选择型危机，玩家选择后才结算护商次数。',
      '路线稳定度会影响断供概率，断供结果还能进入镇务复盘。',
    ],
    unlock: { anyTopics: ['tea-horse-ledger', 'caravan-water-ledger', 'kiln-firewood', 'canal-tribute'] },
    revealHint: '与具备护商功能的 NPC 完成一次护商后解锁。',
  },
] satisfies LoreEntry[];

export const SUBREGION_LORE_ENTRIES = buildSubregionLoreEntries();

export const LORE_ENTRIES = [...MANUAL_LORE_ENTRIES, ...SUBREGION_LORE_ENTRIES] satisfies LoreEntry[];

export const LORE_ENTRY_INDEX: Record<string, LoreEntry> = Object.fromEntries(
  LORE_ENTRIES.map((entry) => [entry.id, entry]),
);
