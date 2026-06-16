import { useGameStore } from '../store/gameStore';
import { RESOURCES, RESOURCE_INDEX } from '../data';
import { craftInteractionFor, itemEffectiveQuality, itemSaleValue } from '../engine';
import type { CraftRepairOptionDef, CraftStageOutcome, ItemDefect, ItemInstance, ItemQualityDimension, PlayerAttributeKey, ResourcePool, ResourceTier } from '../engine';

const TIER_LABEL: Record<ResourceTier, string> = {
  raw: '原料 · 天然物',
  material: '半成品 · 可运输材料',
  product: '成品 · 出品',
};
const TIER_ORDER: ResourceTier[] = ['raw', 'material', 'product'];
const ATTRIBUTE_LABEL: Record<PlayerAttributeKey, string> = {
  craft: '手艺',
  knowledge: '见闻',
  people: '人缘',
  commerce: '商誉',
  stamina: '体魄',
  mind: '心境',
};
const ATTRIBUTE_ORDER: PlayerAttributeKey[] = ['craft', 'knowledge', 'people', 'commerce', 'stamina', 'mind'];
const PHASE_LABEL = {
  dawn: '清晨',
  morning: '上午',
  afternoon: '下午',
  dusk: '黄昏',
  night: '夜间',
} as const;
const SEASON_LABEL = {
  spring: '春',
  summer: '夏',
  autumn: '秋',
  winter: '冬',
} as const;
const WEATHER_LABEL = {
  clear: '晴',
  rain: '雨',
  snow: '雪',
} as const;
const ITEM_STATUS_LABEL = {
  held: '持有',
  displayed: '陈列',
  gifted: '已赠',
  sold: '已售',
} as const;
const QUALITY_DIMENSION_LABEL: Record<ItemQualityDimension, string> = {
  purity: '料性',
  grain: '纹理',
  hardness: '硬度',
  resilience: '筋骨',
  spirit: '气韵',
  form: '形制',
  handling: '手感',
  sharpness: '锋口',
  finish: '光面',
  merchantTrust: '商信',
};
const STAGE_OUTCOME_LABEL: Record<CraftStageOutcome['result'], string> = {
  steady: '稳',
  standard: '平',
  risky: '险',
};

function describeCost(cost: ResourcePool | undefined, laborCost: number): string {
  const parts = Object.entries(cost ?? {}).map(([resourceId, amount]) => `${RESOURCE_INDEX[resourceId]?.name ?? resourceId}×${amount}`);
  parts.push(`工时×${laborCost}`);
  return parts.join(' / ');
}

function hasEnoughResources(resources: ResourcePool, cost: ResourcePool | undefined, laborCost: number): boolean {
  if ((resources.labor ?? 0) < laborCost) return false;
  return Object.entries(cost ?? {}).every(([resourceId, amount]) => (resources[resourceId] ?? 0) >= amount);
}

