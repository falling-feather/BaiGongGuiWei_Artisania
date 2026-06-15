import { describe, expect, it } from 'vitest';
import { ACTIVITY_INDEX, PRIORITY_SCOPE_REQUIREMENTS, RUNTIME_MAP_LAYOUTS } from '..';

interface PriorityMapLayoutCase {
  subregionId: string;
  industryIds?: string[];
  craftIds?: string[];
  activityIds?: string[];
  npcIds?: string[];
  subregionGateIds?: string[];
  regionGateIds?: string[];
}

const PRIORITY_MAP_LAYOUT_CASES: PriorityMapLayoutCase[] = [
  {
    subregionId: 'jiangnan-suhang',
    industryIds: ['harvest-indigo', 'build-indigo', 'harvest-bamboo', 'split-bamboo'],
    craftIds: ['indigo-dyeing', 'bamboo-weaving'],
    npcIds: ['jn-bamboo-master', 'jn-indigo-keeper'],
    subregionGateIds: ['jiangnan-longquan', 'jiangnan-jinling', 'jiangnan-linan', 'jiangnan-taihu', 'jiangnan-baigongyuan'],
    regionGateIds: ['huizhou', 'ganpo'],
  },
  {
    subregionId: 'jiangnan-longquan',
    industryIds: ['harvest-iron-ore', 'harvest-coal', 'smelt-iron', 'harvest-kaolin', 'mine-kaolin', 'forge-sword'],
    craftIds: ['longquan-sword', 'celadon'],
    activityIds: ['jn-longquan-sword-forge', 'jn-celadon-kiln'],
    npcIds: ['jn-lu-hanquan', 'jn-ye-qingzhan'],
    subregionGateIds: ['jiangnan-suhang', 'jiangnan-linan', 'jiangnan-jinling', 'jiangnan-taihu', 'jiangnan-baigongyuan'],
    regionGateIds: ['huizhou', 'ganpo'],
  },
  {
    subregionId: 'jiangnan-jinling',
    industryIds: ['harvest-cocoon', 'sericulture', 'weave-brocade'],
    craftIds: ['kesi'],
    activityIds: ['jn-qinhuai-lantern', 'jn-gold-leaf-shop', 'jn-lanxi-orchid'],
    npcIds: ['jn-qiao-zhaoye', 'jn-ning-ciqiu'],
    subregionGateIds: ['jiangnan-longquan', 'jiangnan-suhang', 'jiangnan-taihu', 'jiangnan-baigongyuan'],
    regionGateIds: ['jingji', 'ganpo', 'huizhou'],
  },
  {
    subregionId: 'jiangnan-baigongyuan',
    craftIds: ['indigo-dyeing', 'bamboo-weaving'],
    activityIds: ['jn-yard-fields'],
    npcIds: ['jn-xiaoman'],
    subregionGateIds: ['jiangnan-suhang', 'jiangnan-jinling', 'jiangnan-longquan', 'jiangnan-linan', 'jiangnan-taihu'],
  },
  {
    subregionId: 'bashu-bamboo-sea',
    industryIds: ['harvest-bamboo', 'split-bamboo', 'harvest-tea-leaf', 'pick-tea'],
    craftIds: ['qingshen-bamboo'],
    activityIds: ['bs-bamboo-sea'],
    npcIds: ['bs-luo-qingmie'],
    subregionGateIds: ['bashu-jinli', 'bashu-linqiong-iron', 'bashu-tea-horse'],
    regionGateIds: ['qiandian', 'jingchu', 'xueyu'],
  },
  {
    subregionId: 'bashu-jinli',
    industryIds: [],
    craftIds: ['shu-brocade', 'shu-embroidery', 'chengdu-lacquer'],
    activityIds: ['bs-jinguan-loom'],
    npcIds: ['bs-zhuo-jinniang'],
    subregionGateIds: ['bashu-bamboo-sea', 'bashu-tea-horse', 'bashu-linqiong-iron'],
    regionGateIds: ['qiandian', 'jingchu'],
  },
  {
    subregionId: 'bashu-linqiong-iron',
    industryIds: ['harvest-iron-ore', 'smelt-iron'],
    activityIds: ['bs-linqiong-forge'],
    npcIds: ['bs-deng-lusheng'],
    subregionGateIds: ['bashu-jinli', 'bashu-bamboo-sea', 'bashu-tea-horse'],
    regionGateIds: ['qiandian', 'jingchu', 'xueyu'],
  },
  {
    subregionId: 'bashu-tea-horse',
    industryIds: ['harvest-tea-leaf', 'pick-tea'],
    activityIds: ['bs-tea-horse-post'],
    npcIds: ['bs-mabang-ayue'],
    subregionGateIds: ['bashu-jinli', 'bashu-bamboo-sea', 'bashu-linqiong-iron'],
    regionGateIds: ['qiandian', 'xueyu'],
  },
  {
    subregionId: 'lingnan-gambiered-yard',
    industryIds: ['harvest-cocoon', 'sericulture'],
    craftIds: ['gambiered-silk'],
    activityIds: ['ln-gambiered-yard'],
    npcIds: ['ln-he-yunsha'],
    subregionGateIds: ['lingnan-harbor', 'lingnan-forge', 'lingnan-duan-stone'],
    regionGateIds: ['qiandian'],
  },
  {
    subregionId: 'lingnan-harbor',
    industryIds: ['harvest-cocoon', 'sericulture'],
    craftIds: ['canton-embroidery', 'zhuang-brocade'],
    activityIds: ['ln-pearl-river-harbor', 'ln-qilou-night-market'],
    npcIds: ['ln-wu-haichao'],
    subregionGateIds: ['lingnan-gambiered-yard', 'lingnan-forge', 'lingnan-duan-stone'],
    regionGateIds: ['qiandian'],
  },
  {
    subregionId: 'lingnan-forge',
    industryIds: ['harvest-iron-ore', 'smelt-iron'],
    activityIds: ['ln-foshan-forge'],
    npcIds: ['ln-liang-tiexian'],
    subregionGateIds: ['lingnan-harbor', 'lingnan-gambiered-yard', 'lingnan-duan-stone'],
    regionGateIds: ['qiandian'],
  },
  {
    subregionId: 'lingnan-duan-stone',
    craftIds: ['duan-inkstone', 'shiwan-pottery'],
    activityIds: ['ln-duan-inkstone-pit'],
    npcIds: ['ln-tan-yanbo'],
    subregionGateIds: ['lingnan-harbor', 'lingnan-forge', 'lingnan-gambiered-yard'],
    regionGateIds: ['qiandian'],
  },
  {
    subregionId: 'qiandian-miao-village',
    industryIds: ['harvest-silver-ore', 'refine-silver', 'harvest-indigo', 'build-indigo'],
    craftIds: ['miao-silver', 'batik', 'wutong-silver', 'indigo-dyeing'],
    activityIds: ['qd-miao-silver-shop', 'qd-batik-yard'],
    npcIds: ['qd-yinniang-alan', 'qd-danqing-sao'],
    subregionGateIds: ['qiandian-tea-road', 'qiandian-dongchuan-copper'],
    regionGateIds: ['bashu', 'lingnan', 'jingchu'],
  },
  {
    subregionId: 'qiandian-tea-road',
    industryIds: ['harvest-tea-leaf', 'pick-tea'],
    activityIds: ['qd-tea-horse-road'],
    npcIds: ['qd-mu-luozi'],
    subregionGateIds: ['qiandian-miao-village', 'qiandian-dongchuan-copper'],
    regionGateIds: ['bashu', 'lingnan', 'jingchu'],
  },
  {
    subregionId: 'qiandian-dongchuan-copper',
    industryIds: ['harvest-copper-ore', 'smelt-copper'],
    craftIds: ['jianshui-pottery'],
    activityIds: ['qd-dongchuan-mine'],
    npcIds: ['qd-tongshan-ke'],
    subregionGateIds: ['qiandian-miao-village', 'qiandian-tea-road'],
    regionGateIds: ['bashu', 'lingnan', 'jingchu'],
  },
  {
    subregionId: 'jingchu-chu-lacquer',
    industryIds: ['harvest-lacquer', 'tap-lacquer'],
    craftIds: ['chu-lacquer'],
    activityIds: ['jc-chu-lacquer-yard'],
    npcIds: ['jc-xiong-zhuxi'],
    subregionGateIds: ['jingchu-lake-market', 'jingchu-mine-yard', 'jingchu-xiang-embroidery'],
    regionGateIds: ['bashu', 'qiandian', 'ganpo'],
  },
  {
    subregionId: 'jingchu-lake-market',
    craftIds: ['tujia-brocade'],
    activityIds: ['jc-ferry-market'],
    npcIds: ['jc-qinglu'],
    subregionGateIds: ['jingchu-chu-lacquer', 'jingchu-mine-yard', 'jingchu-xiang-embroidery'],
    regionGateIds: ['bashu', 'qiandian', 'ganpo'],
  },
  {
    subregionId: 'jingchu-mine-yard',
    industryIds: ['harvest-copper-ore', 'harvest-iron-ore', 'smelt-copper', 'smelt-iron'],
    activityIds: ['jc-daye-mine'],
    npcIds: ['jc-yeshu'],
    subregionGateIds: ['jingchu-lake-market', 'jingchu-chu-lacquer', 'jingchu-xiang-embroidery'],
    regionGateIds: ['bashu', 'qiandian', 'ganpo'],
  },
  {
    subregionId: 'jingchu-xiang-embroidery',
    industryIds: ['harvest-cocoon', 'sericulture'],
    craftIds: ['xiang-embroidery'],
    activityIds: ['jc-xiang-embroidery'],
    npcIds: ['jc-wen-xiuniang'],
    subregionGateIds: ['jingchu-lake-market', 'jingchu-chu-lacquer', 'jingchu-mine-yard'],
    regionGateIds: ['bashu', 'qiandian', 'ganpo'],
  },
  {
    subregionId: 'ganpo-kiln-town',
    industryIds: ['harvest-kaolin', 'mine-kaolin'],
    craftIds: ['jingdezhen-porcelain'],
    activityIds: ['gp-throwing-room', 'gp-blue-painting-room', 'gp-dragon-kiln', 'gp-kiln-opening-fair'],
    npcIds: ['gp-tang-pishou', 'gp-lan-yousheng', 'gp-wen-yaotou'],
    subregionGateIds: ['ganpo-kaolin-hill', 'ganpo-river-wood'],
    regionGateIds: ['jiangnan', 'huizhou', 'jingchu'],
  },
  {
    subregionId: 'ganpo-kaolin-hill',
    industryIds: ['harvest-kaolin', 'mine-kaolin'],
    activityIds: ['gp-kaolin-hill'],
    npcIds: ['gp-shi-bai'],
    subregionGateIds: ['ganpo-kiln-town', 'ganpo-river-wood'],
    regionGateIds: ['jiangnan', 'huizhou', 'jingchu'],
  },
  {
    subregionId: 'ganpo-river-wood',
    industryIds: ['harvest-coal'],
    craftIds: ['xiabu'],
    activityIds: ['gp-river-wood-yard'],
    npcIds: ['gp-chai-yazi'],
    subregionGateIds: ['ganpo-kiln-town', 'ganpo-kaolin-hill'],
    regionGateIds: ['jiangnan', 'huizhou', 'jingchu'],
  },
  {
    subregionId: 'huizhou-paper-valley',
    industryIds: ['harvest-qingtan', 'make-paper', 'harvest-tea-leaf', 'pick-tea'],
    craftIds: ['xuan-paper'],
    activityIds: ['hz-paper-valley'],
    npcIds: ['hz-wang-zhiniang'],
    subregionGateIds: ['huizhou-ink-alley', 'huizhou-she-stone', 'huizhou-merchant-hall'],
    regionGateIds: ['jiangnan', 'ganpo'],
  },
  {
    subregionId: 'huizhou-ink-alley',
    industryIds: ['harvest-pine-soot', 'make-ink'],
    craftIds: ['hui-ink'],
    activityIds: ['hz-ink-workshop'],
    npcIds: ['hz-cheng-moshou'],
    subregionGateIds: ['huizhou-paper-valley', 'huizhou-she-stone', 'huizhou-merchant-hall'],
    regionGateIds: ['jiangnan', 'ganpo'],
  },
  {
    subregionId: 'huizhou-she-stone',
    industryIds: ['harvest-she-stone'],
    craftIds: ['she-inkstone'],
    activityIds: ['hz-she-stone-pit'],
    npcIds: ['hz-xu-yanshi'],
    subregionGateIds: ['huizhou-paper-valley', 'huizhou-ink-alley', 'huizhou-merchant-hall'],
    regionGateIds: ['jiangnan', 'ganpo'],
  },
  {
    subregionId: 'huizhou-merchant-hall',
    industryIds: ['harvest-tea-leaf', 'pick-tea'],
    craftIds: ['hui-carving'],
    activityIds: ['hz-merchant-hall'],
    npcIds: ['hz-cheng-yuanzhou'],
    subregionGateIds: ['huizhou-paper-valley', 'huizhou-ink-alley', 'huizhou-she-stone'],
    regionGateIds: ['jiangnan', 'ganpo'],
  },
  {
    subregionId: 'jingji-palace-yard',
    industryIds: ['harvest-iron-ore', 'harvest-pigment', 'smelt-iron'],
    craftIds: ['cloisonne', 'filigree', 'carved-lacquer'],
    activityIds: ['jj-cloisonne-yard', 'jj-filigree-shop'],
    npcIds: ['jj-lan-daqi', 'jj-jin-suoniang'],
    subregionGateIds: ['jingji-market-gate', 'jingji-official-gate'],
    regionGateIds: ['sanjin', 'jiangnan'],
  },
  {
    subregionId: 'jingji-official-gate',
    activityIds: ['jj-official-gate'],
    npcIds: ['jj-song-yasi'],
    subregionGateIds: ['jingji-palace-yard', 'jingji-market-gate'],
    regionGateIds: ['sanjin', 'jiangnan'],
  },
  {
    subregionId: 'jingji-market-gate',
    craftIds: ['inner-painting'],
    activityIds: ['jj-appraisal-market'],
    npcIds: ['jj-meng-zhangyan'],
    subregionGateIds: ['jingji-palace-yard', 'jingji-official-gate'],
    regionGateIds: ['sanjin', 'jiangnan'],
  },
  {
    subregionId: 'sanjin-lacquer-yard',
    industryIds: ['harvest-lacquer', 'tap-lacquer'],
    craftIds: ['pingyao-lacquer'],
    activityIds: ['sj-pingyao-lacquer'],
    npcIds: ['sj-pingyao-qipo'],
    subregionGateIds: ['sanjin-piaohao', 'sanjin-coal-yard', 'sanjin-vinegar-yard'],
    regionGateIds: ['jingji'],
  },
  {
    subregionId: 'sanjin-piaohao',
    craftIds: ['jin-furniture'],
    activityIds: ['sj-piaohao'],
    npcIds: ['sj-lei-zhanggui'],
    subregionGateIds: ['sanjin-lacquer-yard', 'sanjin-coal-yard', 'sanjin-vinegar-yard'],
    regionGateIds: ['jingji'],
  },
  {
    subregionId: 'sanjin-coal-yard',
    industryIds: ['harvest-coal', 'harvest-iron-ore', 'smelt-iron'],
    activityIds: ['sj-coal-iron-yard'],
    npcIds: ['sj-yaoyuan-han'],
    subregionGateIds: ['sanjin-piaohao', 'sanjin-lacquer-yard', 'sanjin-vinegar-yard'],
    regionGateIds: ['jingji'],
  },
  {
    subregionId: 'sanjin-vinegar-yard',
    craftIds: ['aged-vinegar'],
    activityIds: ['sj-vinegar-yard'],
    npcIds: ['sj-cu-langzhong'],
    subregionGateIds: ['sanjin-piaohao', 'sanjin-coal-yard', 'sanjin-lacquer-yard'],
    regionGateIds: ['jingji'],
  },
  {
    subregionId: 'xueyu-thangka-court',
    industryIds: ['harvest-pigment', 'grind-pigment', 'make-paper'],
    craftIds: ['thangka', 'tibetan-paper', 'tibetan-incense'],
    activityIds: ['xy-thangka-court'],
    npcIds: ['xy-losang'],
    subregionGateIds: ['xueyu-snow-pass', 'xueyu-pigment-valley', 'xueyu-silver-tent'],
    regionGateIds: ['bashu', 'xiyu'],
  },
  {
    subregionId: 'xueyu-snow-pass',
    activityIds: ['xy-snow-pass'],
    npcIds: ['xy-yak-captain'],
    subregionGateIds: ['xueyu-thangka-court', 'xueyu-pigment-valley', 'xueyu-silver-tent'],
    regionGateIds: ['bashu', 'xiyu'],
  },
  {
    subregionId: 'xueyu-pigment-valley',
    industryIds: ['harvest-pigment', 'grind-pigment'],
    activityIds: ['xy-pigment-valley'],
    npcIds: ['xy-shicai-tong'],
    subregionGateIds: ['xueyu-snow-pass', 'xueyu-thangka-court', 'xueyu-silver-tent'],
    regionGateIds: ['bashu', 'xiyu'],
  },
  {
    subregionId: 'xueyu-silver-tent',
    industryIds: ['harvest-silver-ore', 'refine-silver'],
    craftIds: ['tibetan-silver'],
    activityIds: ['xy-silver-tent'],
    npcIds: ['xy-baiyinshu'],
    subregionGateIds: ['xueyu-snow-pass', 'xueyu-thangka-court', 'xueyu-pigment-valley'],
    regionGateIds: ['bashu', 'xiyu'],
  },
  {
    subregionId: 'xiyu-jade-yard',
    industryIds: ['harvest-copper-ore', 'smelt-copper'],
    craftIds: ['jade-carving'],
    activityIds: ['xiyu-jade-yard'],
    npcIds: ['xu-a-yue'],
    subregionGateIds: ['xiyu-bazaar', 'xiyu-caravan-post', 'xiyu-atlas-loom'],
    regionGateIds: ['xueyu'],
  },
  {
    subregionId: 'xiyu-bazaar',
    industryIds: ['harvest-cocoon', 'sericulture'],
    craftIds: ['carpet', 'copperware'],
    activityIds: ['xiyu-bazaar-trade'],
    npcIds: ['xu-sali'],
    subregionGateIds: ['xiyu-jade-yard', 'xiyu-caravan-post', 'xiyu-atlas-loom'],
    regionGateIds: ['xueyu'],
  },
  {
    subregionId: 'xiyu-caravan-post',
    industryIds: [],
    activityIds: ['xiyu-caravan-post'],
    npcIds: ['xu-tuoling-shu'],
    subregionGateIds: ['xiyu-bazaar', 'xiyu-jade-yard', 'xiyu-atlas-loom'],
    regionGateIds: ['xueyu'],
  },
  {
    subregionId: 'xiyu-atlas-loom',
    industryIds: ['harvest-cocoon', 'sericulture'],
    craftIds: ['atlas-silk'],
    activityIds: ['xiyu-atlas-loom'],
    npcIds: ['xu-guli'],
    subregionGateIds: ['xiyu-bazaar', 'xiyu-jade-yard', 'xiyu-caravan-post'],
    regionGateIds: ['xueyu'],
  },
];

