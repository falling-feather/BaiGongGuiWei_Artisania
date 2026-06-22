/**
 * 占位像素素材生成器 —— 不依赖任何外部图片，直接用 Graphics 画出
 * 纯色/简单像素纹理，方便 M0 立即可跑。
 *
 * ⚠️ 美术替换点：日后把这些 generateTexture 调用替换为 this.load.spritesheet(...)
 * 加载真正的像素美术（角色四向行走帧、地砖、建筑）。详见开发者文档「美术替换点」。
 */
import Phaser from 'phaser';

export const TILE = 32; // 单格像素尺寸

export const TEX = {
  ground: 'tex-ground',
  groundMoss: 'tex-ground-moss',
  groundStone: 'tex-ground-stone',
  groundSoil: 'tex-ground-soil',
  summerLushGround: 'tex-summer-lush-ground',
  summerFlowerGround: 'tex-summer-flower-ground',
  summerDenseMossGround: 'tex-summer-dense-moss-ground',
  summerReedBank: 'tex-summer-reed-bank',
  pondWaterGrassCenter: 'tex-pond-water-grass-center',
  pondWaterGrassEdgeLeft: 'tex-pond-water-grass-edge-left',
  pondWaterGrassEdgeRight: 'tex-pond-water-grass-edge-right',
  pondLotusDuckweed: 'tex-pond-lotus-duckweed',
  rainWetRoad: 'tex-rain-wet-road',
  rainPuddleRoad: 'tex-rain-puddle-road',
  rainMuddyGround: 'tex-rain-muddy-ground',
  rainWetStoneGround: 'tex-rain-wet-stone-ground',
  autumnLeafGround: 'tex-autumn-leaf-ground',
  autumnLeafRoad: 'tex-autumn-leaf-road',
  winterSnowGround: 'tex-winter-snow-ground',
  winterSnowRoad: 'tex-winter-snow-road',
  road: 'tex-road',
  roadVertical: 'tex-road-vertical',
  roadCross: 'tex-road-cross',
  wall: 'tex-wall',
  player: 'tex-player',
  shopIndigo: 'tex-shop-indigo',
  shopBamboo: 'tex-shop-bamboo',
  shopIndigoSnow: 'tex-shop-indigo-snow-overlay',
  shopBambooSnow: 'tex-shop-bamboo-snow-overlay',
  marker: 'tex-marker',
  // 产业点（按层级配色）与地区出入口
  indHarvest: 'tex-ind-harvest',
  indRefine: 'tex-ind-refine',
  indProduct: 'tex-ind-product',
  indField: 'tex-ind-field',
  indMine: 'tex-ind-mine',
  indKiln: 'tex-ind-kiln',
  indForge: 'tex-ind-forge',
  indLoom: 'tex-ind-loom',
  indMarket: 'tex-ind-market',
  indHarvestSnow: 'tex-ind-harvest-snow-overlay',
  indRefineSnow: 'tex-ind-refine-snow-overlay',
  indProductSnow: 'tex-ind-product-snow-overlay',
  indFieldSnow: 'tex-ind-field-snow-overlay',
  indMineSnow: 'tex-ind-mine-snow-overlay',
  indKilnSnow: 'tex-ind-kiln-snow-overlay',
  indForgeSnow: 'tex-ind-forge-snow-overlay',
  indLoomSnow: 'tex-ind-loom-snow-overlay',
  indMarketSnow: 'tex-ind-market-snow-overlay',
  craft: 'tex-craft',
  craftIndigo: 'tex-craft-indigo',
  craftBamboo: 'tex-craft-bamboo',
  craftCeramic: 'tex-craft-ceramic',
  craftMetal: 'tex-craft-metal',
  craftTextile: 'tex-craft-textile',
  craftPaper: 'tex-craft-paper',
  craftLacquer: 'tex-craft-lacquer',
  craftSnow: 'tex-craft-snow-overlay',
  craftIndigoSnow: 'tex-craft-indigo-snow-overlay',
  craftBambooSnow: 'tex-craft-bamboo-snow-overlay',
  craftCeramicSnow: 'tex-craft-ceramic-snow-overlay',
  craftMetalSnow: 'tex-craft-metal-snow-overlay',
  craftTextileSnow: 'tex-craft-textile-snow-overlay',
  craftPaperSnow: 'tex-craft-paper-snow-overlay',
  craftLacquerSnow: 'tex-craft-lacquer-snow-overlay',
  gate: 'tex-gate',
  gateSnow: 'tex-gate-snow-overlay',
  // 地貌元素（M·地貌差异化）
  water: 'tex-water',
  waterEdgeLeft: 'tex-water-edge-left',
  waterEdgeRight: 'tex-water-edge-right',
  bridge: 'tex-bridge',
  fence: 'tex-fence',
  tree: 'tex-tree',
  rock: 'tex-rock',
  willow: 'tex-willow',
  teaStall: 'tex-tea-stall',
  lanternPost: 'tex-lantern-post',
  banner: 'tex-banner',
  noticeBoard: 'tex-notice-board',
  dock: 'tex-dock',
  boat: 'tex-boat',
  marketCrates: 'tex-market-crates',
  paperUmbrella: 'tex-paper-umbrella',
  summerLushWillowCrown: 'tex-summer-lush-willow-crown',
  summerLushTreeCrown: 'tex-summer-lush-tree-crown',
  summerDenseReedClump: 'tex-summer-dense-reed-clump',
  summerLotusPatch: 'tex-summer-lotus-patch',
  summerWaterGrassClump: 'tex-summer-water-grass-clump',
  summerDuckweedPatch: 'tex-summer-duckweed-patch',
  rainPuddleOverlay: 'tex-rain-puddle-overlay',
  rainWetStoneSheen: 'tex-rain-wet-stone-sheen',
  autumnLeafPile: 'tex-autumn-leaf-pile',
  autumnGoldTreeCrown: 'tex-autumn-gold-tree-crown',
  winterSnowTreeCap: 'tex-winter-snow-tree-cap',
  winterSnowWillowCap: 'tex-winter-snow-willow-cap',
  winterSnowLanternCap: 'tex-winter-snow-lantern-cap',
  winterSnowBridgeCap: 'tex-winter-snow-bridge-cap',
  winterSnowDockCap: 'tex-winter-snow-dock-cap',
  winterIcicleStrip: 'tex-winter-icicle-strip',
  lightRainStreaks: 'tex-light-rain-streaks',
  heavyRainStreaks: 'tex-heavy-rain-streaks',
  rainSplashRipples: 'tex-rain-splash-ripples',
  wetRoofGlint: 'tex-wet-roof-glint',
  smallSnowflakes: 'tex-small-snowflakes',
  driftingSnowCluster: 'tex-drifting-snow-cluster',
  snowPuffGround: 'tex-snow-puff-ground',
  frostyMistPatch: 'tex-frosty-mist-patch',
  morningFogStrip: 'tex-morning-fog-strip',
  autumnFallingLeaves: 'tex-autumn-falling-leaves',
  windDustSwirl: 'tex-wind-dust-swirl',
  summerFireflySparkles: 'tex-summer-firefly-sparkles',
  // NPC（游客 / 关联人物）
  npcTourist: 'tex-npc-tourist',
  npcVendor: 'tex-npc-vendor',
  // 寻路目标光环
  moveTarget: 'tex-move-target',
} as const;

