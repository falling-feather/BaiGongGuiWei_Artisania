/**
 * 工艺独立页·主题注册表（页面框架）。
 * 每门手艺可在此登记一份「页面主题」内容：标语、工坊story、要诀、美术占位。
 * 已登记的手艺会以「整页工坊」呈现（替代弹窗）；未登记的回退到通用弹窗。
 *
 * 后续逐页设计：为某手艺新增条目即可，无需改动 App / 引擎。
 * 美术占位 art* 字段为将来替换真实立绘/背景的挂载点（见《美术资源设计》）。
 */
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
  return !!id && id in CRAFT_PAGE_THEMES;
}
