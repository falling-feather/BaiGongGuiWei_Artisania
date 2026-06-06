from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "public" / "assets" / "art_sources" / "western_region" / "2026-06-05"
GAME_DIR = ROOT / "public" / "assets" / "game"


BUILDINGS: list[tuple[str, tuple[int, int]]] = [
    ("western_caravanserai.png", (96, 88)),
    ("western_oasis_tea_house.png", (96, 88)),
    ("western_desert_market.png", (96, 88)),
    ("western_watch_gate.png", (96, 88)),
    ("western_adobe_workshop.png", (96, 88)),
    ("western_pottery_kiln.png", (96, 88)),
    ("western_post_station.png", (96, 88)),
    ("western_orchard_house.png", (96, 88)),
    ("western_flame_pavilion.png", (96, 88)),
    ("western_observatory.png", (96, 88)),
    ("western_weaver_tent.png", (96, 88)),
    ("western_granary.png", (96, 88)),
]

PROPS: list[tuple[str, tuple[int, int]]] = [
    ("desert_date_palm.png", (72, 96)),
    ("tamarisk_shrub.png", (72, 72)),
    ("camel_pack.png", (96, 72)),
    ("camel_cart.png", (96, 72)),
    ("desert_well.png", (80, 72)),
    ("clay_water_jars.png", (72, 64)),
    ("carpet_stall.png", (96, 72)),
    ("spice_baskets.png", (80, 64)),
    ("silk_bales.png", (80, 64)),
    ("grape_trellis.png", (96, 80)),
    ("pomegranate_tree.png", (72, 96)),
    ("wind_banner.png", (48, 88)),
    ("stone_milestone.png", (48, 48)),
    ("brass_lantern_post.png", (48, 88)),
    ("desert_tent_canopy.png", (96, 80)),
    ("astrolabe_stand.png", (72, 72)),
]

TILES: list[tuple[str, str, bool]] = [
    ("desert_sand.png", "terrain", False),
    ("dune_sand.png", "terrain", False),
    ("cracked_dry_clay.png", "terrain", False),
    ("gravel_plain.png", "terrain", False),
    ("dry_scrub_ground.png", "terrain", False),
    ("oasis_grass.png", "terrain", False),
    ("tamarisk_grass.png", "terrain", False),
    ("salt_flat.png", "terrain", False),
    ("irrigated_field.png", "terrain", False),
    ("vineyard_soil.png", "terrain", False),
    ("mountain_scree.png", "terrain", True),
    ("packed_oasis_earth.png", "terrain", False),
    ("caravan_track_horizontal.png", "road", False),
    ("caravan_track_vertical.png", "road", False),
    ("caravan_crossroad.png", "road", False),
    ("mudbrick_road.png", "road", False),
    ("stone_caravan_road.png", "road", False),
    ("mosaic_courtyard.png", "road", False),
    ("oasis_water_center.png", "water", True),
    ("oasis_water_edge_top.png", "water", True),
    ("oasis_water_edge_bottom.png", "water", True),
    ("reed_oasis_bank.png", "water", True),
    ("salt_lake_shallow.png", "water", True),
    ("irrigation_canal.png", "water", True),
]


def grid_crop(img: Image.Image, cols: int, rows: int, index: int, inset: int = 0) -> Image.Image:
    col = index % cols
    row = index // cols
    x0 = round(col * img.width / cols) + inset
    y0 = round(row * img.height / rows) + inset
    x1 = round((col + 1) * img.width / cols) - inset
    y1 = round((row + 1) * img.height / rows) - inset
    return img.crop((x0, y0, x1, y1))


def keyed_distance(r: int, g: int, b: int, key: tuple[int, int, int]) -> float:
    return ((r - key[0]) ** 2 + (g - key[1]) ** 2 + (b - key[2]) ** 2) ** 0.5


