import { useGameStore } from '../store/gameStore';
import { PRIORITY_JOURNEY_STEPS, PRIORITY_SCOPE_REQUIREMENTS, RESOURCE_INDEX } from '../data';
import { craftsForSubregion, localIndustriesForSubregion } from '../data/subregionContent';
import { emitBus } from '../game/EventBus';
import {
  buildPriorityScopeAudit,
  regionReputationLabel,
  regionReputationOf,
  routeCostWithIntel,
  routeIntelKnown,
  routeRiskLabel,
  routeRiskScore,
  routeStabilityOf,
} from '../engine';
import type {
  CropId,
  GameWeather,
  HomeVisitRecord,
  IndustryDef,
  ItemInstance,
  NightMarketStallRecord,
  RegionDef,
  RouteSpec,
  SupplyCrisisRecord,
} from '../engine';

const CROP_OPTIONS: { id: CropId; name: string; output: string }[] = [
  { id: 'indigo', name: '靛草', output: '靛蓝草' },
  { id: 'mulberry', name: '桑蚕', output: '蚕丝' },
  { id: 'tea', name: '茶树', output: '茶青' },
];
const CROP_LABEL: Record<CropId, string> = {
  indigo: '靛草',
  mulberry: '桑蚕',
  tea: '茶树',
};
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
const WEATHER_LABEL: Record<GameWeather, string> = {
  clear: '晴',
  rain: '雨',
  snow: '雪',
};
const WEATHER_NOTE: Record<GameWeather, string> = {
  clear: '晴日适合晒制、赶路与常规采料。',
  rain: '雨天会润泽植物类露天采集，田圃可借雨水免工时浇灌。',
  snow: '雪天露天采集与田圃照料受阻，作物收成会偏紧。',
};
const RESOURCE_NAME_FALLBACK: Record<string, string> = {
  coin: '通货',
  labor: '工时',
};

function routeTouches(route: RouteSpec, regionId: string): boolean {
  return route.fromRegionId === regionId || route.toRegionId === regionId;
}

function otherRouteEnd(route: RouteSpec, regionId: string): string {
  return route.fromRegionId === regionId ? route.toRegionId : route.fromRegionId;
}

/** 资源键 → 中文名（无定义则原样显示） */
function resName(key: string): string {
  return RESOURCE_INDEX[key]?.name ?? RESOURCE_NAME_FALLBACK[key] ?? key;
}

/** 把 input 资源池转成「铁矿×2 煤×1」式说明 */
function describeInput(input: Record<string, number>): string {
  const parts = Object.entries(input).map(([k, v]) => `${resName(k)}×${v}`);
  return parts.length ? parts.join(' ') : '仅耗工时';
}

function isHarvestIndustry(industry: IndustryDef): boolean {
  return Object.keys(industry.input).length === 0;
}

function weatherIndustryHint(industry: IndustryDef, weather: GameWeather): string {
  if (!isHarvestIndustry(industry)) return '';
  if (weather === 'rain') return '雨天露天采集可能多得鲜料';
  if (weather === 'snow') return '雪天露天采集产量与品相偏低';
  return '';
}

function itemDisplayName(item: ItemInstance): string {
  return item.displayName ?? RESOURCE_INDEX[item.resourceId]?.name ?? item.resourceId;
}

function visitDateLabel(record: HomeVisitRecord): string {
  return `第 ${record.day} 日 · ${PHASE_LABEL[record.phase]}`;
}

const HOME_VISIT_KIND_LABEL: Record<NonNullable<HomeVisitRecord['choiceKind']>, string> = {
  view: '参观',
  inscribe: '题跋',
  collect: '收藏',
};

function stallDateLabel(record: NightMarketStallRecord): string {
  return `第 ${record.day} 日 · ${PHASE_LABEL[record.phase]}`;
}

const SUPPLY_RECORD_STATUS_LABEL: Record<SupplyCrisisRecord['status'], string> = {
  watch: '待复盘',
  strained: '吃紧',
  closed: '已收束',
};

