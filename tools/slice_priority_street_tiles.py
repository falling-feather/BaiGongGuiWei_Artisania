from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
DATE_STAMP = "2026-06-14"
ART_ROOT = ROOT / "public" / "assets" / "art_sources" / "priority_art" / DATE_STAMP
SOURCE_PATH = ART_ROOT / "01_generated_sources" / "street_tiles" / "main_axis_street_tiles_v01_chroma.png"
CUTOUT_DIR = ART_ROOT / "02_cutouts" / "street_tiles"
MANIFEST_DIR = ART_ROOT / "05_manifests"
RUNTIME_ROOT = ROOT / "public" / "assets" / "game" / "regions"
DOC_OUT = ROOT / "doc" / "当前优先设计" / "28_美术组主轴五区街景瓦片包记录.md"

TILE_SIZE = (160, 120)
SHEET_SIZE = (TILE_SIZE[0] * 4, TILE_SIZE[1])


@dataclass(frozen=True)
class RegionSpec:
    region_id: str
    region_name: str
    row: int
    themes: tuple[str, str, str, str]


REGIONS: tuple[RegionSpec, ...] = (
    RegionSpec("jiangnan", "江南", 0, ("水市石板主路", "运河水岸", "工坊门槛", "灯市入口")),
    RegionSpec("bashu", "巴蜀", 1, ("竹海山路", "竹溪边缘", "织锦工坊门槛", "茶马驿入口")),
    RegionSpec("lingnan", "岭南", 2, ("骑楼雨街", "港口水岸", "晒莨染整场", "夜市入口")),
    RegionSpec("ganpo", "赣鄱", 3, ("窑镇陶土路", "河运水岸", "瓷窑工坊门槛", "开窑会入口")),
    RegionSpec("xiyu", "西域", 4, ("绿洲巴扎路", "绿洲水岸", "玉作坊门槛", "商队入口")),
)

SLOTS = ("mainPath", "terrainEdge", "workshopEntrance", "activityGate")
SLOT_NAMES = ("主路", "地貌/水岸边缘", "工坊入口", "活动/通道入口")


def grid_crop(img: Image.Image, cols: int, rows: int, col: int, row: int, inset: int = 16) -> Image.Image:
    x0 = round(col * img.width / cols) + inset
    y0 = round(row * img.height / rows) + inset
    x1 = round((col + 1) * img.width / cols) - inset
    y1 = round((row + 1) * img.height / rows) - inset
    if row == 2:
        y1 -= 26
    elif row == 3:
        y1 -= 58
    return img.crop((x0, y0, x1, y1))


def is_key_green(r: int, g: int, b: int) -> bool:
    return (
        g > 145
        and r < 115
        and b < 120
        and g > r * 1.45
        and g > b * 1.35
    ) or (g > 85 and r < 55 and b < 55 and g > max(r, b) + 60)


def chroma_key_green(img: Image.Image) -> Image.Image:
    rgba = img.convert("RGBA")
    out: list[tuple[int, int, int, int]] = []
    for r, g, b, a in rgba.getdata():
        if is_key_green(r, g, b):
            out.append((0, 0, 0, 0))
        else:
            out.append((r, g, b, a))
    rgba.putdata(out)
    return rgba


def trim_alpha(img: Image.Image, padding: int = 0) -> Image.Image:
    rgba = img.convert("RGBA")
    bbox = rgba.getchannel("A").getbbox()
    if bbox is None:
        return rgba
    left = max(0, bbox[0] - padding)
    top = max(0, bbox[1] - padding)
    right = min(rgba.width, bbox[2] + padding)
    bottom = min(rgba.height, bbox[3] + padding)
    return rgba.crop((left, top, right, bottom))


