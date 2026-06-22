from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageStat


ROOT = Path(__file__).resolve().parents[1]
SRC_ROOT = ROOT / "public/assets/game/regions"
OUT_ROOT = ROOT / "public/assets/game/terrain/regions"
MANIFEST = (
    ROOT
    / "public/assets/art_sources/priority_art/2026-06-14/05_manifests/region_terrain_tiles_manifest.json"
)
PREVIEW = (
    ROOT
    / "public/assets/art_sources/priority_art/2026-06-14/05_manifests/region_terrain_tiles_preview.png"
)


@dataclass(frozen=True)
class CropSpec:
    source_col: int
    source_row: int
    rotate: int = 0


TILE_NAMES = [
    "ground",
    "ground_alt",
    "road",
    "road_vertical",
    "road_cross",
    "water",
    "water_edge_left",
    "water_edge_right",
    "vegetation",
    "courtyard",
]


# Source files are image_gen pixel-art strips. The coordinates below are 32px cells
# selected from the gridded QA contact sheet, not drawn placeholders.
REGION_CROPS: dict[str, dict[str, CropSpec]] = {
    "jiangnan": {
        "ground": CropSpec(18, 1),
        "ground_alt": CropSpec(19, 2),
        "road": CropSpec(16, 1),
        "road_vertical": CropSpec(16, 1, 90),
        "road_cross": CropSpec(17, 1),
        "water": CropSpec(8, 1),
        "water_edge_left": CropSpec(7, 1),
        "water_edge_right": CropSpec(9, 1),
        "vegetation": CropSpec(5, 1),
        "courtyard": CropSpec(17, 1),
    },
    "bashu": {
        "ground": CropSpec(2, 0),
        "ground_alt": CropSpec(5, 1),
        "road": CropSpec(3, 0),
        "road_vertical": CropSpec(3, 0, 90),
        "road_cross": CropSpec(4, 1),
        "water": CropSpec(8, 0),
        "water_edge_left": CropSpec(7, 0),
        "water_edge_right": CropSpec(9, 0),
        "vegetation": CropSpec(0, 0),
        "courtyard": CropSpec(12, 1),
    },
    "lingnan": {
        "ground": CropSpec(1, 1),
        "ground_alt": CropSpec(2, 0),
        "road": CropSpec(3, 1),
        "road_vertical": CropSpec(3, 1, 90),
        "road_cross": CropSpec(2, 1),
        "water": CropSpec(8, 0),
        "water_edge_left": CropSpec(7, 0),
        "water_edge_right": CropSpec(9, 0),
        "vegetation": CropSpec(12, 2),
        "courtyard": CropSpec(17, 1),
    },
    "ganpo": {
        "ground": CropSpec(0, 0),
        "ground_alt": CropSpec(2, 0),
        "road": CropSpec(4, 1),
        "road_vertical": CropSpec(4, 1, 90),
        "road_cross": CropSpec(5, 1),
        "water": CropSpec(6, 0),
        "water_edge_left": CropSpec(5, 0),
        "water_edge_right": CropSpec(7, 0),
        "vegetation": CropSpec(8, 0),
        "courtyard": CropSpec(16, 1),
    },
    "xiyu": {
        "ground": CropSpec(1, 1),
        "ground_alt": CropSpec(10, 1),
        "road": CropSpec(3, 1),
        "road_vertical": CropSpec(3, 1, 90),
        "road_cross": CropSpec(13, 0),
        "water": CropSpec(7, 0),
        "water_edge_left": CropSpec(6, 0),
        "water_edge_right": CropSpec(8, 0),
        "vegetation": CropSpec(4, 2),
        "courtyard": CropSpec(13, 1),
    },
}


READABILITY_BLEND: dict[str, float] = {
    "ground": 0.34,
    "ground_alt": 0.38,
    "road": 0.54,
    "road_vertical": 0.54,
    "road_cross": 0.58,
    "water": 0.68,
    "water_edge_left": 0.7,
    "water_edge_right": 0.7,
    "courtyard": 0.44,
}

TARGET_LUMINANCE: dict[str, float] = {
    "ground": 124,
    "ground_alt": 116,
    "road": 136,
    "road_vertical": 136,
    "road_cross": 140,
    "water": 86,
    "water_edge_left": 98,
    "water_edge_right": 98,
    "courtyard": 132,
}


EDGE_SOFTEN_TILES = set(READABILITY_BLEND)


