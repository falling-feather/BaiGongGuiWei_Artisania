import type { ActivityChallengeDef } from '../engine/types';

type ChallengeSpec = Pick<ActivityChallengeDef, 'id' | 'activityId' | 'miniGame' | 'title' | 'prompt'>;

const routeChoices = [
  {
    id: 'fast-risk',
    label: '走最快的近路，压缩脚程',
    quality: 0.48,
    feedback: '领路人提醒：快路省时，也最容易丢掉货与人情。',
  },
  {
    id: 'steady-ledger',
    label: '按货重、人情与天气重排路线',
    quality: 0.9,
    feedback: '账面和路面都稳了，同行的人也愿意听你调度。',
  },
  {
    id: 'cheap-route',
    label: '只选最省路费的一线',
    quality: 0.58,
    feedback: '省下的钱是真，绕出来的误期也是真。',
  },
];

const appraiseChoices = [
  {
    id: 'surface-bright',
    label: '先挑最亮、最显眼的一件',
    quality: 0.45,
    feedback: '师傅摇头：光在皮上，性子未必在里头。',
  },
  {
    id: 'texture-sound',
    label: '看纹理、听声口，再定取舍',
    quality: 0.92,
    feedback: '这一手稳，能把材料自己的话听出来。',
  },
  {
    id: 'heavy-price',
    label: '按分量和市价先估高低',
    quality: 0.62,
    feedback: '价能先算，品却还要靠眼和手补上。',
  },
];

const dialogueChoices = [
  {
    id: 'plain-demand',
    label: '直说来意，立刻索要答复',
    quality: 0.5,
    feedback: '话是说清了，只是对方还没被你说服。',
  },
  {
    id: 'name-proof',
    label: '先报来路与凭据，再谈条件',
    quality: 0.88,
    feedback: '有名、有据、有分寸，门槛便低了一些。',
  },
  {
    id: 'soft-delay',
    label: '只寒暄，不触正题',
    quality: 0.56,
    feedback: '气氛不坏，但事情仍停在门外。',
  },
];

const traceChoices = [
  {
    id: 'copy-shape',
    label: '照着线稿追外形',
    quality: 0.58,
    feedback: '形能守住，笔意还未入心。',
  },
  {
    id: 'measure-before-line',
    label: '先定比例和中线，再落笔',
    quality: 0.9,
    feedback: '度量先稳，后面的线才有归处。',
  },
  {
    id: 'free-hand',
    label: '凭手感直接起稿',
    quality: 0.42,
    feedback: '胆气有了，规矩却散得太快。',
  },
];

const routeChallengeSpecs: ChallengeSpec[] = [
  {
    id: 'ln-pearl-river-harbor-route',
    activityId: 'ln-pearl-river-harbor',
    miniGame: 'route_plan',
    title: '珠江船期',
    prompt: '伍海潮把船期、潮水和样货摆在同一张账上。',
  },
  {
    id: 'qd-tea-horse-road-route',
    activityId: 'qd-tea-horse-road',
    miniGame: 'route_plan',
    title: '铃声认路',
    prompt: '木骡子让你听风铃，判断茶马道今日该走哪条线。',
  },
  {
    id: 'jc-ferry-market-route',
    activityId: 'jc-ferry-market',
    miniGame: 'route_plan',
    title: '芦荡水路',
    prompt: '船娘清芦指着水面风向，等你安排渡口顺序。',
  },
  {
    id: 'gp-river-wood-yard-route',
    activityId: 'gp-river-wood-yard',
    miniGame: 'route_plan',
    title: '窑柴河运',
    prompt: '柴牙子把窑柴码成山，要你在窑期和路费之间取舍。',
  },
  {
    id: 'hz-merchant-hall-route',
    activityId: 'hz-merchant-hall',
    miniGame: 'route_plan',
    title: '徽商押货',
    prompt: '程远舟翻开账册，先看你的商誉，再看远商路费。',
  },
  {
    id: 'sj-piaohao-route',
    activityId: 'sj-piaohao',
    miniGame: 'route_plan',
    title: '票号汇路',
    prompt: '雷掌柜要你把汇兑、借贷和押货风险排成一条线。',
  },
  {
    id: 'xy-snow-pass-route',
    activityId: 'xy-snow-pass',
    miniGame: 'route_plan',
    title: '雪山驿口',
    prompt: '牦牛队长把风口标在雪上，提醒你少带虚货。',
  },
  {
    id: 'xiyu-bazaar-trade-route',
    activityId: 'xiyu-bazaar-trade',
    miniGame: 'route_plan',
    title: '绿洲议价',
    prompt: '胡商萨里笑着开价，话里三分货，七分路。',
  },
  {
    id: 'xiyu-caravan-post-route',
    activityId: 'xiyu-caravan-post',
    miniGame: 'route_plan',
    title: '驼队补给',
    prompt: '驼铃叔把水袋挂到驼背上，要你先算沙路损耗。',
  },
];

