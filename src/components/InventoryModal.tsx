import { useGameStore } from '../store/gameStore';
import { RESOURCES, RESOURCE_INDEX } from '../data';
import type { PlayerAttributeKey, ResourceTier } from '../engine';

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

/** 背包：按分层罗列当前持有的资源；通货与工时单列。 */
export function InventoryModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const state = useGameStore((s) => s.state);
  const resources = state.resources;
  const profile = state.profile;
  const calendar = state.calendar;
  const itemInstances = state.itemInstances.slice(0, 6);
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
                      <article className="item-appraisal" key={item.id}>
                        <div className="item-appraisal__head">
                          <b>{RESOURCE_INDEX[item.resourceId]?.name ?? item.resourceId}</b>
                          <span>品相 {Math.round(item.quality * 100)}</span>
                        </div>
                        <p>{item.appraisal}</p>
                        {item.descriptors.length > 0 && (
                          <div className="item-appraisal__tags">
                            {item.descriptors.map((descriptor) => (
                              <span key={descriptor}>{descriptor}</span>
                            ))}
                          </div>
                        )}
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
