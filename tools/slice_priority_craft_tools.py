from __future__ import annotations

import json
from collections import deque
from dataclasses import dataclass
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
DATE_STAMP = "2026-06-14"
ART_ROOT = ROOT / "public" / "assets" / "art_sources" / "priority_art" / DATE_STAMP
SOURCE_PATH = ART_ROOT / "01_generated_sources" / "craft_tools" / "main_axis_craft_tools_defects_v01_chroma.png"
CUTOUT_DIR = ART_ROOT / "02_cutouts" / "craft_tools"
MANIFEST_DIR = ART_ROOT / "05_manifests"
RUNTIME_ROOT = ROOT / "public" / "assets" / "game" / "crafts"
DOC_OUT = ROOT / "doc" / "当前优先设计" / "25_美术组主轴工艺工具缺陷包记录.md"


@dataclass(frozen=True)
class CraftTileSpec:
    region_id: str
    craft_id: str
    craft_name: str
    slot: str
    slot_name: str
    source_index: int


TILES: tuple[CraftTileSpec, ...] = (
    CraftTileSpec("jiangnan", "longquan-sword", "龙泉剑", "tools", "工具与材料", 0),
    CraftTileSpec("jiangnan", "longquan-sword", "龙泉剑", "defects", "缺陷与返修", 1),
    CraftTileSpec("jiangnan", "celadon", "青瓷", "tools", "工具与材料", 2),
    CraftTileSpec("jiangnan", "celadon", "青瓷", "defects", "缺陷与返修", 3),
    CraftTileSpec("jiangnan", "oilpaper-umbrella", "油纸伞", "tools", "工具与材料", 4),
    CraftTileSpec("jiangnan", "oilpaper-umbrella", "油纸伞", "defects", "缺陷与返修", 5),
    CraftTileSpec("jiangnan", "kesi", "缂丝", "tools", "工具与材料", 6),
    CraftTileSpec("jiangnan", "kesi", "缂丝", "defects", "缺陷与返修", 7),
    CraftTileSpec("bashu", "shu-brocade", "蜀锦", "tools", "工具与材料", 8),
    CraftTileSpec("bashu", "shu-brocade", "蜀锦", "defects", "缺陷与返修", 9),
    CraftTileSpec("lingnan", "gambiered-silk", "香云纱", "tools", "工具与材料", 10),
    CraftTileSpec("lingnan", "gambiered-silk", "香云纱", "defects", "缺陷与返修", 11),
    CraftTileSpec("ganpo", "jingdezhen-porcelain", "景德镇瓷", "tools", "工具与材料", 12),
    CraftTileSpec("ganpo", "jingdezhen-porcelain", "景德镇瓷", "defects", "缺陷与返修", 13),
    CraftTileSpec("xiyu", "jade-carving", "玉雕", "tools", "工具与材料", 14),
    CraftTileSpec("xiyu", "jade-carving", "玉雕", "defects", "缺陷与返修", 15),
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
    return img.crop((x0, y0, x1, y1))


def is_green_pixel(r: int, g: int, b: int) -> bool:
    return (
        g > 150
        and r < 105
        and b < 120
        and g > r * 1.55
        and g > b * 1.4
    ) or (g > 85 and r < 55 and b < 55 and g > max(r, b) + 60)


def chroma_key_green(img: Image.Image) -> Image.Image:
    rgba = img.convert("RGBA")
    out: list[tuple[int, int, int, int]] = []
    for r, g, b, a in rgba.getdata():
        if is_green_pixel(r, g, b):
            out.append((r, g, b, 0))
        elif g > 135 and r < 115 and b < 125 and g > r * 1.35 and g > b * 1.25:
            alpha = max(0, min(a, int((max(r, b) / max(1, g)) * 220)))
            out.append((r, g, b, alpha))
        else:
            out.append((r, g, b, a))
    rgba.putdata(out)
    return rgba


def is_border_green_pixel(r: int, g: int, b: int, a: int) -> bool:
    return a > 0 and g > 55 and g > r * 1.08 and g > b * 1.08


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
        pixels[x, y] = (r, g, b, 0)
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
            clean.append((r, g, b, 0))
        elif g > 85 and r < 55 and b < 55 and g > max(r, b) + 60:
            clean.append((r, g, b, 0))
        elif a < 90 and g > r * 1.12 and g > b * 1.1:
            clean.append((r, g, b, 0))
        else:
            clean.append((r, g, b, a))
    rgba.putdata(clean)
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
    canvas.alpha_composite(resized, ((size[0] - resized.width) // 2, (size[1] - resized.height) // 2))
    return remove_border_green(remove_low_alpha_noise(canvas))


def save_preview(entries: list[dict[str, object]]) -> None:
    preview = Image.new("RGBA", (640, 640), (31, 29, 25, 255))
    for index, entry in enumerate(entries):
        image = Image.open(ROOT / str(entry["runtimePath"])).convert("RGBA")
        x = 16 + (index % 4) * 156
        y = 16 + (index // 4) * 156
        preview.alpha_composite(image, (x, y))
    MANIFEST_DIR.mkdir(parents=True, exist_ok=True)
    preview.save(MANIFEST_DIR / "main_axis_craft_tools_preview.png")


def write_manifest(entries: list[dict[str, object]]) -> None:
    MANIFEST_DIR.mkdir(parents=True, exist_ok=True)
    payload = {
        "date": DATE_STAMP,
        "node": "A3 主轴工艺工具与缺陷第一包",
        "pipeline": "image_gen craft sheet -> chroma key -> 128x128 transparent craft PNG",
        "source": str(SOURCE_PATH.relative_to(ROOT)).replace("\\", "/"),
        "entries": entries,
    }
    (MANIFEST_DIR / "priority_craft_tools_manifest.json").write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def write_doc(entries: list[dict[str, object]]) -> None:
    rows = [
        f"| {entry['regionName']} `{entry['regionId']}` | `{entry['craftId']}` | {entry['craftName']} | {entry['slotName']} | `{entry['assetKey']}` | `{entry['runtimePath']}` |"
        for entry in entries
    ]
    lines = [
        "# 美术组主轴工艺工具缺陷包记录",
        "",
        f"更新日期：{DATE_STAMP}",
        "",
        "## 节点",
        "",
        "- 对应《美术极速协作指引》：A3 NPC 与工艺补齐。",
        "- 本节点补主轴五区冻结工艺的工具、材料、失败缺陷与返修状态，优先服务工艺 UI、活动说明和后续小游戏替换。",
        "- 主体图像由 `image_gen` 生成；脚本只做抠绿、切片、尺寸归一、manifest 和 QA 预览。",
        "",
        "## 源文件",
        "",
        f"- 源表：`{SOURCE_PATH.relative_to(ROOT).as_posix()}`",
        f"- 切片目录：`{CUTOUT_DIR.relative_to(ROOT).as_posix()}`",
        f"- QA 预览：`{(MANIFEST_DIR / 'main_axis_craft_tools_preview.png').relative_to(ROOT).as_posix()}`",
        f"- Manifest：`{(MANIFEST_DIR / 'priority_craft_tools_manifest.json').relative_to(ROOT).as_posix()}`",
        "",
        "## 资源清单",
        "",
        "| 地区 | craftId | 工艺 | 槽位 | 美术 key | 运行文件 |",
        "|---|---|---|---|---|---|",
        *rows,
        "",
        "## 剩余缺口",
        "",
        "- 主轴五区每个地区仍需正式 `craft_tools.png` 汇总大图，供地区包总览使用。",
        "- 本包先补 8 门冻结工艺；骨架六区工艺工具与缺陷未进入本包。",
        "- 工艺动作小游戏素材需要后续在本包基础上拆更细动作帧。",
    ]
    DOC_OUT.write_text("\n".join(lines) + "\n", encoding="utf-8")


def validate(entries: list[dict[str, object]]) -> None:
    for entry in entries:
        path = ROOT / str(entry["runtimePath"])
        if not path.exists():
            raise RuntimeError(f"Missing craft asset: {path}")
        img = Image.open(path).convert("RGBA")
        if img.size != (128, 128):
            raise RuntimeError(f"Unexpected craft asset size {img.size}: {path}")
        if img.getchannel("A").getbbox() is None:
            raise RuntimeError(f"Empty alpha craft asset: {path}")


def main() -> None:
    source = Image.open(SOURCE_PATH).convert("RGB")
    CUTOUT_DIR.mkdir(parents=True, exist_ok=True)
    entries: list[dict[str, object]] = []

    for spec in TILES:
        keyed = chroma_key_green(grid_crop(source, 4, 4, spec.source_index, inset=10))
        tile = fit_to_canvas(keyed, (128, 128))
        cutout_path = CUTOUT_DIR / f"{spec.craft_id}_{spec.slot}.png"
        runtime_dir = RUNTIME_ROOT / spec.craft_id
        runtime_dir.mkdir(parents=True, exist_ok=True)
        runtime_path = runtime_dir / f"{spec.slot}.png"
        tile.save(cutout_path)
        tile.save(runtime_path)
        entries.append(
            {
                "regionId": spec.region_id,
                "regionName": REGION_NAMES[spec.region_id],
                "craftId": spec.craft_id,
                "craftName": spec.craft_name,
                "slot": spec.slot,
                "slotName": spec.slot_name,
                "assetKey": f"craft.{spec.craft_id}.{spec.slot}",
                "runtimePath": str(runtime_path.relative_to(ROOT)).replace("\\", "/"),
                "sourceCutout": str(cutout_path.relative_to(ROOT)).replace("\\", "/"),
                "asset": f"/assets/game/crafts/{spec.craft_id}/{spec.slot}.png",
            }
        )

    validate(entries)
    write_manifest(entries)
    save_preview(entries)
    write_doc(entries)
    print(f"priority craft tools sliced: {len(entries)}")


if __name__ == "__main__":
    main()
