import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { METRIC_LABELS, orderPrice } from '../engine';
import { RESOURCE_INDEX } from '../data';
import { CRAFT_PAGE_THEMES } from './craftPageThemes';

/**
 * 工艺独立页 —— 整页工坊（替代弹窗）。
 * 已在 craftPageThemes 登记的手艺以此页呈现：左侧主题立绘/工坊story，右侧工坊台交互。
 * 交互逻辑（亲手制作 / 接订单）与弹窗一致，走同样的 reducer 动作，保证闭环不变。
 */
export function CraftPage({ craftId, onClose }: { craftId: string; onClose: () => void }) {
  const content = useGameStore((s) => s.content);
  const craftStates = useGameStore((s) => s.state.crafts);
  const resources = useGameStore((s) => s.state.resources);
  const playing = useGameStore((s) => s.state.status === 'playing');
  const dispatch = useGameStore((s) => s.dispatch);
  const [skipIds, setSkipIds] = useState<string[]>([]);

  const def = content.crafts.find((c) => c.id === craftId);
  const state = craftStates.find((c) => c.craftId === craftId);
  const theme = CRAFT_PAGE_THEMES[craftId];
  if (!def || !state || !theme) return null;

  const toggleSkip = (id: string) =>
    setSkipIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

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

  const outputId = def.outputResourceId;
  const stock = outputId ? (resources[outputId] ?? 0) : 0;
  const orderQuote = outputId
    ? orderPrice(RESOURCE_INDEX[outputId]?.value ?? 12, state.metrics.heritage)
    : 0;
  const canDeliver = playing && !!outputId && stock >= 1;

  return (
    <div className="craft-page" style={{ ['--page-accent' as string]: theme.accent }}>
      <header className="craft-page__bar">
        <button className="btn btn--ghost" onClick={onClose}>
          ← 返回街市
        </button>
        <h2 className="craft-page__title">
          {def.name}
          <small> · {def.region}</small>
        </h2>
        <div className="craft-page__metrics">
          {(Object.keys(METRIC_LABELS) as (keyof typeof METRIC_LABELS)[]).map((k) => (
            <span key={k}>
              {METRIC_LABELS[k]} {state.metrics[k]}
            </span>
          ))}
        </div>
      </header>

      <div className="craft-page__body">
        <section className="craft-page__story">
          <div className="craft-page__hero" aria-label={theme.artHeroNote}>
            <span className="craft-page__hero-tag">{theme.artHeroNote}</span>
          </div>
          <p className="craft-page__tagline">{theme.tagline}</p>
          {theme.story.map((p, i) => (
            <p key={i} className="craft-page__para">
              {p}
            </p>
          ))}
          <ul className="craft-page__tips">
            {theme.tips.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </section>

        <section className="craft-page__work">
          <h3>工坊台 · {def.name}</h3>
          <p className="craft-page__work-desc">{def.blurb}</p>

          <ul className="steps">
            {def.processChain.map((step) => (
              <li className="step" key={step.id}>
                <input
                  type="checkbox"
                  id={`page-${step.id}`}
                  disabled={!step.skippable}
                  checked={skipIds.includes(step.id)}
                  onChange={() => toggleSkip(step.id)}
                />
                <label htmlFor={`page-${step.id}`} title={step.description}>
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
            {outputId && (
              <div className="craft-supply__row">
                <span className="craft-supply__label">产出</span>
                <span className="craft-supply__chip craft-supply__chip--out">
                  {resName(outputId)} ×1
                </span>
                <span className="craft-supply__chip">库存 {stock}</span>
                <span className="craft-supply__chip craft-supply__chip--out">订单价 {orderQuote} 文</span>
              </div>
            )}
            {!canCraft && playing && (
              <p className="craft-supply__warn">
                {materialShort ? '物料不足，先去采料／精炼补足半成品。' : '人力不足，结束本季可恢复工时。'}
              </p>
            )}
          </div>

          <div className="btn-row">
            <button
              className="btn btn--bamboo"
              disabled={!canCraft}
              onClick={() => dispatch({ type: 'RUN_PROCESS', craftId: def.id, skipStepIds: skipIds })}
            >
              亲手制作
            </button>
            <button
              className="btn btn--ghost"
              disabled={!canDeliver}
              title={
                !outputId
                  ? '此体验点不产成品'
                  : stock < 1
                    ? '暂无成品可交付，先亲手制作一件'
                    : `交付 1 件，进账约 ${orderQuote} 文`
              }
              onClick={() => dispatch({ type: 'TAKE_ORDER', craftId: def.id })}
            >
              接订单{outputId && stock >= 1 ? ` · ${orderQuote}文` : ''}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
