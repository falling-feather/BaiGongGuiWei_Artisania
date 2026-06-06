from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageEnhance


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "public" / "assets" / "art_sources" / "weather_review" / "2026-06-02"
OUT_DIR = ROOT / "public" / "assets" / "game" / "weather"


BUILDING_OVERLAYS = [
    "shop_indigo_snow_overlay.png",
    "shop_bamboo_snow_overlay.png",
    "craft_house_snow_overlay.png",
    "craft_indigo_snow_overlay.png",
    "craft_bamboo_snow_overlay.png",
    "craft_ceramic_snow_overlay.png",
    "craft_metal_snow_overlay.png",
    "craft_textile_snow_overlay.png",
    "craft_paper_snow_overlay.png",
    "craft_lacquer_snow_overlay.png",
    "industry_harvest_snow_overlay.png",
    "industry_refine_snow_overlay.png",
    "industry_product_snow_overlay.png",
    "industry_field_snow_overlay.png",
    "industry_mine_snow_overlay.png",
    "industry_kiln_snow_overlay.png",
    "industry_forge_snow_overlay.png",
    "industry_loom_snow_overlay.png",
    "industry_market_snow_overlay.png",
    "gate_snow_overlay.png",
]

BUILDING_BASES = [
    ("shop_indigo", "shop_indigo.png", "shop_indigo_snow_overlay.png"),
    ("shop_bamboo", "shop_bamboo.png", "shop_bamboo_snow_overlay.png"),
    ("craft_house", "craft_house.png", "craft_house_snow_overlay.png"),
    ("craft_indigo", "craft_indigo.png", "craft_indigo_snow_overlay.png"),
    ("craft_bamboo", "craft_bamboo.png", "craft_bamboo_snow_overlay.png"),
    ("craft_ceramic", "craft_ceramic.png", "craft_ceramic_snow_overlay.png"),
    ("craft_metal", "craft_metal.png", "craft_metal_snow_overlay.png"),
    ("craft_textile", "craft_textile.png", "craft_textile_snow_overlay.png"),
    ("craft_paper", "craft_paper.png", "craft_paper_snow_overlay.png"),
    ("craft_lacquer", "craft_lacquer.png", "craft_lacquer_snow_overlay.png"),
    ("industry_harvest", "industry_harvest.png", "industry_harvest_snow_overlay.png"),
    ("industry_refine", "industry_refine.png", "industry_refine_snow_overlay.png"),
    ("industry_product", "industry_product.png", "industry_product_snow_overlay.png"),
    ("industry_field", "industry_field.png", "industry_field_snow_overlay.png"),
    ("industry_mine", "industry_mine.png", "industry_mine_snow_overlay.png"),
    ("industry_kiln", "industry_kiln.png", "industry_kiln_snow_overlay.png"),
    ("industry_forge", "industry_forge.png", "industry_forge_snow_overlay.png"),
    ("industry_loom", "industry_loom.png", "industry_loom_snow_overlay.png"),
    ("industry_market", "industry_market.png", "industry_market_snow_overlay.png"),
    ("gate", "gate.png", "gate_snow_overlay.png"),
]

TERRAIN_TILES = [
    "summer_lush_ground.png",
    "summer_flower_ground.png",
    "summer_dense_moss_ground.png",
    "summer_reed_bank.png",
    "pond_water_grass_center.png",
    "pond_water_grass_edge_left.png",
    "pond_water_grass_edge_right.png",
    "pond_lotus_duckweed.png",
    "rain_wet_road.png",
    "rain_puddle_road.png",
    "rain_muddy_ground.png",
    "rain_wet_stone_ground.png",
    "autumn_leaf_ground.png",
    "autumn_leaf_road.png",
    "winter_snow_ground.png",
    "winter_snow_road.png",
]

PROP_OVERLAYS: list[tuple[str, tuple[int, int]]] = [
    ("summer_lush_willow_crown.png", (96, 96)),
    ("summer_lush_tree_crown.png", (96, 96)),
    ("summer_dense_reed_clump.png", (96, 72)),
    ("summer_lotus_patch.png", (96, 72)),
    ("summer_water_grass_clump.png", (96, 72)),
    ("summer_duckweed_patch.png", (96, 72)),
    ("rain_puddle_overlay.png", (96, 64)),
    ("rain_wet_stone_sheen.png", (96, 64)),
    ("autumn_leaf_pile.png", (96, 64)),
    ("autumn_gold_tree_crown.png", (96, 96)),
    ("winter_snow_tree_cap.png", (96, 96)),
    ("winter_snow_willow_cap.png", (96, 96)),
    ("winter_snow_lantern_cap.png", (32, 64)),
    ("winter_snow_bridge_cap.png", (128, 80)),
    ("winter_snow_dock_cap.png", (96, 64)),
    ("winter_icicle_strip.png", (96, 64)),
]

