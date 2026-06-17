import { describe, expect, it } from 'vitest';
import {
  interactionRectDistance,
  nearestPointOnInteractionRect,
  shouldReplaceNearbyCandidate,
} from '../nearbyPriority';

describe('nearby interaction priority', () => {
  it('keeps a point target when an NPC is nearby but not closer', () => {
    expect(shouldReplaceNearbyCandidate('npc', 42, 'point', 24)).toBe(false);
    expect(shouldReplaceNearbyCandidate('npc', 20, 'point', 24)).toBe(true);
  });

  it('lets a close NPC take focus from a large point footprint', () => {
    expect(shouldReplaceNearbyCandidate('npc', 36, 'point', 0)).toBe(true);
    expect(shouldReplaceNearbyCandidate('point', 0, 'npc', 36)).toBe(false);
  });

  it('lets a much closer map point beat a nearby NPC so craft and gate entries stay reachable', () => {
    expect(shouldReplaceNearbyCandidate('point', 12, 'npc', 78)).toBe(true);
    expect(shouldReplaceNearbyCandidate('npc', 82, 'point', 24)).toBe(false);
  });

  it('keeps the nearest candidate when both candidates have the same kind', () => {
    expect(shouldReplaceNearbyCandidate('npc', 20, 'npc', 48)).toBe(true);
    expect(shouldReplaceNearbyCandidate('point', 52, 'point', 12)).toBe(false);
  });

  it('measures map point distance against the interaction footprint edge', () => {
    const rect = { left: 320, right: 416, top: 192, bottom: 288 };

    expect(nearestPointOnInteractionRect(300, 304, rect)).toEqual({ x: 320, y: 288 });
    expect(interactionRectDistance(320, 304, rect)).toBe(16);
    expect(interactionRectDistance(368, 240, rect)).toBe(0);
  });

  it('keeps a footprint-close resource point when a wandering NPC is outside the focus zone', () => {
    const resourceFootprintDistance = interactionRectDistance(320, 304, {
      left: 320,
      right: 416,
      top: 192,
      bottom: 288,
    });

    expect(resourceFootprintDistance).toBe(16);
    expect(shouldReplaceNearbyCandidate('npc', 48, 'point', resourceFootprintDistance)).toBe(false);
  });
});
