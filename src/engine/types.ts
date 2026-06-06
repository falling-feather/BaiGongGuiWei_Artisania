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
  /** 一批工艺产出的成品资源键（product 层）。供应链终端，缺省则不产实物。 */
  outputResourceId?: string;
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
  /** 写入的叙事标记（供后续剧情分支读取） */
  setFlags?: string[];
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

/**
 * 剧情节点（叙事卡）。与随机事件不同：由状态条件触发、只呈现一次。
 * `lines` 里的 `{name}` 占位符会被玩家名号替换。
 * 可选 `choices`：玩家的选择会写入叙事标记，从而决定后续剧情分支；无 choices 时仅一个「继续」。
 */
export interface StoryChoice {
  id: string;
  label: string;
  /** 选中后写入的叙事标记 */
  setFlags?: string[];
  /** 选中后追加的日志文本（支持 {name} 占位符） */
  logMessage?: string;
}

export interface StoryBeat {
  id: string;
  title: string;
  lines: string[];
  /** 该节点是否应出现（纯函数，只读 GameState） */
  trigger: (state: GameState) => boolean;
  /** 可选的分支选项；省略则为单按钮「继续」 */
  choices?: StoryChoice[];
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

export type PlayerAttributeKey =
  | 'craft'
  | 'knowledge'
  | 'people'
  | 'commerce'
  | 'stamina'
  | 'mind';

export type PlayerAttributes = Record<PlayerAttributeKey, number>;

export interface PlayerProfile {
  /** 玩家当前社会评价阶段：0 粗手生人 -> 5 神匠 */
  titleRank: number;
  title: string;
  attributes: PlayerAttributes;
  attributeXp: PlayerAttributes;
}

export type TimePhase = 'dawn' | 'morning' | 'afternoon' | 'dusk' | 'night';
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export type GameWeather = 'clear' | 'rain' | 'snow';

export interface CalendarState {
  day: number;
  season: Season;
  phase: TimePhase;
  weather: GameWeather;
}

export type RelationshipStage = 'stranger' | 'familiar' | 'trusted' | 'confidant';

export interface NpcRuntimeState {
  affinity: number;
  stage: RelationshipStage;
  talks: number;
  lastTalkTurn: number;
  lastGreetingIndex: number;
  knownTopics: string[];
  revealedIntelIds?: string[];
  usedFunctionDays?: Partial<Record<NpcFunctionKind, number>>;
}

export type CropId = 'indigo' | 'mulberry' | 'tea';

export interface FarmPlot {
  id: string;
  cropId: CropId | null;
  plantedDay: number | null;
  growth: number;
  wateredToday: boolean;
}

export type ActivityKind =
  | 'resource'
  | 'workshop'
  | 'training'
  | 'trade'
  | 'life'
  | 'festival'
  | 'route';

export type ActivityMiniGameType =
  | MiniGameType
  | 'couplet_choice'
  | 'calligraphy_trace'
  | 'crop_calendar'
  | 'appraise_select'
  | 'route_plan'
  | 'dialogue_check';

export interface ActivityReward {
  resources?: ResourcePool;
  metrics?: Partial<Metrics>;
  attributes?: Partial<PlayerAttributes>;
  flags?: string[];
  /** 完成活动后写入的路线情报，供 NPC 见闻/路线面板/后续门槛读取 */
  routeIds?: string[];
  /** 覆盖默认 NPC 好感增量；缺省按活动类型与挑战质量计算 */
  npcAffinity?: number;
  descriptorTags?: string[];
}

export interface ActivityDef {
  id: string;
  regionId: string;
  subregionId: string;
  name: string;
  kind: ActivityKind;
  blurb: string;
  detail: string;
  npcId?: string;
  miniGames: ActivityMiniGameType[];
  laborCost: number;
  resourceCost?: ResourcePool;
  reward: ActivityReward;
  /** 可进行的时段；缺省表示全天可进行 */
  availablePhases?: TimePhase[];
  evaluationId?: string;
  once?: boolean;
}

export interface ActivityChallengeChoice {
  id: string;
  label: string;
  quality: number;
  feedback: string;
}

export interface ActivityChallengeDef {
  id: string;
  activityId: string;
  miniGame: ActivityMiniGameType;
  title: string;
  prompt: string;
  choices: ActivityChallengeChoice[];
}

export interface RouteRequirement {
  coin?: number;
  flags?: string[];
  completedActivities?: string[];
  completedQuests?: string[];
  attributes?: Partial<PlayerAttributes>;
}

export interface RouteSpec {
  id: string;
  fromRegionId: string;
  toRegionId: string;
  name: string;
  mode: 'water' | 'road' | 'mountain' | 'caravan' | 'official';
  unlockHint: string;
  unlockCost?: number;
  preview?: string;
  requirements?: RouteRequirement;
}

export interface RegionContentSpec {
  regionId: string;
  routes: RouteSpec[];
  mainNpcIds: string[];
  activityIds: string[];
}

export interface SubregionContentSpec {
  regionId: string;
  subregionId: string;
  industryIds: string[];
  craftIds: string[];
}

export type ItemQualityDimension =
  | 'purity'
  | 'grain'
  | 'hardness'
  | 'resilience'
  | 'spirit'
  | 'form'
  | 'handling'
  | 'sharpness'
  | 'finish'
  | 'merchantTrust';

export interface ItemDescriptorRule {
  id: string;
  label: string;
  resourceIds?: string[];
  craftIds?: string[];
  tags?: string[];
  dimensions: Partial<Record<ItemQualityDimension, string[]>>;
  templates: string[];
}

export interface ItemInstance {
  id: string;
  resourceId: string;
  sourceCraftId?: string;
  sourceActivityId?: string;
  sourceIndustryId?: string;
  sourceItemIds?: string[];
  originRegionId: string;
  originSubregionId: string;
  createdTurn: number;
  quality: number;
  descriptors: string[];
  appraisal: string;
  displayName?: string;
  authorName?: string;
  collaboratorNpcIds?: string[];
  inscription?: string;
  status?: 'held' | 'displayed' | 'gifted';
  giftedToNpcId?: string;
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
  /** 玩家这个人的成长档案：属性、称号、经验 */
  profile: PlayerProfile;
  /** 日 / 时段 / 季节 / 天气，服务江南 7 日生活切片 */
  calendar: CalendarState;
  /** 城郊百工院的轻量田圃槽位 */
  farmPlots: FarmPlot[];
  /** 可检查的成品/原料实例，用于古风描述、鉴别与后续赠礼/订单系统 */
  itemInstances: ItemInstance[];
  /** 已解锁的地区 id 列表（地区优先世界） */
  unlockedRegions: RegionId[];
  /** 玩家当前所在地区 id（采料/产业在此地进行） */
  currentRegion: RegionId;
  /** 玩家当前所在的小地区 id（同一大地区内的可探索地点） */
  currentSubregion: string;
  /** 已解锁的成就 id 列表 */
  achievements: string[];
  /** 已呈现过的剧情节点 id（每个只出现一次） */
  seenStory: string[];
  /** 叙事标记（事件/剧情选择写入，驱动剧情分支） */
  flags: string[];
  /** 玩家名（开局输入，影响后续剧情系统） */
  playerName: string;
  /** 开发者模式：资源无限、全量解锁 */
  devMode: boolean;
  /** 各 NPC 好感度（npcId -> 0–100），缺省视为 0 */
  npcAffinity: Record<string, number>;
  /** NPC 运行态：关系阶段、交谈次数、最近一次对话等 */
  npcStates: Record<string, NpcRuntimeState>;
  /** 已完成的任务 id 列表 */
  completedQuests: string[];
  /** 已完成的一次性地区活动 id 列表 */
  completedActivities: string[];
  /** 已接取或完成的 NPC 订单 */
  activeOrders: ActiveOrder[];
}

// ───────────────────────────────────────────────────────────────────────────
// NPC · 好感度 · 任务（街市人物系统，规划 §人物）
// ───────────────────────────────────────────────────────────────────────────

/** NPC 角色类别：游客（随机游走）/ 关联人物（驻守店铺，承载剧情任务） */
export type NpcRole = 'tourist' | 'vendor';

export interface NpcScheduleRule {
  phase: TimePhase | 'any';
  subregionId: string;
  anchorCraftId?: string;
  note?: string;
}

export type NpcFunctionKind = 'mentor' | 'quest' | 'route' | 'order' | 'collab' | 'appraisal' | 'homeVisit';

export interface NpcGiftPreference {
  label: string;
  resourceIds?: string[];
  craftIds?: string[];
  descriptorIncludes?: string[];
  originRegionIds?: string[];
  minQuality?: number;
  affinityBonus: number;
}

export interface NpcIntelDef {
  id: string;
  title: string;
  body: string;
  unlockAffinity: number;
  topics?: string[];
  routeIds?: string[];
  setFlags?: string[];
}

/** NPC 定义（静态数据，来自 src/data/npcs.ts） */
export interface NpcDef {
  id: string;
  name: string;
  role: NpcRole;
  regionId: string;
  subregionId?: string;
  profession?: string;
  personality?: string;
  knowledgeTags?: string[];
  functions?: NpcFunctionKind[];
  preferences?: NpcGiftPreference[];
  intel?: NpcIntelDef[];
  relationshipLines?: Partial<Record<RelationshipStage, string[]>>;
  personalDilemma?: string;
  endingInfluence?: string;
  schedule?: NpcScheduleRule[];
  /** vendor 关联的手艺点 id（驻守其旁） */
  anchorCraftId?: string;
  /** 寒暄台词池（对话时随机选一句） */
  greetings: string[];
}

/** 任务奖励 */
export interface QuestReward {
  coin?: number;
  /** 指定资源键 -> 数量 */
  resources?: ResourcePool;
  /** 镇级四维变化 */
  metrics?: Partial<Metrics>;
  /** 玩家属性变化 */
  attributes?: Partial<PlayerAttributes>;
  /** 写入叙事标记 */
  flags?: string[];
  /** 自动为一件合格作品题跋 */
  inscribe?: {
    resourceIds?: string[];
    minQuality?: number;
    collaboratorNpcId?: string;
    inscription: string;
  };
}

/** 任务定义（数据驱动；condition 为纯函数，满足即可交付） */
export interface QuestDef {
  id: string;
  /** 发布任务的 NPC id */
  npcId: string;
  title: string;
  desc: string;
  /** 解锁该任务所需的最低好感度（对 npcId） */
  requireAffinity: number;
  /** 是否满足交付条件（只读当前状态） */
  condition: (state: GameState) => boolean;
  /** 交付时消耗的资源 */
  cost?: ResourcePool;
  /** 交付奖励 */
  reward: QuestReward;
  /** 完成后追加的日志（支持 {name} 占位符） */
  completeLog: string;
}

export interface ActiveOrder {
  id: string;
  npcId: string;
  title: string;
  desc: string;
  resourceId: string;
  quantity: number;
  minQuality: number;
  rewardCoin: number;
  rewardMetrics?: Partial<Metrics>;
  rewardAttributes?: Partial<PlayerAttributes>;
  routeIds?: string[];
  createdDay: number;
  expiresDay?: number;
  status: 'active' | 'completed';
}

/** 结局命运报告 */
export interface GameReport {
  title: string;
  summary: string;
  finalMetrics: Metrics;
  survivingCrafts: string[];
  highlights: string[];
  /** 个性化尾声：结合玩家名号与抉择走向（守正/趋时）的收束之语 */
  epilogue: string;
}

/** 所有可派发的行动（被 reducer 消费） */
export type GameAction =
  | { type: 'NEW_GAME'; seed?: number; playerName?: string }
  | { type: 'RUN_PROCESS'; craftId: string; skipStepIds: string[] }
  | { type: 'TAKE_ORDER'; craftId: string }
  | { type: 'HOLD_EXHIBITION' }
  | { type: 'RESOLVE_EVENT'; choiceId: string }
  | { type: 'ADVANCE_TIME' }
  | { type: 'END_TURN' }
  | { type: 'PLANT_CROP'; plotId: string; cropId: CropId }
  | { type: 'WATER_PLOT'; plotId: string }
  | { type: 'HARVEST_CROP'; plotId: string }
  | { type: 'PERFORM_ACTIVITY'; activityId: string; quality?: number }
  /** 在当前地区运行一项基础产业（手搓原料），quality 0–1 来自微交互 */
  | { type: 'GATHER_RESOURCE'; industryId: string; quality?: number }
  /** 前往一个已解锁的地区 */
  | { type: 'TRAVEL'; regionId: string }
  /** 在当前大地区内切换小地区 */
  | { type: 'TRAVEL_SUBREGION'; subregionId: string }
  /** 花费解锁一个与已解锁地区相邻的新地区 */
  | { type: 'UNLOCK_REGION'; regionId: string }
  /** 标记一个剧情节点已阅读；choiceId 为分支选择时一并应用其标记/日志 */
  | { type: 'SEEN_STORY'; storyId: string; choiceId?: string }
  /** 与 NPC 对话一次（提升好感度） */
  | { type: 'TALK_NPC'; npcId: string }
  /** 交付/领取一个任务奖励 */
  | { type: 'COMPLETE_QUEST'; questId: string }
  /** 为一件高品质作品题名 */
  | { type: 'NAME_ITEM'; itemId: string; displayName?: string }
  /** 将一件作品放入珍品陈列 */
  | { type: 'DISPLAY_ITEM'; itemId: string }
  /** 将一件作品赠予 NPC */
  | { type: 'GIFT_ITEM'; itemId: string; npcId: string }
  /** 为作品写题跋，通常由 NPC 人物线奖励触发 */
  | { type: 'INSCRIBE_ITEM'; itemId: string; npcId?: string; inscription: string }
  /** 使用 NPC 的功能入口：授艺、路线、订单、联作、鉴评、家园来访 */
  | { type: 'USE_NPC_FUNCTION'; npcId: string; functionKind: NpcFunctionKind; itemId?: string }
  /** 交付一个 NPC 订单 */
  | { type: 'FULFILL_ORDER'; orderId: string };

// ───────────────────────────────────────────────────────────────────────────
// 地区 · 资源 · 供应链（地区优先世界设计，详见 doc/项目规划.md 第三部分）
// 以下为「世界主干」的数据模型；目前为静态数据层，尚未接入 reducer 结算逻辑。
// ───────────────────────────────────────────────────────────────────────────

/** 工序 / 产业微交互小游戏类型（与规划 §13 对齐） */
export type MiniGameType =
  | 'rhythm' // 节奏点击：锻打/投梭/刻版
  | 'drag_path' // 描线运笔：刺绣/雕刻/画
  | 'ratio_mix' // 配比调和：染液/釉料/配色
  | 'timing_hold' // 火候时机：烧窑/炒茶/发酵
  | 'aim_place' // 定位摆放：掐丝/镶嵌/扎结
  | 'repeat_endure'; // 重复耐心：浸染/髹漆/捞纸

/** 资源分层：raw 原矿/天然物 → material 半成品/可运输材料 → product 成品 */
export type ResourceTier = 'raw' | 'material' | 'product';

/** 资源定义（数据驱动，键对应 ResourcePool 的键） */
export interface ResourceDef {
  id: string;
  name: string;
  tier: ResourceTier;
  blurb: string;
  /** 上游资源键（material/product 由其加工而来；raw 为空） */
  refinedFrom?: string[];
  /** 成品基准售价（文）。仅 product 层用于接订单交付定价；缺省视为 0。 */
  value?: number;
}

/** 基础产业：产出原料/半成品的上游活动（手艺的上游） */
export interface IndustryDef {
  id: string;
  name: string;
  blurb: string;
  /** 产业小游戏类型 */
  miniGame: MiniGameType;
  /** 消耗的资源（采集类可为空，仅耗工时） */
  input: ResourcePool;
  /** 产出的资源键 */
  output: string;
  /** 每次基准产出量 */
  yield: number;
  /** 消耗人力（工时点数） */
  laborCost: number;
}

/** 地貌主题：驱动地图美术与地形机制（规划 §19） */
export interface TerrainTheme {
  /** 地形基底（如「水网+石板街」「山地梯田」） */
  base: string;
  /** 障碍 / 地貌元素 */
  obstacles: string[];
  /** 地标 / 功能建筑 */
  landmarks: string[];
  /** 主色调（hex 或描述） */
  palette: string[];
}

export type RegionId = string;

/** 大地区内的小地区/地点定义 */
export interface SubregionDef {
  id: string;
  name: string;
  /** 小地区定位：市集、工坊、郊野、码头等 */
  role: string;
  blurb: string;
  traits: string[];
}

/** 地区定义（世界主干，规划 §17） */
export interface RegionDef {
  id: RegionId;
  name: string;
  /** 地貌一句话 */
  blurb: string;
  terrain: TerrainTheme;
  /** 本地基础产业 id 列表（指向 INDUSTRIES） */
  industries: string[];
  /** 本地特产资源键（raw / material） */
  localResources: string[];
  /** 本地招牌手艺 craftId 列表（部分为规划中、尚未实现） */
  signatureCrafts: string[];
  /** 相邻地区（驿道 / 商路连接），用于解锁与运输 */
  neighbors: RegionId[];
  /** 地区性格标签 */
  traits: string[];
  /** 属于该大地区的多个小地区 */
  subregions: SubregionDef[];
  /** 是否首发即解锁 */
  startUnlocked: boolean;
}

/** 成就定义（数据驱动：predicate 为纯函数，满足即解锁） */
export interface AchievementDef {
  id: string;
  name: string;
  /** 一句话说明（解锁条件/意义） */
  desc: string;
  /** 该成就是否达成（只读当前状态） */
  predicate: (state: GameState) => boolean;
}
