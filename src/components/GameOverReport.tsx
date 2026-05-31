import { useGameStore } from '../store/gameStore';
import { METRIC_KEYS, METRIC_LABELS, zoneOf, type Metrics } from '../engine';

/** 结局命运报告弹窗 */
export function GameOverReport() {
  const status = useGameStore((s) => s.state.status);
  const report = useGameStore((s) => s.state.report);
  const newGame = useGameStore((s) => s.newGame);

  if (status !== 'ended' || !report) return null;

  return (
    <div className="modal__backdrop">
      <div className="modal">
        <h3 className="modal__title">{report.title}</h3>
        <p className="modal__desc">{report.summary}</p>

        <div className="report__metrics">
          {METRIC_KEYS.map((key) => {
            const value = report.finalMetrics[key as keyof Metrics];
            return (
              <div className="metric" key={key}>
                <div className="metric__name">{METRIC_LABELS[key]}</div>
                <div className={`metric__value zone-${zoneOf(value)}`}>{value}</div>
              </div>
            );
          })}
        </div>

        {report.survivingCrafts.length > 0 && (
          <p style={{ fontSize: 13 }}>
            存续手艺：{report.survivingCrafts.join('、')}
          </p>
        )}

        {report.highlights.length > 0 && (
          <ul className="report__highlight">
            {report.highlights.map((h, i) => (
              <li key={i}>{h}</li>
            ))}
          </ul>
        )}

        <div className="btn-row" style={{ marginTop: 18 }}>
          <button className="btn" onClick={() => newGame()}>
            再启新局
          </button>
        </div>
      </div>
    </div>
  );
}
