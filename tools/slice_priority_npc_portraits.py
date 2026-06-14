from __future__ import annotations

import json
from collections import deque
from dataclasses import dataclass
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
DATE_STAMP = "2026-06-14"
ART_ROOT = ROOT / "public" / "assets" / "art_sources" / "priority_art" / DATE_STAMP
SOURCE_PATH = ART_ROOT / "01_generated_sources" / "npc_portraits" / "main_axis_npc_portraits_v01_chroma.png"
CUTOUT_DIR = ART_ROOT / "02_cutouts" / "npc_portraits"
MANIFEST_DIR = ART_ROOT / "05_manifests"
RUNTIME_ROOT = ROOT / "public" / "assets" / "game" / "characters"
DOC_OUT = ROOT / "doc" / "当前优先设计" / "24_美术组主轴五区NPC头像包记录.md"


@dataclass(frozen=True)
class PortraitSpec:
    region_id: str
    npc_id: str
    name: str
    role: str
    source_index: int


PORTRAITS: tuple[PortraitSpec, ...] = (
    PortraitSpec("jiangnan", "jn-ning-ciqiu", "宁辞秋", "文人书法家", 0),
    PortraitSpec("jiangnan", "jn-ye-qingzhan", "叶青盏", "青瓷窑师", 1),
    PortraitSpec("jiangnan", "jn-qiao-zhaoye", "乔照夜", "灯彩匠", 2),
    PortraitSpec("bashu", "bs-zhuo-jinniang", "卓锦娘", "蜀锦织造师", 3),
    PortraitSpec("bashu", "bs-mabang-ayue", "马帮阿越", "茶马驿领路人", 4),
    PortraitSpec("lingnan", "ln-he-yunsha", "何云纱", "香云纱染整师", 5),
    PortraitSpec("lingnan", "ln-wu-haichao", "伍海潮", "海商", 6),
    PortraitSpec("ganpo", "gp-wen-yaotou", "窑头老温", "窑师", 7),
    PortraitSpec("ganpo", "gp-lan-yousheng", "蓝釉生", "画坯师", 8),
    PortraitSpec("xiyu", "xu-a-yue", "玉师阿月", "玉雕师", 9),
    PortraitSpec("xiyu", "xu-tuoling-shu", "驼铃叔", "驼队首领", 10),
)


REGION_NAMES = {
    "jiangnan": "江南",
    "bashu": "巴蜀",
    "lingnan": "岭南",
    "ganpo": "赣鄱",
    "xiyu": "西域",
}


def grid_crop(img: Image.Image, cols: int, rows: int, index: int, inset: int = 0) -> Image.Image:
    col = index % cols
    row = index // cols
    x0 = round(col * img.width / cols) + inset
    y0 = round(row * img.height / rows) + inset
    x1 = round((col + 1) * img.width / cols) - inset
    y1 = round((row + 1) * img.height / rows) - inset
    return img.crop((x0, y0, x1, y1))


def is_green_pixel(r: int, g: int, b: int) -> bool:
    return g > 130 and r < 120 and b < 120 and g > r * 1.35 and g > b * 1.35


def chroma_key_green(img: Image.Image) -> Image.Image:
    rgba = img.convert("RGBA")
    out: list[tuple[int, int, int, int]] = []
    for r, g, b, a in rgba.getdata():
        if is_green_pixel(r, g, b):
            out.append((r, g, b, 0))
        elif g > 115 and r < 145 and b < 145 and g > r * 1.12 and g > b * 1.12:
            alpha = max(0, min(a, int((max(r, b) / max(1, g)) * 255)))
            out.append((min(r, 120), min(g, max(r, b) + 20), min(b, 120), alpha))
        else:
            out.append((r, g, b, a))
    rgba.putdata(out)
    return rgba


def is_border_green_pixel(r: int, g: int, b: int, a: int) -> bool:
    return a > 0 and g > 45 and g > r * 1.05 and g > b * 1.05


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


def remove_low_alpha_noise(img: Image.Image, threshold: int = 18) -> Image.Image:
    rgba = img.convert("RGBA")
    clean: list[tuple[int, int, int, int]] = []
    for r, g, b, a in rgba.getdata():
        if a < threshold:
            clean.append((r, g, b, 0))
        elif a < 100 and g > r * 1.08 and g > b * 1.08:
            clean.append((r, g, b, 0))
        else:
            clean.append((r, min(g, max(r, b) + 18), b, a))
    rgba.putdata(clean)
    return rgba


