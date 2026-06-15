import { describe, expect, it } from 'vitest';
import { ACHIEVEMENTS } from '../../data/achievements';
import { STARTING_APPRENTICES } from '../../data/apprentices';
import { CRAFTS } from '../../data/crafts';
import { CRAFT_INTERACTIONS } from '../../data/craftInteractions';
import { EVENTS } from '../../data/events';
import { INDUSTRIES } from '../../data/industries';
import { ITEM_DESCRIPTOR_RULES } from '../../data/itemDescriptors';
import { LORE_ENTRIES } from '../../data/loreEntries';
import { RUNTIME_MAP_LAYOUTS } from '../../data/mapLayout';
import { ALL_NPCS } from '../../data/npcs';
import { REGION_CHAPTERS, type RegionChapterSpec } from '../../data/regionChapters';
import { COLLAB_RECIPES, ESCORT_ENCOUNTERS, HOME_VISITS, REGION_ACTIVITIES, REGION_CONTENT } from '../../data/regionContent';
import { REGIONS } from '../../data/regions';
import { RESOURCES } from '../../data/resources';
import { SUBREGION_CONTENT } from '../../data/subregionContent';
import { WORKSHOP_UPGRADES } from '../../data/workshopUpgrades';
import { REGION_CHAPTER_SMOKE_SCENARIO_IDS } from '../../dev/regionChapterSmokeScenarios';
import { buildRegionChapterAudit, type GameContent } from '../';

const content: GameContent = {
  crafts: CRAFTS,
  apprentices: STARTING_APPRENTICES,
  events: EVENTS,
  industries: INDUSTRIES,
  regions: REGIONS,
  achievements: ACHIEVEMENTS,
  resources: RESOURCES,
  npcs: ALL_NPCS,
  activities: REGION_ACTIVITIES,
  regionContent: REGION_CONTENT,
  subregionContent: SUBREGION_CONTENT,
  escortEncounters: ESCORT_ENCOUNTERS,
  collabRecipes: COLLAB_RECIPES,
  homeVisits: HOME_VISITS,
  craftInteractions: CRAFT_INTERACTIONS,
  workshopUpgrades: WORKSHOP_UPGRADES,
  itemDescriptorRules: ITEM_DESCRIPTOR_RULES,
  loreEntries: LORE_ENTRIES,
};

const layoutSubregionIds = RUNTIME_MAP_LAYOUTS.map((layout) => layout.subregionId);

describe('region chapter audit', () => {
  it('audits all M1 chapter rows without unknown references', () => {
    const audit = buildRegionChapterAudit(REGION_CHAPTERS, content, {
      layoutSubregionIds,
      smokeScenarioIds: REGION_CHAPTER_SMOKE_SCENARIO_IDS,
    });

    expect(audit.totalChapters).toBe(11);
    expect(audit.invalidChapters).toBe(0);
    expect(audit.readyChapters).toBeGreaterThan(0);
    expect(audit.needsExpansionChapters).toBeGreaterThan(0);
    expect(audit.rows.every((row) => row.unknownReferences.length === 0)).toBe(true);
  });

  it('reports stable missing reference ids for bad chapter specs', () => {
    const brokenChapter: RegionChapterSpec = {
      ...REGION_CHAPTERS[0],
      characterNpcIds: [{ npcId: 'missing-id', role: 'artisan', note: 'broken fixture' }],
    };
    const audit = buildRegionChapterAudit([brokenChapter], content, {
      layoutSubregionIds,
      smokeScenarioIds: REGION_CHAPTER_SMOKE_SCENARIO_IDS,
    });

    expect(audit.invalidChapters).toBe(1);
    expect(audit.rows[0].readiness).toBe('invalid');
    expect(audit.rows[0].unknownReferences).toContain('npc:missing-id');
  });

  it('reports chapter route landings that drift away from real local subregions', () => {
    const brokenContent: GameContent = {
      ...content,
      regionContent: content.regionContent?.map((entry) => ({
        ...entry,
        routes: entry.routes.map((route) =>
          route.id === 'route-jiangnan-huizhou-paper'
            ? {
                ...route,
                landingSubregionIds: {
                  ...route.landingSubregionIds,
                  jiangnan: 'missing-subregion',
                },
              }
            : route,
        ),
      })),
    };
    const audit = buildRegionChapterAudit([REGION_CHAPTERS[0]], brokenContent, {
      layoutSubregionIds,
      smokeScenarioIds: REGION_CHAPTER_SMOKE_SCENARIO_IDS,
    });

    expect(audit.invalidChapters).toBe(1);
    expect(audit.rows[0].routeLandingGaps).toContain(
      'routeLandingSubregion:route-jiangnan-huizhou-paper:missing-subregion',
    );
    expect(audit.rows[0].unknownReferences).toContain(
      'routeLandingSubregion:route-jiangnan-huizhou-paper:missing-subregion',
    );
  });

  it('keeps map layout gaps visible without treating them as unknown data', () => {
    const audit = buildRegionChapterAudit(REGION_CHAPTERS, content, {
      layoutSubregionIds,
      smokeScenarioIds: REGION_CHAPTER_SMOKE_SCENARIO_IDS,
    });
    const jiangnan = audit.rows.find((row) => row.regionId === 'jiangnan');
    const bashu = audit.rows.find((row) => row.regionId === 'bashu');
    const ganpo = audit.rows.find((row) => row.regionId === 'ganpo');
    const huizhou = audit.rows.find((row) => row.regionId === 'huizhou');

    expect(jiangnan?.unknownReferences).toEqual([]);
    expect(bashu?.unknownReferences).toEqual([]);
    expect(jiangnan?.layoutGaps).not.toContain('layout-subregion:jiangnan-suhang');
    expect(jiangnan?.layoutGaps).not.toContain('layout-subregion:jiangnan-baigongyuan');
    expect(bashu?.layoutGaps).not.toContain('layout-subregion:bashu-linqiong-iron');
    expect(ganpo?.layoutGaps).not.toContain('layout-subregion:ganpo-kaolin-hill');
    expect(ganpo?.layoutGaps).not.toContain('layout-subregion:ganpo-river-wood');
    expect(huizhou?.layoutGaps).not.toContain('layout-subregion:huizhou-ink-alley');
    expect(huizhou?.layoutGaps).not.toContain('layout-subregion:huizhou-she-stone');
  });
});
