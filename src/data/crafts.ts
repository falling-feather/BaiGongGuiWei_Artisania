/**
 * 手艺数据 —— 数据驱动内容的核心。
 * 新增手艺 = 在此追加一个 Craft 对象，无需改动 engine 逻辑。
 * M0 内置两门手艺：蓝染、竹编。
 */
import type { Craft } from '../engine/types';

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
];

export const CRAFT_INDEX: Record<string, Craft> = Object.fromEntries(
  CRAFTS.map((craft) => [craft.id, craft]),
);
