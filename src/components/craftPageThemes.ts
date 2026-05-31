/**
 * 工艺独立页·主题注册表（页面框架）。
 * 设计原则：**所有手艺都走整页工坊**（不再回退弹窗）。
 *   - 在 CRAFT_PAGE_THEMES 显式登记者 → 使用精心撰写的「定制主题」（叙事/要诀/配色）。
 *   - 未登记者 → 由 buildDefaultTheme 依据 crafts.ts 数据**自动生成通用整页主题**，
 *     使任何地区（江南、黔滇、西域、雪域……）新增的手艺都立即拥有自己的网页。
 *
 * 逐页精修：为某手艺在 CRAFT_PAGE_THEMES 增补一条即可覆盖默认主题，无需改动 App / 引擎。
 * 美术占位 art* 字段为将来替换真实立绘/背景的挂载点（见《美术资源设计》）。
 */
import { CRAFT_INDEX } from '../data/crafts';

export interface CraftPageTheme {
  /** 页面主色（hex），用于页面渐变背景 */
  accent: string;
  /** 一句话标语 */
  tagline: string;
  /** 工坊场景文案段落 */
  story: string[];
  /** 上手要诀 */
  tips: string[];
  /** 美术占位说明（将来替换为立绘/背景图的位置标识） */
  artHeroNote: string;
}

export const CRAFT_PAGE_THEMES: Record<string, CraftPageTheme> = {
  'indigo-dyeing': {
    accent: '#3a5a8c',
    tagline: '一缸靛蓝，扎出山水间的深浅纹路',
    story: [
      '推门入坊，染缸的发酵气扑面而来。架上垂着深浅不一的蓝布，风一吹，像被染过的天色。',
      '老染匠说：蓝染最难的是养缸——缸是活的，要看温度、看气味、看泡沫，急不得也偷不得懒。',
      '你卷起袖子，取一块白布，跟着学扎结、入缸、提色——蓝是反复浸出来的，不是一次成的。',
    ],
    tips: [
      '核心工序不可省略：缸没养好就染不出正蓝，浸染不够色就浮在表面。',
      '勾选「可省略」工序能提产增收，但会折损传承与精神。',
      '先「亲手制作」攒出成品库存，再「接订单」交付换取市场收入。',
    ],
    artHeroNote: '蓝染工坊·主视觉（染缸/晾布立绘待绘）',
  },
  'bamboo-weaving': {
    accent: '#6f8b52',
    tagline: '一竹一篾，编出江南的细密时光',
    story: [
      '推门入坊，满室竹青气。墙上挂着尚未成形的竹篮骨架，地上散着劈得纤细如发的篾丝。',
      '老篾匠说：竹编不靠巧，靠的是手上反复。劈、刮、起底、收口，一步都急不得。',
      '你坐下，拿起一根青竹，学着把它劈成均匀的细丝——这是一切的开始。',
    ],
    tips: [
      '核心工序不可省略：省了底就散，省了收口就垮。',
      '勾选「可省略」工序能提产增收，但会折损传承与精神。',
      '先「亲手制作」攒出成品库存，再「接订单」交付换取市场收入。',
    ],
    artHeroNote: '竹编工坊·主视觉（立绘/背景待绘）',
  },
};

export function hasCraftPage(id: string | null | undefined): boolean {
  return !!getCraftPageTheme(id);
}

/** 依据某地区色板/手艺名取一个稳定的主色（无定制主题时的兜底配色） */
function pickAccent(craftId: string): string {
  const PALETTE = ['#6f8b52', '#3a5a8c', '#a6622b', '#5a6f8c', '#7a6a52', '#8c5a7a', '#4a7a6a'];
  let h = 0;
  for (let i = 0; i < craftId.length; i++) h = (h * 31 + craftId.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

/**
 * 通用整页主题生成器：未在 CRAFT_PAGE_THEMES 登记的手艺由此自动获得一份整页内容，
 * 取材自 crafts.ts 的名称/产地/简介/工序链，保证「任意地区的工艺都有自己的网页」。
 */
function buildDefaultTheme(craftId: string): CraftPageTheme | null {
  const def = CRAFT_INDEX[craftId];
  if (!def) return null;
  const coreSteps = def.processChain.filter((s) => !s.skippable).map((s) => s.name);
  return {
    accent: pickAccent(craftId),
    tagline: def.blurb,
    story: [
      `推门入坊，${def.name}的气息扑面而来。这门手艺流传于${def.region}，${def.blurb}`,
      coreSteps.length
        ? `老师傅说：${def.name}讲究耐心与火候——${coreSteps.join('、')}，每一步都偷不得懒。`
        : `老师傅说：${def.name}讲究耐心与火候，每一步都偷不得懒。`,
      '你静下心，跟着学起来——手上的功夫，是日复一日磨出来的。',
    ],
    tips: [
      '核心工序不可省略：省了关键步骤，成器便失了魂。',
      '勾选「可省略」工序能提产增收，但会折损传承与精神。',
      '先「亲手制作」攒出成品库存，再「接订单」交付换取市场收入。',
    ],
    artHeroNote: `${def.name}工坊·主视觉（立绘/背景待绘）`,
  };
}

/**
 * 取某手艺的整页主题：优先用定制主题，否则按数据自动生成；
 * 仅当 craftId 在 crafts.ts 中不存在时返回 null。
 */
export function getCraftPageTheme(id: string | null | undefined): CraftPageTheme | null {
  if (!id) return null;
  return CRAFT_PAGE_THEMES[id] ?? buildDefaultTheme(id);
}
