import type { MiniMapPoint } from '../game/EventBus';

const KIND_COLOR: Record<MiniMapPoint['kind'], string> = {
  industry: '#c98a3a',
  craft: '#3a7bd5',
  activity: '#cf5b62',
  gate: '#7a9a4a',
};

export interface PlayerPos {
  tx: number;
  ty: number;
  mapW: number;
  mapH: number;
}

/**
 * 小地图：右下角缩略图，标记交互点与玩家当前坐标，并附缩放控件。
 */
export function Minimap({
  player,
  points,
  zoom,
  onZoom,
}: {
  player: PlayerPos | null;
  points: MiniMapPoint[];
  zoom: number;
  onZoom: (delta: number) => void;
}) {
  if (!player) return null;
  const { tx, ty, mapW, mapH } = player;
  const pct = (x: number, span: number) => `${(x / span) * 100}%`;

  return (
    <div className="minimap">
      <div className="minimap__head">
        <span>坐标 ({tx}, {ty})</span>
        <span className="minimap__zoom">
          <button className="minimap__zbtn" onClick={() => onZoom(-0.25)} title="缩小 ( - )">
            −
          </button>
          <span className="minimap__zval">{zoom.toFixed(2)}×</span>
          <button className="minimap__zbtn" onClick={() => onZoom(0.25)} title="放大 ( + )">
            ＋
          </button>
        </span>
      </div>
      <div className="minimap__canvas" style={{ aspectRatio: `${mapW} / ${mapH}` }}>
        {points.map((p, i) => (
          <span
            key={i}
            className="minimap__dot"
            style={{
              left: pct(p.tx, mapW),
              top: pct(p.ty, mapH),
              background: KIND_COLOR[p.kind],
            }}
          />
        ))}
        <span
          className="minimap__player"
          style={{ left: pct(tx, mapW), top: pct(ty, mapH) }}
        />
      </div>
    </div>
  );
}