VFX_SPRITES: list[tuple[str, tuple[int, int]]] = [
    ("light_rain_streaks.png", (128, 96)),
    ("heavy_rain_streaks.png", (128, 96)),
    ("rain_splash_ripples.png", (96, 64)),
    ("wet_roof_glint.png", (96, 64)),
    ("small_snowflakes.png", (128, 96)),
    ("drifting_snow_cluster.png", (128, 96)),
    ("snow_puff_ground.png", (96, 64)),
    ("frosty_mist_patch.png", (128, 96)),
    ("morning_fog_strip.png", (160, 96)),
    ("autumn_falling_leaves.png", (128, 96)),
    ("wind_dust_swirl.png", (128, 96)),
    ("summer_firefly_sparkles.png", (128, 96)),
]


def grid_crop(img: Image.Image, cols: int, rows: int, index: int, inset: int = 0) -> Image.Image:
    col = index % cols
    row = index // cols
    x0 = round(col * img.width / cols) + inset
    y0 = round(row * img.height / rows) + inset
    x1 = round((col + 1) * img.width / cols) - inset
    y1 = round((row + 1) * img.height / rows) - inset
    return img.crop((x0, y0, x1, y1))


def is_green_pixel(r: int, g: int, b: int) -> bool:
    return g > 140 and r < 95 and b < 95 and g > r * 1.8 and g > b * 1.8


def chroma_key_green(img: Image.Image) -> Image.Image:
    rgba = img.convert("RGBA")
    out = []
    for r, g, b, a in rgba.getdata():
        if is_green_pixel(r, g, b):
            out.append((r, g, b, 0))
            continue
        if g > 115 and r < 130 and b < 130 and g > r * 1.25 and g > b * 1.25:
            alpha = max(0, min(255, int((max(r, b) / max(1, g)) * 255)))
            out.append((r, g, b, alpha))
        else:
            out.append((r, g, b, a))
    rgba.putdata(out)
    return rgba


def content_bbox(img: Image.Image) -> tuple[int, int, int, int] | None:
    alpha = img.getchannel("A")
    return alpha.getbbox()


def fit_to_canvas(img: Image.Image, size: tuple[int, int], bottom_pad: int = 0) -> Image.Image:
    bbox = content_bbox(img)
    if not bbox:
        return Image.new("RGBA", size)

    cropped = img.crop(bbox)
    max_w = size[0]
    max_h = size[1] - bottom_pad
    scale = min(max_w / cropped.width, max_h / cropped.height)
    new_size = (max(1, round(cropped.width * scale)), max(1, round(cropped.height * scale)))
    resized = cropped.resize(new_size, Image.Resampling.LANCZOS)

    canvas = Image.new("RGBA", size)
    x = (size[0] - resized.width) // 2
    y = size[1] - bottom_pad - resized.height
    canvas.alpha_composite(resized, (x, y))
    return canvas


def set_alpha(img: Image.Image, alpha: float) -> Image.Image:
    rgba = img.convert("RGBA")
    channel = rgba.getchannel("A")
    rgba.putalpha(ImageEnhance.Brightness(channel).enhance(alpha))
    return rgba


def fade_lower_alpha(img: Image.Image, start_ratio: float = 0.54, floor_alpha: float = 0.18) -> Image.Image:
    rgba = img.convert("RGBA")
    alpha = rgba.getchannel("A")
    pixels = alpha.load()
    start = int(rgba.height * start_ratio)
    span = max(1, rgba.height - start)
    for y in range(start, rgba.height):
        t = (y - start) / span
        factor = max(floor_alpha, 1.0 - t)
        for x in range(rgba.width):
            pixels[x, y] = int(pixels[x, y] * factor)
    rgba.putalpha(alpha)
    return rgba


def enhance_base(img: Image.Image, brightness: float = 1.0, color: float = 1.0, contrast: float = 1.0) -> Image.Image:
    out = img.convert("RGBA")
    out = ImageEnhance.Brightness(out).enhance(brightness)
    out = ImageEnhance.Color(out).enhance(color)
    out = ImageEnhance.Contrast(out).enhance(contrast)
    return out


