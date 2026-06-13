import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), 'utf8');
}

describe('activity UI entry guards', () => {
  it('blocks new activity starts while a stall closing choice is unresolved', () => {
    const activityModal = source('../../components/ActivityModal.tsx');
    const regionPanel = source('../../components/RegionPanel.tsx');

    expect(activityModal).toContain('const pendingStallClosing = Boolean(state.pendingActivityStallClosing);');
    expect(activityModal).toContain('!pendingStallClosing');
    expect(activityModal).toContain('先处理当前摊位收束，再安排新的地区活动。');
    expect(regionPanel).toContain('if (state.pendingActivityStallClosing) return false;');
  });
});