const PRIORITY_N4_ACTIVITY_TARGET_LAYOUT_IDS = [
  'qiandian-tea-road',
  'jingchu-lake-market',
  'huizhou-merchant-hall',
  'jingji-official-gate',
  'sanjin-piaohao',
];

const M1_ADDITIONAL_SHIPPED_LAYOUT_IDS = [
  'jiangnan-suhang',
  'jiangnan-baigongyuan',
  'ganpo-kaolin-hill',
  'ganpo-river-wood',
  'huizhou-ink-alley',
  'huizhou-she-stone',
  'bashu-linqiong-iron',
  'lingnan-forge',
  'lingnan-duan-stone',
  'qiandian-dongchuan-copper',
  'jingchu-mine-yard',
  'jingchu-xiang-embroidery',
  'jingji-market-gate',
  'sanjin-coal-yard',
  'sanjin-vinegar-yard',
  'xueyu-snow-pass',
  'xueyu-pigment-valley',
  'xueyu-silver-tent',
  'xiyu-atlas-loom',
];

function layoutFor(subregionId: string) {
  const layout = RUNTIME_MAP_LAYOUTS.find((item) => item.subregionId === subregionId);
  if (!layout) throw new Error(`Missing runtime map layout ${subregionId}`);
  return layout;
}

