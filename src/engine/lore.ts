import type { GameState, LoreEntry, LoreEntryCategory, LoreUnlockCondition } from './types';

export interface LoreEntryFilters {
  category?: LoreEntryCategory | 'all';
  query?: string;
}

export function knownTopicSet(state: Pick<GameState, 'npcStates'>): Set<string> {
  const topics = new Set<string>();
  for (const runtime of Object.values(state.npcStates)) {
    for (const topic of runtime.knownTopics ?? []) topics.add(topic);
  }
  return topics;
}

function hasAll(required: string[] | undefined, owned: ReadonlySet<string>): boolean {
  return (required ?? []).every((item) => owned.has(item));
}

function hasAny(required: string[] | undefined, owned: ReadonlySet<string>): boolean {
  return !required?.length || required.some((item) => owned.has(item));
}

function hasAllResources(required: string[] | undefined, state: GameState): boolean {
  return (required ?? []).every((resourceId) => (state.resources[resourceId] ?? 0) > 0);
}

function hasAnyResource(required: string[] | undefined, state: GameState): boolean {
  return !required?.length || required.some((resourceId) => (state.resources[resourceId] ?? 0) > 0);
}

function conditionMet(condition: LoreUnlockCondition | undefined, state: GameState, topics: ReadonlySet<string>) {
  if (!condition) return true;
  const flags = new Set(state.flags);
  const achievements = new Set(state.achievements);
  const regions = new Set(state.unlockedRegions);
  return (
    hasAll(condition.flags, flags) &&
    hasAny(condition.anyFlags, flags) &&
    hasAll(condition.topics, topics) &&
    hasAny(condition.anyTopics, topics) &&
    hasAll(condition.achievements, achievements) &&
    hasAny(condition.anyAchievements, achievements) &&
    hasAll(condition.regions, regions) &&
    hasAny(condition.anyRegions, regions) &&
    hasAllResources(condition.resources, state) &&
    hasAnyResource(condition.anyResources, state)
  );
}

function normalizeQuery(query: string | undefined) {
  return (query ?? '').trim().toLocaleLowerCase();
}

function loreEntrySearchText(entry: LoreEntry): string {
  return [
    entry.id,
    entry.category,
    entry.title,
    entry.summary,
    ...entry.body,
    ...(entry.tags ?? []),
    entry.regionId ?? '',
    entry.subregionId ?? '',
    entry.craftId ?? '',
    ...(entry.npcIds ?? []),
  ]
    .join(' ')
    .toLocaleLowerCase();
}

function loreEntryMatchesQuery(entry: LoreEntry, query: string | undefined): boolean {
  const normalized = normalizeQuery(query);
  if (!normalized) return true;
  return normalized.split(/\s+/).every((token) => loreEntrySearchText(entry).includes(token));
}

export function isLoreEntryUnlocked(entry: LoreEntry, state: GameState): boolean {
  return conditionMet(entry.unlock, state, knownTopicSet(state));
}

export function unlockedLoreEntries(entries: readonly LoreEntry[] | undefined, state: GameState): LoreEntry[] {
  const topics = knownTopicSet(state);
  return [...(entries ?? [])]
    .filter((entry) => conditionMet(entry.unlock, state, topics))
    .sort((a, b) => a.category.localeCompare(b.category) || a.title.localeCompare(b.title));
}

export function filteredLoreEntries(
  entries: readonly LoreEntry[] | undefined,
  state: GameState,
  filters: LoreEntryFilters = {},
): LoreEntry[] {
  const category = filters.category ?? 'all';
  return unlockedLoreEntries(entries, state).filter((entry) => {
    const categoryMatched = category === 'all' || entry.category === category;
    return categoryMatched && loreEntryMatchesQuery(entry, filters.query);
  });
}

export function loreProgress(entries: readonly LoreEntry[] | undefined, state: GameState) {
  const total = entries?.length ?? 0;
  return { unlocked: unlockedLoreEntries(entries, state).length, total };
}
