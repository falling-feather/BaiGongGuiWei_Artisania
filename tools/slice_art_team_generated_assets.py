from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
DATE_STAMP = "2026-06-13"
ART_ROOT = ROOT / "public" / "assets" / "art_sources" / "art_team" / DATE_STAMP
SOURCE_DIR = ART_ROOT / "01_generated_sources" / "all_regions"
CUTOUT_DIR = ART_ROOT / "02_cutouts"
MANIFEST_DIR = ART_ROOT / "05_manifests"
GAME_DIR = ROOT / "public" / "assets" / "game"
BUILDING_OUT = GAME_DIR / "buildings" / "art_team" / "all_regions"
PROP_OUT = GAME_DIR / "props" / "art_team" / "all_regions"
CHARACTER_OUT = GAME_DIR / "characters" / "art_team" / "all_regions"
TS_OUT = ROOT / "src" / "data" / "regionArtAssets.generated.ts"
DOC_OUT = ROOT / "doc" / "美术组资源推进汇总.md"


@dataclass(frozen=True)
class Region:
    id: str
    name: str


@dataclass(frozen=True)
class BuildingSpec:
    region_id: str
    slug: str
    name: str
    interaction: str
    source_index: int


@dataclass(frozen=True)
class PropSpec:
    region_id: str
    slug: str
    name: str
    interaction: str
    tile_w: int
    tile_h: int
    source_index: int


@dataclass(frozen=True)
class NpcWalkSpec:
    region_id: str
    slug: str
    name: str


@dataclass(frozen=True)
class NpcWalkGroup:
    filename: str
    specs: tuple[NpcWalkSpec, ...]


REGIONS: tuple[Region, ...] = (
    Region("jiangnan", "江南"),
    Region("bashu", "巴蜀"),
    Region("lingnan", "岭南"),
    Region("qiandian", "黔滇"),
    Region("jingchu", "荆楚"),
    Region("ganpo", "赣鄱"),
    Region("huizhou", "徽州"),
    Region("jingji", "京畿"),
    Region("sanjin", "三晋"),
    Region("xueyu", "雪域"),
    Region("xiyu", "西域"),
)

BUILDINGS: tuple[BuildingSpec, ...] = (
    BuildingSpec("jiangnan", "signature_water_workshop", "水乡工坊", "craft", 0),
    BuildingSpec("bashu", "signature_bamboo_mountain_workshop", "竹雾山坊", "craft", 1),
    BuildingSpec("lingnan", "signature_harbor_qilou", "骑楼货栈", "trading", 2),
    BuildingSpec("qiandian", "signature_stilt_silver_dye_house", "银染吊脚楼", "craft", 3),
    BuildingSpec("jingchu", "signature_ferry_lacquer_house", "渡市漆坊", "craft", 4),
    BuildingSpec("ganpo", "signature_porcelain_kiln_house", "瓷镇窑坊", "industry", 5),
    BuildingSpec("huizhou", "signature_horsehead_paper_ink_house", "马头墙文房", "craft", 6),
    BuildingSpec("jingji", "signature_imperial_craft_courtyard", "宫造工院", "study", 7),
    BuildingSpec("sanjin", "signature_loess_ticket_lacquer_yard", "黄土票号漆院", "trading", 8),
    BuildingSpec("xueyu", "signature_snow_thangka_studio", "雪口画院", "craft", 9),
    BuildingSpec("xiyu", "signature_oasis_jade_bazaar", "绿洲玉作巴扎", "trading", 10),
)

