/** 数据层统一出口 */
export { CRAFTS, CRAFT_INDEX } from './crafts';
export { STARTING_APPRENTICES, TRAIT_LABELS } from './apprentices';
export { EVENTS } from './events';
export { RESOURCES, RESOURCE_INDEX } from './resources';
export { INDUSTRIES, INDUSTRY_INDEX } from './industries';
export { industryTierFor, localIndustriesForRegion } from './regionEconomy';
export {
  SUBREGION_CONTENT,
  SUBREGION_CONTENT_INDEX,
  craftIdsForSubregion,
  craftsForSubregion,
  localIndustriesForSubregion,
  subregionContentFor,
} from './subregionContent';
export { REGIONS, REGION_INDEX } from './regions';
export {
  ACTIVITY_INDEX,
  COLLAB_RECIPES,
  ESCORT_ENCOUNTERS,
  HOME_VISITS,
  PLACEHOLDER_NPCS,
  REGION_ACTIVITIES,
  REGION_CONTENT,
  REGION_ROUTES,
  activitiesForSubregion,
} from './regionContent';
export { ACTIVITY_CHALLENGE_INDEX, ACTIVITY_CHALLENGES } from './activityChallenges';
export { CRAFT_INTERACTION_BY_ID, CRAFT_INTERACTION_INDEX, CRAFT_INTERACTIONS } from './craftInteractions';
export { WORKSHOP_UPGRADE_INDEX, WORKSHOP_UPGRADES } from './workshopUpgrades';
export { ITEM_DESCRIPTOR_INDEX, ITEM_DESCRIPTOR_RULES } from './itemDescriptors';
export { LORE_ENTRIES, LORE_ENTRY_INDEX } from './loreEntries';
export { PRIORITY_ART_ASSET_INDEX, PRIORITY_ART_ASSET_MANIFEST } from './assetManifest';
export {
  PRIORITY_ANCHOR_REGION_IDS,
  PRIORITY_SCOPE_REGION_IDS,
  PRIORITY_SCOPE_REQUIREMENTS,
  PRIORITY_SKELETON_REGION_IDS,
} from './priorityScope';
export {
  REGION_MAP_POS,
  RUNTIME_MAP_EDITOR_SNAPSHOTS,
  RUNTIME_MAP_LAYOUTS,
  runtimeLayoutForSubregion,
  runtimeLayoutFromEditorSnapshot,
} from './mapLayout';
export type {
  RuntimeMapEditorObject,
  RuntimeMapEditorSnapshot,
  RuntimeMapEditorTile,
  RuntimeMapImportOptions,
  RuntimeMapLayout,
  RuntimeMapObject,
  RuntimeMapRoadPath,
} from './mapLayout';
export { ACHIEVEMENTS, ACHIEVEMENT_INDEX } from './achievements';
export { STORY_BEATS, renderStoryLine } from './story';
export { ALL_NPCS, NPCS, NPC_INDEX, npcsForRegion } from './npcs';
export { QUESTS, QUEST_INDEX, questsForNpc } from './quests';
