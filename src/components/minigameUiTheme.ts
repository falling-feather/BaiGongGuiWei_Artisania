import type { ActivityMiniGameType } from '../engine';

const UI_BASE = '/assets/game/ui/';

export type MinigameRegionTheme = {
  regionId: string;
  label: string;
  frame: string;
  accent: string;
  accentSoft: string;
};

const REGION_THEMES: Record<string, MinigameRegionTheme> = {
  jiangnan: {
    regionId: 'jiangnan',
    label: '江南水巷',
    frame: `${UI_BASE}minigame_region_jiangnan.png`,
    accent: '#2f6f6d',
    accentSoft: 'rgba(47, 111, 109, 0.16)',
  },
  bashu: {
    regionId: 'bashu',
    label: '巴蜀茶马',
    frame: `${UI_BASE}minigame_region_bashu.png`,
    accent: '#8a5b2f',
    accentSoft: 'rgba(138, 91, 47, 0.17)',
  },
  lingnan: {
    regionId: 'lingnan',
    label: '岭南商埠',
    frame: `${UI_BASE}minigame_region_lingnan.png`,
    accent: '#3c8063',
    accentSoft: 'rgba(60, 128, 99, 0.17)',
  },
  ganpo: {
    regionId: 'ganpo',
    label: '赣鄱窑火',
    frame: `${UI_BASE}minigame_region_ganpo.png`,
    accent: '#2b638c',
    accentSoft: 'rgba(43, 99, 140, 0.17)',
  },
  xiyu: {
    regionId: 'xiyu',
    label: '西域驼铃',
    frame: `${UI_BASE}minigame_region_xiyu.png`,
    accent: '#9b7134',
    accentSoft: 'rgba(155, 113, 52, 0.18)',
  },
};

const REGION_THEME_ALIAS: Record<string, keyof typeof REGION_THEMES> = {
  jiangnan: 'jiangnan',
  huizhou: 'jiangnan',
  bashu: 'bashu',
  qiandian: 'bashu',
  lingnan: 'lingnan',
  jingchu: 'lingnan',
  ganpo: 'ganpo',
  jingji: 'ganpo',
  xiyu: 'xiyu',
  western: 'xiyu',
  sanjin: 'xiyu',
  xueyu: 'xiyu',
};

const MINI_ICON_BY_TYPE: Record<ActivityMiniGameType, string> = {
  rhythm: `${UI_BASE}minigame_icon_rhythm.png`,
  drag_path: `${UI_BASE}minigame_icon_trace.png`,
  ratio_mix: `${UI_BASE}minigame_icon_mix.png`,
  timing_hold: `${UI_BASE}minigame_icon_timing.png`,
  aim_place: `${UI_BASE}minigame_icon_place.png`,
  repeat_endure: `${UI_BASE}minigame_icon_rhythm.png`,
  couplet_choice: `${UI_BASE}minigame_icon_trace.png`,
  calligraphy_trace: `${UI_BASE}minigame_icon_trace.png`,
  crop_calendar: `${UI_BASE}minigame_icon_route.png`,
  appraise_select: `${UI_BASE}minigame_icon_place.png`,
  route_plan: `${UI_BASE}minigame_icon_route.png`,
  dialogue_check: `${UI_BASE}minigame_icon_trace.png`,
};

export const MINIGAME_QUALITY_METER = `${UI_BASE}minigame_quality_meter.png`;
export const WORKSHOP_TIMER_METER = `${UI_BASE}workshop_timer_meter.png`;

export function workshopRegionFrame(regionId: string | null | undefined): string {
  const theme = minigameRegionTheme(regionId);
  return `${UI_BASE}workshop_region_${theme.regionId}.png`;
}

export function workshopIconFor(miniGame: ActivityMiniGameType): string {
  return minigameIconFor(miniGame).replace('/minigame_', '/workshop_');
}

export function minigameRegionTheme(regionId: string | null | undefined): MinigameRegionTheme {
  return REGION_THEMES[REGION_THEME_ALIAS[regionId ?? ''] ?? 'jiangnan'];
}

export function minigameIconFor(miniGame: ActivityMiniGameType): string {
  return MINI_ICON_BY_TYPE[miniGame];
}

export function craftActionIcon(action: string): string {
  if (/[火窑炉烘烧温]/.test(action)) return `${UI_BASE}minigame_icon_timing.png`;
  if (/[调配浆釉染色料]/.test(action)) return `${UI_BASE}minigame_icon_mix.png`;
  if (/[路运驿车船账]/.test(action)) return `${UI_BASE}minigame_icon_route.png`;
  if (/[摆放定位选验相看]/.test(action)) return `${UI_BASE}minigame_icon_place.png`;
  if (/[敲锤织打磨]/.test(action)) return `${UI_BASE}minigame_icon_rhythm.png`;
  return `${UI_BASE}minigame_icon_trace.png`;
}
