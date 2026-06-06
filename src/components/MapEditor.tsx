import { useEffect, useMemo, useState, type MouseEvent } from 'react';

type EditorCategory = 'terrain' | 'road' | 'water' | 'building' | 'prop' | 'actor' | 'marker';
type EditorLayer = 'terrain' | 'road' | 'water' | 'structure' | 'prop' | 'actor' | 'marker';
type EditorTool = 'paint' | 'select' | 'erase';
type EditorRegionId = 'jiangnan' | 'western';
type InteractionKind =
  | 'none'
  | 'craft'
  | 'industry'
  | 'gate'
  | 'npc'
  | 'decoration'
  | 'marker'
  | 'sword_practice'
  | 'archery_practice'
  | 'meditation'
  | 'farming'
  | 'watering'
  | 'harvesting'
  | 'fishing'
  | 'cooking'
  | 'tea_brewing'
  | 'study'
  | 'carpentry'
  | 'weaving'
  | 'mining'
  | 'trading'
  | 'resting'
  | 'travel';
type VisualState = 'base' | 'summer' | 'rain' | 'autumn' | 'winter';
type SpriteDirection = 'down' | 'left' | 'right' | 'up';
type ComponentKind = 'building' | 'roof' | 'season' | 'prop' | 'icon';

interface ModelLayer {
  id: string;
  name: string;
  asset: string;
  x: number;
  y: number;
  scale: number;
  opacity: number;
  kind?: ComponentKind;
}

interface PaletteItem {
  id: string;
  name: string;
  category: EditorCategory;
  layer: EditorLayer;
  asset: string;
  kind: 'tile' | 'object';
  tileW: number;
  tileH: number;
  solid: boolean;
  allowSameCellStack: boolean;
  interaction: InteractionKind;
  visualState?: VisualState;
  variants?: Partial<Record<VisualState, string>>;
  direction?: SpriteDirection;
  animated?: boolean;
  sheetCols?: number;
  sheetRows?: number;
  frame?: number;
  modelLayers?: ModelLayer[];
  isCustomModel?: boolean;
}

interface PlacedObject extends PaletteItem {
  uid: string;
  x: number;
  y: number;
  z: number;
}

interface TilePaint {
  itemId: string;
  name: string;
  layer: EditorLayer;
  asset: string;
  solid: boolean;
  interaction: InteractionKind;
}

interface PaintDraft {
  tileW: number;
  tileH: number;
  solid: boolean;
  allowSameCellStack: boolean;
  interaction: InteractionKind;
  visualState: VisualState;
  direction: SpriteDirection;
  animated: boolean;
  frame: number;
}

interface ModelDraft {
  name: string;
  category: EditorCategory;
  layer: EditorLayer;
  tileW: number;
  tileH: number;
  solid: boolean;
  allowSameCellStack: boolean;
  interaction: InteractionKind;
  layers: ModelLayer[];
  selectedLayerId: string | null;
}

interface ComponentItem {
  id: string;
  name: string;
  asset: string;
  kind: ComponentKind;
  defaultScale?: number;
}

const DISPLAY_TILE = 24;
const DEFAULT_W = 32;
const DEFAULT_H = 22;
const MODEL_CANVAS = { w: 96, h: 88 };

const REGION_OPTIONS: Array<{ value: EditorRegionId; label: string }> = [
  { value: 'jiangnan', label: '江南' },
  { value: 'western', label: '西域' },
];

const VISUAL_STATE_OPTIONS: Array<{ value: VisualState; label: string }> = [
  { value: 'base', label: '常态' },
  { value: 'summer', label: '夏景' },
  { value: 'rain', label: '雨天' },
  { value: 'autumn', label: '秋景' },
  { value: 'winter', label: '冬雪' },
];

const DIRECTION_OPTIONS: Array<{ value: SpriteDirection; label: string }> = [
  { value: 'down', label: '向下' },
  { value: 'left', label: '向左' },
  { value: 'right', label: '向右' },
  { value: 'up', label: '向上' },
];

const BUILDING_DEFS = [
  ['shop_indigo', '蓝染铺', 'craft'],
  ['shop_bamboo', '竹编铺', 'craft'],
  ['craft_house', '通用作坊', 'craft'],
  ['craft_indigo', '染坊工棚', 'craft'],
  ['craft_bamboo', '竹作工棚', 'craft'],
  ['craft_ceramic', '陶坊工棚', 'craft'],
  ['craft_metal', '金工作坊', 'craft'],
  ['craft_textile', '织造作坊', 'craft'],
  ['craft_paper', '纸坊工棚', 'craft'],
  ['craft_lacquer', '漆器工棚', 'craft'],
  ['industry_harvest', '采集产业', 'industry'],
  ['industry_refine', '精炼产业', 'industry'],
  ['industry_product', '成品产业', 'industry'],
  ['industry_field', '田作产业', 'industry'],
  ['industry_mine', '矿采产业', 'industry'],
  ['industry_kiln', '窑火产业', 'industry'],
  ['industry_forge', '锻造产业', 'industry'],
  ['industry_loom', '织机产业', 'industry'],
  ['industry_market', '市集产业', 'industry'],
  ['gate', '地区牌坊', 'gate'],
] as const;

const OPEN_WORLD_BUILDING_DEFS = [
  ['sword_hall', '剑馆', 'sword_practice'],
  ['meditation_hall', '静修堂', 'meditation'],
  ['farm_cottage', '农家小院', 'farming'],
  ['seed_tool_shop', '种子农具铺', 'trading'],
  ['herbal_clinic', '草药医馆', 'decoration'],
  ['carpenter_yard', '木作院', 'carpentry'],
  ['scholar_academy', '书院', 'study'],
  ['riverside_inn', '临水客栈', 'resting'],
  ['horse_stable', '马厩', 'travel'],
  ['fishery_hut', '渔舍', 'fishing'],
  ['bathhouse', '汤屋', 'resting'],
  ['granary_storehouse', '粮仓', 'industry'],
] as const;

const WESTERN_BUILDING_DEFS = [
  ['western_caravanserai', '西域驿馆', 'travel'],
  ['western_oasis_tea_house', '绿洲茶肆', 'tea_brewing'],
  ['western_desert_market', '胡商市铺', 'trading'],
  ['western_watch_gate', '夯土关楼', 'gate'],
  ['western_adobe_workshop', '土坯工坊', 'craft'],
  ['western_pottery_kiln', '陶窑院', 'industry'],
  ['western_post_station', '驼马驿站', 'travel'],
  ['western_orchard_house', '葡萄农舍', 'farming'],
  ['western_flame_pavilion', '火坛小亭', 'meditation'],
  ['western_observatory', '星象台', 'study'],
  ['western_weaver_tent', '毡帐织铺', 'weaving'],
  ['western_granary', '边塞粮仓', 'industry'],
] as const;

const OPEN_WORLD_PROP_DEFS = [
  ['sword_rack', '剑架', 'sword_practice', 2, 2, true],
  ['training_dummy', '木人桩', 'sword_practice', 2, 2, true],
  ['archery_target', '草靶', 'archery_practice', 2, 2, true],
  ['sword_practice_circle', '练剑石圈', 'sword_practice', 3, 2, false],
  ['meditation_mat', '打坐蒲团', 'meditation', 2, 1, false],
  ['incense_burner', '香炉', 'meditation', 1, 2, true],
  ['lotus_altar', '莲花小坛', 'meditation', 2, 2, true],
  ['qigong_stone_garden', '行气石景', 'meditation', 2, 2, true],
  ['tilled_plot_prop', '田垄小块', 'farming', 3, 2, false],
  ['sprout_plot_prop', '菜苗小块', 'farming', 3, 2, false],
  ['scarecrow', '稻草人', 'farming', 2, 2, true],
  ['watering_jar_rack', '水缸农具架', 'watering', 2, 2, true],
  ['cooking_stove', '灶台', 'cooking', 3, 2, true],
  ['fishing_stand', '钓具架', 'fishing', 2, 2, true],
  ['reading_desk', '读书案', 'study', 3, 2, true],
  ['weaving_workbench', '织造机台', 'weaving', 3, 2, true],
] as const;

