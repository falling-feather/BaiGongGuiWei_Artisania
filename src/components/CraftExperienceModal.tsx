import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import {
  CRAFT_FOCUS_CHECK_OPTIONS,
  CRAFT_TECHNIQUE_OPTIONS,
  DEFAULT_CRAFT_FOCUS_CHECK_CHOICE,
  DEFAULT_CRAFT_TECHNIQUE_CHOICE,
  METRIC_LABELS,
  activeTechniqueStages,
  craftFocusCheckOption,
  craftTechniqueOption,
  orderPrice,
  type CraftFocusCheckChoiceId,
  type CraftTechniqueChoiceId,
} from '../engine';
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
  const workshopUpgradeRecords = useGameStore((s) => s.state.workshopUpgrades);
  const currentRegion = useGameStore((s) => s.state.currentRegion);
  const currentSubregion = useGameStore((s) => s.state.currentSubregion);
  const playing = useGameStore((s) => s.state.status === 'playing');
  const dispatch = useGameStore((s) => s.dispatch);
  const [skipIds, setSkipIds] = useState<string[]>([]);
  const [techniqueByStage, setTechniqueByStage] = useState<Record<string, CraftTechniqueChoiceId>>({});
  const [focusCheckByStage, setFocusCheckByStage] = useState<Record<string, CraftFocusCheckChoiceId>>({});

  if (!craftId) return null;
  const def = content.crafts.find((c) => c.id === craftId);
  const state = craftStates.find((c) => c.craftId === craftId);
  if (!def || !state) return null;

  const toggleSkip = (id: string) =>
    setSkipIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  // 汇总当前勾选下本次开工的物料与人力成本
  const skipSet = new Set(skipIds);
  const activeSteps = def.processChain.filter((s) => !(skipSet.has(s.id) && s.skippable));
  const interactionSpec = content.craftInteractions?.find((spec) => spec.craftId === craftId) ?? null;
  const techniqueStages = activeTechniqueStages(interactionSpec, activeSteps.map((step) => step.id));
  const techniqueChoices = techniqueStages.map((stage) => ({
    stageId: stage.id,
    choiceId: techniqueByStage[stage.id] ?? DEFAULT_CRAFT_TECHNIQUE_CHOICE,
  }));
  const focusChecks = techniqueStages.map((stage) => ({
    stageId: stage.id,
    choiceId: focusCheckByStage[stage.id] ?? DEFAULT_CRAFT_FOCUS_CHECK_CHOICE,
  }));
  const techniqueLaborDelta = techniqueChoices.reduce(
    (sum, choice) => sum + craftTechniqueOption(choice.choiceId).laborDelta,
    0,
  );
  const purchasedUpgradeIds = new Set((workshopUpgradeRecords ?? []).map((record) => record.id));
  const workshopLaborDiscount = (content.workshopUpgrades ?? [])
    .filter((upgrade) => upgrade.craftId === craftId && purchasedUpgradeIds.has(upgrade.id))
    .reduce((sum, upgrade) => sum + (upgrade.effects.laborDiscount ?? 0), 0);
  const laborNeed = Math.max(
    1,
    activeSteps.reduce((sum, s) => sum + s.laborCost, 0) - workshopLaborDiscount + techniqueLaborDelta,
  );
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
  const currentSubregionSpec = content.subregionContent?.find(
    (entry) => entry.regionId === currentRegion && entry.subregionId === currentSubregion,
  );
  const localCraftAvailable = !currentSubregionSpec || currentSubregionSpec.craftIds.includes(craftId);
  const currentRegionDef = content.regions?.find((region) => region.id === currentRegion);
  const currentSubregionName =
    currentRegionDef?.subregions.find((subregion) => subregion.id === currentSubregion)?.name ?? currentSubregion;
  const targetSubregionNames =
    content.subregionContent
      ?.filter((entry) => entry.regionId === currentRegion && entry.craftIds.includes(craftId))
      .map((entry) => currentRegionDef?.subregions.find((subregion) => subregion.id === entry.subregionId)?.name ?? entry.subregionId) ??
    [];
  const locationWarning = localCraftAvailable
    ? ''
    : `当前「${currentSubregionName}」没有开放「${def.name}」工坊，请经街景通道前往${
        targetSubregionNames.length > 0 ? `「${targetSubregionNames.join('」或「')}」` : '对应小地区'
      }。`;
  const canCraft = playing && localCraftAvailable && !laborShort && !materialShort;
  const resName = (id: string) => RESOURCE_INDEX[id]?.name ?? id;

  // 订单交付闭环：必须有成品库存才能接单，售价随该手艺传承品质浮动
  const outputId = def.outputResourceId;
  const stock = outputId ? (resources[outputId] ?? 0) : 0;
  const orderQuote = outputId
    ? orderPrice(RESOURCE_INDEX[outputId]?.value ?? 12, state.metrics.heritage)
    : 0;
  const canDeliver = playing && localCraftAvailable && !!outputId && stock >= 1;

  const run = (action: 'RUN_PROCESS' | 'TAKE_ORDER') => {
    if (action === 'RUN_PROCESS') {
      dispatch({ type: 'RUN_PROCESS', craftId: def.id, skipStepIds: skipIds, techniqueChoices, focusChecks });
    } else {
      dispatch({ type: 'TAKE_ORDER', craftId: def.id });
    }
  };

  const selectTechnique = (stageId: string, choiceId: CraftTechniqueChoiceId) =>
    setTechniqueByStage((prev) => ({ ...prev, [stageId]: choiceId }));
  const selectFocusCheck = (stageId: string, choiceId: CraftFocusCheckChoiceId) =>
    setFocusCheckByStage((prev) => ({ ...prev, [stageId]: choiceId }));

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

        {techniqueStages.length > 0 && (
          <div className="craft-techniques">
            <div className="craft-techniques__head">
              <h4>工序手法</h4>
              {techniqueLaborDelta !== 0 && (
                <span>{techniqueLaborDelta > 0 ? `额外工时 +${techniqueLaborDelta}` : `节省工时 ${Math.abs(techniqueLaborDelta)}`}</span>
              )}
            </div>
            {techniqueStages.map((stage) => {
              const selected = techniqueByStage[stage.id] ?? DEFAULT_CRAFT_TECHNIQUE_CHOICE;
              const selectedOption = craftTechniqueOption(selected);
              const selectedFocus = focusCheckByStage[stage.id] ?? DEFAULT_CRAFT_FOCUS_CHECK_CHOICE;
              const selectedFocusOption = craftFocusCheckOption(selectedFocus);
              return (
                <article className="craft-technique" key={stage.id}>
                  <div className="craft-technique__copy">
                    <b>{stage.name}</b>
                    <span>{stage.playerAction}</span>
                  </div>
                  <div className="craft-technique__sets">
                    <div className="craft-technique__set">
                      <span className="craft-technique__set-label">手法</span>
                      <div className="craft-technique__options" role="group" aria-label={`${stage.name}手法`}>
                        {CRAFT_TECHNIQUE_OPTIONS.map((option) => (
                          <button
                            key={option.id}
                            type="button"
                            className={`craft-technique__option${selected === option.id ? ' is-active' : ''}`}
                            title={option.desc}
                            aria-pressed={selected === option.id}
                            onClick={() => selectTechnique(stage.id, option.id)}
                          >
                            {option.shortLabel}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="craft-technique__set">
                      <span className="craft-technique__set-label">校准</span>
                      <div className="craft-technique__options" role="group" aria-label={`${stage.name}校准`}>
                        {CRAFT_FOCUS_CHECK_OPTIONS.map((option) => (
                          <button
                            key={option.id}
                            type="button"
                            className={`craft-technique__option${selectedFocus === option.id ? ' is-active' : ''}`}
                            title={option.desc}
                            aria-pressed={selectedFocus === option.id}
                            onClick={() => selectFocusCheck(stage.id, option.id)}
                          >
                            {option.shortLabel}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <p>
                    {selectedOption.desc} 校准：{selectedFocusOption.desc}
                  </p>
                </article>
              );
            })}
          </div>
        )}

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
              <span className="craft-supply__chip">库存 {stock}</span>
              <span className="craft-supply__chip craft-supply__chip--out">订单价 {orderQuote} 文</span>
            </div>
          )}
          {!canCraft && playing && (
            <p className="craft-supply__warn">
              {locationWarning ||
                (materialShort ? '物料不足，先去采料／精炼补足半成品。' : '人力不足，结束本季可恢复工时。')}
            </p>
          )}
        </div>

        <div className="btn-row">
          <button className="btn btn--bamboo" disabled={!canCraft} onClick={() => run('RUN_PROCESS')}>
            亲手制作
          </button>
          <button
            className="btn btn--ghost"
            disabled={!canDeliver}
            title={
              locationWarning
                ? locationWarning
                : !outputId
                ? '此体验点不产成品'
                : stock < 1
                  ? '暂无成品可交付，先亲手制作一件'
                  : `交付 1 件，进账约 ${orderQuote} 文`
            }
            onClick={() => run('TAKE_ORDER')}
          >
            接订单{outputId && stock >= 1 ? ` · ${orderQuote}文` : ''}
          </button>
          <button className="btn btn--ghost" onClick={onClose}>
            离开
          </button>
        </div>
      </div>
    </div>
  );
}
