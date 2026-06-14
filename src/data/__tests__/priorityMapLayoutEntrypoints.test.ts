import { describe, expect, it } from 'vitest';
import { RUNTIME_MAP_LAYOUTS } from '..';

interface PriorityMapLayoutCase {
  subregionId: string;
  craftIds?: string[];
  activityIds?: string[];
  npcIds?: string[];
  subregionGateIds?: string[];
  regionGateIds?: string[];
}

const PRIORITY_MAP_LAYOUT_CASES: PriorityMapLayoutCase[] = [
  {
    subregionId: 'jiangnan-jinling',
    craftIds: ['kesi'],
    activityIds: ['jn-qinhuai-lantern'],
    npcIds: ['jn-qiao-zhaoye', 'jn-ning-ciqiu'],
    subregionGateIds: ['jiangnan-longquan', 'jiangnan-suhang', 'jiangnan-baigongyuan'],
    regionGateIds: ['ganpo', 'huizhou', 'jingji'],
  },
  {
    subregionId: 'bashu-jinli',
    craftIds: ['shu-brocade', 'shu-embroidery'],
    activityIds: ['bs-jinguan-loom'],
    npcIds: ['bs-zhuo-jinniang'],
    subregionGateIds: ['bashu-bamboo-sea', 'bashu-tea-horse'],
    regionGateIds: ['qiandian', 'jingchu'],
  },
  {
    subregionId: 'bashu-tea-horse',
    activityIds: ['bs-tea-horse-post'],
    npcIds: ['bs-mabang-ayue'],
    subregionGateIds: ['bashu-jinli', 'bashu-bamboo-sea'],
    regionGateIds: ['qiandian', 'xueyu'],
  },
  {
    subregionId: 'lingnan-harbor',
    craftIds: ['canton-embroidery'],
    activityIds: ['ln-pearl-river-harbor', 'ln-qilou-night-market'],
    npcIds: ['ln-wu-haichao'],
    subregionGateIds: ['lingnan-gambiered-yard'],
    regionGateIds: ['qiandian'],
  },
  {
    subregionId: 'ganpo-kiln-town',
    craftIds: ['jingdezhen-porcelain'],
    activityIds: ['gp-kiln-opening-fair'],
    npcIds: ['gp-wen-yaotou'],
    subregionGateIds: ['ganpo-kaolin-hill', 'ganpo-river-wood'],
    regionGateIds: ['jiangnan', 'huizhou', 'jingchu'],
  },
  {
    subregionId: 'xiyu-bazaar',
    craftIds: ['carpet', 'copperware'],
    activityIds: ['xiyu-bazaar-trade'],
    npcIds: ['xu-sali'],
    subregionGateIds: ['xiyu-jade-yard', 'xiyu-caravan-post'],
    regionGateIds: ['xueyu'],
  },
  {
    subregionId: 'xiyu-caravan-post',
    activityIds: ['xiyu-caravan-post'],
    npcIds: ['xu-tuoling-shu'],
    subregionGateIds: ['xiyu-bazaar', 'xiyu-jade-yard'],
    regionGateIds: ['xueyu'],
  },
];

function layoutFor(subregionId: string) {
  const layout = RUNTIME_MAP_LAYOUTS.find((item) => item.subregionId === subregionId);
  if (!layout) throw new Error(`Missing runtime map layout ${subregionId}`);
  return layout;
}

describe('priority runtime map layout entrypoints', () => {
  it.each(PRIORITY_MAP_LAYOUT_CASES)('keeps $subregionId key interactions shipped', (testCase) => {
    const layout = layoutFor(testCase.subregionId);
    const errors: string[] = [];

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
});
