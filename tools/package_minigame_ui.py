from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
DATE_STAMP = "2026-06-14"
ART_ROOT = ROOT / "public" / "assets" / "art_sources" / "priority_art" / DATE_STAMP
SOURCE = ART_ROOT / "01_generated_sources" / "minigame_ui" / "minigame_ui_atlas_v01_chroma.png"
CUTOUT_DIR = ART_ROOT / "02_cutouts" / "minigame_ui"
MANIFEST_DIR = ART_ROOT / "05_manifests"
RUNTIME_UI = ROOT / "public" / "assets" / "game" / "ui"
DOC_OUT = ROOT / "doc" / "当前优先设计" / "31_美术组交互小游戏UI资源包记录.md"
SUMMARY_OUT = ROOT / "doc" / "美术组资源推进汇总.md"


@dataclass(frozen=True)
class AtlasSpec:
    key: str
    runtime_file: str
    source_index: int
    role: str
    canvas: tuple[int, int] | None = None


SPECS = (
    AtlasSpec("region.jiangnan", "minigame_region_jiangnan.png", 0, "Jiangnan water, bamboo and pavilion frame"),
    AtlasSpec("region.bashu", "minigame_region_bashu.png", 1, "Bashu tea house, brocade curtain and bronze frame"),
    AtlasSpec("region.lingnan", "minigame_region_lingnan.png", 2, "Lingnan arcade, harbor green and carved stone frame"),
    AtlasSpec("region.ganpo", "minigame_region_ganpo.png", 3, "Ganpo porcelain and kiln chimney frame"),
    AtlasSpec("region.xiyu", "minigame_region_xiyu.png", 4, "Xiyu caravan textile and desert frame"),
    AtlasSpec("icon.rhythm", "minigame_icon_rhythm.png", 5, "Rhythm tapping and endurance actions", (128, 128)),
    AtlasSpec("icon.trace", "minigame_icon_trace.png", 6, "Brush tracing, calligraphy and line-follow actions", (128, 128)),
    AtlasSpec("icon.mix", "minigame_icon_mix.png", 7, "Ratio mixing and recipe balance actions", (128, 128)),
    AtlasSpec("icon.timing", "minigame_icon_timing.png", 8, "Fire timing and heat-hold actions", (128, 128)),
    AtlasSpec("icon.place", "minigame_icon_place.png", 9, "Precise placement and appraisal actions", (128, 128)),
    AtlasSpec("icon.route", "minigame_icon_route.png", 10, "Route planning and journey actions", (128, 128)),
    AtlasSpec("meter.quality", "minigame_quality_meter.png", 11, "Quality and completion meter frame", (360, 74)),
)


def is_key_green(pixel: tuple[int, int, int, int]) -> bool:
    r, g, b, a = pixel
    if a == 0:
        return True
    return (
        g > 150
        and r < 120
        and b < 120
        and g > max(r, b) + 70
    )


def chroma_key(img: Image.Image) -> Image.Image:
    rgba = img.convert("RGBA")
    out: list[tuple[int, int, int, int]] = []
    for pixel in rgba.getdata():
        r, g, b, a = pixel
        if is_key_green(pixel):
            out.append((r, g, b, 0))
        elif g > 120 and r < 150 and b < 150 and g > max(r, b) + 30:
            alpha = max(0, min(a, int(255 * max(r, b) / max(1, g))))
            out.append((r, g, b, alpha))
        else:
            out.append((r, g, b, a))
    rgba.putdata(out)
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


def connected_components(mask: list[list[bool]]) -> list[tuple[int, int, int, int, int]]:
    h = len(mask)
    w = len(mask[0]) if h else 0
    seen = [[False] * w for _ in range(h)]
    components: list[tuple[int, int, int, int, int]] = []
    for y in range(h):
        for x in range(w):
            if seen[y][x] or not mask[y][x]:
                continue
            stack = [(x, y)]
            seen[y][x] = True
            min_x = max_x = x
            min_y = max_y = y
            area = 0
            while stack:
                cx, cy = stack.pop()
                area += 1
                min_x = min(min_x, cx)
                max_x = max(max_x, cx)
                min_y = min(min_y, cy)
                max_y = max(max_y, cy)
                for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                    if nx < 0 or ny < 0 or nx >= w or ny >= h:
                        continue
                    if seen[ny][nx] or not mask[ny][nx]:
                        continue
                    seen[ny][nx] = True
                    stack.append((nx, ny))
            components.append((min_x, min_y, max_x + 1, max_y + 1, area))
    return components


