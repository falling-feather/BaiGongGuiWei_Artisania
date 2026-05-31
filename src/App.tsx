import { useEffect } from 'react';
import { useGameStore } from './store/gameStore';
import { MetricsBar } from './components/MetricsBar';
import { ResourceBar } from './components/ResourceBar';
import { CraftPanel } from './components/CraftPanel';
import { ActionLog } from './components/ActionLog';
import { EventModal } from './components/EventModal';
import { GameOverReport } from './components/GameOverReport';

export function App() {
  const turn = useGameStore((s) => s.state.turn);
  const maxTurns = useGameStore((s) => s.state.maxTurns);
  const playing = useGameStore((s) => s.state.status === 'playing');
  const hasEvent = useGameStore((s) => s.state.pendingEvent !== null);
  const dispatch = useGameStore((s) => s.dispatch);
  const newGame = useGameStore((s) => s.newGame);
  const loadFromStorage = useGameStore((s) => s.loadFromStorage);

  // 首次挂载时尝试恢复存档
  useEffect(() => {
    void loadFromStorage();
  }, [loadFromStorage]);

  return (
    <div className="app">
      <header className="app__header">
        <h1 className="app__title">
          百工归位<small>Artisania</small>
        </h1>
        <span className="app__turn">
          第 {turn} / {maxTurns} 季
        </span>
      </header>

      <MetricsBar />
      <ResourceBar />
      <CraftPanel />

      <div className="panel">
        <h2 className="panel__title">镇务</h2>
        <div className="btn-row">
          <button
            className="btn btn--vermilion"
            disabled={!playing}
            onClick={() => dispatch({ type: 'HOLD_EXHIBITION' })}
          >
            举办市集 / 展演
          </button>
          <button
            className="btn"
            disabled={!playing || hasEvent}
            onClick={() => dispatch({ type: 'END_TURN' })}
          >
            结束本季
          </button>
          <button className="btn btn--ghost" onClick={() => newGame()}>
            重开
          </button>
        </div>
      </div>

      <ActionLog />

      <EventModal />
      <GameOverReport />
    </div>
  );
}
