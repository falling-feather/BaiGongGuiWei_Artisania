import { describe, expect, it } from 'vitest';
import { shouldReplaceNearbyCandidate } from '../nearbyPriority';

describe('nearby interaction priority', () => {
  it('prefers an NPC over a map point in the same interaction range', () => {
    expect(shouldReplaceNearbyCandidate('npc', 82, 'point', 24)).toBe(true);
  });

  it('does not let a map point replace an NPC once an NPC is nearby', () => {
    expect(shouldReplaceNearbyCandidate('point', 12, 'npc', 78)).toBe(false);
  });

  it('keeps the nearest candidate when both candidates have the same kind', () => {
    expect(shouldReplaceNearbyCandidate('npc', 20, 'npc', 48)).toBe(true);
    expect(shouldReplaceNearbyCandidate('point', 52, 'point', 12)).toBe(false);
  });
});
