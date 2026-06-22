import { useState, type CSSProperties } from 'react';
import { useGameStore } from '../store/gameStore';
import {
  CRAFT_FOCUS_CHECK_OPTIONS,
  CRAFT_TECHNIQUE_OPTIONS,
  DEFAULT_CRAFT_FOCUS_CHECK_CHOICE,
  DEFAULT_CRAFT_TECHNIQUE_CHOICE,
  MAX_WORKSHOP_CAPACITY,
  METRIC_LABELS,
  activeTechniqueStages,
  craftInteractionFor,
  craftFocusCheckOption,
  craftTechniqueOption,
  formatRealTimeRemaining,
  itemDefectSummary,
  itemEffectiveQuality,
  orderPrice,
  realTimeCooldownKey,
  realTimeRemainingMs,
  workshopCapacityForCraft,
  workshopExpansionCostForCraft,
  workshopUpgradeSpaceCost,
  workshopUsedSpaceForCraft,
  type CraftFocusCheckChoiceId,
  type CraftTechniqueChoiceId,
} from '../engine';
import { RESOURCE_INDEX } from '../data';
import { getCraftPageTheme } from './craftPageThemes';
import { craftActionIcon, minigameRegionTheme, workshopRegionFrame } from './minigameUiTheme';
import { useRealTimeNow } from './useRealTimeNow';

const RESOURCE_NAME_FALLBACK: Record<string, string> = {
  coin: '通货',
  labor: '工时',
};

const STAGE_OUTCOME_LABEL = {
  steady: '稳',
  standard: '平',
  risky: '险',
} as const;

/**
 * 工艺独立页 —— 整页工坊（替代弹窗）。
 * 所有手艺均以此页呈现：左侧主题立绘/工坊story，右侧工坊台交互。
 * 定制主题取自 craftPageThemes，未登记者由 getCraftPageTheme 自动生成通用主题。
 * 交互逻辑（亲手制作 / 接订单）与弹窗一致，走同样的 reducer 动作，保证闭环不变。
 */
