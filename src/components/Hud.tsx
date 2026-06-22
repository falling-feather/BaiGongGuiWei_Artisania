import { type CSSProperties, useEffect, useMemo, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import {
  buildLoreTravelGuide,
  buildPriorityJourneyGuide,
  uniqueRoutesFromRegions,
} from '../engine';
import { PRIORITY_JOURNEY_STEPS, REGION_INDEX } from '../data';
import { minigameRegionTheme } from './minigameUiTheme';

const UI_ROOT = '/assets/game/ui';
const HUD_CONTROLS_SEEN_KEY = 'artisania:hud-controls-hint-seen';

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

function controlsHintInitiallyVisible() {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(HUD_CONTROLS_SEEN_KEY) !== '1';
}

/** Overlay HUD for the Phaser street scene. */
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
  const [showControlsHint, setShowControlsHint] = useState(controlsHintInitiallyVisible);
  const region = REGION_INDEX[currentRegion];
  const subregion = region?.subregions.find((item) => item.id === currentSubregion);
  const hudTheme = minigameRegionTheme(currentRegion);
  const hudStyle = {
    '--hud-accent': hudTheme.accent,
    '--hud-accent-soft': hudTheme.accentSoft,
  } as CSSProperties;
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

  useEffect(() => {
    if (!playing || !showControlsHint) return undefined;
    const timer = window.setTimeout(() => dismissControlsHint(), 7600);
    return () => window.clearTimeout(timer);
  }, [playing, showControlsHint]);

  function dismissControlsHint() {
    setShowControlsHint(false);
    window.localStorage.setItem(HUD_CONTROLS_SEEN_KEY, '1');
  }

  const tools: Array<{
    label: string;
    icon: string;
    onClick: () => void;
    smokeId: string;
    disabled?: boolean;
    action?: boolean;
  }> = [
    { label: '大地图', icon: `${UI_ROOT}/icon_map.png`, onClick: onOpenMap, smokeId: 'map' },
    { label: '背包', icon: `${UI_ROOT}/icon_bag.png`, onClick: onOpenBag, smokeId: 'bag' },
    { label: '成就', icon: `${UI_ROOT}/icon_achievement.png`, onClick: onOpenAchievements, smokeId: 'achievements' },
    { label: '百工志', icon: `${UI_ROOT}/icon_panel.png`, onClick: onOpenLore, smokeId: 'lore', disabled: !playing },
    { label: '镇务', icon: `${UI_ROOT}/icon_panel.png`, onClick: onOpenPanel, smokeId: 'region', disabled: !playing },
    {
      label: '时辰',
      icon: `${UI_ROOT}/icon_season.png`,
      onClick: () => dispatch({ type: 'ADVANCE_TIME' }),
      smokeId: 'time',
      disabled: !playing || hasEvent,
      action: true,
    },
  ];

  const guideCards = [
    travelGuide
      ? {
          key: 'travel',
          title: '行脚目标',
          detail: travelGuide.detail,
          body: travelGuide.instruction,
          onClear: () => dispatch({ type: 'CLEAR_LORE_TRACKING' }),
        }
      : null,
    playing && priorityJourneyGuide
      ? {
          key: 'priority',
          title: `主轴目标 ${Math.min(priorityJourneyGuide.stepIndex + 1, priorityJourneyGuide.totalSteps)}/${priorityJourneyGuide.totalSteps}`,
          detail: priorityJourneyGuide.detail,
          body: priorityJourneyGuide.instruction,
        }
      : null,
  ].filter(Boolean) as Array<{ key: string; title: string; body: string; detail?: string; onClear?: () => void }>;

  return (
    <>
      <div className={`hud hud--top hud--top-v2 hud--region-${hudTheme.regionId}`} style={hudStyle}>
        <img className="hud__top-frame-v2" src={`${UI_ROOT}/hud_v2_top_bar.png`} alt="" draggable={false} />
        <div className="hud__nav-v2" aria-label="常用入口">
          <img className="hud__nav-frame" src={`${UI_ROOT}/hud_v2_top_bar.png`} alt="" draggable={false} />
          <div className="hud__nav-tools">
            {tools.map((tool) => (
              <button
                className={`hud__tool-v2${tool.action ? ' hud__tool-v2--action' : ''}`}
                key={tool.label}
                data-smoke={`hud-tool:${tool.smokeId}`}
                disabled={tool.disabled}
                onClick={tool.onClick}
                title={tool.label}
                aria-label={tool.label}
              >
                <img
                  className="hud__tool-frame-v2"
                  src={`${UI_ROOT}/${tool.action ? 'hud_v2_action_button.png' : 'hud_v2_icon_button.png'}`}
                  alt=""
                  draggable={false}
                />
                <img className="hud__tool-icon-v2" src={tool.icon} alt="" draggable={false} />
                <span>{tool.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="hud__status-v2">
          <div className="hud__plaque-v2" data-smoke="hud-location" aria-label="当前位置">
            <img src={`${UI_ROOT}/hud_v2_plaque.png`} alt="" draggable={false} />
            <span>{region?.name ?? currentRegion} · {subregion?.name ?? currentSubregion}</span>
          </div>
          <div
            className="hud__plaque-v2 hud__plaque-v2--time"
            aria-label={`第 ${calendar.day} 日，${PHASE_LABEL[calendar.phase]}，${WEATHER_LABEL[calendar.weather]}`}
          >
            <img src={`${UI_ROOT}/hud_v2_plaque.png`} alt="" draggable={false} />
            <span>第 {calendar.day} 日 · {PHASE_LABEL[calendar.phase]} · {WEATHER_LABEL[calendar.weather]}</span>
          </div>
        </div>

        <button className="hud__settings-v2" onClick={onOpenSettings} title="设置 (Esc)" aria-label="设置">
          <img src={`${UI_ROOT}/hud_v2_icon_button.png`} alt="" draggable={false} />
          <img className="hud__settings-icon-v2" src={`${UI_ROOT}/icon_settings.png`} alt="" draggable={false} />
        </button>
      </div>

      {guideCards.length > 0 && (
        <aside className="hud hud--task-rail" style={hudStyle} aria-label="任务与寻路">
          <img className="hud__task-frame" src={`${UI_ROOT}/hud_v2_side_task_panel.png`} alt="" draggable={false} />
          <div className="hud__task-scroll">
            {guideCards.map((card) => (
              <article className="hud__task-card" key={card.key} title={card.detail}>
                <b>{card.title}</b>
                <span>{card.body}</span>
                {card.onClear && (
                  <button type="button" onClick={card.onClear} aria-label="取消行脚目标">
                    收起
                  </button>
                )}
              </article>
            ))}
          </div>
        </aside>
      )}

      {hint && (
        <div className="hud hud--hint hud--hint-v2" style={hudStyle}>
          <img className="hud__panel-frame" src={`${UI_ROOT}/hud_v2_hint_panel.png`} alt="" draggable={false} />
          <span>{hint}</span>
          <button className="hud__hint-action" data-smoke="hud-interact-nearby" type="button" onClick={onInteractNearby}>
            互动
          </button>
        </div>
      )}

      {playing && showControlsHint && (
        <div className="hud hud--controls hud--controls-v2" style={hudStyle}>
          <img className="hud__panel-frame" src={`${UI_ROOT}/hud_v2_hint_panel.png`} alt="" draggable={false} />
          <span>WASD / 方向键移动</span>
          <span>E 进入交互</span>
          <button type="button" onClick={dismissControlsHint}>
            知道了
          </button>
        </div>
      )}
    </>
  );
}
