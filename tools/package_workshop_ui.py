from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
DATE_STAMP = "2026-06-14"
ART_ROOT = ROOT / "public" / "assets" / "art_sources" / "priority_art" / DATE_STAMP
SOURCE = ART_ROOT / "01_generated_sources" / "workshop_ui" / "workshop_ui_atlas_v01_chroma.png"
CUTOUT_DIR = ART_ROOT / "02_cutouts" / "workshop_ui"
MANIFEST_DIR = ART_ROOT / "05_manifests"
RUNTIME_UI = ROOT / "public" / "assets" / "game" / "ui"


@dataclass(frozen=True)
class AtlasSpec:
    key: str
    runtime_file: str
    source_index: int
    role: str
    canvas: tuple[int, int] | None = None


SPECS = (
    AtlasSpec("region.jiangnan", "workshop_region_jiangnan.png", 0, "Jiangnan bamboo, water and pavilion craft page frame"),
    AtlasSpec("region.bashu", "workshop_region_bashu.png", 1, "Bashu tea room and bronze craft page frame"),
    AtlasSpec("region.lingnan", "workshop_region_lingnan.png", 2, "Lingnan arcade and harbor craft page frame"),
    AtlasSpec("region.ganpo", "workshop_region_ganpo.png", 3, "Ganpo porcelain and kiln craft page frame"),
    AtlasSpec("region.xiyu", "workshop_region_xiyu.png", 4, "Xiyu caravan textile craft page frame"),
    AtlasSpec("icon.rhythm", "workshop_icon_rhythm.png", 5, "Rhythm and endurance craft icon", (132, 132)),
    AtlasSpec("icon.trace", "workshop_icon_trace.png", 6, "Brush and trace craft icon", (132, 132)),
    AtlasSpec("icon.mix", "workshop_icon_mix.png", 7, "Mixing and recipe craft icon", (132, 132)),
    AtlasSpec("icon.timing", "workshop_icon_timing.png", 8, "Fire timing craft icon", (132, 132)),
    AtlasSpec("icon.place", "workshop_icon_place.png", 9, "Placement and appraisal craft icon", (132, 132)),
    AtlasSpec("icon.route", "workshop_icon_route.png", 10, "Route planning craft icon", (132, 132)),
    AtlasSpec("meter.timer", "workshop_timer_meter.png", 11, "Real-time cooldown and quality meter", (360, 76)),
)


def is_key_green(pixel: tuple[int, int, int, int]) -> bool:
    r, g, b, a = pixel
    return a == 0 or (g > 150 and r < 125 and b < 125 and g > max(r, b) + 65)


def chroma_key(img: Image.Image) -> Image.Image:
    rgba = img.convert("RGBA")
    pixels: list[tuple[int, int, int, int]] = []
    for pixel in rgba.getdata():
        r, g, b, a = pixel
        if is_key_green(pixel):
            pixels.append((r, g, b, 0))
        elif g > 120 and r < 150 and b < 150 and g > max(r, b) + 30:
            pixels.append((r, g, b, max(0, min(a, int(255 * max(r, b) / max(1, g))))))
        else:
            pixels.append((r, g, b, a))
    rgba.putdata(pixels)
    return rgba


def trim_alpha(img: Image.Image, pad: int = 4) -> Image.Image:
    rgba = img.convert("RGBA")
    bbox = rgba.getchannel("A").getbbox()
    if not bbox:
        return rgba
    x0, y0, x1, y1 = bbox
    return rgba.crop((
        max(0, x0 - pad),
        max(0, y0 - pad),
        min(rgba.width, x1 + pad),
        min(rgba.height, y1 + pad),
    ))


def grid_crop(img: Image.Image, index: int, inset: int = 6) -> Image.Image:
    cols = 4
    col = index % cols
    row = index // cols
    x0 = round(col * img.width / cols) + inset
    y0 = round(row * img.height / 3) + inset
    x1 = round((col + 1) * img.width / cols) - inset
    y1 = round((row + 1) * img.height / 3) - inset
    return img.crop((x0, y0, x1, y1))


