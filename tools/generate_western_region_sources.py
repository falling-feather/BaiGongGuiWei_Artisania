from __future__ import annotations

import random
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "public" / "assets" / "art_sources" / "western_region" / "2026-06-05"
GREEN = (0, 255, 0)
CELL = 128
TILE = 32


def clamp(value: int) -> int:
    return max(0, min(255, value))


def jitter(color: tuple[int, int, int], amount: int = 10) -> tuple[int, int, int]:
    return tuple(clamp(channel + random.randint(-amount, amount)) for channel in color)


def textured_tile(base: tuple[int, int, int], speckles: list[tuple[int, int, int]], density: int = 85) -> Image.Image:
    img = Image.new("RGB", (TILE, TILE), base)
    draw = ImageDraw.Draw(img)
    for _ in range(density):
        x = random.randrange(TILE)
        y = random.randrange(TILE)
        color = jitter(random.choice(speckles), 8)
        draw.point((x, y), fill=color)
        if random.random() < 0.18:
            draw.point((min(TILE - 1, x + 1), y), fill=color)
    return img


def draw_tracks(img: Image.Image, mode: str) -> Image.Image:
    draw = ImageDraw.Draw(img)
    track = (135, 101, 58)
    edge = (94, 72, 46)
    if mode in {"h", "cross"}:
        for y in (13, 19):
            draw.line((0, y, 31, y), fill=edge)
            draw.line((0, y + 1, 31, y + 1), fill=track)
    if mode in {"v", "cross"}:
        for x in (13, 19):
            draw.line((x, 0, x, 31), fill=edge)
            draw.line((x + 1, 0, x + 1, 31), fill=track)
    for _ in range(10):
        x = random.randrange(TILE)
        y = random.randrange(TILE)
        if mode == "h":
            y = random.choice([11, 21])
        elif mode == "v":
            x = random.choice([11, 21])
        draw.rectangle((x, y, min(31, x + 1), min(31, y + 1)), fill=(72, 55, 36))
    return img


def draw_water(kind: str) -> Image.Image:
    img = Image.new("RGB", (TILE, TILE), (50, 122, 130))
    draw = ImageDraw.Draw(img)
    for y in range(TILE):
        for x in range(TILE):
            if random.random() < 0.22:
                draw.point((x, y), fill=jitter((42, 103, 118), 10))
    for _ in range(12):
        x = random.randrange(TILE)
        y = random.randrange(TILE)
        draw.line((x, y, min(31, x + random.randint(2, 5)), y), fill=(117, 177, 174))
    bank = (176, 141, 77)
    reed = (91, 126, 65)
    if kind == "top":
        draw.rectangle((0, 0, 31, 7), fill=bank)
        for x in range(0, 32, 4):
            draw.line((x, 3, x + 2, 10), fill=reed)
    elif kind == "bottom":
        draw.rectangle((0, 24, 31, 31), fill=bank)
        for x in range(0, 32, 4):
            draw.line((x, 27, x + 2, 21), fill=reed)
    elif kind == "reed":
        draw.rectangle((0, 0, 7, 31), fill=bank)
        draw.rectangle((24, 0, 31, 31), fill=bank)
        for y in range(2, 31, 4):
            draw.line((4, y, 11, y - 2), fill=reed)
            draw.line((28, y, 21, y - 2), fill=reed)
    elif kind == "salt":
        img = textured_tile((130, 168, 156), [(188, 205, 188), (80, 126, 130), (214, 214, 184)], 120)
    elif kind == "canal":
        img = textured_tile((169, 137, 73), [(128, 96, 55), (205, 172, 94)], 65)
        draw = ImageDraw.Draw(img)
        draw.rectangle((10, 0, 21, 31), fill=(45, 111, 127))
        for y in range(0, 32, 5):
            draw.line((11, y, 20, y + 1), fill=(106, 166, 166))
    return img


