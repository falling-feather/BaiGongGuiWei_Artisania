import { useEffect, useState } from 'react';
import { ACTIVITY_CHALLENGE_INDEX, RESOURCE_INDEX } from '../data';
import { useGameStore } from '../store/gameStore';
import type {
  ActivityChallengeChoice,
  ActivityChallengeDef,
  ActivityChallengeRoundDef,
  ActivityKind,
  ActivityMiniGameType,
  ActivityStallDef,
  ResourcePool,
} from '../engine';

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

function generatedOrderText(activity: { reward: { generatedOrder?: {
  title: string;
  resourceId: string;
  quantity: number;
  expiresIn: number;
  dayCycle?: { cycleDays: number; offset: number; label: string };
} } }, day: number): string {
  const order = activity.reward.generatedOrder;
  if (!order) return '';
  const cycle = order.dayCycle;
  const dayNote = cycle
    ? ((((day - cycle.offset) % cycle.cycleDays + cycle.cycleDays) % cycle.cycleDays === 0)
        ? cycle.label
        : `${cycle.label}未到`)
    : '活动后';
  return `节令单：${order.title}（${resName(order.resourceId)}x${order.quantity}，限${order.expiresIn}日，${dayNote}）`;
}

function stallText(stall: ActivityStallDef | undefined, day: number): string {
  if (!stall) return '';
  const cycle = stall.dayCycle;
  const dayNote = cycle
    ? ((((day - cycle.offset) % cycle.cycleDays + cycle.cycleDays) % cycle.cycleDays === 0)
        ? cycle.label
        : `${cycle.label}外`)
    : '常设';
  const customerNote = stall.customers?.length ? `，客群 ${stall.customers.map((customer) => customer.title).join('、')}` : '';
  const comboNote = stall.combos?.length ? `，组合 ${stall.combos.map((combo) => combo.title).join('、')}` : '';
  const strategyNote = stall.strategies?.length ? `，策略 ${stall.strategies.map((strategy) => strategy.title).join('、')}` : '';
  return `节令摊位：${stall.title}（可售 ${stall.stockResourceIds.map(resName).join('、')}，${dayNote}${customerNote}${comboNote}${strategyNote}）`;
}

function getChallengeRounds(challenge: ActivityChallengeDef | null): ActivityChallengeRoundDef[] {
  if (!challenge) return [];
  if (challenge.rounds?.length) return challenge.rounds;
  return [{ id: `${challenge.id}:main`, prompt: challenge.prompt, choices: challenge.choices }];
}

function averageChallengeQuality(choices: ActivityChallengeChoice[]): number {
  if (choices.length === 0) return 0.82;
  const total = choices.reduce((sum, choice) => sum + choice.quality, 0);
  return Number((total / choices.length).toFixed(2));
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
  const [selectedChoiceIds, setSelectedChoiceIds] = useState<Record<string, string>>({});
  const [selectedStallStrategyId, setSelectedStallStrategyId] = useState<string | null>(null);

  useEffect(() => {
    setSelectedChoiceIds({});
    setSelectedStallStrategyId(null);
  }, [activityId]);

  if (!activityId) return null;

  const activity = (content.activities ?? []).find((item) => item.id === activityId);
  if (!activity) return null;

  const challenge = ACTIVITY_CHALLENGE_INDEX[activity.id] ?? null;
  const challengeRounds = getChallengeRounds(challenge);
  const selectedChoices = challengeRounds
    .map((round) => round.choices.find((choice) => choice.id === selectedChoiceIds[round.id]))
    .filter((choice): choice is ActivityChallengeChoice => Boolean(choice));
  const challengeComplete = !challenge || selectedChoices.length === challengeRounds.length;
  const challengeQuality = challenge ? averageChallengeQuality(selectedChoices) : 0.82;
  const stallStrategies = activity.reward.stall?.strategies ?? [];
  const selectedStallStrategy = stallStrategies.find((strategy) => strategy.id === selectedStallStrategyId) ?? null;
  const completed = state.completedActivities.includes(activity.id);
  const pendingStallClosing = Boolean(state.pendingActivityStallClosing);
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
    !pendingStallClosing &&
    !laborShort &&
    !phaseBlocked &&
    !materialShort &&
    !(activity.once && completed) &&
    challengeComplete &&
    (stallStrategies.length === 0 || Boolean(selectedStallStrategy));
  const rewardText = [
    describePool(activity.reward.resources),
    activity.reward.attributes
      ? Object.entries(activity.reward.attributes).map(([key, amount]) => `${key}+${amount}`).join('、')
      : '',
    routeReward ? `路线情报：${routeReward}` : '',
    generatedOrderText(activity, state.calendar.day),
    stallText(activity.reward.stall, state.calendar.day),
  ]
    .filter((value) => value && value !== '无')
    .join('；') || '阅历';

  const perform = () => {
    dispatch({
      type: 'PERFORM_ACTIVITY',
      activityId: activity.id,
      quality: challengeQuality,
      stallStrategyId: selectedStallStrategy?.id,
    });
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
            <div className="activity-round-list">
              {challengeRounds.map((round, index) => (
                <div className="activity-round" key={round.id}>
                  <p className="activity-round__prompt">
                    {challengeRounds.length > 1 ? `第 ${index + 1} 轮：${round.prompt}` : round.prompt}
                  </p>
                  <div className="activity-choice-list">
                    {round.choices.map((choice) => {
                      const selected = choice.id === selectedChoiceIds[round.id];
                      return (
                        <button
                          className={`activity-choice${selected ? ' is-selected' : ''}`}
                          data-smoke={`activity-choice:${activity.id}:${round.id}:${choice.id}`}
                          key={choice.id}
                          onClick={() =>
                            setSelectedChoiceIds((current) => ({ ...current, [round.id]: choice.id }))
                          }
                          type="button"
                        >
                          {choice.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            {selectedChoices.length > 0 && (
              <div className="activity-feedback">
                {selectedChoices.map((choice) => (
                  <p key={choice.id}>{choice.feedback}</p>
                ))}
              </div>
            )}
          </section>
        )}

        {stallStrategies.length > 0 && (
          <section className="activity-challenge">
            <div className="activity-challenge__head">
              <b>摊位策略</b>
              <span>{activity.reward.stall?.title}</span>
            </div>
            <div className="activity-choice-list">
              {stallStrategies.map((strategy) => (
                <button
                  className={`activity-choice${strategy.id === selectedStallStrategyId ? ' is-selected' : ''}`}
                  data-smoke={`activity-strategy:${activity.id}:${strategy.id}`}
                  key={strategy.id}
                  onClick={() => setSelectedStallStrategyId(strategy.id)}
                  type="button"
                >
                  {strategy.title}
                  <small>{strategy.desc}</small>
                </button>
              ))}
            </div>
            {selectedStallStrategy && <p className="activity-feedback">{selectedStallStrategy.desc}</p>}
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
        {pendingStallClosing && <p className="craft-supply__warn">先处理当前摊位收束，再安排新的地区活动。</p>}
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
          <button
            className="btn btn--bamboo"
            data-smoke={`activity-perform:${activity.id}`}
            disabled={!canPerform}
            onClick={perform}
          >
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
