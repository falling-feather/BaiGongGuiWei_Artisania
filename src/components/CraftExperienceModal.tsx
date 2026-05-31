import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { METRIC_LABELS } from '../engine';
import { RESOURCE_INDEX } from '../data';

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
  const resources = useGameStore((s) => s.state.resources);
  const playing = useGameStore((s) => s.state.status === 'playing');
  const dispatch = useGameStore((s) => s.dispatch);
  const [skipIds, setSkipIds] = useState<string[]>([]);

  if (!craftId) return null;
  const def = content.crafts.find((c) => c.id === craftId);
  const state = craftStates.find((c) => c.craftId === craftId);
  if (!def || !state) return null;

  const toggleSkip = (id: string) =>
    setSkipIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  // 汇总当前勾选下本次开工的物料与人力成本
  const skipSet = new Set(skipIds);
  const activeSteps = def.processChain.filter((s) => !(skipSet.has(s.id) && s.skippable));
  const laborNeed = activeSteps.reduce((sum, s) => sum + s.laborCost, 0);
  const materialNeed: Record<string, number> = {};
  for (const step of activeSteps) {
    for (const [key, amount] of Object.entries(step.resourceCost)) {
      materialNeed[key] = (materialNeed[key] ?? 0) + amount;
    }
  }
  const laborShort = (resources.labor ?? 0) < laborNeed;
  const materialShort = Object.entries(materialNeed).some(
    ([key, amount]) => (resources[key] ?? 0) < amount,
  );
  const canCraft = playing && !laborShort && !materialShort;
  const resName = (id: string) => RESOURCE_INDEX[id]?.name ?? id;

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

        <div className="craft-supply">
          <div className="craft-supply__row">
            <span className="craft-supply__label">耗料</span>
            {Object.keys(materialNeed).length === 0 ? (
              <span className="craft-supply__none">仅耗工时</span>
            ) : (
              Object.entries(materialNeed).map(([key, amount]) => {
                const short = (resources[key] ?? 0) < amount;
                return (
                  <span
                    key={key}
                    className={`craft-supply__chip${short ? ' craft-supply__chip--short' : ''}`}
                  >
                    {resName(key)} {resources[key] ?? 0}/{amount}
                  </span>
                );
              })
            )}
            <span className={`craft-supply__chip${laborShort ? ' craft-supply__chip--short' : ''}`}>
              工时 {resources.labor ?? 0}/{laborNeed}
            </span>
          </div>
          {def.outputResourceId && (
            <div className="craft-supply__row">
              <span className="craft-supply__label">产出</span>
              <span className="craft-supply__chip craft-supply__chip--out">
                {resName(def.outputResourceId)} ×1
              </span>
            </div>
          )}
          {!canCraft && playing && (
            <p className="craft-supply__warn">
              {materialShort ? '物料不足，先去采料／精炼补足半成品。' : '人力不足，结束本季可恢复工时。'}
            </p>
          )}
        </div>

        <div className="btn-row">
          <button className="btn btn--bamboo" disabled={!canCraft} onClick={() => run('RUN_PROCESS')}>
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
