from __future__ import annotations

import json
from collections import deque
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
DATE_STAMP = "2026-06-14"
ART_ROOT = ROOT / "public" / "assets" / "art_sources" / "priority_art" / DATE_STAMP
SOURCE_UI = ART_ROOT / "01_generated_sources" / "dialogue_ui" / "priority_dialogue_ui_atlas_v01_chroma.png"
SOURCE_BUSTS = ART_ROOT / "01_generated_sources" / "npc_busts" / "main_axis_npc_busts_v01_chroma.png"
CUTOUT_UI = ART_ROOT / "02_cutouts" / "dialogue_ui"
CUTOUT_BUSTS = ART_ROOT / "02_cutouts" / "npc_busts"
MANIFEST_DIR = ART_ROOT / "05_manifests"
RUNTIME_UI = ROOT / "public" / "assets" / "game" / "ui"
RUNTIME_CHARACTERS = ROOT / "public" / "assets" / "game" / "characters"
DOC_OUT = ROOT / "doc" / "当前优先设计" / "30_美术组对话HUD与NPC半身像包记录.md"


@dataclass(frozen=True)
class UiSpec:
    key: str
    runtime_file: str
    role: str


UI_SPECS = (
    UiSpec("top_bar", "hud_v2_top_bar.png", "top HUD navigation and status backing"),
    UiSpec("plaque", "hud_v2_plaque.png", "location, weather and compact readout plaque"),
    UiSpec("icon_button", "hud_v2_icon_button.png", "square icon button frame"),
    UiSpec("action_button", "hud_v2_action_button.png", "gold action button frame"),
    UiSpec("hint_panel", "hud_v2_hint_panel.png", "bottom interaction hint backing"),
    UiSpec("dialogue_panel", "hud_v2_dialogue_panel.png", "NPC pre-dialogue frame with portrait slot"),
    UiSpec("side_task_panel", "hud_v2_side_task_panel.png", "side quest/task guide panel"),
    UiSpec("choice_button", "hud_v2_choice_button.png", "dialogue/menu choice button frame"),
)


@dataclass(frozen=True)
class BustSpec:
    region_id: str
    npc_id: str
    name: str
    source_index: int


BUSTS = (
    BustSpec("jiangnan", "jn-ning-ciqiu", "宁辞秋", 0),
    BustSpec("jiangnan", "jn-ye-qingzhan", "叶青盏", 1),
    BustSpec("jiangnan", "jn-qiao-zhaoye", "乔照夜", 2),
    BustSpec("bashu", "bs-zhuo-jinniang", "卓锦娘", 3),
    BustSpec("bashu", "bs-mabang-ayue", "马帮阿越", 4),
    BustSpec("lingnan", "ln-he-yunsha", "何云纱", 5),
    BustSpec("lingnan", "ln-wu-haichao", "伍海潮", 6),
    BustSpec("ganpo", "gp-wen-yaotou", "窑头老温", 7),
    BustSpec("ganpo", "gp-lan-yousheng", "蓝釉生", 8),
    BustSpec("xiyu", "xu-a-yue", "玉师阿月", 9),
    BustSpec("xiyu", "xu-tuoling-shu", "驼铃叔", 10),
)


REGION_NAMES = {
    "jiangnan": "江南",
    "bashu": "巴蜀",
    "lingnan": "岭南",
    "ganpo": "赣鄱",
    "xiyu": "西域",
}


def is_key_green(pixel: tuple[int, int, int, int]) -> bool:
    r, g, b, a = pixel
    if a == 0:
        return True
    return (
        g > 145
        and r < 125
        and b < 125
        and g > r * 1.35
        and g > b * 1.25
    ) or (g > 95 and r < 70 and b < 75 and g > max(r, b) + 55)


