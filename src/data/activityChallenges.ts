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
    id: 'bs-tea-horse-post-route',
    activityId: 'bs-tea-horse-post',
    miniGame: 'route_plan',
    title: '茶马开路',
    prompt: '马帮阿越把山路摊开，问你货轻还是路稳更要紧。',
  },
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
  ...routeChallengeSpecs.map((spec) => challengeFromSpec(spec, routeChoices)),
  ...appraiseChallengeSpecs.map((spec) => challengeFromSpec(spec, appraiseChoices)),
];

export const ACTIVITY_CHALLENGE_INDEX: Record<string, ActivityChallengeDef> = Object.fromEntries(
  ACTIVITY_CHALLENGES.map((challenge) => [challenge.activityId, challenge]),
);
