import { RESOURCE_INDEX } from '../data';
import { routeRiskLabel } from '../engine';
import { useGameStore } from '../store/gameStore';

function resourceName(resourceId: string | undefined) {
  return resourceId ? (RESOURCE_INDEX[resourceId]?.name ?? resourceId) : '商路补给';
}

export function SupplyCrisisModal() {
  const pending = useGameStore((s) => s.state.pendingSupplyCrisis);
  const resources = useGameStore((s) => s.state.resources);
  const content = useGameStore((s) => s.content);
  const dispatch = useGameStore((s) => s.dispatch);
  if (!pending) return null;

  const route = (content.regionContent ?? [])
    .flatMap((entry) => entry.routes)
    .find((item) => item.id === pending.routeId);
  const name = resourceName(pending.resourceId);
  const canBuy = (resources.coin ?? 0) >= pending.coinCost;
  const canSend = (resources.labor ?? 0) >= pending.laborCost;

  const choices = [
    {
      id: 'buy-relief',
      label: '垫资补货',
      desc: `花 ${pending.coinCost} 文从邻近市面先补 ${name}。`,
      disabled: !canBuy,
      hint: canBuy ? '补货稳路' : `缺 ${pending.coinCost - (resources.coin ?? 0)} 文`,
    },
    {
      id: 'send-workers',
      label: '派人护路',
      desc: `调 ${pending.laborCost} 工时护送补给绕开险段。`,
      disabled: !canSend,
      hint: canSend ? '耗工稳路' : `缺 ${pending.laborCost - (resources.labor ?? 0)} 工时`,
    },
    {
      id: 'accept-shortage',
      label: '承受短缺',
      desc: `暂不补救，让 ${name} 短少并承担声望和稳定损失。`,
      disabled: false,
      hint: '无前置成本',
    },
  ];

  return (
    <div className="modal__backdrop">
      <div className="modal modal--activity">
        <h3 className="modal__title">
          断供危机
          <small>{route?.name ?? pending.routeId}</small>
        </h3>
        <p className="modal__desc">
          {route?.name ?? '商路'}路况吃紧，{name}供应已经压到警戒线。若不处理，市面会先失信，再影响后续订单和开路。
        </p>
        <div className="activity-ledger">
          <div>
            <b>短缺物</b>
            <span>{name}</span>
          </div>
          <div>
            <b>路况</b>
            <span>
              {routeRiskLabel(pending.risk)} · 风险 {pending.risk} · 强度 {pending.severity}
            </span>
          </div>
        </div>

        <section className="activity-challenge">
          <div className="activity-challenge__head">
            <b>补救选择</b>
            <span>断供压力</span>
          </div>
          <div className="activity-choice-list">
            {choices.map((choice) => (
              <button
                className="activity-choice"
                disabled={choice.disabled}
                key={choice.id}
                onClick={() => dispatch({ type: 'RESOLVE_SUPPLY_CRISIS', choiceId: choice.id })}
                title={choice.hint}
                type="button"
              >
                {choice.label}
                <small>{choice.hint}</small>
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