const BUILDING_VARIANT_STEMS: Readonly<Record<string, string>> = {
  [TEX.shopIndigo]: 'shop_indigo',
  [TEX.shopBamboo]: 'shop_bamboo',
  [TEX.craft]: 'craft_house',
  [TEX.craftIndigo]: 'craft_indigo',
  [TEX.craftBamboo]: 'craft_bamboo',
  [TEX.craftCeramic]: 'craft_ceramic',
  [TEX.craftMetal]: 'craft_metal',
  [TEX.craftTextile]: 'craft_textile',
  [TEX.craftPaper]: 'craft_paper',
  [TEX.craftLacquer]: 'craft_lacquer',
  [TEX.indHarvest]: 'industry_harvest',
  [TEX.indRefine]: 'industry_refine',
  [TEX.indProduct]: 'industry_product',
  [TEX.indField]: 'industry_field',
  [TEX.indMine]: 'industry_mine',
  [TEX.indKiln]: 'industry_kiln',
  [TEX.indForge]: 'industry_forge',
  [TEX.indLoom]: 'industry_loom',
  [TEX.indMarket]: 'industry_market',
  [TEX.gate]: 'gate',
};

export const BUILDING_WEATHER_VARIANTS = ['summer', 'rain', 'autumn', 'winter'] as const;
export type BuildingWeatherVariant = (typeof BUILDING_WEATHER_VARIANTS)[number];

export type RegionTerrainThemeId = 'jiangnan' | 'bashu' | 'lingnan' | 'ganpo' | 'xiyu';

export interface RegionTerrainTextures {
  ground: string;
  groundAlt: string;
  road: string;
  roadVertical: string;
  roadCross: string;
  water: string;
  waterEdgeLeft: string;
  waterEdgeRight: string;
  vegetation: string;
  courtyard: string;
}

export const REGION_TERRAIN_THEME_ALIASES: Readonly<Record<string, RegionTerrainThemeId>> = {
  jiangnan: 'jiangnan',
  huizhou: 'jiangnan',
  bashu: 'bashu',
  qiandian: 'bashu',
  lingnan: 'lingnan',
  jingchu: 'lingnan',
  ganpo: 'ganpo',
  jingji: 'ganpo',
  xiyu: 'xiyu',
  western: 'xiyu',
  sanjin: 'xiyu',
  xueyu: 'xiyu',
};

