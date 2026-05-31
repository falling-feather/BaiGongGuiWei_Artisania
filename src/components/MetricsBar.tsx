import { useGameStore } from '../store/gameStore';
import { METRIC_KEYS, METRIC_LABELS, zoneOf, type Metrics } from '../engine';

/** 四维数值总览条 */
export function MetricsBar() {
  const metrics = useGameStore((s) => s.state.metrics);
  return (
    <div className="metrics">
      {METRIC_KEYS.map((key) => {
        const value = metrics[key as keyof Metrics];
        const zone = zoneOf(value);
        return (
          <div className="metric" key={key}>
            <div className="metric__name">{METRIC_LABELS[key]}</div>
            <div className={`metric__value zone-${zone}`}>{value}</div>
            <div className="metric__bar">
              <div className={`metric__fill fill-${zone}`} style={{ width: `${value}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
