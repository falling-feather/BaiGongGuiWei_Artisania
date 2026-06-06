from __future__ import annotations

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "public" / "assets" / "game" / "ui" / "menu_ui_atlas_chroma_v01.png"
OUT_DIR = ROOT / "public" / "assets" / "game" / "ui"


ASSETS = {
    "menu_title_plaque_v01.png": (72, 20, 1462, 300),
    "menu_input_frame_v01.png": (150, 320, 1376, 500),
    "menu_button_primary_v01.png": (66, 532, 535, 694),
    "menu_button_secondary_v01.png": (536, 532, 994, 694),
    "menu_button_ghost_v01.png": (998, 532, 1460, 694),
    "menu_save_slot_frame_v01.png": (100, 725, 1438, 1002),
}


def chroma_to_alpha(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    pixels = rgba.load()
    width, height = rgba.size
    key = (0, 255, 0)

    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            dist = ((r - key[0]) ** 2 + (g - key[1]) ** 2 + (b - key[2]) ** 2) ** 0.5
            green_dominance = g - max(r, b)

            if r < 78 and b < 78 and g > 168 and green_dominance > 104:
                pixels[x, y] = (r, g, b, 0)
            elif r < 130 and b < 130 and g > 90 and green_dominance > 22:
                key_strength = min(0.95, green_dominance / 180)
                alpha = int(min(a, 255 * (1 - key_strength * 0.88)))
                g = int(max(r, b) + min(10, green_dominance * 0.08))
                pixels[x, y] = (r, g, b, alpha)
            elif g > 86 and green_dominance > 30:
                alpha = int(max(0, min(255, (dist - 18) / 82 * 255)))
                if alpha < 255:
                    # Despill antialiased edges by pulling the key color out of partially transparent pixels.
                    spill = (255 - alpha) / 255
                    g = int(g * (1 - 0.78 * spill) + max(r, b) * 0.78 * spill)
                    pixels[x, y] = (r, g, b, min(a, alpha))
                else:
                    despill = min(0.7, (green_dominance - 30) / 180)
                    g = int(g * (1 - despill) + max(r, b) * despill)
                    pixels[x, y] = (r, g, b, a)

    return rgba


def trim_alpha(image: Image.Image, pad: int = 6) -> Image.Image:
    alpha = image.getchannel("A")
    bbox = alpha.getbbox()
    if bbox is None:
        return image
    left, top, right, bottom = bbox
    left = max(0, left - pad)
    top = max(0, top - pad)
    right = min(image.width, right + pad)
    bottom = min(image.height, bottom + pad)
    return image.crop((left, top, right, bottom))


def main() -> None:
    source = Image.open(SOURCE)
    transparent = chroma_to_alpha(source)
    transparent.save(OUT_DIR / "menu_ui_atlas_transparent_v01.png")

    for name, box in ASSETS.items():
        asset = transparent.crop(box)
        trim_alpha(asset).save(OUT_DIR / name)


if __name__ == "__main__":
    main()
