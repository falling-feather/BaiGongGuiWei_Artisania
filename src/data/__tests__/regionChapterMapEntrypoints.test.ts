import { describe, expect, it } from 'vitest';
import { REGION_CHAPTERS } from '../regionChapters';
import { RUNTIME_MAP_LAYOUTS } from '../mapLayout';

const layoutSubregionIds = new Set(RUNTIME_MAP_LAYOUTS.map((layout) => layout.subregionId));

describe('region chapter map entrypoints', () => {
  it('keeps Jiangnan M1.17 chapter entry layouts backed by runtime maps', () => {
    const jiangnan = REGION_CHAPTERS.find((chapter) => chapter.id === 'chapter-jiangnan-baigong-homecoming');

    expect(jiangnan?.entrySubregionIds).toEqual([
      'jiangnan-suhang',
      'jiangnan-jinling',
      'jiangnan-longquan',
      'jiangnan-baigongyuan',
    ]);
    expect(jiangnan?.entrySubregionIds.every((subregionId) => layoutSubregionIds.has(subregionId))).toBe(true);
    expect(jiangnan?.gaps.join('\n')).not.toMatch(/jiangnan-suhang.*仍缺|仍缺.*jiangnan-suhang/);
    expect(jiangnan?.gaps.join('\n')).not.toMatch(/jiangnan-baigongyuan.*仍缺|仍缺.*jiangnan-baigongyuan/);
  });

  it('keeps Huizhou M1.18 ink alley layout closed while retaining the She stone map gap', () => {
    const huizhou = REGION_CHAPTERS.find((chapter) => chapter.id === 'chapter-huizhou-paper-merchant');
    const gapText = huizhou?.gaps.join('\n') ?? '';

    expect(huizhou?.entrySubregionIds).toEqual([
      'huizhou-paper-valley',
      'huizhou-ink-alley',
      'huizhou-she-stone',
      'huizhou-merchant-hall',
    ]);
    expect(layoutSubregionIds.has('huizhou-ink-alley')).toBe(true);
    expect(gapText).not.toMatch(/huizhou-ink-alley.*人工 JSON|人工 JSON.*huizhou-ink-alley/);
    expect(gapText).toContain('huizhou-she-stone');
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

  it('does not mark chapters with missing layouts as silently complete', () => {
    const chaptersWithMissingLayouts = REGION_CHAPTERS.filter((chapter) =>
      chapter.entrySubregionIds.some((subregionId) => !layoutSubregionIds.has(subregionId)),
    );

    expect(chaptersWithMissingLayouts.length).toBeGreaterThan(0);
    expect(
      chaptersWithMissingLayouts.every((chapter) =>
        chapter.gaps.some((gap) => gap.includes('人工 JSON')),
      ),
    ).toBe(true);
  });
});