def make_tiles() -> None:
    random.seed(20260605)
    tiles: list[Image.Image] = []
    tiles.append(textured_tile((196, 154, 82), [(220, 181, 104), (165, 122, 62), (239, 202, 126)], 120))
    dune = textured_tile((211, 166, 86), [(239, 196, 118), (171, 126, 64)], 90)
    d = ImageDraw.Draw(dune)
    for y in range(4, 32, 8):
        d.arc((-8, y - 8, 40, y + 10), 190, 340, fill=(171, 126, 64))
    tiles.append(dune)
    clay = textured_tile((170, 111, 68), [(203, 139, 84), (109, 73, 51)], 100)
    d = ImageDraw.Draw(clay)
    for _ in range(9):
        x, y = random.randrange(32), random.randrange(32)
        d.line((x, y, min(31, x + random.randint(4, 10)), min(31, y + random.randint(-2, 5))), fill=(86, 55, 40))
    tiles.append(clay)
    tiles.append(textured_tile((122, 108, 82), [(80, 72, 58), (170, 144, 98), (98, 95, 84)], 150))
    scrub = textured_tile((178, 136, 76), [(128, 118, 65), (93, 108, 57), (211, 168, 91)], 95)
    d = ImageDraw.Draw(scrub)
    for _ in range(12):
        x, y = random.randrange(32), random.randrange(32)
        d.line((x, y, x + random.randint(-2, 2), max(0, y - random.randint(2, 5))), fill=(91, 103, 55))
    tiles.append(scrub)
    tiles.append(textured_tile((91, 139, 78), [(64, 116, 67), (133, 164, 81), (202, 164, 72)], 150))
    tam = textured_tile((85, 129, 72), [(55, 92, 52), (130, 155, 84), (185, 143, 76)], 140)
    d = ImageDraw.Draw(tam)
    for _ in range(8):
        x, y = random.randrange(32), random.randrange(32)
        d.arc((x - 4, y - 4, x + 6, y + 6), 20, 210, fill=(46, 87, 51))
    tiles.append(tam)
    tiles.append(textured_tile((202, 193, 151), [(236, 227, 185), (156, 150, 122), (215, 206, 167)], 135))
    field = textured_tile((151, 113, 62), [(92, 126, 67), (191, 151, 75)], 90)
    d = ImageDraw.Draw(field)
    for y in range(3, 32, 6):
        d.line((0, y, 31, y + 1), fill=(98, 79, 48))
        d.line((0, y + 2, 31, y + 3), fill=(73, 118, 67))
    tiles.append(field)
    vineyard = textured_tile((133, 101, 62), [(79, 122, 61), (64, 86, 49), (181, 142, 75)], 100)
    d = ImageDraw.Draw(vineyard)
    for x in range(4, 32, 8):
        d.line((x, 0, x, 31), fill=(82, 57, 39))
        d.line((x - 2, 8, x + 3, 8), fill=(67, 111, 55))
        d.line((x - 2, 19, x + 3, 19), fill=(67, 111, 55))
    tiles.append(vineyard)
    tiles.append(textured_tile((101, 95, 86), [(60, 60, 58), (151, 133, 105), (190, 165, 118)], 170))
    tiles.append(textured_tile((166, 124, 69), [(119, 88, 53), (204, 156, 83), (91, 116, 62)], 110))
    tiles.append(draw_tracks(textured_tile((192, 148, 78), [(218, 173, 94), (153, 109, 59)], 95), "h"))
    tiles.append(draw_tracks(textured_tile((192, 148, 78), [(218, 173, 94), (153, 109, 59)], 95), "v"))
    tiles.append(draw_tracks(textured_tile((192, 148, 78), [(218, 173, 94), (153, 109, 59)], 95), "cross"))
    mud = textured_tile((148, 94, 58), [(179, 122, 71), (91, 61, 43)], 100)
    d = ImageDraw.Draw(mud)
    for y in range(0, 32, 8):
        d.line((0, y, 31, y), fill=(91, 61, 43))
    for x in range(0, 32, 8):
        d.line((x, 0, x, 31), fill=(105, 70, 45))
    tiles.append(mud)
    stone = textured_tile((132, 118, 91), [(91, 82, 68), (181, 158, 112)], 120)
    d = ImageDraw.Draw(stone)
    for _ in range(12):
        x, y = random.randrange(32), random.randrange(32)
        d.rectangle((x, y, min(31, x + 3), min(31, y + 2)), outline=(75, 67, 56))
    tiles.append(stone)
    mosaic = textured_tile((151, 114, 72), [(91, 139, 130), (188, 82, 58), (219, 181, 94)], 60)
    d = ImageDraw.Draw(mosaic)
    for y in range(0, 32, 8):
        for x in range(0, 32, 8):
            d.rectangle((x + 1, y + 1, x + 6, y + 6), fill=random.choice([(91, 139, 130), (188, 82, 58), (219, 181, 94)]))
    tiles.append(mosaic)
    tiles.append(draw_water("center"))
    tiles.append(draw_water("top"))
    tiles.append(draw_water("bottom"))
    tiles.append(draw_water("reed"))
    tiles.append(draw_water("salt"))
    tiles.append(draw_water("canal"))

    sheet = Image.new("RGB", (CELL * 6, CELL * 4), (0, 0, 0))
    for index, tile in enumerate(tiles):
        sheet.paste(tile.resize((CELL, CELL), Image.Resampling.NEAREST), ((index % 6) * CELL, (index // 6) * CELL))
    SOURCE_DIR.mkdir(parents=True, exist_ok=True)
    sheet.save(SOURCE_DIR / "western_tiles_6x4_v01.png")


def icon_canvas() -> tuple[Image.Image, ImageDraw.ImageDraw]:
    img = Image.new("RGB", (CELL, CELL), GREEN)
    return img, ImageDraw.Draw(img)


def save_prop_cell(sheet: Image.Image, index: int, draw_func) -> None:
    img, draw = icon_canvas()
    draw_func(draw)
    sheet.paste(img, ((index % 4) * CELL, (index // 4) * CELL))


def make_props() -> None:
    random.seed(260605)
    sheet = Image.new("RGB", (CELL * 4, CELL * 4), GREEN)
    brown = (92, 58, 33)
    dark = (39, 34, 28)
    sand = (188, 137, 72)
    teal = (40, 126, 132)
    red = (169, 64, 48)
    leaf = (72, 118, 62)

    save_prop_cell(sheet, 0, lambda d: (
        d.rectangle((59, 35, 66, 105), fill=brown, outline=dark),
        [d.polygon([(63, 16), (30 + i * 8, 46), (61, 43)], fill=(68, 124, 66), outline=dark) for i in range(6)],
        d.ellipse((49, 72, 56, 80), fill=(191, 126, 47), outline=dark),
        d.ellipse((68, 78, 75, 86), fill=(191, 126, 47), outline=dark),
    ))
    save_prop_cell(sheet, 1, lambda d: (
        d.rectangle((58, 70, 67, 104), fill=brown, outline=dark),
        [d.arc((28 + i * 4, 30 + i * 2, 92 - i * 2, 92), 190, 345, fill=leaf, width=3) for i in range(8)],
    ))
    save_prop_cell(sheet, 2, lambda d: (
        d.ellipse((24, 62, 82, 94), fill=(168, 113, 65), outline=dark),
        d.ellipse((73, 52, 98, 74), fill=(168, 113, 65), outline=dark),
        d.line((91, 54, 102, 38), fill=dark, width=3),
        d.line((38, 91, 34, 111), fill=dark, width=4),
        d.line((72, 91, 76, 111), fill=dark, width=4),
        d.rectangle((42, 47, 75, 66), fill=teal, outline=dark),
    ))
    save_prop_cell(sheet, 3, lambda d: (
        d.rectangle((24, 58, 89, 86), fill=(148, 88, 48), outline=dark),
        d.arc((21, 73, 43, 99), 0, 360, fill=dark, width=4),
        d.arc((73, 73, 95, 99), 0, 360, fill=dark, width=4),
        d.line((89, 64, 108, 45), fill=brown, width=4),
    ))
    save_prop_cell(sheet, 4, lambda d: (
        d.ellipse((33, 54, 95, 108), fill=(138, 119, 87), outline=dark),
        d.ellipse((44, 64, 84, 96), fill=(55, 99, 112), outline=dark),
        d.rectangle((54, 39, 74, 62), fill=(161, 130, 83), outline=dark),
    ))
    save_prop_cell(sheet, 5, lambda d: (
        [d.ellipse((24 + i * 20, 58, 42 + i * 20, 94), fill=(172, 103, 57), outline=dark) for i in range(4)],
        d.rectangle((18, 92, 106, 99), fill=brown, outline=dark),
    ))
    save_prop_cell(sheet, 6, lambda d: (
        d.rectangle((22, 52, 104, 86), fill=(126, 74, 47), outline=dark),
        d.polygon((22, 52, 104, 52, 95, 32, 31, 32), fill=red, outline=dark),
        d.rectangle((36, 59, 92, 72), fill=teal, outline=dark),
        d.line((38, 72, 88, 72), fill=(219, 174, 83), width=3),
    ))
    save_prop_cell(sheet, 7, lambda d: (
        [d.ellipse((24 + i * 18, 68 - (i % 2) * 8, 52 + i * 18, 98 - (i % 2) * 8), fill=(173, 116, 51), outline=dark) for i in range(4)],
        [d.rectangle((30 + i * 18, 49, 44 + i * 18, 66), fill=random.choice([red, teal, (216, 168, 66)]), outline=dark) for i in range(4)],
    ))
    save_prop_cell(sheet, 8, lambda d: (
        d.rectangle((25, 68, 58, 96), fill=(126, 88, 52), outline=dark),
        d.rectangle((63, 62, 101, 90), fill=(144, 95, 56), outline=dark),
        d.rectangle((34, 50, 87, 66), fill=teal, outline=dark),
        d.line((36, 55, 84, 55), fill=(217, 177, 91), width=2),
    ))
    save_prop_cell(sheet, 9, lambda d: (
        [d.line((20, y, 108, y), fill=brown, width=3) for y in (45, 65, 84)],
        [d.line((x, 34, x, 101), fill=brown, width=4) for x in (28, 64, 100)],
        [d.ellipse((x, 48, x + 11, 59), fill=(89, 128, 64), outline=dark) for x in range(34, 90, 13)],
    ))
    save_prop_cell(sheet, 10, lambda d: (
        d.rectangle((58, 39, 66, 101), fill=brown, outline=dark),
        d.ellipse((30, 18, 94, 72), fill=(69, 130, 64), outline=dark),
        [d.ellipse((42 + i * 10, 54 + (i % 2) * 8, 49 + i * 10, 62 + (i % 2) * 8), fill=red, outline=dark) for i in range(5)],
    ))
    save_prop_cell(sheet, 11, lambda d: (
        d.rectangle((60, 28, 66, 106), fill=brown, outline=dark),
        d.polygon((66, 34, 104, 44, 66, 56), fill=red, outline=dark),
        d.polygon((66, 58, 96, 66, 66, 76), fill=(218, 169, 68), outline=dark),
    ))
    save_prop_cell(sheet, 12, lambda d: (
        d.polygon((48, 35, 80, 35, 88, 90, 40, 90), fill=(124, 115, 96), outline=dark),
        d.ellipse((57, 49, 71, 63), outline=(210, 190, 130), width=3),
    ))
    save_prop_cell(sheet, 13, lambda d: (
        d.rectangle((61, 30, 67, 104), fill=brown, outline=dark),
        d.rectangle((48, 38, 80, 58), fill=(184, 137, 55), outline=dark),
        d.ellipse((52, 42, 76, 66), fill=(225, 181, 90), outline=dark),
    ))
    save_prop_cell(sheet, 14, lambda d: (
        d.polygon((22, 82, 64, 28, 106, 82), fill=(207, 169, 101), outline=dark),
        d.rectangle((28, 82, 100, 99), fill=(121, 73, 45), outline=dark),
        d.line((41, 63, 88, 63), fill=teal, width=4),
    ))
    save_prop_cell(sheet, 15, lambda d: (
        d.rectangle((56, 65, 72, 98), fill=brown, outline=dark),
        d.ellipse((36, 30, 92, 86), outline=(185, 151, 76), width=5),
        d.line((64, 30, 64, 86), fill=(185, 151, 76), width=3),
        d.line((39, 57, 89, 57), fill=(185, 151, 76), width=3),
    ))

    SOURCE_DIR.mkdir(parents=True, exist_ok=True)
    sheet.save(SOURCE_DIR / "western_props_4x4_v01.png")


def main() -> None:
    make_tiles()
    make_props()
    print(f"western procedural source sheets written under {SOURCE_DIR}")


if __name__ == "__main__":
    main()
