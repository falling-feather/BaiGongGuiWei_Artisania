from __future__ import annotations

from pathlib import Path
from typing import Iterable

from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "assets" / "game" / "ui" / "cover_jiangnan_v01.png"


def load_asset(*parts: str) -> Image.Image:
    return Image.open(ROOT.joinpath(*parts)).convert("RGBA")


def paste_center(base: Image.Image, asset: Image.Image, cx: int, bottom: int, scale: float = 1.0) -> None:
    if scale != 1:
        asset = asset.resize((round(asset.width * scale), round(asset.height * scale)), Image.Resampling.NEAREST)
    base.alpha_composite(asset, (cx - asset.width // 2, bottom - asset.height))


def tile_asset(base: Image.Image, tile: Image.Image, box: tuple[int, int, int, int], scale: int = 2) -> None:
    tile = tile.resize((tile.width * scale, tile.height * scale), Image.Resampling.NEAREST)
    left, top, right, bottom = box
    for y in range(top, bottom, tile.height):
        for x in range(left, right, tile.width):
            base.alpha_composite(tile, (x, y))


def draw_river(draw: ImageDraw.ImageDraw, points: Iterable[tuple[int, int]], width: int) -> None:
    pts = list(points)
    for offset, color in [
        (34, (89, 112, 112, 170)),
        (20, (67, 126, 132, 215)),
        (0, (70, 143, 151, 235)),
    ]:
        draw.line(pts, fill=color, width=width + offset, joint="curve")


def river_mask(size: tuple[int, int], points: Iterable[tuple[int, int]], width: int) -> Image.Image:
    mask = Image.new("L", size, 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.line(list(points), fill=255, width=width, joint="curve")
    return mask.filter(ImageFilter.GaussianBlur(5))


def main() -> None:
    width, height = 1600, 900
    cover = Image.new("RGBA", (width, height), (29, 25, 19, 255))
    draw = ImageDraw.Draw(cover, "RGBA")

    # Paper dusk sky.
    for y in range(height):
        t = y / height
        r = int(120 + 42 * (1 - t))
        g = int(111 + 38 * (1 - t))
        b = int(86 + 28 * (1 - t))
        draw.line([(0, y), (width, y)], fill=(r, g, b, 255))

    draw.rectangle((0, 520, width, height), fill=(46, 52, 37, 255))

    grass = load_asset("public", "assets", "game", "tiles", "open_world", "meadow_grass.png")
    brick = load_asset("public", "assets", "game", "tiles", "open_world", "courtyard_brick.png")
    path = load_asset("public", "assets", "game", "tiles", "open_world", "pebble_path.png")
    water = load_asset("public", "assets", "game", "tiles", "open_world", "shallow_pond_center.png")
    tile_asset(cover, grass, (0, 520, width, height), scale=2)
    tile_asset(cover, brick, (0, 590, width, 730), scale=2)
    tile_asset(cover, path, (0, 730, width, height), scale=2)

    river_points = [(-80, 720), (210, 660), (420, 690), (610, 605), (850, 580), (1080, 520), (1320, 500), (1710, 430)]
    river_layer = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    river_draw = ImageDraw.Draw(river_layer, "RGBA")
    draw_river(river_draw, river_points, 96)
    river_layer = river_layer.filter(ImageFilter.GaussianBlur(0.4))
    cover.alpha_composite(river_layer)

    tiled_water = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    tile_asset(tiled_water, water, (0, 0, width, height), scale=2)
    tiled_water.putalpha(river_mask((width, height), river_points, 116))
    cover.alpha_composite(tiled_water)

    # Repaint a translucent river wash over tiled water to unify the curve and edges.
    wash = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    wash_draw = ImageDraw.Draw(wash, "RGBA")
    draw_river(wash_draw, river_points, 82)
    cover.alpha_composite(wash.filter(ImageFilter.GaussianBlur(1.2)))

    # Distant silhouettes.
    far = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    far_draw = ImageDraw.Draw(far, "RGBA")
    far_draw.polygon([(760, 360), (900, 260), (1030, 360)], fill=(35, 38, 32, 65))
    far_draw.polygon([(970, 365), (1130, 236), (1300, 365)], fill=(35, 38, 32, 58))
    far_draw.polygon([(1220, 360), (1410, 246), (1580, 360)], fill=(35, 38, 32, 52))
    for x, h in [(820, 135), (940, 118), (1070, 150), (1240, 126), (1390, 160)]:
        far_draw.rectangle((x, 370 - h, x + 112, 370), fill=(43, 42, 36, 48))
        far_draw.polygon([(x - 10, 370 - h), (x + 56, 322 - h), (x + 122, 370 - h)], fill=(34, 36, 32, 62))
    cover.alpha_composite(far.filter(ImageFilter.GaussianBlur(2.2)))

    buildings = [
        ("sword_hall.png", 720, 565, 1.75),
        ("meditation_hall.png", 930, 548, 1.65),
        ("farm_cottage.png", 1140, 592, 1.7),
        ("scholar_academy.png", 1335, 570, 1.65),
        ("riverside_inn.png", 455, 610, 1.8),
        ("seed_tool_shop.png", 260, 660, 1.65),
    ]
    for file_name, cx, bottom, scale in buildings:
        paste_center(cover, load_asset("public", "assets", "game", "buildings", "open_world", file_name), cx, bottom, scale)

    props = [
        ("willow.png", "public/assets/game/props", 148, 680, 1.45),
        ("arch_bridge.png", "public/assets/game/props", 630, 755, 1.45),
        ("lantern_post.png", "public/assets/game/props", 540, 662, 1.35),
        ("tea_stall.png", "public/assets/game/props", 1160, 720, 1.35),
        ("sword_rack.png", "public/assets/game/props/open_world", 785, 667, 1.3),
        ("training_dummy.png", "public/assets/game/props/open_world", 845, 698, 1.25),
        ("meditation_mat.png", "public/assets/game/props/open_world", 955, 700, 1.25),
        ("dock.png", "public/assets/game/props", 1360, 742, 1.25),
        ("boat.png", "public/assets/game/props", 1435, 784, 1.15),
    ]
    for file_name, folder, cx, bottom, scale in props:
        paste_center(cover, Image.open(ROOT / folder / file_name).convert("RGBA"), cx, bottom, scale)

    # Warm lantern glows.
    glow = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow, "RGBA")
    for cx, cy, radius in [(540, 590, 74), (720, 505, 86), (930, 502, 68), (1335, 520, 80), (260, 620, 68)]:
        for r in range(radius, 0, -6):
            alpha = int(62 * (1 - r / radius))
            glow_draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(255, 188, 76, alpha))
    cover.alpha_composite(glow.filter(ImageFilter.GaussianBlur(8)))

    # Scroll-paper vignette keeps center-left readable for DOM title.
    veil = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    veil_draw = ImageDraw.Draw(veil, "RGBA")
    veil_draw.rectangle((0, 0, 760, height), fill=(22, 18, 14, 96))
    veil_draw.rectangle((0, 0, width, 120), fill=(18, 14, 10, 70))
    cover.alpha_composite(veil.filter(ImageFilter.GaussianBlur(12)))

    OUT.parent.mkdir(parents=True, exist_ok=True)
    cover.convert("RGB").save(OUT, quality=94)
    print(f"wrote {OUT}")


if __name__ == "__main__":
    main()
