from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public/assets/game"
SOURCES = ROOT / "public/assets/art_sources"
GREEN_SOURCES = SOURCES / "green_sources"
GREEN = (0, 255, 0, 255)

PALETTE = {
    "ink": (46, 43, 36, 255),
    "soft_ink": (76, 69, 57, 255),
    "paper": (223, 219, 197, 255),
    "paper_shadow": (190, 184, 160, 255),
    "white_wall": (214, 211, 192, 255),
    "tile_dark": (66, 68, 65, 255),
    "tile_mid": (94, 96, 90, 255),
    "wood": (125, 87, 50, 255),
    "wood_dark": (75, 50, 32, 255),
    "stone": (155, 150, 132, 255),
    "stone_dark": (99, 93, 81, 255),
    "water": (82, 131, 135, 255),
    "water_dark": (57, 100, 107, 255),
    "water_light": (143, 178, 174, 210),
    "bamboo": (105, 130, 83, 255),
    "bamboo_light": (145, 161, 105, 255),
    "indigo": (54, 77, 106, 255),
    "indigo_light": (82, 106, 137, 255),
    "kiln": (152, 83, 47, 255),
    "clay": (176, 116, 78, 255),
    "iron": (86, 88, 86, 255),
    "paper_blue": (101, 128, 136, 255),
    "lacquer": (126, 49, 43, 255),
    "gold": (194, 149, 73, 255),
    "skin": (213, 166, 116, 255),
    "robe": (165, 94, 63, 255),
    "robe_blue": (66, 99, 117, 255),
}


def rgba(name: str) -> tuple[int, int, int, int]:
    return PALETTE[name]


def ensure_dirs() -> None:
    for rel in ("tiles", "buildings", "characters", "effects", "props", "ui"):
        (OUT / rel).mkdir(parents=True, exist_ok=True)
    SOURCES.mkdir(parents=True, exist_ok=True)
    GREEN_SOURCES.mkdir(parents=True, exist_ok=True)


def has_transparency(img: Image.Image) -> bool:
    if img.mode != "RGBA":
        img = img.convert("RGBA")
    return img.getchannel("A").getextrema()[0] < 255


def has_cutout_transparency(img: Image.Image) -> bool:
    if img.mode != "RGBA":
        img = img.convert("RGBA")
    return img.getchannel("A").getextrema()[0] == 0


def make_opaque(img: Image.Image) -> Image.Image:
    opaque = img.convert("RGBA").copy()
    opaque.putalpha(255)
    return opaque


def flatten_on_green(img: Image.Image) -> Image.Image:
    base = Image.new("RGBA", img.size, GREEN)
    base.alpha_composite(img.convert("RGBA"))
    return base


def chroma_key_green(img: Image.Image) -> Image.Image:
    """Remove the green-screen background and clean obvious green edge pixels."""
    cutout = img.convert("RGBA")
    pixels = cutout.load()
    for y in range(cutout.height):
        for x in range(cutout.width):
            r, g, b, a = pixels[x, y]
            if a == 0:
                continue
            green_delta = g - max(r, b)
            if g >= 245 and r <= 12 and b <= 12:
                pixels[x, y] = (0, 0, 0, 0)
            elif g >= 190 and green_delta >= 130 and r <= 80 and b <= 80:
                edge_alpha = max(r, b, 24)
                pixels[x, y] = (r, min(g, max(r, b) + 48), b, min(a, edge_alpha))
    return cutout


