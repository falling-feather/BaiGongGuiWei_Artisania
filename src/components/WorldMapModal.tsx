import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { REGION_INDEX, REGION_MAP_POS, REGION_ROUTES } from '../data';
import type { RegionDef, RouteSpec } from '../engine';

/** 节点状态：当前所在 / 已通可经场景出入口前往 / 相邻可开通 / 暂不可达 */
type NodeKind = 'current' | 'unlocked' | 'reachable' | 'locked';

function routeTouches(route: RouteSpec, regionId: string): boolean {
  return route.fromRegionId === regionId || route.toRegionId === regionId;
}

function otherRouteEnd(route: RouteSpec, regionId: string): string {
  return route.fromRegionId === regionId ? route.toRegionId : route.fromRegionId;
}

function routeCost(route?: RouteSpec): number {
  return route?.unlockCost ?? route?.requirements?.coin ?? 30;
}

export function WorldMapModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const currentRegion = useGameStore((s) => s.state.currentRegion);
  const unlockedRegions = useGameStore((s) => s.state.unlockedRegions);
  const coin = useGameStore((s) => s.state.resources.coin ?? 0);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  if (!open) return null;

  const unlocked = new Set(unlockedRegions);
  const nodes = Object.keys(REGION_MAP_POS)
    .map((id) => REGION_INDEX[id])
    .filter((r): r is RegionDef => Boolean(r));

  const routeForTarget = (targetId: string): RouteSpec | undefined =>
    REGION_ROUTES.find((route) => routeTouches(route, targetId) && unlocked.has(otherRouteEnd(route, targetId)));

  const kindOf = (r: RegionDef): NodeKind => {
    if (r.id === currentRegion) return 'current';
    if (unlocked.has(r.id)) return 'unlocked';
    if (routeForTarget(r.id)) return 'reachable';
    return 'locked';
  };

  const lines = REGION_ROUTES.map((route) => {
    const a = REGION_MAP_POS[route.fromRegionId];
    const b = REGION_MAP_POS[route.toRegionId];
    if (!a || !b) return null;
    const active = unlocked.has(route.fromRegionId) && unlocked.has(route.toRegionId);
    const reachable = !active && (unlocked.has(route.fromRegionId) || unlocked.has(route.toRegionId));
    return {
      id: route.id,
      x1: a.x,
      y1: a.y,
      x2: b.x,
      y2: b.y,
      active,
      reachable,
    };
  }).filter((line): line is NonNullable<typeof line> => Boolean(line));

  const selectedRegion = REGION_INDEX[selectedRegionId ?? currentRegion] ?? REGION_INDEX[currentRegion];
  const selectedKind = selectedRegion ? kindOf(selectedRegion) : 'locked';
  const selectedRoute =
    selectedRegion && selectedRegion.id !== currentRegion ? routeForTarget(selectedRegion.id) : undefined;
  const selectedRouteCost = routeCost(selectedRoute);
  const selectedSummary = (() => {
    if (!selectedRegion) return '暂无地区信息。';
    if (selectedKind === 'current') return '当前所在大地区。继续行脚请在场景内寻找出入口牌坊或商路节点。';
    if (selectedKind === 'unlocked') return '此地已开通。正式迁移请回到场景，靠近对应出入口并按 E 前往。';
    if (selectedKind === 'reachable' && selectedRoute) {
      return `可经「${selectedRoute.name}」开通，路资 ${selectedRouteCost} 文。${selectedRoute.unlockHint}`;
    }
    return '尚未发现直达路线。请先从已通地区继续开拓相邻商路。';
  })();

  return (
    <div className="modal__backdrop" onClick={onClose}>
      <div className="modal modal--map" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal__title">九州行脚 · 大地图</h3>
        <p className="modal__desc">
          大地图仅作路线总览与调试定位；正式迁移请在当前场景寻找出入口牌坊或商路节点，按 E 开通或前往。
          区内小地区仍在「镇务」中切换。现有 {coin} 文。
        </p>
        <div className="worldmap">
          <svg className="worldmap__lines" viewBox="0 0 100 100" preserveAspectRatio="none">
            {lines.map((l) => (
              <line
                key={l.id}
                x1={l.x1}
                y1={l.y1}
                x2={l.x2}
                y2={l.y2}
                className={[
                  'worldmap__line',
                  l.active ? 'worldmap__line--on' : '',
                  l.reachable ? 'worldmap__line--reachable' : '',
                ].filter(Boolean).join(' ')}
              />
            ))}
          </svg>
          {nodes.map((r) => {
            const pos = REGION_MAP_POS[r.id];
            const kind = kindOf(r);
            const targetRoute = routeForTarget(r.id);
            const title =
              kind === 'reachable' && targetRoute
                ? `${r.blurb}｜${targetRoute.name}，${routeCost(targetRoute)} 文`
                : `${r.blurb}｜${kind === 'unlocked' ? '已通，需经场景出入口前往' : '仅供查看'}`;
            return (
              <button
                key={r.id}
                type="button"
                className={`worldmap__node worldmap__node--${kind}`}
                style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                onClick={() => setSelectedRegionId(r.id)}
                title={title}
                aria-pressed={selectedRegion?.id === r.id}
              >
                <span className="worldmap__dot" />
                <span className="worldmap__name">{r.name}</span>
              </button>
            );
          })}
        </div>
        {selectedRegion && (
          <div className="worldmap__detail">
            <b>{selectedRegion.name}</b>
            <span>{selectedSummary}</span>
          </div>
        )}
        <div className="worldmap__legend">
          <span><i className="lg lg--current" />所在</span>
          <span><i className="lg lg--unlocked" />已通</span>
          <span><i className="lg lg--reachable" />可开通</span>
          <span><i className="lg lg--locked" />未通</span>
        </div>
        <div className="btn-row">
          <button className="btn btn--ghost" onClick={onClose}>关闭</button>
        </div>
      </div>
    </div>
  );
}
