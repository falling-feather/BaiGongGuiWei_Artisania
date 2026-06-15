import { describe, expect, it } from 'vitest';
import { REGION_CHAPTERS } from '../regionChapters';
import { RUNTIME_MAP_LAYOUTS } from '../mapLayout';

const layoutSubregionIds = new Set(RUNTIME_MAP_LAYOUTS.map((layout) => layout.subregionId));

describe('region chapter map entrypoints', () => {
  it('keeps Jiangnan M1.24 all six chapter entry layouts backed by runtime maps', () => {
    const jiangnan = REGION_CHAPTERS.find((chapter) => chapter.id === 'chapter-jiangnan-baigong-homecoming');
    const gapText = jiangnan?.gaps.join('\n') ?? '';

    expect(jiangnan?.entrySubregionIds).toEqual([
      'jiangnan-suhang',
      'jiangnan-jinling',
      'jiangnan-linan',
      'jiangnan-longquan',
      'jiangnan-taihu',
      'jiangnan-baigongyuan',
    ]);
    expect(jiangnan?.entrySubregionIds.every((subregionId) => layoutSubregionIds.has(subregionId))).toBe(true);
    expect(gapText).not.toMatch(/jiangnan-suhang.*仍缺|仍缺.*jiangnan-suhang/);
    expect(gapText).not.toMatch(/jiangnan-baigongyuan.*仍缺|仍缺.*jiangnan-baigongyuan/);
    expect(gapText).not.toMatch(/jiangnan-linan.*仍缺|仍缺.*jiangnan-linan/);
    expect(gapText).not.toMatch(/jiangnan-taihu.*仍缺|仍缺.*jiangnan-taihu/);
    expect(gapText).not.toMatch(/jiangnan-linan.*待补|待补.*jiangnan-linan/);
    expect(gapText).not.toMatch(/jiangnan-taihu.*待补|待补.*jiangnan-taihu/);
  });

  it('keeps Huizhou M1.19 paper, ink, She stone, and merchant layouts closed', () => {
    const huizhou = REGION_CHAPTERS.find((chapter) => chapter.id === 'chapter-huizhou-paper-merchant');
    const gapText = huizhou?.gaps.join('\n') ?? '';

    expect(huizhou?.entrySubregionIds).toEqual([
      'huizhou-paper-valley',
      'huizhou-ink-alley',
      'huizhou-she-stone',
      'huizhou-merchant-hall',
    ]);
    expect(layoutSubregionIds.has('huizhou-ink-alley')).toBe(true);
    expect(layoutSubregionIds.has('huizhou-she-stone')).toBe(true);
    expect(gapText).not.toMatch(/huizhou-ink-alley.*人工 JSON|人工 JSON.*huizhou-ink-alley/);
    expect(gapText).not.toMatch(/huizhou-she-stone.*人工 JSON|人工 JSON.*huizhou-she-stone/);
  });

  it('keeps Bashu M1.20 Linqiong iron layout closed without changing route landings', () => {
    const bashu = REGION_CHAPTERS.find((chapter) => chapter.id === 'chapter-bashu-tea-horse-brocade');
    const gapText = bashu?.gaps.join('\n') ?? '';

    expect(bashu?.entrySubregionIds).toEqual([
      'bashu-jinli',
      'bashu-bamboo-sea',
      'bashu-tea-horse',
      'bashu-linqiong-iron',
    ]);
    expect(layoutSubregionIds.has('bashu-linqiong-iron')).toBe(true);
    expect(gapText).not.toMatch(/bashu-linqiong-iron.*人工 JSON|人工 JSON.*bashu-linqiong-iron/);
  });

  it('keeps Lingnan M1.21 forge and Duan stone layouts closed', () => {
    const lingnan = REGION_CHAPTERS.find((chapter) => chapter.id === 'chapter-lingnan-harbor-gambiered');
    const gapText = lingnan?.gaps.join('\n') ?? '';

    expect(lingnan?.entrySubregionIds).toEqual([
      'lingnan-harbor',
      'lingnan-gambiered-yard',
      'lingnan-forge',
      'lingnan-duan-stone',
    ]);
    expect(layoutSubregionIds.has('lingnan-forge')).toBe(true);
    expect(layoutSubregionIds.has('lingnan-duan-stone')).toBe(true);
    expect(gapText).not.toMatch(/lingnan-forge.*人工 JSON|人工 JSON.*lingnan-forge/);
    expect(gapText).not.toMatch(/lingnan-duan-stone.*人工 JSON|人工 JSON.*lingnan-duan-stone/);
  });

  it('keeps Qiandian M1.22 Dongchuan copper layout closed', () => {
    const qiandian = REGION_CHAPTERS.find((chapter) => chapter.id === 'chapter-qiandian-silver-tea-road');
    const gapText = qiandian?.gaps.join('\n') ?? '';

    expect(qiandian?.entrySubregionIds).toEqual([
      'qiandian-miao-village',
      'qiandian-tea-road',
      'qiandian-dongchuan-copper',
    ]);
    expect(layoutSubregionIds.has('qiandian-dongchuan-copper')).toBe(true);
    expect(gapText).not.toMatch(/qiandian-dongchuan-copper.*人工 JSON|人工 JSON.*qiandian-dongchuan-copper/);
  });

  it('keeps Jingchu M1.23 mine yard and Xiang embroidery layouts closed', () => {
    const jingchu = REGION_CHAPTERS.find((chapter) => chapter.id === 'chapter-jingchu-ferry-lacquer');
    const gapText = jingchu?.gaps.join('\n') ?? '';

    expect(jingchu?.entrySubregionIds).toEqual([
      'jingchu-lake-market',
      'jingchu-mine-yard',
      'jingchu-chu-lacquer',
      'jingchu-xiang-embroidery',
    ]);
    expect(layoutSubregionIds.has('jingchu-mine-yard')).toBe(true);
    expect(layoutSubregionIds.has('jingchu-xiang-embroidery')).toBe(true);
    expect(gapText).not.toMatch(/jingchu-mine-yard.*仍缺|仍缺.*jingchu-mine-yard/);
    expect(gapText).not.toMatch(/jingchu-xiang-embroidery.*仍缺|仍缺.*jingchu-xiang-embroidery/);
  });

  it('keeps every missing chapter layout explicit in chapter gaps', () => {
    for (const chapter of REGION_CHAPTERS) {
      const gapText = chapter.gaps.join('\n');

      for (const subregionId of chapter.entrySubregionIds) {
        if (layoutSubregionIds.has(subregionId)) {
          continue;
        }
        expect(gapText).toContain(subregionId);
      }
    }
  });

  it('keeps all M1 chapter entry layouts backed by runtime maps after M1.24', () => {
    const chaptersWithMissingLayouts = REGION_CHAPTERS.filter((chapter) =>
      chapter.entrySubregionIds.some((subregionId) => !layoutSubregionIds.has(subregionId)),
    );

    expect(chaptersWithMissingLayouts).toEqual([]);
  });
});
