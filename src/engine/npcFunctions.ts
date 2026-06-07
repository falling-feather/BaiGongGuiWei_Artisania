import type { NpcFunctionKind } from './types';

export const NPC_FUNCTION_REQUIREMENTS: Record<NpcFunctionKind, number> = {
  mentor: 8,
  quest: 0,
  route: 8,
  escort: 10,
  order: 12,
  collab: 20,
  appraisal: 12,
  homeVisit: 20,
};

export const NPC_FUNCTION_LABELS: Record<NpcFunctionKind, string> = {
  mentor: '授艺',
  quest: '委托',
  route: '路线',
  escort: '护商',
  order: '订单',
  collab: '联作',
  appraisal: '鉴评',
  homeVisit: '来访',
};

export function npcFunctionRequirement(functionKind: NpcFunctionKind): number {
  return NPC_FUNCTION_REQUIREMENTS[functionKind] ?? 0;
}

export function npcFunctionNeedsItem(functionKind: NpcFunctionKind): boolean {
  return functionKind === 'collab' || functionKind === 'appraisal';
}