export const REGION_TERRAIN_TEXTURES: Readonly<Record<RegionTerrainThemeId, RegionTerrainTextures>> = {
  jiangnan: {
    ground: 'tex-region-jiangnan-ground',
    groundAlt: 'tex-region-jiangnan-ground-alt',
    road: 'tex-region-jiangnan-road',
    roadVertical: 'tex-region-jiangnan-road-vertical',
    roadCross: 'tex-region-jiangnan-road-cross',
    water: 'tex-region-jiangnan-water',
    waterEdgeLeft: 'tex-region-jiangnan-water-edge-left',
    waterEdgeRight: 'tex-region-jiangnan-water-edge-right',
    vegetation: 'tex-region-jiangnan-vegetation',
    courtyard: 'tex-region-jiangnan-courtyard',
  },
  bashu: {
    ground: 'tex-region-bashu-ground',
    groundAlt: 'tex-region-bashu-ground-alt',
    road: 'tex-region-bashu-road',
    roadVertical: 'tex-region-bashu-road-vertical',
    roadCross: 'tex-region-bashu-road-cross',
    water: 'tex-region-bashu-water',
    waterEdgeLeft: 'tex-region-bashu-water-edge-left',
    waterEdgeRight: 'tex-region-bashu-water-edge-right',
    vegetation: 'tex-region-bashu-vegetation',
    courtyard: 'tex-region-bashu-courtyard',
  },
  lingnan: {
    ground: 'tex-region-lingnan-ground',
    groundAlt: 'tex-region-lingnan-ground-alt',
    road: 'tex-region-lingnan-road',
    roadVertical: 'tex-region-lingnan-road-vertical',
    roadCross: 'tex-region-lingnan-road-cross',
    water: 'tex-region-lingnan-water',
    waterEdgeLeft: 'tex-region-lingnan-water-edge-left',
    waterEdgeRight: 'tex-region-lingnan-water-edge-right',
    vegetation: 'tex-region-lingnan-vegetation',
    courtyard: 'tex-region-lingnan-courtyard',
  },
  ganpo: {
    ground: 'tex-region-ganpo-ground',
    groundAlt: 'tex-region-ganpo-ground-alt',
    road: 'tex-region-ganpo-road',
    roadVertical: 'tex-region-ganpo-road-vertical',
    roadCross: 'tex-region-ganpo-road-cross',
    water: 'tex-region-ganpo-water',
    waterEdgeLeft: 'tex-region-ganpo-water-edge-left',
    waterEdgeRight: 'tex-region-ganpo-water-edge-right',
    vegetation: 'tex-region-ganpo-vegetation',
    courtyard: 'tex-region-ganpo-courtyard',
  },
  xiyu: {
    ground: 'tex-region-xiyu-ground',
    groundAlt: 'tex-region-xiyu-ground-alt',
    road: 'tex-region-xiyu-road',
    roadVertical: 'tex-region-xiyu-road-vertical',
    roadCross: 'tex-region-xiyu-road-cross',
    water: 'tex-region-xiyu-water',
    waterEdgeLeft: 'tex-region-xiyu-water-edge-left',
    waterEdgeRight: 'tex-region-xiyu-water-edge-right',
    vegetation: 'tex-region-xiyu-vegetation',
    courtyard: 'tex-region-xiyu-courtyard',
  },
};

const REGION_TERRAIN_IMAGE_TEXTURES = Object.entries(REGION_TERRAIN_TEXTURES).flatMap(
  ([region, textures]) => [
    [textures.ground, `/assets/game/terrain/regions/${region}/ground.png`],
    [textures.groundAlt, `/assets/game/terrain/regions/${region}/ground_alt.png`],
    [textures.road, `/assets/game/terrain/regions/${region}/road.png`],
    [textures.roadVertical, `/assets/game/terrain/regions/${region}/road_vertical.png`],
    [textures.roadCross, `/assets/game/terrain/regions/${region}/road_cross.png`],
    [textures.water, `/assets/game/terrain/regions/${region}/water.png`],
    [textures.waterEdgeLeft, `/assets/game/terrain/regions/${region}/water_edge_left.png`],
    [textures.waterEdgeRight, `/assets/game/terrain/regions/${region}/water_edge_right.png`],
    [textures.vegetation, `/assets/game/terrain/regions/${region}/vegetation.png`],
    [textures.courtyard, `/assets/game/terrain/regions/${region}/courtyard.png`],
  ] as const,
);

