/**
 * 供应链「本地自足」告警报告（仅生成，不断言失败）。
 *
 * 与防死锁守卫（supplyChain.test.ts）互补：守卫只保证「全局可达」（材料可跨区运输）；
 * 本报告聚焦「本地自足度」——每地区有哪些工艺无法纯本地完成、缺料需从何处运入，
 * 供平衡调参参考。运行测试即把最新结果写入 doc/供应链自足报告.md。
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CRAFT_INDEX, INDUSTRIES, INDUSTRY_INDEX, REGIONS, RESOURCE_INDEX } from '..';

const name = (id: string) => RESOURCE_INDEX[id]?.name ?? id;

/** 某地区「纯本地」可获材料集合：本地可采原料 + 用本地提供产业（输入也本地可获）精炼出的材料 */
function localObtainable(region: (typeof REGIONS)[number]): Set<string> {
  const set = new Set<string>();
  for (const ind of INDUSTRIES) {
    if (Object.keys(ind.input).length === 0 && region.localResources.includes(ind.output)) set.add(ind.output);
  }
  let grew = true;
  while (grew) {
    grew = false;
    for (const id of region.industries) {
      const ind = INDUSTRY_INDEX[id];
      if (!ind || Object.keys(ind.input).length === 0 || set.has(ind.output)) continue;
      if (Object.keys(ind.input).every((k) => set.has(k))) {
        set.add(ind.output);
        grew = true;
      }
    }
  }
  return set;
}

/** 哪些地区能「纯本地」产出某材料（用于运料来源提示） */
function producersOf(mat: string, localSets: Map<string, Set<string>>): string[] {
  const out: string[] = [];
  for (const r of REGIONS) if (localSets.get(r.id)!.has(mat)) out.push(r.name);
  return out;
}

describe('供应链本地自足报告', () => {
  it('生成 doc/供应链自足报告.md（恒通过，仅告警）', () => {
    const localSets = new Map(REGIONS.map((r) => [r.id, localObtainable(r)]));
    const lines: string[] = [
      '# 供应链本地自足报告（自动生成）',
      '',
      '> 由 `src/data/__tests__/supplyReport.test.ts` 在每次测试时重写。',
      '> `✓全本地` = 不出地区即可完成；其余工艺需把所列材料从产地运入。',
      '> 材料可跨区运输，故「需运料」不等于死锁（防死锁见 supplyChain.test.ts）。',
      '',
    ];
    for (const region of REGIONS) {
      const local = localSets.get(region.id)!;
      const harvest = INDUSTRIES.filter(
        (i) => Object.keys(i.input).length === 0 && region.localResources.includes(i.output),
      ).map((i) => name(i.output));
      lines.push(`## ${region.name}（采集：${harvest.join('、') || '—'}）`, '');
      const crafts = region.signatureCrafts.map((id) => CRAFT_INDEX[id]).filter(Boolean) as NonNullable<
        (typeof CRAFT_INDEX)[string]
      >[];
      if (!crafts.length) {
        lines.push('（无已实现工艺）', '');
        continue;
      }
      for (const c of crafts) {
        const need = new Set<string>();
        for (const s of c.processChain) if (!s.skippable) for (const k of Object.keys(s.resourceCost)) need.add(k);
        const imported = [...need].filter((m) => !local.has(m));
        if (!imported.length) {
          lines.push(`- ${c.name}：✓全本地`);
        } else {
          const detail = imported
            .map((m) => `${name(m)}←${producersOf(m, localSets).join('、') || '⚠仅可跨区运煤后冶炼'}`)
            .join('；');
          lines.push(`- ${c.name}：需运料 [${detail}]`);
        }
      }
      lines.push('');
    }
    writeFileSync(resolve(__dirname, '../../../doc/供应链自足报告.md'), lines.join('\n'), 'utf8');
    expect(true).toBe(true);
  });
});
