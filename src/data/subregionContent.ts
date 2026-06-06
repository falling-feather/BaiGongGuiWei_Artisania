import type { Craft, IndustryDef, RegionDef, SubregionContentSpec } from '../engine/types';
import { CRAFT_INDEX } from './crafts';
import { localIndustriesForRegion } from './regionEconomy';

function sub(
  regionId: string,
  subregionId: string,
  industryIds: string[],
  craftIds: string[],
): SubregionContentSpec {
  return { regionId, subregionId, industryIds, craftIds };
}

export const SUBREGION_CONTENT: SubregionContentSpec[] = [
  sub('jiangnan', 'jiangnan-suhang', ['harvest-indigo', 'build-indigo', 'harvest-bamboo', 'split-bamboo'], ['indigo-dyeing', 'bamboo-weaving']),
  sub('jiangnan', 'jiangnan-jinling', ['harvest-cocoon', 'sericulture', 'weave-brocade'], ['kesi']),
  sub('jiangnan', 'jiangnan-linan', ['harvest-tea-leaf', 'pick-tea', 'harvest-bamboo', 'split-bamboo'], ['oilpaper-umbrella']),
  sub('jiangnan', 'jiangnan-longquan', ['harvest-iron-ore', 'harvest-coal', 'smelt-iron', 'harvest-kaolin', 'mine-kaolin', 'forge-sword'], ['celadon', 'longquan-sword']),
  sub('jiangnan', 'jiangnan-taihu', ['harvest-cocoon', 'sericulture', 'weave-brocade'], ['kesi', 'oilpaper-umbrella']),
  sub('jiangnan', 'jiangnan-baigongyuan', [], ['indigo-dyeing', 'bamboo-weaving']),

  sub('bashu', 'bashu-jinli', [], ['shu-brocade', 'shu-embroidery', 'chengdu-lacquer']),
  sub('bashu', 'bashu-bamboo-sea', ['harvest-bamboo', 'split-bamboo', 'harvest-tea-leaf', 'pick-tea'], ['qingshen-bamboo']),
  sub('bashu', 'bashu-linqiong-iron', ['harvest-iron-ore', 'smelt-iron'], []),
  sub('bashu', 'bashu-tea-horse', ['harvest-tea-leaf', 'pick-tea'], []),

  sub('lingnan', 'lingnan-harbor', ['harvest-cocoon', 'sericulture'], ['canton-embroidery', 'zhuang-brocade']),
  sub('lingnan', 'lingnan-forge', ['harvest-iron-ore', 'smelt-iron'], []),
  sub('lingnan', 'lingnan-gambiered-yard', ['harvest-cocoon', 'sericulture'], ['gambiered-silk']),
  sub('lingnan', 'lingnan-duan-stone', [], ['duan-inkstone', 'shiwan-pottery']),

  sub('qiandian', 'qiandian-miao-village', ['harvest-silver-ore', 'refine-silver', 'harvest-indigo', 'build-indigo'], ['miao-silver', 'batik', 'wutong-silver', 'indigo-dyeing']),
  sub('qiandian', 'qiandian-tea-road', ['harvest-tea-leaf', 'pick-tea'], []),
  sub('qiandian', 'qiandian-dongchuan-copper', ['harvest-copper-ore', 'smelt-copper'], ['jianshui-pottery']),

  sub('jingchu', 'jingchu-lake-market', [], ['tujia-brocade']),
  sub('jingchu', 'jingchu-mine-yard', ['harvest-copper-ore', 'harvest-iron-ore', 'smelt-copper', 'smelt-iron'], []),
  sub('jingchu', 'jingchu-chu-lacquer', ['harvest-lacquer', 'tap-lacquer'], ['chu-lacquer']),
  sub('jingchu', 'jingchu-xiang-embroidery', ['harvest-cocoon', 'sericulture'], ['xiang-embroidery']),

  sub('ganpo', 'ganpo-kiln-town', ['harvest-kaolin', 'mine-kaolin'], ['jingdezhen-porcelain']),
  sub('ganpo', 'ganpo-kaolin-hill', ['harvest-kaolin', 'mine-kaolin'], []),
  sub('ganpo', 'ganpo-river-wood', ['harvest-coal'], ['xiabu']),

  sub('huizhou', 'huizhou-ink-alley', ['harvest-pine-soot', 'make-ink'], ['hui-ink']),
  sub('huizhou', 'huizhou-paper-valley', ['harvest-qingtan', 'make-paper', 'harvest-tea-leaf', 'pick-tea'], ['xuan-paper']),
  sub('huizhou', 'huizhou-she-stone', [], ['she-inkstone']),
  sub('huizhou', 'huizhou-merchant-hall', ['harvest-tea-leaf', 'pick-tea'], ['hui-carving']),

  sub('jingji', 'jingji-palace-yard', ['harvest-iron-ore', 'harvest-pigment', 'smelt-iron'], ['cloisonne', 'filigree', 'carved-lacquer']),
  sub('jingji', 'jingji-market-gate', [], ['inner-painting']),
  sub('jingji', 'jingji-official-gate', [], []),

  sub('sanjin', 'sanjin-piaohao', [], ['jin-furniture']),
  sub('sanjin', 'sanjin-coal-yard', ['harvest-coal', 'harvest-iron-ore', 'smelt-iron'], []),
  sub('sanjin', 'sanjin-lacquer-yard', ['harvest-lacquer', 'tap-lacquer'], ['pingyao-lacquer']),
  sub('sanjin', 'sanjin-vinegar-yard', [], ['aged-vinegar']),

  sub('xueyu', 'xueyu-thangka-court', ['harvest-pigment', 'grind-pigment', 'make-paper'], ['thangka', 'tibetan-paper', 'tibetan-incense']),
  sub('xueyu', 'xueyu-snow-pass', [], []),
  sub('xueyu', 'xueyu-pigment-valley', ['harvest-pigment', 'grind-pigment'], []),
  sub('xueyu', 'xueyu-silver-tent', ['harvest-silver-ore', 'refine-silver'], ['tibetan-silver']),

  sub('xiyu', 'xiyu-bazaar', ['harvest-cocoon', 'sericulture'], ['carpet', 'copperware']),
  sub('xiyu', 'xiyu-jade-yard', ['harvest-copper-ore', 'smelt-copper'], ['jade-carving']),
  sub('xiyu', 'xiyu-caravan-post', [], []),
  sub('xiyu', 'xiyu-atlas-loom', ['harvest-cocoon', 'sericulture'], ['atlas-silk']),
];