export const BUILDING_WEATHER_TEXTURES = Object.fromEntries(
  Object.entries(BUILDING_VARIANT_STEMS).map(([baseTex, stem]) => [
    baseTex,
    Object.fromEntries(
      BUILDING_WEATHER_VARIANTS.map((variant) => [variant, `tex-${stem}-${variant}`]),
    ) as Record<BuildingWeatherVariant, string>,
  ]),
) as Readonly<Record<string, Readonly<Record<BuildingWeatherVariant, string>>>>;

const BUILDING_WEATHER_IMAGE_TEXTURES = Object.entries(BUILDING_VARIANT_STEMS).flatMap(
  ([baseTex, stem]) =>
    BUILDING_WEATHER_VARIANTS.map((variant) => [
      BUILDING_WEATHER_TEXTURES[baseTex][variant],
      `/assets/game/weather/building_variants/${stem}_${variant}.png`,
    ] as const),
);

export const IMAGE_TEXTURES = [
  ...REGION_TERRAIN_IMAGE_TEXTURES,
  [TEX.ground, '/assets/game/tiles/ground.png'],
  [TEX.groundMoss, '/assets/game/tiles/ground_moss.png'],
  [TEX.groundStone, '/assets/game/tiles/ground_stone.png'],
  [TEX.groundSoil, '/assets/game/tiles/ground_soil.png'],
  [TEX.summerLushGround, '/assets/game/weather/terrain/summer_lush_ground.png'],
  [TEX.summerFlowerGround, '/assets/game/weather/terrain/summer_flower_ground.png'],
  [TEX.summerDenseMossGround, '/assets/game/weather/terrain/summer_dense_moss_ground.png'],
  [TEX.summerReedBank, '/assets/game/weather/terrain/summer_reed_bank.png'],
  [TEX.pondWaterGrassCenter, '/assets/game/weather/terrain/pond_water_grass_center.png'],
  [TEX.pondWaterGrassEdgeLeft, '/assets/game/weather/terrain/pond_water_grass_edge_left.png'],
  [TEX.pondWaterGrassEdgeRight, '/assets/game/weather/terrain/pond_water_grass_edge_right.png'],
  [TEX.pondLotusDuckweed, '/assets/game/weather/terrain/pond_lotus_duckweed.png'],
  [TEX.rainWetRoad, '/assets/game/weather/terrain/rain_wet_road.png'],
  [TEX.rainPuddleRoad, '/assets/game/weather/terrain/rain_puddle_road.png'],
  [TEX.rainMuddyGround, '/assets/game/weather/terrain/rain_muddy_ground.png'],
  [TEX.rainWetStoneGround, '/assets/game/weather/terrain/rain_wet_stone_ground.png'],
  [TEX.autumnLeafGround, '/assets/game/weather/terrain/autumn_leaf_ground.png'],
  [TEX.autumnLeafRoad, '/assets/game/weather/terrain/autumn_leaf_road.png'],
  [TEX.winterSnowGround, '/assets/game/weather/terrain/winter_snow_ground.png'],
  [TEX.winterSnowRoad, '/assets/game/weather/terrain/winter_snow_road.png'],
  [TEX.road, '/assets/game/tiles/road.png'],
  [TEX.roadVertical, '/assets/game/tiles/road_vertical.png'],
  [TEX.roadCross, '/assets/game/tiles/road_cross.png'],
  [TEX.wall, '/assets/game/tiles/road.png'],
  [TEX.shopIndigo, '/assets/game/buildings/shop_indigo.png'],
  [TEX.shopBamboo, '/assets/game/buildings/shop_bamboo.png'],
  [TEX.shopIndigoSnow, '/assets/game/weather/building_snow/shop_indigo_snow_overlay.png'],
  [TEX.shopBambooSnow, '/assets/game/weather/building_snow/shop_bamboo_snow_overlay.png'],
  [TEX.indHarvest, '/assets/game/buildings/industry_harvest.png'],
  [TEX.indRefine, '/assets/game/buildings/industry_refine.png'],
  [TEX.indProduct, '/assets/game/buildings/industry_product.png'],
  [TEX.indField, '/assets/game/buildings/industry_field.png'],
  [TEX.indMine, '/assets/game/buildings/industry_mine.png'],
  [TEX.indKiln, '/assets/game/buildings/industry_kiln.png'],
  [TEX.indForge, '/assets/game/buildings/industry_forge.png'],
  [TEX.indLoom, '/assets/game/buildings/industry_loom.png'],
  [TEX.indMarket, '/assets/game/buildings/industry_market.png'],
  [TEX.indHarvestSnow, '/assets/game/weather/building_snow/industry_harvest_snow_overlay.png'],
  [TEX.indRefineSnow, '/assets/game/weather/building_snow/industry_refine_snow_overlay.png'],
  [TEX.indProductSnow, '/assets/game/weather/building_snow/industry_product_snow_overlay.png'],
  [TEX.indFieldSnow, '/assets/game/weather/building_snow/industry_field_snow_overlay.png'],
  [TEX.indMineSnow, '/assets/game/weather/building_snow/industry_mine_snow_overlay.png'],
  [TEX.indKilnSnow, '/assets/game/weather/building_snow/industry_kiln_snow_overlay.png'],
  [TEX.indForgeSnow, '/assets/game/weather/building_snow/industry_forge_snow_overlay.png'],
  [TEX.indLoomSnow, '/assets/game/weather/building_snow/industry_loom_snow_overlay.png'],
  [TEX.indMarketSnow, '/assets/game/weather/building_snow/industry_market_snow_overlay.png'],
  [TEX.craft, '/assets/game/buildings/craft_house.png'],
  [TEX.craftIndigo, '/assets/game/buildings/craft_indigo.png'],
  [TEX.craftBamboo, '/assets/game/buildings/craft_bamboo.png'],
  [TEX.craftCeramic, '/assets/game/buildings/craft_ceramic.png'],
  [TEX.craftMetal, '/assets/game/buildings/craft_metal.png'],
  [TEX.craftTextile, '/assets/game/buildings/craft_textile.png'],
  [TEX.craftPaper, '/assets/game/buildings/craft_paper.png'],
  [TEX.craftLacquer, '/assets/game/buildings/craft_lacquer.png'],
  [TEX.craftSnow, '/assets/game/weather/building_snow/craft_house_snow_overlay.png'],
  [TEX.craftIndigoSnow, '/assets/game/weather/building_snow/craft_indigo_snow_overlay.png'],
  [TEX.craftBambooSnow, '/assets/game/weather/building_snow/craft_bamboo_snow_overlay.png'],
  [TEX.craftCeramicSnow, '/assets/game/weather/building_snow/craft_ceramic_snow_overlay.png'],
  [TEX.craftMetalSnow, '/assets/game/weather/building_snow/craft_metal_snow_overlay.png'],
  [TEX.craftTextileSnow, '/assets/game/weather/building_snow/craft_textile_snow_overlay.png'],
  [TEX.craftPaperSnow, '/assets/game/weather/building_snow/craft_paper_snow_overlay.png'],
  [TEX.craftLacquerSnow, '/assets/game/weather/building_snow/craft_lacquer_snow_overlay.png'],
  [TEX.gate, '/assets/game/buildings/gate.png'],
  [TEX.gateSnow, '/assets/game/weather/building_snow/gate_snow_overlay.png'],
  ...BUILDING_WEATHER_IMAGE_TEXTURES,
  [TEX.marker, '/assets/game/effects/marker.png'],
  [TEX.water, '/assets/game/tiles/water.png'],
  [TEX.waterEdgeLeft, '/assets/game/tiles/water_edge_left.png'],
  [TEX.waterEdgeRight, '/assets/game/tiles/water_edge_right.png'],
  [TEX.bridge, '/assets/game/tiles/bridge.png'],
  [TEX.fence, '/assets/game/tiles/fence.png'],
  [TEX.tree, '/assets/game/tiles/tree.png'],
  [TEX.rock, '/assets/game/tiles/rock.png'],
  [TEX.willow, '/assets/game/props/willow.png'],
  [TEX.teaStall, '/assets/game/props/tea_stall.png'],
  [TEX.lanternPost, '/assets/game/props/lantern_post.png'],
  [TEX.banner, '/assets/game/props/banner.png'],
  [TEX.noticeBoard, '/assets/game/props/notice_board.png'],
  [TEX.dock, '/assets/game/props/dock.png'],
  [TEX.boat, '/assets/game/props/boat.png'],
  [TEX.marketCrates, '/assets/game/props/market_crates.png'],
  [TEX.paperUmbrella, '/assets/game/props/paper_umbrella.png'],
  [TEX.summerLushWillowCrown, '/assets/game/weather/props/summer_lush_willow_crown.png'],
  [TEX.summerLushTreeCrown, '/assets/game/weather/props/summer_lush_tree_crown.png'],
  [TEX.summerDenseReedClump, '/assets/game/weather/props/summer_dense_reed_clump.png'],
  [TEX.summerLotusPatch, '/assets/game/weather/props/summer_lotus_patch.png'],
  [TEX.summerWaterGrassClump, '/assets/game/weather/props/summer_water_grass_clump.png'],
  [TEX.summerDuckweedPatch, '/assets/game/weather/props/summer_duckweed_patch.png'],
  [TEX.rainPuddleOverlay, '/assets/game/weather/props/rain_puddle_overlay.png'],
  [TEX.rainWetStoneSheen, '/assets/game/weather/props/rain_wet_stone_sheen.png'],
  [TEX.autumnLeafPile, '/assets/game/weather/props/autumn_leaf_pile.png'],
  [TEX.autumnGoldTreeCrown, '/assets/game/weather/props/autumn_gold_tree_crown.png'],
  [TEX.winterSnowTreeCap, '/assets/game/weather/props/winter_snow_tree_cap.png'],
  [TEX.winterSnowWillowCap, '/assets/game/weather/props/winter_snow_willow_cap.png'],
  [TEX.winterSnowLanternCap, '/assets/game/weather/props/winter_snow_lantern_cap.png'],
  [TEX.winterSnowBridgeCap, '/assets/game/weather/props/winter_snow_bridge_cap.png'],
  [TEX.winterSnowDockCap, '/assets/game/weather/props/winter_snow_dock_cap.png'],
  [TEX.winterIcicleStrip, '/assets/game/weather/props/winter_icicle_strip.png'],
  [TEX.lightRainStreaks, '/assets/game/weather/vfx/light_rain_streaks.png'],
  [TEX.heavyRainStreaks, '/assets/game/weather/vfx/heavy_rain_streaks.png'],
  [TEX.rainSplashRipples, '/assets/game/weather/vfx/rain_splash_ripples.png'],
  [TEX.wetRoofGlint, '/assets/game/weather/vfx/wet_roof_glint.png'],
  [TEX.smallSnowflakes, '/assets/game/weather/vfx/small_snowflakes.png'],
  [TEX.driftingSnowCluster, '/assets/game/weather/vfx/drifting_snow_cluster.png'],
  [TEX.snowPuffGround, '/assets/game/weather/vfx/snow_puff_ground.png'],
  [TEX.frostyMistPatch, '/assets/game/weather/vfx/frosty_mist_patch.png'],
  [TEX.morningFogStrip, '/assets/game/weather/vfx/morning_fog_strip.png'],
  [TEX.autumnFallingLeaves, '/assets/game/weather/vfx/autumn_falling_leaves.png'],
  [TEX.windDustSwirl, '/assets/game/weather/vfx/wind_dust_swirl.png'],
  [TEX.summerFireflySparkles, '/assets/game/weather/vfx/summer_firefly_sparkles.png'],
  [TEX.moveTarget, '/assets/game/effects/move_target.png'],
] as const;