def remove_small_alpha_components(img: Image.Image, min_ratio: float = 0.03) -> Image.Image:
    rgba = img.convert("RGBA")
    alpha = rgba.getchannel("A")
    mask = [
        [alpha.getpixel((x, y)) > 20 for x in range(rgba.width)]
        for y in range(rgba.height)
    ]
    components = connected_components(mask)
    if not components:
        return rgba
    largest = max(item[4] for item in components)
    keep = Image.new("L", rgba.size, 0)
    keep_pixels = keep.load()
    alpha_pixels = alpha.load()
    for x0, y0, x1, y1, area in components:
        if area < largest * min_ratio:
            continue
        for y in range(y0, y1):
            for x in range(x0, x1):
                if alpha_pixels[x, y] > 20:
                    keep_pixels[x, y] = alpha_pixels[x, y]
    out = Image.new("RGBA", rgba.size, (0, 0, 0, 0))
    out.alpha_composite(rgba)
    out.putalpha(keep)
    return out


def grid_crop(img: Image.Image, index: int, inset: int = 6) -> Image.Image:
    cols = 4
    rows = 3
    col = index % cols
    row = index // cols
    x0 = round(col * img.width / cols) + inset
    y0 = round(row * img.height / rows) + inset
    x1 = round((col + 1) * img.width / cols) - inset
    y1 = round((row + 1) * img.height / rows) - inset
    return img.crop((x0, y0, x1, y1))


def fit_to_canvas(img: Image.Image, size: tuple[int, int]) -> Image.Image:
    crop = trim_alpha(remove_small_alpha_components(chroma_key(img)), pad=4)
    bbox = crop.getchannel("A").getbbox()
    canvas = Image.new("RGBA", size, (0, 0, 0, 0))
    if not bbox:
        return canvas
    crop = crop.crop(bbox)
    max_w = size[0] - 8
    max_h = size[1] - 8
    scale = min(1.0, max_w / max(1, crop.width), max_h / max(1, crop.height))
    if scale < 1.0:
        crop = crop.resize(
            (max(1, round(crop.width * scale)), max(1, round(crop.height * scale))),
            Image.Resampling.LANCZOS,
        )
    x = (size[0] - crop.width) // 2
    y = (size[1] - crop.height) // 2
    canvas.alpha_composite(crop, (x, y))
    return canvas


def save_assets() -> list[dict[str, object]]:
    source = Image.open(SOURCE).convert("RGBA")
    CUTOUT_DIR.mkdir(parents=True, exist_ok=True)
    RUNTIME_UI.mkdir(parents=True, exist_ok=True)
    entries: list[dict[str, object]] = []
    for spec in SPECS:
        raw = grid_crop(source, spec.source_index)
        cutout = (
            fit_to_canvas(raw, spec.canvas)
            if spec.canvas
            else trim_alpha(remove_small_alpha_components(chroma_key(raw), min_ratio=0.006), pad=4)
        )
        cutout_path = CUTOUT_DIR / spec.runtime_file
        runtime_path = RUNTIME_UI / spec.runtime_file
        cutout.save(cutout_path)
        cutout.save(runtime_path)
        entries.append(
            {
                "key": f"ui.minigame.{spec.key}",
                "role": spec.role,
                "asset": f"/assets/game/ui/{spec.runtime_file}",
                "runtimePath": runtime_path.relative_to(ROOT).as_posix(),
                "sourceCutout": cutout_path.relative_to(ROOT).as_posix(),
                "sourceIndex": spec.source_index,
                "size": list(cutout.size),
            }
        )
    return entries


def validate(entries: list[dict[str, object]]) -> None:
    for entry in entries:
        path = ROOT / str(entry["runtimePath"])
        img = Image.open(path).convert("RGBA")
        if img.getchannel("A").getbbox() is None:
            raise RuntimeError(f"Empty alpha image: {path}")


def write_manifest(entries: list[dict[str, object]]) -> None:
    MANIFEST_DIR.mkdir(parents=True, exist_ok=True)
    payload = {
        "date": DATE_STAMP,
        "node": "A5 regional interaction mini-game UI kit",
        "pipeline": "image_gen atlas -> chroma key -> grid slicing -> runtime PNG",
        "source": SOURCE.relative_to(ROOT).as_posix(),
        "entries": entries,
    }
    (MANIFEST_DIR / "minigame_ui_manifest.json").write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def write_preview(entries: list[dict[str, object]]) -> None:
    MANIFEST_DIR.mkdir(parents=True, exist_ok=True)
    preview = Image.new("RGBA", (1260, 840), (30, 28, 24, 255))
    draw = ImageDraw.Draw(preview)
    draw.text((24, 18), "Regional interaction mini-game UI kit", fill=(232, 218, 190, 255))
    for index, entry in enumerate(entries):
        img = Image.open(ROOT / str(entry["runtimePath"])).convert("RGBA")
        max_w = 260 if index < 5 else 150
        max_h = 160 if index < 5 else 118
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
        draw.text((x, y + max_h + 10), str(entry["key"]).replace("ui.minigame.", ""), fill=(205, 190, 160, 255))
    preview.save(MANIFEST_DIR / "minigame_ui_preview.png")


