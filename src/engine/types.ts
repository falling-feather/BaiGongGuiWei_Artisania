/**
 * 核心类型定义 —— 整个游戏的「词汇表」。
 * 这是 engine 层的根基，UI / data / store 都依赖这些类型。
 * 原则：只描述「是什么」，不包含任何运行逻辑。
 */

/** 四维数值的键 */
export type MetricKey = 'heritage' | 'market' | 'life' | 'spirit';

/** 四维数值：传承度 / 市场度 / 生活度 / 精神度，取值 0–100 */
export type Metrics = Record<MetricKey, number>;

/** 数值健康区间评价 */
export type MetricZone = 'crisis' | 'low' | 'healthy' | 'high' | 'excess';

/** 资源池（原料/货币等），用字符串键便于数据驱动扩展 */
export type ResourcePool = Record<string, number>;

/** 工序节点：一门手艺工艺流程链上的一步 */
export interface ProcessStep {
  id: string;
  name: string;
  description: string;
  /** 执行该工序消耗的资源 */
  resourceCost: ResourcePool;
  /** 执行该工序消耗的人力（工时点数） */
  laborCost: number;
  /** 正常执行对四维的影响 */
  metricImpact: Partial<Metrics>;
  /** 是否可被省略/简化 */
  skippable: boolean;
  /** 若省略该工序对四维的影响（通常市场↑、传承/精神↓） */
  skipImpact?: Partial<Metrics>;
}

/** 手艺定义（静态数据，来自 src/data） */
export interface Craft {
  id: string;
  name: string;
  /** 所属地域（省份 / 文化区） */
  region: string;
  /** 一句话简介 */
  blurb: string;
  /** 依赖的原料资源键列表 */
  resources: string[];
  /** 工艺流程链 */
  processChain: ProcessStep[];
  /** 该手艺的初始四维基线 */
  baseMetrics: Metrics;
  /** 联动标签，用于跨手艺组合匹配 */
  synergyTags: string[];
  /** 传承风险描述（用于事件/提示） */
  risks: string[];
}

/** 学徒性格特质 */
export type ApprenticeTrait = 'steady' | 'clever' | 'restless' | 'devout';

/** 学徒 / 匠人实例 */
export interface Apprentice {
  id: string;
  name: string;
  trait: ApprenticeTrait;
  /** 当前所学手艺 id，可为空（未入门） */
  craftId: string | null;
  /** 熟练度 0–100 */
  skill: number;
  /** 留存意愿 0–100，过低会离开 */
  morale: number;
}

/** 一种游戏行动产生的结构化效果 */
export interface GameEffect {
  metrics?: Partial<Metrics>;
  resources?: ResourcePool;
  /** 影响指定手艺的四维（craftId -> 影响） */
  craftMetrics?: Record<string, Partial<Metrics>>;
  /** 追加到事件/操作日志的文本 */
  logMessage?: string;
}

/** 事件中的一个选项 */
export interface EventChoice {
  id: string;
  label: string;
  effect: GameEffect;
}

/** 随机事件卡 */
export interface GameEvent {
  id: string;
  title: string;
  description: string;
  choices: EventChoice[];
  /** 权重，影响被抽中的概率 */
  weight: number;
}

/** 某门手艺在一局游戏中的动态状态 */
export interface CraftState {
  craftId: string;
  metrics: Metrics;
  /** 是否已对玩家解锁 */
  unlocked: boolean;
  /** 累计产出的产品数 */
  produced: number;
}

/** 游戏整体状态机 —— 单一事实来源（Single Source of Truth） */
export interface GameState {
  /** 随机种子，保证可重放 */
  seed: number;
  turn: number;
  maxTurns: number;
  /** 镇级聚合四维 */
  metrics: Metrics;
  resources: ResourcePool;
  crafts: CraftState[];
  apprentices: Apprentice[];
  /** 当前待玩家处理的事件，null 表示无 */
  pendingEvent: GameEvent | null;
  /** 操作 / 事件日志（最新在前） */
  log: string[];
  status: 'playing' | 'ended';
  /** 结局报告，仅在 status==='ended' 时存在 */
  report: GameReport | null;
}

/** 结局命运报告 */
export interface GameReport {
  title: string;
  summary: string;
  finalMetrics: Metrics;
  survivingCrafts: string[];
  highlights: string[];
}

/** 所有可派发的行动（被 reducer 消费） */
export type GameAction =
  | { type: 'NEW_GAME'; seed?: number }
  | { type: 'RUN_PROCESS'; craftId: string; skipStepIds: string[] }
  | { type: 'TAKE_ORDER'; craftId: string }
  | { type: 'HOLD_EXHIBITION' }
  | { type: 'RESOLVE_EVENT'; choiceId: string }
  | { type: 'END_TURN' };