export const BUILDING_SNOW_TEXTURES: Readonly<Record<string, string>> = {
  [TEX.shopIndigo]: TEX.shopIndigoSnow,
  [TEX.shopBamboo]: TEX.shopBambooSnow,
  [TEX.craft]: TEX.craftSnow,
  [TEX.craftIndigo]: TEX.craftIndigoSnow,
  [TEX.craftBamboo]: TEX.craftBambooSnow,
  [TEX.craftCeramic]: TEX.craftCeramicSnow,
  [TEX.craftMetal]: TEX.craftMetalSnow,
  [TEX.craftTextile]: TEX.craftTextileSnow,
  [TEX.craftPaper]: TEX.craftPaperSnow,
  [TEX.craftLacquer]: TEX.craftLacquerSnow,
  [TEX.indHarvest]: TEX.indHarvestSnow,
  [TEX.indRefine]: TEX.indRefineSnow,
  [TEX.indProduct]: TEX.indProductSnow,
  [TEX.indField]: TEX.indFieldSnow,
  [TEX.indMine]: TEX.indMineSnow,
  [TEX.indKiln]: TEX.indKilnSnow,
  [TEX.indForge]: TEX.indForgeSnow,
  [TEX.indLoom]: TEX.indLoomSnow,
  [TEX.indMarket]: TEX.indMarketSnow,
  [TEX.gate]: TEX.gateSnow,
};