def soften_tile_edges(tile: Image.Image) -> Image.Image:
    stat = ImageStat.Stat(tile.convert("RGB"))
    average = tuple(int(channel) for channel in stat.mean)
    overlay = Image.new("RGBA", tile.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    max_x = tile.width - 1
    max_y = tile.height - 1
    for inset, alpha in ((0, 76), (1, 48), (2, 28)):
        draw.rectangle((inset, inset, max_x - inset, max_y - inset), outline=(*average, alpha))
    return Image.alpha_composite(tile.convert("RGBA"), overlay)


def simplify_tile(tile: Image.Image, name: str) -> Image.Image:
    if name == "vegetation":
        return tile
    tile = tile.filter(ImageFilter.MedianFilter(3)).convert("RGBA")
    tile = ImageEnhance.Contrast(tile).enhance(0.82)
    tile = ImageEnhance.Color(tile).enhance(0.9)
    if name in READABILITY_BLEND:
        stat = ImageStat.Stat(tile.convert("RGB"))
        average = tuple(int(channel) for channel in stat.mean)
        base = Image.new("RGBA", tile.size, (*average, 255))
        tile = Image.blend(base, tile, READABILITY_BLEND[name])
    target_luminance = TARGET_LUMINANCE.get(name)
    if target_luminance is not None:
        stat = ImageStat.Stat(tile.convert("RGB"))
        mean_luminance = max(1.0, sum(stat.mean) / 3)
        if mean_luminance < target_luminance:
            tile = ImageEnhance.Brightness(tile).enhance(min(1.8, target_luminance / mean_luminance))
    if name in EDGE_SOFTEN_TILES:
        tile = soften_tile_edges(tile)
    tile = tile.resize((16, 16), Image.Resampling.BILINEAR).resize((32, 32), Image.Resampling.NEAREST)
    alpha = tile.getchannel("A")
    tile = tile.convert("RGB").quantize(colors=28, dither=Image.Dither.NONE).convert("RGBA")
    tile.putalpha(alpha)
    return tile


def crop_tile(source: Image.Image, spec: CropSpec, name: str) -> Image.Image:
    box = (
        spec.source_col * 32,
        spec.source_row * 32,
        spec.source_col * 32 + 32,
        spec.source_row * 32 + 32,
    )
    tile = source.crop(box).convert("RGBA")
    if spec.rotate:
        tile = tile.rotate(spec.rotate, expand=False)
    return simplify_tile(tile, name)


def build_preview(manifest_rows: list[dict[str, str]]) -> None:
    cell = 32
    label_h = 24
    left_w = 82
    width = left_w + len(TILE_NAMES) * cell
    height = label_h + len(manifest_rows) * (cell + label_h)
    canvas = Image.new("RGBA", (width, height), (245, 242, 232, 255))
    draw = ImageDraw.Draw(canvas)
    for index, name in enumerate(TILE_NAMES):
        draw.text((left_w + index * cell + 2, 5), name[:4], fill=(44, 35, 24, 255))
    y = label_h
    for row in manifest_rows:
        draw.text((6, y + 8), row["region"], fill=(44, 35, 24, 255))
        for index, name in enumerate(TILE_NAMES):
            tile = Image.open(ROOT / row["tiles"][name]).convert("RGBA")
            canvas.alpha_composite(tile, (left_w + index * cell, y))
            draw.rectangle(
                (left_w + index * cell, y, left_w + (index + 1) * cell - 1, y + cell - 1),
                outline=(92, 76, 48, 160),
            )
        y += cell + label_h
    PREVIEW.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(PREVIEW)


def main() -> None:
    OUT_ROOT.mkdir(parents=True, exist_ok=True)
    manifest_rows: list[dict[str, object]] = []

    for region, crops in REGION_CROPS.items():
        source_path = SRC_ROOT / region / "street_tiles.png"
        source = Image.open(source_path).convert("RGBA")
        region_out = OUT_ROOT / region
        region_out.mkdir(parents=True, exist_ok=True)
        tile_entries: dict[str, str] = {}
        for name in TILE_NAMES:
            tile = crop_tile(source, crops[name], name)
            out_path = region_out / f"{name}.png"
            tile.save(out_path)
            tile_entries[name] = str(out_path.relative_to(ROOT)).replace("\\", "/")
        manifest_rows.append(
            {
                "region": region,
                "source": str(source_path.relative_to(ROOT)).replace("\\", "/"),
                "tiles": tile_entries,
            }
        )

    MANIFEST.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST.write_text(json.dumps({"tiles": manifest_rows}, ensure_ascii=False, indent=2), encoding="utf-8")
    build_preview(manifest_rows)  # type: ignore[arg-type]
    print(f"Wrote {MANIFEST.relative_to(ROOT)}")
    print(f"Wrote {PREVIEW.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