const WESTERN_PROP_DEFS = [
  ['desert_date_palm', '椰枣棕榈', 'decoration', 2, 3, true],
  ['tamarisk_shrub', '柽柳灌木', 'decoration', 2, 2, true],
  ['camel_pack', '驮包骆驼', 'travel', 3, 2, true],
  ['camel_cart', '驼车', 'travel', 3, 2, true],
  ['desert_well', '绿洲水井', 'watering', 2, 2, true],
  ['clay_water_jars', '陶罐水架', 'watering', 2, 2, true],
  ['carpet_stall', '毯铺摊', 'trading', 3, 2, true],
  ['spice_baskets', '香料筐', 'trading', 2, 2, true],
  ['silk_bales', '丝绸货包', 'trading', 2, 2, true],
  ['grape_trellis', '葡萄架', 'farming', 3, 2, true],
  ['pomegranate_tree', '石榴树', 'farming', 2, 3, true],
  ['wind_banner', '风幡', 'decoration', 1, 2, true],
  ['stone_milestone', '里程石', 'marker', 1, 1, true],
  ['brass_lantern_post', '铜灯柱', 'decoration', 1, 2, true],
  ['desert_tent_canopy', '毡帐棚', 'resting', 3, 2, true],
  ['astrolabe_stand', '星盘架', 'study', 2, 2, true],
] as const;

const ACTION_ICON_DEFS = [
  ['sword_practice', '图标·练剑', 'sword_practice'],
  ['archery_practice', '图标·射艺', 'archery_practice'],
  ['meditation', '图标·打坐', 'meditation'],
  ['farming', '图标·种地', 'farming'],
  ['watering', '图标·浇水', 'watering'],
  ['harvesting', '图标·收获', 'harvesting'],
  ['fishing', '图标·垂钓', 'fishing'],
  ['cooking', '图标·烹饪', 'cooking'],
  ['tea_brewing', '图标·烹茶', 'tea_brewing'],
  ['study', '图标·读书', 'study'],
  ['carpentry', '图标·木作', 'carpentry'],
  ['weaving', '图标·织造', 'weaving'],
  ['mining', '图标·采矿', 'mining'],
  ['trading', '图标·买卖', 'trading'],
  ['resting', '图标·休息', 'resting'],
  ['travel', '图标·行脚', 'travel'],
] as const;

const OPEN_WORLD_TILE_DEFS = [
  ['meadow_grass', '细草地', 'terrain', false],
  ['wildflower_grass', '野花草地', 'terrain', false],
  ['clover_moss', '苜蓿苔地', 'terrain', false],
  ['packed_earth', '夯实土', 'terrain', false],
  ['tilled_soil_dry', '干田垄', 'terrain', false],
  ['tilled_soil_wet', '湿田垄', 'terrain', false],
  ['crop_seedling', '菜苗地', 'terrain', false],
  ['crop_mature', '成熟菜畦', 'terrain', false],
  ['rice_paddy', '水稻田', 'water', false],
  ['muddy_path', '泥径', 'road', false],
  ['pebble_path', '卵石路', 'road', false],
  ['cracked_slate_path', '裂纹石板', 'road', false],
  ['stone_path_edge_horizontal', '石路横沿', 'road', false],
  ['stone_path_edge_vertical', '石路竖沿', 'road', false],
  ['path_corner', '石路转角', 'road', false],
  ['path_t_junction', '石路丁字口', 'road', false],
  ['shallow_pond_center', '浅池中心', 'water', true],
  ['pond_edge_top', '浅池上沿', 'water', true],
  ['pond_edge_bottom', '浅池下沿', 'water', true],
  ['reed_bank', '芦苇水岸', 'water', true],
  ['sandy_river_bank', '沙质河岸', 'water', false],
  ['fallen_leaf_ground', '落叶地', 'terrain', false],
  ['snow_ground_open', '开阔雪地', 'terrain', false],
  ['courtyard_brick', '庭院砖地', 'road', false],
] as const;

const WESTERN_TILE_DEFS = [
  ['desert_sand', '西域沙地', 'terrain', false],
  ['dune_sand', '沙丘纹地', 'terrain', false],
  ['cracked_dry_clay', '龟裂旱土', 'terrain', false],
  ['gravel_plain', '砾石荒原', 'terrain', false],
  ['dry_scrub_ground', '旱草荒地', 'terrain', false],
  ['oasis_grass', '绿洲草地', 'terrain', false],
  ['tamarisk_grass', '柽柳草地', 'terrain', false],
  ['salt_flat', '盐碱白地', 'terrain', false],
  ['irrigated_field', '引渠田', 'terrain', false],
  ['vineyard_soil', '葡萄田土', 'terrain', false],
  ['mountain_scree', '山麓碎石', 'terrain', true],
  ['packed_oasis_earth', '绿洲夯土', 'terrain', false],
  ['caravan_track_horizontal', '横驼道', 'road', false],
  ['caravan_track_vertical', '竖驼道', 'road', false],
  ['caravan_crossroad', '驼道交叉', 'road', false],
  ['mudbrick_road', '土砖路', 'road', false],
  ['stone_caravan_road', '碎石商道', 'road', false],
  ['mosaic_courtyard', '纹砖庭地', 'road', false],
  ['oasis_water_center', '绿洲水面', 'water', true],
  ['oasis_water_edge_top', '绿洲上岸', 'water', true],
  ['oasis_water_edge_bottom', '绿洲下岸', 'water', true],
  ['reed_oasis_bank', '芦苇水岸', 'water', true],
  ['salt_lake_shallow', '盐湖浅水', 'water', true],
  ['irrigation_canal', '灌渠水道', 'water', true],
] as const;

const BUILDING_COMPONENTS: ComponentItem[] = BUILDING_DEFS.map(([id, name]) => ({
  id: `building_${id}`,
  name,
  asset: `/assets/game/buildings/${id}.png`,
  kind: 'building',
}));

const OPEN_WORLD_BUILDING_COMPONENTS: ComponentItem[] = OPEN_WORLD_BUILDING_DEFS.map(([id, name]) => ({
  id: `open_world_building_${id}`,
  name,
  asset: `/assets/game/buildings/open_world/${id}.png`,
  kind: 'building',
}));

const WESTERN_BUILDING_COMPONENTS: ComponentItem[] = WESTERN_BUILDING_DEFS.map(([id, name]) => ({
  id: `western_building_${id}`,
  name,
  asset: `/assets/game/buildings/western_region/${id}.png`,
  kind: 'building',
}));

const SNOW_ROOF_COMPONENTS: ComponentItem[] = BUILDING_DEFS.map(([id, name]) => ({
  id: `snow_${id}`,
  name: `${name}雪顶`,
  asset: `/assets/game/weather/building_snow/${id}_snow_overlay.png`,
  kind: 'roof',
}));