const appraiseChallengeSpecs: ChallengeSpec[] = [
  {
    id: 'ln-duan-inkstone-pit-appraise',
    activityId: 'ln-duan-inkstone-pit',
    miniGame: 'appraise_select',
    title: '端石听声',
    prompt: '谭砚伯敲了三块端石，要你听哪块声音更润。',
  },
  {
    id: 'hz-she-stone-pit-appraise',
    activityId: 'hz-she-stone-pit',
    miniGame: 'appraise_select',
    title: '歙石辨纹',
    prompt: '许砚石不说答案，只让你把石声和纹理记在心里。',
  },
  {
    id: 'jj-appraisal-market-appraise',
    activityId: 'jj-appraisal-market',
    miniGame: 'appraise_select',
    title: '都门掌眼',
    prompt: '孟掌眼把器物转了半圈，三句话里有两句是价。',
  },
  {
    id: 'xy-pigment-valley-appraise',
    activityId: 'xy-pigment-valley',
    miniGame: 'appraise_select',
    title: '矿彩辨色',
    prompt: '石彩童递来一块彩石，颜色沉得像雪下的火。',
  },
  {
    id: 'xiyu-jade-yard-appraise',
    activityId: 'xiyu-jade-yard',
    miniGame: 'appraise_select',
    title: '昆仑相玉',
    prompt: '玉师阿月不让你先下刀，只让你顺着绺裂看半日。',
  },
];

function challengeFromSpec(spec: ChallengeSpec, choices: ActivityChallengeDef['choices']): ActivityChallengeDef {
  return { ...spec, choices };
}