def fit_to_canvas(img: Image.Image, size: tuple[int, int]) -> Image.Image:
    rgba = remove_border_green(remove_low_alpha_noise(img))
    bbox = rgba.getchannel("A").getbbox()
    canvas = Image.new("RGBA", size)
    if bbox is None:
        return canvas
    crop = rgba.crop(bbox)
    scale = min(size[0] / crop.width, size[1] / crop.height)
    resized = crop.resize((max(1, round(crop.width * scale)), max(1, round(crop.height * scale))), Image.Resampling.LANCZOS)
    canvas.alpha_composite(resized, ((size[0] - resized.width) // 2, size[1] - resized.height))
    return remove_border_green(remove_low_alpha_noise(canvas))


def save_preview(entries: list[dict[str, object]]) -> None:
    preview = Image.new("RGBA", (720, 560), (31, 29, 25, 255))
    for index, entry in enumerate(entries):
        image = Image.open(ROOT / str(entry["runtimePath"])).convert("RGBA")
        x = 24 + (index % 4) * 174
        y = 24 + (index // 4) * 172
        preview.alpha_composite(image, (x, y))
    MANIFEST_DIR.mkdir(parents=True, exist_ok=True)
    preview.save(MANIFEST_DIR / "main_axis_npc_portraits_preview.png")


def write_manifest(entries: list[dict[str, object]]) -> None:
    MANIFEST_DIR.mkdir(parents=True, exist_ok=True)
    payload = {
        "date": DATE_STAMP,
        "node": "A3 主轴五区 NPC 头像第一包",
        "pipeline": "image_gen portrait sheet -> chroma key -> 128x128 transparent portrait PNG",
        "source": str(SOURCE_PATH.relative_to(ROOT)).replace("\\", "/"),
        "entries": entries,
    }
    (MANIFEST_DIR / "priority_npc_portrait_manifest.json").write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def write_doc(entries: list[dict[str, object]]) -> None:
    rows = [
        f"| {entry['regionName']} `{entry['regionId']}` | `{entry['npcId']}` | {entry['name']} | {entry['role']} | `{entry['assetKey']}` | `{entry['runtimePath']}` |"
        for entry in entries
    ]
    lines = [
        "# 美术组主轴五区 NPC 头像包记录",
        "",
        f"更新日期：{DATE_STAMP}",
        "",
        "## 节点",
        "",
        "- 对应《美术极速协作指引》：A3 NPC 与工艺补齐。",
        "- 本节点先补主轴五区冻结 NPC 的对话/关系头像，服务当前优先版，不扩张到全 NPC 长篇立绘。",
        "- 主体图像由 `image_gen` 生成；脚本只做抠绿、切片、尺寸归一、manifest 和 QA 预览。",
        "",
        "## 源文件",
        "",
        f"- 源表：`{SOURCE_PATH.relative_to(ROOT).as_posix()}`",
        f"- 切片目录：`{CUTOUT_DIR.relative_to(ROOT).as_posix()}`",
        f"- QA 预览：`{(MANIFEST_DIR / 'main_axis_npc_portraits_preview.png').relative_to(ROOT).as_posix()}`",
        f"- Manifest：`{(MANIFEST_DIR / 'priority_npc_portrait_manifest.json').relative_to(ROOT).as_posix()}`",
        "",
        "## 头像清单",
        "",
        "| 地区 | npcId | 名称 | 职能 | 美术 key | 运行文件 |",
        "|---|---|---|---|---|---|",
        *rows,
        "",
        "## 剩余缺口",
        "",
        "- 主轴五区冻结 NPC 仍需 `stand.png` 站姿/半身包。",
        "- 主轴五区街景 `street_tiles.png` 与工艺 `craft_tools.png` 仍需按同一命名口径继续补。",
        "- 六区骨架 NPC 头像暂未进入本包，按 A2 节点处理。",
    ]
    DOC_OUT.write_text("\n".join(lines) + "\n", encoding="utf-8")


def validate(entries: list[dict[str, object]]) -> None:
    for entry in entries:
        path = ROOT / str(entry["runtimePath"])
        if not path.exists():
            raise RuntimeError(f"Missing portrait: {path}")
        img = Image.open(path).convert("RGBA")
        if img.size != (128, 128):
            raise RuntimeError(f"Unexpected portrait size {img.size}: {path}")
        if img.getchannel("A").getbbox() is None:
            raise RuntimeError(f"Empty alpha portrait: {path}")


def main() -> None:
    source = Image.open(SOURCE_PATH).convert("RGB")
    CUTOUT_DIR.mkdir(parents=True, exist_ok=True)
    entries: list[dict[str, object]] = []

    for spec in PORTRAITS:
        keyed = chroma_key_green(grid_crop(source, 4, 3, spec.source_index, inset=10))
        portrait = fit_to_canvas(keyed, (128, 128))
        cutout_path = CUTOUT_DIR / f"{spec.npc_id}_portrait.png"
        runtime_dir = RUNTIME_ROOT / spec.npc_id
        runtime_dir.mkdir(parents=True, exist_ok=True)
        runtime_path = runtime_dir / "portrait.png"
        portrait.save(cutout_path)
        portrait.save(runtime_path)
        entries.append(
            {
                "regionId": spec.region_id,
                "regionName": REGION_NAMES[spec.region_id],
                "npcId": spec.npc_id,
                "name": spec.name,
                "role": spec.role,
                "assetKey": f"npc.{spec.npc_id}.portrait",
                "runtimePath": str(runtime_path.relative_to(ROOT)).replace("\\", "/"),
                "sourceCutout": str(cutout_path.relative_to(ROOT)).replace("\\", "/"),
                "asset": f"/assets/game/characters/{spec.npc_id}/portrait.png",
            }
        )

    validate(entries)
    write_manifest(entries)
    save_preview(entries)
    write_doc(entries)
    print(f"priority NPC portraits sliced: {len(entries)}")


if __name__ == "__main__":
    main()
