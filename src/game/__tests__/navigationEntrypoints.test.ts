import { readdirSync, readFileSync, statSync } from 'node:fs';
import { relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CRAFTS, REGIONS, STARTING_APPRENTICES } from '../../data';
import { createInitialState } from '../../engine';
import { currentStreetRegionGate, isCurrentStreetSubregionGate } from '../navigationGuards';

const SRC_ROOT = fileURLToPath(new URL('../../', import.meta.url));

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), 'utf8');
}

function sourceFilesUnder(path: string): string[] {
  const root = fileURLToPath(new URL(path, import.meta.url));
  const files: string[] = [];
  const visit = (current: string) => {
    for (const entry of readdirSync(current)) {
      const next = `${current}/${entry}`;
      if (statSync(next).isDirectory()) {
        visit(next);
      } else if (/\.(ts|tsx)$/.test(entry)) {
        files.push(next);
      }
    }
  };
  visit(root);
  return files;
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
    expect(worldMap).toContain('data-smoke="worldmap"');
    expect(worldMap).toContain('data-smoke={`worldmap-node:${r.id}`}');
    expect(regionPanel).toContain('className={`subregion-card');
    expect(regionPanel).toContain('disabled');

    expect(streetScene).toContain("emitBus({ type: 'interact-subregion-gate'");
    expect(streetScene).toContain("emitBus({ type: 'interact-gate'");
    expect(app).toContain("payload.type === 'interact-subregion-gate'");
    expect(app).toContain("payload.type === 'interact-gate'");
    expect(app).toContain('const editorMode = import.meta.env.DEV &&');
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

  it('keeps formal travel actions out of every user-facing component file', () => {
    const errors: string[] = [];
    const forbiddenActionPattern = /type:\s*['"](?:TRAVEL|TRAVEL_SUBREGION|UNLOCK_REGION)['"]/;
    const forbiddenGateEventPattern = /emitBus\(\{\s*type:\s*['"]interact-(?:gate|subregion-gate)['"]/;

    for (const file of sourceFilesUnder('../../components')) {
      const text = readFileSync(file, 'utf8');
      const label = relative(SRC_ROOT, file).replace(/\\/g, '/');
      if (forbiddenActionPattern.test(text)) {
        errors.push(`${label}: dispatches formal travel action`);
      }
      if (forbiddenGateEventPattern.test(text)) {
        errors.push(`${label}: emits street gate event outside StreetScene`);
      }
    }

    expect(errors).toEqual([]);
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
      routeId: 'route-jiangnan-huizhou-paper',
    });
    expect(currentStreetRegionGate(state, 'ganpo')).toMatchObject({
      regionId: 'ganpo',
      unlocked: false,
      routeId: 'route-jiangnan-ganpo-kiln',
    });
    expect(currentStreetRegionGate(state, 'xueyu')).toBeNull();
  });

  it('validates Huizhou ink alley subregion gates from the current street spec', () => {
    const base = createInitialState(CRAFTS, STARTING_APPRENTICES, 1, 12, REGIONS, '');
    const paperValley = {
      ...base,
      currentRegion: 'huizhou',
      currentSubregion: 'huizhou-paper-valley',
      unlockedRegions: [...new Set([...base.unlockedRegions, 'huizhou', 'jiangnan', 'ganpo'])],
    };
    const inkAlley = {
      ...paperValley,
      currentSubregion: 'huizhou-ink-alley',
    };

    expect(isCurrentStreetSubregionGate(paperValley, 'huizhou-ink-alley')).toBe(true);
    expect(isCurrentStreetSubregionGate(inkAlley, 'huizhou-paper-valley')).toBe(true);
    expect(isCurrentStreetSubregionGate(inkAlley, 'huizhou-merchant-hall')).toBe(true);
    expect(isCurrentStreetSubregionGate(inkAlley, 'huizhou-ink-alley')).toBe(false);
    expect(isCurrentStreetSubregionGate(inkAlley, 'jiangnan-suhang')).toBe(false);
    expect(currentStreetRegionGate(inkAlley, 'jiangnan')).toMatchObject({
      regionId: 'jiangnan',
      routeId: 'route-jiangnan-huizhou-paper',
    });
    expect(currentStreetRegionGate(inkAlley, 'ganpo')).toMatchObject({
      regionId: 'ganpo',
      routeId: 'route-ganpo-huizhou-merchant',
    });
    expect(currentStreetRegionGate(inkAlley, 'bashu')).toBeNull();
  });
});
