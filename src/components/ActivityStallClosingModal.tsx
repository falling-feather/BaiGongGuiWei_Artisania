import { RESOURCE_INDEX } from '../data';
import type { ActivityStallClosingChoiceDef, ResourcePool } from '../engine';
import { useGameStore } from '../store/gameStore';

function resName(key: string): string {
  return RESOURCE_INDEX[key]?.name ?? key;
}

function describePool(pool: ResourcePool | undefined): string {
  const entries = Object.entries(pool ?? {});
  if (entries.length === 0) return '无';
  return entries.map(([key, amount]) => `${resName(key)}x${amount}`).join('、');
}

function canPay(resources: ResourcePool, cost: ResourcePool | undefined): boolean {
  return Object.entries(cost ?? {}).every(([key, amount]) => (resources[key] ?? 0) >= amount);
}

function choiceHint(choice: ActivityStallClosingChoiceDef, resources: ResourcePool): string {
  const cost = describePool(choice.resourceCost);
  const reward = describePool(choice.resources);
  const affordable = canPay(resources, choice.resourceCost);
  const parts = [];
  if (cost === '无' && reward === '无') parts.push('记录与声望');
  else if (cost === '无') parts.push(`收获：${reward}`);
  else if (reward === '无') parts.push(affordable ? `消耗：${cost}` : `不足：${cost}`);
  else parts.push(affordable ? `消耗：${cost}；收获：${reward}` : `不足：${cost}`);
  if (choice.followUpOrder) parts.push(`后续：${choice.followUpOrder.title}`);
  return parts.join(' · ');
}

export function ActivityStallClosingModal() {
  const pending = useGameStore((s) => s.state.pendingActivityStallClosing);
  const resources = useGameStore((s) => s.state.resources);
  const content = useGameStore((s) => s.content);
  const dispatch = useGameStore((s) => s.dispatch);
  if (!pending) return null;

  const activity = (content.activities ?? []).find((item) => item.id === pending.activityId);
  const choices = activity?.reward.stall?.closingChoices ?? [];

  return (
    <div className="modal__backdrop">
      <div className="modal modal--activity">
        <h3 className="modal__title">
          摊位收束
          <small>{pending.stallTitle}</small>
        </h3>
        <p className="modal__desc">
          一轮节令摊位已经收成可追记忆。主事人等你定下最后一笔：是归档账簿、留给人情，还是把样货押往下一程。
        </p>
        <div className="activity-ledger">
          <div>
            <b>摊位人气</b>
            <span>{pending.crowd}</span>
          </div>
          <div>
            <b>本夜进账</b>
            <span>{pending.revenue} 文</span>
          </div>
        </div>

        <section className="activity-challenge">
          <div className="activity-challenge__head">
            <b>{pending.stageTitle ?? '收摊处置'}</b>
            <span>节令收束</span>
          </div>
          <div className="activity-choice-list">
            {choices.map((choice) => {
              const disabled = !canPay(resources, choice.resourceCost);
              return (
                <button
                  className="activity-choice"
                  disabled={disabled}
                  key={choice.id}
                  onClick={() => dispatch({ type: 'RESOLVE_ACTIVITY_STALL_CLOSING', choiceId: choice.id })}
                  type="button"
                >
                  {choice.title}
                  <small>{choiceHint(choice, resources)}</small>
                </button>
              );
            })}
          </div>
          {choices.map((choice) => (
            <p className="activity-feedback" key={`${choice.id}-desc`}>
              {choice.title}：{choice.desc}
            </p>
          ))}
        </section>
      </div>
    </div>
  );
}
