import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { METRIC_LABELS, type Craft, type CraftState } from '../engine';

/** 单门手艺卡：展示工序链、勾选要省略的工序、开工或接单 */
function CraftCard({ def, state }: { def: Craft; state: CraftState }) {
  const dispatch = useGameStore((s) => s.dispatch);
  const playing = useGameStore((s) => s.state.status === 'playing');
  const [skipIds, setSkipIds] = useState<string[]>([]);

  const toggleSkip = (id: string) => {
    setSkipIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  return (
    <div className="craft">
      <div className="craft__head">
        <span className="craft__name">{def.name}</span>
        <span className="craft__region">{def.region}</span>
      </div>
      <p className="craft__blurb">{def.blurb}</p>

      <ul className="steps">
        {def.processChain.map((step) => (
          <li className="step" key={step.id}>
            <input
              type="checkbox"
              id={`${def.id}-${step.id}`}
              disabled={!step.skippable}
              checked={skipIds.includes(step.id)}
              onChange={() => toggleSkip(step.id)}
            />
            <label htmlFor={`${def.id}-${step.id}`} title={step.description}>
              {step.name}
            </label>
            {step.skippable ? (
              <span className="step__skip-tag">可省略</span>
            ) : (
              <span className="step__skip-tag" style={{ color: 'var(--bamboo)' }}>
                核心工序
              </span>
            )}
          </li>
        ))}
      </ul>

      <div className="craft__metrics" style={{ fontSize: 12, opacity: 0.8, marginBottom: 10 }}>
        {(Object.keys(METRIC_LABELS) as (keyof typeof METRIC_LABELS)[]).map((k) => (
          <span key={k} style={{ marginRight: 10 }}>
            {METRIC_LABELS[k]} {state.metrics[k]}
          </span>
        ))}
      </div>

      <div className="btn-row">
        <button
          className="btn btn--bamboo"
          disabled={!playing}
          onClick={() => dispatch({ type: 'RUN_PROCESS', craftId: def.id, skipStepIds: skipIds })}
        >
          开工出品
        </button>
        <button
          className="btn btn--ghost"
          disabled={!playing}
          onClick={() => dispatch({ type: 'TAKE_ORDER', craftId: def.id })}
        >
          接商业订单
        </button>
      </div>
    </div>
  );
}

/** 手艺面板：列出全部已解锁手艺 */
export function CraftPanel() {
  const crafts = useGameStore((s) => s.state.crafts);
  const content = useGameStore((s) => s.content);

  return (
    <div className="panel">
      <h2 className="panel__title">百工作坊</h2>
      <div className="craft-grid">
        {crafts
          .filter((c) => c.unlocked)
          .map((cs) => {
            const def = content.crafts.find((d) => d.id === cs.craftId);
            if (!def) return null;
            return <CraftCard key={cs.craftId} def={def} state={cs} />;
          })}
      </div>
    </div>
  );
}
