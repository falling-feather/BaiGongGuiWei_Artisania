from __future__ import annotations

import json
from collections import deque
from dataclasses import dataclass
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
DATE_STAMP = "2026-06-14"
ART_ROOT = ROOT / "public" / "assets" / "art_sources" / "priority_art" / DATE_STAMP
SOURCE_PATH = ART_ROOT / "01_generated_sources" / "activity_visuals" / "main_axis_activity_visuals_v01_chroma.png"
CUTOUT_DIR = ART_ROOT / "02_cutouts" / "activity_visuals"
MANIFEST_DIR = ART_ROOT / "05_manifests"
RUNTIME_ROOT = ROOT / "public" / "assets" / "game" / "activities"
DOC_OUT = ROOT / "doc" / "当前优先设计" / "27_美术组主轴活动视觉包记录.md"


@dataclass(frozen=True)
class ActivityVisualSpec:
    region_id: str
    activity_id: str
    activity_name: str
    slot: str
    slot_name: str
    source_index: int


VISUALS: tuple[ActivityVisualSpec, ...] = (
    ActivityVisualSpec("jiangnan", "jn-qinhuai-lantern", "秦淮灯市", "stall", "活动摊位", 0),
    ActivityVisualSpec("jiangnan", "jn-qinhuai-lantern", "秦淮灯市", "goods", "货样与账册", 1),
    ActivityVisualSpec("jiangnan", "jn-qinhuai-lantern", "秦淮灯市", "closing", "收束选择", 2),
    ActivityVisualSpec("bashu", "bs-tea-horse-post", "茶马驿", "stall", "活动摊位", 3),
    ActivityVisualSpec("bashu", "bs-tea-horse-post", "茶马驿", "goods", "货样与账册", 4),
    ActivityVisualSpec("bashu", "bs-tea-horse-post", "茶马驿", "closing", "收束选择", 5),
    ActivityVisualSpec("lingnan", "ln-qilou-night-market", "骑楼夜市", "stall", "活动摊位", 6),
    ActivityVisualSpec("lingnan", "ln-qilou-night-market", "骑楼夜市", "goods", "货样与账册", 7),
    ActivityVisualSpec("lingnan", "ln-qilou-night-market", "骑楼夜市", "closing", "收束选择", 8),
    ActivityVisualSpec("ganpo", "gp-kiln-opening-fair", "瓷镇开窑会", "stall", "活动摊位", 9),
    ActivityVisualSpec("ganpo", "gp-kiln-opening-fair", "瓷镇开窑会", "goods", "货样与账册", 10),
    ActivityVisualSpec("ganpo", "gp-kiln-opening-fair", "瓷镇开窑会", "closing", "收束选择", 11),
    ActivityVisualSpec("xiyu", "xiyu-bazaar-trade", "绿洲巴扎", "stall", "活动摊位", 12),
    ActivityVisualSpec("xiyu", "xiyu-bazaar-trade", "绿洲巴扎", "goods", "货样与账册", 13),
    ActivityVisualSpec("xiyu", "xiyu-bazaar-trade", "绿洲巴扎", "closing", "收束选择", 14),
)


REGION_NAMES = {
    "jiangnan": "江南",
    "bashu": "巴蜀",
    "lingnan": "岭南",
    "ganpo": "赣鄱",
    "xiyu": "西域",
}


def grid_crop(img: Image.Image, cols: int, rows: int, index: int, inset: int = 8) -> Image.Image:
    col = index % cols
    row = index // cols
    x0 = round(col * img.width / cols) + inset
    y0 = round(row * img.height / rows) + inset
    x1 = round((col + 1) * img.width / cols) - inset
    y1 = round((row + 1) * img.height / rows) - inset
    if row == 2:
        y1 -= 34
    elif row == 3:
        y0 -= 34
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
        elif g > 130 and r < 130 and b < 135 and g > r * 1.25 and g > b * 1.18:
            alpha = max(0, min(a, int((max(r, b) / max(1, g)) * 210)))
            out.append((r, g, b, alpha))
        else:
            out.append((r, g, b, a))
    rgba.putdata(out)
    return rgba


def is_border_green_pixel(r: int, g: int, b: int, a: int) -> bool:
    return a > 0 and g > 55 and r < 95 and b < 100 and g > max(r, b) + 38


