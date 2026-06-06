import { useGameStore } from '../store/gameStore';
import { RESOURCE_INDEX } from '../data';
import { localIndustriesForRegion } from '../data/regionEconomy';
import { emitBus } from '../game/EventBus';
import { routeCostWithIntel, routeIntelKnown } from '../engine';
import type { CropId, IndustryDef, RegionDef, RouteSpec } from '../engine';

const CROP_OPTIONS: { id: CropId; name: string; output: string }[] = [
  { id: 'indigo', name: '靛草', output: '靛蓝草' },
  { id: 'mulberry', name: '桑蚕', output: '蚕丝' },
  { id: 'tea', name: '茶树', output: '茶青' },
];
const CROP_LABEL: Record<CropId, string> = {
  indigo: '靛草',
  mulberry: '桑蚕',
  tea: '茶树',
};
const PHASE_LABEL = {
  dawn: '清晨',
  morning: '上午',
  afternoon: '下午',
  dusk: '黄昏',
  night: '夜间',
} as const;

function routeTouches(route: RouteSpec, regionId: string): boolean {
  return route.fromRegionId === regionId || route.toRegionId === regionId;
}

function otherRouteEnd(route: RouteSpec, regionId: string): string {
  return route.fromRegionId === regionId ? route.toRegionId : route.fromRegionId;
}

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
 *  - 查看当前场景出入口连接的路线；大地区迁移/解锁交给场景 gate 交互
 */