BUILDING_EXPANSIONS: tuple[BuildingSpec, ...] = (
    BuildingSpec("jiangnan", "expansion_canal_dye_pavilion", "水巷染茶亭", "craft", 0),
    BuildingSpec("bashu", "expansion_bamboo_drying_house", "竹篾晒坊", "craft", 1),
    BuildingSpec("lingnan", "expansion_qilou_cargo_office", "骑楼账房", "trading", 2),
    BuildingSpec("qiandian", "expansion_silver_stilt_booth", "银饰吊脚铺", "craft", 3),
    BuildingSpec("jingchu", "expansion_riverside_lacquer_stall", "江岸漆摊", "craft", 4),
    BuildingSpec("ganpo", "expansion_porcelain_kiln_storehouse", "瓷坯窑仓", "industry", 5),
    BuildingSpec("huizhou", "expansion_paper_ink_drying_hall", "纸墨晒厅", "craft", 6),
    BuildingSpec("jingji", "expansion_enamel_bureau_hall", "景泰蓝作厅", "craft", 7),
    BuildingSpec("sanjin", "expansion_ticket_lacquer_storehouse", "票号漆仓", "trading", 8),
    BuildingSpec("xueyu", "expansion_thangka_pigment_atelier", "矿彩画坊", "craft", 9),
    BuildingSpec("xiyu", "expansion_jade_polishing_bazaar", "玉作磨坊", "craft", 10),
)

PROPS: tuple[PropSpec, ...] = (
    PropSpec("jiangnan", "black_awning_boat_market", "乌篷船货摊", "travel", 4, 2, 0),
    PropSpec("jiangnan", "willow_wet_bank", "水岸柳石", "decoration", 2, 3, 1),
    PropSpec("bashu", "split_bamboo_rack", "竹篾晾架", "craft", 3, 2, 2),
    PropSpec("bashu", "salt_fire_pan", "井盐火锅", "industry", 2, 2, 3),
    PropSpec("lingnan", "harbor_cargo_citrus", "港口货箱", "trading", 3, 2, 4),
    PropSpec("lingnan", "gambiered_silk_drying_rack", "香云纱晒架", "craft", 3, 2, 5),
    PropSpec("qiandian", "silver_hammer_table", "锤银工具台", "craft", 2, 2, 6),
    PropSpec("qiandian", "indigo_vats_cloth_line", "靛染缸布架", "craft", 3, 2, 7),
    PropSpec("jingchu", "reed_ferry_boat", "芦岸渡船", "travel", 4, 2, 8),
    PropSpec("jingchu", "lacquer_brush_vessels", "朱黑漆器台", "craft", 2, 2, 9),
    PropSpec("ganpo", "porcelain_blanks_shelf", "瓷坯样架", "craft", 2, 2, 10),
    PropSpec("ganpo", "kiln_firewood_kaolin", "窑柴白土堆", "industry", 3, 2, 11),
    PropSpec("huizhou", "paper_trough_drying_wall", "纸槽晒墙", "craft", 3, 2, 12),
    PropSpec("jingji", "cloisonne_sample_table", "景泰蓝样台", "craft", 2, 2, 13),
    PropSpec("xiyu", "camel_pack_goods", "驼包货组", "travel", 3, 2, 14),
    PropSpec("xueyu", "pigment_grinding_table", "矿彩研磨台", "craft", 3, 2, 15),
)

PROP_EXPANSIONS: tuple[PropSpec, ...] = (
    PropSpec("jiangnan", "indigo_dye_table", "靛染布案", "craft", 2, 2, 0),
    PropSpec("bashu", "bamboo_basket_pile", "竹篾筐组", "craft", 2, 2, 1),
    PropSpec("lingnan", "cargo_scale_crates", "港货秤箱", "trading", 3, 2, 2),
    PropSpec("qiandian", "silver_ornament_stand", "银饰陈列架", "craft", 2, 2, 3),
    PropSpec("jingchu", "lacquer_drying_rack", "漆器晾架", "craft", 3, 2, 4),
    PropSpec("ganpo", "kiln_handcart", "窑车陶罐", "industry", 3, 2, 5),
    PropSpec("huizhou", "inkstone_paper_rack", "纸墨案架", "craft", 3, 2, 6),
    PropSpec("jingji", "enamel_sample_cabinet", "珐琅样柜", "craft", 2, 2, 7),
    PropSpec("sanjin", "abacus_ticket_chest", "算盘票柜", "trading", 2, 2, 8),
    PropSpec("xueyu", "thangka_pigment_stand", "唐卡矿彩架", "craft", 3, 2, 9),
    PropSpec("xiyu", "jade_polishing_table", "玉料磨案", "craft", 3, 2, 10),
    PropSpec("jiangnan", "canal_stone_lantern", "水岸石灯", "decoration", 2, 2, 11),
    PropSpec("bashu", "salt_well_tool_rack", "井盐器架", "industry", 2, 2, 12),
    PropSpec("lingnan", "silk_fan_drying_stand", "纱扇晒架", "craft", 3, 2, 13),
    PropSpec("qiandian", "indigo_silver_bench", "银染布凳", "craft", 3, 2, 14),
    PropSpec("xiyu", "desert_textile_rolls", "西域毯卷", "trading", 3, 2, 15),
)