def add_fitted(canvas: Image.Image, overlay: Image.Image, alpha: float = 1.0, bottom_pad: int = 0) -> None:
    fitted = fit_to_canvas(overlay, canvas.size, bottom_pad=bottom_pad)
    canvas.alpha_composite(set_alpha(fitted, alpha), (0, 0))


def save_building_variants() -> None:
    out = OUT_DIR / "building_variants"
    out.mkdir(parents=True, exist_ok=True)

    building_dir = ROOT / "public" / "assets" / "game" / "buildings"
    snow_dir = OUT_DIR / "building_snow"
    props_dir = OUT_DIR / "props"
    vfx_dir = OUT_DIR / "vfx"

    summer_grass = Image.open(props_dir / "summer_water_grass_clump.png").convert("RGBA")
    rain_glint = Image.open(vfx_dir / "wet_roof_glint.png").convert("RGBA")
    rain_streaks = Image.open(vfx_dir / "light_rain_streaks.png").convert("RGBA")
    autumn_leaves = Image.open(props_dir / "autumn_leaf_pile.png").convert("RGBA")

    for stem, base_name, snow_name in BUILDING_BASES:
        base = Image.open(building_dir / base_name).convert("RGBA")

        summer = Image.new("RGBA", base.size)
        summer.alpha_composite(enhance_base(base, brightness=1.04, color=1.04, contrast=1.01), (0, 0))
        add_fitted(summer, summer_grass, alpha=0.18, bottom_pad=0)
        summer.save(out / f"{stem}_summer.png")

        rain = Image.new("RGBA", base.size)
        rain.alpha_composite(enhance_base(base, brightness=0.88, color=0.88, contrast=1.03), (0, 0))
        add_fitted(rain, rain_glint, alpha=0.28, bottom_pad=max(12, base.height // 5))
        add_fitted(rain, rain_streaks, alpha=0.14)
        rain.save(out / f"{stem}_rain.png")

        autumn = Image.new("RGBA", base.size)
        autumn.alpha_composite(enhance_base(base, brightness=1.0, color=1.04, contrast=1.02), (0, 0))
        add_fitted(autumn, autumn_leaves, alpha=0.32)
        autumn.save(out / f"{stem}_autumn.png")

        winter = Image.new("RGBA", base.size)
        winter.alpha_composite(enhance_base(base, brightness=0.95, color=0.88, contrast=1.04), (0, 0))
        snow = Image.open(snow_dir / snow_name).convert("RGBA")
        add_fitted(winter, fade_lower_alpha(snow), alpha=0.9)
        winter.save(out / f"{stem}_winter.png")


def save_terrain_tiles() -> None:
    source = Image.open(SOURCE_DIR / "weather_terrain_tiles_4x4_v01.png").convert("RGB")
    out = OUT_DIR / "terrain"
    out.mkdir(parents=True, exist_ok=True)
    for index, filename in enumerate(TERRAIN_TILES):
        cell = grid_crop(source, 4, 4, index, inset=6)
        tile = cell.resize((32, 32), Image.Resampling.LANCZOS).convert("RGBA")
        tile.save(out / filename)


def save_overlay_grid(
    source_name: str,
    cols: int,
    rows: int,
    files: list[str] | list[tuple[str, tuple[int, int]]],
    out_folder: str,
    default_size: tuple[int, int],
) -> None:
    source = Image.open(SOURCE_DIR / source_name).convert("RGB")
    out = OUT_DIR / out_folder
    out.mkdir(parents=True, exist_ok=True)

    for index, item in enumerate(files):
        if isinstance(item, tuple):
            filename, size = item
        else:
            filename, size = item, default_size
        keyed = chroma_key_green(grid_crop(source, cols, rows, index, inset=2))
        normalized = fit_to_canvas(keyed, size)
        normalized.save(out / filename)


def main() -> None:
    save_terrain_tiles()
    save_overlay_grid(
        "weather_building_snow_overlays_5x4_v01.png",
        5,
        4,
        BUILDING_OVERLAYS,
        "building_snow",
        (96, 88),
    )
    save_overlay_grid(
        "weather_prop_overlays_4x4_v01.png",
        4,
        4,
        PROP_OVERLAYS,
        "props",
        (96, 96),
    )
    save_overlay_grid(
        "weather_vfx_sprites_4x3_v01.png",
        4,
        3,
        VFX_SPRITES,
        "vfx",
        (128, 96),
    )
    save_building_variants()
    print(f"weather assets written to {OUT_DIR}")


if __name__ == "__main__":
    main()
