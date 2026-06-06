from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "public" / "assets" / "art_sources" / "open_world_expansion" / "2026-06-04"
GAME_DIR = ROOT / "public" / "assets" / "game"


BUILDINGS: list[tuple[str, tuple[int, int]]] = [
    ("sword_hall.png", (96, 88)),
    ("meditation_hall.png", (96, 88)),
    ("farm_cottage.png", (96, 88)),
    ("seed_tool_shop.png", (96, 88)),
    ("herbal_clinic.png", (96, 88)),
    ("carpenter_yard.png", (96, 88)),
    ("scholar_academy.png", (96, 88)),
    ("riverside_inn.png", (96, 88)),
    ("horse_stable.png", (96, 88)),
    ("fishery_hut.png", (96, 88)),
    ("bathhouse.png", (96, 88)),
    ("granary_storehouse.png", (96, 88)),
]

PROPS: list[tuple[str, tuple[int, int]]] = [
    ("sword_rack.png", (72, 64)),
    ("training_dummy.png", (64, 72)),
    ("archery_target.png", (72, 72)),
    ("sword_practice_circle.png", (96, 80)),
    ("meditation_mat.png", (80, 56)),
    ("incense_burner.png", (64, 72)),
    ("lotus_altar.png", (80, 72)),
    ("qigong_stone_garden.png", (88, 88)),
    ("tilled_plot_prop.png", (96, 72)),
    ("sprout_plot_prop.png", (96, 72)),
    ("scarecrow.png", (80, 88)),
    ("watering_jar_rack.png", (80, 72)),
    ("cooking_stove.png", (96, 80)),
    ("fishing_stand.png", (80, 80)),
    ("reading_desk.png", (96, 80)),
    ("weaving_workbench.png", (96, 80)),
]

ACTION_ICONS: list[str] = [
    "sword_practice.png",
    "archery_practice.png",
    "meditation.png",
    "farming.png",
    "watering.png",
    "harvesting.png",
    "fishing.png",
    "cooking.png",
    "tea_brewing.png",
    "study.png",
    "carpentry.png",
    "weaving.png",
    "mining.png",
    "trading.png",
    "resting.png",
    "travel.png",
]