export const SPRITESHEET_TEXTURES = [
  [TEX.player, '/assets/game/characters/player_walk.png', 48, 48],
  [TEX.npcTourist, '/assets/game/characters/npc_tourist_walk.png', 48, 48],
  [TEX.npcVendor, '/assets/game/characters/npc_vendor_walk.png', 48, 48],
] as const;

export function preloadArtTextures(scene: Phaser.Scene) {
  IMAGE_TEXTURES.forEach(([key, url]) => scene.load.image(key, url));
  SPRITESHEET_TEXTURES.forEach(([key, url, frameWidth, frameHeight]) => {
    scene.load.spritesheet(key, url, { frameWidth, frameHeight });
  });
}

/** 在 BootScene 中调用，生成全部占位纹理 */
export function generatePlaceholderTextures(scene: Phaser.Scene) {
  if (scene.textures.exists(TEX.ground)) return; // 幂等：地区切换重建时不重复生成
  drawTile(scene, TEX.ground, 0xffffff, 0xe6e6e6); // 纯白底，运行时按地区 palette 着色
  drawTile(scene, TEX.road, 0xc8b393, 0xbfa882); // 土路黄
  drawTile(scene, TEX.wall, 0x6b5847, 0x5a4a3a); // 墙棕
  drawShop(scene, TEX.shopIndigo, 0x2e4a6b, 0x46688f); // 蓝染坊·靛蓝
  drawShop(scene, TEX.shopBamboo, 0x6f8b52, 0x86a368); // 竹编坊·竹绿
  drawShop(scene, TEX.indHarvest, 0x6f8b52, 0x88a86a); // 采集·绿
  drawShop(scene, TEX.indRefine, 0xb5742f, 0xd0903f); // 精炼·橙（炉火）
  drawShop(scene, TEX.indProduct, 0x8c4a7a, 0xa9608f); // 制作·紫（精品）
  drawShop(scene, TEX.craft, 0x2e4a6b, 0x46688f); // 手艺坊·靛蓝
  drawGate(scene); // 地区出入口·牌坊
  drawPlayer(scene);
  drawMarker(scene);
  drawWater(scene); // 河面 / 海面
  drawBridge(scene); // 石桥（过河通道）
  drawFence(scene); // 栅栏（地块边界）
  drawTree(scene); // 树木（地貌点缀·阻挡）
  drawRock(scene); // 山石（地貌点缀·阻挡）
  drawTourist(scene); // 游客 NPC
  drawVendor(scene); // 摊贩 / 关联人物 NPC
  drawMoveTarget(scene); // 点击寻路目标光环
}

