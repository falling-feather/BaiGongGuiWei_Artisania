/**
 * 供应链可达性守卫 —— 防「工艺材料无处可得」的死锁。
 *
 * 规则（与 game/regionSpec.ts、engine/reducer.ts 的授权逻辑一致）：
 * - 采集产业（input 为空）只有当产出列入某地区 localResources 时才可在该地区开采；
 * - 精炼/制作产业必须被某地区 industries 列出才可开工；
 * - 一种材料「可获」= 它是可开采原料，或其精炼产业被某地区提供且全部输入也「可获」。
 *
 * 断言：每门已实现工艺的每道工序 resourceCost 所需材料都全局可获。
 */
import { describe, expect, it } from 'vitest';
import { CRAFTS, INDUSTRIES, REGIONS } from '..';

/** 计算全局可获资源集合（原料 + 可由已提供产业精炼出的材料/成品） */
function computeObtainable(): Set<string> {
  const offered = new Set<string>();
  for (const r of REGIONS) for (const id of r.industries) offered.add(id);

  const obtainable = new Set<string>();
  // 1) 可开采原料：采集产业（input 空）且产出列入某地区 localResources
  for (const ind of INDUSTRIES) {
    if (Object.keys(ind.input).length > 0) continue;
    if (REGIONS.some((r) => r.localResources.includes(ind.output))) {
      obtainable.add(ind.output);
    }
  }
  // 2) 闭包：被某地区提供、且输入全部可获的精炼/制作产业，其产出也可获
  let grew = true;
  while (grew) {
    grew = false;
    for (const ind of INDUSTRIES) {
      if (Object.keys(ind.input).length === 0) continue; // 采集已处理
      if (!offered.has(ind.id)) continue; // 未被任何地区提供 → 不可开工
      if (obtainable.has(ind.output)) continue;
      const inputsReady = Object.keys(ind.input).every((k) => obtainable.has(k));
      if (inputsReady) {
        obtainable.add(ind.output);
        grew = true;
      }
    }
  }
  return obtainable;
}

describe('供应链可达性', () => {
  const obtainable = computeObtainable();

  it('每门工艺的核心工序材料都全局可获（无死锁）', () => {
    const missing: string[] = [];
    for (const craft of CRAFTS) {
      for (const step of craft.processChain) {
        // 可省略步即便缺料也能跳过，不致死锁；只校验不可省略步
        if (step.skippable) continue;
        for (const mat of Object.keys(step.resourceCost)) {
          if (!obtainable.has(mat)) {
            missing.push(`${craft.id} · ${step.name} 需要无法获得的「${mat}」`);
          }
        }
      }
    }
    expect(missing).toEqual([]);
  });
});
