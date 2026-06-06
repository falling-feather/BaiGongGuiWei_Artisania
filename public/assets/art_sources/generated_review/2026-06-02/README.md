# Generated Art Review Pack - 2026-06-02

This folder contains AI-generated raster art for review only.
These files are not mounted into the running game yet.

## Files

| File | Purpose | Grid | Notes |
|---|---|---|---|
| `review_buildings_qingming_5x4_v01.png` | Building and interaction-point source sheet | 5 columns x 4 rows | Flat green chroma-key background. |
| `review_buildings_qingming_5x4_v01_clean.png` | Re-saved building review sheet | 5 columns x 4 rows | Same content, kept for review after green-background inspection. |
| `review_props_qingming_4x3_v01.png` | Street, riverside, and market prop source sheet | 4 columns x 3 rows | Flat green chroma-key background. |
| `review_characters_walk_3sets_v01.png` | Character walking source sheet | 3 character blocks | Flat green chroma-key background; frame consistency needs review before slicing. |
| `review_tiles_terrain_4x4_v01.png` | Terrain tile source sheet | 4 columns x 4 rows | Contact sheet with grid lines; intended for visual approval before rebuilding tile atlas. |

## Building Sheet Mapping

Row-major order:

| # | Target key | Target filename |
|---|---|---|
| 1 | `TEX.shopIndigo` | `shop_indigo.png` |
| 2 | `TEX.shopBamboo` | `shop_bamboo.png` |
| 3 | `TEX.craft` | `craft_house.png` |
| 4 | `TEX.craftIndigo` | `craft_indigo.png` |
| 5 | `TEX.craftBamboo` | `craft_bamboo.png` |
| 6 | `TEX.craftCeramic` | `craft_ceramic.png` |
| 7 | `TEX.craftMetal` | `craft_metal.png` |
| 8 | `TEX.craftTextile` | `craft_textile.png` |
| 9 | `TEX.craftPaper` | `craft_paper.png` |
| 10 | `TEX.craftLacquer` | `craft_lacquer.png` |
| 11 | `TEX.indHarvest` | `industry_harvest.png` |
| 12 | `TEX.indRefine` | `industry_refine.png` |
| 13 | `TEX.indProduct` | `industry_product.png` |
| 14 | `TEX.indField` | `industry_field.png` |
| 15 | `TEX.indMine` | `industry_mine.png` |
| 16 | `TEX.indKiln` | `industry_kiln.png` |
| 17 | `TEX.indForge` | `industry_forge.png` |
| 18 | `TEX.indLoom` | `industry_loom.png` |
| 19 | `TEX.indMarket` | `industry_market.png` |
| 20 | `TEX.gate` | `gate.png` |

## Prop Sheet Mapping

Row-major order:

| # | Target key | Target filename |
|---|---|---|
| 1 | `TEX.willow` | `willow.png` |
| 2 | `TEX.archBridge` | `arch_bridge.png` |
| 3 | `TEX.teaStall` | `tea_stall.png` |
| 4 | `TEX.lanternPost` | `lantern_post.png` |
| 5 | `TEX.banner` | `banner.png` |
| 6 | `TEX.noticeBoard` | `notice_board.png` |
| 7 | `TEX.dock` | `dock.png` |
| 8 | `TEX.boat` | `boat.png` |
| 9 | `TEX.fence` | `fence.png` |
| 10 | `TEX.rock` | `rock.png` |
| 11 | `marketCrates` | `market_crates.png` |
| 12 | `paperUmbrella` | `paper_umbrella.png` |

## Character Sheet Mapping

The intended target is:

| Block | Target key | Target filename |
|---|---|---|
| 1 | `TEX.player` | `player_walk.png` |
| 2 | `TEX.npcTourist` | `npc_tourist_walk.png` |
| 3 | `TEX.npcVendor` | `npc_vendor_walk.png` |

Each character block should become a 4 rows x 4 columns sheet:
down, left, right, up.

## Terrain Sheet Mapping

Row-major order:

| # | Target key | Target filename |
|---|---|---|
| 1 | `TEX.ground` | `ground.png` |
| 2 | `TEX.groundMoss` | `ground_moss.png` |
| 3 | `TEX.groundStone` | `ground_stone.png` |
| 4 | `TEX.groundSoil` | `ground_soil.png` |
| 5 | `TEX.road` | `road.png` |
| 6 | `TEX.roadVertical` | `road_vertical.png` |
| 7 | `TEX.roadCross` | `road_cross.png` |
| 8 | `roadCorner` | `road_corner.png` |
| 9 | `TEX.water` | `water.png` |
| 10 | `TEX.waterEdgeLeft` | `water_edge_left.png` |
| 11 | `TEX.waterEdgeRight` | `water_edge_right.png` |
| 12 | `TEX.bridge` | `bridge.png` |
| 13 | `TEX.fence` | `fence.png` |
| 14 | `TEX.tree` | `tree.png` |
| 15 | `TEX.rock` | `rock.png` |
| 16 | `reedRiverbank` | `reed_riverbank.png` |

## Approval Notes

- These are generated reference sheets, not final sliced runtime assets.
- After approval, the next step is chroma-key removal, slicing, scale normalization, and only then mounting.
- The character sheet should be reviewed carefully for frame count and consistency before slicing.