/** 带细微噪点的地砖 */
function drawTile(scene: Phaser.Scene, key: string, base: number, accent: number) {
  const g = scene.add.graphics();
  g.fillStyle(base, 1).fillRect(0, 0, TILE, TILE);
  g.fillStyle(accent, 1);
  // 简单像素点缀，制造像素质感
  g.fillRect(4, 4, 3, 3);
  g.fillRect(20, 10, 3, 3);
  g.fillRect(12, 24, 3, 3);
  g.lineStyle(1, accent, 0.4).strokeRect(0, 0, TILE, TILE);
  g.generateTexture(key, TILE, TILE);
  g.destroy();
}

/** 体验点建筑（2x2 格） */
function drawShop(scene: Phaser.Scene, key: string, roof: number, wall: number) {
  const w = TILE * 2;
  const h = TILE * 2;
  const g = scene.add.graphics();
  g.fillStyle(wall, 1).fillRect(0, h * 0.45, w, h * 0.55); // 墙体
  g.fillStyle(roof, 1).fillTriangle(0, h * 0.45, w, h * 0.45, w / 2, 4); // 屋顶
  g.fillStyle(0x2b2620, 1).fillRect(w / 2 - 8, h - 18, 16, 18); // 门
  g.fillStyle(0xf4ece0, 1).fillRect(8, h * 0.6, 10, 10); // 窗
  g.fillRect(w - 18, h * 0.6, 10, 10);
  g.generateTexture(key, w, h);
  g.destroy();
}

/** 玩家占位角色（一个简单的小人） */
function drawPlayer(scene: Phaser.Scene) {
  const g = scene.add.graphics();
  g.fillStyle(0xb5452f, 1).fillRect(8, 10, 16, 16); // 身体·朱红
  g.fillStyle(0xf4d8b0, 1).fillRect(10, 2, 12, 10); // 头
  g.fillStyle(0x2b2620, 1).fillRect(8, 26, 6, 6); // 左脚
  g.fillRect(18, 26, 6, 6); // 右脚
  g.generateTexture(TEX.player, TILE, TILE);
  g.destroy();
}

/** 地区出入口·牌坊（2x2 格） */
function drawGate(scene: Phaser.Scene) {
  const w = TILE * 2;
  const h = TILE * 2;
  const g = scene.add.graphics();
  g.fillStyle(0x8a6a3a, 1).fillRect(6, 8, 8, h - 8); // 左柱
  g.fillRect(w - 14, 8, 8, h - 8); // 右柱
  g.fillStyle(0xa6342b, 1).fillRect(0, 4, w, 12); // 横额·朱红
  g.fillStyle(0xcaa84a, 1).fillRect(w / 2 - 6, 6, 12, 8); // 匾额
  g.generateTexture(TEX.gate, w, h);
  g.destroy();
}

/** 交互提示光标 */
function drawMarker(scene: Phaser.Scene) {
  const g = scene.add.graphics();
  g.fillStyle(0xb8893b, 1);
  g.fillTriangle(8, 0, 16, 12, 0, 12); // 向下三角
  g.generateTexture(TEX.marker, 16, 12);
  g.destroy();
}