const SEASON_COMPONENTS: ComponentItem[] = [
  { id: 'summer_lush_tree_crown', name: '夏季繁树冠', asset: '/assets/game/weather/props/summer_lush_tree_crown.png', kind: 'season' },
  { id: 'summer_lush_willow_crown', name: '夏季柳冠', asset: '/assets/game/weather/props/summer_lush_willow_crown.png', kind: 'season' },
  { id: 'summer_dense_reed_clump', name: '夏季芦苇丛', asset: '/assets/game/weather/props/summer_dense_reed_clump.png', kind: 'season' },
  { id: 'summer_lotus_patch', name: '夏季荷叶片', asset: '/assets/game/weather/props/summer_lotus_patch.png', kind: 'season' },
  { id: 'summer_duckweed_patch', name: '夏季浮萍片', asset: '/assets/game/weather/props/summer_duckweed_patch.png', kind: 'season' },
  { id: 'summer_water_grass_clump', name: '夏季水草', asset: '/assets/game/weather/props/summer_water_grass_clump.png', kind: 'season' },
  { id: 'autumn_leaf_pile', name: '秋季落叶', asset: '/assets/game/weather/props/autumn_leaf_pile.png', kind: 'season' },
  { id: 'autumn_gold_tree_crown', name: '秋季金树冠', asset: '/assets/game/weather/props/autumn_gold_tree_crown.png', kind: 'season' },
  { id: 'rain_puddle_overlay', name: '雨天水洼', asset: '/assets/game/weather/props/rain_puddle_overlay.png', kind: 'season' },
  { id: 'rain_wet_stone_sheen', name: '雨天湿光', asset: '/assets/game/weather/props/rain_wet_stone_sheen.png', kind: 'season' },
  { id: 'winter_snow_tree_cap', name: '冬季树雪冠', asset: '/assets/game/weather/props/winter_snow_tree_cap.png', kind: 'season' },
  { id: 'winter_snow_willow_cap', name: '冬季柳雪冠', asset: '/assets/game/weather/props/winter_snow_willow_cap.png', kind: 'season' },
  { id: 'winter_icicle_strip', name: '冬季冰棱', asset: '/assets/game/weather/props/winter_icicle_strip.png', kind: 'season' },
  { id: 'winter_snow_lantern_cap', name: '冬季灯雪', asset: '/assets/game/weather/props/winter_snow_lantern_cap.png', kind: 'season' },
  { id: 'winter_snow_bridge_cap', name: '冬季桥雪', asset: '/assets/game/weather/props/winter_snow_bridge_cap.png', kind: 'season' },
  { id: 'winter_snow_dock_cap', name: '冬季码头雪', asset: '/assets/game/weather/props/winter_snow_dock_cap.png', kind: 'season' },
];

const PROP_COMPONENTS: ComponentItem[] = [
  { id: 'prop_willow', name: '柳树', asset: '/assets/game/props/willow.png', kind: 'prop' },
  { id: 'prop_tea_stall', name: '茶摊', asset: '/assets/game/props/tea_stall.png', kind: 'prop' },
  { id: 'prop_lantern_post', name: '灯笼杆', asset: '/assets/game/props/lantern_post.png', kind: 'prop' },
  { id: 'prop_banner', name: '招幡', asset: '/assets/game/props/banner.png', kind: 'prop' },
  { id: 'prop_market_crates', name: '货箱摊具', asset: '/assets/game/props/market_crates.png', kind: 'prop' },
  { id: 'prop_paper_umbrella', name: '纸伞桌', asset: '/assets/game/props/paper_umbrella.png', kind: 'prop' },
];

const OPEN_WORLD_PROP_COMPONENTS: ComponentItem[] = OPEN_WORLD_PROP_DEFS.map(([id, name]) => ({
  id: `open_world_prop_${id}`,
  name,
  asset: `/assets/game/props/open_world/${id}.png`,
  kind: 'prop',
}));

const WESTERN_PROP_COMPONENTS: ComponentItem[] = WESTERN_PROP_DEFS.map(([id, name]) => ({
  id: `western_prop_${id}`,
  name,
  asset: `/assets/game/props/western_region/${id}.png`,
  kind: 'prop',
}));

const ACTION_ICON_COMPONENTS: ComponentItem[] = ACTION_ICON_DEFS.map(([id, name]) => ({
  id: `action_icon_${id}`,
  name,
  asset: `/assets/game/icons/actions/${id}.png`,
  kind: 'icon',
}));

const MODEL_COMPONENTS: ComponentItem[] = [
  ...BUILDING_COMPONENTS,
  ...OPEN_WORLD_BUILDING_COMPONENTS,
  ...WESTERN_BUILDING_COMPONENTS,
  ...SNOW_ROOF_COMPONENTS,
  ...SEASON_COMPONENTS,
  ...PROP_COMPONENTS,
  ...OPEN_WORLD_PROP_COMPONENTS,
  ...WESTERN_PROP_COMPONENTS,
  ...ACTION_ICON_COMPONENTS,
];

const BASE_PALETTE: PaletteItem[] = [
  tile('ground', '素土地', 'terrain', '/assets/game/tiles/ground.png'),
  tile('summer_lush_ground', '夏草地', 'terrain', '/assets/game/weather/terrain/summer_lush_ground.png'),
  tile('ground_stone', '青石地', 'terrain', '/assets/game/tiles/ground_stone.png'),
  tile('road', '横街道', 'road', '/assets/game/tiles/road.png'),
  tile('road_vertical', '竖街道', 'road', '/assets/game/tiles/road_vertical.png'),
  tile('road_cross', '十字路', 'road', '/assets/game/tiles/road_cross.png'),
  tile('water', '水面', 'water', '/assets/game/tiles/water.png', true),
  tile('water_edge_left', '左水岸', 'water', '/assets/game/tiles/water_edge_left.png', true),
  tile('water_edge_right', '右水岸', 'water', '/assets/game/tiles/water_edge_right.png', true),
  tile('pond_water_grass_center', '水草池', 'water', '/assets/game/weather/terrain/pond_water_grass_center.png', true),
  tile('bridge', '桥面', 'road', '/assets/game/tiles/bridge.png'),
  ...OPEN_WORLD_TILE_DEFS.map(([id, name, category, solid]) =>
    tile(id, name, category, `/assets/game/tiles/open_world/${id}.png`, solid),
  ),
  ...WESTERN_TILE_DEFS.map(([id, name, category, solid]) =>
    tile(id, name, category, `/assets/game/tiles/western_region/${id}.png`, solid),
  ),
  ...BUILDING_DEFS.map(([id, name, interaction]) =>
    building(id, name, `/assets/game/buildings/${id}.png`, interaction),
  ),
  ...OPEN_WORLD_BUILDING_DEFS.map(([id, name, interaction]) =>
    object(id, name, 'building', 'structure', `/assets/game/buildings/open_world/${id}.png`, 3, 3, true, false, interaction),
  ),
  ...WESTERN_BUILDING_DEFS.map(([id, name, interaction]) =>
    object(id, name, 'building', 'structure', `/assets/game/buildings/western_region/${id}.png`, 3, 3, true, false, interaction),
  ),
  object('willow', '柳树', 'prop', 'prop', '/assets/game/props/willow.png', 2, 3, true, true, 'decoration'),
  object('arch_bridge', '石拱桥体', 'prop', 'prop', '/assets/game/props/arch_bridge.png', 4, 3, false, true, 'decoration'),
  object('tea_stall', '茶摊', 'prop', 'prop', '/assets/game/props/tea_stall.png', 3, 2, true, true, 'decoration'),
  object('lantern_post', '灯笼杆', 'prop', 'prop', '/assets/game/props/lantern_post.png', 1, 2, true, true, 'decoration'),
  object('banner', '招幡', 'prop', 'prop', '/assets/game/props/banner.png', 1, 2, true, true, 'decoration'),
  object('notice_board', '告示牌', 'prop', 'prop', '/assets/game/props/notice_board.png', 2, 2, true, true, 'decoration'),
  object('dock', '木码头', 'prop', 'prop', '/assets/game/props/dock.png', 3, 1, true, true, 'decoration'),
  object('boat', '乌篷船', 'prop', 'prop', '/assets/game/props/boat.png', 4, 2, false, true, 'decoration'),
  object('market_crates', '货箱摊具', 'prop', 'prop', '/assets/game/props/market_crates.png', 3, 2, true, true, 'decoration'),
  object('paper_umbrella', '纸伞桌', 'prop', 'prop', '/assets/game/props/paper_umbrella.png', 2, 3, true, true, 'decoration'),
  ...OPEN_WORLD_PROP_DEFS.map(([id, name, interaction, tileW, tileH, solid]) =>
    object(id, name, 'prop', 'prop', `/assets/game/props/open_world/${id}.png`, tileW, tileH, solid, true, interaction),
  ),
  ...WESTERN_PROP_DEFS.map(([id, name, interaction, tileW, tileH, solid]) =>
    object(id, name, 'prop', 'prop', `/assets/game/props/western_region/${id}.png`, tileW, tileH, solid, true, interaction),
  ),
  ...ACTION_ICON_DEFS.map(([id, name, interaction]) =>
    object(`action_${id}`, name, 'marker', 'marker', `/assets/game/icons/actions/${id}.png`, 1, 1, false, true, interaction),
  ),
  character('player_spawn', '玩家起点', '/assets/game/characters/player_walk.png', 'marker'),
  character('npc_tourist', '游客 NPC', '/assets/game/characters/npc_tourist_walk.png', 'npc'),
  character('npc_vendor', '商贩 NPC', '/assets/game/characters/npc_vendor_walk.png', 'npc'),
];

