import { useGameStore } from '../store/gameStore';

/** 操作 / 事件日志（最新在前） */
export function ActionLog() {
  const log = useGameStore((s) => s.state.log);
  return (
    <div className="panel">
      <h2 className="panel__title">镇志</h2>
      <div className="log">
        {log.length === 0 ? (
          <p>新的一季伊始，百工待兴。</p>
        ) : (
          log.map((line, i) => <p key={i}>{line}</p>)
        )}
      </div>
    </div>
  );
}