def chroma_key(img: Image.Image) -> Image.Image:
    rgba = img.convert("RGBA")
    out: list[tuple[int, int, int, int]] = []
    for pixel in rgba.getdata():
        r, g, b, a = pixel
        if is_key_green(pixel):
            out.append((r, g, b, 0))
        elif g > 120 and r < 145 and b < 145 and g > r * 1.18 and g > b * 1.12:
            alpha = max(0, min(a, int(255 * (max(r, b) / max(1, g)))))
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
    x0 = max(0, x0 - pad)
    y0 = max(0, y0 - pad)
    x1 = min(rgba.width, x1 + pad)
    y1 = min(rgba.height, y1 + pad)
    return rgba.crop((x0, y0, x1, y1))


def connected_components(mask: list[list[bool]]) -> list[tuple[int, int, int, int, int]]:
    h = len(mask)
    w = len(mask[0]) if h else 0
    seen = [[False] * w for _ in range(h)]
    components: list[tuple[int, int, int, int, int]] = []
    for y in range(h):
        for x in range(w):
            if seen[y][x] or not mask[y][x]:
                continue
            queue: deque[tuple[int, int]] = deque([(x, y)])
            seen[y][x] = True
            min_x = max_x = x
            min_y = max_y = y
            area = 0
            while queue:
                cx, cy = queue.popleft()
                area += 1
                min_x = min(min_x, cx)
                max_x = max(max_x, cx)
                min_y = min(min_y, cy)
                max_y = max(max_y, cy)
                for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                    if nx < 0 or ny < 0 or nx >= w or ny >= h or seen[ny][nx] or not mask[ny][nx]:
                        continue
                    seen[ny][nx] = True
                    queue.append((nx, ny))
            components.append((min_x, min_y, max_x + 1, max_y + 1, area))
    return components


def detect_ui_components(source: Image.Image) -> list[tuple[int, int, int, int, int]]:
    rgba = source.convert("RGBA")
    pixels = rgba.load()
    mask = [
        [not is_key_green(pixels[x, y]) for x in range(rgba.width)]
        for y in range(rgba.height)
    ]
    components = [
        item for item in connected_components(mask)
        if item[4] > 2_000 and (item[2] - item[0]) > 40 and (item[3] - item[1]) > 40
    ]
    if len(components) != 8:
        raise RuntimeError(f"Expected 8 UI components, found {len(components)}")
    return sorted(components, key=lambda box: (box[1], box[0]))


def classify_ui_components(components: list[tuple[int, int, int, int, int]]) -> dict[str, tuple[int, int, int, int]]:
    output: dict[str, tuple[int, int, int, int]] = {}
    for box in components:
        x0, y0, x1, y1, _area = box
        w = x1 - x0
        h = y1 - y0
        rect = (x0, y0, x1, y1)
        if y0 < 260 and w > 650:
            output["top_bar"] = rect
        elif y0 < 260 and w <= 650:
            output["plaque"] = rect
        elif 250 <= y0 < 520 and w < 320:
            output["icon_button"] = rect
        elif 250 <= y0 < 520 and w >= 320:
            output["action_button"] = rect
        elif 500 <= y0 < 990 and x0 >= 760 and h > 260:
            output["side_task_panel"] = rect
        elif 520 <= y0 < 740 and h < 160:
            output["hint_panel"] = rect
        elif y0 >= 700 and x0 < 760 and h > 260:
            output["dialogue_panel"] = rect
        else:
            output["choice_button"] = rect
    missing = [spec.key for spec in UI_SPECS if spec.key not in output]
    if missing:
        raise RuntimeError(f"Missing UI component classification: {missing}")
    return output