const CATEGORY_LABEL: Record<EditorCategory, string> = {
  terrain: '地面',
  road: '道路',
  water: '水体',
  building: '建筑',
  prop: '道具',
  actor: '单位',
  marker: '标记',
};

const LAYER_LABEL: Record<EditorLayer, string> = {
  terrain: '地面层',
  road: '道路层',
  water: '水体层',
  structure: '建筑层',
  prop: '道具层',
  actor: '单位层',
  marker: '标记层',
};

const COMPONENT_KIND_LABEL: Record<ComponentKind, string> = {
  building: '建筑主体',
  roof: '屋顶叠层',
  season: '季节装饰',
  prop: '街景组件',
  icon: '行为图标',
};

const MODEL_CATEGORY_OPTIONS: EditorCategory[] = ['building', 'prop', 'actor', 'marker'];
const MODEL_LAYER_OPTIONS: EditorLayer[] = ['structure', 'prop', 'actor', 'marker'];
const INTERACTION_OPTIONS: Array<{ value: InteractionKind; label: string }> = [
  { value: 'none', label: '无' },
  { value: 'craft', label: '手艺' },
  { value: 'industry', label: '产业' },
  { value: 'gate', label: '出入口' },
  { value: 'npc', label: 'NPC' },
  { value: 'decoration', label: '装饰' },
  { value: 'marker', label: '标记' },
  { value: 'sword_practice', label: '练剑' },
  { value: 'archery_practice', label: '射艺' },
  { value: 'meditation', label: '打坐' },
  { value: 'farming', label: '种地' },
  { value: 'watering', label: '浇水' },
  { value: 'harvesting', label: '收获' },
  { value: 'fishing', label: '垂钓' },
  { value: 'cooking', label: '烹饪' },
  { value: 'tea_brewing', label: '烹茶' },
  { value: 'study', label: '读书' },
  { value: 'carpentry', label: '木作' },
  { value: 'weaving', label: '织造' },
  { value: 'mining', label: '采矿' },
  { value: 'trading', label: '买卖' },
  { value: 'resting', label: '休息' },
  { value: 'travel', label: '行脚' },
];

function tile(
  id: string,
  name: string,
  category: Extract<EditorCategory, 'terrain' | 'road' | 'water'>,
  asset: string,
  solid = false,
): PaletteItem {
  return {
    id,
    name,
    category,
    layer: category,
    asset,
    kind: 'tile',
    tileW: 1,
    tileH: 1,
    solid,
    allowSameCellStack: false,
    interaction: 'none',
  };
}

function object(
  id: string,
  name: string,
  category: EditorCategory,
  layer: EditorLayer,
  asset: string,
  tileW: number,
  tileH: number,
  solid: boolean,
  allowSameCellStack: boolean,
  interaction: InteractionKind,
): PaletteItem {
  return { id, name, category, layer, asset, kind: 'object', tileW, tileH, solid, allowSameCellStack, interaction };
}

function building(id: string, name: string, asset: string, interaction: InteractionKind): PaletteItem {
  return {
    ...object(id, name, 'building', 'structure', asset, 3, 3, true, false, interaction),
    visualState: 'base',
    variants: {
      base: asset,
      summer: `/assets/game/weather/building_variants/${id}_summer.png`,
      rain: `/assets/game/weather/building_variants/${id}_rain.png`,
      autumn: `/assets/game/weather/building_variants/${id}_autumn.png`,
      winter: `/assets/game/weather/building_variants/${id}_winter.png`,
    },
  };
}

function character(id: string, name: string, asset: string, interaction: InteractionKind): PaletteItem {
  return {
    id,
    name,
    category: id === 'player_spawn' ? 'marker' : 'actor',
    layer: id === 'player_spawn' ? 'marker' : 'actor',
    asset,
    kind: 'object',
    tileW: 1,
    tileH: 1,
    solid: false,
    allowSameCellStack: true,
    interaction,
    direction: 'down',
    animated: true,
    sheetCols: 4,
    sheetRows: 4,
    frame: 0,
  };
}

function keyOf(x: number, y: number) {
  return `${x},${y}`;
}

function layerBase(layer: EditorLayer) {
  return {
    terrain: 0,
    road: 20,
    water: 10,
    structure: 200,
    prop: 320,
    actor: 500,
    marker: 640,
  }[layer];
}

function directionRow(direction: SpriteDirection) {
  return { down: 0, left: 1, right: 2, up: 3 }[direction];
}

function resolvedAsset(item: Pick<PaletteItem | PlacedObject, 'asset' | 'variants' | 'visualState'>) {
  const state = item.visualState ?? 'base';
  return item.variants?.[state] ?? item.variants?.base ?? item.asset;
}

function spriteFrameStyle(
  item: Pick<PaletteItem | PlacedObject, 'asset' | 'sheetCols' | 'sheetRows' | 'frame' | 'direction' | 'animated'>,
  animTick: number,
) {
  const cols = item.sheetCols ?? 1;
  const rows = item.sheetRows ?? 1;
  const row = item.direction ? directionRow(item.direction) : Math.floor((item.frame ?? 0) / cols);
  const col = item.animated ? animTick % cols : (item.frame ?? 0) % cols;
  return {
    backgroundImage: `url(${item.asset})`,
    backgroundSize: `${cols * 100}% ${rows * 100}%`,
    backgroundPosition: `${cols === 1 ? 0 : (col / (cols - 1)) * 100}% ${rows === 1 ? 0 : (row / (rows - 1)) * 100}%`,
  };
}

