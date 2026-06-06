from __future__ import annotations

import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "public" / "assets" / "game" / "ui"
FONT_DIR = Path("C:/Windows/Fonts")


def rgba(hex_color: str, alpha: int = 255) -> tuple[int, int, int, int]:
    hex_color = hex_color.lstrip("#")
    return (
        int(hex_color[0:2], 16),
        int(hex_color[2:4], 16),
        int(hex_color[4:6], 16),
        alpha,
    )


def font(name: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(FONT_DIR / name), size)


def paper_texture(size: tuple[int, int], base: str, seed: int, strength: int = 8) -> Image.Image:
    width, height = size
    rng = random.Random(seed)
    base_r, base_g, base_b, _ = rgba(base)
    image = Image.new("RGBA", size)
    pixels = image.load()

    for y in range(height):
        band = int(math.sin(y / 23) * 2)
        for x in range(width):
            n = rng.randint(-strength, strength) + band + rng.randint(-3, 3)
            pixels[x, y] = (
                max(0, min(255, base_r + n)),
                max(0, min(255, base_g + n)),
                max(0, min(255, base_b + n)),
                255,
            )

    draw = ImageDraw.Draw(image, "RGBA")
    for _ in range(max(14, width // 22)):
        y = rng.randrange(height)
        x0 = rng.randrange(-40, width)
        length = rng.randrange(width // 5, width // 2)
        color = (255, 255, 255, rng.randrange(8, 18))
        draw.line((x0, y, x0 + length, y + rng.randrange(-2, 3)), fill=color, width=1)
    for _ in range(max(5, width // 70)):
        x = rng.randrange(width)
        y0 = rng.randrange(height)
        color = (88, 61, 35, rng.randrange(5, 12))
        draw.line((x, y0, x + rng.randrange(-18, 18), y0 + rng.randrange(-18, 18)), fill=color, width=1)

    return image.filter(ImageFilter.GaussianBlur(0.25))


def alpha_mask(size: tuple[int, int], radius: int) -> Image.Image:
    mask = Image.new("L", size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size[0] - 1, size[1] - 1), radius=radius, fill=255)
    return mask


def paste_masked(target: Image.Image, source: Image.Image, xy: tuple[int, int], mask: Image.Image) -> None:
    layer = Image.new("RGBA", target.size, (0, 0, 0, 0))
    layer.paste(source, xy, mask)
    target.alpha_composite(layer)


def draw_bamboo(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], seed: int) -> None:
    rng = random.Random(seed)
    x0, y0, x1, y1 = box
    draw.rounded_rectangle(box, radius=max(7, (x1 - x0) // 3), fill=rgba("#7c5528"), outline=rgba("#d6a75a"))
    draw.rounded_rectangle((x0 + 3, y0 + 4, x1 - 3, y1 - 4), radius=max(5, (x1 - x0) // 4), fill=rgba("#9a6c32", 230))
    for y in range(y0 + 9, y1, 16):
        draw.line((x0 + 4, y, x1 - 4, y + rng.choice([-1, 0, 1])), fill=rgba("#4d3118", 110), width=2)
    draw.line((x0 + 5, y0 + 5, x1 - 7, y0 + 2), fill=rgba("#f0cc78", 120), width=2)
    draw.line((x0 + 5, y1 - 5, x1 - 7, y1 - 3), fill=rgba("#3b2412", 120), width=2)


def draw_scroll(
    size: tuple[int, int],
    name: str,
    paper: str,
    border: str,
    seed: int,
    roller: int = 34,
    radius: int = 22,
    cinnabar: bool = False,
    darken: float = 0.0,
) -> None:
    width, height = size
    image = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(image, "RGBA")
    rng = random.Random(seed)

    shadow = Image.new("RGBA", size, (0, 0, 0, 0))
    sdraw = ImageDraw.Draw(shadow, "RGBA")
    sdraw.rounded_rectangle((roller // 2, 14, width - roller // 2, height - 10), radius=radius, fill=(0, 0, 0, 82))
    shadow = shadow.filter(ImageFilter.GaussianBlur(6))
    image.alpha_composite(shadow)

    left = roller
    right = width - roller
    top = 15
    bottom = height - 13
    mask = alpha_mask((right - left, bottom - top), radius)
    body = paper_texture((right - left, bottom - top), paper, seed)
    if darken:
        wash = Image.new("RGBA", body.size, (0, 0, 0, int(255 * darken)))
        body = Image.alpha_composite(body, wash)
    paste_masked(image, body, (left, top), mask)

    draw.rounded_rectangle((left, top, right, bottom), radius=radius, outline=rgba(border, 220), width=2)
    draw.rounded_rectangle((left + 10, top + 10, right - 10, bottom - 10), radius=max(4, radius - 10), outline=rgba("#3b2b19", 72), width=1)
    draw.line((left + 18, top + 8, right - 18, top + 6), fill=rgba("#fff2c0", 60), width=2)
    draw.line((left + 20, bottom - 8, right - 20, bottom - 6), fill=rgba("#43230f", 50), width=2)

    if cinnabar:
        for x in range(left + 12, right - 12, 12):
            if rng.random() < 0.45:
                draw.arc((x, bottom - 30, x + 28, bottom + 10), 188, 260, fill=rgba("#9d2f23", 70), width=2)
        draw.line((left + 10, top + 7, right - 10, top + 5), fill=rgba("#9d2f23", 82), width=2)

    draw_bamboo(draw, (5, 8, roller + 9, height - 7), seed + 4)
    draw_bamboo(draw, (width - roller - 9, 8, width - 5, height - 7), seed + 8)
    for x in (roller + 4, width - roller - 4):
        draw.line((x, top + 4, x, bottom - 4), fill=rgba("#3d2714", 140), width=2)

    image.save(OUT_DIR / name)


def draw_save_slot() -> None:
    draw_scroll(
        (920, 142),
        "menu_scroll_save_slot_v01.png",
        "#d2c39e",
        "#7a4c25",
        401,
        roller=30,
        radius=18,
        darken=0.18,
    )
    image = Image.open(OUT_DIR / "menu_scroll_save_slot_v01.png").convert("RGBA")
    draw = ImageDraw.Draw(image, "RGBA")
    draw.arc((70, 28, 210, 128), 194, 332, fill=rgba("#6f4b2a", 45), width=2)
    draw.arc((690, 18, 870, 132), 200, 342, fill=rgba("#5f3b1f", 42), width=2)
    draw.line((88, 41, 832, 41), fill=rgba("#f5dfad", 34), width=1)
    image.save(OUT_DIR / "menu_scroll_save_slot_v01.png")


def render_calligraphy() -> None:
    text = "百工归位"
    base_font = font("STXINGKA.TTF", 178)
    canvas = Image.new("RGBA", (820, 230), (0, 0, 0, 0))
    mask = Image.new("L", canvas.size, 0)
    draw = ImageDraw.Draw(mask)
    bbox = draw.textbbox((0, 0), text, font=base_font)
    x = (canvas.width - (bbox[2] - bbox[0])) // 2 - bbox[0]
    y = (canvas.height - (bbox[3] - bbox[1])) // 2 - bbox[1] - 2
    draw.text((x, y), text, font=base_font, fill=255)

    ink_shadow = Image.new("RGBA", canvas.size, rgba("#1a0f08", 0))
    ink_shadow.putalpha(mask.filter(ImageFilter.GaussianBlur(4)))
    ink_shadow = Image.eval(ink_shadow, lambda value: value)
    canvas.alpha_composite(Image.new("RGBA", canvas.size, (0, 0, 0, 0)))

    shadow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    shadow_draw.text((x + 5, y + 8), text, font=base_font, fill=rgba("#070403", 150))
    shadow = shadow.filter(ImageFilter.GaussianBlur(2))
    canvas.alpha_composite(shadow)

    stroke = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    stroke_draw = ImageDraw.Draw(stroke)
    for dx, dy in ((-2, 0), (2, 0), (0, -2), (0, 2), (-1, -1), (1, 1)):
        stroke_draw.text((x + dx, y + dy), text, font=base_font, fill=rgba("#2f1609", 190))
    canvas.alpha_composite(stroke)

    fill = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    fill_draw = ImageDraw.Draw(fill)
    fill_draw.text((x, y), text, font=base_font, fill=rgba("#f8efd7", 255))
    fill_draw.text((x + 2, y + 1), text, font=base_font, fill=rgba("#dab46b", 74))
    canvas.alpha_composite(fill)

    alpha = canvas.getchannel("A")
    bbox = alpha.getbbox()
    canvas.crop(bbox).save(OUT_DIR / "menu_title_calligraphy_v01.png")


def render_seal() -> None:
    image = Image.new("RGBA", (114, 150), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image, "RGBA")
    rng = random.Random(88)
    for y in range(10, 140):
        for x in range(12, 102):
            if rng.random() < 0.985:
                n = rng.randrange(-20, 20)
                image.putpixel((x, y), (145 + n, 33 + n // 3, 25 + n // 4, 235))
    draw.rectangle((16, 14, 98, 136), outline=rgba("#f1cda0", 180), width=3)
    draw.rectangle((24, 23, 90, 127), outline=rgba("#5f1610", 190), width=2)
    seal_font = font("STKAITI.TTF", 38)
    draw.text((39, 30), "百", font=seal_font, fill=rgba("#fff1dc", 230))
    draw.text((39, 78), "工", font=seal_font, fill=rgba("#fff1dc", 230))
    image = image.filter(ImageFilter.GaussianBlur(0.15))
    image.save(OUT_DIR / "menu_cinnabar_seal_v01.png")


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    render_calligraphy()
    render_seal()
    draw_scroll((900, 120), "menu_scroll_input_v01.png", "#d9ca9e", "#593818", 101, roller=34, radius=24)
    draw_scroll((430, 106), "menu_scroll_button_primary_v01.png", "#d9bf81", "#7d311d", 201, roller=28, radius=20, cinnabar=True)
    draw_scroll((430, 106), "menu_scroll_button_secondary_v01.png", "#c7c4b5", "#3f4d4c", 202, roller=28, radius=20, darken=0.06)
    draw_scroll((430, 106), "menu_scroll_button_ghost_v01.png", "#9d9075", "#45321d", 203, roller=28, radius=20, darken=0.34)
    draw_save_slot()


if __name__ == "__main__":
    main()