NPC_WALK_GROUPS: tuple[NpcWalkGroup, ...] = (
    NpcWalkGroup(
        "npc_walks_group_01_jiangnan_bashu_lingnan_v01_chroma.png",
        (
            NpcWalkSpec("jiangnan", "guide_water_dyer", "水乡染工向导"),
            NpcWalkSpec("bashu", "guide_bamboo_worker", "竹山匠师向导"),
            NpcWalkSpec("lingnan", "guide_harbor_trader", "海市货栈向导"),
        ),
    ),
    NpcWalkGroup(
        "npc_walks_group_02_qiandian_jingchu_ganpo_v01_chroma.png",
        (
            NpcWalkSpec("qiandian", "guide_silver_dyer", "银染匠人向导"),
            NpcWalkSpec("jingchu", "guide_lacquer_ferry", "漆渡行商向导"),
            NpcWalkSpec("ganpo", "guide_porcelain_kiln", "瓷窑匠师向导"),
        ),
    ),
    NpcWalkGroup(
        "npc_walks_group_03_huizhou_jingji_sanjin_v01_chroma.png",
        (
            NpcWalkSpec("huizhou", "guide_paper_ink", "纸墨书坊向导"),
            NpcWalkSpec("jingji", "guide_imperial_craft", "宫造工官向导"),
            NpcWalkSpec("sanjin", "guide_ticket_lacquer", "票号漆匠向导"),
        ),
    ),
    NpcWalkGroup(
        "npc_walks_group_04_xueyu_xiyu_v01_chroma.png",
        (
            NpcWalkSpec("xueyu", "guide_thangka_pigment", "矿彩画师向导"),
            NpcWalkSpec("xiyu", "guide_oasis_jade", "绿洲玉作向导"),
        ),
    ),
)


def region_name(region_id: str) -> str:
    return next(region.name for region in REGIONS if region.id == region_id)


def make_id(region_id: str, kind: str, slug: str) -> str:
    return f"at_{region_id}_{kind}_{slug}"


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


def alpha_bbox(img: Image.Image) -> tuple[int, int, int, int] | None:
    return img.convert("RGBA").getchannel("A").getbbox()


def remove_low_alpha_noise(img: Image.Image, threshold: int = 20) -> Image.Image:
    rgba = img.convert("RGBA")
    clean: list[tuple[int, int, int, int]] = []
    for r, g, b, a in rgba.getdata():
        clean.append((r, g, b, 0) if a < threshold else (r, g, b, a))
    rgba.putdata(clean)
    return rgba


def projected_alpha_intervals(alpha: Image.Image, expected: int = 4) -> list[tuple[int, int]]:
    pix = alpha.load()
    width, height = alpha.size
    threshold = max(3, round(height * 0.015))
    intervals: list[tuple[int, int]] = []
    in_run = False
    start = 0

    for x in range(width):
        count = 0
        for y in range(height):
            if pix[x, y] > 20:
                count += 1
        if count > threshold and not in_run:
            start = x
            in_run = True
        if (count <= threshold or x == width - 1) and in_run:
            end = x if count <= threshold else x + 1
            intervals.append((start, end))
            in_run = False

    merged: list[tuple[int, int]] = []
    for left, right in intervals:
        if merged and left - merged[-1][1] < 12:
            merged[-1] = (merged[-1][0], right)
        else:
            merged.append((left, right))

    candidates = [(left, right) for left, right in merged if right - left >= 24]
    if len(candidates) >= expected:
        return candidates[:expected]
    return []


