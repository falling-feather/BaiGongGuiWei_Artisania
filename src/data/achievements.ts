/**
 * 成就目录 —— 数据驱动的里程碑。
 * 每条成就有一个纯函数 predicate(state)：满足即解锁（reducer 在每次结算后检测）。
 * 新增成就 = 在此追加一条 AchievementDef，引擎不改。
 */
import type { AchievementDef, GameState } from '../engine/types';

/** 累计产出的手艺成品数 */
function totalProduced(s: GameState): number {
  return s.crafts.reduce((sum, c) => sum + c.produced, 0);
}

/** 背包内资源总份数（不含人力 labor） */
function totalStock(s: GameState): number {
  return Object.entries(s.resources)
    .filter(([k]) => k !== 'labor')
    .reduce((sum, [, v]) => sum + (v as number), 0);
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'first-step',
    name: '初执匠作',
    desc: '完成第一批手艺出品。',
    predicate: (s) => totalProduced(s) >= 1,
  },
  {
    id: 'diligent',
    name: '勤工不辍',
    desc: '累计出品达 5 批。',
    predicate: (s) => totalProduced(s) >= 5,
  },
  {
    id: 'wealthy',
    name: '腰缠百文',
    desc: '钱袋积累到 100 文。',
    predicate: (s) => (s.resources.coin ?? 0) >= 100,
  },
  {
    id: 'stockpile',
    name: '货殖盈仓',
    desc: '背包资源累计达 60 份。',
    predicate: (s) => totalStock(s) >= 60,
  },
  {
    id: 'wanderer',
    name: '行脚四方',
    desc: '解锁 3 处地区。',
    predicate: (s) => s.unlockedRegions.length >= 3,
  },
  {
    id: 'explorer',
    name: '踏遍九州',
    desc: '解锁 6 处地区。',
    predicate: (s) => s.unlockedRegions.length >= 6,
  },
  {
    id: 'finisher',
    name: '善始善终',
    desc: '走完一局完整的经营。',
    predicate: (s) => s.status === 'ended' && s.report !== null,
  },
];

/** 成就索引：id -> AchievementDef */
export const ACHIEVEMENT_INDEX: Record<string, AchievementDef> = Object.fromEntries(
  ACHIEVEMENTS.map((a) => [a.id, a]),
);
