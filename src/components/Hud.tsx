import { useMemo } from 'react';
import { useGameStore } from '../store/gameStore';
import {
  buildLoreTravelGuide,
  buildPriorityJourneyGuide,
  METRIC_KEYS,
  METRIC_LABELS,
  uniqueRoutesFromRegions,
  zoneOf,
  type Metrics,
} from '../engine';
import { PRIORITY_JOURNEY_STEPS, REGION_INDEX } from '../data';

const UI_ROOT = '/assets/game/ui';

const METRIC_ICONS: Record<string, string> = {
  heritage: `${UI_ROOT}/icon_heritage.png`,
  market: `${UI_ROOT}/icon_market.png`,
  life: `${UI_ROOT}/icon_life.png`,
  spirit: `${UI_ROOT}/icon_spirit.png`,
};

const PHASE_LABEL = {
  dawn: '清晨',
  morning: '上午',
  afternoon: '下午',
  dusk: '黄昏',
  night: '夜间',
} as const;

const WEATHER_LABEL = {
  clear: '晴',
  rain: '雨',
  snow: '雪',
} as const;

/** 叠加在游戏画面上的 HUD：四维数值、场景提示和常用入口。 */
export function Hud({
  hint,
  onOpenPanel,
  onOpenMap,
  onOpenBag,
  onOpenAchievements,
  onOpenLore,
  onOpenSettings,
  onInteractNearby,
}: {
  hint: string | null;
  onOpenPanel: () => void;
  onOpenMap: () => void;
  onOpenBag: () => void;
  onOpenAchievements: () => void;
  onOpenLore: () => void;
  onOpenSettings: () => void;
  onInteractNearby: () => void;
}) {
  const metrics = useGameStore((s) => s.state.metrics);
  const calendar = useGameStore((s) => s.state.calendar);
  const playing = useGameStore((s) => s.state.status === 'playing');
  const state = useGameStore((s) => s.state);
  const content = useGameStore((s) => s.content);
  const currentRegion = useGameStore((s) => s.state.currentRegion);
  const currentSubregion = useGameStore((s) => s.state.currentSubregion);
  const hasEvent = useGameStore(
    (s) =>
      s.state.pendingEvent !== null ||
      s.state.pendingEscortCrisis !== null ||
      s.state.pendingSupplyCrisis !== null ||
      s.state.pendingActivityStallClosing !== null,
  );
  const dispatch = useGameStore((s) => s.dispatch);
  const region = REGION_INDEX[currentRegion];
  const subregion = region?.subregions.find((item) => item.id === currentSubregion);
  const routeSpecs = useMemo(() => uniqueRoutesFromRegions(content.regionContent), [content.regionContent]);
  const trackedEntry = content.loreEntries?.find((entry) => entry.id === state.trackedLoreEntryId);
  const travelGuide = useMemo(
    () => buildLoreTravelGuide(state, trackedEntry, content.regions ?? [], routeSpecs),
    [content.regions, routeSpecs, state, trackedEntry],
  );
  const priorityJourneyGuide = useMemo(
    () =>
      buildPriorityJourneyGuide(
        state,
        PRIORITY_JOURNEY_STEPS,
        content.loreEntries ?? [],
        content.regions ?? [],
        routeSpecs,
      ),
    [content.loreEntries, content.regions, routeSpecs, state],
  );

  const tools = [
    { label: '大地图', icon: `${UI_ROOT}/icon_map.png`, frame: `${UI_ROOT}/hud_button.png`, onClick: onOpenMap },
    { label: '背包', icon: `${UI_ROOT}/icon_bag.png`, frame: `${UI_ROOT}/hud_button.png`, onClick: onOpenBag },
    {
      label: '成就',
      icon: `${UI_ROOT}/icon_achievement.png`,
      frame: `${UI_ROOT}/hud_button.png`,
      onClick: onOpenAchievements,
    },
    {
      label: '百工志',
      icon: `${UI_ROOT}/icon_panel.png`,
      frame: `${UI_ROOT}/hud_button.png`,
      onClick: onOpenLore,
      disabled: !playing,
    },
    {
      label: '镇务',
      icon: `${UI_ROOT}/icon_panel.png`,
      frame: `${UI_ROOT}/hud_button.png`,
      onClick: onOpenPanel,
      disabled: !playing,
    },
    {
      label: '时辰',
      icon: `${UI_ROOT}/icon_season.png`,
      frame: `${UI_ROOT}/hud_button_red.png`,
      onClick: () => dispatch({ type: 'ADVANCE_TIME' }),
      disabled: !playing || hasEvent,
    },
  ];

  return (
    <>
      <div className="hud hud--top">
        <div className="hud__left">
          <button
            className="hud__settings"
            onClick={onOpenSettings}
            title="设置 (Esc)"
            aria-label="设置"
          >
            <img className="hud__button-frame" src={`${UI_ROOT}/hud_button_gold.png`} alt="" draggable={false} />
            <img className="hud__settings-icon" src={`${UI_ROOT}/icon_settings.png`} alt="" draggable={false} />
            <span className="hud__sr-only">设置</span>
          </button>
          <div className="hud__metrics" aria-label="四维状态">
            {METRIC_KEYS.map((key) => {
              const value = metrics[key as keyof Metrics];
              const zone = zoneOf(value);
              return (
                <div className="hud__metric" key={key}>
                  <img className="hud__metric-frame" src={`${UI_ROOT}/hud_metric.png`} alt="" draggable={false} />
                  <img className="hud__metric-icon" src={METRIC_ICONS[key]} alt="" draggable={false} />
                  <span className="hud__metric-name">{METRIC_LABELS[key]}</span>
                  <span className={`hud__metric-value zone-${zone}`}>{value}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="hud__right">
          <div className="hud__location-plaque" aria-label="当前位置">
            <img className="hud__button-frame" src={`${UI_ROOT}/hud_button.png`} alt="" draggable={false} />
            <img className="hud__season-icon" src={`${UI_ROOT}/icon_map.png`} alt="" draggable={false} />
            <span>{region?.name ?? currentRegion} · {subregion?.name ?? currentSubregion}</span>
          </div>
          <div className="hud__season-plaque" aria-label={`第 ${calendar.day} 日，${PHASE_LABEL[calendar.phase]}，${WEATHER_LABEL[calendar.weather]}`}>
            <img className="hud__button-frame" src={`${UI_ROOT}/hud_button_gold.png`} alt="" draggable={false} />
            <img className="hud__season-icon" src={`${UI_ROOT}/icon_season.png`} alt="" draggable={false} />
            <span>第 {calendar.day} 日 · {PHASE_LABEL[calendar.phase]} · {WEATHER_LABEL[calendar.weather]}</span>
          </div>
          <div className="hud__tools" aria-label="常用入口">
            {tools.map((tool) => (
              <button
                className="hud__tool"
                key={tool.label}
                disabled={tool.disabled}
                onClick={tool.onClick}
                title={tool.label}
                aria-label={tool.label}
              >
                <img className="hud__button-frame" src={tool.frame} alt="" draggable={false} />
                <img className="hud__tool-icon" src={tool.icon} alt="" draggable={false} />
                <span className="hud__tool-text">{tool.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {hint && (
        <div className="hud hud--hint">
          <img className="hud__panel-frame" src={`${UI_ROOT}/hud_panel.png`} alt="" draggable={false} />
          <span>{hint}</span>
          <button className="hud__hint-action" data-smoke="hud-interact-nearby" type="button" onClick={onInteractNearby}>
            互动
          </button>
        </div>
      )}

      {travelGuide && (
        <div className="hud hud--travel-guide">
          <img className="hud__panel-frame" src={`${UI_ROOT}/hud_panel.png`} alt="" draggable={false} />
          <div className="hud__travel-copy">
            <b>行脚目标</b>
            <span>{travelGuide.instruction}</span>
          </div>
          <button
            className="hud__travel-clear"
            type="button"
            onClick={() => dispatch({ type: 'CLEAR_LORE_TRACKING' })}
            title="取消行脚目标"
            aria-label="取消行脚目标"
          >
            ×
          </button>
        </div>
      )}

      {playing && priorityJourneyGuide && (
        <div className="hud hud--priority-guide" title={priorityJourneyGuide.detail}>
          <img className="hud__panel-frame" src={`${UI_ROOT}/hud_panel.png`} alt="" draggable={false} />
          <div className="hud__travel-copy">
            <b>
              主轴目标 {Math.min(priorityJourneyGuide.stepIndex + 1, priorityJourneyGuide.totalSteps)}/
              {priorityJourneyGuide.totalSteps}
            </b>
            <span>{priorityJourneyGuide.instruction}</span>
          </div>
        </div>
      )}

      <div className="hud hud--controls">
        <img className="hud__panel-frame" src={`${UI_ROOT}/hud_panel.png`} alt="" draggable={false} />
        <span>WASD / 方向键移动</span>
        <span>E 进入体验点</span>
      </div>
    </>
  );
}
