# Western Region Assets - 2026-06-05

This folder stores generated review sheets for the first Silk Road / Western Regions biome pass. Runtime PNGs are sliced by:

```bash
python tools/slice_western_region_assets.py
```

## Source Sheets

| File | Layout | Runtime output |
|---|---:|---|
| `western_buildings_4x3_v01.png` | 4 x 3 | `public/assets/game/buildings/western_region/` |
| `western_props_4x4_v01.png` | 4 x 4 | `public/assets/game/props/western_region/` |
| `western_tiles_6x4_v01.png` | 6 x 4 | `public/assets/game/tiles/western_region/` |

## Runtime Mapping

Buildings: caravanserai, oasis tea house, desert market shop, rammed-earth watch gate, adobe workshop, pottery kiln yard, post station, orchard house, flame pavilion, observatory, weaver tent shop, frontier granary.

Props: date palm, tamarisk shrub, pack camel, camel cart, oasis well, water jars, carpet stall, spice baskets, silk bales, grape trellis, pomegranate tree, wind banner, milestone, brass lantern post, tent canopy, astrolabe stand.

Terrain tiles: sand, dune sand, cracked clay, gravel, dry scrub, oasis grass, tamarisk grass, salt flat, irrigated field, vineyard soil, scree, packed oasis earth, caravan tracks, mudbrick road, stone road, mosaic courtyard, oasis water and edge tiles, reed bank, salt lake shallows, irrigation canal.

## Review Outputs

- `western_runtime_preview.png`: sliced buildings and props on a dark background.
- `western_tile_seam_validation_preview.png`: mosaic tests for desert, oasis, road, water edge, and rugged terrain joins.

Generated source sheets are project review inputs. Runtime PNGs are mounted in the map editor palette; the main Phaser map generation is not changed in this pass.

Status note: `western_buildings_4x3_v01.png` is AI-generated. `western_tiles_6x4_v01.png` and `western_props_4x4_v01.png` are first-pass PNG source sheets generated locally so the editor pipeline can be mounted immediately. The prop sheet is intentionally replaceable; overwrite it with a refined generated sheet and rerun the slicer when image generation quota is available.
