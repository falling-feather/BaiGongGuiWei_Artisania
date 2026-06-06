# Open World Expansion Assets - 2026-06-04

This folder keeps the generated review sheets for the first open-world/life-sim expansion pass. Runtime PNGs are sliced by:

```bash
python tools/slice_open_world_expansion_assets.py
```

## Source Sheets

| File | Layout | Runtime output |
|---|---:|---|
| `open_world_buildings_4x3_v01.png` | 4 x 3 | `public/assets/game/buildings/open_world/` |
| `open_world_props_4x4_v01.png` | 4 x 4 | `public/assets/game/props/open_world/` |
| `activity_icons_4x4_v01.png` | 4 x 4 | `public/assets/game/icons/actions/` |
| `terrain_expansion_6x4_v01.png` | 6 x 4 | `public/assets/game/tiles/open_world/` |

## Runtime Mapping

Buildings: sword hall, meditation hall, farm cottage, seed/tool shop, herbal clinic, carpenter yard, scholar academy, riverside inn, horse stable, fishery hut, bathhouse, granary/storehouse.

Props: sword rack, training dummy, archery target, sword practice circle, meditation mat, incense burner, lotus altar, qigong stone garden, tilled plot, sprout plot, scarecrow, watering jars and hoe rack, cooking stove, fishing stand, reading desk, weaving workbench.

Action icons: sword practice, archery, meditation, farming, watering, harvesting, fishing, cooking, tea brewing, study, carpentry, weaving, mining, trading, resting, travel.

Terrain tiles: meadow, wildflower grass, clover moss, packed earth, dry/wet tilled soil, seedling/mature crops, rice paddy, muddy/pebble/slate paths, path edges/corner/T-junction, pond center/edges, reed bank, sandy river bank, fallen leaf ground, open snow, courtyard brick.

## Review Outputs

- `runtime_open_world_preview.png`: sliced buildings, props, and icons on a dark background.
- `tile_seam_validation_preview.png`: small mosaic tests for repeated grass, crop plots, road joins, pond edges, and seasonal tiles.
- `editor_mount_verification.png`: browser/editor verification after placing meadow grass, dry tilled soil, sword hall, training dummy, and sword-practice icon.

Generated sheets are for project review and slicing. The runtime PNGs are mounted in the map editor palette; the main Phaser map generation is not changed in this pass.
