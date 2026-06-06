from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "public" / "assets" / "art_sources" / "generated_review" / "2026-06-02"
GAME_DIR = ROOT / "public" / "assets" / "game"
CHARACTER_FRAME = 48


BUILDINGS: list[tuple[str, tuple[int, int]]] = [
    ("shop_indigo.png", (96, 88)),
    ("shop_bamboo.png", (96, 88)),
    ("craft_house.png", (96, 88)),
    ("craft_indigo.png", (96, 88)),
    ("craft_bamboo.png", (96, 88)),
    ("craft_ceramic.png", (96, 88)),
    ("craft_metal.png", (96, 88)),
    ("craft_textile.png", (96, 88)),
    ("craft_paper.png", (96, 88)),
    ("craft_lacquer.png", (96, 88)),
    ("industry_harvest.png", (96, 88)),
    ("industry_refine.png", (96, 88)),
    ("industry_product.png", (96, 88)),
    ("industry_field.png", (96, 88)),
    ("industry_mine.png", (96, 88)),
    ("industry_kiln.png", (96, 88)),
    ("industry_forge.png", (96, 88)),
    ("industry_loom.png", (96, 88)),
    ("industry_market.png", (96, 88)),
    ("gate.png", (96, 88)),
]

PROPS: list[tuple[str, tuple[int, int], str]] = [
    ("willow.png", (96, 96), "props"),
    ("arch_bridge.png", (128, 80), "props"),
    ("tea_stall.png", (96, 72), "props"),
    ("lantern_post.png", (32, 64), "props"),
    ("banner.png", (48, 72), "props"),
    ("notice_board.png", (72, 64), "props"),
    ("dock.png", (96, 64), "props"),
    ("boat.png", (128, 72), "props"),
    ("fence.png", (32, 32), "tiles"),
    ("rock.png", (32, 32), "tiles"),
    ("market_crates.png", (96, 80), "props"),
    ("paper_umbrella.png", (80, 96), "props"),
]

