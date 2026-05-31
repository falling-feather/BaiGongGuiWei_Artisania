import { useGameStore } from '../store/gameStore';
import { RESOURCE_INDEX } from '../data';
import type { IndustryDef } from '../engine';

/** 资源键 → 中文名（无定义则原样显示） */
function resName(key: string): string {
  return RESOURCE_INDEX[key]?.name ?? key;
}

/** 把 input 资源池转成「铁矿×2 煤×1」式说明 */
function describeInput(input: Record<string, number>): string {
  const parts = Object.entries(input).map(([k, v]) => `${resName(k)}×${v}`);
  return parts.length ? parts.join(' ') : '仅耗工时';
}

/**
 * 镇务/行脚面板：让玩家在 2D 世界之外直接操作供应链。
 *  - 查看当前地区与库存
 *  - 在本地产业「采料」（GATHER_RESOURCE）
 *  - 前往已解锁地区（TRAVEL）/ 解锁相邻地区（UNLOCK_REGION）
 */
export function RegionPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const content = useGameStore((s) => s.content);
  const resources = useGameStore((s) => s.state.resources);
  const currentRegion = useGameStore((s) => s.state.currentRegion);
  const unlockedRegions = useGameStore((s) => s.state.unlockedRegions);
  const playing = useGameStore((s) => s.state.status === 'playing');
  const dispatch = useGameStore((s) => s.dispatch);

  if (!open) return null;

  const regions = content.regions ?? [];
  const industries = content.industries ?? [];
  const region = regions.find((r) => r.id === currentRegion);
  const labor = resources.labor ?? 0;

  const localIndustries: IndustryDef[] = (region?.industries ?? [])
    .map((id) => industries.find((i) => i.id === id))
    .filter((i): i is IndustryDef => Boolean(i));

  const canGather = (ind: IndustryDef): boolean => {
    if (labor < ind.laborCost) return false;
    return Object.entries(ind.input).every(([k, v]) => (resources[k] ?? 0) >= v);
  };

  // 与已解锁地区相邻、但自身未解锁的地区
  const reachable = regions.filter((r) => {
    if (unlockedRegions.includes(r.id)) return false;
    return unlockedRegions.some((uid) => {
      const u = regions.find((x) => x.id === uid);
      return u?.neighbors.includes(r.id) || r.neighbors.includes(uid);
    });
  });

  // 已解锁、非当前的可前往地区
  const travelTargets = regions.filter(
    (r) => unlockedRegions.includes(r.id) && r.id !== currentRegion,
  );

  // 库存中数量 > 0 的资源（含 coin/labor）
  const stock = Object.entries(resources).filter(([, v]) => v > 0);

  return (
    <div className="modal__backdrop" onClick={onClose}>
      <div className="modal modal--wide" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal__title">
          镇务行脚{' '}
          <small style={{ fontSize: 12, color: 'var(--indigo-soft)' }}>
            当前：{region?.name ?? '未知'}
          </small>
        </h3>
        {region && <p className="modal__desc">{region.blurb}</p>}

        <section className="panel-block">
          <h4 className="panel-block__title">库存</h4>
          <div className="stock-grid">
            {stock.map(([k, v]) => (
              <span className="stock-chip" key={k}>
                {resName(k)} <b>{v}</b>
              </span>
            ))}
          </div>
        </section>

        <section className="panel-block">
          <h4 className="panel-block__title">本地产业 · 采料</h4>
          {localIndustries.length === 0 && <p className="panel-empty">本地暂无可用产业。</p>}
          <ul className="ind-list">
            {localIndustries.map((ind) => (
              <li className="ind-item" key={ind.id}>
                <div className="ind-item__main">
                  <span className="ind-item__name">{ind.name}</span>
                  <span className="ind-item__io">
                    {describeInput(ind.input)} → {resName(ind.output)}×{ind.yield} · 工时{ind.laborCost}
                  </span>
                  <span className="ind-item__blurb">{ind.blurb}</span>
                </div>
                <button
                  className="btn btn--sm btn--bamboo"
                  disabled={!playing || !canGather(ind)}
                  onClick={() => dispatch({ type: 'GATHER_RESOURCE', industryId: ind.id })}
                >
                  采料
                </button>
              </li>
            ))}
          </ul>
        </section>

        {travelTargets.length > 0 && (
          <section className="panel-block">
            <h4 className="panel-block__title">前往已通地区</h4>
            <div className="region-chips">
              {travelTargets.map((r) => (
                <button
                  key={r.id}
                  className="btn btn--sm btn--ghost"
                  disabled={!playing}
                  onClick={() => dispatch({ type: 'TRAVEL', regionId: r.id })}
                >
                  {r.name}
                </button>
              ))}
            </div>
          </section>
        )}

        <section className="panel-block">
          <h4 className="panel-block__title">开拓商路 · 解锁相邻（30 文）</h4>
          {reachable.length === 0 && <p className="panel-empty">暂无可直达的新地区。</p>}
          <div className="region-chips">
            {reachable.map((r) => (
              <button
                key={r.id}
                className="btn btn--sm"
                disabled={!playing || (resources.coin ?? 0) < 30}
                title={r.blurb}
                onClick={() => dispatch({ type: 'UNLOCK_REGION', regionId: r.id })}
              >
                {r.name} · 解锁
              </button>
            ))}
          </div>
        </section>

        <div className="btn-row">
          <button className="btn btn--ghost" onClick={onClose}>
            收起
          </button>
        </div>
      </div>
    </div>
  );
}
