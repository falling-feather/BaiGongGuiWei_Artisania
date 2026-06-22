import { useEffect, useState, type CSSProperties } from 'react';

export const NPC_DIALOG_LAYOUT_STORAGE_KEY = 'artisania:npc-dialog-layout:v2';
export const NPC_DIALOG_LAYOUT_EVENT = 'artisania:npc-dialog-layout-updated';

export type NpcDialogLayoutMode = 'intro' | 'menu';

export interface NpcDialogRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface NpcDialogLayout {
  panelMaxWidth: number;
  viewportPadding: number;
  portrait: NpcDialogRect;
  profile: NpcDialogRect;
  conversation: NpcDialogRect;
  portraitScale: number;
  profilePadX: number;
  profilePadY: number;
  conversationPadX: number;
  conversationPadY: number;
  choiceHeight: number;
  choiceGap: number;
}

export interface NpcDialogLayoutConfig {
  intro: NpcDialogLayout;
  menu: NpcDialogLayout;
}

export const DEFAULT_NPC_DIALOG_LAYOUTS: NpcDialogLayoutConfig = {
  intro: {
    panelMaxWidth: 960,
    viewportPadding: 28,
    portrait: { x: 6.7, y: 4.4, w: 28.5, h: 44.3 },
    profile: { x: 35.4, y: 16.2, w: 54.6, h: 33.1 },
    conversation: { x: 11.7, y: 58.6, w: 76.7, h: 30.7 },
    portraitScale: 1.02,
    profilePadX: 16,
    profilePadY: 10,
    conversationPadX: 18,
    conversationPadY: 12,
    choiceHeight: 38,
    choiceGap: 8,
  },
  menu: {
    panelMaxWidth: 960,
    viewportPadding: 28,
    portrait: { x: 6.7, y: 4.4, w: 28.5, h: 44.3 },
    profile: { x: 35.7, y: 14.5, w: 54.6, h: 33.1 },
    conversation: { x: 10.3, y: 53.4, w: 81.3, h: 40.2 },
    portraitScale: 1.02,
    profilePadX: 16,
    profilePadY: 10,
    conversationPadX: 18,
    conversationPadY: 12,
    choiceHeight: 38,
    choiceGap: 8,
  },
};

export const DEFAULT_NPC_DIALOG_LAYOUT: NpcDialogLayout = DEFAULT_NPC_DIALOG_LAYOUTS.intro;

function finiteNumber(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

function sanitizeRect(value: Partial<NpcDialogRect> | undefined, fallback: NpcDialogRect): NpcDialogRect {
  return {
    x: finiteNumber(value?.x, fallback.x, 0, 95),
    y: finiteNumber(value?.y, fallback.y, 0, 95),
    w: finiteNumber(value?.w, fallback.w, 5, 100),
    h: finiteNumber(value?.h, fallback.h, 5, 100),
  };
}

export function sanitizeNpcDialogLayout(
  value: unknown,
  fallback: NpcDialogLayout = DEFAULT_NPC_DIALOG_LAYOUT,
): NpcDialogLayout {
  const input = (value && typeof value === 'object' ? value : {}) as Partial<NpcDialogLayout>;
  return {
    panelMaxWidth: finiteNumber(input.panelMaxWidth, fallback.panelMaxWidth, 640, 1500),
    viewportPadding: finiteNumber(input.viewportPadding, fallback.viewportPadding, 8, 96),
    portrait: sanitizeRect(input.portrait, fallback.portrait),
    profile: sanitizeRect(input.profile, fallback.profile),
    conversation: sanitizeRect(input.conversation, fallback.conversation),
    portraitScale: finiteNumber(input.portraitScale, fallback.portraitScale, 0.6, 1.6),
    profilePadX: finiteNumber(input.profilePadX, fallback.profilePadX, 0, 40),
    profilePadY: finiteNumber(input.profilePadY, fallback.profilePadY, 0, 32),
    conversationPadX: finiteNumber(input.conversationPadX, fallback.conversationPadX, 0, 44),
    conversationPadY: finiteNumber(input.conversationPadY, fallback.conversationPadY, 0, 36),
    choiceHeight: finiteNumber(input.choiceHeight, fallback.choiceHeight, 24, 72),
    choiceGap: finiteNumber(input.choiceGap, fallback.choiceGap, 2, 24),
  };
}

export function sanitizeNpcDialogLayouts(value: unknown): NpcDialogLayoutConfig {
  const input = (value && typeof value === 'object' ? value : {}) as Partial<NpcDialogLayoutConfig> & Partial<NpcDialogLayout>;
  const isLegacySingleLayout = 'portrait' in input || 'profile' in input || 'conversation' in input;

  if (isLegacySingleLayout) {
    const legacy = sanitizeNpcDialogLayout(input, DEFAULT_NPC_DIALOG_LAYOUT);
    return { intro: legacy, menu: legacy };
  }

  return {
    intro: sanitizeNpcDialogLayout(input.intro, DEFAULT_NPC_DIALOG_LAYOUTS.intro),
    menu: sanitizeNpcDialogLayout(input.menu, DEFAULT_NPC_DIALOG_LAYOUTS.menu),
  };
}

export function readNpcDialogLayouts(): NpcDialogLayoutConfig {
  if (typeof window === 'undefined') return DEFAULT_NPC_DIALOG_LAYOUTS;
  try {
    const raw = window.localStorage.getItem(NPC_DIALOG_LAYOUT_STORAGE_KEY);
    return raw ? sanitizeNpcDialogLayouts(JSON.parse(raw)) : DEFAULT_NPC_DIALOG_LAYOUTS;
  } catch {
    return DEFAULT_NPC_DIALOG_LAYOUTS;
  }
}

export function readNpcDialogLayout(mode: NpcDialogLayoutMode = 'intro'): NpcDialogLayout {
  return readNpcDialogLayouts()[mode];
}

export function writeNpcDialogLayouts(layouts: NpcDialogLayoutConfig): NpcDialogLayoutConfig {
  const sanitized = sanitizeNpcDialogLayouts(layouts);
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(NPC_DIALOG_LAYOUT_STORAGE_KEY, JSON.stringify(sanitized));
    window.dispatchEvent(new CustomEvent<NpcDialogLayoutConfig>(NPC_DIALOG_LAYOUT_EVENT, { detail: sanitized }));
  }
  return sanitized;
}

