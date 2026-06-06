import { useEffect, useState } from 'react';
import { ACTIVITY_CHALLENGE_INDEX, RESOURCE_INDEX } from '../data';
import { useGameStore } from '../store/gameStore';
import type { ActivityKind, ActivityMiniGameType, ResourcePool } from '../engine';

const KIND_LABEL: Record<ActivityKind, string> = {
  resource: '采集',
  workshop: '工坊',
  training: '修习',
  trade: '商贸',
  life: '生活',
  festival: '节令',
  route: '行路',
};

const MINI_LABEL: Record<ActivityMiniGameType, string> = {
  rhythm: '节奏点击',
  drag_path: '描线运笔',
  ratio_mix: '配比调和',
  timing_hold: '火候时机',
  aim_place: '定位摆放',
  repeat_endure: '耐心重复',
  couplet_choice: '题跋问答',
  calligraphy_trace: '书写临摹',
  crop_calendar: '节令农事',
  appraise_select: '相物鉴别',
  route_plan: '路线筹划',
  dialogue_check: '对答周旋',
};

function resName(key: string): string {
  return RESOURCE_INDEX[key]?.name ?? key;
}

function describePool(pool: ResourcePool | undefined): string {
  const entries = Object.entries(pool ?? {});
  if (entries.length === 0) return '无';
  return entries.map(([key, amount]) => `${resName(key)}x${amount}`).join('、');
}

export function ActivityModal({
  activityId,
  onClose,
}: {
  activityId: string | null;
  onClose: () => void;
}) {
  const content = useGameStore((s) => s.content);
  const state = useGameStore((s) => s.state);
  const dispatch = useGameStore((s) => s.dispatch);
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);

  useEffect(() => {
    setSelectedChoiceId(null);
  }, [activityId]);

  if (!activityId) return null;

  const activity = (content.activities ?? []).find((item) => item.id === activityId);
  if (!activity) return null;

  const challenge = ACTIVITY_CHALLENGE_INDEX[activity.id] ?? null;
  const selectedChoice = challenge?.choices.find((choice) => choice.id === selectedChoiceId) ?? null;
  const completed = state.completedActivities.includes(activity.id);
  const laborShort = (state.resources.labor ?? 0) < activity.laborCost;
  const phaseBlocked = Boolean(
    activity.availablePhases && !activity.availablePhases.includes(state.calendar.phase),
  );
  const materialShort = Object.entries(activity.resourceCost ?? {}).some(
    ([key, amount]) => (state.resources[key] ?? 0) < amount,
  );
  const routeRows = new Map(
    (content.regionContent?.flatMap((spec) => spec.routes) ?? []).map((route) => [route.id, route.name]),
  );
  const routeReward = (activity.reward.routeIds ?? [])
    .map((routeId) => routeRows.get(routeId) ?? routeId)
    .join('、');
  const canPerform =
    state.status === 'playing' &&
    !laborShort &&
    !phaseBlocked &&
    !materialShort &&
    !(activity.once && completed) &&
    (!challenge || Boolean(selectedChoice));
  const rewardText = [
    describePool(activity.reward.resources),
    activity.reward.attributes
      ? Object.entries(activity.reward.attributes).map(([key, amount]) => `${key}+${amount}`).join('、')
      : '',
    routeReward ? `路线情报：${routeReward}` : '',
  ]
    .filter((value) => value && value !== '无')
    .join('；') || '阅历';

  const perform = () => {
    dispatch({ type: 'PERFORM_ACTIVITY', activityId: activity.id, quality: selectedChoice?.quality ?? 0.82 });
    onClose();
  };

  return (
    <div className="modal__backdrop" onClick={onClose}>
      <div className="modal modal--activity" onClick={(event) => event.stopPropagation()}>
        <h3 className="modal__title">
          {activity.name}
          <small>{KIND_LABEL[activity.kind]}</small>
        </h3>
        <p className="modal__desc">{activity.blurb}</p>
        <p className="activity-detail">{activity.detail}</p>

        <div className="activity-tags">
          {activity.miniGames.map((miniGame) => (
            <span key={miniGame}>{MINI_LABEL[miniGame]}</span>
          ))}
        </div>

        {challenge && (
          <section className="activity-challenge">
            <div className="activity-challenge__head">
              <b>{challenge.title}</b>
              <span>{MINI_LABEL[challenge.miniGame]}</span>
            </div>
            <p>{challenge.prompt}</p>
            <div className="activity-choice-list">
              {challenge.choices.map((choice) => (
                <button
                  className={`activity-choice${choice.id === selectedChoiceId ? ' is-selected' : ''}`}
                  key={choice.id}
                  onClick={() => setSelectedChoiceId(choice.id)}
                  type="button"
                >
                  {choice.label}
                </button>
              ))}
            </div>
            {selectedChoice && <p className="activity-feedback">{selectedChoice.feedback}</p>}
          </section>
        )}

        <div className="activity-ledger">
          <div>
            <b>消耗</b>
            <span>
              工时x{activity.laborCost}
              {activity.resourceCost ? `；${describePool(activity.resourceCost)}` : ''}
            </span>
          </div>
          <div>
            <b>收获</b>
            <span>{rewardText}</span>
          </div>
        </div>

        {activity.once && completed && <p className="craft-supply__warn">这项活动已经完成过。</p>}
        {(laborShort || materialShort || phaseBlocked) && state.status === 'playing' && (
          <p className="craft-supply__warn">
            {laborShort
              ? '本季工时不足。'
              : phaseBlocked
                ? '当前时段不合适，先推进时间。'
                : '所需物料不足，先去采料或加工补足。'}
          </p>
        )}

        <div className="btn-row">
          <button className="btn btn--bamboo" disabled={!canPerform} onClick={perform}>
            完成体验
          </button>
          <button className="btn btn--ghost" onClick={onClose}>
            离开
          </button>
        </div>
      </div>
    </div>
  );
}
