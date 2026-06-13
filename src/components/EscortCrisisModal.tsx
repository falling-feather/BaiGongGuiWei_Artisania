import { NPC_INDEX } from '../data';
import { routeRiskLabel } from '../engine';
import { useGameStore } from '../store/gameStore';

function qualityText(value: number) {
  if (value >= 0.78) return '稳妥';
  if (value >= 0.58) return '可交';
  return '惊险';
}

function qualityDeltaText(value: number | undefined) {
  if (!value) return '品质不变';
  return `${value > 0 ? '+' : ''}${Math.round(value * 100)} 品质`;
}

export function EscortCrisisModal() {
  const pending = useGameStore((s) => s.state.pendingEscortCrisis);
  const content = useGameStore((s) => s.content);
  const dispatch = useGameStore((s) => s.dispatch);
  if (!pending) return null;

  const encounter = (content.escortEncounters ?? []).find((item) => item.id === pending.encounterId);
  const route = (content.regionContent ?? [])
    .flatMap((entry) => entry.routes)
    .find((item) => item.id === pending.routeId);
  const npc = NPC_INDEX[pending.npcId];
  const choices = encounter?.choices ?? [];

  return (
    <div className="modal__backdrop">
      <div className="modal modal--activity">
        <h3 className="modal__title">
          {encounter?.title ?? '护商危机'}
          <small>{route?.name ?? pending.routeId}</small>
        </h3>
        <p className="modal__desc">{encounter?.desc ?? '这段护商记录已经失效，需要撤销后重新安排。'}</p>
        <div className="activity-ledger">
          <div>
            <b>押运人</b>
            <span>{npc?.name ?? pending.npcId}</span>
          </div>
          <div>
            <b>路况</b>
            <span>
              {routeRiskLabel(pending.risk)} · 基础{qualityText(pending.quality)} · {Math.round(pending.quality * 100)}
            </span>
          </div>
        </div>

        <section className="activity-challenge">
          <div className="activity-challenge__head">
            <b>处置选择</b>
            <span>护商危机</span>
          </div>
          <div className="activity-choice-list">
            {choices.map((choice) => (
              <button
                className="activity-choice"
                key={choice.id}
                onClick={() => dispatch({ type: 'RESOLVE_ESCORT_CRISIS', choiceId: choice.id })}
                type="button"
              >
                {choice.label}
                <small>{qualityDeltaText(choice.qualityDelta)}</small>
              </button>
            ))}
          </div>
          {choices.map((choice) => (
            <p className="activity-feedback" key={`${choice.id}-desc`}>
              {choice.label}：{choice.desc}
            </p>
          ))}
        </section>
      </div>
    </div>
  );
}
