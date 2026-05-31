/**
 * 可重放的伪随机数生成器（mulberry32）。
 * 给定相同 seed 产生相同序列，保证游戏可重放、可测试、未来可做后端权威结算。
 */
export interface Rng {
  seed: number;
  /** 返回 [0,1) 的浮点数，并推进内部状态 */
  next(): number;
}

export function createRng(seed: number): Rng {
  let state = seed >>> 0;
  return {
    get seed() {
      return state;
    },
    next() {
      state |= 0;
      state = (state + 0x6d2b79f5) | 0;
      let t = Math.imul(state ^ (state >>> 15), 1 | state);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
  };
}

/** 从带权重的列表中按权重抽取一个元素 */
export function weightedPick<T extends { weight: number }>(
  items: T[],
  rng: Rng,
): T | null {
  if (items.length === 0) return null;
  const total = items.reduce((acc, item) => acc + item.weight, 0);
  if (total <= 0) return null;
  let roll = rng.next() * total;
  for (const item of items) {
    roll -= item.weight;
    if (roll <= 0) return item;
  }
  return items[items.length - 1];
}
