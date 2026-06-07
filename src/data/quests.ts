/**
 * 任务目录 —— 由关联人物（vendor）发布，达到好感门槛且满足条件即可交付领赏。
 * condition 为纯函数（只读 GameState），保证可单测、可重放。
 *
 * 数据驱动：新增任务 = 在此追加一条 QuestDef。
 */
import type { QuestDef } from '../engine/types';

export const QUESTS: QuestDef[] = [
  {
    id: 'q-bamboo-basket',
    npcId: 'jn-bamboo-master',
    title: '周伯的竹篮',
    desc: '与篾匠周伯熟络后，他想请你亲手做出一件竹器，看看你的手艺。',
    requireAffinity: 16,
    condition: (s) => (s.resources.bambooWare ?? 0) >= 1,
    reward: { coin: 30, metrics: { spirit: 4, life: 2 } },
    completeLog: '把亲手编的竹器交给周伯，他眯眼端详良久，点头收下，{name}的手艺得了认可。',
  },
  {
    id: 'q-indigo-cloth',
    npcId: 'jn-indigo-keeper',
    title: '阿蓝的一匹布',
    desc: '阿蓝信任你后，托你染出一匹真正沉得下色的蓝布。',
    requireAffinity: 16,
    condition: (s) => (s.resources.indigoCloth ?? 0) >= 1,
    reward: { coin: 30, metrics: { heritage: 4, market: 2 } },
    completeLog: '阿蓝抚过你染的蓝布，赞它「蓝得正」，把祖传的养缸口诀讲与{name}听。',
  },
  {
    id: 'q-ning-stationery',
    npcId: 'jn-ning-ciqiu',
    title: '辞秋的文房考校',
    desc: '宁辞秋愿意替你的作品题跋，但先要看你是否懂得纸、墨与器物相称。',
    requireAffinity: 16,
    condition: (s) =>
      s.flags.includes('met-ning-poetry') &&
      (s.resources.paperSheet ?? 0) >= 1 &&
      (s.resources.inkStick ?? 0) >= 1,
    cost: { paperSheet: 1, inkStick: 1 },
    reward: {
      coin: 12,
      metrics: { spirit: 3 },
      attributes: { knowledge: 2, mind: 1 },
      flags: ['ning-stationery-ready'],
    },
    completeLog: '宁辞秋展纸试墨，终于收起挑剔神色：文房过关，{name}可带一件真作品来。'
  },
  {
    id: 'q-ning-inscription',
    npcId: 'jn-ning-ciqiu',
    title: '辞秋题跋',
    desc: '带来一件足够成色的代表作，请宁辞秋写下题跋，让作品有名、有作者、有文气。',
    requireAffinity: 24,
    condition: (s) =>
      s.completedQuests.includes('q-ning-stationery') &&
      s.itemInstances.some(
        (item) =>
          item.status !== 'gifted' &&
          item.quality >= 0.7 &&
          ['treasureSword', 'celadonWare', 'indigoCloth', 'oilpaperUmbrella'].includes(item.resourceId),
      ),
    reward: {
      metrics: { spirit: 5, heritage: 2 },
      attributes: { knowledge: 2, people: 1 },
      flags: ['ning-inscribed-masterwork'],
      inscribe: {
        resourceIds: ['treasureSword', 'celadonWare', 'indigoCloth', 'oilpaperUmbrella'],
        minQuality: 0.7,
        collaboratorNpcId: 'jn-ning-ciqiu',
        inscription: '器成于手，名立于心；愿此作入人间而不失其骨。',
      },
    },
    completeLog: '宁辞秋替{name}的作品落款题跋，承认这已不是一件无名货。'
  },
  {
    id: 'q-qiao-lantern-night',
    npcId: 'jn-qiao-zhaoye',
    title: '秦淮一盏夜灯',
    desc: '乔照夜只在黄昏后收灯面。若你真懂灯市，就带着夜里的谜面来交差。',
    requireAffinity: 8,
    condition: (s) => s.flags.includes('seen-qinhuai-lantern'),
    reward: {
      coin: 18,
      metrics: { life: 3, market: 1 },
      attributes: { people: 1, commerce: 1 },
      flags: ['qinhuai-night-order-done'],
    },
    completeLog: '乔照夜把你定下的灯面挂上桥头，秦淮水面亮起一排新灯。'
  },
  {
    id: 'q-longquan-first-sword',
    npcId: 'jn-lu-hanquan',
    title: '陆寒泉验剑',
    desc: '陆寒泉不看空话，只看你能不能按矿、铁、火、刃的次序打出一把龙泉剑。',
    requireAffinity: 16,
    condition: (s) =>
      (s.resources.treasureSword ?? 0) >= 1 &&
      s.itemInstances.some((item) => item.resourceId === 'treasureSword' && item.sourceCraftId === 'longquan-sword'),
    reward: {
      coin: 28,
      metrics: { heritage: 3, spirit: 3 },
      attributes: { craft: 2, stamina: 1 },
      flags: ['longquan-first-sword-approved'],
    },
    completeLog: '陆寒泉听剑出鞘，低声说{name}已经懂得“铁净、火稳、刃正”的第一层。'
  },
  {
    id: 'q-bashu-qingshen-bamboo',
    npcId: 'bs-luo-qingmie',
    title: '青神细篾样',
    desc: '罗青篾要看你是不是只把竹当便宜材料。带来足够顺直的竹料或做出一件能入样的竹器。',
    requireAffinity: 12,
    condition: (s) =>
      (s.resources.bambooRaw ?? 0) >= 2 ||
      (s.resources.bambooSplit ?? 0) >= 2 ||
      (s.resources.qingshenBamboo ?? 0) >= 1 ||
      (s.resources.bambooWare ?? 0) >= 1,
    reward: {
      coin: 18,
      resources: { bambooSplit: 2 },
      metrics: { heritage: 2, life: 1 },
      attributes: { craft: 1, stamina: 1 },
      flags: ['bashu-bamboo-sample-approved'],
    },
    completeLog: '罗青篾抽出一缕细篾，确认{name}没有把竹性看轻。巴蜀竹料线可以放心接进百工院。'
  },
  {
    id: 'q-bashu-tea-horse-snow-pass',
    npcId: 'bs-mabang-ayue',
    title: '马帮雪口路书',
    desc: '阿越不先收路资，只问你有没有真正走过茶马驿，把风口、货重和熟人记明白。',
    requireAffinity: 8,
    condition: (s) => s.completedActivities.includes('bs-tea-horse-post') || s.flags.includes('heard-snow-pass'),
    reward: {
      coin: 12,
      metrics: { market: 1, life: 1 },
      attributes: { commerce: 1, stamina: 1 },
      flags: ['bashu-mabang-roadbook', 'route-known:route-bashu-qiandian-tea-horse', 'route-known:route-bashu-xueyu-snow-pass'],
    },
    completeLog: '马帮阿越替{name}把雪口和南线都画进路书：快慢可以商量，敬畏不能省。'
  },
  {
    id: 'q-qiandian-silver-etiquette',
    npcId: 'qd-yinniang-alan',
    title: '苗银不是空花',
    desc: '银娘阿岚愿意教你看纹样礼法，但要先确认你带来的银饰不是只图亮。',
    requireAffinity: 12,
    condition: (s) => (s.resources.silverOrnament ?? 0) >= 1 || s.completedActivities.includes('qd-miao-silver-shop'),
    reward: {
      coin: 20,
      metrics: { heritage: 2, spirit: 2 },
      attributes: { craft: 1, people: 1 },
      flags: ['qiandian-silver-etiquette'],
    },
    completeLog: '银娘阿岚把纹样来历一一讲给{name}听：银饰先是礼，再是器。'
  },
  {
    id: 'q-qiandian-tea-road-contact',
    npcId: 'qd-mu-luozi',
    title: '铃声认路',
    desc: '木骡子要你真正走一回茶马驿道，再谈黔楚矿路和茶马南线的熟人。',
    requireAffinity: 8,
    condition: (s) => s.completedActivities.includes('qd-tea-horse-road') || s.flags.includes('tea-horse-contact'),
    reward: {
      coin: 10,
      metrics: { market: 1 },
      attributes: { commerce: 1, stamina: 1 },
      flags: ['qiandian-tea-road-contact', 'route-known:route-bashu-qiandian-tea-horse', 'route-known:route-qiandian-jingchu-mine'],
    },
    completeLog: '木骡子听{name}复述铃声和风向，点头把黔楚矿苗山路的熟人名写在路引背面。'
  },
  {
    id: 'q-jingji-official-nameproof',
    npcId: 'jj-song-yasi',
    title: '官署名帖',
    desc: '宋押司要看的不是钱袋，而是来路、凭据和有人愿意担保的样货名声。',
    requireAffinity: 8,
    condition: (s) => s.completedActivities.includes('jj-official-gate') || s.flags.includes('met-palace-clerk'),
    reward: {
      coin: 10,
      metrics: { market: 2 },
      attributes: { commerce: 1, people: 1 },
      flags: ['jingji-official-permit', 'route-known:route-jiangnan-jingji-canal', 'route-known:route-jingji-sanjin-official'],
    },
    completeLog: '宋押司替{name}把名帖压上官署印角：门可以开，但货名也要担得住。'
  },
  {
    id: 'q-jingji-cloisonne-sample',
    npcId: 'jj-lan-daqi',
    title: '景泰蓝小样',
    desc: '蓝大器要一件真正铜胎、掐丝、点蓝都站得住的小样，才肯把宫造订单往你这里递。',
    requireAffinity: 16,
    condition: (s) =>
      (s.resources.cloisonne ?? 0) >= 1 ||
      s.itemInstances.some((item) => item.resourceId === 'cloisonne' && item.status !== 'gifted' && item.quality >= 0.6),
    reward: {
      coin: 42,
      metrics: { heritage: 2, market: 3 },
      attributes: { craft: 2, commerce: 1 },
      flags: ['jingji-cloisonne-sample-approved'],
    },
    completeLog: '蓝大器挑完铜胎和丝线，终于说{name}这件小样可以进宫造候单。'
  },
  {
    id: 'q-lingnan-export-ledger',
    npcId: 'ln-wu-haichao',
    title: '珠江船期账',
    desc: '伍海潮要你先在珠江货栈摸清船期和货名，再谈外销订单与护商。',
    requireAffinity: 8,
    condition: (s) => s.completedActivities.includes('ln-pearl-river-harbor') || s.flags.includes('lingnan-export-contact'),
    reward: {
      coin: 16,
      metrics: { market: 2, life: 1 },
      attributes: { commerce: 2, people: 1 },
      flags: ['lingnan-export-ledger', 'route-known:route-qiandian-lingnan-harbor'],
    },
    completeLog: '伍海潮把船期抄给{name}：外销先看货名，再看风向，最后才看谁喊价更高。'
  },
  {
    id: 'q-lingnan-gambiered-sun',
    npcId: 'ln-he-yunsha',
    title: '莨绸晒场的耐心',
    desc: '何云纱要你亲自去晒场看过日光、河泥与反复浸染，才肯把染整手法接入百工院。',
    requireAffinity: 12,
    condition: (s) => s.completedActivities.includes('ln-gambiered-yard') || (s.resources.gambieredSilk ?? 0) >= 1,
    reward: {
      coin: 22,
      metrics: { heritage: 2, spirit: 1 },
      attributes: { craft: 1, mind: 2 },
      flags: ['lingnan-gambiered-sun-method'],
    },
    completeLog: '何云纱见{name}没有催快晒场，便把“看天、看泥、看丝性”的口诀写进工簿。'
  },
  {
    id: 'q-jingchu-water-ledger',
    npcId: 'jc-qinglu',
    title: '江湖水路凭风',
    desc: '船娘清芦要确认你在渡口市集听过风向和水路规矩，再替你引见江湖熟船。',
    requireAffinity: 8,
    condition: (s) => s.completedActivities.includes('jc-ferry-market'),
    reward: {
      coin: 12,
      metrics: { market: 1, life: 1 },
      attributes: { commerce: 1, stamina: 1 },
      flags: ['jingchu-water-ledger', 'route-known:route-bashu-jingchu-river', 'route-known:route-qiandian-jingchu-mine', 'route-known:route-jingchu-ganpo-lake'],
    },
    completeLog: '清芦听{name}说完芦荡风向，给了三条熟船名号：江湖路可以走，但不能欺水。'
  },
  {
    id: 'q-ganpo-kiln-firewood',
    npcId: 'gp-chai-yazi',
    title: '窑柴不只是柴',
    desc: '柴牙子要看你是否明白窑期、柴价和水路互相牵动，而不是只会往炉里添煤。',
    requireAffinity: 8,
    condition: (s) => s.completedActivities.includes('gp-river-wood-yard') || (s.resources.coal ?? 0) >= 2 || (s.resources.timber ?? 0) >= 1,
    reward: {
      coin: 14,
      resources: { coal: 1 },
      metrics: { market: 1 },
      attributes: { commerce: 1, knowledge: 1 },
      flags: ['ganpo-kiln-firewood-ledger', 'route-known:route-jiangnan-ganpo-kiln', 'route-known:route-jingchu-ganpo-lake', 'route-known:route-ganpo-huizhou-merchant'],
    },
    completeLog: '柴牙子把一笔窑柴账摊给{name}看：火候在窑里，风险在路上。'
  },
  {
    id: 'q-huizhou-paper-ink-pledge',
    npcId: 'hz-wang-zhiniang',
    title: '纸墨要经得住题跋',
    desc: '汪纸娘不急着卖纸，她要确认你知道纸、墨、砚与作品题名之间的关系。',
    requireAffinity: 12,
    condition: (s) =>
      s.completedActivities.includes('hz-paper-valley') ||
      ((s.resources.paperSheet ?? 0) >= 1 && ((s.resources.inkStick ?? 0) >= 1 || (s.resources.huiInk ?? 0) >= 1)),
    reward: {
      coin: 18,
      resources: { paperSheet: 1 },
      metrics: { spirit: 2, heritage: 1 },
      attributes: { knowledge: 2, mind: 1 },
      flags: ['huizhou-paper-ink-pledge', 'route-known:route-jiangnan-huizhou-paper', 'route-known:route-ganpo-huizhou-merchant'],
    },
    completeLog: '汪纸娘把一张薄而有骨的纸交给{name}：能载字，也要能载名声。'
  },
  {
    id: 'q-sanjin-piaohao-credit',
    npcId: 'sj-lei-zhanggui',
    title: '票号信用小票',
    desc: '雷掌柜不先借钱，只让你在日升票号过一遍押货和兑付规矩。',
    requireAffinity: 8,
    condition: (s) => s.completedActivities.includes('sj-piaohao') || s.flags.includes('piaohao-credit'),
    reward: {
      coin: 16,
      metrics: { market: 2 },
      attributes: { commerce: 2, people: 1 },
      flags: ['sanjin-piaohao-credit-note', 'route-known:route-jingji-sanjin-official'],
    },
    completeLog: '雷掌柜给{name}开出一张小额信用票：钱可借，名声不可透支。'
  },
  {
    id: 'q-xueyu-snow-pass-supply',
    npcId: 'xy-yak-captain',
    title: '雪山驿口补给',
    desc: '牦牛队长要你证明自己知道高寒路上的货重、补给和风口，再谈雪域远行。',
    requireAffinity: 8,
    condition: (s) => s.completedActivities.includes('xy-snow-pass') || s.flags.includes('snow-pass-known'),
    reward: {
      coin: 12,
      metrics: { life: 1 },
      attributes: { stamina: 2, commerce: 1 },
      flags: ['xueyu-snow-pass-supply', 'route-known:route-bashu-xueyu-snow-pass', 'route-known:route-xueyu-xiyu-caravan'],
    },
    completeLog: '牦牛队长把风口和补给点标给{name}：少带虚货，多给路留余地。'
  },
  {
    id: 'q-xiyu-caravan-contract',
    npcId: 'xu-tuoling-shu',
    title: '驼队护商契约',
    desc: '驼铃叔要你先去驿站摸清沙路补给，再签第一份西域护商契约。',
    requireAffinity: 8,
    condition: (s) => s.completedActivities.includes('xiyu-caravan-post') || s.flags.includes('caravan-route-known'),
    reward: {
      coin: 14,
      metrics: { market: 1, life: 1 },
      attributes: { stamina: 1, commerce: 2 },
      flags: ['xiyu-caravan-contract', 'route-known:route-xueyu-xiyu-caravan'],
    },
    completeLog: '驼铃叔把第一份护商契约塞给{name}：沙路可以赚钱，但不许侥幸。'
  },
  {
    id: 'q-xiyu-jade-by-material',
    npcId: 'xu-a-yue',
    title: '因材施艺',
    desc: '玉师阿月要看你是否愿意先相玉、顺绺裂，而不是一上来就按流行样式动刀。',
    requireAffinity: 12,
    condition: (s) => s.completedActivities.includes('xiyu-jade-yard') || (s.resources.jadeRough ?? 0) >= 1,
    reward: {
      coin: 24,
      metrics: { heritage: 2, spirit: 1 },
      attributes: { knowledge: 2, craft: 1 },
      flags: ['xiyu-jade-by-material'],
    },
    completeLog: '阿月见{name}愿意先看玉性，才准你记下“因材施艺”四字。'
  },
];

export const QUEST_INDEX: Record<string, QuestDef> = Object.fromEntries(
  QUESTS.map((q) => [q.id, q]),
);

/** 取某 NPC 发布的任务 */
export function questsForNpc(npcId: string): QuestDef[] {
  return QUESTS.filter((q) => q.npcId === npcId);
}