def chroma_key(img: Image.Image) -> Image.Image:
    rgba = img.convert("RGBA")
    keyed = []
    key_rgb = (0, 255, 0)
    for r, g, b, a in rgba.getdata():
        distance = keyed_distance(r, g, b, key_rgb)
        if distance < 96:
            keyed.append((r, g, b, 0))
        elif distance < 138:
            alpha = max(0, min(a, round(((distance - 96) / 42) * 255)))
            keyed.append((min(r, 120), min(g, max(r, b) + 22), min(b, 120), alpha))
        elif g > 170 and r < 145 and b < 145 and g > r * 1.25 and g > b * 1.25:
            keyed.append((r, g, b, 0))
        else:
            keyed.append((r, g, b, a))
    rgba.putdata(keyed)
    return rgba


def alpha_bbox(img: Image.Image) -> tuple[int, int, int, int] | None:
    return img.convert("RGBA").getchannel("A").getbbox()


def remove_low_alpha_noise(img: Image.Image, threshold: int = 32) -> Image.Image:
    rgba = img.convert("RGBA")
    cleaned = []
    for r, g, b, a in rgba.getdata():
        cleaned.append((r, g, b, 0) if a < threshold else (r, g, b, a))
    rgba.putdata(cleaned)
    return rgba


def fit_to_canvas(
    img: Image.Image,
    size: tuple[int, int],
    bottom_pad: int = 0,
    resample: Image.Resampling = Image.Resampling.LANCZOS,
) -> Image.Image:
    rgba = img.convert("RGBA")
    bbox = alpha_bbox(rgba)
    canvas = Image.new("RGBA", size)
    if not bbox:
        return canvas
    crop = rgba.crop(bbox)
    max_w = size[0]
    max_h = size[1] - bottom_pad
    scale = min(max_w / crop.width, max_h / crop.height)
    resized = crop.resize((max(1, round(crop.width * scale)), max(1, round(crop.height * scale))), resample)
    canvas.alpha_composite(resized, ((size[0] - resized.width) // 2, size[1] - bottom_pad - resized.height))
    return remove_low_alpha_noise(canvas)


def save_buildings() -> None:
    source = Image.open(SOURCE_DIR / "western_buildings_4x3_v01.png").convert("RGB")
    out = GAME_DIR / "buildings" / "western_region"
    out.mkdir(parents=True, exist_ok=True)
    for index, (filename, size) in enumerate(BUILDINGS):
        cell = chroma_key(grid_crop(source, 4, 3, index, inset=2))
        fit_to_canvas(cell, size).save(out / filename)


def save_props() -> None:
    source = Image.open(SOURCE_DIR / "western_props_4x4_v01.png").convert("RGB")
    out = GAME_DIR / "props" / "western_region"
    out.mkdir(parents=True, exist_ok=True)
    for index, (filename, size) in enumerate(PROPS):
        cell = chroma_key(grid_crop(source, 4, 4, index, inset=2))
        fit_to_canvas(cell, size, bottom_pad=1).save(out / filename)


def save_tiles() -> None:
    source = Image.open(SOURCE_DIR / "western_tiles_6x4_v01.png").convert("RGB")
    out = GAME_DIR / "tiles" / "western_region"
    out.mkdir(parents=True, exist_ok=True)
    for index, (filename, _category, _solid) in enumerate(TILES):
        cell = grid_crop(source, 6, 4, index, inset=5)
        tile = cell.resize((32, 32), Image.Resampling.LANCZOS).convert("RGBA")
        tile.save(out / filename)


def paste_tile(canvas: Image.Image, tile_name: str, x: int, y: int) -> None:
    tile = Image.open(GAME_DIR / "tiles" / "western_region" / tile_name).convert("RGBA")
    canvas.alpha_composite(tile, (x * 32, y * 32))


def save_tile_validation_preview() -> None:
    canvas = Image.new("RGBA", (640, 384), (32, 30, 25, 255))
    draw = ImageDraw.Draw(canvas)
    panels = [(0, 0, 6, 5), (7, 0, 6, 5), (14, 0, 5, 5), (0, 7, 7, 4), (9, 7, 8, 4)]
    for x, y, w, h in panels:
        draw.rectangle((x * 32 - 2, y * 32 - 2, (x + w) * 32 + 1, (y + h) * 32 + 1), outline=(102, 83, 55, 255), width=2)

    desert_cycle = ["desert_sand.png", "dune_sand.png", "gravel_plain.png", "dry_scrub_ground.png"]
    for y in range(5):
        for x in range(6):
            paste_tile(canvas, desert_cycle[(x + y) % len(desert_cycle)], x, y)

    farm_cycle = ["oasis_grass.png", "irrigated_field.png", "vineyard_soil.png", "tamarisk_grass.png"]
    for y in range(5):
        for x in range(6):
            paste_tile(canvas, farm_cycle[(x // 2 + y) % len(farm_cycle)], 7 + x, y)

    for y in range(5):
        for x in range(5):
            paste_tile(canvas, "packed_oasis_earth.png", 14 + x, y)
    for x in range(5):
        paste_tile(canvas, "caravan_track_horizontal.png", 14 + x, 2)
    for y in range(5):
        paste_tile(canvas, "caravan_track_vertical.png", 16, y)
    paste_tile(canvas, "caravan_crossroad.png", 16, 2)
    paste_tile(canvas, "mudbrick_road.png", 18, 1)
    paste_tile(canvas, "mosaic_courtyard.png", 18, 4)

    for y in range(4):
        for x in range(7):
            if y == 0:
                tile = "oasis_water_edge_top.png"
            elif y == 3:
                tile = "oasis_water_edge_bottom.png"
            elif x in (0, 6):
                tile = "reed_oasis_bank.png"
            else:
                tile = "oasis_water_center.png"
            paste_tile(canvas, tile, x, 7 + y)

    rugged = ["cracked_dry_clay.png", "salt_flat.png", "mountain_scree.png", "salt_lake_shallow.png", "stone_caravan_road.png", "irrigation_canal.png"]
    for y in range(4):
        for x in range(8):
            paste_tile(canvas, rugged[(x // 2 + y) % len(rugged)], 9 + x, 7 + y)

    canvas.save(SOURCE_DIR / "western_tile_seam_validation_preview.png")


def save_runtime_preview() -> None:
    preview = Image.new("RGBA", (960, 620), (31, 29, 24, 255))
    draw = ImageDraw.Draw(preview)
    x, y = 16, 16
    for index, (filename, _size) in enumerate(BUILDINGS):
        img = Image.open(GAME_DIR / "buildings" / "western_region" / filename).convert("RGBA")
        preview.alpha_composite(img, (x, y))
        x += 150
        if (index + 1) % 6 == 0:
            x = 16
            y += 118

    x, y = 16, 270
    for index, (filename, _size) in enumerate(PROPS):
        img = Image.open(GAME_DIR / "props" / "western_region" / filename).convert("RGBA")
        preview.alpha_composite(img, (x, y))
        x += 110
        if (index + 1) % 8 == 0:
            x = 16
            y += 105

    draw.rectangle((0, 0, preview.width - 1, preview.height - 1), outline=(125, 96, 54, 255), width=2)
    preview.save(SOURCE_DIR / "western_runtime_preview.png")


def validate_outputs() -> None:
    checks = [
        GAME_DIR / "buildings" / "western_region" / "western_caravanserai.png",
        GAME_DIR / "props" / "western_region" / "camel_pack.png",
        GAME_DIR / "tiles" / "western_region" / "desert_sand.png",
        GAME_DIR / "tiles" / "western_region" / "oasis_water_center.png",
    ]
    for path in checks:
        img = Image.open(path).convert("RGBA")
        if img.getchannel("A").getbbox() is None:
            raise RuntimeError(f"Empty alpha output: {path}")


def main() -> None:
    save_buildings()
    save_props()
    save_tiles()
    save_tile_validation_preview()
    save_runtime_preview()
    validate_outputs()
    print(f"western-region assets written under {GAME_DIR}")


if __name__ == "__main__":
    main()