def fit_to_canvas(img: Image.Image, size: tuple[int, int]) -> Image.Image:
    cutout = trim_alpha(chroma_key(img), pad=4)
    bbox = cutout.getchannel("A").getbbox()
    canvas = Image.new("RGBA", size, (0, 0, 0, 0))
    if not bbox:
        return canvas
    cutout = cutout.crop(bbox)
    scale = min(1.0, (size[0] - 8) / max(1, cutout.width), (size[1] - 8) / max(1, cutout.height))
    if scale < 1.0:
        cutout = cutout.resize(
            (max(1, round(cutout.width * scale)), max(1, round(cutout.height * scale))),
            Image.Resampling.LANCZOS,
        )
    canvas.alpha_composite(cutout, ((size[0] - cutout.width) // 2, (size[1] - cutout.height) // 2))
    return canvas


def save_assets() -> list[dict[str, object]]:
    source = Image.open(SOURCE).convert("RGBA")
    CUTOUT_DIR.mkdir(parents=True, exist_ok=True)
    RUNTIME_UI.mkdir(parents=True, exist_ok=True)
    entries: list[dict[str, object]] = []
    for spec in SPECS:
        raw = grid_crop(source, spec.source_index)
        cutout = fit_to_canvas(raw, spec.canvas) if spec.canvas else trim_alpha(chroma_key(raw), pad=4)
        cutout_path = CUTOUT_DIR / spec.runtime_file
        runtime_path = RUNTIME_UI / spec.runtime_file
        cutout.save(cutout_path)
        cutout.save(runtime_path)
        entries.append({
            "key": f"ui.workshop.{spec.key}",
            "role": spec.role,
            "asset": f"/assets/game/ui/{spec.runtime_file}",
            "runtimePath": runtime_path.relative_to(ROOT).as_posix(),
            "sourceCutout": cutout_path.relative_to(ROOT).as_posix(),
            "sourceIndex": spec.source_index,
            "size": list(cutout.size),
        })
    return entries


def validate(entries: list[dict[str, object]]) -> None:
    for entry in entries:
        img = Image.open(ROOT / str(entry["runtimePath"])).convert("RGBA")
        if img.getchannel("A").getbbox() is None:
            raise RuntimeError(f"empty cutout: {entry['runtimePath']}")


def write_manifest(entries: list[dict[str, object]]) -> None:
    MANIFEST_DIR.mkdir(parents=True, exist_ok=True)
    payload = {
        "date": DATE_STAMP,
        "node": "A6 workshop/activity real-time UI kit",
        "pipeline": "image_gen atlas -> chroma key -> grid slicing -> runtime PNG",
        "source": SOURCE.relative_to(ROOT).as_posix(),
        "entries": entries,
    }
    (MANIFEST_DIR / "workshop_ui_manifest.json").write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def write_preview(entries: list[dict[str, object]]) -> None:
    preview = Image.new("RGBA", (1260, 840), (28, 24, 18, 255))
    draw = ImageDraw.Draw(preview)
    draw.text((24, 18), "Workshop and activity UI kit", fill=(232, 218, 190, 255))
    for index, entry in enumerate(entries):
        img = Image.open(ROOT / str(entry["runtimePath"])).convert("RGBA")
        max_w = 270 if index < 5 else 156
        max_h = 164 if index < 5 else 124
        scale = min(1.0, max_w / max(1, img.width), max_h / max(1, img.height))
        show = img.resize(
            (max(1, round(img.width * scale)), max(1, round(img.height * scale))),
            Image.Resampling.LANCZOS,
        )
        if index < 5:
            x = 24 + (index % 3) * 400
            y = 56 + (index // 3) * 220
        else:
            sub = index - 5
            x = 24 + (sub % 4) * 300
            y = 510 + (sub // 4) * 150
        preview.alpha_composite(show, (x, y))
        draw.text((x, y + max_h + 10), str(entry["key"]).replace("ui.workshop.", ""), fill=(205, 190, 160, 255))
    preview.save(MANIFEST_DIR / "workshop_ui_preview.png")


def main() -> None:
    if not SOURCE.exists():
        raise FileNotFoundError(SOURCE)
    entries = save_assets()
    validate(entries)
    write_manifest(entries)
    write_preview(entries)
    print(f"packaged {len(entries)} workshop ui assets")


if __name__ == "__main__":
    main()
