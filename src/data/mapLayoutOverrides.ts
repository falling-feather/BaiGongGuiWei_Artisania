import type { RuntimeMapEditorSnapshot } from './mapLayout';

export const MAP_LAYOUT_OVERRIDE_STORAGE_KEY = 'artisania:map-editor:runtime-overrides:v1';
export const MAP_LAYOUT_OVERRIDE_EVENT = 'artisania:map-editor-runtime-overrides-changed';

export type RuntimeMapEditorOverrideSnapshot = RuntimeMapEditorSnapshot & {
  modelDefinitions?: unknown[];
  savedAt?: string;
};

function storageAvailable() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function mapLayoutOverrideKey(regionId: string, subregionId: string | undefined) {
  return `${regionId}:${subregionId ?? regionId}`;
}

function readOverrides(): Record<string, RuntimeMapEditorOverrideSnapshot> {
  if (!storageAvailable()) return {};
  try {
    const raw = window.localStorage.getItem(MAP_LAYOUT_OVERRIDE_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, RuntimeMapEditorOverrideSnapshot>)
      : {};
  } catch {
    return {};
  }
}

function writeOverrides(overrides: Record<string, RuntimeMapEditorOverrideSnapshot>) {
  if (!storageAvailable()) return;
  window.localStorage.setItem(MAP_LAYOUT_OVERRIDE_STORAGE_KEY, JSON.stringify(overrides));
  window.dispatchEvent(new CustomEvent(MAP_LAYOUT_OVERRIDE_EVENT));
}

export function mapLayoutOverrideForSubregion(regionId: string, subregionId: string | undefined) {
  return readOverrides()[mapLayoutOverrideKey(regionId, subregionId)];
}

export function saveMapLayoutOverride(snapshot: RuntimeMapEditorOverrideSnapshot) {
  if (!snapshot.regionId) return;
  const key = mapLayoutOverrideKey(snapshot.regionId, snapshot.subregionId);
  writeOverrides({
    ...readOverrides(),
    [key]: {
      ...snapshot,
      schema: snapshot.schema ?? 'artisania-map-editor/v2',
      savedAt: new Date().toISOString(),
    },
  });
}

export function removeMapLayoutOverride(regionId: string, subregionId: string | undefined) {
  const key = mapLayoutOverrideKey(regionId, subregionId);
  const overrides = readOverrides();
  if (!(key in overrides)) return;
  delete overrides[key];
  writeOverrides(overrides);
}

export function listMapLayoutOverrides() {
  return Object.entries(readOverrides()).map(([key, snapshot]) => ({ key, snapshot }));
}