export const SUBREGION_CONTENT_INDEX: Record<string, SubregionContentSpec> = Object.fromEntries(
  SUBREGION_CONTENT.map((entry) => [entry.subregionId, entry]),
);

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}

export function subregionContentFor(
  regionId: string,
  subregionId: string,
  entries: SubregionContentSpec[] = SUBREGION_CONTENT,
): SubregionContentSpec | null {
  return entries.find((entry) => entry.regionId === regionId && entry.subregionId === subregionId) ?? null;
}

export function localIndustriesForSubregion(
  region: RegionDef | undefined,
  subregionId: string | undefined,
  industries: IndustryDef[],
  entries: SubregionContentSpec[] = SUBREGION_CONTENT,
): IndustryDef[] {
  const regional = localIndustriesForRegion(region, industries);
  if (!region || !subregionId) return regional;
  const entry = subregionContentFor(region.id, subregionId, entries);
  if (!entry) return regional;
  const allowed = new Set(entry.industryIds);
  return regional.filter((industry) => allowed.has(industry.id));
}

export function craftIdsForSubregion(
  region: RegionDef | undefined,
  subregionId: string | undefined,
  entries: SubregionContentSpec[] = SUBREGION_CONTENT,
): string[] {
  if (!region) return [];
  const entry = subregionId ? subregionContentFor(region.id, subregionId, entries) : null;
  const allowedIds = entry ? entry.craftIds : region.signatureCrafts;
  const regional = new Set(region.signatureCrafts);
  return unique(allowedIds).filter((id) => regional.has(id) && Boolean(CRAFT_INDEX[id]));
}

export function craftsForSubregion(
  region: RegionDef | undefined,
  subregionId: string | undefined,
  entries: SubregionContentSpec[] = SUBREGION_CONTENT,
): Craft[] {
  return craftIdsForSubregion(region, subregionId, entries)
    .map((id) => CRAFT_INDEX[id])
    .filter((craft): craft is Craft => Boolean(craft));
}