export function RegionPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const content = useGameStore((s) => s.content);
  const resources = useGameStore((s) => s.state.resources);
  const farmPlots = useGameStore((s) => s.state.farmPlots);
  const completedActivities = useGameStore((s) => s.state.completedActivities);
  const currentRegion = useGameStore((s) => s.state.currentRegion);
  const currentSubregion = useGameStore((s) => s.state.currentSubregion);
  const unlockedRegions = useGameStore((s) => s.state.unlockedRegions);
  const flags = useGameStore((s) => s.state.flags);
  const calendar = useGameStore((s) => s.state.calendar);
  const playing = useGameStore((s) => s.state.status === 'playing');
  const dispatch = useGameStore((s) => s.dispatch);

  if (!open) return null;

  const regions = content.regions ?? [];
  const industries = content.industries ?? [];
  const region = regions.find((r) => r.id === currentRegion);
  const labor = resources.labor ?? 0;
  const currentSub = region?.subregions.find((s) => s.id === currentSubregion) ?? region?.subregions[0];
  const routeSpecs = Array.from(
    new Map((content.regionContent?.flatMap((spec) => spec.routes) ?? []).map((route) => [route.id, route])).values(),
  );
  const currentRouteRows = routeSpecs
    .filter((route) => routeTouches(route, currentRegion))
    .map((route) => ({
      route,
      target: regions.find((r) => r.id === otherRouteEnd(route, currentRegion)),
    }))
    .filter((row): row is { route: RouteSpec; target: RegionDef } => Boolean(row.target));
  const openedRouteRows = currentRouteRows.filter((row) => unlockedRegions.includes(row.target.id));
  const frontierRouteRows = currentRouteRows.filter((row) => !unlockedRegions.includes(row.target.id));

  const localIndustries: IndustryDef[] = localIndustriesForRegion(region, industries);
  const currentActivities = (content.activities ?? []).filter(
    (activity) => activity.regionId === currentRegion && activity.subregionId === currentSubregion,
  );
  const isFarmSubregion = Boolean(
    currentSub?.traits.includes('种植') || currentSub?.id.includes('baigongyuan'),
  );

  const canGather = (ind: IndustryDef): boolean => {
    if (labor < ind.laborCost) return false;
    return Object.entries(ind.input).every(([k, v]) => (resources[k] ?? 0) >= v);
  };

  const canPerformActivity = (activity: (typeof currentActivities)[number]): boolean => {
    if (labor < activity.laborCost) return false;
    if (activity.once && completedActivities.includes(activity.id)) return false;
    if (activity.availablePhases && !activity.availablePhases.includes(calendar.phase)) return false;
    return Object.entries(activity.resourceCost ?? {}).every(([k, v]) => (resources[k] ?? 0) >= v);
  };

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

        {region && (
          <section className="panel-block">
            <h4 className="panel-block__title">区内小地区</h4>
            {currentSub && (
              <p className="panel-note">
                当前：{currentSub.name} · {currentSub.role}。{currentSub.blurb}
              </p>
            )}
            <div className="subregion-grid">
              {region.subregions.map((subregion) => (
                <button
                  key={subregion.id}
                  className={`subregion-card ${subregion.id === currentSubregion ? 'is-current' : ''}`}
                  disabled
                  title={
                    subregion.id === currentSubregion
                      ? subregion.blurb
                      : `${subregion.blurb} 请在当前场景内寻找区内通道前往。`
                  }
                >
                  <b>{subregion.name}</b>
                  <span>{subregion.role}</span>
                  <small>{subregion.traits.join(' / ')}</small>
                </button>
              ))}
            </div>
          </section>
        )}

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
                  onClick={() => {
                    emitBus({ type: 'interact-industry', industryId: ind.id });
                    onClose();
                  }}
                >
                  采料
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel-block">
          <h4 className="panel-block__title">本地活动</h4>
          {currentActivities.length === 0 && <p className="panel-empty">此小地区暂无活动点。</p>}
          <ul className="ind-list">
            {currentActivities.map((activity) => (
              <li className="ind-item" key={activity.id}>
                <div className="ind-item__main">
                  <span className="ind-item__name">{activity.name}</span>
                  <span className="ind-item__io">
                    {activity.kind} · {describeInput(activity.resourceCost ?? {})} → {describeInput(activity.reward.resources ?? {})} · 工时{activity.laborCost}
                    {activity.availablePhases ? ` · ${activity.availablePhases.map((phase) => PHASE_LABEL[phase]).join('/')}` : ''}
                  </span>
                  <span className="ind-item__blurb">{activity.blurb}</span>
                </div>
                <button
                  className="btn btn--sm btn--bamboo"
                  disabled={!playing || !canPerformActivity(activity)}
                  title={activity.availablePhases ? `可用时段：${activity.availablePhases.map((phase) => PHASE_LABEL[phase]).join(' / ')}` : activity.blurb}
                  onClick={() => {
                    emitBus({ type: 'interact-activity', activityId: activity.id });
                    onClose();
                  }}
                >
                  体验
                </button>
              </li>
            ))}
          </ul>
        </section>

        {isFarmSubregion && (
          <section className="panel-block">
            <h4 className="panel-block__title">百工院田圃</h4>
            <div className="farm-grid">
              {farmPlots.map((plot) => (
                <div className="farm-plot-card" key={plot.id}>
                  <div className="farm-plot-card__head">
                    <b>{plot.cropId ? CROP_LABEL[plot.cropId] : '空田圃'}</b>
                    <span>{plot.cropId ? `${plot.growth}%` : '待下种'}</span>
                  </div>
                  {plot.cropId ? (
                    <>
                      <div className="farm-meter">
                        <i style={{ width: `${plot.growth}%` }} />
                      </div>
                      <div className="farm-actions">
                        <button
                          className="btn btn--sm btn--ghost"
                          disabled={!playing || plot.wateredToday || labor < 1}
                          onClick={() => dispatch({ type: 'WATER_PLOT', plotId: plot.id })}
                        >
                          {plot.wateredToday ? '已浇水' : '浇水'}
                        </button>
                        <button
                          className="btn btn--sm btn--bamboo"
                          disabled={!playing || plot.growth < 100}
                          onClick={() => dispatch({ type: 'HARVEST_CROP', plotId: plot.id })}
                        >
                          收获
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="farm-actions farm-actions--wrap">
                      {CROP_OPTIONS.map((crop) => (
                        <button
                          className="btn btn--sm btn--ghost"
                          key={crop.id}
                          disabled={!playing}
                          title={`成熟后入仓：${crop.output}`}
                          onClick={() => dispatch({ type: 'PLANT_CROP', plotId: plot.id, cropId: crop.id })}
                        >
                          种{crop.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {openedRouteRows.length > 0 && (
          <section className="panel-block">
            <h4 className="panel-block__title">当前出入口 · 已通路线</h4>
            <ul className="ind-list">
              {openedRouteRows.map(({ route, target }) => (
                <li className="ind-item" key={route.id}>
                  <div className="ind-item__main">
                    <span className="ind-item__name">{route.name} · {target.name}</span>
                    <span className="ind-item__io">已通行 · 请在当前场景寻找出入口牌坊，按 E 前往</span>
                    <span className="ind-item__blurb">{route.preview ?? target.blurb}</span>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="panel-block">
          <h4 className="panel-block__title">当前出入口 · 可开拓路线</h4>
          {frontierRouteRows.length === 0 && <p className="panel-empty">当前地区暂无可开拓的新路线。</p>}
          <ul className="ind-list">
            {frontierRouteRows.map(({ route, target }) => {
              const cost = routeCostWithIntel(route, flags);
              const known = routeIntelKnown(route, flags);
              const enoughCoin = (resources.coin ?? 0) >= cost;
              return (
                <li className="ind-item" key={route.id}>
                  <div className="ind-item__main">
                    <span className="ind-item__name">{route.name} · {target.name}</span>
                    <span className="ind-item__io">
                      路资 {cost} 文 · {known ? '已掌握路线情报' : '未掌握路线情报'} · {enoughCoin ? '可在场景出入口开通' : '路资不足'}
                    </span>
                    <span className="ind-item__blurb">{route.unlockHint}</span>
                  </div>
                </li>
              );
            })}
          </ul>
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
