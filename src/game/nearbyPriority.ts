export type NearbyCandidateKind = 'point' | 'npc';

const NPC_FOCUS_DISTANCE = 40;

export interface InteractionRect {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export function nearestPointOnInteractionRect(x: number, y: number, rect: InteractionRect) {
  return {
    x: Math.max(rect.left, Math.min(rect.right, x)),
    y: Math.max(rect.top, Math.min(rect.bottom, y)),
  };
}

export function interactionRectDistance(x: number, y: number, rect: InteractionRect) {
  const nearest = nearestPointOnInteractionRect(x, y, rect);
  return Math.hypot(x - nearest.x, y - nearest.y);
}

export function shouldReplaceNearbyCandidate(
  candidateKind: NearbyCandidateKind,
  candidateDistance: number,
  currentKind: NearbyCandidateKind | null,
  currentDistance: number,
): boolean {
  if (currentKind === null) return true;
  if (candidateKind === currentKind) return candidateDistance < currentDistance;
  if (candidateKind === 'npc' && currentKind === 'point') {
    if (candidateDistance <= NPC_FOCUS_DISTANCE) return true;
    return candidateDistance < currentDistance;
  }
  if (candidateKind === 'point' && currentKind === 'npc') {
    if (currentDistance <= NPC_FOCUS_DISTANCE) return false;
    return candidateDistance <= currentDistance;
  }
  return false;
}
