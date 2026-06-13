import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CRAFTS, REGIONS, STARTING_APPRENTICES } from '../../data';
import { createInitialState } from '../../engine';
import { currentStreetRegionGate, isCurrentStreetSubregionGate } from '../navigationGuards';

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), 'utf8');
}

describe('navigation entrypoints', () => {
  it('keeps region travel behind scene gates instead of overview panels', () => {
    const worldMap = source('../../components/WorldMapModal.tsx');
    const regionPanel = source('../../components/RegionPanel.tsx');
    const loreModal = source('../../components/LoreModal.tsx');
    const streetScene = source('../scenes/StreetScene.ts');
    const app = source('../../App.tsx');
    const eventBus = source('../EventBus.ts');
    const forbiddenOverviewActions = ['TRAVEL', 'TRAVEL_SUBREGION', 'UNLOCK_REGION'];

    for (const action of forbiddenOverviewActions) {
      const dispatchPattern = new RegExp(`type:\\s*['"]${action}['"]`);
      expect(worldMap).not.toMatch(dispatchPattern);
      expect(regionPanel).not.toMatch(dispatchPattern);
      expect(loreModal).not.toMatch(dispatchPattern);
    }

    expect(worldMap).toContain('setSelectedRegionId(r.id)');
    expect(regionPanel).toContain('className={`subregion-card');
    expect(regionPanel).toContain('disabled');

    expect(streetScene).toContain("emitBus({ type: 'interact-subregion-gate'");
    expect(streetScene).toContain("emitBus({ type: 'interact-gate'");
    expect(app).toContain("payload.type === 'interact-subregion-gate'");
    expect(app).toContain("payload.type === 'interact-gate'");
    expect(app).toContain('isCurrentStreetSubregionGate');
    expect(app).toContain('currentStreetRegionGate');
    expect(app).not.toContain('if (payload.unlocked)');
    expect(app).toContain("type: 'TRAVEL_SUBREGION'");
    expect(app).toContain("type: 'TRAVEL'");
    expect(app).toContain("type: 'UNLOCK_REGION'");
    expect(worldMap).not.toContain("emitBus({ type: 'interact-gate'");
    expect(worldMap).not.toContain("emitBus({ type: 'interact-subregion-gate'");
    expect(regionPanel).not.toContain("emitBus({ type: 'interact-gate'");
    expect(regionPanel).not.toContain("emitBus({ type: 'interact-subregion-gate'");
    expect(loreModal).toContain("type: 'TRACK_LORE_ENTRY'");
    expect(loreModal).toContain("type: 'CLEAR_LORE_TRACKING'");
    expect(eventBus).toContain("type: 'set-navigation-target'");
    expect(app).toContain("type: 'set-navigation-target'");
    expect(streetScene).toContain("cmd.type === 'set-navigation-target'");
    expect(streetScene).toContain('private setNavigationTarget');
    expect(streetScene).toContain('goal: Boolean(p.goal)');
    expect(loreModal).not.toContain("emitBus({ type: 'interact-gate'");
    expect(loreModal).not.toContain("emitBus({ type: 'interact-subregion-gate'");
  });

  it('routes HUD interaction through scene-owned nearby target resolution', () => {
    const eventBus = source('../EventBus.ts');
    const streetScene = source('../scenes/StreetScene.ts');
    const app = source('../../App.tsx');
    const hud = source('../../components/Hud.tsx');
    const css = source('../../index.css');

    expect(eventBus).toContain("{ type: 'interact-nearby' }");
    expect(app).toContain("onInteractNearby={() => emitCommand({ type: 'interact-nearby' })}");
    expect(hud).toContain('onInteractNearby');
    expect(hud).toContain('hud__hint-action');
    expect(css).toMatch(/\.hud--hint\s*{[^}]*pointer-events:\s*auto/s);
    expect(css).toMatch(/\.hud--hint\s*{[^}]*z-index:\s*7/s);
    expect(css).toMatch(/\.hud__hint-action\s*{[^}]*pointer-events:\s*auto/s);

    expect(streetScene).toContain("cmd.type === 'interact-nearby'");
    expect(streetScene).toContain('private interactNearby()');
    expect(streetScene).toContain("if (p.kind === 'subregionGate')");
    expect(streetScene).toContain("emitBus({ type: 'interact-gate'");
  });

  it('validates gate payloads against the current street spec', () => {
    const base = createInitialState(CRAFTS, STARTING_APPRENTICES, 1, 12, REGIONS, '');
    const state = {
      ...base,
      currentRegion: 'jiangnan',
      currentSubregion: 'jiangnan-longquan',
      unlockedRegions: [...new Set([...base.unlockedRegions, 'huizhou'])],
    };

    expect(isCurrentStreetSubregionGate(state, 'jiangnan-suhang')).toBe(true);
    expect(isCurrentStreetSubregionGate(state, 'jiangnan-longquan')).toBe(false);
    expect(isCurrentStreetSubregionGate(state, 'huizhou-paper-valley')).toBe(false);

    expect(currentStreetRegionGate(state, 'huizhou')).toMatchObject({
      regionId: 'huizhou',
      unlocked: true,
    });
    expect(currentStreetRegionGate(state, 'ganpo')).toMatchObject({
      regionId: 'ganpo',
      unlocked: false,
    });
    expect(currentStreetRegionGate(state, 'xueyu')).toBeNull();
  });
});
