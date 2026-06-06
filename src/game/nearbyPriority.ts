export type NearbyCandidateKind = 'point' | 'npc';

export function shouldReplaceNearbyCandidate(
  candidateKind: NearbyCandidateKind,
  candidateDistance: number,
  currentKind: NearbyCandidateKind | null,
  currentDistance: number,
): boolean {
  if (currentKind === null) return true;
  if (candidateKind === currentKind) return candidateDistance < currentDistance;
  if (candidateKind === 'npc' && currentKind === 'point') return true;
  return false;
}
