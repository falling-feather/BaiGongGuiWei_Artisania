import { useGameStore } from '../store/gameStore';
import { METRIC_KEYS, METRIC_LABELS, zoneOf, type Metrics } from '../engine';

/** 叠加在游戏画面上的抬头显示：四维数值 + 提示 + 镇务按钮 */
export function Hud({ hint, onOpenPanel }: { hint: string | null; onOpenPanel: () => void }) {
  const metrics = useGameStore((s) => s.state.metrics);
  const turn = useGameStore((s) => s.state.turn);
  const maxTurns = useGameStore((s) => s.state.maxTurns);
  const playing = useGameStore((s) => s.state.status === 'playing');
  const hasEvent = useGameStore((s) => s.state.pendingEvent !== null);
  const dispatch = useGameStore((s) => s.dispatch);

  return (
    <>
      <div className="hud hud--top">
        <div className="hud__metrics">
          {METRIC_KEYS.map((key) => {
            const value = metrics[key as keyof Metrics];
            const zone = zoneOf(value);
            return (
              <div className="hud__metric" key={key}>
                <span className="hud__metric-name">{METRIC_LABELS[key]}</span>
                <span className={`hud__metric-value zone-${zone}`}>{value}</span>
              </div>
            );
          })}
        </div>
        <div className="hud__season">
          第 {turn} / {maxTurns} 季
          <button className="btn btn--sm" disabled={!playing} onClick={onOpenPanel}>
            镇务行脚
          </button>
          <button
            className="btn btn--sm"
            disabled={!playing || hasEvent}
            onClick={() => dispatch({ type: 'END_TURN' })}
          >
            结束本季
          </button>
        </div>
      </div>

      {hint && <div className="hud hud--hint">{hint}</div>}

      <div className="hud hud--controls">WASD / 方向键 移动 · E 进入体验点</div>
    </>
  );
}