def save_ui_assets() -> list[dict[str, object]]:
    source = Image.open(SOURCE_UI).convert("RGBA")
    CUTOUT_UI.mkdir(parents=True, exist_ok=True)
    RUNTIME_UI.mkdir(parents=True, exist_ok=True)
    boxes = classify_ui_components(detect_ui_components(source))
    entries: list[dict[str, object]] = []
    for spec in UI_SPECS:
        x0, y0, x1, y1 = boxes[spec.key]
        crop = source.crop((max(0, x0 - 10), max(0, y0 - 10), min(source.width, x1 + 10), min(source.height, y1 + 10)))
        cutout = trim_alpha(chroma_key(crop), pad=2)
        cutout_path = CUTOUT_UI / spec.runtime_file
        runtime_path = RUNTIME_UI / spec.runtime_file
        cutout.save(cutout_path)
        cutout.save(runtime_path)
        entries.append(
            {
                "key": f"ui.hudV2.{spec.key}",
                "role": spec.role,
                "runtimePath": runtime_path.relative_to(ROOT).as_posix(),
                "sourceCutout": cutout_path.relative_to(ROOT).as_posix(),
                "asset": f"/assets/game/ui/{spec.runtime_file}",
                "size": list(cutout.size),
            }
        )
    return entries


def grid_crop(img: Image.Image, cols: int, rows: int, index: int, inset: int = 10) -> Image.Image:
    col = index % cols
    row = index // cols
    x0 = round(col * img.width / cols) + inset
    y0 = round(row * img.height / rows) + inset
    x1 = round((col + 1) * img.width / cols) - inset
    y1 = round((row + 1) * img.height / rows) - inset
    return img.crop((x0, y0, x1, y1))


def grid_crop_with_insets(
    img: Image.Image,
    cols: int,
    rows: int,
    index: int,
    insets: tuple[int, int, int, int],
) -> Image.Image:
    left, top, right, bottom = insets
    col = index % cols
    row = index // cols
    x0 = round(col * img.width / cols) + left
    y0 = round(row * img.height / rows) + top
    x1 = round((col + 1) * img.width / cols) - right
    y1 = round((row + 1) * img.height / rows) - bottom
    return img.crop((x0, y0, x1, y1))


def fit_to_canvas(img: Image.Image, size: tuple[int, int]) -> Image.Image:
    crop = trim_alpha(chroma_key(img), pad=4)
    bbox = crop.getchannel("A").getbbox()
    canvas = Image.new("RGBA", size)
    if not bbox:
        return canvas
    crop = crop.crop(bbox)
    max_w, max_h = size[0] - 12, size[1] - 10
    scale = min(1.0, max_w / crop.width, max_h / crop.height)
    if scale < 1:
        crop = crop.resize((max(1, round(crop.width * scale)), max(1, round(crop.height * scale))), Image.Resampling.LANCZOS)
    x = (size[0] - crop.width) // 2
    y = size[1] - crop.height - 2
    canvas.alpha_composite(crop, (x, y))
    return canvas


def remove_small_alpha_components(img: Image.Image, min_ratio: float) -> Image.Image:
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
    keep_boxes = [item for item in components if item[4] == largest or item[4] >= largest * min_ratio]
    keep = Image.new("L", rgba.size, 0)
    keep_pixels = keep.load()
    alpha_pixels = alpha.load()
    for x0, y0, x1, y1, _area in keep_boxes:
        for y in range(y0, y1):
            for x in range(x0, x1):
                if alpha_pixels[x, y] > 20:
                    keep_pixels[x, y] = 255
    out = Image.new("RGBA", rgba.size)
    out.alpha_composite(rgba)
    out.putalpha(Image.composite(alpha, Image.new("L", rgba.size, 0), keep))
    return out