export function CraftPage({ craftId, onClose }: { craftId: string; onClose: () => void }) {
  const content = useGameStore((s) => s.content);
  const craftStates = useGameStore((s) => s.state.crafts);
  const resources = useGameStore((s) => s.state.resources);
  const workshopUpgradeRecords = useGameStore((s) => s.state.workshopUpgrades);
  const workshopSpaces = useGameStore((s) => s.state.workshopSpaces);
  const itemInstances = useGameStore((s) => s.state.itemInstances);
  const flags = useGameStore((s) => s.state.flags);
  const regionReputation = useGameStore((s) => s.state.regionReputation);
  const attributes = useGameStore((s) => s.state.profile.attributes);
  const currentRegion = useGameStore((s) => s.state.currentRegion);
  const currentSubregion = useGameStore((s) => s.state.currentSubregion);
  const realTime = useGameStore((s) => s.state.realTime);
  const playing = useGameStore((s) => s.state.status === 'playing');
  const dispatch = useGameStore((s) => s.dispatch);
  const now = useRealTimeNow();
  const [skipIds, setSkipIds] = useState<string[]>([]);
  const [techniqueByStage, setTechniqueByStage] = useState<Record<string, CraftTechniqueChoiceId>>({});
  const [focusCheckByStage, setFocusCheckByStage] = useState<Record<string, CraftFocusCheckChoiceId>>({});

  const def = content.crafts.find((c) => c.id === craftId);
  const state = craftStates.find((c) => c.craftId === craftId);
  const theme = getCraftPageTheme(craftId);
  if (!def || !state || !theme) return null;
  const miniTheme = minigameRegionTheme(currentRegion);
  const workshopFrame = workshopRegionFrame(currentRegion);
  const heroImage = theme.heroImage ?? workshopFrame;
  const heroHasCustomArt = Boolean(theme.heroImage);
  const pageStyle = {
    '--page-accent': theme.accent,
    '--minigame-accent': miniTheme.accent,
    '--minigame-accent-soft': miniTheme.accentSoft,
  } as CSSProperties;

  const toggleSkip = (id: string) =>
    setSkipIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const skipSet = new Set(skipIds);
  const activeSteps = def.processChain.filter((s) => !(skipSet.has(s.id) && s.skippable));
  const interactionSpec = craftInteractionFor(content, craftId, {
    regionId: currentRegion,
    subregionId: currentSubregion,
  });
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
  const cooldownKey = realTimeCooldownKey('craft', craftId);
  const cooldownRemaining = realTimeRemainingMs({ realTime }, cooldownKey, now);
  const cooldownBlocked = cooldownRemaining > 0;
  const cooldownText = cooldownBlocked ? formatRealTimeRemaining(cooldownRemaining) : '';
  const canCraft = playing && localCraftAvailable && !laborShort && !materialShort && !cooldownBlocked;
  const resName = (id: string) => RESOURCE_INDEX[id]?.name ?? RESOURCE_NAME_FALLBACK[id] ?? id;

  const outputId = def.outputResourceId;
  const stock = outputId ? (resources[outputId] ?? 0) : 0;
  const orderQuote = outputId
    ? orderPrice(RESOURCE_INDEX[outputId]?.value ?? 12, state.metrics.heritage)
    : 0;
  const canDeliver = playing && localCraftAvailable && !!outputId && stock >= 1;
  const purchasedUpgrades = purchasedUpgradeIds;
  const knownFlags = new Set(flags);
  const upgradeRows = (content.workshopUpgrades ?? []).filter((upgrade) => upgrade.craftId === craftId);
  const costLabel = (cost: Record<string, number>) =>
    Object.entries(cost)
      .filter(([, amount]) => amount > 0)
      .map(([key, amount]) => `${resName(key)} ${resources[key] ?? 0}/${amount}`)
      .join(' · ');
  const upkeepFor = (upgrade: (typeof upgradeRows)[number]) =>
    upgrade.upkeep ?? (upgrade.tier <= 1 ? { coin: 1 } : { coin: 2, labor: 1 });
  const canPayCost = (cost: Record<string, number>) =>
    Object.entries(cost).every(([key, amount]) => (resources[key] ?? 0) >= amount);
  const workshopCapacity = workshopCapacityForCraft({ workshopSpaces }, craftId);
  const workshopUsedSpace = workshopUsedSpaceForCraft({ workshopUpgrades: workshopUpgradeRecords ?? [] }, content, craftId);
  const workshopExpansionCost = workshopExpansionCostForCraft({ workshopSpaces }, craftId);
  const workshopExpansionPayable = canPayCost(workshopExpansionCost);
  const workshopExpansionMaxed = workshopCapacity >= MAX_WORKSHOP_CAPACITY;
  const canExpandWorkshop =
    playing && localCraftAvailable && workshopExpansionPayable && !workshopExpansionMaxed && state.unlocked;
  const requirementText = (upgrade: (typeof upgradeRows)[number]) => {
    const requirements = upgrade.requirements;
    if (!requirements) return '';
    if (requirements.produced !== undefined && state.produced < requirements.produced) {
      return `需先完成 ${requirements.produced} 批`;
    }
    const missingUpgrade = (requirements.upgrades ?? []).find((upgradeId) => !purchasedUpgrades.has(upgradeId));
    if (missingUpgrade) {
      const required = (content.workshopUpgrades ?? []).find((entry) => entry.id === missingUpgrade);
      return `需先安置 ${required?.title ?? missingUpgrade}`;
    }
    const missingFlag = (requirements.flags ?? []).find((flag) => !knownFlags.has(flag));
    if (missingFlag) return `缺见闻 ${missingFlag}`;
    if (requirements.regionReputation) {
      const current = regionReputation[requirements.regionReputation.regionId] ?? 0;
      if (current < requirements.regionReputation.min) {
        return `声望 ${current}/${requirements.regionReputation.min}`;
      }
    }
    for (const [key, min] of Object.entries(requirements.attributes ?? {})) {
      if ((attributes[key as keyof typeof attributes] ?? 0) < min) return `${key} ${attributes[key as keyof typeof attributes] ?? 0}/${min}`;
    }
    return '';
  };
  const selectTechnique = (stageId: string, choiceId: CraftTechniqueChoiceId) =>
    setTechniqueByStage((prev) => ({ ...prev, [stageId]: choiceId }));
  const selectFocusCheck = (stageId: string, choiceId: CraftFocusCheckChoiceId) =>
    setFocusCheckByStage((prev) => ({ ...prev, [stageId]: choiceId }));
  const defectRepairHints = interactionSpec?.defects.map((defect) => {
    const repairs = interactionSpec.repairOptions
      .filter((option) => defect.repairOptionIds.includes(option.id))
      .map((option) => option.label)
      .join(' / ');
    return `${defect.label} -> ${repairs || '需回炉自检'}`;
  }) ?? [];
  const recentCraftItems = itemInstances
    .filter((item) => item.sourceCraftId === craftId && item.resourceId === outputId)
    .sort((a, b) => b.createdTurn - a.createdTurn)
    .slice(0, 2);

  return (
    <div className={`craft-page craft-page--minigame craft-page--workshop minigame-shell--${miniTheme.regionId}`} style={pageStyle}>
      <header className="craft-page__bar">
        <button className="btn btn--ghost" onClick={onClose}>
          ← 返回街市
        </button>
        <h2 className="craft-page__title">
          {def.name}
          <small> · {def.region}</small>
        </h2>
        <div className="craft-page__metrics">
          {cooldownBlocked && <span className="craft-page__timer">整备 {cooldownText}</span>}
          {(Object.keys(METRIC_LABELS) as (keyof typeof METRIC_LABELS)[]).map((k) => (
            <span key={k}>
              {METRIC_LABELS[k]} {state.metrics[k]}
            </span>
          ))}
        </div>
      </header>

      <div className="craft-page__body">
        <section className="craft-page__story">
          <div
            className={`craft-page__hero${heroHasCustomArt ? ' craft-page__hero--art' : ''}`}
            role="img"
            aria-label={theme.heroAlt}
          >
            <img aria-hidden="true" className="craft-page__hero-frame" src={heroImage} alt="" />
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
          <div className="craft-page__minigame-strip">
            <img className="minigame-icon" src={craftActionIcon(def.name + def.blurb)} alt="" />
            <span>{miniTheme.label}</span>
            <b>{def.region}</b>
          </div>

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

          {interactionSpec && (
            <div className="craft-feedback" data-smoke={`craft-feedback:${craftId}`}>
              <div className="craft-feedback__head">
                <h4>工艺诊断</h4>
                <span>{interactionSpec.title}</span>
              </div>
              <p>{interactionSpec.summary}</p>
              <div className="craft-feedback__chips">
                {interactionSpec.materialNotes.map((note) => (
                  <span key={note}>{note}</span>
                ))}
                {(interactionSpec.orderHooks ?? []).map((hook) => (
                  <span key={hook}>{hook}</span>
                ))}
              </div>
              {defectRepairHints.length > 0 && (
                <p className="craft-feedback__repair">返修预案：{defectRepairHints.join('；')}</p>
              )}
            </div>
          )}

          {recentCraftItems.length > 0 && (
            <div className="craft-feedback craft-feedback--recent" data-smoke={`craft-recent:${craftId}`}>
              <div className="craft-feedback__head">
                <h4>最近出品</h4>
                <span>验收会读取有效品相与缺陷</span>
              </div>
              {recentCraftItems.map((item) => (
                <article className="craft-feedback__item" key={item.id}>
                  <b>{resName(item.resourceId)}</b>
                  <span>
                    品相 {Math.round(item.quality * 100)}
                    {item.defects?.length ? ` · 有效 ${Math.round(itemEffectiveQuality(item) * 100)}` : ''}
                  </span>
                  {(item.craftStageOutcomes ?? []).length > 0 && (
                    <p>
                      阶段：
                      {(item.craftStageOutcomes ?? [])
                        .slice(0, 3)
                        .map((outcome) => `${outcome.stageName}${STAGE_OUTCOME_LABEL[outcome.result]}`)
                        .join(' / ')}
                    </p>
                  )}
                  {item.defects?.length ? (
                    <p className="craft-feedback__warn">{itemDefectSummary(item)}</p>
                  ) : (
                    <p>暂无显性缺陷，可直接尝试订单验收。</p>
                  )}
                  {item.repairHistory?.[0] && <p>最近返修：{item.repairHistory[0].summary}</p>}
                </article>
              ))}
            </div>
          )}

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
              {cooldownBlocked && (
                <span className="craft-supply__chip craft-supply__chip--time">
                  整备 {cooldownText}
                </span>
              )}
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
                {locationWarning ||
                  (cooldownBlocked
                    ? `工坊正在整备，还需等待 ${cooldownText}。`
                    : materialShort
                      ? '物料不足，先去采料／精炼补足半成品。'
                      : '人力不足，结束本季可恢复工时。')}
              </p>
            )}
          </div>

          <div className="btn-row">
            <button
              className="btn btn--bamboo"
              disabled={!canCraft}
              onClick={() => dispatch({ type: 'RUN_PROCESS', craftId: def.id, skipStepIds: skipIds, techniqueChoices, focusChecks })}
            >
              {cooldownBlocked ? `整备 ${cooldownText}` : '亲手制作'}
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
              onClick={() => dispatch({ type: 'TAKE_ORDER', craftId: def.id })}
            >
              接订单{outputId && stock >= 1 ? ` · ${orderQuote}文` : ''}
            </button>
          </div>

          {upgradeRows.length > 0 && (
            <div className="workshop-upgrades">
              <div className="workshop-upgrades__summary">
                <h4>工坊整备</h4>
                <span>
                  空间 {workshopUsedSpace}/{workshopCapacity}
                </span>
              </div>
              <div className="workshop-upgrades__expand">
                <span>
                  {workshopExpansionMaxed
                    ? `空间已达上限 ${MAX_WORKSHOP_CAPACITY} 格`
                    : `扩建成本 ${costLabel(workshopExpansionCost)}`}
                </span>
                {locationWarning && <span className="is-short">需回到本地工坊点</span>}
                {!workshopExpansionPayable && !workshopExpansionMaxed && !locationWarning && (
                  <span className="is-short">扩建材料不足</span>
                )}
                <button
                  className="btn btn--ghost"
                  disabled={!canExpandWorkshop}
                  onClick={() => dispatch({ type: 'EXPAND_WORKSHOP_SPACE', craftId: def.id })}
                >
                  扩建工坊
                </button>
              </div>
              {upgradeRows.map((upgrade) => {
                const purchased = purchasedUpgrades.has(upgrade.id);
                const requirement = requirementText(upgrade);
                const payable = canPayCost(upgrade.cost);
                const spaceCost = workshopUpgradeSpaceCost(upgrade);
                const enoughSpace = purchased || workshopUsedSpace + spaceCost <= workshopCapacity;
                const canUpgrade = playing && localCraftAvailable && !purchased && !requirement && payable && enoughSpace;
                return (
                  <article className={`workshop-upgrade${purchased ? ' is-done' : ''}`} key={upgrade.id}>
                    <div className="workshop-upgrade__head">
                      <span>{upgrade.title}</span>
                      <b>{purchased ? '已安置' : `阶 ${upgrade.tier}`}</b>
                    </div>
                    <p>{upgrade.desc}</p>
                    <div className="workshop-upgrade__meta">
                      <span>{costLabel(upgrade.cost)}</span>
                      <span>季维护 {costLabel(upkeepFor(upgrade))}</span>
                      <span>空间 {spaceCost} 格</span>
                      {requirement && <span className="is-short">{requirement}</span>}
                      {locationWarning && !purchased && <span className="is-short">需回到本地工坊点</span>}
                      {!payable && !purchased && <span className="is-short">材料不足</span>}
                      {!enoughSpace && !purchased && <span className="is-short">空间不足</span>}
                    </div>
                    <button
                      className="btn btn--ghost"
                      disabled={!canUpgrade}
                      onClick={() => dispatch({ type: 'UPGRADE_WORKSHOP', upgradeId: upgrade.id })}
                    >
                      安置
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
