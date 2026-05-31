import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { METRIC_LABELS } from '../engine';

/** 手艺体验弹窗：玩家在街上进入某体验点后弹出，可勾选省略工序并开工。 */
export function CraftExperienceModal({
  craftId,
  onClose,
}: {
  craftId: string | null;
  onClose: () => void;
}) {
  const content = useGameStore((s) => s.content);
  const craftStates = useGameStore((s) => s.state.crafts);
  const playing = useGameStore((s) => s.state.status === 'playing');
  const dispatch = useGameStore((s) => s.dispatch);
  const [skipIds, setSkipIds] = useState<string[]>([]);

  if (!craftId) return null;
  const def = content.crafts.find((c) => c.id === craftId);
  const state = craftStates.find((c) => c.craftId === craftId);
  if (!def || !state) return null;

  const toggleSkip = (id: string) =>
    setSkipIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const run = (action: 'RUN_PROCESS' | 'TAKE_ORDER') => {
    if (action === 'RUN_PROCESS') {
      dispatch({ type: 'RUN_PROCESS', craftId: def.id, skipStepIds: skipIds });
    } else {
      dispatch({ type: 'TAKE_ORDER', craftId: def.id });
    }
  };

  return (
    <div className="modal__backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal__title">
          {def.name} <small style={{ fontSize: 12, color: 'var(--indigo-soft)' }}>{def.region}</small>
        </h3>
        <p className="modal__desc">{def.blurb}</p>

        <ul className="steps">
          {def.processChain.map((step) => (
            <li className="step" key={step.id}>
              <input
                type="checkbox"
                id={`exp-${step.id}`}
                disabled={!step.skippable}
                checked={skipIds.includes(step.id)}
                onChange={() => toggleSkip(step.id)}
              />
              <label htmlFor={`exp-${step.id}`} title={step.description}>
                {step.name}
              </label>
              <span
                className="step__skip-tag"
                style={{ color: step.skippable ? 'var(--vermilion)' : 'var(--bamboo)' }}
              >
                {step.skippable ? '可省略' : '核心工序'}
              </span>
            </li>
          ))}
        </ul>

        <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 12 }}>
          {(Object.keys(METRIC_LABELS) as (keyof typeof METRIC_LABELS)[]).map((k) => (
            <span key={k} style={{ marginRight: 10 }}>
              {METRIC_LABELS[k]} {state.metrics[k]}
            </span>
          ))}
        </div>

        <div className="btn-row">
          <button className="btn btn--bamboo" disabled={!playing} onClick={() => run('RUN_PROCESS')}>
            亲手制作
          </button>
          <button className="btn btn--ghost" disabled={!playing} onClick={() => run('TAKE_ORDER')}>
            接订单
          </button>
          <button className="btn btn--ghost" onClick={onClose}>
            离开
          </button>
        </div>
      </div>
    </div>
  );
}