def save_bust_assets() -> list[dict[str, object]]:
    source = Image.open(SOURCE_BUSTS).convert("RGBA")
    CUTOUT_BUSTS.mkdir(parents=True, exist_ok=True)
    entries: list[dict[str, object]] = []
    custom_insets = {
        "ln-he-yunsha": (26, 26, 26, 48),
        "xu-a-yue": (74, 26, 26, 26),
        "xu-tuoling-shu": (72, 26, 26, 26),
    }
    component_cleanup = {
        "xu-tuoling-shu": 0.05,
    }
    for spec in BUSTS:
        raw_crop = grid_crop_with_insets(
            source,
            4,
            3,
            spec.source_index,
            custom_insets.get(spec.npc_id, (26, 26, 26, 26)),
        )
        bust = fit_to_canvas(raw_crop, (320, 384))
        if spec.npc_id in component_cleanup:
            bust = remove_small_alpha_components(bust, component_cleanup[spec.npc_id])
        cutout_path = CUTOUT_BUSTS / f"{spec.npc_id}_bust.png"
        runtime_dir = RUNTIME_CHARACTERS / spec.npc_id
        runtime_dir.mkdir(parents=True, exist_ok=True)
        runtime_path = runtime_dir / "bust.png"
        bust.save(cutout_path)
        bust.save(runtime_path)
        entries.append(
            {
                "regionId": spec.region_id,
                "regionName": REGION_NAMES[spec.region_id],
                "npcId": spec.npc_id,
                "name": spec.name,
                "key": f"npc.{spec.npc_id}.bust",
                "runtimePath": runtime_path.relative_to(ROOT).as_posix(),
                "sourceCutout": cutout_path.relative_to(ROOT).as_posix(),
                "asset": f"/assets/game/characters/{spec.npc_id}/bust.png",
                "size": [320, 384],
            }
        )
    return entries