def remove_border_green(img: Image.Image) -> Image.Image:
    rgba = img.convert("RGBA")
    width, height = rgba.size
    pixels = rgba.load()
    queue: deque[tuple[int, int]] = deque()
    seen: set[tuple[int, int]] = set()

    for x in range(width):
        queue.append((x, 0))
        queue.append((x, height - 1))
    for y in range(height):
        queue.append((0, y))
        queue.append((width - 1, y))

    while queue:
        x, y = queue.popleft()
        if x < 0 or y < 0 or x >= width or y >= height or (x, y) in seen:
            continue
        seen.add((x, y))
        r, g, b, a = pixels[x, y]
        if not is_border_green_pixel(r, g, b, a):
            continue
        pixels[x, y] = (0, 0, 0, 0)
        queue.append((x + 1, y))
        queue.append((x - 1, y))
        queue.append((x, y + 1))
        queue.append((x, y - 1))

    return rgba


def remove_low_alpha_noise(img: Image.Image, threshold: int = 14) -> Image.Image:
    rgba = img.convert("RGBA")
    clean: list[tuple[int, int, int, int]] = []
    for r, g, b, a in rgba.getdata():
        if a < threshold:
            clean.append((0, 0, 0, 0))
        elif is_key_green(r, g, b):
            clean.append((0, 0, 0, 0))
        elif a < 180 and g > 70 and b < 45 and g > r * 1.12 and g > b * 1.45:
            clean.append((0, 0, 0, 0))
        elif a < 90 and is_border_green_pixel(r, g, b, a):
            clean.append((0, 0, 0, 0))
        else:
            clean.append((r, g, b, a))
    rgba.putdata(clean)
    return rgba


def remove_edge_fragments(img: Image.Image, min_component_area: int = 220, edge_margin: int = 18) -> Image.Image:
    rgba = img.convert("RGBA")
    width, height = rgba.size
    pixels = rgba.load()
    seen: set[tuple[int, int]] = set()

    for y in range(height):
        for x in range(width):
            if (x, y) in seen or pixels[x, y][3] == 0:
                continue
            queue: deque[tuple[int, int]] = deque([(x, y)])
            seen.add((x, y))
            points: list[tuple[int, int]] = []
            while queue:
                px, py = queue.popleft()
                points.append((px, py))
                for nx in range(px - 1, px + 2):
                    for ny in range(py - 1, py + 2):
                        if 0 <= nx < width and 0 <= ny < height and (nx, ny) not in seen and pixels[nx, ny][3] > 0:
                            seen.add((nx, ny))
                            queue.append((nx, ny))
            if len(points) >= min_component_area:
                continue
            min_x = min(point[0] for point in points)
            max_x = max(point[0] for point in points)
            min_y = min(point[1] for point in points)
            max_y = max(point[1] for point in points)
            touches_edge_band = (
                min_x < edge_margin
                or max_x >= width - edge_margin
                or min_y < edge_margin
                or max_y >= height - edge_margin
            )
            if touches_edge_band:
                for px, py in points:
                    pixels[px, py] = (0, 0, 0, 0)

    return rgba


def fit_to_canvas(img: Image.Image, size: tuple[int, int]) -> Image.Image:
    rgba = remove_border_green(remove_low_alpha_noise(img))
    bbox = rgba.getchannel("A").getbbox()
    canvas = Image.new("RGBA", size)
    if bbox is None:
        return canvas
    crop = rgba.crop(bbox)
    scale = min((size[0] - 8) / crop.width, (size[1] - 8) / crop.height)
    resized = crop.resize((max(1, round(crop.width * scale)), max(1, round(crop.height * scale))), Image.Resampling.LANCZOS)
    x = (size[0] - resized.width) // 2
    y = (size[1] - resized.height) // 2
    canvas.alpha_composite(resized, (x, y))
    return remove_edge_fragments(remove_border_green(remove_low_alpha_noise(canvas)))