function supplyRecordDateLabel(record: SupplyCrisisRecord): string {
  return `第 ${record.resolvedDay} 日处理 · 第 ${record.followUpDay} 日复盘`;
}

function supplyRecordFollowUpCost(record: SupplyCrisisRecord) {
  if (record.status === 'strained') return { labor: record.severity + 1, coin: record.severity * 3 };
  return { labor: 1, coin: 0 };
}

/**
 * 镇务/行脚面板：让玩家在 2D 世界之外直接操作供应链。
 *  - 查看当前地区与库存
 *  - 在本地产业「采料」（GATHER_RESOURCE）
 *  - 查看当前场景出入口连接的路线；大地区迁移/解锁交给场景 gate 交互
 */
export function RegionPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const content = useGameStore((s) => s.content);
  const state = useGameStore((s) => s.state);
  const resources = useGameStore((s) => s.state.resources);
  const farmPlots = useGameStore((s) => s.state.farmPlots);
  const completedActivities = useGameStore((s) => s.state.completedActivities);
  const currentRegion = useGameStore((s) => s.state.currentRegion);
  const currentSubregion = useGameStore((s) => s.state.currentSubregion);
  const regionReputation = useGameStore((s) => s.state.regionReputation);
  const routeStability = useGameStore((s) => s.state.routeStability);
  const routeEscortRuns = useGameStore((s) => s.state.routeEscortRuns);
  const unlockedRegions = useGameStore((s) => s.state.unlockedRegions);
  const flags = useGameStore((s) => s.state.flags);
  const calendar = useGameStore((s) => s.state.calendar);
  const itemInstances = useGameStore((s) => s.state.itemInstances);
  const homeVisitRecords = useGameStore((s) => s.state.homeVisitRecords ?? []);
  const nightMarketStallRecords = useGameStore((s) => s.state.nightMarketStallRecords ?? []);
  const supplyCrisisRecords = useGameStore((s) => s.state.supplyCrisisRecords ?? []);
  const playing = useGameStore((s) => s.state.status === 'playing');
  const dispatch = useGameStore((s) => s.dispatch);

  if (!open) return null;

  const regions = content.regions ?? [];
  const industries = content.industries ?? [];
  const region = regions.find((r) => r.id === currentRegion);
  const currentReputation = regionReputationOf({ regionReputation }, currentRegion);
  const labor = resources.labor ?? 0;
  const currentSub = region?.subregions.find((s) => s.id === currentSubregion) ?? region?.subregions[0];
  const routeSpecs = Array.from(
    new Map((content.regionContent?.flatMap((spec) => spec.routes) ?? []).map((route) => [route.id, route])).values(),
  );
  const priorityAudit = buildPriorityScopeAudit(
    state,
    PRIORITY_JOURNEY_STEPS,
    PRIORITY_SCOPE_REQUIREMENTS,
    content,
  );
  const priorityProgress =
    priorityAudit.totalMilestones > 0
      ? Math.round((priorityAudit.completedMilestones / priorityAudit.totalMilestones) * 100)
      : 0;
  const anchorRequirements = priorityAudit.requirements.filter((row) => row.tier === 'anchor');
  const skeletonRequirements = priorityAudit.requirements.filter((row) => row.tier === 'skeleton');
  const routeLookup = new Map(routeSpecs.map((route) => [route.id, route]));
  const currentRouteRows = routeSpecs
    .filter((route) => routeTouches(route, currentRegion))
    .map((route) => ({
      route,
      target: regions.find((r) => r.id === otherRouteEnd(route, currentRegion)),
    }))
    .filter((row): row is { route: RouteSpec; target: RegionDef } => Boolean(row.target));
  const openedRouteRows = currentRouteRows.filter((row) => unlockedRegions.includes(row.target.id));
  const frontierRouteRows = currentRouteRows.filter((row) => !unlockedRegions.includes(row.target.id));
  const routeStateFor = (route: RouteSpec) => {
    const risk = routeRiskScore({ flags, regionReputation, routeStability }, route);
    return {
      risk,
      riskLabel: routeRiskLabel(risk),
      stability: routeStabilityOf({ routeStability }, route.id),
      escortRuns: routeEscortRuns[route.id] ?? 0,
    };
  };
  const localSupplyCrisisRecords = supplyCrisisRecords
    .filter((record) => {
      const route = routeLookup.get(record.routeId);
      return route ? routeTouches(route, currentRegion) : false;
    })
    .slice(0, 6);

  const localIndustries: IndustryDef[] = localIndustriesForSubregion(region, currentSubregion, industries);
  const localCrafts = craftsForSubregion(region, currentSubregion);
  const currentActivities = (content.activities ?? []).filter(
    (activity) => activity.regionId === currentRegion && activity.subregionId === currentSubregion,
  );
  const isFarmSubregion = Boolean(
    currentSub?.traits.includes('种植') || currentSub?.id.includes('baigongyuan'),
  );
  const displayedItems = itemInstances
    .filter((item) => item.status === 'displayed')
    .sort((a, b) => b.quality - a.quality || a.createdTurn - b.createdTurn);
  const recentHomeVisits = homeVisitRecords.slice(0, 4);
  const localStallRecords = nightMarketStallRecords.filter(
    (record) => record.regionId === currentRegion && record.subregionId === currentSubregion,
  );
  const bestStallRecords = [...localStallRecords]
    .sort((a, b) => b.revenue - a.revenue || b.crowd - a.crowd || b.day - a.day)
    .slice(0, 3);
  const hasStallActivity = currentActivities.some((activity) => activity.reward.stall);
  const npcNameFor = (npcId: string) => content.npcs?.find((npc) => npc.id === npcId)?.name ?? npcId;

  const canGather = (ind: IndustryDef): boolean => {
    if (labor < ind.laborCost) return false;
    return Object.entries(ind.input).every(([k, v]) => (resources[k] ?? 0) >= v);
  };

  const canPerformActivity = (activity: (typeof currentActivities)[number]): boolean => {
    if (state.pendingActivityStallClosing) return false;
    if (labor < activity.laborCost) return false;
    if (activity.once && completedActivities.includes(activity.id)) return false;
    if (activity.availablePhases && !activity.availablePhases.includes(calendar.phase)) return false;
    return Object.entries(activity.resourceCost ?? {}).every(([k, v]) => (resources[k] ?? 0) >= v);
  };

  const subregionSummaryFor = (targetSubregion: RegionDef['subregions'][number]) => {
    if (!region) return { chips: [] as string[], sample: '' };
    const targetIndustries = localIndustriesForSubregion(region, targetSubregion.id, industries);
    const targetCrafts = craftsForSubregion(region, targetSubregion.id);
    const targetActivities = (content.activities ?? []).filter(
      (activity) => activity.regionId === region.id && activity.subregionId === targetSubregion.id,
    );
    const targetNpcs = (content.npcs ?? []).filter(
      (npc) =>
        npc.regionId === region.id &&
        (npc.subregionId === targetSubregion.id ||
          (npc.schedule ?? []).some((rule) => rule.subregionId === targetSubregion.id)),
    );
    const chips = [
      targetIndustries.length ? `采料 ${targetIndustries.length}` : '',
      targetCrafts.length ? `工坊 ${targetCrafts.length}` : '',
      targetActivities.length ? `活动 ${targetActivities.length}` : '',
      targetNpcs.length ? `人物 ${targetNpcs.length}` : '',
    ].filter(Boolean);
    const sample = [
      ...targetCrafts.map((craft) => craft.name),
      ...targetActivities.map((activity) => activity.name),
      ...targetIndustries.map((industry) => industry.name),
    ]
      .slice(0, 3)
      .join(' / ');
    return { chips, sample };
  };

  // 库存中数量 > 0 的资源（含 coin/labor）
  const stock = Object.entries(resources).filter(([, v]) => v > 0);

  return (
    <div className="modal__backdrop" onClick={onClose}>
      <div className="modal modal--wide" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal__title">
          镇务行脚{' '}
          <small style={{ fontSize: 12, color: 'var(--indigo-soft)' }}>
            当前：{region?.name ?? '未知'}
          </small>
        </h3>
        {region && <p className="modal__desc">{region.blurb}</p>}
        <p className="panel-note">
          今日：第 {calendar.day} 日 · {SEASON_LABEL[calendar.season]} · {PHASE_LABEL[calendar.phase]} · {WEATHER_LABEL[calendar.weather]}。{WEATHER_NOTE[calendar.weather]}
        </p>

        <section className="panel-block priority-audit">
          <h4 className="panel-block__title">当前优先版收束巡检</h4>
          <div className="priority-audit__summary">
            <span>
              主轴 {priorityAudit.completedSteps}/{priorityAudit.totalSteps} 区 · 里程碑{' '}
              {priorityAudit.completedMilestones}/{priorityAudit.totalMilestones}
            </span>
            <span>
              主轴资料 {priorityAudit.readyAnchorRegions}/{priorityAudit.totalAnchorRegions} · 骨架资料{' '}
              {priorityAudit.readySkeletonRegions}/{priorityAudit.totalSkeletonRegions}
            </span>
          </div>
          <div className="priority-audit__meter" aria-label={`当前优先版主轴进度 ${priorityProgress}%`}>
            <i style={{ width: `${priorityProgress}%` }} />
          </div>
          <div className="priority-audit__steps">
            {priorityAudit.journeySteps.map((step) => (
              <div
                className={`priority-audit-card ${step.complete ? 'is-done' : step.active ? 'is-active' : ''}`}
                key={step.id}
                title={step.summary}
              >
                <div className="priority-audit-card__head">
                  <b>{step.title}</b>
                  <span>
                    {step.complete ? '完成' : step.active ? '当前' : '待跑'} · {step.completedMilestones}/
                    {step.totalMilestones}
                  </span>
                </div>
                <div className="priority-audit__chips">
                  {step.milestones.map((milestone) => (
                    <span className={milestone.complete ? 'is-done' : ''} key={milestone.id} title={milestone.hint}>
                      {milestone.label}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="priority-audit__requirements">
            <b>主轴五区</b>
            {anchorRequirements.map((row) => (
              <span className={row.ready ? 'is-ready' : 'is-gap'} key={row.regionId} title={row.missing.join(' / ')}>
                {row.regionName} · 工坊{row.counts.crafts} 活动{row.counts.activities} 人物{row.counts.npcs}{' '}
                {row.ready ? '齐备' : `缺 ${row.missing.length}`}
              </span>
            ))}
          </div>
          <div className="priority-audit__requirements priority-audit__requirements--compact">
            <b>骨架六区</b>
            {skeletonRequirements.map((row) => (
              <span className={row.ready ? 'is-ready' : 'is-gap'} key={row.regionId} title={row.missing.join(' / ')}>
                {row.regionName}{row.ready ? '齐' : `缺${row.missing.length}`}
              </span>
            ))}
          </div>
        </section>

        {region && (
          <section className="panel-block">
            <h4 className="panel-block__title">区内小地区</h4>
            {currentSub && (
              <p className="panel-note">
                当前：{currentSub.name} · {currentSub.role}。{currentSub.blurb}
              </p>
            )}
            <div className="subregion-grid">
              {region.subregions.map((subregion) => {
                const summary = subregionSummaryFor(subregion);
                const localHint = summary.chips.length ? `本地：${summary.chips.join('、')}。` : '';
                return (
                  <button
                    key={subregion.id}
                    className={`subregion-card ${subregion.id === currentSubregion ? 'is-current' : ''}`}
                    disabled
                    title={
                      subregion.id === currentSubregion
                        ? `${subregion.blurb} ${localHint}`
                        : `${subregion.blurb} ${localHint}请在当前场景内寻找区内通道前往。`
                    }
                  >
                    <b>{subregion.name}</b>
                    <span>{subregion.role}</span>
                    {summary.chips.length > 0 && (
                      <span className="subregion-card__summary">
                        {summary.chips.map((chip) => (
                          <em key={chip}>{chip}</em>
                        ))}
                      </span>
                    )}
                    {summary.sample && <small className="subregion-card__sample">{summary.sample}</small>}
                    <small>{subregion.traits.join(' / ')}</small>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        <section className="panel-block">
          <h4 className="panel-block__title">库存</h4>
          <div className="stock-grid">
            {stock.map(([k, v]) => (
              <span className="stock-chip" key={k}>
                {resName(k)} <b>{v}</b>
              </span>
            ))}
          </div>
        </section>

        <section className="panel-block">
          <h4 className="panel-block__title">本地产业 · 采料</h4>
          {localIndustries.length === 0 && <p className="panel-empty">本地暂无可用产业。</p>}
          <ul className="ind-list">
            {localIndustries.map((ind) => (
              <li className="ind-item" key={ind.id}>
                <div className="ind-item__main">
                  <span className="ind-item__name">{ind.name}</span>
                  <span className="ind-item__io">
                    {describeInput(ind.input)} → {resName(ind.output)}×{ind.yield} · 工时{ind.laborCost}
                    {weatherIndustryHint(ind, calendar.weather) ? ` · ${weatherIndustryHint(ind, calendar.weather)}` : ''}
                  </span>
                  <span className="ind-item__blurb">{ind.blurb}</span>
                </div>
                <button
                  className="btn btn--sm btn--bamboo"
                  disabled={!playing || !canGather(ind)}
                  onClick={() => {
                    emitBus({ type: 'interact-industry', industryId: ind.id });
                    onClose();
                  }}
                >
                  采料
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel-block">
          <h4 className="panel-block__title">本地工坊</h4>
          {localCrafts.length === 0 && <p className="panel-empty">此小地区暂无开放工坊。</p>}
          <ul className="ind-list">
            {localCrafts.map((craft) => {
              const materialNeed = craft.processChain.reduce<Record<string, number>>((next, step) => {
                for (const [resourceId, amount] of Object.entries(step.resourceCost)) {
                  next[resourceId] = (next[resourceId] ?? 0) + amount;
                }
                return next;
              }, {});
              const laborNeed = craft.processChain.reduce((sum, step) => sum + step.laborCost, 0);
              const outputName = craft.outputResourceId ? resName(craft.outputResourceId) : '作品';
              const materialText = describeInput(materialNeed);
              return (
                <li className="ind-item" key={craft.id}>
                  <div className="ind-item__main">
                    <span className="ind-item__name">{craft.name}</span>
                    <span className="ind-item__io">
                      {materialText} → {outputName}×1 · 工时{laborNeed}
                    </span>
                    <span className="ind-item__blurb">{craft.blurb}</span>
                  </div>
                  <button
                    className="btn btn--sm btn--bamboo"
                    data-smoke={`region-craft:${craft.id}`}
                    disabled={!playing}
                    onClick={() => {
                      emitBus({ type: 'interact-craft', craftId: craft.id });
                      onClose();
                    }}
                  >
                    入坊
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="panel-block">
          <h4 className="panel-block__title">本地活动</h4>
          {currentActivities.length === 0 && <p className="panel-empty">此小地区暂无活动点。</p>}
          <ul className="ind-list">
            {currentActivities.map((activity) => (
              <li className="ind-item" key={activity.id}>
                <div className="ind-item__main">
                  <span className="ind-item__name">{activity.name}</span>
                  <span className="ind-item__io">
                    {activity.kind} · {describeInput(activity.resourceCost ?? {})} → {describeInput(activity.reward.resources ?? {})} · 工时{activity.laborCost}
                    {activity.availablePhases ? ` · ${activity.availablePhases.map((phase) => PHASE_LABEL[phase]).join('/')}` : ''}
                  </span>
                  <span className="ind-item__blurb">{activity.blurb}</span>
                </div>
                <button
                  className="btn btn--sm btn--bamboo"
                  data-smoke={`region-activity:${activity.id}`}
                  disabled={!playing || !canPerformActivity(activity)}
                  title={activity.availablePhases ? `可用时段：${activity.availablePhases.map((phase) => PHASE_LABEL[phase]).join(' / ')}` : activity.blurb}
                  onClick={() => {
                    emitBus({ type: 'interact-activity', activityId: activity.id });
                    onClose();
                  }}
                >
                  体验
                </button>
              </li>
            ))}
          </ul>
        </section>

        {(hasStallActivity || localStallRecords.length > 0) && (
          <section className="panel-block">
            <h4 className="panel-block__title">节令榜 · 摊位经营</h4>
            {localStallRecords.length === 0 ? (
              <p className="panel-empty">本地尚无摆摊记录。黄昏或夜间参与灯市、庙会、巴扎后，节令榜会记录人气、售货和阶段进度。</p>
            ) : (
              <>
                <ul className="ind-list">
                  {bestStallRecords.map((record, index) => (
                    <li className="ind-item" key={`best-${record.id}`}>
                      <div className="ind-item__main">
                        <span className="ind-item__name">第 {index + 1} 名 · {record.title}</span>
                        <span className="ind-item__io">
                          人气 {record.crowd} · 入账 {record.revenue} 文
                          {record.itemName ? ` · ${record.itemName}` : ''}
                          {record.strategyTitle ? ` · ${record.strategyTitle}` : ''}
                          {record.comboTitle ? ` · ${record.comboTitle}` : ''}
                          {record.customerTitle ? ` · ${record.customerTitle}` : ''}
                          {record.stageTitle ? ` · ${record.stageTitle}` : ''}
                          {record.closingChoiceTitle ? ` · ${record.closingChoiceTitle}` : ''}
                        </span>
                        <span className="ind-item__blurb">{record.summary}</span>
                      </div>
                    </li>
                  ))}
                </ul>
                <ul className="ind-list">
                  {localStallRecords.slice(0, 4).map((record) => (
                    <li className="ind-item" key={record.id}>
                      <div className="ind-item__main">
                        <span className="ind-item__name">
                          {record.stageTitle ?? record.title}
                          {record.cycleLabel ? ` · ${record.cycleLabel}` : ''}
                        </span>
                        <span className="ind-item__io">
                          {stallDateLabel(record)} · 人气 {record.crowd} · 入账 {record.revenue} 文
                          {record.itemQuality !== undefined ? ` · 品相 ${Math.round(record.itemQuality * 100)}` : ''}
                          {record.strategyTitle ? ` · 策略 ${record.strategyTitle}` : ''}
                          {record.comboTitle ? ` · 组合 ${record.comboTitle}` : ''}
                          {record.customerTitle ? ` · 客群 ${record.customerTitle}` : ''}
                          {record.consumedExtraResourceName ? ` · 搭配 ${record.consumedExtraResourceName}` : ''}
                          {record.closingChoiceTitle ? ` · 收摊 ${record.closingChoiceTitle}` : ''}
                        </span>
                        <span className="ind-item__blurb">{record.summary}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        )}

        {isFarmSubregion && (
          <>
            <section className="panel-block">
              <h4 className="panel-block__title">珍品阁</h4>
              {displayedItems.length === 0 ? (
                <p className="panel-empty">暂无陈列作品。先在背包中为高品质作品题名并陈列，NPC 来访时才有可看的代表作。</p>
              ) : (
                <div className="farm-grid">
                  {displayedItems.slice(0, 6).map((item) => (
                    <div className="farm-plot-card" key={item.id}>
                      <div className="farm-plot-card__head">
                        <b>{itemDisplayName(item)}</b>
                        <span>品相 {Math.round(item.quality * 100)}</span>
                      </div>
                      <p className="panel-note">
                        {RESOURCE_INDEX[item.resourceId]?.name ?? item.resourceId}
                        {item.authorName ? ` · 作者 ${item.authorName}` : ''}
                        {item.collaboratorNpcIds?.length ? ` · 联作 ${item.collaboratorNpcIds.length} 人` : ''}
                      </p>
                      {item.inscription && <p className="panel-note">题跋：{item.inscription}</p>}
                      {item.descriptors.length > 0 && (
                        <div className="region-chips">
                          {item.descriptors.slice(0, 4).map((descriptor) => (
                            <span className="stock-chip" key={descriptor}>{descriptor}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {recentHomeVisits.length > 0 && (
                <ul className="ind-list">
                  {recentHomeVisits.map((record) => (
                    <li className="ind-item" key={record.id}>
                      <div className="ind-item__main">
                        <span className="ind-item__name">{record.title} · {npcNameFor(record.npcId)}</span>
                        <span className="ind-item__io">
                          {visitDateLabel(record)}
                          {record.itemName ? ` · 看过 ${record.itemName}` : ''}
                          {record.itemQuality !== undefined ? ` · 品相 ${Math.round(record.itemQuality * 100)}` : ''}
                          {record.choiceLabel ? ` · ${record.choiceKind ? HOME_VISIT_KIND_LABEL[record.choiceKind] : '分支'}：${record.choiceLabel}` : ''}
                          {record.referralTitle ? ` · 转介绍 ${record.referralTitle}` : ''}
                        </span>
                        <span className="ind-item__blurb">{record.summary}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="panel-block">
              <h4 className="panel-block__title">百工院田圃</h4>
              <div className="farm-grid">
                {farmPlots.map((plot) => (
                  <div className="farm-plot-card" key={plot.id}>
                    <div className="farm-plot-card__head">
                      <b>{plot.cropId ? CROP_LABEL[plot.cropId] : '空田圃'}</b>
                      <span>{plot.cropId ? `${plot.growth}%` : '待下种'}</span>
                    </div>
                    {plot.cropId ? (
                      <>
                        <div className="farm-meter">
                          <i style={{ width: `${plot.growth}%` }} />
                        </div>
                        <div className="farm-actions">
                          <button
                            className="btn btn--sm btn--ghost"
                            disabled={!playing || plot.wateredToday || calendar.weather === 'snow' || (calendar.weather !== 'rain' && labor < 1)}
                            title={
                              calendar.weather === 'rain'
                                ? '雨天浇灌不耗工时'
                                : calendar.weather === 'snow'
                                  ? '雪天封土，今日不能浇水'
                                  : '消耗 1 工时照料田圃'
                            }
                            onClick={() => dispatch({ type: 'WATER_PLOT', plotId: plot.id })}
                          >
                            {plot.wateredToday ? '已浇水' : calendar.weather === 'rain' ? '借雨润田' : calendar.weather === 'snow' ? '雪封田' : '浇水'}
                          </button>
                          <button
                            className="btn btn--sm btn--bamboo"
                            disabled={!playing || plot.growth < 100}
                            onClick={() => dispatch({ type: 'HARVEST_CROP', plotId: plot.id })}
                          >
                            收获
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="farm-actions farm-actions--wrap">
                        {CROP_OPTIONS.map((crop) => (
                          <button
                            className="btn btn--sm btn--ghost"
                            key={crop.id}
                            disabled={!playing}
                            title={`成熟后入仓：${crop.output}`}
                            onClick={() => dispatch({ type: 'PLANT_CROP', plotId: plot.id, cropId: crop.id })}
                          >
                            种{crop.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {openedRouteRows.length > 0 && (
          <section className="panel-block">
            <h4 className="panel-block__title">当前出入口 · 已通路线</h4>
            <ul className="ind-list">
              {openedRouteRows.map(({ route, target }) => {
                const routeState = routeStateFor(route);
                return (
                  <li className="ind-item" key={route.id}>
                    <div className="ind-item__main">
                      <span className="ind-item__name">{route.name} · {target.name}</span>
                      <span className="ind-item__io">
                        已通行 · 稳定 {routeState.stability} · 风险 {routeState.riskLabel}({routeState.risk}) · 护商 {routeState.escortRuns} 次 · 场景出入口按 E 前往
                      </span>
                      <span className="ind-item__blurb">{route.preview ?? target.blurb}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {localSupplyCrisisRecords.length > 0 && (
          <section className="panel-block">
            <h4 className="panel-block__title">商路断供簿</h4>
            <ul className="ind-list">
              {localSupplyCrisisRecords.map((record) => {
                const route = routeLookup.get(record.routeId);
                const cost = supplyRecordFollowUpCost(record);
                const resourceLabel = record.resourceId ? resName(record.resourceId) : '商路补给';
                const canStabilize =
                  playing &&
                  record.status !== 'closed' &&
                  labor >= cost.labor &&
                  (resources.coin ?? 0) >= cost.coin;
                return (
                  <li className="ind-item" key={record.id}>
                    <div className="ind-item__main">
                      <span className="ind-item__name">
                        {route?.name ?? record.routeId} · {SUPPLY_RECORD_STATUS_LABEL[record.status]}
                      </span>
                      <span className="ind-item__io">
                        {record.choiceLabel} · {resourceLabel} · 风险 {record.risk} · 强度 {record.severity} · {supplyRecordDateLabel(record)}
                      </span>
                      <span className="ind-item__blurb">{record.summary}</span>
                    </div>
                    {record.status !== 'closed' && (
                      <button
                        className="btn btn--sm btn--bamboo"
                        disabled={!canStabilize}
                        title={`复盘稳路：工时 ${cost.labor}${cost.coin > 0 ? ` · ${cost.coin} 文` : ''}`}
                        onClick={() => dispatch({ type: 'STABILIZE_SUPPLY_ROUTE', recordId: record.id })}
                      >
                        复盘稳路
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {region && (
          <section className="panel-block">
            <h4 className="panel-block__title">地区声望</h4>
            <div className="stock-grid">
              <span className="stock-chip">
                {region.name} <b>{currentReputation}</b> {regionReputationLabel(currentReputation)}
              </span>
            </div>
          </section>
        )}

        <section className="panel-block">
          <h4 className="panel-block__title">当前出入口 · 可开拓路线</h4>
          {frontierRouteRows.length === 0 && <p className="panel-empty">当前地区暂无可开拓的新路线。</p>}
          <ul className="ind-list">
            {frontierRouteRows.map(({ route, target }) => {
              const cost = routeCostWithIntel(route, flags);
              const known = routeIntelKnown(route, flags);
              const enoughCoin = (resources.coin ?? 0) >= cost;
              const routeState = routeStateFor(route);
              return (
                <li className="ind-item" key={route.id}>
                  <div className="ind-item__main">
                    <span className="ind-item__name">{route.name} · {target.name}</span>
                    <span className="ind-item__io">
                      路资 {cost} 文 · 风险 {routeState.riskLabel}({routeState.risk}) · 护商 {routeState.escortRuns} 次 · {known ? '已掌握路线情报' : '未掌握路线情报'} · {enoughCoin ? '可在场景出入口开通' : '路资不足'}
                    </span>
                    <span className="ind-item__blurb">{route.unlockHint}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <div className="btn-row">
          <button className="btn btn--ghost" onClick={onClose}>
            收起
          </button>
        </div>
      </div>
    </div>
  );
}
