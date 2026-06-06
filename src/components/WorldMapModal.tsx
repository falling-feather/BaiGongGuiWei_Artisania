import { useGameStore } from '../store/gameStore';
import { REGION_INDEX, REGION_MAP_POS } from '../data';
import type { RegionDef } from '../engine';

const UNLOCK_COST = 30;

/** 节点状态：当前所在 / 已通可前往 / 相邻可解锁 / 暂不可达 */
type NodeKind = 'current' | 'unlocked' | 'reachable' | 'locked';

export function WorldMapModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const currentRegion = useGameStore((s) => s.state.currentRegion);
  const unlockedRegions = useGameStore((s) => s.state.unlockedRegions);
  const coin = useGameStore((s) => s.state.resources.coin ?? 0);
  const playing = useGameStore((s) => s.state.status === 'playing');
  const dispatch = useGameStore((s) => s.dispatch);
  if (!open) return null;

  const unlocked = new Set(unlockedRegions);
  // 有坐标的地区才上图
  const nodes = Object.keys(REGION_MAP_POS)
    .map((id) => REGION_INDEX[id])
    .filter((r): r is RegionDef => Boolean(r));

  const isReachable = (r: RegionDef): boolean =>
    !unlocked.has(r.id) &&
    unlockedRegions.some((uid) => {
      const u = REGION_INDEX[uid];
      return u?.neighbors.includes(r.id) || r.neighbors.includes(uid);
    });

  const kindOf = (r: RegionDef): NodeKind => {
    if (r.id === currentRegion) return 'current';
    if (unlocked.has(r.id)) return 'unlocked';
    if (isReachable(r)) return 'reachable';
    return 'locked';
  };

  // 相邻连线（去重）
  const lines: { x1: number; y1: number; x2: number; y2: number; active: boolean }[] = [];
  const seen = new Set<string>();
  for (const r of nodes) {
    const a = REGION_MAP_POS[r.id];
    for (const nid of r.neighbors) {
      const b = REGION_MAP_POS[nid];
      if (!b) continue;
      const key = [r.id, nid].sort().join('|');
      if (seen.has(key)) continue;
      seen.add(key);
      lines.push({
        x1: a.x,
        y1: a.y,
        x2: b.x,
        y2: b.y,
        active: unlocked.has(r.id) && unlocked.has(nid),
      });
    }
  }

  const onNode = (r: RegionDef) => {
    if (!playing) return;
    const kind = kindOf(r);
    if (kind === 'current') return;
    if (kind === 'unlocked') {
      dispatch({ type: 'TRAVEL', regionId: r.id });
      onClose();
    } else if (kind === 'reachable') {
      dispatch({ type: 'UNLOCK_REGION', regionId: r.id });
      if (useGameStore.getState().state.unlockedRegions.includes(r.id)) {
        dispatch({ type: 'TRAVEL', regionId: r.id });
        onClose();
      }
    }
  };

  return (
    <div className="modal__backdrop" onClick={onClose}>
      <div className="modal modal--map" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal__title">九州行脚 · 大地图</h3>
        <p className="modal__desc">
          大地图仅展示大地区；区内小地区请在「镇务」中切换。点亮的大地区可一键前往；相邻商路可花 {UNLOCK_COST} 文打通（现有 {coin} 文）。
        </p>
        <div className="worldmap">
          <svg className="worldmap__lines" viewBox="0 0 100 100" preserveAspectRatio="none">
            {lines.map((l, i) => (
              <line
                key={i}
                x1={l.x1}
                y1={l.y1}
                x2={l.x2}
                y2={l.y2}
                className={l.active ? 'worldmap__line worldmap__line--on' : 'worldmap__line'}
              />
            ))}
          </svg>
          {nodes.map((r) => {
            const pos = REGION_MAP_POS[r.id];
            const kind = kindOf(r);
            return (
              <button
                key={r.id}
                className={`worldmap__node worldmap__node--${kind}`}
                style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                onClick={() => onNode(r)}
                title={r.blurb}
              >
                <span className="worldmap__dot" />
                <span className="worldmap__name">{r.name}</span>
              </button>
            );
          })}
        </div>
        <div className="worldmap__legend">
          <span><i className="lg lg--current" />所在</span>
          <span><i className="lg lg--unlocked" />已通</span>
          <span><i className="lg lg--reachable" />可解锁</span>
          <span><i className="lg lg--locked" />未通</span>
        </div>
        <div className="btn-row">
          <button className="btn btn--ghost" onClick={onClose}>关闭</button>
        </div>
      </div>
    </div>
  );
}