TILES: list[tuple[str, str, bool]] = [
    ("meadow_grass.png", "terrain", False),
    ("wildflower_grass.png", "terrain", False),
    ("clover_moss.png", "terrain", False),
    ("packed_earth.png", "terrain", False),
    ("tilled_soil_dry.png", "terrain", False),
    ("tilled_soil_wet.png", "terrain", False),
    ("crop_seedling.png", "terrain", False),
    ("crop_mature.png", "terrain", False),
    ("rice_paddy.png", "water", False),
    ("muddy_path.png", "road", False),
    ("pebble_path.png", "road", False),
    ("cracked_slate_path.png", "road", False),
    ("stone_path_edge_horizontal.png", "road", False),
    ("stone_path_edge_vertical.png", "road", False),
    ("path_corner.png", "road", False),
    ("path_t_junction.png", "road", False),
    ("shallow_pond_center.png", "water", True),
    ("pond_edge_top.png", "water", True),
    ("pond_edge_bottom.png", "water", True),
    ("reed_bank.png", "water", True),
    ("sandy_river_bank.png", "terrain", False),
    ("fallen_leaf_ground.png", "terrain", False),
    ("snow_ground_open.png", "terrain", False),
    ("courtyard_brick.png", "road", False),
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


def chroma_key(img: Image.Image, key: str) -> Image.Image:
    rgba = img.convert("RGBA")
    keyed = []
    key_rgb = (255, 0, 255) if key == "magenta" else (0, 255, 0)
    for r, g, b, a in rgba.getdata():
        distance = keyed_distance(r, g, b, key_rgb)
        if distance < 96:
            keyed.append((r, g, b, 0))
        elif distance < 138:
            alpha = max(0, min(a, round(((distance - 96) / 42) * 255)))
            if key == "green":
                keyed.append((min(r, 120), min(g, max(r, b) + 22), min(b, 120), alpha))
            else:
                keyed.append((min(r, max(g, b) + 28), min(g, 120), min(b, max(r, g) + 28), alpha))
        elif key == "green" and g > 170 and r < 145 and b < 145 and g > r * 1.25 and g > b * 1.25:
            keyed.append((r, g, b, 0))
        elif key == "magenta" and r > 170 and b > 170 and g < 145:
            keyed.append((r, g, b, 0))
        else:
            keyed.append((r, g, b, a))
    rgba.putdata(keyed)
    return rgba


def alpha_bbox(img: Image.Image) -> tuple[int, int, int, int] | None:
    return img.convert("RGBA").getchannel("A").getbbox()


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


def remove_low_alpha_noise(img: Image.Image, threshold: int = 32) -> Image.Image:
    rgba = img.convert("RGBA")
    cleaned = []
    for r, g, b, a in rgba.getdata():
        if a < threshold:
            cleaned.append((r, g, b, 0))
        else:
            cleaned.append((r, g, b, a))
    rgba.putdata(cleaned)
    return rgba


def save_buildings() -> None:
    source = Image.open(SOURCE_DIR / "open_world_buildings_4x3_v01.png").convert("RGB")
    out = GAME_DIR / "buildings" / "open_world"
    out.mkdir(parents=True, exist_ok=True)
    for index, (filename, size) in enumerate(BUILDINGS):
        cell = chroma_key(grid_crop(source, 4, 3, index, inset=2), "green")
        fit_to_canvas(cell, size).save(out / filename)


def save_props() -> None:
    source = Image.open(SOURCE_DIR / "open_world_props_4x4_v01.png").convert("RGB")
    out = GAME_DIR / "props" / "open_world"
    out.mkdir(parents=True, exist_ok=True)
    for index, (filename, size) in enumerate(PROPS):
        cell = chroma_key(grid_crop(source, 4, 4, index, inset=2), "green")
        fit_to_canvas(cell, size, bottom_pad=1).save(out / filename)


def save_icons() -> None:
    source = Image.open(SOURCE_DIR / "activity_icons_4x4_v01.png").convert("RGB")
    out = GAME_DIR / "icons" / "actions"
    out.mkdir(parents=True, exist_ok=True)
    for index, filename in enumerate(ACTION_ICONS):
        cell = chroma_key(grid_crop(source, 4, 4, index, inset=2), "magenta")
        fit_to_canvas(cell, (32, 32), bottom_pad=1).save(out / filename)


def save_tiles() -> None:
    source = Image.open(SOURCE_DIR / "terrain_expansion_6x4_v01.png").convert("RGB")
    out = GAME_DIR / "tiles" / "open_world"
    out.mkdir(parents=True, exist_ok=True)
    for index, (filename, _category, _solid) in enumerate(TILES):
        cell = grid_crop(source, 6, 4, index, inset=5)
        tile = cell.resize((32, 32), Image.Resampling.LANCZOS).convert("RGBA")
        tile.save(out / filename)


def paste_tile(canvas: Image.Image, tile_name: str, x: int, y: int) -> None:
    tile = Image.open(GAME_DIR / "tiles" / "open_world" / tile_name).convert("RGBA")
    canvas.alpha_composite(tile, (x * 32, y * 32))


def save_tile_validation_preview() -> None:
    canvas = Image.new("RGBA", (640, 384), (32, 30, 25, 255))
    draw = ImageDraw.Draw(canvas)
    panels = [(0, 0, 6, 5), (7, 0, 6, 5), (14, 0, 5, 5), (0, 7, 7, 4), (9, 7, 8, 4)]
    for x, y, w, h in panels:
        draw.rectangle((x * 32 - 2, y * 32 - 2, (x + w) * 32 + 1, (y + h) * 32 + 1), outline=(92, 77, 55, 255), width=2)

    grass_cycle = ["meadow_grass.png", "wildflower_grass.png", "clover_moss.png"]
    for y in range(5):
        for x in range(6):
            paste_tile(canvas, grass_cycle[(x + y) % len(grass_cycle)], x, y)

    crop_cycle = ["tilled_soil_dry.png", "tilled_soil_wet.png", "crop_seedling.png", "crop_mature.png"]
    for y in range(5):
        for x in range(6):
            paste_tile(canvas, crop_cycle[(x // 2 + y) % len(crop_cycle)], 7 + x, y)

    for y in range(5):
        for x in range(5):
            paste_tile(canvas, "packed_earth.png", 14 + x, y)
    for x in range(5):
        paste_tile(canvas, "stone_path_edge_horizontal.png", 14 + x, 2)
    for y in range(5):
        paste_tile(canvas, "stone_path_edge_vertical.png", 16, y)
    paste_tile(canvas, "path_t_junction.png", 16, 2)
    paste_tile(canvas, "path_corner.png", 18, 0)
    paste_tile(canvas, "courtyard_brick.png", 18, 4)

    for y in range(4):
        for x in range(7):
            if y == 0:
                tile = "pond_edge_top.png"
            elif y == 3:
                tile = "pond_edge_bottom.png"
            elif x in (0, 6):
                tile = "reed_bank.png"
            else:
                tile = "shallow_pond_center.png"
            paste_tile(canvas, tile, x, 7 + y)

    seasonal = ["sandy_river_bank.png", "fallen_leaf_ground.png", "snow_ground_open.png", "pebble_path.png"]
    for y in range(4):
        for x in range(8):
            paste_tile(canvas, seasonal[(x // 2 + y) % len(seasonal)], 9 + x, 7 + y)

    canvas.save(SOURCE_DIR / "tile_seam_validation_preview.png")


def save_runtime_preview() -> None:
    preview = Image.new("RGBA", (960, 640), (31, 29, 24, 255))
    draw = ImageDraw.Draw(preview)
    x, y = 16, 16
    for index, (filename, _size) in enumerate(BUILDINGS):
        img = Image.open(GAME_DIR / "buildings" / "open_world" / filename).convert("RGBA")
        preview.alpha_composite(img, (x, y))
        x += 150
        if (index + 1) % 6 == 0:
            x = 16
            y += 118

    x, y = 16, 270
    for index, (filename, _size) in enumerate(PROPS[:12]):
        img = Image.open(GAME_DIR / "props" / "open_world" / filename).convert("RGBA")
        preview.alpha_composite(img, (x, y))
        x += 110
        if (index + 1) % 8 == 0:
            x = 16
            y += 105

    x, y = 16, 500
    for index, filename in enumerate(ACTION_ICONS):
        img = Image.open(GAME_DIR / "icons" / "actions" / filename).convert("RGBA").resize((48, 48), Image.Resampling.NEAREST)
        preview.alpha_composite(img, (x, y))
        x += 56
        if (index + 1) % 16 == 0:
            x = 16
            y += 56

    draw.rectangle((0, 0, preview.width - 1, preview.height - 1), outline=(110, 92, 64, 255), width=2)
    preview.save(SOURCE_DIR / "runtime_open_world_preview.png")


def validate_outputs() -> None:
    checks = [
        GAME_DIR / "buildings" / "open_world" / "sword_hall.png",
        GAME_DIR / "props" / "open_world" / "training_dummy.png",
        GAME_DIR / "icons" / "actions" / "meditation.png",
        GAME_DIR / "tiles" / "open_world" / "meadow_grass.png",
    ]
    for path in checks:
        img = Image.open(path).convert("RGBA")
        if img.getchannel("A").getbbox() is None:
            raise RuntimeError(f"Empty alpha output: {path}")


def main() -> None:
    save_buildings()
    save_props()
    save_icons()
    save_tiles()
    save_tile_validation_preview()
    save_runtime_preview()
    validate_outputs()
    print(f"open-world expansion assets written under {GAME_DIR}")


if __name__ == "__main__":
    main()
