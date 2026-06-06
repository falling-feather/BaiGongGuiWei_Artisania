/** 数据层统一出口 */
export { CRAFTS, CRAFT_INDEX } from './crafts';
export { STARTING_APPRENTICES, TRAIT_LABELS } from './apprentices';
export { EVENTS } from './events';
export { RESOURCES, RESOURCE_INDEX } from './resources';
export { INDUSTRIES, INDUSTRY_INDEX } from './industries';
export { industryTierFor, localIndustriesForRegion } from './regionEconomy';
export { REGIONS, REGION_INDEX } from './regions';
export {
  ACTIVITY_INDEX,
  PLACEHOLDER_NPCS,
  REGION_ACTIVITIES,
  REGION_CONTENT,
  REGION_ROUTES,
  activitiesForSubregion,
} from './regionContent';
export { ACTIVITY_CHALLENGE_INDEX, ACTIVITY_CHALLENGES } from './activityChallenges';
export { ITEM_DESCRIPTOR_INDEX, ITEM_DESCRIPTOR_RULES } from './itemDescriptors';
export { REGION_MAP_POS } from './mapLayout';
export { ACHIEVEMENTS, ACHIEVEMENT_INDEX } from './achievements';
export { STORY_BEATS, renderStoryLine } from './story';
export { ALL_NPCS, NPCS, NPC_INDEX, npcsForRegion } from './npcs';
export { QUESTS, QUEST_INDEX, questsForNpc } from './quests';
