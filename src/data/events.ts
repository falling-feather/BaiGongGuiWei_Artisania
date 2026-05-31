/**
 * 事件卡数据。每张事件是一个「带后果的选择」，呼应「张力而非答案」支柱。
 * 新增事件 = 在此追加一个 GameEvent，无需改动 engine 逻辑。
 */
import type { GameEvent } from '../engine/types';

export const EVENTS: GameEvent[] = [
  {
    id: 'trend-shift',
    title: '审美风向突变',
    description: '城里流行起「极简性冷淡」，传统繁复纹样被嫌「土气」。是否顺应潮流简化设计？',
    weight: 3,
    choices: [
      {
        id: 'follow',
        label: '顺应潮流，简化纹样',
        effect: {
          metrics: { market: 8, heritage: -6, spirit: -4 },
          logMessage: '你顺应了潮流，订单回暖，但老匠人摇头叹息。',
        },
      },
      {
        id: 'resist',
        label: '坚持传统纹样',
        effect: {
          metrics: { heritage: 6, spirit: 4, market: -5 },
          logMessage: '你坚持了传统，口碑在小圈子里更硬，但生意冷清了些。',
        },
      },
    ],
  },
  {
    id: 'material-shortage',
    title: '原料告急',
    description: '今年雨水不调，蓝草与好竹都减产，原料价格飞涨。',
    weight: 2,
    choices: [
      {
        id: 'stockpile',
        label: '高价囤积原料',
        effect: {
          resources: { plantDye: 3, bamboo: 3 },
          metrics: { market: -6 },
          logMessage: '你咬牙囤了原料，手头紧了，但保住了生产。',
        },
      },
      {
        id: 'substitute',
        label: '改用替代材料',
        effect: {
          metrics: { market: 4, heritage: -7 },
          logMessage: '替代材料压低了成本，却也悄悄稀释了技艺的纯正。',
        },
      },
    ],
  },
  {
    id: 'media-feature',
    title: '媒体探访',
    description: '一位纪录片导演想拍摄百工镇的手艺日常，但要求「足够上镜」。',
    weight: 2,
    choices: [
      {
        id: 'welcome',
        label: '热情配合拍摄',
        effect: {
          metrics: { market: 6, life: 5, spirit: -3 },
          logMessage: '镜头带来了流量与订单，也带来了一丝表演感。',
        },
      },
      {
        id: 'decline',
        label: '婉拒，专心做活',
        effect: {
          metrics: { spirit: 5, heritage: 2, market: -2 },
          logMessage: '你婉拒了喧嚣，匠人们得以安心打磨手艺。',
        },
      },
    ],
  },
];