export function MapEditor() {
  const [regionId, setRegionId] = useState<EditorRegionId>('jiangnan');
  const [mapW, setMapW] = useState(DEFAULT_W);
  const [mapH, setMapH] = useState(DEFAULT_H);
  const [tool, setTool] = useState<EditorTool>('paint');
  const [category, setCategory] = useState<EditorCategory>('building');
  const [selectedItemId, setSelectedItemId] = useState('shop_indigo');
  const [tiles, setTiles] = useState<Record<string, TilePaint>>({});
  const [objects, setObjects] = useState<PlacedObject[]>([]);
  const [customModels, setCustomModels] = useState<PaletteItem[]>([]);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [selectedCell, setSelectedCell] = useState<{ x: number; y: number } | null>(null);
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null);
  const [animTick, setAnimTick] = useState(0);
  const [editorZoom, setEditorZoom] = useState(1);
  const [modelComposerOpen, setModelComposerOpen] = useState(false);
  const [status, setStatus] = useState('选择左侧元素后，在地图上点击放置。');
  const [draft, setDraft] = useState(() => draftFrom(BASE_PALETTE.find((item) => item.id === selectedItemId)!));
  const [modelDraft, setModelDraft] = useState<ModelDraft>(() => initialModelDraft());
  const [customComponentName, setCustomComponentName] = useState('自定义组件');
  const [customComponentAsset, setCustomComponentAsset] = useState('');

  useEffect(() => {
    const timer = window.setInterval(() => setAnimTick((tick) => tick + 1), 180);
    return () => window.clearInterval(timer);
  }, []);

  const palette = useMemo(() => [...BASE_PALETTE, ...customModels], [customModels]);
  const selectedItem = palette.find((item) => item.id === selectedItemId) ?? palette[0];
  const selectedObject = objects.find((item) => item.uid === selectedObjectId) ?? null;
  const activeEdit = selectedObject ?? selectedItem;
  const viewTile = Math.round(DISPLAY_TILE * editorZoom);
  const selectedCellStack = selectedCell ? objectsAt(selectedCell.x, selectedCell.y, objects) : [];
  const selectedModelLayer = modelDraft.layers.find((layer) => layer.id === modelDraft.selectedLayerId) ?? null;
  const exportText = useMemo(
    () => JSON.stringify(buildExport({ regionId, mapW, mapH, tiles, objects, customModels }), null, 2),
    [regionId, mapW, mapH, tiles, objects, customModels],
  );

  function chooseItem(item: PaletteItem) {
    setSelectedItemId(item.id);
    setDraft(draftFrom(item));
    setSelectedObjectId(null);
    setTool('paint');
  }

  function placeObjectAt(item: PaletteItem, x: number, y: number) {
    if (item.kind !== 'object') return;

    const placed: PlacedObject = {
      ...item,
      uid: `${item.id}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      x,
      y,
      tileW: draft.tileW,
      tileH: draft.tileH,
      solid: draft.solid,
      allowSameCellStack: draft.allowSameCellStack,
      interaction: draft.interaction,
      visualState: draft.visualState,
      direction: draft.direction,
      animated: draft.animated,
      frame: draft.frame,
      z: layerBase(item.layer) + y,
    };

    setObjects((prev) => {
      const next = placed.allowSameCellStack
        ? prev
        : prev.filter((obj) => !(obj.x === x && obj.y === y && obj.layer === placed.layer));
      return [...next, placed];
    });
    setSelectedObjectId(placed.uid);
    setSelectedCell({ x, y });
    setStatus(`${item.name} 已放置到 (${x}, ${y})。`);
  }

  function paintAt(x: number, y: number) {
    if (x < 0 || y < 0 || x >= mapW || y >= mapH) return;
    setSelectedCell({ x, y });
    if (tool === 'erase') {
      eraseAt(x, y);
      return;
    }
    if (tool === 'select') {
      const stack = objectsAt(x, y, objects);
      const hit = stack[0];
      setSelectedObjectId(hit?.uid ?? null);
      setStatus(hit ? `已选择 (${x}, ${y})：${hit.name}，共 ${stack.length} 层。` : `(${x}, ${y}) 没有可选择的对象。`);
      return;
    }
    if (selectedItem.kind === 'tile') {
      setTiles((prev) => ({
        ...prev,
        [keyOf(x, y)]: {
          itemId: selectedItem.id,
          name: selectedItem.name,
          layer: selectedItem.layer,
          asset: resolvedAsset(selectedItem),
          solid: draft.solid,
          interaction: draft.interaction,
        },
      }));
      setSelectedObjectId(null);
      setStatus(`${selectedItem.name} 已铺到 (${x}, ${y})。`);
      return;
    }

    placeObjectAt(selectedItem, x, y);
  }

  function eraseAt(x: number, y: number) {
    const hit = objectsAt(x, y, objects)[0];
    if (hit) {
      setObjects((prev) => prev.filter((obj) => obj.uid !== hit.uid));
      setSelectedObjectId(null);
      setStatus(`已删除：${hit.name}`);
      return;
    }
    setTiles((prev) => {
      const next = { ...prev };
      delete next[keyOf(x, y)];
      return next;
    });
    setStatus(`已清除 (${x}, ${y}) 的地块。`);
  }

  function updateSelectedObject(patch: Partial<PlacedObject>) {
    if (!selectedObjectId) return;
    setObjects((prev) => prev.map((obj) => (obj.uid === selectedObjectId ? { ...obj, ...patch } : obj)));
  }

  function updateDraft(patch: Partial<PaintDraft>) {
    setDraft((prev) => ({ ...prev, ...patch }));
  }

  function updateActive(patch: Partial<PlacedObject> & Partial<PaintDraft>) {
    if (selectedObject) updateSelectedObject(patch);
    else updateDraft(patch);
  }

  function removeObject(uid: string) {
    setObjects((prev) => prev.filter((obj) => obj.uid !== uid));
    if (selectedObjectId === uid) setSelectedObjectId(null);
    setStatus('已删除所选图层。');
  }

  function insertCurrentAtSelectedCell() {
    if (!selectedCell || selectedItem.kind !== 'object') return;
    placeObjectAt(selectedItem, selectedCell.x, selectedCell.y);
  }

  function addLayerFromComponent(component: ComponentItem) {
    const id = `layer_${Date.now().toString(36)}_${Math.random().toString(16).slice(2, 6)}`;
    const layer: ModelLayer = {
      id,
      name: component.name,
      asset: component.asset,
      kind: component.kind,
      x: 0,
      y: 0,
      scale: component.defaultScale ?? 1,
      opacity: 1,
    };
    setModelDraft((prev) => ({ ...prev, layers: [layer, ...prev.layers], selectedLayerId: id }));
  }

  function addCustomLayer() {
    const asset = customComponentAsset.trim();
    if (!asset) {
      setStatus('请先填写自定义组件图片路径。');
      setModelComposerOpen(true);
      return;
    }

    addLayerFromComponent({
      id: `custom_component_${Date.now().toString(36)}`,
      name: customComponentName.trim() || '自定义组件',
      asset,
      kind: 'prop',
    });
    setCustomComponentAsset('');
  }

  function updateModelLayer(patch: Partial<ModelLayer>) {
    if (!modelDraft.selectedLayerId) return;
    setModelDraft((prev) => ({
      ...prev,
      layers: prev.layers.map((layer) => (layer.id === prev.selectedLayerId ? { ...layer, ...patch } : layer)),
    }));
  }

  function removeModelLayer(layerId: string) {
    setModelDraft((prev) => {
      const layers = prev.layers.filter((layer) => layer.id !== layerId);
      return { ...prev, layers, selectedLayerId: layers[layers.length - 1]?.id ?? null };
    });
  }

  function moveModelLayer(layerId: string, delta: -1 | 1) {
    setModelDraft((prev) => {
      const index = prev.layers.findIndex((layer) => layer.id === layerId);
      const nextIndex = index + delta;
      if (index < 0 || nextIndex < 0 || nextIndex >= prev.layers.length) return prev;
      const layers = [...prev.layers];
      [layers[index], layers[nextIndex]] = [layers[nextIndex], layers[index]];
      return { ...prev, layers };
    });
  }

  function saveCompositeModel() {
    const id = `custom_${Date.now().toString(36)}`;
    const layers = modelDraft.layers.filter((layer) => layer.asset.trim().length > 0);
    if (!layers.length) {
      setStatus('模型画布还是空的，请先导入组件。');
      setModelComposerOpen(true);
      return;
    }

    const model: PaletteItem = {
      id,
      name: modelDraft.name.trim() || '未命名模型',
      category: modelDraft.category,
      layer: modelDraft.layer,
      asset: layers[layers.length - 1].asset,
      kind: 'object',
      tileW: modelDraft.tileW,
      tileH: modelDraft.tileH,
      solid: modelDraft.solid,
      allowSameCellStack: modelDraft.allowSameCellStack,
      interaction: modelDraft.interaction,
      modelLayers: layers,
      isCustomModel: true,
    };

    setCustomModels((prev) => [...prev, model]);
    setCategory(model.category);
    setSelectedItemId(model.id);
    setDraft(draftFrom(model));
    setSelectedObjectId(null);
    setModelComposerOpen(false);
    setStatus(`新模型「${model.name}」已加入${CATEGORY_LABEL[model.category]}栏。`);
  }

  async function copyExport() {
    await navigator.clipboard.writeText(exportText);
    setStatus('地图 JSON 已复制到剪贴板。');
  }

  function downloadExport() {
    const blob = new Blob([exportText], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'jiangnan-editor-map.json';
    link.click();
    URL.revokeObjectURL(url);
    setStatus('地图 JSON 已导出。');
  }

  function clearMap() {
    setTiles({});
    setObjects([]);
    setSelectedObjectId(null);
    setSelectedCell(null);
    setStatus('地图已清空。');
  }

  function boardMouseMove(event: MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.floor((event.clientX - rect.left) / viewTile);
    const y = Math.floor((event.clientY - rect.top) / viewTile);
    setHover(x >= 0 && y >= 0 && x < mapW && y < mapH ? { x, y } : null);
  }

  return (
    <main className="map-editor">
      <aside className="map-editor__palette">
        <div className="map-editor__brand">
          <span>百工地图工坊</span>
          <b>Editor</b>
        </div>
        <div className="map-editor__tabs">
          {(Object.keys(CATEGORY_LABEL) as EditorCategory[]).map((key) => (
            <button
              key={key}
              className={category === key ? 'is-on' : ''}
              onClick={() => setCategory(key)}
              type="button"
            >
              {CATEGORY_LABEL[key]}
            </button>
          ))}
        </div>
        <div className="map-editor__seed-list">
          {palette
            .filter((item) => item.category === category)
            .map((item) => (
              <button
                key={item.id}
                className={`map-editor__seed ${selectedItem.id === item.id && tool === 'paint' ? 'is-selected' : ''}`}
                onClick={() => chooseItem(item)}
                type="button"
                title={item.name}
              >
                <AssetThumb item={item} animTick={animTick} />
                <span>
                  {item.name}
                  {item.isCustomModel && <small>自定义</small>}
                </span>
              </button>
            ))}
        </div>
      </aside>

      <section className="map-editor__stage">
        <header className="map-editor__toolbar">
          <div className="map-editor__tool-group" aria-label="编辑工具">
            {(['paint', 'select', 'erase'] as EditorTool[]).map((nextTool) => (
              <button
                key={nextTool}
                className={tool === nextTool ? 'is-on' : ''}
                onClick={() => setTool(nextTool)}
                type="button"
              >
                {nextTool === 'paint' ? '绘制' : nextTool === 'select' ? '选择' : '擦除'}
              </button>
            ))}
          </div>
          <div className="map-editor__tool-group" aria-label="画布缩放">
            <button type="button" onClick={() => setEditorZoom((zoom) => Math.max(0.75, +(zoom - 0.25).toFixed(2)))}>-</button>
            <button type="button" className="is-on">{Math.round(editorZoom * 100)}%</button>
            <button type="button" onClick={() => setEditorZoom((zoom) => Math.min(2, +(zoom + 0.25).toFixed(2)))}>+</button>
          </div>
          <button type="button" onClick={() => setModelComposerOpen(true)}>模型装配器</button>
          <div className="map-editor__status">{status}</div>
          <button type="button" onClick={clearMap}>清空</button>
        </header>

        <div className="map-editor__scroll">
          <div
            className="map-editor__board"
            style={{ width: mapW * viewTile, height: mapH * viewTile }}
            onMouseMove={boardMouseMove}
            onMouseLeave={() => setHover(null)}
          >
            <div className="map-editor__grid" style={{ gridTemplateColumns: `repeat(${mapW}, ${viewTile}px)` }}>
              {Array.from({ length: mapW * mapH }, (_, index) => {
                const x = index % mapW;
                const y = Math.floor(index / mapW);
                const paint = tiles[keyOf(x, y)];
                return (
                  <button
                    className="map-editor__cell"
                    key={`${x}-${y}`}
                    onClick={() => paintAt(x, y)}
                    style={{
                      width: viewTile,
                      height: viewTile,
                      ...(paint ? { backgroundImage: `url(${paint.asset})` } : null),
                    }}
                    type="button"
                    aria-label={`cell ${x},${y}`}
                  />
                );
              })}
            </div>

            {objects
              .slice()
              .sort((a, b) => a.z - b.z)
              .map((obj) => (
                <button
                  key={obj.uid}
                  className={`map-editor__object ${selectedObjectId === obj.uid ? 'is-selected' : ''}`}
                  onClick={(event) => {
                    if (tool !== 'select') return;
                    event.stopPropagation();
                    const board = event.currentTarget.closest('.map-editor__board');
                    if (board) {
                      const rect = board.getBoundingClientRect();
                      const x = Math.floor((event.clientX - rect.left) / viewTile);
                      const y = Math.floor((event.clientY - rect.top) / viewTile);
                      if (x >= 0 && y >= 0 && x < mapW && y < mapH) {
                        setSelectedCell({ x, y });
                        const stack = objectsAt(x, y, objects);
                        setStatus(`已选择 (${x}, ${y})：${obj.name}，共 ${stack.length} 层。`);
                      }
                    }
                    setSelectedObjectId(obj.uid);
                  }}
                  style={objectStyle(obj, viewTile)}
                  type="button"
                  title={obj.name}
                >
                  <PlacedAsset item={obj} animTick={animTick} />
                </button>
              ))}

            {hover && tool === 'paint' && selectedItem.kind === 'object' && (
              <div className="map-editor__ghost" style={objectStyle({ ...selectedItem, ...draft, x: hover.x, y: hover.y, z: 999 }, viewTile)}>
                <PlacedAsset item={{ ...selectedItem, ...draft }} animTick={animTick} />
              </div>
            )}
          </div>
        </div>
      </section>

      <aside className="map-editor__inspector">
        <section className="map-editor__panel">
          <h2>地图</h2>
          <label>
            地区
            <select value={regionId} onChange={(e) => setRegionId(e.target.value as EditorRegionId)}>
              {REGION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <div className="map-editor__fields map-editor__fields--two">
            <label>
              宽
              <input type="number" min={8} max={80} value={mapW} onChange={(e) => setMapW(Number(e.target.value))} />
            </label>
            <label>
              高
              <input type="number" min={8} max={60} value={mapH} onChange={(e) => setMapH(Number(e.target.value))} />
            </label>
          </div>
        </section>

        <section className="map-editor__panel">
          <h2>{selectedObject ? '对象属性' : '画笔属性'}</h2>
          <div className="map-editor__selected">
            <AssetThumb item={activeEdit} animTick={animTick} />
            <div>
              <b>{activeEdit.name}</b>
              <span>{activeEdit.id}</span>
            </div>
          </div>
          <div className="map-editor__fields map-editor__fields--two">
            <label>
              宽格
              <input
                type="number"
                min={1}
                max={8}
                value={selectedObject?.tileW ?? draft.tileW}
                onChange={(e) => updateActive({ tileW: Number(e.target.value) })}
              />
            </label>
            <label>
              高格
              <input
                type="number"
                min={1}
                max={8}
                value={selectedObject?.tileH ?? draft.tileH}
                onChange={(e) => updateActive({ tileH: Number(e.target.value) })}
              />
            </label>
          </div>
          {selectedObject && (
            <div className="map-editor__fields map-editor__fields--two">
              <label>
                X
                <input type="number" min={0} max={mapW - 1} value={selectedObject.x} onChange={(e) => updateSelectedObject({ x: Number(e.target.value) })} />
              </label>
              <label>
                Y
                <input type="number" min={0} max={mapH - 1} value={selectedObject.y} onChange={(e) => updateSelectedObject({ y: Number(e.target.value) })} />
              </label>
            </div>
          )}
          {activeEdit.variants && (
            <label>
              外观状态
              <select
                value={selectedObject?.visualState ?? draft.visualState}
                onChange={(e) => updateActive({ visualState: e.target.value as VisualState })}
              >
                {VISUAL_STATE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
          )}
          {activeEdit.sheetCols && activeEdit.sheetRows && (
            <>
              <div className="map-editor__fields map-editor__fields--two">
                <label>
                  方向
                  <select
                    value={selectedObject?.direction ?? draft.direction}
                    onChange={(e) => updateActive({ direction: e.target.value as SpriteDirection })}
                  >
                    {DIRECTION_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
                <label>
                  静态帧
                  <input
                    type="number"
                    min={0}
                    max={(activeEdit.sheetCols ?? 4) - 1}
                    value={selectedObject?.frame ?? draft.frame}
                    onChange={(e) => updateActive({ frame: Number(e.target.value), animated: false })}
                  />
                </label>
              </div>
              <label className="map-editor__check">
                <input
                  type="checkbox"
                  checked={selectedObject?.animated ?? draft.animated}
                  onChange={(e) => updateActive({ animated: e.target.checked })}
                />
                播放行走帧
              </label>
            </>
          )}
          <label className="map-editor__check">
            <input
              type="checkbox"
              checked={selectedObject?.solid ?? draft.solid}
              onChange={(e) => updateActive({ solid: e.target.checked })}
            />
            启用碰撞箱
          </label>
          <label className="map-editor__check">
            <input
              type="checkbox"
              checked={selectedObject?.allowSameCellStack ?? draft.allowSameCellStack}
              disabled={!selectedObject && selectedItem.kind === 'tile'}
              onChange={(e) => updateActive({ allowSameCellStack: e.target.checked })}
            />
            允许同格同层堆叠
          </label>
          <label>
            交互类型
            <select
              value={selectedObject?.interaction ?? draft.interaction}
              onChange={(e) => updateActive({ interaction: e.target.value as InteractionKind })}
            >
              {INTERACTION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
        </section>

        <section className="map-editor__panel">
          <h2>地块堆叠</h2>
          <div className="map-editor__cell-meta">
            {selectedCell ? `当前格：(${selectedCell.x}, ${selectedCell.y}) · ${selectedCellStack.length} 个覆盖模型` : '点击地图格子后显示覆盖模型'}
          </div>
          <button
            className="map-editor__wide-action"
            type="button"
            disabled={!selectedCell || selectedItem.kind !== 'object'}
            onClick={insertCurrentAtSelectedCell}
          >
            插入当前模型到该格
          </button>
          <div className="map-editor__stack-list">
            {selectedCellStack.length > 0 ? selectedCellStack.map((obj, index) => (
              <div key={obj.uid} className={`map-editor__stack-item ${selectedObjectId === obj.uid ? 'is-selected' : ''}`}>
                <AssetThumb item={obj} animTick={animTick} />
                <div>
                  <b>{index + 1}. {obj.name}</b>
                  <span>{LAYER_LABEL[obj.layer]} · {obj.tileW}x{obj.tileH} · z{obj.z}</span>
                </div>
                <div className="map-editor__mini-actions">
                  <button type="button" onClick={() => setSelectedObjectId(obj.uid)}>选中</button>
                  <button type="button" onClick={() => removeObject(obj.uid)}>删除</button>
                </div>
              </div>
            )) : (
              <p className="map-editor__empty-note">没有覆盖模型。可以切换到建筑/道具后插入当前模型。</p>
            )}
          </div>
        </section>

        <section className="map-editor__panel">
          <h2>模型装配</h2>
          <div className="map-editor__model-preview">
            {modelLayersFromDraft(modelDraft).length > 0 ? (
              <CompositeAsset layers={modelLayersFromDraft(modelDraft)} />
            ) : (
              <span className="map-editor__empty-note">空白画布</span>
            )}
          </div>
          <p className="map-editor__panel-copy">
            在装配器里导入建筑主体、屋顶叠层和季节装饰，调整图层位置后另存为新的可摆放模型。
          </p>
          <button className="map-editor__wide-action" type="button" onClick={() => setModelComposerOpen(true)}>打开模型装配器</button>
        </section>

        <section className="map-editor__panel map-editor__panel--export">
          <h2>导出</h2>
          <div className="map-editor__export-actions">
            <button type="button" onClick={copyExport}>复制 JSON</button>
            <button type="button" onClick={downloadExport}>下载 JSON</button>
          </div>
          <textarea readOnly value={exportText} />
        </section>
      </aside>

      {modelComposerOpen && (
        <div className="map-editor__modal-backdrop" role="dialog" aria-modal="true" aria-label="模型装配器">
          <section className="map-editor__composer">
            <header className="map-editor__composer-head">
              <div>
                <h2>模型装配器</h2>
                <p>从空白画布开始，导入主体、屋顶、季节装饰或自定义组件，调整后生成新的可摆放模型。</p>
              </div>
              <div className="map-editor__composer-actions">
                <button type="button" onClick={() => setModelDraft(initialModelDraft())}>新建空白</button>
                <button type="button" onClick={saveCompositeModel}>另存为模型</button>
                <button type="button" onClick={() => setModelComposerOpen(false)}>关闭</button>
              </div>
            </header>

            <div className="map-editor__composer-body">
              <aside className="map-editor__component-library">
                <h3>组件库</h3>
                {(Object.keys(COMPONENT_KIND_LABEL) as ComponentKind[]).map((kind) => (
                  <section key={kind} className="map-editor__component-group">
                    <h4>{COMPONENT_KIND_LABEL[kind]}</h4>
                    <div className="map-editor__component-list">
                      {MODEL_COMPONENTS.filter((component) => component.kind === kind).map((component) => (
                        <button
                          key={component.id}
                          type="button"
                          className="map-editor__component"
                          onClick={() => addLayerFromComponent(component)}
                          title={component.asset}
                        >
                          <span className="map-editor__component-thumb">
                            <img src={component.asset} alt="" draggable={false} />
                          </span>
                          <span>{component.name}</span>
                        </button>
                      ))}
                    </div>
                  </section>
                ))}

                <section className="map-editor__component-group">
                  <h4>自定义路径</h4>
                  <div className="map-editor__fields">
                    <label>
                      组件名
                      <input value={customComponentName} onChange={(e) => setCustomComponentName(e.target.value)} />
                    </label>
                    <label>
                      图片路径
                      <input
                        value={customComponentAsset}
                        onChange={(e) => setCustomComponentAsset(e.target.value)}
                        placeholder="/assets/game/..."
                      />
                    </label>
                  </div>
                  <button className="map-editor__wide-action" type="button" onClick={addCustomLayer}>导入自定义组件</button>
                </section>
              </aside>

              <section className="map-editor__composer-canvas">
                <div className="map-editor__composer-section-head">
                  <h3>新模型画布</h3>
                  <span>{modelDraft.layers.length} 层</span>
                </div>
                <div className="map-editor__model-canvas">
                  {modelLayersFromDraft(modelDraft).length > 0 ? (
                    <CompositeAsset layers={modelLayersFromDraft(modelDraft)} />
                  ) : (
                    <span className="map-editor__empty-note">空白画布</span>
                  )}
                </div>

                <div className="map-editor__fields map-editor__fields--two">
                  <label>
                    新模型名
                    <input value={modelDraft.name} onChange={(e) => setModelDraft((prev) => ({ ...prev, name: e.target.value }))} />
                  </label>
                  <label>
                    主体分类
                    <select
                      value={modelDraft.category}
                      onChange={(e) => setModelDraft((prev) => ({ ...prev, category: e.target.value as EditorCategory }))}
                    >
                      {MODEL_CATEGORY_OPTIONS.map((option) => (
                        <option key={option} value={option}>{CATEGORY_LABEL[option]}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    渲染图层
                    <select
                      value={modelDraft.layer}
                      onChange={(e) => setModelDraft((prev) => ({ ...prev, layer: e.target.value as EditorLayer }))}
                    >
                      {MODEL_LAYER_OPTIONS.map((option) => (
                        <option key={option} value={option}>{LAYER_LABEL[option]}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    交互类型
                    <select
                      value={modelDraft.interaction}
                      onChange={(e) => setModelDraft((prev) => ({ ...prev, interaction: e.target.value as InteractionKind }))}
                    >
                      {INTERACTION_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    宽格
                    <input type="number" min={1} max={12} value={modelDraft.tileW} onChange={(e) => setModelDraft((prev) => ({ ...prev, tileW: Number(e.target.value) }))} />
                  </label>
                  <label>
                    高格
                    <input type="number" min={1} max={12} value={modelDraft.tileH} onChange={(e) => setModelDraft((prev) => ({ ...prev, tileH: Number(e.target.value) }))} />
                  </label>
                </div>

                <label className="map-editor__check">
                  <input
                    type="checkbox"
                    checked={modelDraft.solid}
                    onChange={(e) => setModelDraft((prev) => ({ ...prev, solid: e.target.checked }))}
                  />
                  新模型启用碰撞箱
                </label>
                <label className="map-editor__check">
                  <input
                    type="checkbox"
                    checked={modelDraft.allowSameCellStack}
                    onChange={(e) => setModelDraft((prev) => ({ ...prev, allowSameCellStack: e.target.checked }))}
                  />
                  允许同格同层堆叠
                </label>
              </section>

              <aside className="map-editor__layer-panel">
                <div className="map-editor__composer-section-head">
                  <h3>图层</h3>
                  <span>上方优先显示</span>
                </div>
                <div className="map-editor__layer-list">
                  {modelDraft.layers.length > 0 ? modelDraft.layers.map((layer, index) => (
                    <div key={layer.id} className={`map-editor__layer-item ${modelDraft.selectedLayerId === layer.id ? 'is-selected' : ''}`}>
                      <button
                        type="button"
                        className="map-editor__layer-main"
                        onClick={() => setModelDraft((prev) => ({ ...prev, selectedLayerId: layer.id }))}
                        title={layer.asset}
                      >
                        <img src={layer.asset} alt="" draggable={false} />
                        <span>
                          <b>{index + 1}. {layer.name}</b>
                          <small>{COMPONENT_KIND_LABEL[layer.kind ?? 'prop']}</small>
                        </span>
                      </button>
                      <div className="map-editor__mini-actions">
                        <button type="button" onClick={() => moveModelLayer(layer.id, -1)}>上移</button>
                        <button type="button" onClick={() => moveModelLayer(layer.id, 1)}>下移</button>
                        <button type="button" onClick={() => removeModelLayer(layer.id)}>删除</button>
                      </div>
                    </div>
                  )) : (
                    <p className="map-editor__empty-note">从左侧组件库导入第一层。</p>
                  )}
                </div>

                {selectedModelLayer ? (
                  <div className="map-editor__layer-editor">
                    <h4>当前图层属性</h4>
                    <div className="map-editor__fields">
                      <label>
                        图层名
                        <input value={selectedModelLayer.name} onChange={(e) => updateModelLayer({ name: e.target.value })} />
                      </label>
                      <label>
                        图片路径
                        <input value={selectedModelLayer.asset} onChange={(e) => updateModelLayer({ asset: e.target.value })} />
                      </label>
                    </div>
                    <div className="map-editor__fields map-editor__fields--two">
                      <label>
                        X 偏移
                        <input type="number" value={selectedModelLayer.x} onChange={(e) => updateModelLayer({ x: Number(e.target.value) })} />
                      </label>
                      <label>
                        Y 偏移
                        <input type="number" value={selectedModelLayer.y} onChange={(e) => updateModelLayer({ y: Number(e.target.value) })} />
                      </label>
                      <label>
                        缩放
                        <input type="number" step="0.01" min={0.1} max={3} value={selectedModelLayer.scale} onChange={(e) => updateModelLayer({ scale: Number(e.target.value) })} />
                      </label>
                      <label>
                        透明度
                        <input type="number" step="0.05" min={0} max={1} value={selectedModelLayer.opacity} onChange={(e) => updateModelLayer({ opacity: Number(e.target.value) })} />
                      </label>
                    </div>
                  </div>
                ) : (
                  <p className="map-editor__empty-note">选择一个图层后可编辑偏移、缩放、透明度和图片路径。</p>
                )}
              </aside>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

function initialModelDraft(): ModelDraft {
  return {
    name: '未命名模型',
    category: 'building',
    layer: 'structure',
    tileW: 3,
    tileH: 3,
    solid: true,
    allowSameCellStack: false,
    interaction: 'decoration',
    layers: [],
    selectedLayerId: null,
  };
}

function modelLayersFromDraft(draft: ModelDraft): ModelLayer[] {
  return draft.layers.filter((layer) => layer.asset.trim().length > 0);
}

function draftFrom(item: PaletteItem): PaintDraft {
  return {
    tileW: item.tileW,
    tileH: item.tileH,
    solid: item.solid,
    allowSameCellStack: item.allowSameCellStack,
    interaction: item.interaction,
    visualState: item.visualState ?? 'base',
    direction: item.direction ?? 'down',
    animated: item.animated ?? false,
    frame: item.frame ?? 0,
  };
}

function objectsAt(x: number, y: number, objects: PlacedObject[]) {
  return objects
    .filter((obj) => x >= obj.x && x < obj.x + obj.tileW && y >= obj.y && y < obj.y + obj.tileH)
    .sort((a, b) => b.z - a.z);
}

function objectStyle(item: Pick<PlacedObject, 'x' | 'y' | 'tileW' | 'tileH' | 'z'>, tileSize = DISPLAY_TILE) {
  return {
    left: item.x * tileSize,
    top: (item.y + item.tileH) * tileSize,
    width: item.tileW * tileSize,
    zIndex: item.z,
  };
}

function AssetThumb({
  item,
  animTick,
}: {
  item: Pick<PaletteItem | PlacedObject, 'asset' | 'name' | 'variants' | 'visualState' | 'modelLayers' | 'sheetCols' | 'sheetRows' | 'frame' | 'direction' | 'animated'>;
  animTick: number;
}) {
  if (item.modelLayers) return <CompositeAsset layers={item.modelLayers} compact />;
  if (item.sheetCols && item.sheetRows) {
    return <span className="map-editor__sprite-thumb" style={spriteFrameStyle(item, animTick)} aria-label={item.name} />;
  }
  return <img src={resolvedAsset(item)} alt="" draggable={false} />;
}

function PlacedAsset({
  item,
  animTick,
}: {
  item: Pick<PaletteItem | PlacedObject, 'asset' | 'name' | 'variants' | 'visualState' | 'modelLayers' | 'sheetCols' | 'sheetRows' | 'frame' | 'direction' | 'animated'>;
  animTick: number;
}) {
  if (item.modelLayers) return <CompositeAsset layers={item.modelLayers} />;
  if (item.sheetCols && item.sheetRows) {
    return <span className="map-editor__sprite-object" style={spriteFrameStyle(item, animTick)} aria-label={item.name} />;
  }
  return <img src={resolvedAsset(item)} alt="" draggable={false} />;
}

function CompositeAsset({ layers, compact = false }: { layers: ModelLayer[]; compact?: boolean }) {
  return (
    <span className={compact ? 'map-editor__composite-thumb' : 'map-editor__composite-object'}>
      {layers.slice().reverse().map((layer) => (
        <img
          key={layer.id}
          src={layer.asset}
          alt=""
          draggable={false}
          style={{
            opacity: layer.opacity,
            transform: `translate(${(layer.x / MODEL_CANVAS.w) * 100}%, ${(layer.y / MODEL_CANVAS.h) * 100}%) scale(${layer.scale})`,
          }}
        />
      ))}
    </span>
  );
}

function serializeObject(obj: PlacedObject) {
  const { uid, kind, category, isCustomModel, ...rest } = obj;
  return { itemId: obj.id, ...rest };
}

function serializeModel(model: PaletteItem) {
  const { kind, ...rest } = model;
  return rest;
}

function buildExport({
  regionId,
  mapW,
  mapH,
  tiles,
  objects,
  customModels,
}: {
  regionId: EditorRegionId;
  mapW: number;
  mapH: number;
  tiles: Record<string, TilePaint>;
  objects: PlacedObject[];
  customModels: PaletteItem[];
}) {
  return {
    schema: 'artisania-map-editor/v2',
    regionId,
    tileSize: 32,
    size: { w: mapW, h: mapH },
    modelDefinitions: customModels.map(serializeModel),
    tiles: Object.entries(tiles).map(([key, paint]) => {
      const [x, y] = key.split(',').map(Number);
      return { x, y, ...paint };
    }),
    objects: objects.map(serializeObject),
  };
}