describe('priority runtime map layout entrypoints', () => {
  it('tracks every current-priority shipped layout in the N4 matrix', () => {
    const requiredLayoutIds = new Set(
      PRIORITY_SCOPE_REQUIREMENTS.flatMap((requirement) => requirement.requiredLayoutSubregionIds).concat(
        PRIORITY_N4_ACTIVITY_TARGET_LAYOUT_IDS,
        M1_ADDITIONAL_SHIPPED_LAYOUT_IDS,
      ),
    );
    const matrixLayoutIds = new Set(PRIORITY_MAP_LAYOUT_CASES.map((testCase) => testCase.subregionId));

    expect(matrixLayoutIds).toEqual(requiredLayoutIds);
  });

  it.each(PRIORITY_MAP_LAYOUT_CASES)('keeps $subregionId key interactions shipped', (testCase) => {
    const layout = layoutFor(testCase.subregionId);
    const errors: string[] = [];

    for (const industryId of testCase.industryIds ?? []) {
      if (!layout.objects.some((object) => object.interaction === 'industry' && object.targetId === industryId)) {
        errors.push(`${testCase.subregionId}: missing industry ${industryId}`);
      }
    }

    for (const craftId of testCase.craftIds ?? []) {
      if (!layout.objects.some((object) => object.interaction === 'craft' && object.targetId === craftId)) {
        errors.push(`${testCase.subregionId}: missing craft ${craftId}`);
      }
    }

    for (const activityId of testCase.activityIds ?? []) {
      if (!layout.objects.some((object) => object.interaction === 'activity' && object.targetId === activityId)) {
        errors.push(`${testCase.subregionId}: missing activity ${activityId}`);
      }
    }

    for (const npcId of testCase.npcIds ?? []) {
      if (!layout.objects.some((object) => object.interaction === 'npc' && object.npcId === npcId)) {
        errors.push(`${testCase.subregionId}: missing NPC ${npcId}`);
      }
    }

    for (const gateId of testCase.subregionGateIds ?? []) {
      if (!layout.objects.some((object) => object.interaction === 'subregionGate' && object.targetId === gateId)) {
        errors.push(`${testCase.subregionId}: missing subregion gate ${gateId}`);
      }
    }

    for (const gateId of testCase.regionGateIds ?? []) {
      if (!layout.objects.some((object) => object.interaction === 'gate' && object.targetId === gateId)) {
        errors.push(`${testCase.subregionId}: missing region gate ${gateId}`);
      }
    }

    expect(errors).toEqual([]);
  });

  it('keeps N2 skeleton entry layouts connected to their scoped activity subregions', () => {
    const errors: string[] = [];

    for (const requirement of PRIORITY_SCOPE_REQUIREMENTS.filter((entry) => entry.tier === 'skeleton')) {
      for (const subregionId of requirement.requiredLayoutSubregionIds) {
        const layout = layoutFor(subregionId);

        for (const activityId of requirement.requiredActivityIds) {
          const activity = ACTIVITY_INDEX[activityId];
          if (!activity) {
            errors.push(`${requirement.regionId}: missing activity ${activityId}`);
            continue;
          }

          const isLocalActivity = activity.subregionId === subregionId;
          const hasLocalActivityObject = layout.objects.some(
            (object) => object.interaction === 'activity' && object.targetId === activityId,
          );
          const hasSubregionGateToActivity = layout.objects.some(
            (object) => object.interaction === 'subregionGate' && object.targetId === activity.subregionId,
          );

          if (isLocalActivity && !hasLocalActivityObject) {
            errors.push(`${subregionId}: missing local skeleton activity ${activityId}`);
          }
          if (!isLocalActivity && !hasSubregionGateToActivity) {
            errors.push(`${subregionId}: missing gate to ${activity.subregionId} for ${activityId}`);
          }
        }
      }
    }

    expect(errors).toEqual([]);
  });
});
