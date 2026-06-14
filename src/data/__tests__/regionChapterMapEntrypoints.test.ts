import { describe, expect, it } from 'vitest';
import { REGION_CHAPTERS } from '../regionChapters';
import { RUNTIME_MAP_LAYOUTS } from '../mapLayout';

const layoutSubregionIds = new Set(RUNTIME_MAP_LAYOUTS.map((layout) => layout.subregionId));

describe('region chapter map entrypoints', () => {
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