/** 河面 / 海面（单格，半透明波纹） */
function drawWater(scene: Phaser.Scene) {
  const g = scene.add.graphics();
  g.fillStyle(0x3a6b8c, 1).fillRect(0, 0, TILE, TILE);
  g.fillStyle(0x4f80a3, 1).fillRect(0, 6, TILE, 4);
  g.fillStyle(0x5d92b6, 1).fillRect(0, 18, TILE, 4);
  g.fillStyle(0x82b0cf, 0.7).fillRect(6, 12, 6, 2);
  g.fillRect(20, 24, 6, 2);
  g.generateTexture(TEX.water, TILE, TILE);
  g.destroy();
}

/** 石桥（横跨河面的可通行通道） */
function drawBridge(scene: Phaser.Scene) {
  const g = scene.add.graphics();
  g.fillStyle(0x9c8460, 1).fillRect(0, 0, TILE, TILE);
  g.fillStyle(0x7d6747, 1).fillRect(0, 2, TILE, 3); // 上栏
  g.fillRect(0, TILE - 5, TILE, 3); // 下栏
  g.fillStyle(0x8a734f, 1).fillRect(6, 10, TILE - 12, 12); // 桥板纹
  g.generateTexture(TEX.bridge, TILE, TILE);
  g.destroy();
}

/** 栅栏（地块边界·阻挡，单格） */
function drawFence(scene: Phaser.Scene) {
  const g = scene.add.graphics();
  g.fillStyle(0x000000, 0);
  g.fillRect(0, 0, TILE, TILE);
  g.fillStyle(0x8a6a3a, 1).fillRect(2, 14, TILE - 4, 4); // 横档
  g.fillRect(4, 8, 4, TILE - 10); // 立柱
  g.fillRect(TILE - 8, 8, 4, TILE - 10);
  g.fillRect(TILE / 2 - 2, 8, 4, TILE - 10);
  g.generateTexture(TEX.fence, TILE, TILE);
  g.destroy();
}

/** 树木（地貌点缀·阻挡） */
function drawTree(scene: Phaser.Scene) {
  const g = scene.add.graphics();
  g.fillStyle(0x6a4a2a, 1).fillRect(TILE / 2 - 3, TILE - 12, 6, 12); // 树干
  g.fillStyle(0x3e6b3a, 1).fillCircle(TILE / 2, TILE / 2 - 2, 11); // 树冠
  g.fillStyle(0x4f8048, 1).fillCircle(TILE / 2 - 4, TILE / 2 - 4, 6);
  g.generateTexture(TEX.tree, TILE, TILE);
  g.destroy();
}

/** 山石（地貌点缀·阻挡） */
function drawRock(scene: Phaser.Scene) {
  const g = scene.add.graphics();
  g.fillStyle(0x7c7268, 1).fillTriangle(2, TILE - 2, TILE - 2, TILE - 2, TILE / 2, 6);
  g.fillStyle(0x968b80, 1).fillTriangle(8, TILE - 2, 22, TILE - 2, 15, 12);
  g.generateTexture(TEX.rock, TILE, TILE);
  g.destroy();
}

/** 游客 NPC（青衫小人） */
function drawTourist(scene: Phaser.Scene) {
  const g = scene.add.graphics();
  g.fillStyle(0x4a6b8a, 1).fillRect(8, 10, 16, 16); // 身体·青衫
  g.fillStyle(0xf4d8b0, 1).fillRect(10, 2, 12, 10); // 头
  g.fillStyle(0x2b2620, 1).fillRect(8, 26, 6, 6).fillRect(18, 26, 6, 6); // 脚
  g.generateTexture(TEX.npcTourist, TILE, TILE);
  g.destroy();
}

/** 摊贩 / 关联人物 NPC（赭衣，头戴笠） */
function drawVendor(scene: Phaser.Scene) {
  const g = scene.add.graphics();
  g.fillStyle(0x9c6a3a, 1).fillRect(8, 10, 16, 16); // 身体·赭衣
  g.fillStyle(0xf4d8b0, 1).fillRect(10, 4, 12, 9); // 头
  g.fillStyle(0x6a5230, 1).fillRect(6, 2, 20, 4); // 斗笠
  g.fillStyle(0x2b2620, 1).fillRect(8, 26, 6, 6).fillRect(18, 26, 6, 6); // 脚
  g.generateTexture(TEX.npcVendor, TILE, TILE);
  g.destroy();
}

/** 点击寻路目标光环 */
function drawMoveTarget(scene: Phaser.Scene) {
  const g = scene.add.graphics();
  g.lineStyle(2, 0xf0d9a0, 0.9).strokeCircle(TILE / 2, TILE / 2, TILE / 2 - 3);
  g.lineStyle(2, 0xf0d9a0, 0.5).strokeCircle(TILE / 2, TILE / 2, TILE / 2 - 8);
  g.generateTexture(TEX.moveTarget, TILE, TILE);
  g.destroy();
}
