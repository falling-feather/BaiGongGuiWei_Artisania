from __future__ import annotations

import json
from collections import deque
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
DATE_STAMP = "2026-06-14"
MANIFEST_DIR = ROOT / "public" / "assets" / "art_sources" / "priority_art" / DATE_STAMP / "05_manifests"

TARGET_DIRS = (
    ROOT / "public" / "assets" / "game" / "buildings" / "art_team" / "all_regions",
    ROOT / "public" / "assets" / "game" / "props" / "art_team" / "all_regions",
)


def is_green_fringe(r: int, g: int, b: int, a: int) -> bool:
    return a > 0 and g > 155 and r < 80 and b < 95 and g > max(r, b) + 88


def remove_green_fringe(img: Image.Image) -> Image.Image:
    rgba = img.convert("RGBA")
    pixels = []
    for r, g, b, a in rgba.getdata():
        if is_green_fringe(r, g, b, a):
            pixels.append((r, g, b, 0))
        else:
            pixels.append((r, g, b, a))
    rgba.putdata(pixels)
    return rgba


def connected_components(mask: list[list[bool]]) -> list[tuple[int, int, int, int, int]]:
    h = len(mask)
    w = len(mask[0]) if h else 0
    seen = [[False] * w for _ in range(h)]
    comps: list[tuple[int, int, int, int, int]] = []
    for y in range(h):
        for x in range(w):
            if seen[y][x] or not mask[y][x]:
                continue
            queue: deque[tuple[int, int]] = deque([(x, y)])
            seen[y][x] = True
            x0 = x1 = x
            y0 = y1 = y
            area = 0
            while queue:
                cx, cy = queue.popleft()
                area += 1
                x0 = min(x0, cx)
                x1 = max(x1, cx)
                y0 = min(y0, cy)
                y1 = max(y1, cy)
                for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                    if nx < 0 or ny < 0 or nx >= w or ny >= h or seen[ny][nx] or not mask[ny][nx]:
                        continue
                    seen[ny][nx] = True
                    queue.append((nx, ny))
            comps.append((x0, y0, x1 + 1, y1 + 1, area))
    return comps


def clean_edge_fragments(img: Image.Image) -> tuple[Image.Image, list[dict[str, object]]]:
    rgba = remove_green_fringe(img)
    alpha = rgba.getchannel("A")
    mask = [[alpha.getpixel((x, y)) > 16 for x in range(rgba.width)] for y in range(rgba.height)]
    comps = connected_components(mask)
    if not comps:
        return rgba, []
    largest = max(comps, key=lambda item: item[4])
    largest_area = largest[4]
    remove: list[tuple[int, int, int, int, int]] = []
    for comp in comps:
        if comp == largest:
            continue
        x0, y0, x1, _y1, area = comp
        touches_cut_edge = x0 <= 1 or x1 >= rgba.width - 1 or y0 <= 1
        if touches_cut_edge and area < largest_area * 0.28:
            remove.append(comp)

    if not remove:
        return rgba, []

    out = rgba.copy()
    pix = out.load()
    for x0, y0, x1, y1, _area in remove:
        for y in range(y0, y1):
            for x in range(x0, x1):
                if alpha.getpixel((x, y)) > 16:
                    pix[x, y] = (*pix[x, y][:3], 0)
    report = [
        {"bbox": [x0, y0, x1, y1], "area": area}
        for x0, y0, x1, y1, area in remove
    ]
    return out, report


def save_preview(changes: list[dict[str, object]]) -> None:
    if not changes:
        return
    cell_w, cell_h = 220, 132
    rows = min(8, len(changes))
    preview = Image.new("RGBA", (cell_w * 2, cell_h * rows), (30, 28, 24, 255))
    draw = ImageDraw.Draw(preview)
    for row, change in enumerate(changes[:rows]):
        before = Image.open(ROOT / str(change["path"])).convert("RGBA")
        after = Image.open(ROOT / str(change["path"])).convert("RGBA")
        before_path = MANIFEST_DIR / "edge_artifact_before" / Path(str(change["path"])).name
        if before_path.exists():
            before = Image.open(before_path).convert("RGBA")
        for col, img in enumerate((before, after)):
            scale = min(1.0, 150 / img.width, 98 / img.height)
            show = img.resize((round(img.width * scale), round(img.height * scale)), Image.Resampling.NEAREST)
            x = col * cell_w + (cell_w - show.width) // 2
            y = row * cell_h + 8
            preview.alpha_composite(show, (x, y))
        draw.text((8, row * cell_h + 108), Path(str(change["path"])).name[:34], fill=(220, 205, 178, 255))
    preview.save(MANIFEST_DIR / "art_team_edge_cleanup_preview.png")


def main() -> None:
    MANIFEST_DIR.mkdir(parents=True, exist_ok=True)
    before_dir = MANIFEST_DIR / "edge_artifact_before"
    before_dir.mkdir(parents=True, exist_ok=True)
    changes: list[dict[str, object]] = []

    for directory in TARGET_DIRS:
        for path in sorted(directory.glob("*.png")):
            original = Image.open(path).convert("RGBA")
            cleaned, removed = clean_edge_fragments(original)
            fringe_changed = ImageChops.difference(original, remove_green_fringe(original)).getbbox() is not None
            changed = removed or ImageChops.difference(original, cleaned).getbbox() is not None or fringe_changed
            if not changed:
                continue
            before_path = before_dir / path.name
            original.save(before_path)
            cleaned.save(path)
            changes.append(
                {
                    "path": path.relative_to(ROOT).as_posix(),
                    "before": before_path.relative_to(ROOT).as_posix(),
                    "removedFragments": removed,
                    "note": "Removed edge-attached small fragments and green chroma fringe only.",
                }
            )

    payload = {
        "date": DATE_STAMP,
        "node": "A5 art-team building/prop edge cleanup",
        "targets": [path.relative_to(ROOT).as_posix() for path in TARGET_DIRS],
        "changedCount": len(changes),
        "changes": changes,
    }
    (MANIFEST_DIR / "art_team_edge_cleanup_manifest.json").write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    save_preview(changes)
    print(f"edge cleanup changed: {len(changes)}")


if __name__ == "__main__":
    main()