/** 背包：按分层罗列当前持有的资源；通货与工时单列。 */
export function InventoryModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const state = useGameStore((s) => s.state);
  const content = useGameStore((s) => s.content);
  const dispatch = useGameStore((s) => s.dispatch);
  const resources = state.resources;
  const profile = state.profile;
  const calendar = state.calendar;
  const itemInstances = [...state.itemInstances].sort((a, b) => b.createdTurn - a.createdTurn).slice(0, 8);
  if (!open) return null;

  const coin = resources.coin ?? 0;
  const labor = resources.labor ?? 0;

  // 仅展示库存 > 0 的资源，按其在 RESOURCES 中定义的分层归组
  const owned = Object.entries(resources).filter(
    ([k, v]) => v > 0 && k !== 'coin' && k !== 'labor',
  );
  const byTier: Record<ResourceTier, { key: string; name: string; amount: number }[]> = {
    raw: [],
    material: [],
    product: [],
  };
  const misc: { key: string; name: string; amount: number }[] = [];
  for (const [key, amount] of owned) {
    const def = RESOURCE_INDEX[key];
    const item = { key, name: def?.name ?? key, amount };
    if (def) byTier[def.tier].push(item);
    else misc.push(item);
  }
  // 维持 RESOURCES 定义顺序
  const order = new Map(RESOURCES.map((r, i) => [r.id, i]));
  for (const tier of TIER_ORDER) {
    byTier[tier].sort((a, b) => (order.get(a.key) ?? 0) - (order.get(b.key) ?? 0));
  }
  const totalKinds = owned.length;
  const repairOptionsFor = (item: ItemInstance, defect: ItemDefect): CraftRepairOptionDef[] => {
    const spec = craftInteractionFor(content, item.sourceCraftId, {
      regionId: item.originRegionId,
      subregionId: item.originSubregionId,
    });
    return spec?.repairOptions.filter((option) => defect.repairOptionIds.includes(option.id)) ?? [];
  };

  return (
    <div className="modal__backdrop" onClick={onClose}>
      <div className="modal modal--wide" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal__title">行囊 · 背包</h3>
        <div className="bag-top">
          <span className="bag-coin">通货 {coin} 文</span>
          <span className="bag-labor">本季工时 {labor}</span>
          <span className="bag-count">货品 {totalKinds} 种</span>
        </div>

        <div className="bag-layout">
          <aside className="character-panel">
            <div className="character-panel__head">
              <span>{state.playerName || '无名匠人'}</span>
              <b>{profile.title}</b>
            </div>
            <div className="character-panel__meta">
              第 {calendar.day} 日 · {SEASON_LABEL[calendar.season]} · {PHASE_LABEL[calendar.phase]} · {WEATHER_LABEL[calendar.weather]}
            </div>
            <div className="character-stats">
              {ATTRIBUTE_ORDER.map((key) => (
                <div className="character-stat" key={key}>
                  <span>{ATTRIBUTE_LABEL[key]}</span>
                  <b>{profile.attributes[key]}</b>
                  <i style={{ width: `${profile.attributes[key]}%` }} />
                </div>
              ))}
            </div>
          </aside>

          <div className="bag-inventory">
            {totalKinds === 0 && misc.length === 0 && itemInstances.length === 0 ? (
              <p className="modal__desc">行囊空空，去各地采料、开工攒些家底吧。</p>
            ) : (
              <div className="bag-body">
                {itemInstances.length > 0 && (
                  <div className="panel-block item-appraisals">
                    <div className="panel-block__title">近作评鉴</div>
                    {itemInstances.map((item) => (
                      <article className={`item-appraisal item-appraisal--${item.status ?? 'held'}`} key={item.id}>
                        <div className="item-appraisal__head">
                          <b>{item.displayName ?? RESOURCE_INDEX[item.resourceId]?.name ?? item.resourceId}</b>
                          <span>品相 {Math.round(item.quality * 100)}</span>
                        </div>
                        <div className="item-appraisal__meta">
                          <span>{RESOURCE_INDEX[item.resourceId]?.name ?? item.resourceId}</span>
                          <span>{ITEM_STATUS_LABEL[item.status ?? 'held']}</span>
                          {item.status === 'sold' && item.soldForCoin !== undefined && <span>成交 {item.soldForCoin} 文</span>}
                          {item.authorName && <span>作者 {item.authorName}</span>}
                        </div>
                        <p>{item.appraisal}</p>
                        {item.inscription && <p className="item-appraisal__inscription">题跋：{item.inscription}</p>}
                        {item.descriptors.length > 0 && (
                          <div className="item-appraisal__tags">
                            {item.descriptors.map((descriptor) => (
                              <span key={descriptor}>{descriptor}</span>
                            ))}
                          </div>
                        )}
                        {item.qualityDimensions && Object.keys(item.qualityDimensions).length > 0 && (
                          <div className="item-appraisal__quality">
                            {(Object.entries(item.qualityDimensions) as [ItemQualityDimension, number][])
                              .slice(0, 6)
                              .map(([dimension, value]) => (
                                <span key={dimension}>
                                  {QUALITY_DIMENSION_LABEL[dimension]} {Math.round(value * 100)}
                                </span>
                              ))}
                          </div>
                        )}
                        {(item.craftStageOutcomes ?? []).length > 0 && (
                          <div className="item-appraisal__quality">
                            {(item.craftStageOutcomes ?? []).slice(0, 4).map((outcome) => (
                              <span key={outcome.stageId} title={outcome.resultText}>
                                {outcome.stageName} {STAGE_OUTCOME_LABEL[outcome.result]} 控{Math.round(outcome.controlScore * 100)} / 险{Math.round(outcome.riskScore * 100)}
                                {outcome.focusCheck ? ` · ${outcome.focusCheck.choiceLabel}` : ''}
                                {outcome.mentorIntervention ? ' · 师傅复核' : ''}
                              </span>
                            ))}
                          </div>
                        )}
                        {(item.craftFocusCheckRecords ?? []).length > 0 && (
                          <p className="item-appraisal__inscription">
                            专注校准：{(item.craftFocusCheckRecords ?? []).map((record) => `${record.stageName}（${record.choiceLabel}）`).join('、')}
                          </p>
                        )}
                        {(item.craftMentorInterventions ?? []).length > 0 && (
                          <p className="item-appraisal__inscription">
                            现场复核：{(item.craftMentorInterventions ?? []).map((intervention) => `${intervention.stageName}（${intervention.reason}）`).join('、')}
                          </p>
                        )}
                        {(item.defects ?? []).length > 0 && (
                          <div className="item-appraisal__defects">
                            {(item.defects ?? []).map((defect) => (
                              <div className="item-defect" key={defect.id}>
                                <div className="item-defect__head">
                                  <b>{defect.label}</b>
                                  <span>缺陷 {defect.severity}</span>
                                </div>
                                <p>{defect.description}</p>
                                {defect.sourceStageName && (
                                  <p>诊断：{defect.sourceStageName} · {defect.sourceReason ?? '工序风险累积'}</p>
                                )}
                                <div className="item-defect__actions">
                                  {repairOptionsFor(item, defect).map((option) => {
                                    const canRepair =
                                      item.status !== 'gifted' &&
                                      item.status !== 'sold' &&
                                      hasEnoughResources(resources, option.resourceCost, option.laborCost);
                                    return (
                                      <button
                                        className="btn btn--sm btn--bamboo"
                                        key={option.id}
                                        disabled={!canRepair}
                                        title={`${option.description}；${describeCost(option.resourceCost, option.laborCost)}`}
                                        onClick={() =>
                                          dispatch({
                                            type: 'REPAIR_ITEM',
                                            itemId: item.id,
                                            defectId: defect.id,
                                            repairOptionId: option.id,
                                          })
                                        }
                                      >
                                        {option.label}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        {(item.repairHistory ?? []).length > 0 && (
                          <p className="item-appraisal__inscription">
                            最近返修：{item.repairHistory?.[0]?.summary}
                            {item.repairHistory?.[0]?.sourceStageName ? `（病根：${item.repairHistory[0].sourceStageName}）` : ''}
                          </p>
                        )}
                        <div className="item-appraisal__actions">
                          <button
                            className="btn btn--sm btn--ghost"
                            disabled={itemEffectiveQuality(item) < 0.7 || item.status === 'gifted' || item.status === 'sold' || Boolean(item.displayName)}
                            title={itemEffectiveQuality(item) < 0.7 ? '有效品相 70 以上才可列为代表作，缺陷会拖低评定' : '为作品自动题名'}
                            onClick={() => dispatch({ type: 'NAME_ITEM', itemId: item.id })}
                          >
                            题名
                          </button>
                          <button
                            className="btn btn--sm btn--bamboo"
                            disabled={item.status === 'gifted' || item.status === 'sold' || item.status === 'displayed'}
                            onClick={() => dispatch({ type: 'DISPLAY_ITEM', itemId: item.id })}
                          >
                            陈列
                          </button>
                          <button
                            className="btn btn--sm btn--ghost"
                            disabled={item.status === 'gifted' || item.status === 'sold' || (resources[item.resourceId] ?? 0) < 1}
                            title={`估价 ${itemSaleValue(content, state, item)} 文`}
                            onClick={() => dispatch({ type: 'SELL_ITEM', itemId: item.id })}
                          >
                            售出
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
                {TIER_ORDER.map((tier) =>
                  byTier[tier].length === 0 ? null : (
                    <div className="panel-block" key={tier}>
                      <div className="panel-block__title">{TIER_LABEL[tier]}</div>
                      <div className="region-chips">
                        {byTier[tier].map((it) => (
                          <span className="stock-chip" key={it.key} title={RESOURCE_INDEX[it.key]?.blurb}>
                            {it.name} ×{it.amount}
                          </span>
                        ))}
                      </div>
                    </div>
                  ),
                )}
                {misc.length > 0 && (
                  <div className="panel-block">
                    <div className="panel-block__title">其他</div>
                    <div className="region-chips">
                      {misc.map((it) => (
                        <span className="stock-chip" key={it.key}>
                          {it.name} ×{it.amount}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="btn-row">
          <button className="btn btn--ghost" onClick={onClose}>关闭</button>
        </div>
      </div>
    </div>
  );
}