def save_preview(entries: list[dict[str, object]], reserved_path: Path) -> None:
    preview = Image.new("RGBA", (880, 680), (31, 29, 25, 255))
    images = [ROOT / str(entry["runtimePath"]) for entry in entries] + [reserved_path]
    for index, path in enumerate(images):
        image = Image.open(path).convert("RGBA")
        x = 16 + (index % 4) * 216
        y = 16 + (index // 4) * 164
        preview.alpha_composite(image, (x, y))
    MANIFEST_DIR.mkdir(parents=True, exist_ok=True)
    preview.save(MANIFEST_DIR / "main_axis_activity_visuals_preview.png")


def write_manifest(entries: list[dict[str, object]], reserved_path: Path) -> None:
    MANIFEST_DIR.mkdir(parents=True, exist_ok=True)
    payload = {
        "date": DATE_STAMP,
        "node": "A4 主轴五区活动视觉第一包",
        "pipeline": "image_gen activity sheet -> chroma key -> 192x144 transparent activity PNG",
        "source": str(SOURCE_PATH.relative_to(ROOT)).replace("\\", "/"),
        "reservedCutout": str(reserved_path.relative_to(ROOT)).replace("\\", "/"),
        "entries": entries,
    }
    (MANIFEST_DIR / "priority_activity_visual_manifest.json").write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def write_doc(entries: list[dict[str, object]], reserved_path: Path) -> None:
    rows = [
        f"| {entry['regionName']} `{entry['regionId']}` | `{entry['activityId']}` | {entry['activityName']} | {entry['slotName']} | `{entry['assetKey']}` | `{entry['runtimePath']}` |"
        for entry in entries
    ]
    lines = [
        "# 美术组主轴五区活动视觉包记录",
        "",
        f"更新日期：{DATE_STAMP}",
        "",
        "## 节点",
        "",
        "- 对应《美术极速协作指引》：A4 UI 与活动视觉补齐。",
        "- 本节点补主轴五区活动的摊位、货样/账册与收束选择视觉，优先服务活动弹窗、街景入口和后续活动插画升级。",
        "- 主体图像由 `image_gen` 生成；脚本只做抠绿、切片、尺寸归一、manifest 和 QA 预览。",
        "",
        "## 源文件",
        "",
        f"- 源表：`{SOURCE_PATH.relative_to(ROOT).as_posix()}`",
        f"- 切片目录：`{CUTOUT_DIR.relative_to(ROOT).as_posix()}`",
        f"- 预留切片：`{reserved_path.relative_to(ROOT).as_posix()}`",
        f"- QA 预览：`{(MANIFEST_DIR / 'main_axis_activity_visuals_preview.png').relative_to(ROOT).as_posix()}`",
        f"- Manifest：`{(MANIFEST_DIR / 'priority_activity_visual_manifest.json').relative_to(ROOT).as_posix()}`",
        "",
        "## 资源清单",
        "",
        "| 地区 | activityId | 活动 | 槽位 | 美术 key | 运行文件 |",
        "|---|---|---|---|---|---|",
        *rows,
        "",
        "## 剩余缺口",
        "",
        "- 本包已覆盖五区活动的第一轮运行视觉，但尚未进入长篇活动插画和过场图。",
        "- 活动 UI 图标、订单图标、地区节点图标仍需按 A4 后续子包补齐。",
        "- 如后续程序只读取 `activity.{activityId}.stall`，`goods.png` 和 `closing.png` 先作为美术资料与活动弹窗升级储备。",
    ]
    DOC_OUT.write_text("\n".join(lines) + "\n", encoding="utf-8")


def validate(entries: list[dict[str, object]]) -> None:
    for entry in entries:
        path = ROOT / str(entry["runtimePath"])
        if not path.exists():
            raise RuntimeError(f"Missing activity visual: {path}")
        img = Image.open(path).convert("RGBA")
        if img.size != (192, 144):
            raise RuntimeError(f"Unexpected activity visual size {img.size}: {path}")
        if img.getchannel("A").getbbox() is None:
            raise RuntimeError(f"Empty alpha activity visual: {path}")


def main() -> None:
    source = Image.open(SOURCE_PATH).convert("RGB")
    CUTOUT_DIR.mkdir(parents=True, exist_ok=True)
    entries: list[dict[str, object]] = []

    for spec in VISUALS:
        keyed = chroma_key_green(grid_crop(source, 4, 4, spec.source_index, inset=10))
        visual = fit_to_canvas(keyed, (192, 144))
        cutout_path = CUTOUT_DIR / f"{spec.activity_id}_{spec.slot}.png"
        runtime_dir = RUNTIME_ROOT / spec.activity_id
        runtime_dir.mkdir(parents=True, exist_ok=True)
        runtime_path = runtime_dir / f"{spec.slot}.png"
        visual.save(cutout_path)
        visual.save(runtime_path)
        entries.append(
            {
                "regionId": spec.region_id,
                "regionName": REGION_NAMES[spec.region_id],
                "activityId": spec.activity_id,
                "activityName": spec.activity_name,
                "slot": spec.slot,
                "slotName": spec.slot_name,
                "assetKey": f"activity.{spec.activity_id}.{spec.slot}",
                "runtimePath": str(runtime_path.relative_to(ROOT)).replace("\\", "/"),
                "sourceCutout": str(cutout_path.relative_to(ROOT)).replace("\\", "/"),
                "asset": f"/assets/game/activities/{spec.activity_id}/{spec.slot}.png",
            }
        )

    reserved = fit_to_canvas(chroma_key_green(grid_crop(source, 4, 4, 15, inset=10)), (192, 144))
    reserved_path = CUTOUT_DIR / "reserved_generic_activity_notice.png"
    reserved.save(reserved_path)

    validate(entries)
    write_manifest(entries, reserved_path)
    save_preview(entries, reserved_path)
    write_doc(entries, reserved_path)
    print(f"priority activity visuals sliced: {len(entries)}")


if __name__ == "__main__":
    main()
