/**
 * 大地图布局 —— 各地区在全国地图上的近似坐标（百分比，0–100）。
 * 与 RegionDef 解耦：只描述「画在哪」，不影响引擎结算。
 * 新增地区后在此补一条坐标即可在大地图上出现。
 */
export const REGION_MAP_POS: Record<string, { x: number; y: number }> = {
  xiyu: { x: 20, y: 26 }, // 西域（新疆）
  xueyu: { x: 22, y: 52 }, // 雪域高原（西藏）
  bashu: { x: 42, y: 50 }, // 巴蜀（四川）
  qiandian: { x: 42, y: 66 }, // 黔滇（云贵）
  sanjin: { x: 56, y: 32 }, // 三晋（山西）
  jingji: { x: 64, y: 27 }, // 京畿（华北）
  jingchu: { x: 55, y: 54 }, // 荆楚（两湖）
  ganpo: { x: 63, y: 60 }, // 赣鄱（江西）
  huizhou: { x: 64, y: 48 }, // 徽州（皖南）
  jiangnan: { x: 73, y: 49 }, // 江南（江浙）
  lingnan: { x: 59, y: 72 }, // 岭南（广东）
};