def fit_tile(img: Image.Image, size: tuple[int, int] = TILE_SIZE) -> Image.Image:
    trimmed = trim_alpha(chroma_key_green(img), padding=2)
    canvas = Image.new("RGBA", size, (0, 0, 0, 0))
    if trimmed.getchannel("A").getbbox() is None:
        return canvas
    scale = max(size[0] / trimmed.width, size[1] / trimmed.height)
    resized = trimmed.resize(
        (max(1, round(trimmed.width * scale)), max(1, round(trimmed.height * scale))),
        Image.Resampling.LANCZOS,
    )
    left = max(0, (resized.width - size[0]) // 2)
    top = max(0, (resized.height - size[1]) // 2)
    cropped = resized.crop((left, top, left + size[0], top + size[1]))
    canvas.alpha_composite(cropped, (0, 0))
    return make_opaque(canvas)


def make_opaque(img: Image.Image) -> Image.Image:
    rgba = img.convert("RGBA")
    width, height = rgba.size
    pixels = rgba.load()

    for _ in range(width + height):
        pending: list[tuple[int, int, tuple[int, int, int]]] = []
        transparent = 0
        for y in range(height):
            for x in range(width):
                r, g, b, a = pixels[x, y]
                if a >= 255:
                    continue
                if a > 0:
                    pixels[x, y] = (r, g, b, 255)
                    continue
                transparent += 1
                samples: list[tuple[int, int, int]] = []
                for nx in range(max(0, x - 1), min(width, x + 2)):
                    for ny in range(max(0, y - 1), min(height, y + 2)):
                        nr, ng, nb, na = pixels[nx, ny]
                        if na > 0:
                            samples.append((nr, ng, nb))
                if samples:
                    count = len(samples)
                    pending.append(
                        (
                            x,
                            y,
                            (
                                round(sum(sample[0] for sample in samples) / count),
                                round(sum(sample[1] for sample in samples) / count),
                                round(sum(sample[2] for sample in samples) / count),
                            ),
                        )
                    )
        for x, y, (r, g, b) in pending:
            pixels[x, y] = (r, g, b, 255)
        if transparent == 0 or not pending:
            break

    return rgba.convert("RGB")


def write_manifest(entries: list[dict[str, object]]) -> None:
    MANIFEST_DIR.mkdir(parents=True, exist_ok=True)
    payload = {
        "date": DATE_STAMP,
        "node": "A1 主轴五区街景瓦片第一包",
        "pipeline": "image_gen street tile sheet -> chroma key gutter cleanup -> 4 tile strip per region",
        "source": str(SOURCE_PATH.relative_to(ROOT)).replace("\\", "/"),
        "tileSize": list(TILE_SIZE),
        "entries": entries,
    }
    (MANIFEST_DIR / "priority_street_tiles_manifest.json").write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def save_preview(entries: list[dict[str, object]]) -> None:
    preview = Image.new("RGBA", (700, 700), (31, 29, 25, 255))
    for index, entry in enumerate(entries):
        sheet = Image.open(ROOT / str(entry["runtimePath"])).convert("RGBA")
        y = 24 + index * 132
        preview.alpha_composite(sheet, (30, y))
    MANIFEST_DIR.mkdir(parents=True, exist_ok=True)
    preview.save(MANIFEST_DIR / "main_axis_street_tiles_preview.png")


def write_doc(entries: list[dict[str, object]]) -> None:
    rows = [
        f"| {entry['regionName']} `{entry['regionId']}` | `{entry['assetKey']}` | `{entry['runtimePath']}` | {', '.join(entry['slotNames'])} |"
        for entry in entries
    ]
    lines = [
        "# 美术组主轴五区街景瓦片包记录",
        "",
        f"更新日期：{DATE_STAMP}",
        "",
        "## 节点",
        "",
        "- 对应《美术极速协作指引》：A1 主轴五区正式包。",
        "- 本节点补主轴五区 `street_tiles.png` 第一包，每区包含主路、地貌/水岸边缘、工坊入口、活动/通道入口四类街景瓦片。",
        "- 主体图像由 `image_gen` 生成；脚本只做绿幕格线清理、切片、拼条、manifest 和 QA 预览。",
        "",
        "## 源文件",
        "",
        f"- 源表：`{SOURCE_PATH.relative_to(ROOT).as_posix()}`",
        f"- 切片目录：`{CUTOUT_DIR.relative_to(ROOT).as_posix()}`",
        f"- QA 预览：`{(MANIFEST_DIR / 'main_axis_street_tiles_preview.png').relative_to(ROOT).as_posix()}`",
        f"- Manifest：`{(MANIFEST_DIR / 'priority_street_tiles_manifest.json').relative_to(ROOT).as_posix()}`",
        "",
        "## 资源清单",
        "",
        "| 地区 | 美术 key | 运行文件 | 瓦片槽位 |",
        "|---|---|---|---|",
        *rows,
        "",
        "## 剩余缺口",
        "",
        "- 本包是首轮街景/入口瓦片，不等同于完整自动铺地图块规则集；后续仍需转成更细的可拼接 terrain atlas。",
        "- 主轴五区正式 `region_master.png`、`buildings.png`、`props_sheet.png`、`characters.png`、`portraits.png`、`craft_tools.png` 汇总图仍需按地区包继续补齐。",
        "- 骨架六区街景瓦片未进入本包，按 A2 识别包后续处理。",
    ]
    DOC_OUT.write_text("\n".join(lines) + "\n", encoding="utf-8")


def validate(entries: list[dict[str, object]]) -> None:
    for entry in entries:
        path = ROOT / str(entry["runtimePath"])
        if not path.exists():
            raise RuntimeError(f"Missing street tile sheet: {path}")
        img = Image.open(path).convert("RGBA")
        if img.size != SHEET_SIZE:
            raise RuntimeError(f"Unexpected street tile sheet size {img.size}: {path}")
        if img.getchannel("A").getbbox() is None:
            raise RuntimeError(f"Empty street tile sheet: {path}")


def main() -> None:
    source = Image.open(SOURCE_PATH).convert("RGB")
    CUTOUT_DIR.mkdir(parents=True, exist_ok=True)
    entries: list[dict[str, object]] = []

    for region in REGIONS:
        sheet = Image.new("RGB", SHEET_SIZE, (0, 0, 0))
        cutouts: list[str] = []
        for col, slot in enumerate(SLOTS):
            tile = fit_tile(grid_crop(source, 4, 5, col, region.row, inset=18))
            cutout_path = CUTOUT_DIR / f"{region.region_id}_{slot}.png"
            tile.save(cutout_path)
            sheet.paste(tile, (col * TILE_SIZE[0], 0))
            cutouts.append(str(cutout_path.relative_to(ROOT)).replace("\\", "/"))

        runtime_dir = RUNTIME_ROOT / region.region_id
        runtime_dir.mkdir(parents=True, exist_ok=True)
        runtime_path = runtime_dir / "street_tiles.png"
        sheet.save(runtime_path)
        entries.append(
            {
                "regionId": region.region_id,
                "regionName": region.region_name,
                "assetKey": f"region.{region.region_id}.streetTiles",
                "runtimePath": str(runtime_path.relative_to(ROOT)).replace("\\", "/"),
                "sourceCutouts": cutouts,
                "slots": list(SLOTS),
                "slotNames": list(region.themes),
                "asset": f"/assets/game/regions/{region.region_id}/street_tiles.png",
            }
        )

    validate(entries)
    write_manifest(entries)
    save_preview(entries)
    write_doc(entries)
    print(f"priority street tiles sliced: {len(entries)} regions")


if __name__ == "__main__":
    main()