def save_preview(ui_entries: list[dict[str, object]], bust_entries: list[dict[str, object]]) -> None:
    MANIFEST_DIR.mkdir(parents=True, exist_ok=True)
    preview = Image.new("RGBA", (1280, 900), (30, 28, 24, 255))
    draw = ImageDraw.Draw(preview)
    draw.text((24, 18), "HUD v2 image-generated UI components", fill=(232, 218, 190, 255))
    x = 24
    y = 54
    for entry in ui_entries:
        img = Image.open(ROOT / str(entry["runtimePath"])).convert("RGBA")
        scale = min(1.0, 220 / max(1, img.width), 120 / max(1, img.height))
        show = img.resize((round(img.width * scale), round(img.height * scale)), Image.Resampling.LANCZOS)
        preview.alpha_composite(show, (x, y))
        draw.text((x, y + 126), str(entry["key"]).replace("ui.hudV2.", ""), fill=(205, 190, 160, 255))
        x += 300
        if x > 1040:
            x = 24
            y += 168

    draw.text((24, 402), "NPC dialogue busts", fill=(232, 218, 190, 255))
    for index, entry in enumerate(bust_entries):
        img = Image.open(ROOT / str(entry["runtimePath"])).convert("RGBA")
        show = img.resize((120, 144), Image.Resampling.LANCZOS)
        x = 24 + (index % 6) * 205
        y = 438 + (index // 6) * 204
        preview.alpha_composite(show, (x, y))
        draw.text((x, y + 150), str(entry["npcId"]), fill=(205, 190, 160, 255))
        draw.text((x, y + 168), str(entry["name"]), fill=(205, 190, 160, 255))
    preview.save(MANIFEST_DIR / "priority_dialogue_ui_busts_preview.png")


def validate(ui_entries: list[dict[str, object]], bust_entries: list[dict[str, object]]) -> None:
    for entry in [*ui_entries, *bust_entries]:
        path = ROOT / str(entry["runtimePath"])
        if not path.exists():
            raise RuntimeError(f"Missing runtime asset: {path}")
        img = Image.open(path).convert("RGBA")
        if img.getchannel("A").getbbox() is None:
            raise RuntimeError(f"Empty alpha image: {path}")
        corners = [img.getpixel((0, 0))[3], img.getpixel((img.width - 1, 0))[3]]
        if any(value > 24 for value in corners):
            raise RuntimeError(f"Non-transparent chroma corner remains: {path}")


def write_manifest(ui_entries: list[dict[str, object]], bust_entries: list[dict[str, object]]) -> None:
    MANIFEST_DIR.mkdir(parents=True, exist_ok=True)
    payload = {
        "date": DATE_STAMP,
        "node": "A4 UI and A3 NPC dialogue bust package",
        "pipeline": "image_gen atlas -> chroma key -> component slicing -> runtime PNG",
        "sources": {
            "ui": SOURCE_UI.relative_to(ROOT).as_posix(),
            "npcBusts": SOURCE_BUSTS.relative_to(ROOT).as_posix(),
        },
        "ui": ui_entries,
        "npcBusts": bust_entries,
    }
    (MANIFEST_DIR / "priority_dialogue_ui_bust_manifest.json").write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def write_doc(ui_entries: list[dict[str, object]], bust_entries: list[dict[str, object]]) -> None:
    ui_rows = [
        f"| `{entry['key']}` | {entry['role']} | `{entry['runtimePath']}` | {entry['size'][0]}x{entry['size'][1]} |"
        for entry in ui_entries
    ]
    bust_rows = [
        f"| {entry['regionName']} `{entry['regionId']}` | `{entry['npcId']}` | {entry['name']} | `{entry['runtimePath']}` |"
        for entry in bust_entries
    ]
    lines = [
        "# 美术组对话 HUD 与 NPC 半身像包记录",
        "",
        f"更新日期：{DATE_STAMP}",
        "",
        "## 节点",
        "",
        "- 对应《美术极速协作指引》A3/A4：NPC 半身像、对话前置模式、HUD/任务栏/按钮图像化封装。",
        "- 本批 UI 与半身像均由内置 `image_gen` 生成；脚本只负责抠绿、切片、尺寸归一、运行时落盘、manifest 与 QA 预览。",
        "- 运行时已预留 NPC 对话左侧半身像槽位，顶栏/侧栏/底部提示改用这批图像组件作为背景。",
        "",
        "## 源文件",
        "",
        f"- UI 源图：`{SOURCE_UI.relative_to(ROOT).as_posix()}`",
        f"- NPC 半身像源图：`{SOURCE_BUSTS.relative_to(ROOT).as_posix()}`",
        f"- UI 切片：`{CUTOUT_UI.relative_to(ROOT).as_posix()}`",
        f"- NPC 切片：`{CUTOUT_BUSTS.relative_to(ROOT).as_posix()}`",
        f"- Manifest：`{(MANIFEST_DIR / 'priority_dialogue_ui_bust_manifest.json').relative_to(ROOT).as_posix()}`",
        f"- QA 预览：`{(MANIFEST_DIR / 'priority_dialogue_ui_busts_preview.png').relative_to(ROOT).as_posix()}`",
        "",
        "## UI 组件",
        "",
        "| key | 用途 | 运行时文件 | 尺寸 |",
        "|---|---|---|---|",
        *ui_rows,
        "",
        "## NPC 半身像",
        "",
        "| 地区 | npcId | 名称 | 运行时文件 |",
        "|---|---|---|---|",
        *bust_rows,
        "",
        "## 剩余缺口",
        "",
        "- 本批完成主轴 11 名 NPC 的对话半身像；骨架六区 NPC 半身像尚未进入正式包。",
        "- UI 图像组件已接入 HUD 与对话前置层；背包、百工志、成就等大弹窗仍可继续升级为同一套图像边框。",
        "- 地图装饰物的编辑器资产已存在，但运行时 `decoration` 仍需要继续按真实 asset 渲染，避免只显示石头占位。",
    ]
    DOC_OUT.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    ui_entries = save_ui_assets()
    bust_entries = save_bust_assets()
    validate(ui_entries, bust_entries)
    save_preview(ui_entries, bust_entries)
    write_manifest(ui_entries, bust_entries)
    write_doc(ui_entries, bust_entries)
    print(f"packaged UI components: {len(ui_entries)}")
    print(f"packaged NPC busts: {len(bust_entries)}")


if __name__ == "__main__":
    main()