def write_doc(entries: list[dict[str, object]]) -> None:
    region_rows = [
        entry for entry in entries if str(entry["key"]).startswith("ui.minigame.region.")
    ]
    icon_rows = [
        entry for entry in entries if not str(entry["key"]).startswith("ui.minigame.region.")
    ]
    lines = [
        "# 美术组交互小游戏 UI 资源包记录",
        "",
        f"更新日期：{DATE_STAMP}",
        "",
        "## 节点说明",
        "",
        "- 对应当前极速推进任务：具体交互小游戏需要独立美术资源和 UI 组件，并保持各地区风格统一。",
        "- 本批资源由内置 `image_gen` 生成像素风图集；脚本仅负责抠绿、切片、透明 PNG 导出、运行时落盘和 QA 预览。",
        "- 资源覆盖：五个主轴地区主题框、六类小游戏玩法图标、一个完成度/品质条框。",
        "",
        "## 源文件与产物",
        "",
        f"- 源图：`{SOURCE.relative_to(ROOT).as_posix()}`",
        f"- 切图目录：`{CUTOUT_DIR.relative_to(ROOT).as_posix()}`",
        f"- 运行时目录：`{RUNTIME_UI.relative_to(ROOT).as_posix()}`",
        f"- Manifest：`{(MANIFEST_DIR / 'minigame_ui_manifest.json').relative_to(ROOT).as_posix()}`",
        f"- QA 预览：`{(MANIFEST_DIR / 'minigame_ui_preview.png').relative_to(ROOT).as_posix()}`",
        "",
        "## 地区主题框",
        "",
        "| key | 用途 | 运行时文件 | 尺寸 |",
        "|---|---|---|---|",
        *[
            f"| `{entry['key']}` | {entry['role']} | `{entry['runtimePath']}` | {entry['size'][0]}x{entry['size'][1]} |"
            for entry in region_rows
        ],
        "",
        "## 玩法图标与量表",
        "",
        "| key | 用途 | 运行时文件 | 尺寸 |",
        "|---|---|---|---|",
        *[
            f"| `{entry['key']}` | {entry['role']} | `{entry['runtimePath']}` | {entry['size'][0]}x{entry['size'][1]} |"
            for entry in icon_rows
        ],
        "",
        "## 接入规则",
        "",
        "- `jiangnan / bashu / lingnan / ganpo / xiyu` 使用本区专属主题框。",
        "- 骨架扩展区暂按视觉亲缘继承：`huizhou` 继承江南，`qiandian / jingchu` 继承巴蜀/岭南，`jingji` 继承赣鄱瓷艺框，`sanjin / xueyu` 继承西域框。",
        "- 活动小游戏弹窗、统一工坊面板与通用工艺兜底弹窗已经读取同一套主题映射；后续新增玩法只需补图标映射，不需要重写弹窗结构。",
    ]
    DOC_OUT.write_text("\n".join(lines) + "\n", encoding="utf-8")


def write_summary_note() -> None:
    start = "<!-- minigame-ui-summary-start -->"
    end = "<!-- minigame-ui-summary-end -->"
    block = "\n".join(
        [
            "",
            start,
            "## 当前优先版交互小游戏 UI",
            "",
            "- 记录文档：`doc/当前优先设计/31_美术组交互小游戏UI资源包记录.md`",
            "- 生成脚本：`python tools/package_minigame_ui.py`",
            "- Manifest：`public/assets/art_sources/priority_art/2026-06-14/05_manifests/minigame_ui_manifest.json`",
            "- QA 预览：`public/assets/art_sources/priority_art/2026-06-14/05_manifests/minigame_ui_preview.png`",
            "- 覆盖内容：五个主轴地区主题框、六类交互小游戏玩法图标、一个完成度/品质条框，共 12 个运行时 UI PNG。",
            "- 运行接入：活动小游戏弹窗、统一工坊面板与通用工艺兜底弹窗共用 `src/components/minigameUiTheme.ts`，按地区继承统一风格，并通过 `?activity=` / `?craft=` DEV 参数快速直达 QA。",
            end,
            "",
        ]
    )
    text = SUMMARY_OUT.read_text(encoding="utf-8")
    start_pos = text.find(start)
    end_pos = text.find(end)
    if start_pos >= 0 and end_pos > start_pos:
        text = text[:start_pos].rstrip() + block + text[end_pos + len(end):].lstrip()
    else:
        text = text.rstrip() + "\n" + block
    SUMMARY_OUT.write_text(text, encoding="utf-8")


def main() -> None:
    entries = save_assets()
    validate(entries)
    write_manifest(entries)
    write_preview(entries)
    write_doc(entries)
    write_summary_note()
    print(f"packaged mini-game UI assets: {len(entries)}")


if __name__ == "__main__":
    main()