def save(img: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    out_img = img.convert("RGBA")
    try:
        rel = path.relative_to(OUT)
    except ValueError:
        rel = None
    if rel is not None and has_cutout_transparency(out_img):
        green_source = GREEN_SOURCES / rel
        green_source.parent.mkdir(parents=True, exist_ok=True)
        green_img = flatten_on_green(out_img)
        green_img.save(green_source)
        out_img = chroma_key_green(green_img)
    elif has_transparency(out_img):
        out_img = make_opaque(out_img)
    out_img.save(path)


def tile_canvas(fill: tuple[int, int, int, int] | None = None) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    img = Image.new("RGBA", (32, 32), fill or (0, 0, 0, 0))
    return img, ImageDraw.Draw(img)


def draw_ground(path: Path) -> Image.Image:
    img, d = tile_canvas(rgba("paper"))
    for x, y, color in [
        (3, 5, "paper_shadow"),
        (18, 8, "paper_shadow"),
        (10, 22, "paper_shadow"),
        (25, 24, "paper_shadow"),
        (5, 27, "bamboo_light"),
    ]:
        d.rectangle((x, y, x + 1, y + 1), fill=rgba(color))
    d.rectangle((0, 0, 31, 31), outline=(141, 137, 120, 85))
    save(img, path)
    return img


def draw_ground_variant(path: Path, kind: str) -> Image.Image:
    base = "paper" if kind != "soil" else "paper_shadow"
    img, d = tile_canvas(rgba(base))
    if kind == "moss":
        d.rectangle((0, 0, 31, 31), fill=(204, 207, 177, 255))
        for x, y in [(3, 7), (8, 22), (19, 5), (25, 25), (28, 14)]:
            d.rectangle((x, y, x + 2, y + 1), fill=rgba("bamboo_light"))
            d.point((x + 1, y + 2), fill=rgba("bamboo"))
    elif kind == "stone":
        d.rectangle((0, 0, 31, 31), fill=(194, 187, 163, 255))
        for rect in [(0, 0, 15, 10), (16, 0, 31, 8), (0, 11, 12, 22), (13, 9, 31, 21), (0, 23, 20, 31), (21, 22, 31, 31)]:
            d.rectangle(rect, outline=(113, 105, 90, 120))
        for x, y in [(4, 5), (23, 4), (10, 18), (27, 26)]:
            d.point((x, y), fill=(230, 222, 190, 180))
    else:
        d.rectangle((0, 0, 31, 31), fill=(186, 170, 132, 255))
        for x, y in [(4, 4), (17, 8), (24, 20), (7, 27)]:
            d.rectangle((x, y, x + 2, y + 1), fill=(148, 134, 104, 180))
        d.line((0, 15, 31, 17), fill=(160, 145, 111, 90))
    d.rectangle((0, 0, 31, 31), outline=(104, 98, 84, 70))
    save(img, path)
    return img


def draw_road_variant(path: Path, kind: str) -> Image.Image:
    img, d = tile_canvas((171, 158, 130, 255))
    tones = [(159, 147, 121, 255), (181, 168, 139, 255), (148, 137, 113, 255)]
    if kind == "vertical":
        slabs = [(6, 0, 24, 7), (4, 8, 26, 15), (7, 16, 23, 23), (5, 24, 26, 31)]
        d.rectangle((0, 0, 31, 31), fill=(203, 195, 169, 255))
        d.rectangle((4, 0, 27, 31), fill=(171, 158, 130, 255))
    elif kind == "cross":
        slabs = [(0, 6, 12, 14), (13, 4, 23, 14), (24, 6, 31, 14), (4, 15, 16, 25), (17, 15, 31, 25), (11, 0, 20, 31)]
        d.rectangle((0, 0, 31, 31), fill=(203, 195, 169, 255))
        d.rectangle((0, 5, 31, 26), fill=(171, 158, 130, 255))
        d.rectangle((5, 0, 26, 31), fill=(171, 158, 130, 255))
    else:
        slabs = [(0, 0, 15, 9), (16, 0, 31, 11), (0, 10, 10, 21), (11, 12, 24, 22), (25, 12, 31, 23), (0, 22, 17, 31), (18, 24, 31, 31)]
    for i, rect in enumerate(slabs):
        d.rectangle(rect, fill=tones[i % len(tones)], outline=(96, 85, 70, 160))
    for point in [(5, 7), (21, 5), (14, 19), (28, 27)]:
        d.point(point, fill=(222, 211, 180, 210))
    save(img, path)
    return img


def draw_road(path: Path) -> Image.Image:
    return draw_road_variant(path, "horizontal")


def draw_water(path: Path) -> Image.Image:
    img, d = tile_canvas(rgba("water"))
    for y, color in [(4, "water_dark"), (14, "water_light"), (24, "water_dark")]:
        d.rectangle((0, y, 31, y + 3), fill=rgba(color))
    for x, y in [(4, 9), (18, 18), (8, 27), (24, 5)]:
        d.line((x, y, x + 5, y), fill=rgba("water_light"))
    d.rectangle((0, 0, 31, 31), outline=(33, 73, 80, 90))
    save(img, path)
    return img


def draw_water_edge(path: Path, side: str) -> Image.Image:
    img, d = tile_canvas(rgba("water"))
    for y, color in [(4, "water_dark"), (14, "water_light"), (24, "water_dark")]:
        d.rectangle((0, y, 31, y + 3), fill=rgba(color))
    if side == "left":
        bank = [(0, 0), (10, 0), (7, 7), (11, 15), (7, 23), (10, 31), (0, 31)]
        stone_x = (2, 5, 4)
    else:
        bank = [(31, 0), (21, 0), (24, 7), (20, 15), (24, 23), (21, 31), (31, 31)]
        stone_x = (25, 22, 26)
    d.polygon(bank, fill=rgba("paper"), outline=(96, 85, 70, 145))
    for x, y in zip(stone_x, (5, 16, 26)):
        d.rectangle((x, y, x + 3, y + 2), fill=rgba("stone"), outline=rgba("stone_dark"))
    for x, y in [(13, 9), (16, 20), (19, 27)]:
        d.line((x, y, x + 5, y), fill=rgba("water_light"))
    save(img, path)
    return img


def draw_bridge(path: Path) -> Image.Image:
    img, d = tile_canvas((0, 0, 0, 0))
    d.rectangle((0, 0, 31, 31), fill=rgba("stone"))
    for y in (4, 15, 26):
        d.line((0, y, 31, y), fill=rgba("stone_dark"))
    for x in (7, 18, 29):
        d.line((x, 0, x, 31), fill=(113, 105, 90, 170))
    d.rectangle((1, 1, 30, 30), outline=rgba("soft_ink"))
    save(img, path)
    return img


def draw_fence(path: Path) -> Image.Image:
    img, d = tile_canvas()
    d.rectangle((3, 13, 29, 16), fill=rgba("wood"), outline=rgba("wood_dark"))
    for x in (5, 15, 25):
        d.rectangle((x, 7, x + 3, 28), fill=rgba("wood"), outline=rgba("wood_dark"))
        d.polygon([(x - 1, 7), (x + 2, 3), (x + 5, 7)], fill=(146, 104, 61, 255), outline=rgba("wood_dark"))
    save(img, path)
    return img


def draw_tree(path: Path) -> Image.Image:
    img, d = tile_canvas()
    d.rectangle((14, 14, 18, 30), fill=rgba("wood"), outline=rgba("wood_dark"))
    d.ellipse((8, 4, 24, 19), fill=rgba("bamboo"), outline=rgba("soft_ink"))
    d.ellipse((5, 9, 17, 22), fill=rgba("bamboo_light"), outline=rgba("soft_ink"))
    d.ellipse((15, 9, 28, 23), fill=rgba("bamboo"), outline=rgba("soft_ink"))
    for x in (8, 12, 20, 25):
        d.line((x, 18, x - 2, 29), fill=(82, 107, 67, 210))
    save(img, path)
    return img


def draw_rock(path: Path) -> Image.Image:
    img, d = tile_canvas()
    d.polygon([(2, 29), (10, 11), (19, 29)], fill=rgba("stone_dark"), outline=rgba("ink"))
    d.polygon([(11, 29), (22, 7), (30, 29)], fill=rgba("stone"), outline=rgba("ink"))
    d.polygon([(14, 15), (21, 8), (17, 21)], fill=(199, 193, 171, 180))
    save(img, path)
    return img


def roof(d: ImageDraw.ImageDraw, x: int, y: int, w: int, *, accent: str = "tile_mid") -> None:
    d.polygon([(x - 2, y + 15), (x + w + 2, y + 15), (x + w - 6, y), (x + 6, y)], fill=rgba("tile_dark"), outline=rgba("ink"))
    for i in range(x + 3, x + w - 1, 6):
        d.line((i, y + 2, i - 3, y + 14), fill=rgba(accent))
    d.rectangle((x - 4, y + 15, x + w + 4, y + 18), fill=rgba("tile_mid"), outline=rgba("ink"))


def draw_shop(path: Path, accent: str, detail: str) -> Image.Image:
    img = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.ellipse((8, 56, 56, 62), fill=(0, 0, 0, 35))
    roof(d, 9, 5, 46)
    d.rectangle((9, 23, 55, 57), fill=rgba("white_wall"), outline=rgba("ink"))
    d.rectangle((14, 29, 25, 57), fill=rgba("wood_dark"), outline=rgba("ink"))
    d.rectangle((31, 31, 50, 44), fill=(232, 225, 195, 255), outline=rgba("wood_dark"))
    d.rectangle((12, 23, 52, 27), fill=rgba("wood"), outline=rgba("wood_dark"))
    d.rectangle((29, 48, 52, 57), fill=rgba(accent), outline=rgba("soft_ink"))
    if detail == "bamboo":
        for x in (33, 38, 43, 48):
            d.line((x, 31, x - 8, 55), fill=rgba("bamboo"))
        d.rectangle((28, 52, 54, 55), fill=rgba("bamboo_light"), outline=rgba("soft_ink"))
    elif detail == "kiln":
        d.rectangle((31, 35, 51, 57), fill=(80, 74, 63, 255), outline=rgba("ink"))
        d.arc((34, 37, 48, 57), 180, 360, fill=rgba("kiln"), width=3)
        d.polygon([(39, 49), (43, 41), (47, 49)], fill=(218, 132, 59, 255))
    elif detail == "market":
        d.rectangle((30, 31, 51, 37), fill=(213, 181, 118, 255), outline=rgba("wood_dark"))
        d.ellipse((33, 42, 43, 52), fill=(105, 123, 112, 255), outline=rgba("ink"))
        d.rectangle((45, 42, 50, 52), fill=rgba("gold"), outline=rgba("ink"))
    elif detail == "indigo":
        d.rectangle((30, 30, 53, 37), fill=rgba("indigo"), outline=rgba("ink"))
        d.line((31, 38, 51, 54), fill=rgba("indigo_light"), width=2)
    save(img, path)
    return img


def draw_industry(path: Path, accent: str, detail: str) -> Image.Image:
    img = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.ellipse((8, 56, 58, 62), fill=(0, 0, 0, 35))
    d.rectangle((8, 34, 56, 57), fill=(199, 191, 156, 255), outline=rgba("ink"))
    d.rectangle((10, 38, 54, 42), fill=rgba("wood"), outline=rgba("wood_dark"))
    roof(d, 11, 15, 42, accent="stone")
    d.rectangle((14, 35, 24, 57), fill=rgba("wood_dark"), outline=rgba("ink"))
    d.rectangle((29, 37, 50, 50), fill=rgba(accent), outline=rgba("soft_ink"))
    if detail == "field":
        for x in (31, 37, 43, 49):
            d.line((x, 38, x - 5, 55), fill=rgba("bamboo"))
        d.arc((26, 45, 38, 61), 200, 350, fill=rgba("gold"), width=2)
        d.arc((36, 44, 52, 61), 200, 350, fill=rgba("gold"), width=2)
    elif detail == "mine":
        d.polygon([(28, 57), (37, 38), (45, 57)], fill=rgba("stone_dark"), outline=rgba("ink"))
        d.polygon([(39, 57), (51, 34), (58, 57)], fill=rgba("stone"), outline=rgba("ink"))
        d.rectangle((30, 42, 40, 48), fill=(40, 37, 32, 255), outline=rgba("ink"))
    elif detail == "kiln":
        d.rectangle((32, 28, 46, 57), fill=rgba("clay"), outline=rgba("ink"))
        d.arc((34, 38, 44, 59), 180, 360, fill=rgba("ink"), width=2)
        d.rectangle((47, 18, 53, 57), fill=rgba("stone_dark"), outline=rgba("ink"))
        d.polygon([(37, 51), (40, 43), (44, 51)], fill=(221, 118, 50, 255))
    elif detail == "forge":
        d.rectangle((31, 38, 50, 57), fill=rgba("iron"), outline=rgba("ink"))
        d.polygon([(35, 50), (40, 39), (47, 50)], fill=(221, 118, 50, 255), outline=rgba("kiln"))
        d.line((26, 33, 54, 55), fill=rgba("wood_dark"), width=2)
        d.rectangle((22, 31, 31, 35), fill=rgba("iron"), outline=rgba("ink"))
    elif detail == "loom":
        d.rectangle((29, 34, 52, 57), fill=(0, 0, 0, 0), outline=rgba("wood_dark"), width=2)
        for x in range(33, 51, 4):
            d.line((x, 35, x, 56), fill=rgba("paper_shadow"))
        d.rectangle((31, 47, 50, 53), fill=rgba(accent), outline=rgba("soft_ink"))
    elif detail == "market":
        d.rectangle((28, 34, 53, 40), fill=(213, 181, 118, 255), outline=rgba("wood_dark"))
        d.ellipse((31, 44, 41, 54), fill=rgba("bamboo"), outline=rgba("ink"))
        d.rectangle((44, 43, 52, 54), fill=rgba("gold"), outline=rgba("ink"))
    save(img, path)
    return img


def draw_craft(path: Path, accent: str, detail: str) -> Image.Image:
    img = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.ellipse((7, 56, 57, 62), fill=(0, 0, 0, 35))
    d.rectangle((12, 24, 54, 58), fill=rgba("white_wall"), outline=rgba("ink"))
    roof(d, 8, 7, 48, accent="tile_mid")
    d.rectangle((15, 31, 27, 58), fill=rgba("wood_dark"), outline=rgba("ink"))
    d.rectangle((31, 31, 51, 44), fill=(232, 225, 195, 255), outline=rgba("wood_dark"))
    d.rectangle((29, 48, 53, 58), fill=rgba(accent), outline=rgba("soft_ink"))
    d.rectangle((9, 24, 57, 28), fill=rgba("wood"), outline=rgba("wood_dark"))
    if detail == "indigo":
        d.rectangle((30, 30, 52, 38), fill=rgba("indigo"), outline=rgba("ink"))
        d.line((32, 40, 52, 54), fill=rgba("indigo_light"), width=2)
        d.ellipse((42, 44, 55, 57), fill=(48, 67, 95, 255), outline=rgba("ink"))
    elif detail == "bamboo":
        for x in (33, 38, 43, 48):
            d.line((x, 31, x - 8, 56), fill=rgba("bamboo"), width=2)
        d.rectangle((29, 52, 55, 56), fill=rgba("bamboo_light"), outline=rgba("soft_ink"))
    elif detail == "ceramic":
        d.ellipse((32, 41, 43, 56), fill=(221, 221, 199, 255), outline=rgba("ink"))
        d.ellipse((44, 38, 55, 56), fill=rgba("clay"), outline=rgba("ink"))
        d.rectangle((29, 32, 54, 37), fill=rgba("paper_blue"), outline=rgba("wood_dark"))
    elif detail == "metal":
        d.rectangle((31, 39, 52, 56), fill=rgba("iron"), outline=rgba("ink"))
        d.line((29, 35, 55, 52), fill=rgba("wood_dark"), width=2)
        d.rectangle((25, 33, 34, 37), fill=rgba("iron"), outline=rgba("ink"))
        d.polygon([(40, 50), (44, 42), (48, 50)], fill=(221, 118, 50, 255))
    elif detail == "textile":
        d.rectangle((31, 31, 52, 57), outline=rgba("wood_dark"), width=2)
        for y in range(35, 55, 5):
            d.line((32, y, 51, y + 1), fill=rgba(accent), width=2)
        for x in range(34, 51, 4):
            d.line((x, 32, x, 56), fill=rgba("paper_shadow"))
    elif detail == "paper":
        for i, x in enumerate((31, 36, 41, 46)):
            d.rectangle((x, 34 + i % 2, x + 9, 50 + i % 2), fill=(232, 225, 195, 255), outline=rgba("paper_shadow"))
        d.rectangle((30, 51, 54, 56), fill=rgba("paper_blue"), outline=rgba("ink"))
    elif detail == "lacquer":
        d.rectangle((31, 35, 52, 55), fill=rgba("lacquer"), outline=rgba("ink"))
        d.ellipse((34, 38, 49, 52), outline=rgba("gold"), width=2)
        d.rectangle((41, 28, 48, 35), fill=rgba("wood"), outline=rgba("ink"))
    save(img, path)
    return img


def draw_gate(path: Path) -> Image.Image:
    img = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.ellipse((10, 57, 54, 62), fill=(0, 0, 0, 35))
    d.rectangle((10, 19, 17, 58), fill=rgba("wood"), outline=rgba("ink"))
    d.rectangle((47, 19, 54, 58), fill=rgba("wood"), outline=rgba("ink"))
    d.rectangle((5, 12, 59, 21), fill=(126, 50, 40, 255), outline=rgba("ink"))
    d.rectangle((16, 22, 48, 31), fill=(216, 191, 123, 255), outline=rgba("ink"))
    d.rectangle((23, 34, 41, 58), fill=(0, 0, 0, 0), outline=rgba("soft_ink"))
    save(img, path)
    return img


def roof_large(d: ImageDraw.ImageDraw, x: int, y: int, w: int, h: int = 24) -> None:
    d.polygon(
        [(x - 8, y + h), (x + w + 8, y + h), (x + w - 12, y), (x + 12, y)],
        fill=rgba("tile_dark"),
        outline=rgba("ink"),
    )
    for i in range(x + 5, x + w - 1, 7):
        d.arc((i - 7, y + 2, i + 9, y + h + 6), 190, 350, fill=rgba("tile_mid"), width=2)
        d.line((i, y + 4, i - 4, y + h - 2), fill=(42, 42, 39, 160))
    d.rectangle((x - 10, y + h - 2, x + w + 10, y + h + 4), fill=rgba("tile_mid"), outline=rgba("ink"))
    d.rectangle((x - 7, y + h + 3, x + w + 7, y + h + 6), fill=rgba("wood_dark"))


def awning(d: ImageDraw.ImageDraw, x: int, y: int, w: int, color: tuple[int, int, int, int]) -> None:
    d.polygon([(x, y), (x + w, y), (x + w - 8, y + 16), (x + 8, y + 16)], fill=color, outline=rgba("wood_dark"))
    for i in range(x + 9, x + w - 4, 12):
        d.line((i, y + 1, i - 5, y + 15), fill=(120, 94, 63, 135))


def draw_shop(path: Path, accent: str, detail: str) -> Image.Image:
    img = Image.new("RGBA", (96, 88), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.ellipse((10, 78, 88, 86), fill=(0, 0, 0, 38))
    d.rectangle((12, 36, 84, 79), fill=rgba("white_wall"), outline=rgba("ink"))
    roof_large(d, 10, 8, 76, 25)
    d.rectangle((18, 45, 32, 78), fill=rgba("wood_dark"), outline=rgba("ink"))
    d.rectangle((42, 48, 73, 64), fill=(232, 225, 195, 255), outline=rgba("wood_dark"))
    d.rectangle((40, 66, 78, 78), fill=rgba(accent), outline=rgba("soft_ink"))
    d.rectangle((14, 37, 82, 41), fill=rgba("wood"), outline=rgba("wood_dark"))
    d.rectangle((6, 62, 16, 79), fill=rgba("bamboo"), outline=rgba("wood_dark"))
    d.rectangle((80, 60, 90, 80), fill=rgba("clay"), outline=rgba("wood_dark"))
    if detail == "indigo":
        awning(d, 14, 38, 30, rgba("indigo"))
        d.line((45, 66, 76, 78), fill=rgba("indigo_light"), width=2)
        d.ellipse((62, 65, 82, 83), fill=(48, 67, 95, 255), outline=rgba("ink"))
        d.rectangle((24, 48, 36, 58), fill=rgba("paper_blue"), outline=rgba("wood_dark"))
    elif detail == "bamboo":
        for x in (46, 52, 58, 64, 70):
            d.line((x, 48, x - 14, 78), fill=rgba("bamboo"), width=2)
        d.rectangle((38, 72, 80, 78), fill=rgba("bamboo_light"), outline=rgba("soft_ink"))
    elif detail == "kiln":
        d.rectangle((46, 52, 78, 79), fill=(76, 69, 57, 255), outline=rgba("ink"))
        d.arc((53, 55, 72, 82), 180, 360, fill=rgba("kiln"), width=3)
        d.polygon([(61, 72), (66, 58), (72, 72)], fill=(218, 132, 59, 255))
    else:
        d.rectangle((44, 48, 78, 57), fill=(213, 181, 118, 255), outline=rgba("wood_dark"))
        d.ellipse((48, 62, 62, 75), fill=(105, 123, 112, 255), outline=rgba("ink"))
        d.rectangle((66, 62, 76, 76), fill=rgba("gold"), outline=rgba("ink"))
    save(img, path)
    return img


def draw_industry(path: Path, accent: str, detail: str) -> Image.Image:
    img = Image.new("RGBA", (96, 88), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.ellipse((8, 79, 90, 87), fill=(0, 0, 0, 40))
    d.rectangle((12, 39, 84, 80), fill=(199, 191, 156, 255), outline=rgba("ink"))
    roof_large(d, 13, 17, 70, 22)
    d.rectangle((18, 46, 32, 80), fill=rgba("wood_dark"), outline=rgba("ink"))
    d.rectangle((42, 49, 78, 70), fill=rgba(accent), outline=rgba("soft_ink"))
    d.rectangle((14, 42, 82, 46), fill=rgba("wood"), outline=rgba("wood_dark"))
    if detail == "field":
        for x in (43, 50, 57, 64, 71):
            d.line((x, 50, x - 14, 80), fill=rgba("bamboo"), width=2)
        d.arc((38, 65, 58, 86), 200, 350, fill=rgba("gold"), width=2)
        d.arc((57, 64, 82, 86), 200, 350, fill=rgba("gold"), width=2)
    elif detail == "mine":
        d.polygon([(36, 80), (50, 45), (64, 80)], fill=rgba("stone_dark"), outline=rgba("ink"))
        d.polygon([(54, 80), (75, 37), (91, 80)], fill=rgba("stone"), outline=rgba("ink"))
        d.rectangle((41, 55, 56, 66), fill=(40, 37, 32, 255), outline=rgba("ink"))
    elif detail == "kiln":
        d.rectangle((50, 38, 74, 80), fill=rgba("clay"), outline=rgba("ink"))
        d.arc((55, 55, 70, 82), 180, 360, fill=rgba("ink"), width=2)
        d.rectangle((76, 24, 86, 80), fill=rgba("stone_dark"), outline=rgba("ink"))
        d.polygon([(60, 72), (65, 58), (71, 72)], fill=(221, 118, 50, 255))
    elif detail == "forge":
        d.rectangle((42, 57, 76, 80), fill=rgba("iron"), outline=rgba("ink"))
        d.polygon([(50, 72), (58, 53), (68, 72)], fill=(221, 118, 50, 255), outline=rgba("kiln"))
        d.line((33, 49, 84, 76), fill=rgba("wood_dark"), width=3)
        d.rectangle((27, 45, 42, 52), fill=rgba("iron"), outline=rgba("ink"))
        d.rectangle((72, 46, 82, 66), fill=rgba("wood_dark"), outline=rgba("ink"))
    elif detail == "loom":
        d.rectangle((40, 47, 78, 80), outline=rgba("wood_dark"), width=3)
        for x in range(46, 77, 5):
            d.line((x, 49, x, 79), fill=rgba("paper_shadow"))
        d.rectangle((43, 66, 76, 75), fill=rgba(accent), outline=rgba("soft_ink"))
        d.rectangle((29, 59, 37, 78), fill=rgba("wood"), outline=rgba("ink"))
    else:
        awning(d, 37, 45, 44, (213, 181, 118, 255))
        d.ellipse((43, 64, 60, 80), fill=rgba("bamboo"), outline=rgba("ink"))
        d.rectangle((64, 61, 79, 80), fill=rgba("gold"), outline=rgba("ink"))
        d.rectangle((38, 55, 84, 60), fill=rgba("wood_dark"))
    save(img, path)
    return img


def draw_craft(path: Path, accent: str, detail: str) -> Image.Image:
    img = Image.new("RGBA", (96, 88), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.ellipse((8, 79, 90, 87), fill=(0, 0, 0, 40))
    d.rectangle((12, 38, 84, 80), fill=rgba("white_wall"), outline=rgba("ink"))
    roof_large(d, 10, 12, 76, 24)
    d.rectangle((18, 48, 33, 80), fill=rgba("wood_dark"), outline=rgba("ink"))
    d.rectangle((42, 47, 78, 62), fill=(232, 225, 195, 255), outline=rgba("wood_dark"))
    d.rectangle((40, 66, 82, 80), fill=rgba(accent), outline=rgba("soft_ink"))
    d.rectangle((14, 40, 82, 44), fill=rgba("wood"), outline=rgba("wood_dark"))
    if detail == "indigo":
        awning(d, 42, 46, 40, rgba("indigo"))
        d.line((45, 64, 80, 78), fill=rgba("indigo_light"), width=3)
        d.ellipse((62, 62, 86, 84), fill=(48, 67, 95, 255), outline=rgba("ink"))
    elif detail == "bamboo":
        for x in (47, 53, 59, 65, 71):
            d.line((x, 49, x - 16, 80), fill=rgba("bamboo"), width=2)
        d.rectangle((38, 73, 84, 79), fill=rgba("bamboo_light"), outline=rgba("soft_ink"))
    elif detail == "ceramic":
        for x, y, c in [(45, 64, "paper"), (58, 60, "clay"), (72, 66, "paper_blue")]:
            d.ellipse((x, y, x + 13, y + 17), fill=rgba(c), outline=rgba("ink"))
        d.rectangle((39, 48, 82, 56), fill=rgba("paper_blue"), outline=rgba("wood_dark"))
    elif detail == "metal":
        d.rectangle((42, 58, 79, 80), fill=rgba("iron"), outline=rgba("ink"))
        d.line((36, 51, 85, 75), fill=rgba("wood_dark"), width=3)
        d.rectangle((29, 47, 45, 54), fill=rgba("iron"), outline=rgba("ink"))
        d.polygon([(58, 71), (65, 55), (72, 71)], fill=(221, 118, 50, 255))
    elif detail == "textile":
        d.rectangle((41, 48, 80, 80), outline=rgba("wood_dark"), width=3)
        for y in range(53, 77, 6):
            d.line((43, y, 78, y + 1), fill=rgba(accent), width=2)
        for x in range(47, 79, 5):
            d.line((x, 50, x, 79), fill=rgba("paper_shadow"))
    elif detail == "paper":
        for i, x in enumerate((42, 51, 60, 69)):
            d.rectangle((x, 52 + i % 2, x + 13, 70 + i % 2), fill=(232, 225, 195, 255), outline=rgba("paper_shadow"))
        d.rectangle((39, 72, 84, 80), fill=rgba("paper_blue"), outline=rgba("ink"))
    elif detail == "lacquer":
        d.rectangle((43, 55, 80, 78), fill=rgba("lacquer"), outline=rgba("ink"))
        d.ellipse((50, 58, 73, 74), outline=rgba("gold"), width=2)
        d.rectangle((66, 45, 77, 55), fill=rgba("wood"), outline=rgba("ink"))
    save(img, path)
    return img


def draw_gate(path: Path) -> Image.Image:
    img = Image.new("RGBA", (80, 80), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.ellipse((12, 72, 68, 78), fill=(0, 0, 0, 36))
    d.rectangle((10, 24, 19, 75), fill=rgba("wood"), outline=rgba("ink"))
    d.rectangle((61, 24, 70, 75), fill=rgba("wood"), outline=rgba("ink"))
    d.rectangle((5, 15, 75, 27), fill=(126, 50, 40, 255), outline=rgba("ink"))
    d.rectangle((21, 30, 59, 42), fill=(216, 191, 123, 255), outline=rgba("ink"))
    d.rectangle((28, 49, 52, 75), fill=(0, 0, 0, 0), outline=rgba("soft_ink"), width=2)
    d.polygon([(3, 15), (77, 15), (66, 7), (14, 7)], fill=rgba("tile_dark"), outline=rgba("ink"))
    save(img, path)
    return img


def draw_willow(path: Path) -> Image.Image:
    img = Image.new("RGBA", (96, 96), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.ellipse((18, 86, 72, 94), fill=(0, 0, 0, 36))
    d.rectangle((40, 42, 50, 88), fill=rgba("wood"), outline=rgba("wood_dark"))
    d.polygon([(44, 44), (25, 77), (31, 78), (48, 45)], fill=rgba("wood_dark"))
    d.polygon([(47, 44), (70, 76), (63, 77), (45, 45)], fill=rgba("wood_dark"))
    for box, color in [
        ((18, 13, 64, 47), "bamboo"),
        ((35, 8, 76, 44), "bamboo_light"),
        ((9, 30, 50, 62), "bamboo"),
        ((43, 27, 86, 62), "bamboo"),
    ]:
        d.ellipse(box, fill=rgba(color), outline=rgba("soft_ink"))
    for x, y, length in [
        (18, 43, 42), (24, 39, 50), (33, 35, 52), (43, 33, 55),
        (55, 34, 52), (65, 38, 48), (75, 43, 40),
    ]:
        d.line((x, y, x - 5, y + length), fill=(92, 127, 70, 225), width=2)
        d.line((x + 4, y + 2, x + 2, y + length - 6), fill=(132, 158, 90, 210))
    save(img, path)
    return img


def draw_arch_bridge(path: Path) -> Image.Image:
    img = Image.new("RGBA", (128, 80), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.ellipse((14, 68, 115, 78), fill=(0, 0, 0, 32))
    d.arc((12, 18, 116, 98), 180, 360, fill=rgba("stone_dark"), width=10)
    d.arc((22, 31, 106, 95), 180, 360, fill=rgba("stone"), width=18)
    d.arc((37, 43, 91, 99), 180, 360, fill=(0, 0, 0, 0), width=16)
    d.line((14, 47, 114, 47), fill=rgba("stone_dark"), width=3)
    for x in (20, 38, 56, 74, 92, 110):
        d.rectangle((x, 25, x + 5, 48), fill=rgba("stone"), outline=rgba("stone_dark"))
    for x in range(23, 104, 8):
        d.line((x, 49, x - 7, 64), fill=(104, 98, 84, 190))
    d.line((12, 66, 116, 66), fill=rgba("ink"), width=1)
    save(img, path)
    return img


def draw_tea_stall(path: Path) -> Image.Image:
    img = Image.new("RGBA", (96, 72), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.ellipse((12, 62, 86, 70), fill=(0, 0, 0, 36))
    d.line((48, 8, 48, 59), fill=rgba("wood_dark"), width=3)
    d.polygon([(22, 18), (75, 18), (62, 4), (37, 4)], fill=(206, 174, 111, 255), outline=rgba("ink"))
    for x in range(30, 70, 8):
        d.line((48, 8, x, 18), fill=(134, 93, 52, 180))
    d.rectangle((23, 47, 74, 58), fill=rgba("wood"), outline=rgba("ink"))
    d.rectangle((27, 58, 33, 67), fill=rgba("wood_dark"))
    d.rectangle((66, 58, 72, 67), fill=rgba("wood_dark"))
    d.rectangle((17, 55, 26, 65), fill=rgba("clay"), outline=rgba("ink"))
    d.rectangle((75, 52, 85, 66), fill=rgba("wood"), outline=rgba("ink"))
    d.ellipse((38, 40, 52, 50), fill=rgba("paper_blue"), outline=rgba("ink"))
    d.rectangle((55, 42, 64, 51), fill=rgba("gold"), outline=rgba("wood_dark"))
    d.rectangle((30, 43, 37, 50), fill=rgba("paper"), outline=rgba("wood_dark"))
    d.rectangle((11, 59, 21, 66), fill=rgba("wood"), outline=rgba("ink"))
    save(img, path)
    return img


def draw_lantern_post(path: Path) -> Image.Image:
    img = Image.new("RGBA", (32, 64), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.ellipse((7, 58, 24, 63), fill=(0, 0, 0, 32))
    d.rectangle((14, 12, 18, 60), fill=rgba("wood"), outline=rgba("wood_dark"))
    d.rectangle((10, 10, 29, 14), fill=rgba("wood"), outline=rgba("wood_dark"))
    d.line((26, 14, 26, 25), fill=rgba("wood_dark"), width=2)
    d.ellipse((20, 24, 31, 43), fill=(224, 183, 99, 255), outline=rgba("ink"))
    d.rectangle((21, 27, 30, 40), outline=rgba("gold"))
    d.rectangle((24, 43, 27, 49), fill=rgba("lacquer"))
    d.rectangle((10, 56, 22, 61), fill=rgba("stone_dark"), outline=rgba("ink"))
    save(img, path)
    return img


def draw_banner(path: Path) -> Image.Image:
    img = Image.new("RGBA", (48, 72), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.ellipse((14, 66, 37, 71), fill=(0, 0, 0, 30))
    d.rectangle((22, 8, 27, 68), fill=rgba("wood"), outline=rgba("wood_dark"))
    d.rectangle((15, 12, 43, 16), fill=rgba("wood"), outline=rgba("wood_dark"))
    d.polygon([(18, 17), (39, 17), (35, 48), (18, 54)], fill=(220, 205, 164, 255), outline=rgba("ink"))
    d.line((22, 22, 35, 20), fill=rgba("lacquer"), width=2)
    d.line((22, 30, 34, 29), fill=rgba("indigo"), width=2)
    d.line((22, 38, 31, 38), fill=rgba("bamboo"), width=2)
    d.rectangle((18, 65, 31, 70), fill=rgba("stone_dark"), outline=rgba("ink"))
    save(img, path)
    return img


def draw_notice_board(path: Path) -> Image.Image:
    img = Image.new("RGBA", (72, 64), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.ellipse((10, 56, 62, 62), fill=(0, 0, 0, 32))
    d.rectangle((11, 15, 61, 53), fill=rgba("wood"), outline=rgba("ink"))
    d.rectangle((17, 21, 55, 47), fill=rgba("paper"), outline=rgba("wood_dark"))
    d.rectangle((7, 10, 65, 17), fill=rgba("tile_dark"), outline=rgba("ink"))
    d.rectangle((13, 53, 19, 62), fill=rgba("wood_dark"))
    d.rectangle((53, 53, 59, 62), fill=rgba("wood_dark"))
    for y in (27, 33, 39):
        d.line((23, y, 49, y), fill=rgba("soft_ink"))
    save(img, path)
    return img


def draw_dock(path: Path) -> Image.Image:
    img = Image.new("RGBA", (96, 64), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.ellipse((6, 52, 88, 62), fill=(0, 0, 0, 26))
    d.polygon([(7, 35), (76, 28), (91, 40), (20, 54)], fill=rgba("wood"), outline=rgba("ink"))
    for x in range(16, 82, 12):
        d.line((x, 33, x + 15, 47), fill=rgba("wood_dark"), width=2)
    for x, y in [(9, 31), (30, 28), (63, 24), (86, 35), (20, 50), (76, 43)]:
        d.rectangle((x, y - 14, x + 5, y + 10), fill=rgba("wood"), outline=rgba("wood_dark"))
    d.rectangle((74, 42, 94, 51), fill=rgba("wood"), outline=rgba("ink"))
    save(img, path)
    return img


def draw_boat(path: Path) -> Image.Image:
    img = Image.new("RGBA", (128, 72), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.ellipse((14, 58, 116, 69), fill=(0, 0, 0, 28))
    d.polygon([(12, 45), (111, 45), (98, 61), (27, 63)], fill=rgba("wood"), outline=rgba("ink"))
    d.polygon([(22, 25), (82, 23), (95, 45), (15, 45)], fill=(159, 120, 68, 255), outline=rgba("wood_dark"))
    for x in range(30, 82, 8):
        d.arc((x - 9, 18, x + 12, 51), 190, 350, fill=(115, 82, 45, 190), width=2)
    d.rectangle((92, 43, 120, 47), fill=rgba("wood_dark"))
    d.line((111, 42, 124, 29), fill=rgba("wood_dark"), width=3)
    d.rectangle((5, 47, 19, 51), fill=rgba("wood_dark"))
    d.line((18, 49, 2, 31), fill=rgba("wood_dark"), width=3)
    save(img, path)
    return img


def draw_marker(path: Path) -> Image.Image:
    img = Image.new("RGBA", (16, 18), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.ellipse((4, 1, 12, 11), fill=(236, 201, 116, 255), outline=rgba("ink"))
    d.rectangle((7, 11, 9, 16), fill=(150, 60, 44, 255))
    d.line((8, 0, 8, 3), fill=rgba("ink"))
    save(img, path)
    return img


def draw_move_target(path: Path) -> Image.Image:
    img = Image.new("RGBA", (32, 32), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.ellipse((4, 6, 28, 26), outline=(217, 187, 107, 230), width=2)
    d.ellipse((10, 11, 22, 21), outline=(217, 187, 107, 145), width=1)
    save(img, path)
    return img


def draw_ui_plaque(path: Path, size: tuple[int, int], accent: str) -> Image.Image:
    w, h = size
    img = Image.new("RGBA", size, (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((2, 2, w - 3, h - 3), radius=5, fill=(218, 207, 174, 238), outline=rgba("ink"), width=1)
    d.rounded_rectangle((5, 5, w - 6, h - 6), radius=3, outline=rgba(accent), width=1)
    d.rectangle((8, 0, w - 9, 4), fill=rgba("wood"), outline=rgba("wood_dark"))
    d.rectangle((8, h - 5, w - 9, h - 1), fill=rgba("wood_dark"))
    d.point((12, 11), fill=(244, 237, 202, 200))
    d.point((w - 14, h - 13), fill=(126, 112, 83, 180))
    save(img, path)
    return img


def draw_ui_panel(path: Path) -> Image.Image:
    img = Image.new("RGBA", (360, 70), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((2, 6, 357, 67), radius=7, fill=(31, 26, 20, 190), outline=(216, 194, 148, 210), width=1)
    d.rounded_rectangle((8, 12, 351, 61), radius=5, fill=(224, 214, 181, 220), outline=rgba("wood_dark"), width=1)
    for x in range(20, 345, 32):
        d.line((x, 13, x - 8, 60), fill=(170, 152, 111, 55))
    save(img, path)
    return img


def draw_ui_button(path: Path, accent: str) -> Image.Image:
    return draw_ui_plaque(path, (76, 36), accent)


def draw_ui_metric(path: Path) -> Image.Image:
    return draw_ui_plaque(path, (58, 62), "gold")


def draw_ui_icon(path: Path, kind: str) -> Image.Image:
    img = Image.new("RGBA", (24, 24), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    ink = rgba("ink")
    gold = rgba("gold")
    wood = rgba("wood_dark")
    paper = rgba("paper")
    accent = rgba("indigo")

    if kind == "settings":
        for x, y in [(11, 1), (11, 19), (1, 11), (19, 11), (4, 4), (18, 4), (4, 18), (18, 18)]:
            d.rectangle((x, y, x + 3, y + 3), fill=gold, outline=wood)
        d.ellipse((5, 5, 19, 19), fill=(209, 188, 129, 255), outline=ink)
        d.ellipse((10, 10, 14, 14), fill=rgba("paper"), outline=wood)
    elif kind == "map":
        d.polygon([(3, 5), (8, 3), (13, 5), (20, 3), (20, 19), (14, 21), (9, 19), (3, 21)], fill=paper, outline=ink)
        d.line((8, 4, 8, 19), fill=rgba("paper_shadow"))
        d.line((14, 5, 14, 20), fill=rgba("paper_shadow"))
        d.line((5, 13, 10, 10, 14, 13, 18, 9), fill=accent, width=2)
    elif kind == "bag":
        d.arc((7, 2, 17, 12), 180, 360, fill=wood, width=2)
        d.polygon([(6, 8), (18, 8), (21, 20), (3, 20)], fill=(176, 139, 80, 255), outline=ink)
        d.rectangle((8, 10, 16, 14), fill=rgba("paper_shadow"), outline=wood)
        d.ellipse((10, 15, 14, 19), fill=gold, outline=wood)
    elif kind == "achievement":
        d.ellipse((5, 3, 19, 17), fill=gold, outline=ink)
        d.polygon([(9, 15), (6, 22), (12, 18), (18, 22), (15, 15)], fill=rgba("lacquer"), outline=ink)
        d.polygon([(12, 6), (14, 11), (19, 11), (15, 13), (16, 17), (12, 14), (8, 17), (9, 13), (5, 11), (10, 11)], fill=rgba("paper"))
    elif kind == "panel":
        d.rectangle((4, 11, 20, 21), fill=rgba("white_wall"), outline=ink)
        d.polygon([(2, 12), (22, 12), (18, 6), (6, 6)], fill=rgba("tile_dark"), outline=ink)
        d.rectangle((9, 14, 14, 21), fill=wood, outline=ink)
        d.rectangle((15, 14, 19, 18), fill=rgba("paper_blue"), outline=wood)
    elif kind == "season":
        d.arc((4, 3, 20, 19), 35, 320, fill=gold, width=2)
        d.polygon([(16, 3), (21, 4), (18, 9)], fill=gold, outline=wood)
        d.line((7, 16, 17, 8), fill=rgba("bamboo"), width=2)
        d.ellipse((12, 7, 19, 12), fill=rgba("bamboo_light"), outline=rgba("bamboo"))
    elif kind == "heritage":
        d.rectangle((5, 5, 19, 17), fill=paper, outline=ink)
        d.rectangle((3, 4, 7, 18), fill=rgba("wood"), outline=ink)
        d.rectangle((17, 4, 21, 18), fill=rgba("wood"), outline=ink)
        d.line((9, 8, 16, 8), fill=accent)
        d.line((9, 12, 15, 12), fill=accent)
    elif kind == "market":
        for y in (14, 10, 6):
            d.ellipse((5, y, 17, y + 6), fill=gold, outline=wood)
        d.rectangle((5, 9, 17, 17), fill=gold)
        d.arc((5, 14, 17, 20), 0, 180, fill=wood)
        d.rectangle((15, 12, 20, 20), fill=rgba("indigo"), outline=ink)
    elif kind == "life":
        d.rectangle((5, 11, 19, 21), fill=rgba("white_wall"), outline=ink)
        d.polygon([(3, 12), (21, 12), (17, 6), (7, 6)], fill=rgba("bamboo"), outline=ink)
        d.rectangle((10, 14, 14, 21), fill=wood, outline=ink)
        d.ellipse((15, 3, 21, 9), fill=rgba("bamboo_light"), outline=rgba("bamboo"))
    elif kind == "spirit":
        d.line((12, 2, 12, 22), fill=gold, width=2)
        d.line((3, 12, 21, 12), fill=gold, width=2)
        d.line((6, 6, 18, 18), fill=rgba("lacquer"), width=2)
        d.line((18, 6, 6, 18), fill=rgba("lacquer"), width=2)
        d.ellipse((8, 8, 16, 16), fill=rgba("paper"), outline=ink)
    else:
        d.rectangle((5, 5, 19, 19), fill=gold, outline=ink)
    save(img, path)
    return img


def draw_person_frame(role: str, row: int, frame: int) -> Image.Image:
    img = Image.new("RGBA", (32, 32), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    step = [-1, 0, 1, 0][frame]
    side = row in (1, 2)
    facing_left = row == 1
    robe = "robe_blue" if role == "tourist" else "robe" if role == "player" else "bamboo"
    if role == "vendor":
        robe = "wood"
    x = 16 + (1 if row == 2 else -1 if row == 1 else 0)
    d.ellipse((8, 26, 24, 30), fill=(0, 0, 0, 45))
    d.rectangle((x - 5, 12, x + 5, 25), fill=rgba(robe), outline=rgba("ink"))
    d.polygon([(x - 5, 14), (x, 26), (x + 5, 14)], fill=rgba(robe), outline=rgba("ink"))
    d.rectangle((x - 4 + step, 25, x - 1 + step, 29), fill=rgba("ink"))
    d.rectangle((x + 1 - step, 25, x + 4 - step, 29), fill=rgba("ink"))
    if side:
        arm_x = x - 6 if facing_left else x + 5
        d.line((arm_x, 15, arm_x + (-3 if facing_left else 3), 21), fill=rgba("skin"), width=2)
    else:
        d.line((x - 6, 15, x - 8, 20 + step), fill=rgba("skin"), width=2)
        d.line((x + 6, 15, x + 8, 20 - step), fill=rgba("skin"), width=2)
    d.ellipse((x - 5, 4, x + 5, 14), fill=rgba("skin"), outline=rgba("ink"))
    d.rectangle((x - 5, 3, x + 5, 7), fill=rgba("ink"))
    d.rectangle((x - 3, 1, x + 3, 4), fill=rgba("ink"))
    if role == "vendor":
        d.polygon([(x - 8, 5), (x + 8, 5), (x, 1)], fill=(133, 100, 57, 255), outline=rgba("ink"))
        d.rectangle((x + 6, 17, x + 10, 23), fill=(210, 183, 115, 255), outline=rgba("ink"))
    elif role == "tourist":
        d.rectangle((x - 7, 13, x - 5, 21), fill=(213, 189, 124, 255), outline=rgba("ink"))
    else:
        d.line((x + 7, 13, x + 10, 20), fill=rgba("wood_dark"), width=2)
    if row == 3:
        d.rectangle((x - 5, 4, x + 5, 13), fill=rgba("ink"))
        d.rectangle((x - 4, 11, x + 4, 13), fill=rgba("skin"))
    return img


def make_walk_sheet(role: str, transparent_path: Path) -> Image.Image:
    sheet = Image.new("RGBA", (128, 128), (0, 0, 0, 0))
    for row in range(4):
        for frame in range(4):
            sprite = draw_person_frame(role, row, frame)
            pos = (frame * 32, row * 32)
            sheet.alpha_composite(sprite, pos)
    save(sheet, transparent_path)
    return sheet


def make_contact_sheet(items: list[Image.Image], path: Path, *, green: bool) -> None:
    bg = GREEN if green else (0, 0, 0, 0)
    sheet_w = 512
    x = y = 8
    row_h = 0
    for item in items:
        if x + item.width > sheet_w - 8:
            x = 8
            y += row_h + 8
            row_h = 0
        x += item.width + 8
        row_h = max(row_h, item.height)
    sheet_h = max(384, y + row_h + 8)
    sheet = Image.new("RGBA", (sheet_w, sheet_h), bg)
    x = y = 8
    row_h = 0
    for item in items:
        if x + item.width > sheet.width - 8:
            x = 8
            y += row_h + 8
            row_h = 0
        sheet.alpha_composite(item, (x, y))
        x += item.width + 8
        row_h = max(row_h, item.height)
    save(sheet, path)


def main() -> None:
    ensure_dirs()
    generated: list[Image.Image] = []

    generated.append(draw_ground(OUT / "tiles/ground.png"))
    generated.append(draw_ground_variant(OUT / "tiles/ground_moss.png", "moss"))
    generated.append(draw_ground_variant(OUT / "tiles/ground_stone.png", "stone"))
    generated.append(draw_ground_variant(OUT / "tiles/ground_soil.png", "soil"))
    generated.append(draw_road(OUT / "tiles/road.png"))
    generated.append(draw_road_variant(OUT / "tiles/road_vertical.png", "vertical"))
    generated.append(draw_road_variant(OUT / "tiles/road_cross.png", "cross"))
    generated.append(draw_water(OUT / "tiles/water.png"))
    generated.append(draw_water_edge(OUT / "tiles/water_edge_left.png", "left"))
    generated.append(draw_water_edge(OUT / "tiles/water_edge_right.png", "right"))
    generated.append(draw_bridge(OUT / "tiles/bridge.png"))
    generated.append(draw_fence(OUT / "tiles/fence.png"))
    generated.append(draw_tree(OUT / "tiles/tree.png"))
    generated.append(draw_rock(OUT / "tiles/rock.png"))

    generated.append(draw_shop(OUT / "buildings/shop_indigo.png", "indigo", "indigo"))
    generated.append(draw_shop(OUT / "buildings/shop_bamboo.png", "bamboo", "bamboo"))
    generated.append(draw_shop(OUT / "buildings/industry_harvest.png", "bamboo", "market"))
    generated.append(draw_shop(OUT / "buildings/industry_refine.png", "kiln", "kiln"))
    generated.append(draw_shop(OUT / "buildings/industry_product.png", "gold", "market"))
    generated.append(draw_shop(OUT / "buildings/craft_house.png", "indigo", "market"))
    generated.append(draw_industry(OUT / "buildings/industry_field.png", "bamboo", "field"))
    generated.append(draw_industry(OUT / "buildings/industry_mine.png", "stone", "mine"))
    generated.append(draw_industry(OUT / "buildings/industry_kiln.png", "clay", "kiln"))
    generated.append(draw_industry(OUT / "buildings/industry_forge.png", "iron", "forge"))
    generated.append(draw_industry(OUT / "buildings/industry_loom.png", "paper_blue", "loom"))
    generated.append(draw_industry(OUT / "buildings/industry_market.png", "gold", "market"))
    generated.append(draw_craft(OUT / "buildings/craft_indigo.png", "indigo", "indigo"))
    generated.append(draw_craft(OUT / "buildings/craft_bamboo.png", "bamboo", "bamboo"))
    generated.append(draw_craft(OUT / "buildings/craft_ceramic.png", "clay", "ceramic"))
    generated.append(draw_craft(OUT / "buildings/craft_metal.png", "iron", "metal"))
    generated.append(draw_craft(OUT / "buildings/craft_textile.png", "paper_blue", "textile"))
    generated.append(draw_craft(OUT / "buildings/craft_paper.png", "paper_blue", "paper"))
    generated.append(draw_craft(OUT / "buildings/craft_lacquer.png", "lacquer", "lacquer"))
    generated.append(draw_gate(OUT / "buildings/gate.png"))

    generated.append(draw_willow(OUT / "props/willow.png"))
    generated.append(draw_arch_bridge(OUT / "props/arch_bridge.png"))
    generated.append(draw_tea_stall(OUT / "props/tea_stall.png"))
    generated.append(draw_lantern_post(OUT / "props/lantern_post.png"))
    generated.append(draw_banner(OUT / "props/banner.png"))
    generated.append(draw_notice_board(OUT / "props/notice_board.png"))
    generated.append(draw_dock(OUT / "props/dock.png"))
    generated.append(draw_boat(OUT / "props/boat.png"))

    generated.append(make_walk_sheet("player", OUT / "characters/player_walk.png"))
    generated.append(make_walk_sheet("tourist", OUT / "characters/npc_tourist_walk.png"))
    generated.append(make_walk_sheet("vendor", OUT / "characters/npc_vendor_walk.png"))

    generated.append(draw_marker(OUT / "effects/marker.png"))
    generated.append(draw_move_target(OUT / "effects/move_target.png"))
    generated.append(draw_ui_panel(OUT / "ui/hud_panel.png"))
    generated.append(draw_ui_button(OUT / "ui/hud_button.png", "indigo"))
    generated.append(draw_ui_button(OUT / "ui/hud_button_red.png", "lacquer"))
    generated.append(draw_ui_button(OUT / "ui/hud_button_gold.png", "gold"))
    generated.append(draw_ui_metric(OUT / "ui/hud_metric.png"))
    for icon in (
        "settings",
        "map",
        "bag",
        "achievement",
        "panel",
        "season",
        "heritage",
        "market",
        "life",
        "spirit",
    ):
        generated.append(draw_ui_icon(OUT / f"ui/icon_{icon}.png", icon))

    make_contact_sheet(generated, SOURCES / "qingming_asset_sheet_transparent.png", green=False)
    make_contact_sheet(generated, SOURCES / "qingming_asset_sheet_green.png", green=True)


if __name__ == "__main__":
    main()
