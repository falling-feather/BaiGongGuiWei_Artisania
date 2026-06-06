# Weather Art Review Pack - 2026-06-02

This folder contains AI-generated weather and season art for review only.
These files are not mounted into the running game yet.

## Weather Mechanism Draft

The proposed runtime layering is:

1. Base building / terrain / prop sprite.
2. Season or weather variant layer.
3. Optional weather VFX layer.

This keeps the same building identity while changing its weather style:

- Summer: swap in richer vegetation, dense reeds, water-grass pond tiles.
- Rain: use wet road / puddle / wet stone tiles, plus rain VFX.
- Autumn: use fallen-leaf ground and leaf overlays.
- Winter: place snow overlays on the same building and prop sprites, and swap in snow ground / snow road tiles.

## Required New Review Blocks

| Category | Count | Generated file | Runtime direction |
|---|---:|---|---|
| Building winter overlays | 20 | `weather_building_snow_overlays_5x4_v01.png` | One snow overlay per existing building key. |
| Seasonal/weather terrain tiles | 16 | `weather_terrain_tiles_4x4_v01.png` | Tile replacements or new landscape tiles. |
| Seasonal prop overlays | 16 | `weather_prop_overlays_4x4_v01.png` | Replacement crowns, snow caps, pond plants, dock/bridge snow. |
| Weather VFX sprites | 12 | `weather_vfx_sprites_4x3_v01.png` | Rain, snow, fog, leaves, wind, summer sparkles. |

Total generated review blocks: 64.

## Building Snow Overlay Mapping

Row-major order:

| # | Base building key | Proposed overlay filename |
|---|---|---|
| 1 | `TEX.shopIndigo` | `shop_indigo_snow_overlay.png` |
| 2 | `TEX.shopBamboo` | `shop_bamboo_snow_overlay.png` |
| 3 | `TEX.craft` | `craft_house_snow_overlay.png` |
| 4 | `TEX.craftIndigo` | `craft_indigo_snow_overlay.png` |
| 5 | `TEX.craftBamboo` | `craft_bamboo_snow_overlay.png` |
| 6 | `TEX.craftCeramic` | `craft_ceramic_snow_overlay.png` |
| 7 | `TEX.craftMetal` | `craft_metal_snow_overlay.png` |
| 8 | `TEX.craftTextile` | `craft_textile_snow_overlay.png` |
| 9 | `TEX.craftPaper` | `craft_paper_snow_overlay.png` |
| 10 | `TEX.craftLacquer` | `craft_lacquer_snow_overlay.png` |
| 11 | `TEX.indHarvest` | `industry_harvest_snow_overlay.png` |
| 12 | `TEX.indRefine` | `industry_refine_snow_overlay.png` |
| 13 | `TEX.indProduct` | `industry_product_snow_overlay.png` |
| 14 | `TEX.indField` | `industry_field_snow_overlay.png` |
| 15 | `TEX.indMine` | `industry_mine_snow_overlay.png` |
| 16 | `TEX.indKiln` | `industry_kiln_snow_overlay.png` |
| 17 | `TEX.indForge` | `industry_forge_snow_overlay.png` |
| 18 | `TEX.indLoom` | `industry_loom_snow_overlay.png` |
| 19 | `TEX.indMarket` | `industry_market_snow_overlay.png` |
| 20 | `TEX.gate` | `gate_snow_overlay.png` |

## Seasonal Terrain Tile Mapping

Row-major order:

| # | Proposed key | Proposed filename | Use |
|---|---|---|---|
| 1 | `summerLushGround` | `summer_lush_ground.png` | Summer ground variant |
| 2 | `summerFlowerGround` | `summer_flower_ground.png` | Summer decorative ground |
| 3 | `summerDenseMossGround` | `summer_dense_moss_ground.png` | Lush moss ground |
| 4 | `summerReedBank` | `summer_reed_bank.png` | Dense reed riverbank |
| 5 | `pondWaterGrassCenter` | `pond_water_grass_center.png` | New water-grass pond center |
| 6 | `pondWaterGrassEdgeLeft` | `pond_water_grass_edge_left.png` | New water-grass pond left edge |
| 7 | `pondWaterGrassEdgeRight` | `pond_water_grass_edge_right.png` | New water-grass pond right edge |
| 8 | `pondLotusDuckweed` | `pond_lotus_duckweed.png` | New pond landmark tile |
| 9 | `rainWetRoad` | `rain_wet_road.png` | Rain road variant |
| 10 | `rainPuddleRoad` | `rain_puddle_road.png` | Rain road puddle |
| 11 | `rainMuddyGround` | `rain_muddy_ground.png` | Rain mud ground |
| 12 | `rainWetStoneGround` | `rain_wet_stone_ground.png` | Wet paving |
| 13 | `autumnLeafGround` | `autumn_leaf_ground.png` | Autumn ground |
| 14 | `autumnLeafRoad` | `autumn_leaf_road.png` | Autumn road |
| 15 | `winterSnowGround` | `winter_snow_ground.png` | Winter ground |
| 16 | `winterSnowRoad` | `winter_snow_road.png` | Winter road |

