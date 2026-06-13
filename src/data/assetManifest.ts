import { PRIORITY_ANCHOR_REGION_IDS, PRIORITY_SCOPE_REQUIREMENTS, PRIORITY_SKELETON_REGION_IDS } from './priorityScope';

export type ArtAssetDomain = 'region' | 'npc' | 'craft' | 'activity';
export type ArtAssetPriority = 'anchor' | 'skeleton';

export interface ArtAssetManifestEntry {
  key: string;
  domain: ArtAssetDomain;
  priority: ArtAssetPriority;
  fileName: string;
  regionId?: string;
  npcId?: string;
  craftId?: string;
  activityId?: string;
}

const ANCHOR_REGION_FILES = [
  ['master', 'region_master.png'],
  ['streetTiles', 'street_tiles.png'],
  ['buildings', 'buildings.png'],
  ['props', 'props_sheet.png'],
  ['characters', 'characters.png'],
  ['portraits', 'portraits.png'],
  ['craftTools', 'craft_tools.png'],
] as const;

const SKELETON_REGION_FILES = [
  ['master', 'region_master.png'],
  ['buildings', 'buildings.png'],
  ['portraits', 'portraits.png'],
] as const;

function regionAssets(regionId: string, priority: ArtAssetPriority): ArtAssetManifestEntry[] {
  const files = priority === 'anchor' ? ANCHOR_REGION_FILES : SKELETON_REGION_FILES;
  return files.map(([slot, fileName]) => ({
    key: `region.${regionId}.${slot}`,
    domain: 'region',
    priority,
    regionId,
    fileName: `regions/${regionId}/${fileName}`,
  }));
}

function npcAsset(npcId: string, priority: ArtAssetPriority, slot: 'portrait' | 'stand' = 'portrait'): ArtAssetManifestEntry {
  return {
    key: `npc.${npcId}.${slot}`,
    domain: 'npc',
    priority,
    npcId,
    fileName: `characters/${npcId}/${slot}.png`,
  };
}

function craftAsset(craftId: string, priority: ArtAssetPriority, slot: 'tools' | 'defects'): ArtAssetManifestEntry {
  return {
    key: `craft.${craftId}.${slot}`,
    domain: 'craft',
    priority,
    craftId,
    fileName: `crafts/${craftId}/${slot}.png`,
  };
}

function activityAsset(activityId: string): ArtAssetManifestEntry {
  return {
    key: `activity.${activityId}.stall`,
    domain: 'activity',
    priority: 'anchor',
    activityId,
    fileName: `activities/${activityId}/stall.png`,
  };
}

export const PRIORITY_ART_ASSET_MANIFEST: ArtAssetManifestEntry[] = [
  ...PRIORITY_ANCHOR_REGION_IDS.flatMap((regionId) => regionAssets(regionId, 'anchor')),
  ...PRIORITY_SKELETON_REGION_IDS.flatMap((regionId) => regionAssets(regionId, 'skeleton')),
  ...PRIORITY_SCOPE_REQUIREMENTS.flatMap((requirement) =>
    requirement.requiredNpcIds.flatMap((npcId) => [
      npcAsset(npcId, requirement.tier),
      npcAsset(npcId, requirement.tier, 'stand'),
    ]),
  ),
  ...PRIORITY_SCOPE_REQUIREMENTS.flatMap((requirement) =>
    requirement.requiredCraftIds.flatMap((craftId) => [
      craftAsset(craftId, requirement.tier, 'tools'),
      craftAsset(craftId, requirement.tier, 'defects'),
    ]),
  ),
  ...PRIORITY_SCOPE_REQUIREMENTS.flatMap((requirement) => requirement.requiredActivityIds.map(activityAsset)),
];

export const PRIORITY_ART_ASSET_INDEX: Record<string, ArtAssetManifestEntry> = Object.fromEntries(
  PRIORITY_ART_ASSET_MANIFEST.map((entry) => [entry.key, entry]),
);
