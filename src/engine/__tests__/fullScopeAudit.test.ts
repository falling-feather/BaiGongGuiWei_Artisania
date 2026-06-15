import { describe, expect, it } from 'vitest';
import { ACHIEVEMENTS } from '../../data/achievements';
import { STARTING_APPRENTICES } from '../../data/apprentices';
import { CRAFTS } from '../../data/crafts';
import { CRAFT_INTERACTIONS } from '../../data/craftInteractions';
import { EVENTS } from '../../data/events';
import { FULL_SCOPE_REGION_IDS, FULL_SCOPE_REGION_REQUIREMENTS } from '../../data/fullScope';
import { INDUSTRIES } from '../../data/industries';
import { ITEM_DESCRIPTOR_RULES } from '../../data/itemDescriptors';
import { LORE_ENTRIES } from '../../data/loreEntries';
import { RUNTIME_MAP_LAYOUTS } from '../../data/mapLayout';
import { ALL_NPCS } from '../../data/npcs';
import { REGION_ACTIVITIES, REGION_CONTENT, COLLAB_RECIPES, ESCORT_ENCOUNTERS, HOME_VISITS } from '../../data/regionContent';
import { REGIONS } from '../../data/regions';
import { RESOURCES } from '../../data/resources';
import { SUBREGION_CONTENT } from '../../data/subregionContent';
import { WORKSHOP_UPGRADES } from '../../data/workshopUpgrades';
import { buildFullScopeAudit, type GameContent } from '../';

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

describe('full scope audit', () => {
  it('builds an M0.9 audit row for every full-version region', () => {
    const audit = buildFullScopeAudit(FULL_SCOPE_REGION_REQUIREMENTS, content, { layoutSubregionIds });

    expect(audit.totalRegions).toBe(11);
    expect(audit.rows.map((row) => row.regionId)).toEqual(FULL_SCOPE_REGION_IDS);
    expect(audit.rows.every((row) => row.unknownReferences.length === 0)).toBe(true);
    expect(audit.rows.every((row) => row.playPillars.length >= 3)).toBe(true);
  });

  it('keeps the current priority slice from being mistaken for full-version completion', () => {
    const audit = buildFullScopeAudit(FULL_SCOPE_REGION_REQUIREMENTS, content, { layoutSubregionIds });

    expect(audit.readyRegions).toBeLessThan(audit.totalRegions);
    expect(audit.partialRegions + audit.gapRegions).toBeGreaterThan(0);
    expect(audit.rows.some((row) => row.tier === 'priority-anchor' && row.gaps.length > 0)).toBe(true);
  });

  it('reports stable M1 action gaps for maps and flagship craft depth', () => {
    const audit = buildFullScopeAudit(FULL_SCOPE_REGION_REQUIREMENTS, content, { layoutSubregionIds });
    const ganpo = audit.rows.find((row) => row.regionId === 'ganpo');
    const xiyu = audit.rows.find((row) => row.regionId === 'xiyu');

    expect(ganpo?.gaps).not.toContain('layout-subregion:1/3');
    expect(ganpo?.signatureCraftsWithoutInteraction).toContain('xiabu');
    expect(ganpo?.m1Actions).toContain('补河运柴场长线风险与高岭瓷土读数');
    expect(xiyu?.gaps).not.toContain('layout-subregion:3/4');
    expect(xiyu?.signatureCraftsWithoutInteraction).not.toContain('atlas-silk');
    expect(xiyu?.signatureCraftsWithoutInteraction).toEqual(expect.arrayContaining(['carpet', 'copperware']));
  });
});