## Seasonal Prop Overlay Mapping

Row-major order:

| # | Proposed key | Proposed filename |
|---|---|---|
| 1 | `summerLushWillowCrown` | `summer_lush_willow_crown.png` |
| 2 | `summerLushTreeCrown` | `summer_lush_tree_crown.png` |
| 3 | `summerDenseReedClump` | `summer_dense_reed_clump.png` |
| 4 | `summerLotusPatch` | `summer_lotus_patch.png` |
| 5 | `summerWaterGrassClump` | `summer_water_grass_clump.png` |
| 6 | `summerDuckweedPatch` | `summer_duckweed_patch.png` |
| 7 | `rainPuddleOverlay` | `rain_puddle_overlay.png` |
| 8 | `rainWetStoneSheen` | `rain_wet_stone_sheen.png` |
| 9 | `autumnLeafPile` | `autumn_leaf_pile.png` |
| 10 | `autumnGoldTreeCrown` | `autumn_gold_tree_crown.png` |
| 11 | `winterSnowTreeCap` | `winter_snow_tree_cap.png` |
| 12 | `winterSnowWillowCap` | `winter_snow_willow_cap.png` |
| 13 | `winterSnowLanternCap` | `winter_snow_lantern_cap.png` |
| 14 | `winterSnowBridgeCap` | `winter_snow_bridge_cap.png` |
| 15 | `winterSnowDockCap` | `winter_snow_dock_cap.png` |
| 16 | `winterIcicleStrip` | `winter_icicle_strip.png` |

## Weather VFX Mapping

Row-major order:

| # | Proposed key | Proposed filename |
|---|---|---|
| 1 | `lightRainStreaks` | `light_rain_streaks.png` |
| 2 | `heavyRainStreaks` | `heavy_rain_streaks.png` |
| 3 | `rainSplashRipples` | `rain_splash_ripples.png` |
| 4 | `wetRoofGlint` | `wet_roof_glint.png` |
| 5 | `smallSnowflakes` | `small_snowflakes.png` |
| 6 | `driftingSnowCluster` | `drifting_snow_cluster.png` |
| 7 | `snowPuffGround` | `snow_puff_ground.png` |
| 8 | `frostyMistPatch` | `frosty_mist_patch.png` |
| 9 | `morningFogStrip` | `morning_fog_strip.png` |
| 10 | `autumnFallingLeaves` | `autumn_falling_leaves.png` |
| 11 | `windDustSwirl` | `wind_dust_swirl.png` |
| 12 | `summerFireflySparkles` | `summer_firefly_sparkles.png` |

## Review Notes

- The snow building sheet contains roof/eave visual context, so it should be treated as a winter overlay layer or snow roof variant, not a pure white mask.
- The pond-water-grass tiles are the key new landscape tile group requested for summer/water scenery.
- Slicing, chroma-key removal, alpha validation, scale normalization, and first-region runtime mounting were completed on the `image_test` branch.

## Runtime Mount Status

Mounted for the first region (`jiangnan`) as of this branch:

- `tools/slice_weather_assets.py` slices the review sheets into runtime PNGs under `public/assets/game/weather/`.
- `src/game/textures.ts` preloads seasonal terrain tiles, prop overlays, VFX sprites, and building snow overlays.
- `src/game/EventBus.ts` / `src/game/regionSpec.ts` pass `season` and `weather` through `RegionMapSpec`.
- `src/game/scenes/StreetScene.ts` applies the Jiangnan weather art:
  - Summer swaps in lush ground and water-grass pond tiles, with lotus/reed prop accents.
  - Rain uses wet road and rain VFX.
  - Autumn uses fallen-leaf ground/road and leaf VFX.
  - Winter uses snow ground/road, building snow overlays, snow prop overlays, and snow VFX.

Development QA shortcuts:

- `?qaSeason=summer`
- `?qaSeason=autumn`
- `?qaSeason=winter`
- `?qaWeather=rain`
