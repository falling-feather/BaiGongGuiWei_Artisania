/**
 * 产业整页·主题生成器。
 * 与手艺整页（craftPageThemes）对称：把「开矿/精炼/研磨」等产业点也呈现为**全屏整页**，
 * 不再用小弹窗。每条产业依据 industries.ts 的数据自动生成一份整页内容
 * （叙事/要诀/配色/层级），使任意地区的产业点都拥有统一的网页体验。
 *
 * 逐页精修：如需为某产业撰写定制文案，可在 INDUSTRY_PAGE_THEMES 增补一条覆盖默认。
 */
import type { IndustryDef, MiniGameType } from '../engine';
import { INDUSTRY_INDEX, RESOURCE_INDEX } from '../data';

export type IndustryTierKey = 'harvest' | 'refine' | 'product';

export interface IndustryPageTheme {
  accent: string;
  tierLabel: string;
  tagline: string;
  story: string[];
  tips: string[];
  heroImage?: string;
  heroAlt: string;
}

/** 定制主题（可选）：登记者覆盖自动生成。当前留空，全部走自动主题。 */
export const INDUSTRY_PAGE_THEMES: Record<string, IndustryPageTheme> = {};

const ACCENT_BY_GAME: Record<MiniGameType, string> = {
  rhythm: '#a6622b',
  drag_path: '#4a7a6a',
  ratio_mix: '#3a5a8c',
  timing_hold: '#a6342b',
  aim_place: '#8c5a7a',
  repeat_endure: '#5a6f52',
};

const GAME_HINT: Record<MiniGameType, string> = {
  rhythm: '看准指针往复，于中点连续落手，命中越正成色越高。',
  drag_path: '沿引导轨迹稳稳运笔／拖拽，线越顺品相越好。',
  ratio_mix: '调和配比，越接近目标火候越足。',
  timing_hold: '把控火候时机，在恰当一刻松手，过犹不及。',
  aim_place: '定位摆放／落点，越准越见功力。',
  repeat_endure: '稳住节律反复操作，耐心攒满才出好货。',
};

/** 依据「输入是否为空 / 产出资源层级」推断产业层级 */
export function industryTierKey(ind: IndustryDef): IndustryTierKey {
  if (Object.keys(ind.input).length === 0) return 'harvest';
  return RESOURCE_INDEX[ind.output]?.tier === 'product' ? 'product' : 'refine';
}

const TIER_LABEL: Record<IndustryTierKey, string> = {
  harvest: '采集',
  refine: '精炼',
  product: '制作',
};

const TIER_STORY: Record<IndustryTierKey, (n: string) => string> = {
  harvest: (n) => `这是供应链的源头活计——${n}。靠的是脚力与眼力，从山林水土间取出最初的原料。`,
  refine: (n) => `这是承上启下的精炼活——${n}。把粗料炼成可用的半成品，火候与配比皆是讲究。`,
  product: (n) => `这是供应链的终端制作——${n}。材料在此汇成成品，是一整条工序链的收束。`,
};

function buildDefaultTheme(industryId: string): IndustryPageTheme | null {
  const ind = INDUSTRY_INDEX[industryId];
  if (!ind) return null;
  const tier = industryTierKey(ind);
  const outName = RESOURCE_INDEX[ind.output]?.name ?? ind.output;
  return {
    accent: ACCENT_BY_GAME[ind.miniGame],
    tierLabel: TIER_LABEL[tier],
    tagline: ind.blurb,
    story: [
      TIER_STORY[tier](ind.name),
      `坊中各样工具齐备，案上备着所需之物，只待你亲手做出一批${outName}。`,
      '手上的火候与节奏，决定了成色高下——静下心，开始吧。',
    ],
    tips: [
      GAME_HINT[ind.miniGame],
      '成色越高，单次产出越多（上品＞良品＞次品）。',
      '每次操作消耗工时，结束本季可恢复。',
    ],
    heroAlt: `${ind.name}工坊场景`,
  };
}

/** 取某产业的整页主题：优先定制，否则自动生成；id 不存在时返回 null。 */
export function getIndustryPageTheme(id: string | null | undefined): IndustryPageTheme | null {
  if (!id) return null;
  return INDUSTRY_PAGE_THEMES[id] ?? buildDefaultTheme(id);
}