export function writeNpcDialogLayout(layout: NpcDialogLayout, mode: NpcDialogLayoutMode = 'intro'): NpcDialogLayout {
  return writeNpcDialogLayouts({ ...readNpcDialogLayouts(), [mode]: layout })[mode];
}

export function npcDialogLayoutToCssVars(layout: NpcDialogLayout): CSSProperties {
  const next = sanitizeNpcDialogLayout(layout);
  return {
    '--npc-dialog-max-width': `${next.panelMaxWidth}px`,
    '--npc-dialog-viewport-pad': `${next.viewportPadding}px`,
    '--npc-portrait-x': `${next.portrait.x}%`,
    '--npc-portrait-y': `${next.portrait.y}%`,
    '--npc-portrait-w': `${next.portrait.w}%`,
    '--npc-portrait-h': `${next.portrait.h}%`,
    '--npc-profile-x': `${next.profile.x}%`,
    '--npc-profile-y': `${next.profile.y}%`,
    '--npc-profile-w': `${next.profile.w}%`,
    '--npc-profile-h': `${next.profile.h}%`,
    '--npc-conversation-x': `${next.conversation.x}%`,
    '--npc-conversation-y': `${next.conversation.y}%`,
    '--npc-conversation-w': `${next.conversation.w}%`,
    '--npc-conversation-h': `${next.conversation.h}%`,
    '--npc-portrait-scale': next.portraitScale,
    '--npc-profile-pad-x': `${next.profilePadX}px`,
    '--npc-profile-pad-y': `${next.profilePadY}px`,
    '--npc-conversation-pad-x': `${next.conversationPadX}px`,
    '--npc-conversation-pad-y': `${next.conversationPadY}px`,
    '--npc-choice-height': `${next.choiceHeight}px`,
    '--npc-choice-gap': `${next.choiceGap}px`,
  } as CSSProperties;
}

export function useNpcDialogLayouts() {
  const [layouts, setLayouts] = useState(() => readNpcDialogLayouts());

  useEffect(() => {
    function syncFromStorage() {
      setLayouts(readNpcDialogLayouts());
    }

    function syncFromEvent(event: Event) {
      const custom = event as CustomEvent<NpcDialogLayoutConfig>;
      setLayouts(sanitizeNpcDialogLayouts(custom.detail));
    }

    window.addEventListener('storage', syncFromStorage);
    window.addEventListener(NPC_DIALOG_LAYOUT_EVENT, syncFromEvent);
    return () => {
      window.removeEventListener('storage', syncFromStorage);
      window.removeEventListener(NPC_DIALOG_LAYOUT_EVENT, syncFromEvent);
    };
  }, []);

  return layouts;
}

export function useNpcDialogLayout(mode: NpcDialogLayoutMode = 'intro') {
  return useNpcDialogLayouts()[mode];
}