TILES: list[tuple[str, int]] = [
    ("ground.png", 0),
    ("ground_moss.png", 1),
    ("ground_stone.png", 2),
    ("ground_soil.png", 3),
    ("road.png", 4),
    ("road_vertical.png", 5),
    ("road_cross.png", 6),
    ("water.png", 8),
    ("water_edge_left.png", 9),
    ("water_edge_right.png", 10),
    ("bridge.png", 11),
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
    return g > 135 and r < 105 and b < 105 and g > r * 1.55 and g > b * 1.55


def chroma_key_green(img: Image.Image) -> Image.Image:
    rgba = img.convert("RGBA")
    keyed = []
    for r, g, b, a in rgba.getdata():
        if is_green_pixel(r, g, b):
            keyed.append((r, g, b, 0))
        elif g > 110 and r < 130 and b < 130 and g > r * 1.25 and g > b * 1.25:
            alpha = max(0, min(255, int((max(r, b) / max(1, g)) * 255)))
            keyed.append((r, g, b, alpha))
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
    return canvas


def padded_crop(img: Image.Image, box: tuple[int, int, int, int], pad: int = 8) -> Image.Image:
    x0, y0, x1, y1 = box
    return img.crop((max(0, x0 - pad), max(0, y0 - pad), min(img.width, x1 + pad), min(img.height, y1 + pad)))


def connected_character_boxes(img: Image.Image) -> list[tuple[int, int, int, int]]:
    rgb = img.convert("RGB")
    width, height = rgb.size
    pix = rgb.load()
    seen = bytearray(width * height)
    boxes: list[tuple[int, int, int, int, int]] = []

    for y in range(height):
        for x in range(width):
            idx = y * width + x
            if seen[idx]:
                continue
            seen[idx] = 1
            if is_green_pixel(*pix[x, y]):
                continue

            stack = [(x, y)]
            min_x = max_x = x
            min_y = max_y = y
            count = 0

            while stack:
                cx, cy = stack.pop()
                count += 1
                min_x = min(min_x, cx)
                max_x = max(max_x, cx)
                min_y = min(min_y, cy)
                max_y = max(max_y, cy)

                for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                    if nx < 0 or ny < 0 or nx >= width or ny >= height:
                        continue
                    nidx = ny * width + nx
                    if seen[nidx]:
                        continue
                    seen[nidx] = 1
                    if not is_green_pixel(*pix[nx, ny]):
                        stack.append((nx, ny))

            box_w = max_x - min_x + 1
            box_h = max_y - min_y + 1
            if count > 200 and box_w > 18 and box_h > 25:
                boxes.append((min_x, min_y, max_x + 1, max_y + 1, count))

    return [(x0, y0, x1, y1) for x0, y0, x1, y1, _ in boxes]


def group_character_rows(boxes: list[tuple[int, int, int, int]]) -> list[list[tuple[int, int, int, int]]]:
    rows: list[list[tuple[int, int, int, int]]] = []

    def center_y(box: tuple[int, int, int, int]) -> float:
        return (box[1] + box[3]) / 2

    for box in sorted(boxes, key=center_y):
        if not rows:
            rows.append([box])
            continue
        current_center = sum(center_y(item) for item in rows[-1]) / len(rows[-1])
        if abs(center_y(box) - current_center) > 90:
            rows.append([box])
        else:
            rows[-1].append(box)

    for row in rows:
        row.sort(key=lambda box: box[0])
    return rows


def save_buildings() -> None:
    source = Image.open(SOURCE_DIR / "review_buildings_qingming_5x4_v01.png").convert("RGB")
    out = GAME_DIR / "buildings"
    out.mkdir(parents=True, exist_ok=True)
    for index, (filename, size) in enumerate(BUILDINGS):
        cell = chroma_key_green(grid_crop(source, 5, 4, index, inset=2))
        fit_to_canvas(cell, size).save(out / filename)


def save_tiles() -> None:
    source = Image.open(SOURCE_DIR / "review_tiles_terrain_4x4_v01.png").convert("RGB")
    out = GAME_DIR / "tiles"
    out.mkdir(parents=True, exist_ok=True)
    for filename, index in TILES:
        cell = grid_crop(source, 4, 4, index, inset=8)
        tile = cell.resize((32, 32), Image.Resampling.LANCZOS).convert("RGBA")
        tile.save(out / filename)


def save_props() -> None:
    source = Image.open(SOURCE_DIR / "review_props_qingming_4x3_v01.png").convert("RGB")
    for index, (filename, size, folder) in enumerate(PROPS):
        out = GAME_DIR / folder
        out.mkdir(parents=True, exist_ok=True)
        cell = chroma_key_green(grid_crop(source, 4, 3, index, inset=2))
        fit_to_canvas(cell, size).save(out / filename)


def save_characters() -> None:
    source = Image.open(SOURCE_DIR / "review_characters_walk_3sets_v01.png").convert("RGB")
    out = GAME_DIR / "characters"
    out.mkdir(parents=True, exist_ok=True)

    rows = group_character_rows(connected_character_boxes(source))
    if len(rows) != 4:
        raise RuntimeError(f"Expected 4 character direction rows, found {len(rows)}")

    role_rows = {
        "player_walk.png": [row[:4] for row in rows],
        "npc_tourist_walk.png": [row[4:-3] for row in rows],
        "npc_vendor_walk.png": [row[-3:] for row in rows],
    }

    for filename, source_rows in role_rows.items():
        sheet = Image.new("RGBA", (CHARACTER_FRAME * 4, CHARACTER_FRAME * 4))
        for row, boxes in enumerate(source_rows):
            if len(boxes) < 3:
                raise RuntimeError(f"{filename} row {row} has too few frames: {len(boxes)}")
            frame_order = [0, 1, 2, 3] if len(boxes) >= 4 else [0, 1, 2, 1]
            for col in range(4):
                cell = chroma_key_green(padded_crop(source, boxes[frame_order[col]], pad=8))
                frame = fit_to_canvas(cell, (CHARACTER_FRAME, CHARACTER_FRAME), bottom_pad=2, resample=Image.Resampling.NEAREST)
                sheet.alpha_composite(frame, (col * CHARACTER_FRAME, row * CHARACTER_FRAME))
        sheet.save(out / filename)


def save_preview() -> None:
    preview = Image.new("RGBA", (640, 512), (32, 32, 32, 255))
    draw = ImageDraw.Draw(preview)
    paths = [
        GAME_DIR / "buildings" / "shop_indigo.png",
        GAME_DIR / "buildings" / "craft_metal.png",
        GAME_DIR / "buildings" / "industry_market.png",
        GAME_DIR / "props" / "willow.png",
        GAME_DIR / "props" / "arch_bridge.png",
        GAME_DIR / "props" / "market_crates.png",
        GAME_DIR / "characters" / "player_walk.png",
        GAME_DIR / "characters" / "npc_tourist_walk.png",
        GAME_DIR / "characters" / "npc_vendor_walk.png",
    ]
    x = 16
    y = 20
    for index, path in enumerate(paths):
        img = Image.open(path).convert("RGBA")
        if img.width > 160 or img.height > 120:
            scale = min(160 / img.width, 120 / img.height)
            img = img.resize((round(img.width * scale), round(img.height * scale)), Image.Resampling.NEAREST)
        preview.alpha_composite(img, (x, y))
        draw.text((x, y + img.height + 2), path.name, fill=(230, 220, 190, 255))
        x += 200
        if (index + 1) % 3 == 0:
            x = 16
            y += 160
    preview.save(SOURCE_DIR / "runtime_mount_preview.png")


def main() -> None:
    save_tiles()
    save_buildings()
    save_props()
    save_characters()
    save_preview()
    print("generated review art mounted into public/assets/game")


if __name__ == "__main__":
    main()