def crop_npc_frame(block: Image.Image, keyed_block: Image.Image, row: int, col: int) -> Image.Image:
    y0 = round(row * block.height / 4)
    y1 = round((row + 1) * block.height / 4)
    alpha_row = keyed_block.crop((0, y0, keyed_block.width, y1)).getchannel("A")
    intervals = projected_alpha_intervals(alpha_row)
    if len(intervals) == 4:
        x0, x1 = intervals[col]
        return chroma_key_green(block.crop((max(0, x0 - 12), y0, min(block.width, x1 + 12), y1)))
    return chroma_key_green(grid_crop(block, 4, 4, row * 4 + col, inset=4))


def fit_to_canvas(img: Image.Image, size: tuple[int, int], bottom_pad: int = 0) -> Image.Image:
    rgba = remove_low_alpha_noise(img.convert("RGBA"))
    bbox = alpha_bbox(rgba)
    canvas = Image.new("RGBA", size)
    if bbox is None:
        return canvas
    crop = rgba.crop(bbox)
    max_w = size[0]
    max_h = max(1, size[1] - bottom_pad)
    scale = min(max_w / crop.width, max_h / crop.height)
    resized = crop.resize((max(1, round(crop.width * scale)), max(1, round(crop.height * scale))), Image.Resampling.LANCZOS)
    canvas.alpha_composite(resized, ((size[0] - resized.width) // 2, size[1] - bottom_pad - resized.height))
    return remove_low_alpha_noise(canvas)


def save_buildings(manifest: dict[str, object]) -> None:
    source = Image.open(SOURCE_DIR / "all_regions_buildings_sheet_v02_chroma.png").convert("RGB")
    expansion_source = Image.open(SOURCE_DIR / "all_regions_buildings_expansion_sheet_v01_chroma.png").convert("RGB")
    (CUTOUT_DIR / "buildings").mkdir(parents=True, exist_ok=True)
    BUILDING_OUT.mkdir(parents=True, exist_ok=True)
    building_entries: list[dict[str, object]] = []

    def save_building_spec(spec: BuildingSpec, source_img: Image.Image) -> None:
        asset_id = make_id(spec.region_id, "building", spec.slug)
        cell = chroma_key_green(grid_crop(source_img, 4, 3, spec.source_index, inset=4))
        runtime = fit_to_canvas(cell, (96, 88))
        cutout_path = CUTOUT_DIR / "buildings" / f"{asset_id}.png"
        runtime_path = BUILDING_OUT / f"{asset_id}.png"
        runtime.save(cutout_path)
        runtime.save(runtime_path)
        building_entries.append(
            {
                "regionId": spec.region_id,
                "id": asset_id,
                "name": f"{region_name(spec.region_id)}·{spec.name}",
                "asset": f"/assets/game/buildings/art_team/all_regions/{asset_id}.png",
                "interaction": spec.interaction,
            }
        )

    for spec in BUILDINGS:
        save_building_spec(spec, source)

    for spec in BUILDING_EXPANSIONS:
        save_building_spec(spec, expansion_source)

    gate_cell = chroma_key_green(grid_crop(source, 4, 3, 11, inset=4))
    gate_runtime = fit_to_canvas(gate_cell, (96, 88))
    for region in REGIONS:
        asset_id = make_id(region.id, "building", "regional_gate")
        cutout_path = CUTOUT_DIR / "buildings" / f"{asset_id}.png"
        runtime_path = BUILDING_OUT / f"{asset_id}.png"
        gate_runtime.save(cutout_path)
        gate_runtime.save(runtime_path)
        building_entries.append(
            {
                "regionId": region.id,
                "id": asset_id,
                "name": f"{region.name}·地区牌坊",
                "asset": f"/assets/game/buildings/art_team/all_regions/{asset_id}.png",
                "interaction": "gate",
            }
        )

    manifest["buildings"] = building_entries


def save_props(manifest: dict[str, object]) -> None:
    source = Image.open(SOURCE_DIR / "all_regions_props_sheet_v02_chroma.png").convert("RGB")
    expansion_source = Image.open(SOURCE_DIR / "all_regions_props_expansion_sheet_v01_chroma.png").convert("RGB")
    (CUTOUT_DIR / "props").mkdir(parents=True, exist_ok=True)
    PROP_OUT.mkdir(parents=True, exist_ok=True)
    prop_entries: list[dict[str, object]] = []

    def save_prop_spec(spec: PropSpec, source_img: Image.Image) -> None:
        asset_id = make_id(spec.region_id, "prop", spec.slug)
        cell = chroma_key_green(grid_crop(source_img, 4, 4, spec.source_index, inset=4))
        size = (max(32, spec.tile_w * 32), max(32, spec.tile_h * 32))
        runtime = fit_to_canvas(cell, size, bottom_pad=1)
        cutout_path = CUTOUT_DIR / "props" / f"{asset_id}.png"
        runtime_path = PROP_OUT / f"{asset_id}.png"
        runtime.save(cutout_path)
        runtime.save(runtime_path)
        prop_entries.append(
            {
                "regionId": spec.region_id,
                "id": asset_id,
                "name": f"{region_name(spec.region_id)}·{spec.name}",
                "asset": f"/assets/game/props/art_team/all_regions/{asset_id}.png",
                "interaction": spec.interaction,
                "tileW": spec.tile_w,
                "tileH": spec.tile_h,
                "solid": spec.interaction not in ("travel",),
            }
        )

    for spec in PROPS:
        save_prop_spec(spec, source)

    for spec in PROP_EXPANSIONS:
        save_prop_spec(spec, expansion_source)

    manifest["props"] = prop_entries


def save_npc_references(manifest: dict[str, object]) -> None:
    source = Image.open(SOURCE_DIR / "all_regions_npc_lineup_v02_chroma.png").convert("RGB")
    out = CUTOUT_DIR / "npc_reference"
    out.mkdir(parents=True, exist_ok=True)
    entries: list[dict[str, object]] = []
    for index in range(12):
        cell = chroma_key_green(grid_crop(source, 6, 2, index, inset=8))
        runtime = fit_to_canvas(cell, (96, 128), bottom_pad=2)
        role = REGIONS[index].id if index < len(REGIONS) else "player"
        asset_id = f"at_{role}_npc_reference"
        path = out / f"{asset_id}.png"
        runtime.save(path)
        entries.append(
            {
                "id": asset_id,
                "role": role,
                "source": str(path.relative_to(ROOT)).replace("\\", "/"),
                "note": "NPC 立绘/服饰/职业道具参考，未直接登记为 4x4 运行行走表。",
            }
        )
    manifest["npcReferences"] = entries


def save_npc_walks(manifest: dict[str, object]) -> None:
    source_dir = SOURCE_DIR.parent / "npc_walks"
    out = CUTOUT_DIR / "npc_walks"
    out.mkdir(parents=True, exist_ok=True)
    CHARACTER_OUT.mkdir(parents=True, exist_ok=True)
    character_entries: list[dict[str, object]] = []

    for group in NPC_WALK_GROUPS:
        source = Image.open(source_dir / group.filename).convert("RGB")
        for block_index, spec in enumerate(group.specs):
            asset_id = make_id(spec.region_id, "npc", spec.slug)
            sheet = Image.new("RGBA", (192, 192))
            block = grid_crop(source, len(group.specs), 1, block_index)
            keyed_block = chroma_key_green(block)
            for row in range(4):
                for col in range(4):
                    cell = crop_npc_frame(block, keyed_block, row, col)
                    frame = fit_to_canvas(cell, (48, 48), bottom_pad=1)
                    sheet.alpha_composite(frame, (col * 48, row * 48))

            cutout_path = out / f"{asset_id}_walk.png"
            runtime_path = CHARACTER_OUT / f"{asset_id}_walk.png"
            sheet.save(cutout_path)
            sheet.save(runtime_path)
            character_entries.append(
                {
                    "regionId": spec.region_id,
                    "id": asset_id,
                    "name": f"{region_name(spec.region_id)}·{spec.name}",
                    "asset": f"/assets/game/characters/art_team/all_regions/{asset_id}_walk.png",
                }
            )

    manifest["characters"] = character_entries


def save_runtime_preview() -> None:
    preview = Image.new("RGBA", (1200, 1120), (31, 29, 25, 255))
    draw = ImageDraw.Draw(preview)
    building_paths = sorted(BUILDING_OUT.glob("*.png"))
    prop_paths = sorted(PROP_OUT.glob("*.png"))

    x, y = 20, 18
    for index, path in enumerate(building_paths):
        img = Image.open(path).convert("RGBA")
        preview.alpha_composite(img, (x, y))
        x += 108
        if (index + 1) % 10 == 0:
            x = 20
            y += 104

    x, y = 20, 470
    for index, path in enumerate(prop_paths):
        img = Image.open(path).convert("RGBA")
        preview.alpha_composite(img, (x, y))
        x += 132
        if (index + 1) % 8 == 0:
            x = 20
            y += 118

    for index, path in enumerate(sorted(CHARACTER_OUT.glob("*.png"))):
        sheet = Image.open(path).convert("RGBA")
        frame = sheet.crop((0, 0, 48, 48))
        preview.alpha_composite(frame, (28 + (index % 11) * 104, 980))

    draw.rectangle((0, 0, preview.width - 1, preview.height - 1), outline=(126, 101, 62, 255), width=2)
    MANIFEST_DIR.mkdir(parents=True, exist_ok=True)
    preview.save(MANIFEST_DIR / "art_team_runtime_preview.png")


def write_ts_manifest(manifest: dict[str, object]) -> None:
    def dump(value: object) -> str:
        return json.dumps(value, ensure_ascii=False)

    lines = [
        "/* eslint-disable */",
        "// Generated by tools/slice_art_team_generated_assets.py. Do not edit by hand.",
        "",
        "export type RegionArtAssetRegionId =",
    ]
    for index, region in enumerate(REGIONS):
        sep = ";" if index == len(REGIONS) - 1 else " |"
        lines.append(f"  {dump(region.id)}{sep}")

    lines.extend(["", "export const REGION_ART_ASSET_REGIONS = ["])
    for region in REGIONS:
        lines.append(f"  {{ id: {dump(region.id)} as RegionArtAssetRegionId, name: {dump(region.name)} }},")
    lines.extend(["] as const;", ""])

    lines.extend(
        [
            "export const REGION_ART_TILE_DEFS: ReadonlyArray<{ regionId: RegionArtAssetRegionId; id: string; name: string; category: 'terrain' | 'road' | 'water'; asset: string; solid: boolean }> = [];",
            "",
        ]
    )

    lines.append("export const REGION_ART_BUILDING_DEFS = [")
    for item in manifest["buildings"]:
        lines.append(f"  {dump(item)},")
    lines.extend(["] as const;", ""])

    lines.append("export const REGION_ART_PROP_DEFS = [")
    for item in manifest["props"]:
        lines.append(f"  {dump(item)},")
    lines.extend(["] as const;", ""])

    lines.append("export const REGION_ART_CHARACTER_DEFS = [")
    for item in manifest["characters"]:
        lines.append(f"  {dump(item)},")
    lines.extend(["] as const;", ""])
    TS_OUT.write_text("\n".join(lines), encoding="utf-8")


def write_docs(manifest: dict[str, object]) -> None:
    panorama_rows = []
    for region in REGIONS:
        path = ART_ROOT / "03_panorama_concepts" / region.id / f"{region.id}_panorama_concept_v02.png"
        panorama_rows.append(f"| {region.name} `{region.id}` | `{path.relative_to(ROOT).as_posix()}` |")

    lines = [
        "# 美术组资源推进汇总",
        "",
        f"更新日期：{DATE_STAMP}",
        "",
        "## 本轮更正",
        "",
        "- 已停止使用脚本直接绘制主体美术；主体美术改为 `image_gen` 生成的精细像素源表与地区全景概念图。",
        "- 旧的简陋 `region_masters` 图标包已从 `public/assets` 清理，且不再进入新清单或编辑器入口。",
        "- 新运行素材只来自本轮精细像素源表切片，路径统一放入 `art_team/all_regions`。",
        "- 脚本仅负责抠绿、切片、尺寸归一、预览和编辑器清单生成。",
        "",
        "## 目录层级",
        "",
        f"- `public/assets/art_sources/art_team/{DATE_STAMP}/00_style_reference/`：当前画风参考。",
        f"- `public/assets/art_sources/art_team/{DATE_STAMP}/01_generated_sources/all_regions/`：`image_gen` 生成源表。",
        f"- `public/assets/art_sources/art_team/{DATE_STAMP}/01_generated_sources/npc_walks/`：`image_gen` 生成的地区 NPC 行走源表。",
        f"- `public/assets/art_sources/art_team/{DATE_STAMP}/02_cutouts/`：抠绿切片后的透明源件。",
        f"- `public/assets/art_sources/art_team/{DATE_STAMP}/03_panorama_concepts/`：11 区大视野全景概念图。",
        f"- `public/assets/art_sources/art_team/{DATE_STAMP}/05_manifests/`：manifest、运行预览与 QA 入口。",
        "- `public/assets/game/buildings/art_team/all_regions/`：编辑器可摆放建筑。",
        "- `public/assets/game/props/art_team/all_regions/`：编辑器可摆放道具。",
        "- `public/assets/game/characters/art_team/all_regions/`：编辑器可摆放 NPC 4x4 行走表。",
        "",
        "## 精细像素源表",
        "",
        "| 文件 | 用途 | 后处理 |",
        "|---|---|---|",
        f"| `public/assets/art_sources/art_team/{DATE_STAMP}/01_generated_sources/all_regions/all_regions_buildings_sheet_v02_chroma.png` | 11 区建筑 + 地区牌坊源表 | 4x3 抠绿切片，输出 22 个建筑运行 PNG |",
        f"| `public/assets/art_sources/art_team/{DATE_STAMP}/01_generated_sources/all_regions/all_regions_buildings_expansion_sheet_v01_chroma.png` | 11 区第二轮功能建筑扩充源表 | 4x3 抠绿切片，输出 11 个建筑运行 PNG |",
        f"| `public/assets/art_sources/art_team/{DATE_STAMP}/01_generated_sources/all_regions/all_regions_props_sheet_v02_chroma.png` | 工艺/生活/资源点道具源表 | 4x4 抠绿切片，输出 16 个道具运行 PNG |",
        f"| `public/assets/art_sources/art_team/{DATE_STAMP}/01_generated_sources/all_regions/all_regions_props_expansion_sheet_v01_chroma.png` | 地区工艺道具第二轮扩充源表 | 4x4 抠绿切片，输出 16 个道具运行 PNG |",
        f"| `public/assets/art_sources/art_team/{DATE_STAMP}/01_generated_sources/all_regions/all_regions_npc_lineup_v02_chroma.png` | 11 区 NPC 服饰与职业道具参考 | 切为参考透明 PNG，不直接当 4x4 行走表 |",
        f"| `public/assets/art_sources/art_team/{DATE_STAMP}/01_generated_sources/npc_walks/npc_walks_group_01_jiangnan_bashu_lingnan_v01_chroma.png` | 江南/巴蜀/岭南 NPC 4x4 行走源表 | 抠绿切片，输出 3 个 192x192 行走表 |",
        f"| `public/assets/art_sources/art_team/{DATE_STAMP}/01_generated_sources/npc_walks/npc_walks_group_02_qiandian_jingchu_ganpo_v01_chroma.png` | 黔滇/荆楚/赣鄱 NPC 4x4 行走源表 | 抠绿切片，输出 3 个 192x192 行走表 |",
        f"| `public/assets/art_sources/art_team/{DATE_STAMP}/01_generated_sources/npc_walks/npc_walks_group_03_huizhou_jingji_sanjin_v01_chroma.png` | 徽州/京畿/三晋 NPC 4x4 行走源表 | 抠绿切片，输出 3 个 192x192 行走表 |",
        f"| `public/assets/art_sources/art_team/{DATE_STAMP}/01_generated_sources/npc_walks/npc_walks_group_04_xueyu_xiyu_v01_chroma.png` | 雪域/西域 NPC 4x4 行走源表 | 抠绿切片，输出 2 个 192x192 行走表 |",
        "",
        "## 全景概念图",
        "",
        "| 地区 | 文件 |",
        "|---|---|",
        *panorama_rows,
        "",
        "## 编辑器接入",
        "",
        "- 生成脚本：`python tools/slice_art_team_generated_assets.py`",
        "- 生成清单：`src/data/regionArtAssets.generated.ts`",
        "- 地图编辑器入口：`http://127.0.0.1:5173/?editor=1`",
        "- 新素材 ID 前缀：`at_<region>_building_*`、`at_<region>_prop_*`、`at_<region>_npc_*`。",
        "",
        "## 数量",
        "",
        f"- 建筑运行 PNG：{len(manifest['buildings'])}",
        f"- 道具运行 PNG：{len(manifest['props'])}",
        f"- NPC 4x4 行走表：{len(manifest['characters'])}",
        f"- NPC 参考切片：{len(manifest['npcReferences'])}",
        f"- 地区全景概念图：{len(REGIONS)}",
        "",
        "## 后续可选方向",
        "",
        "- 下一阶段可继续按新 `image_gen` 管线扩展地貌/地表 tile 与季节变体；本轮已完成建筑、道具、NPC 与全景概念图的基础覆盖和第二轮建筑/道具扩充。",
    ]
    DOC_OUT.write_text("\n".join(lines) + "\n", encoding="utf-8")


def write_json_manifest(manifest: dict[str, object]) -> None:
    MANIFEST_DIR.mkdir(parents=True, exist_ok=True)
    (MANIFEST_DIR / "asset_manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def validate_outputs() -> None:
    checks = [
        BUILDING_OUT / "at_jiangnan_building_signature_water_workshop.png",
        BUILDING_OUT / "at_xiyu_building_signature_oasis_jade_bazaar.png",
        BUILDING_OUT / "at_sanjin_building_expansion_ticket_lacquer_storehouse.png",
        PROP_OUT / "at_jiangnan_prop_black_awning_boat_market.png",
        PROP_OUT / "at_xueyu_prop_pigment_grinding_table.png",
        PROP_OUT / "at_sanjin_prop_abacus_ticket_chest.png",
        CHARACTER_OUT / "at_jiangnan_npc_guide_water_dyer_walk.png",
        CHARACTER_OUT / "at_xiyu_npc_guide_oasis_jade_walk.png",
        MANIFEST_DIR / "art_team_runtime_preview.png",
        TS_OUT,
        DOC_OUT,
    ]
    for path in checks:
        if not path.exists():
            raise RuntimeError(f"Missing output: {path}")
        if path.suffix == ".png":
            img = Image.open(path).convert("RGBA")
            if img.getchannel("A").getbbox() is None:
                raise RuntimeError(f"Empty alpha output: {path}")


def main() -> None:
    manifest: dict[str, object] = {
        "date": DATE_STAMP,
        "pipeline": "image_gen source sheets -> chroma key -> transparent cutouts -> runtime PNG -> map editor manifest",
        "regions": [region.__dict__ for region in REGIONS],
        "sourceDir": str(SOURCE_DIR.relative_to(ROOT)).replace("\\", "/"),
    }
    save_buildings(manifest)
    save_props(manifest)
    save_npc_references(manifest)
    save_npc_walks(manifest)
    save_runtime_preview()
    write_ts_manifest(manifest)
    write_json_manifest(manifest)
    write_docs(manifest)
    validate_outputs()
    print(f"art-team image_gen assets sliced under {ART_ROOT}")


if __name__ == "__main__":
    main()