export const ACTIVITY_CHALLENGES: ActivityChallengeDef[] = [
  {
    id: 'jn-lanxi-orchid-couplet',
    activityId: 'jn-lanxi-orchid',
    miniGame: 'couplet_choice',
    title: '兰溪题跋',
    prompt: '宁辞秋折下一枝幽兰，要你为旧诗补一句收束。',
    choices: [
      {
        id: 'plain-scent',
        label: '风过竹阴，花香自远',
        quality: 0.72,
        feedback: '宁辞秋点头：意在，字还直了些。',
      },
      {
        id: 'hidden-scent',
        label: '不争春色，独抱幽芳',
        quality: 0.94,
        feedback: '宁辞秋莞尔：这句有骨，兰也肯随你回去。',
      },
      {
        id: 'market-flower',
        label: '折来好花，市上争看',
        quality: 0.46,
        feedback: '宁辞秋合上扇子：太急着卖相，反失了兰意。',
      },
    ],
  },
  {
    id: 'jn-qinhuai-lantern-riddle',
    activityId: 'jn-qinhuai-lantern',
    miniGame: 'couplet_choice',
    title: '秦淮灯谜',
    prompt: '乔照夜问你灯面该怎样写，才既热闹又不俗。',
    choices: [
      {
        id: 'bright-price',
        label: '金粉满河，价高者得',
        quality: 0.38,
        feedback: '乔照夜摇头：这像账帖，不像灯谜。',
      },
      {
        id: 'river-moon',
        label: '一水藏千月，万人共一灯',
        quality: 0.9,
        feedback: '乔照夜拍案：好，灯面有水气，人也愿意停步。',
      },
      {
        id: 'plain-luck',
        label: '明灯照路，岁岁平安',
        quality: 0.66,
        feedback: '乔照夜说：稳妥，可少了些秦淮夜色。',
      },
    ],
    rounds: [
      {
        id: 'lantern-face',
        prompt: '乔照夜问你灯面该怎样写，才既热闹又不俗。',
        choices: [
          {
            id: 'bright-price',
            label: '金粉满河，价高者得',
            quality: 0.38,
            feedback: '乔照夜摇头：这像账帖，不像灯谜。',
          },
          {
            id: 'river-moon',
            label: '一水藏千月，万人共一灯',
            quality: 0.9,
            feedback: '乔照夜拍案：好，灯面有水气，人也愿意停步。',
          },
          {
            id: 'plain-luck',
            label: '明灯照路，岁岁平安',
            quality: 0.66,
            feedback: '乔照夜说：稳妥，可少了些秦淮夜色。',
          },
        ],
      },
      {
        id: 'riddle-bone',
        prompt: '灯骨扎好后，文客要猜“灯里藏的匠心”。你该把谜底落在哪一处？',
        choices: [
          {
            id: 'bamboo-shadow',
            label: '让谜底应在竹篾暗扣，猜中者能看见骨法',
            quality: 0.88,
            feedback: '乔照夜点头：灯谜不只猜字，也该让人猜到手艺。',
          },
          {
            id: 'painted-front',
            label: '把谜底直接写在正面，免得客人猜不出',
            quality: 0.46,
            feedback: '乔照夜叹气：太直，灯还没亮，兴味先散了。',
          },
          {
            id: 'hidden-riddle',
            label: '藏进最偏的纸角，只让老客慢慢琢磨',
            quality: 0.62,
            feedback: '乔照夜说：有巧思，可灯市人多，不能只照顾少数。',
          },
        ],
      },
      {
        id: 'guest-flow',
        prompt: '收谜时人潮渐密，摊前该怎样留住猜中和未猜中的人？',
        choices: [
          {
            id: 'tea-and-proof',
            label: '猜中者题签，未中者续茶，再引去看灯屏工序',
            quality: 0.92,
            feedback: '乔照夜笑道：这才是灯市，谜、人情和买卖都能接上。',
          },
          {
            id: 'scholar-only',
            label: '只留最会猜的文客，题名越雅越好',
            quality: 0.54,
            feedback: '乔照夜压低声音：雅是雅了，摊前却冷了半边。',
          },
          {
            id: 'quick-prize',
            label: '猜中即发小礼，立刻催下一拨上前',
            quality: 0.69,
            feedback: '乔照夜说：热闹能起，可少了些记得住的情分。',
          },
        ],
      },
    ],
  },
  {
    id: 'bs-tea-horse-post-route',
    activityId: 'bs-tea-horse-post',
    miniGame: 'route_plan',
    title: '茶马会路书',
    prompt: '马帮阿越把货重、脚力和雪口消息摊开，问你这一轮茶马会该先稳哪条路。',
    choices: routeChoices,
    rounds: [
      {
        id: 'load-weight',
        prompt: '开驿验货时，脚夫先看茶篓和竹器怎么分担。你怎样安排第一担？',
        choices: [
          {
            id: 'balanced-load',
            label: '茶篓、竹器和人手按坡度重排',
            quality: 0.9,
            feedback: '阿越点头：这担货轻重分得明白，脚夫愿意听你调度。',
          },
          {
            id: 'tea-only',
            label: '只把茶样摆在最前，别让杂货抢眼',
            quality: 0.56,
            feedback: '茶样好看，可山路不是货架，竹器和脚力账也得有人管。',
          },
          {
            id: 'fast-pack',
            label: '催脚夫快装快走，赶在午前出山',
            quality: 0.42,
            feedback: '脚程压快了，货倒先乱了，阿越把路书又按回桌上。',
          },
        ],
      },
      {
        id: 'barter-route',
        prompt: '换货议路时，边茶客商和雪口向导同时问价。你先接哪边？',
        choices: [
          {
            id: 'ledger-before-price',
            label: '先给茶商看货样簿，再请向导补雪口规矩',
            quality: 0.88,
            feedback: '价钱和规矩都落到账上，茶商敢订，向导也愿意多说一段路。',
          },
          {
            id: 'highest-bid',
            label: '谁出价高就先把货给谁',
            quality: 0.5,
            feedback: '钱声响亮，却让向导觉得你还没把山路当回事。',
          },
          {
            id: 'guide-only',
            label: '只围着雪口向导问路，茶商先晾着',
            quality: 0.64,
            feedback: '路问出来了，货约却冷了半截。',
          },
        ],
      },
      {
        id: 'closing-ledger',
        prompt: '封账认路前，阿越让你把这一轮茶马会留成可追记忆。你怎么收尾？',
        choices: [
          {
            id: 'route-and-load-ledger',
            label: '货重、脚力、雪口和来季茶约一并入簿',
            quality: 0.94,
            feedback: '这本茶马簿既能分担货，也能让下一程知道该听谁的路。',
          },
          {
            id: 'sales-ledger-only',
            label: '只记卖了多少茶，路上的事下次再说',
            quality: 0.58,
            feedback: '账面有钱，山路却没有记忆。',
          },
          {
            id: 'verbal-road',
            label: '让脚夫口头记住，不必写得太细',
            quality: 0.36,
            feedback: '阿越摇头：山路最会忘人，凭据少一笔，风险多一分。',
          },
        ],
      },
    ],
  },
  {
    id: 'bs-linqiong-forge-fire',
    activityId: 'bs-linqiong-forge',
    miniGame: 'timing_hold',
    title: '临邛看火',
    prompt: '邓炉生把矿石、炭仓和炉口火色摊给你看，先问这一炉该稳住哪一处。',
    choices: [
      {
        id: 'coal-then-white-heat',
        label: '先筛干炭，再等火色将白未白时出铁',
        quality: 0.92,
        feedback: '邓炉生点头：炭稳、火净，铁性才不会散。',
      },
      {
        id: 'ore-heavy-first',
        label: '只挑最重的矿料，火候后面再补',
        quality: 0.56,
        feedback: '矿重未必铁净，炉口一急，铁锭里会带脆性。',
      },
      {
        id: 'blast-fast',
        label: '猛添风火，赶在山雾起来前出炉',
        quality: 0.42,
        feedback: '火势起得太躁，邓炉生把铁钳按回架上，叫你重看火舌。',
      },
    ],
  },
  {
    id: 'ln-foshan-forge-fire',
    activityId: 'ln-foshan-forge',
    miniGame: 'timing_hold',
    title: '佛山看炉',
    prompt: '梁铁线把铁料、炉口和锤案排成一线，问你这一件旧铁器该先稳哪一手。',
    choices: [
      {
        id: 'slow-heat-steady-hammer',
        label: '先稳炉温，再按旧器裂口轻锤续韧',
        quality: 0.91,
        feedback: '梁铁线说：火不躁，锤不乱，旧铁器才接得住新韧劲。',
      },
      {
        id: 'heavy-hammer-first',
        label: '趁铁红先重锤定形，裂口后面再补',
        quality: 0.55,
        feedback: '形是压住了，可旧裂口也被锤得更亮，师傅让你回看火色。',
      },
      {
        id: 'rush-hot-sale',
        label: '按买主催期快烧快打，先赶出货',
        quality: 0.43,
        feedback: '火候和锤路都急了，祠堂前的订单牌反倒被梁铁线翻到背面。',
      },
    ],
  },
  {
    id: 'qd-dongchuan-mine-vein',
    activityId: 'qd-dongchuan-mine',
    miniGame: 'timing_hold',
    title: '东川听脉',
    prompt: '铜山客把矿灯、铜脉和炉账摆在洞口，问你这一筐矿该先稳哪一处。',
    choices: [
      {
        id: 'listen-vein-then-smelt',
        label: '先听矿脉回声，再按成色分筐入炉',
        quality: 0.91,
        feedback: '铜山客点头：脉声、成色和炉账对得上，铜料才不虚耗。',
      },
      {
        id: 'hammer-rich-seam',
        label: '只追最亮的富矿脉，趁早多凿几筐',
        quality: 0.55,
        feedback: '富矿诱人，可山腹一空，下一炉反倒缺了稳料。',
      },
      {
        id: 'rush-mine-cart',
        label: '催矿车快进快出，炉口缺料再补',
        quality: 0.43,
        feedback: '矿车跑得急，筛洗和炉温都乱了，铜山客把矿灯按低让你重听。',
      },
    ],
  },
  {
    id: 'ln-qilou-night-market-route',
    activityId: 'ln-qilou-night-market',
    miniGame: 'route_plan',
    title: '骑楼船期夜账',
    prompt: '伍海潮把骑楼灯、船期、雨棚和外销样货排成一张夜账，等你定下今晚先稳哪一头。',
    choices: routeChoices,
    rounds: [
      {
        id: 'awning-opening',
        prompt: '开市前，雨棚下挤着外销客、街坊和文房买主。你先怎么摆第一张案？',
        choices: [
          {
            id: 'ship-date-first',
            label: '先把船期、样货和交付时限写清',
            quality: 0.9,
            feedback: '伍海潮点头：灯可以热闹，船期不能含糊。',
          },
          {
            id: 'lantern-bright-first',
            label: '先把最鲜亮的货挂到街口招人',
            quality: 0.58,
            feedback: '人是围过来了，可谁赶船、谁只看热闹还分不清。',
          },
          {
            id: 'cheap-supper-first',
            label: '先用低价茶点把人流圈住',
            quality: 0.48,
            feedback: '街坊有了，外销客却嫌你还没拿出能上船的凭据。',
          },
        ],
      },
      {
        id: 'night-bargain',
        prompt: '夜市正旺，晒场货样、石湾陶和端砚买主同时问价。你怎么接话？',
        choices: [
          {
            id: 'proof-before-price',
            label: '先报货样来路，再按船期分批议价',
            quality: 0.88,
            feedback: '价钱落在凭据后面，客人知道这不是随口叫卖。',
          },
          {
            id: 'highest-bid-only',
            label: '谁肯加价就先给谁',
            quality: 0.5,
            feedback: '钱声响亮，伍海潮却皱眉：船期一乱，后账更贵。',
          },
          {
            id: 'friend-chat-only',
            label: '多留街坊聊天，外销客先等等',
            quality: 0.62,
            feedback: '人情暖了，但货栈那边已经开始算误期。',
          },
        ],
      },
      {
        id: 'closing-shipping-ledger',
        prompt: '收摊前，伍海潮要你把骑楼夜市留成下次可复查的凭据。你封哪本账？',
        choices: [
          {
            id: 'ship-date-ledger',
            label: '把样货、雨棚人流、船期和复样约一并归档',
            quality: 0.94,
            feedback: '这本账能让下一船知道货从哪来，也知道人情从哪接。',
          },
          {
            id: 'sales-only-ledger',
            label: '只记今晚卖了多少，余下口头说明',
            quality: 0.55,
            feedback: '账面看着清，等船回来复样时却少了许多凭据。',
          },
          {
            id: 'supper-goodwill-ledger',
            label: '只记街坊茶席人情，外销样货另说',
            quality: 0.66,
            feedback: '骑楼烟火留下了，可伍海潮提醒你：外销线也要有回头路。',
          },
        ],
      },
    ],
  },
  {
    id: 'jn-longquan-sword-appraise',
    activityId: 'jn-longquan-sword-forge',
    miniGame: 'appraise_select',
    title: '龙泉相铁',
    prompt: '陆寒泉摆出三份矿料，要你挑一份入炉试声。',
    choices: [
      {
        id: 'flashy-ore',
        label: '挑最亮的矿，火猛些快出铁',
        quality: 0.42,
        feedback: '陆寒泉皱眉：亮未必净，火躁则铁脆。',
      },
      {
        id: 'dense-ring',
        label: '取纹理细密、敲声沉清的一份',
        quality: 0.96,
        feedback: '陆寒泉颔首：铁净而火不躁，算是听懂了第一句。',
      },
      {
        id: 'heavy-only',
        label: '只看分量，越沉越好',
        quality: 0.58,
        feedback: '陆寒泉说：沉是底子，还要看脉与声。',
      },
    ],
  },
  {
    id: 'jn-yard-fields-calendar',
    activityId: 'jn-yard-fields',
    miniGame: 'crop_calendar',
    title: '田圃节气',
    prompt: '小满把靛草、桑、茶三块田交给你，要定下今日次序。',
    choices: [
      {
        id: 'rain-seed',
        label: '雨前看苗色，晴时补水，按节气轮作',
        quality: 0.92,
        feedback: '小满笑着把水瓢递来：记住这个顺序，田就肯回话。',
      },
      {
        id: 'water-all',
        label: '三块田都猛浇一遍，省得再跑',
        quality: 0.44,
        feedback: '小满急忙拦住：水多也伤根，懒办法不养苗。',
      },
      {
        id: 'tea-first',
        label: '先顾茶树，桑和靛草明日再看',
        quality: 0.63,
        feedback: '小满说：懂得轻重，但别让另一头断了季候。',
      },
    ],
  },
  {
    id: 'jn-lake-tea-house-listen',
    activityId: 'jn-lake-tea-house',
    miniGame: 'dialogue_check',
    title: '湖畔听闻',
    prompt: '茶汤将沸，邻桌商人正谈徽州纸谷的路价。',
    choices: [
      {
        id: 'rush-ask',
        label: '立刻插话追问纸价',
        quality: 0.52,
        feedback: '苏小茶轻咳一声：茶还没稳，人情也没稳。',
      },
      {
        id: 'serve-before-ask',
        label: '先稳茶汤，再顺势问路',
        quality: 0.88,
        feedback: '苏小茶替你续水：这样问，客人才愿意多说一句。',
      },
      {
        id: 'ignore-talk',
        label: '专心烹茶，不问闲话',
        quality: 0.68,
        feedback: '苏小茶说：茶是好了，只是少带回一点消息。',
      },
    ],
  },
  {
    id: 'jn-paper-umbrella-frame',
    activityId: 'jn-paper-umbrella-shop',
    miniGame: 'appraise_select',
    title: '伞骨齐整',
    prompt: '林雨桥让你挑伞骨，先看哪一项最要紧。',
    choices: [
      {
        id: 'paint-first',
        label: '先挑颜色鲜亮的伞面',
        quality: 0.5,
        feedback: '林雨桥说：颜色能添喜，骨不齐就撑不住雨。',
      },
      {
        id: 'even-frame',
        label: '先验伞骨长短、开合是否齐',
        quality: 0.9,
        feedback: '林雨桥点头：伞骨齐，雨声才齐。',
      },
      {
        id: 'cheap-bamboo',
        label: '挑最省料的竹篾，留些本钱',
        quality: 0.4,
        feedback: '林雨桥把竹篾放回去：省在骨上，坏在客手里。',
      },
    ],
  },
  {
    id: 'hz-ink-workshop-rhythm',
    activityId: 'hz-ink-workshop',
    miniGame: 'rhythm',
    title: '松烟捶墨',
    prompt: '程墨守把松烟、胶料和墨模排开，要你先稳哪一道劲。',
    choices: [
      {
        id: 'soot-glue-rhythm',
        label: '先分松烟细度，再按锤声和胶性入模',
        quality: 0.9,
        feedback: '墨锤落得稳，程墨守说这锭墨有骨也有润。',
      },
      {
        id: 'heavy-hammer-fast',
        label: '加重锤头赶快成型',
        quality: 0.46,
        feedback: '墨锭成得快，浮气却没散，落纸时容易发灰。',
      },
      {
        id: 'gold-pattern-first',
        label: '先描金纹样，墨性后面再补',
        quality: 0.58,
        feedback: '纹样显眼，但程墨守提醒：墨先要能写，再谈好看。',
      },
    ],
  },
  {
    id: 'jj-official-gate-dialogue',
    activityId: 'jj-official-gate',
    miniGame: 'dialogue_check',
    title: '官署问名',
    prompt: '宋押司不看你带多少货，先问这货是谁保的名。',
    choices: dialogueChoices,
  },
  {
    id: 'xy-thangka-court-trace',
    activityId: 'xy-thangka-court',
    miniGame: 'calligraphy_trace',
    title: '度量起稿',
    prompt: '洛桑画师先讲度量经，再许你调一笔矿彩。',
    choices: traceChoices,
  },
  {
    id: 'gp-blue-painting-room-water',
    activityId: 'gp-blue-painting-room',
    miniGame: 'calligraphy_trace',
    title: '青花分水',
    prompt: '蓝釉生让你在坯面分出青料浓淡，问你先抢线还是先匀色。',
    choices: [
      {
        id: 'outline-then-shade',
        label: '先勾线骨，再逐层分水',
        quality: 0.9,
        feedback: '线骨立住，分水才有依傍，浓淡五色自然分明。',
      },
      {
        id: 'flood-color-fast',
        label: '趁湿快铺一遍青料',
        quality: 0.5,
        feedback: '色是上去了，浓淡却糊在一处，烧出来怕发闷。',
      },
      {
        id: 'thin-wash-only',
        label: '只敢薄薄罩一层淡青',
        quality: 0.62,
        feedback: '稳是稳了，可青花少了浓淡，纹样显得寡淡。',
      },
    ],
  },
  {
    id: 'gp-kiln-opening-fair-fire',
    activityId: 'gp-kiln-opening-fair',
    miniGame: 'timing_hold',
    title: '瓷镇开窑',
    prompt: '窑头老温让你先看试片火色，再决定这批瓷样如何分级、留样和开单。',
    choices: [
      {
        id: 'open-by-flame',
        label: '先看火舌余温，再开试片',
        quality: 0.9,
        feedback: '老温点头：火气未散，先看余温，开窑才不被表面光骗了。',
      },
      {
        id: 'open-by-clock',
        label: '按预定时辰立刻开窑',
        quality: 0.48,
        feedback: '老温皱眉：钟点只记人心，火色才记窑性。',
      },
      {
        id: 'sell-before-check',
        label: '先把亮面瓷样摆出去',
        quality: 0.42,
        feedback: '瓷行客看得快，追问也快；没验窑位，亮面反倒露怯。',
      },
    ],
    rounds: [
      {
        id: 'test-shard-fire',
        prompt: '试片刚出窑，你先看哪一处来判断火候是否到位？',
        choices: [
          {
            id: 'flame-and-ring',
            label: '看火舌余温、听瓷声，再记窑位',
            quality: 0.92,
            feedback: '火、声、位三处对上，这批瓷样才有分级的底气。',
          },
          {
            id: 'gloss-only',
            label: '只挑釉面最亮的一片',
            quality: 0.46,
            feedback: '亮光有时是浮的，不记窑位，复烧就无从对样。',
          },
          {
            id: 'delay-all',
            label: '全都先封回去，明日再看',
            quality: 0.58,
            feedback: '谨慎是好事，可开窑会的人气和火色都等不得太久。',
          },
        ],
      },
      {
        id: 'market-grading',
        prompt: '瓷行客围上来问价，你怎样把这一窑分成可卖、可留样和需返修三类？',
        choices: [
          {
            id: 'grade-by-position',
            label: '按窑位、釉厚和题材逐件验级',
            quality: 0.9,
            feedback: '老温说：分级不是压价，是给下一窑留一把尺。',
          },
          {
            id: 'all-premium',
            label: '统称上品，先把价抬起来',
            quality: 0.4,
            feedback: '瓷行客听着热闹，却更不敢开复烧单。',
          },
          {
            id: 'cheap-bundle',
            label: '把好坏瓷样混成一包走量',
            quality: 0.52,
            feedback: '账面快了，火色名声却被一包带混。',
          },
        ],
      },
      {
        id: 'river-ledger',
        prompt: '封窑归档前，柴牙子提醒船期和柴口也要写进账。你怎么收尾？',
        choices: [
          {
            id: 'fire-and-route-ledger',
            label: '火色、窑位、柴口、船期一并入簿',
            quality: 0.94,
            feedback: '这张簿能让瓷商对样，也能让柴船知道下一窑何时该到。',
          },
          {
            id: 'porcelain-only-ledger',
            label: '只记瓷样，不管柴路',
            quality: 0.62,
            feedback: '瓷样留住了，下一窑的火却还悬在船期上。',
          },
          {
            id: 'verbal-promise',
            label: '让客人先口头记下，省得写账',
            quality: 0.38,
            feedback: '老温摇头：口头能热一阵，复烧要靠凭据。',
          },
        ],
      },
    ],
  },
  {
    id: 'sj-coal-iron-yard-fire',
    activityId: 'sj-coal-iron-yard',
    miniGame: 'timing_hold',
    title: '煤铁验火',
    prompt: '窑塬汉把煤、铁矿和驮车账摆在炉口，要你先稳哪一处。',
    choices: [
      {
        id: 'dry-coal-clear-ring',
        label: '先筛干煤，再听铁声定炉温',
        quality: 0.9,
        feedback: '煤干、铁声清，窑塬汉说这批重货才有资格入保票账。',
      },
      {
        id: 'ore-first',
        label: '只挑铁矿分量，煤火后面再补',
        quality: 0.56,
        feedback: '矿是重了，火却不稳，驮车账还要多记一笔损耗。',
      },
      {
        id: 'rush-smoke',
        label: '猛添煤快出炉，赶在驮车前装货',
        quality: 0.42,
        feedback: '炉口烟重，铁声发闷，窑塬汉把保票账又压回桌上。',
      },
    ],
  },
  {
    id: 'sj-vinegar-yard-ferment',
    activityId: 'sj-vinegar-yard',
    miniGame: 'timing_hold',
    title: '醋坊封坛',
    prompt: '醋郎中掀开缸口，让你在酸香、晒醅和封坛日之间定下账面。',
    choices: [
      {
        id: 'thick-aroma-ledger',
        label: '先闻酸香厚薄，再记晒醅和封坛日',
        quality: 0.9,
        feedback: '酸气厚而不冲，醋郎中说这才是饭铺敢按日用账收的醋。',
      },
      {
        id: 'seal-by-date',
        label: '按日子直接封坛，少开缸免得走味',
        quality: 0.58,
        feedback: '日子有了，酸香却没记清，送铺子时还会被追问。',
      },
      {
        id: 'strong-sour-fast',
        label: '取最冲的一缸先送，味重才显得够老',
        quality: 0.4,
        feedback: '醋郎中摇头：冲不是厚，日用账最怕一口坏口碑。',
      },
    ],
  },
  {
    id: 'xy-silver-tent-inlay',
    activityId: 'xy-silver-tent',
    miniGame: 'aim_place',
    title: '银帐嵌石',
    prompt: '白银叔把银片、松石和经幡纹样摊开，要你先定哪一处能压住祝祷。',
    choices: [
      {
        id: 'fit-stone-to-prayer',
        label: '先按祝祷纹样定嵌石位置，再收银边',
        quality: 0.9,
        feedback: '白银叔点头：石位稳，纹样才不会只是好看。',
      },
      {
        id: 'bright-stone-first',
        label: '先挑最亮的松石放在正中',
        quality: 0.55,
        feedback: '松石抢眼，却未必合佩戴位置，银边还要重收。',
      },
      {
        id: 'hammer-fast',
        label: '先把银片锤薄，嵌石后面再说',
        quality: 0.42,
        feedback: '锤得快，银片却硬，嵌口会跟着虚。',
      },
    ],
  },
  {
    id: 'xiyu-atlas-loom-tie-dye',
    activityId: 'xiyu-atlas-loom',
    miniGame: 'aim_place',
    title: '艾德莱斯扎经',
    prompt: '丝娘古丽把三束经线摊开，要你先决定云霞色从哪里跳起。',
    choices: [
      {
        id: 'mark-warp-before-dye',
        label: '先按色档标经位，再分段入染',
        quality: 0.9,
        feedback: '古丽点头：经位先稳，颜色跳起来才不乱。',
      },
      {
        id: 'bright-color-first',
        label: '先染最鲜亮的一束，把客人眼神抓住',
        quality: 0.54,
        feedback: '颜色亮了，纹路却没接上，古丽把色档又摊开一遍。',
      },
      {
        id: 'weave-before-set',
        label: '先上机试织，染色细节等成匹后再补',
        quality: 0.42,
        feedback: '织机声急，经线却还没说清楚要往哪儿走。',
      },
    ],
  },
  ...routeChallengeSpecs.map((spec) => challengeFromSpec(spec, routeChoices)),
  ...appraiseChallengeSpecs.map((spec) => challengeFromSpec(spec, appraiseChoices)),
];

export const ACTIVITY_CHALLENGE_INDEX: Record<string, ActivityChallengeDef> = Object.fromEntries(
  ACTIVITY_CHALLENGES.map((challenge) => [challenge.activityId, challenge]),
);
