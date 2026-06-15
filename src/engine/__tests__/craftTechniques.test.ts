import { describe, expect, it } from 'vitest';
import { gameReducer, type GameContent } from '../reducer';
import { craftFocusCheckPlan, craftTechniquePlan } from '../craftTechniques';
import { createInitialState } from '../state';
import type { GameState } from '../types';
import { CRAFTS } from '../../data/crafts';
import { STARTING_APPRENTICES } from '../../data/apprentices';
import { EVENTS } from '../../data/events';
import { INDUSTRIES } from '../../data/industries';
import { REGIONS } from '../../data/regions';
import { RESOURCES } from '../../data/resources';
import { CRAFT_INTERACTIONS } from '../../data/craftInteractions';
import { ITEM_DESCRIPTOR_RULES } from '../../data/itemDescriptors';
import { SUBREGION_CONTENT } from '../../data/subregionContent';

const content: GameContent = {
  crafts: CRAFTS,
  apprentices: STARTING_APPRENTICES,
  events: EVENTS,
  industries: INDUSTRIES,
  regions: REGIONS,
  resources: RESOURCES,
  craftInteractions: CRAFT_INTERACTIONS,
  subregionContent: SUBREGION_CONTENT,
  itemDescriptorRules: ITEM_DESCRIPTOR_RULES,
};

function readyLongquanState() {
  const state = createInitialState(content.crafts, content.apprentices, 24680, undefined, content.regions);
  const inLongquan = gameReducer(state, { type: 'TRAVEL_SUBREGION', subregionId: 'jiangnan-longquan' }, content);
  return {
    ...inLongquan,
    resources: {
      ...inLongquan.resources,
      ironIngot: 2,
      coal: 2,
      labor: 20,
    },
  };
}

function latestSword(state: GameState) {
  return state.itemInstances.find((item) => item.resourceId === 'treasureSword');
}

function readyAtlasState() {
  const state = createInitialState(content.crafts, content.apprentices, 24681, undefined, content.regions);
  return {
    ...state,
    currentRegion: 'xiyu',
    currentSubregion: 'xiyu-atlas-loom',
    unlockedRegions: [...new Set([...state.unlockedRegions, 'xiyu'])],
    resources: {
      ...state.resources,
      rawSilkThread: 4,
      indigoVat: 4,
      labor: 20,
    },
  };
}

function latestAtlasSilk(state: GameState) {
  return state.itemInstances.find((item) => item.resourceId === 'atlasSilk');
}

describe('craft technique choices', () => {
  it('lets careful technique spend labor for higher sword quality dimensions', () => {
    const balanced = gameReducer(
      readyLongquanState(),
      { type: 'RUN_PROCESS', craftId: 'longquan-sword', skipStepIds: [] },
      content,
    );
    const careful = gameReducer(
      readyLongquanState(),
      {
        type: 'RUN_PROCESS',
        craftId: 'longquan-sword',
        skipStepIds: [],
        techniqueChoices: [
          { stageId: 'sword-fold-forge', choiceId: 'careful' },
          { stageId: 'sword-quench-polish', choiceId: 'careful' },
        ],
      },
      content,
    );
    const balancedSword = latestSword(balanced)!;
    const carefulSword = latestSword(careful)!;

    expect(careful.resources.labor).toBeLessThan(balanced.resources.labor);
    expect(carefulSword.quality).toBeGreaterThan(balancedSword.quality);
    expect(carefulSword.qualityDimensions?.resilience ?? 0).toBeGreaterThan(
      balancedSword.qualityDimensions?.resilience ?? 0,
    );
    expect(carefulSword.qualityDimensions?.sharpness ?? 0).toBeGreaterThan(
      balancedSword.qualityDimensions?.sharpness ?? 0,
    );
    expect(carefulSword.craftTechniqueRecords?.some((record) => record.choiceId === 'careful')).toBe(true);
    expect(careful.flags).toContain('craft-technique-used:longquan-sword');
  });

  it('lets rushed technique save labor while lowering quality and leaving risky records', () => {
    const balanced = gameReducer(
      readyLongquanState(),
      { type: 'RUN_PROCESS', craftId: 'longquan-sword', skipStepIds: [] },
      content,
    );
    const rushed = gameReducer(
      readyLongquanState(),
      {
        type: 'RUN_PROCESS',
        craftId: 'longquan-sword',
        skipStepIds: [],
        techniqueChoices: [
          { stageId: 'sword-select-iron', choiceId: 'rushed' },
          { stageId: 'sword-fold-forge', choiceId: 'rushed' },
          { stageId: 'sword-quench-polish', choiceId: 'rushed' },
        ],
      },
      content,
    );
    const balancedSword = latestSword(balanced)!;
    const rushedSword = latestSword(rushed)!;

    expect(rushed.resources.labor).toBeGreaterThan(balanced.resources.labor);
    expect(rushedSword.quality).toBeLessThan(balancedSword.quality);
    expect(rushedSword.qualityDimensions?.sharpness ?? 1).toBeLessThan(
      balancedSword.qualityDimensions?.sharpness ?? 1,
    );
    expect(rushedSword.craftTechniqueRecords?.every((record) => record.choiceId === 'rushed')).toBe(true);
    expect(rushedSword.craftStageOutcomes?.every((outcome) => outcome.result === 'risky')).toBe(true);
    expect(rushedSword.craftStageOutcomes?.every((outcome) => outcome.riskScore > outcome.controlScore)).toBe(true);
    expect(rushed.flags).toContain('craft-technique:rushed:sword-quench-polish');
  });

  it('uses mentor guidance to review risky stages during crafting', () => {
    const mentoredState = readyLongquanState();
    const mentored = gameReducer(
      {
        ...mentoredState,
        flags: [
          ...mentoredState.flags,
          'craft-mentor:longquan-sword',
          'craft-mentor-stage:sword-select-iron',
          'craft-mentor-defect:sword-brittle-core',
          'craft-mentor-repair:sword-temper-again',
        ],
      },
      {
        type: 'RUN_PROCESS',
        craftId: 'longquan-sword',
        skipStepIds: [],
        techniqueChoices: [
          { stageId: 'sword-select-iron', choiceId: 'rushed' },
          { stageId: 'sword-fold-forge', choiceId: 'rushed' },
          { stageId: 'sword-quench-polish', choiceId: 'rushed' },
        ],
      },
      content,
    );
    const sword = latestSword(mentored)!;
    const reviewed = sword.craftStageOutcomes?.filter((outcome) => outcome.mentorIntervention);
    const unreviewedQuench = sword.craftStageOutcomes?.find((outcome) => outcome.stageId === 'sword-quench-polish');

    expect(reviewed?.map((outcome) => outcome.stageId)).toEqual(['sword-select-iron', 'sword-fold-forge']);
    expect(reviewed?.every((outcome) => outcome.result === 'standard')).toBe(true);
    expect(reviewed?.every((outcome) => outcome.riskScore < 0.72)).toBe(true);
    expect(unreviewedQuench?.result).toBe('risky');
    expect(sword.craftMentorInterventions?.map((intervention) => intervention.stageId)).toEqual([
      'sword-select-iron',
      'sword-fold-forge',
    ]);
    expect(sword.descriptors).toContain('师傅现场复核');
    expect(sword.appraisal).toContain('师傅现场复核');
    expect(mentored.flags).toContain('craft-mentor-intervention:longquan-sword');
    expect(mentored.flags).toContain('craft-mentor-intervention-stage:sword-fold-forge');
  });

  it('records active stage diagnostics and falls back unknown choices to balanced', () => {
    const swordSpec = CRAFT_INTERACTIONS.find((spec) => spec.craftId === 'longquan-sword')!;
    const plan = craftTechniquePlan(
      swordSpec,
      [
        { stageId: 'sword-select-iron', choiceId: 'careful' },
        { stageId: 'sword-fold-forge', choiceId: 'missing' as never },
      ],
      ['longquan-sword-prep', 'longquan-sword-a'],
    );

    expect(plan.stageOutcomes.map((outcome) => outcome.stageId)).toEqual([
      'sword-select-iron',
      'sword-fold-forge',
    ]);
    expect(plan.stageOutcomes.map((outcome) => outcome.result)).toEqual(['steady', 'standard']);
    expect(plan.stageOutcomes[0]).toMatchObject({
      choiceId: 'careful',
      controlScore: 0.86,
      riskScore: 0.14,
      sourceStepIds: ['longquan-sword-prep'],
    });
    expect(plan.stageOutcomes[1]).toMatchObject({
      choiceId: 'balanced',
      controlScore: 0.64,
      riskScore: 0.34,
    });
    expect(plan.stageOutcomes.some((outcome) => outcome.stageId === 'sword-quench-polish')).toBe(false);
  });

  it('runs Atlas silk through its own interaction stages and repair loop', () => {
    const atlasSpec = CRAFT_INTERACTIONS.find((spec) => spec.craftId === 'atlas-silk')!;
    const plan = craftTechniquePlan(
      atlasSpec,
      [
        { stageId: 'atlas-tie-dye-warp', choiceId: 'careful' },
        { stageId: 'atlas-weave-finish', choiceId: 'balanced' },
      ],
      ['atlas-silk-a', 'atlas-silk-b'],
    );

    expect(plan.stageOutcomes.map((outcome) => outcome.stageId)).toEqual([
      'atlas-tie-dye-warp',
      'atlas-weave-finish',
    ]);
    expect(plan.stageOutcomes[0]).toMatchObject({ choiceId: 'careful', sourceStepIds: ['atlas-silk-a'] });

    let state = gameReducer(
      readyAtlasState(),
      {
        type: 'RUN_PROCESS',
        craftId: 'atlas-silk',
        skipStepIds: ['atlas-silk-prep'],
        techniqueChoices: [
          { stageId: 'atlas-tie-dye-warp', choiceId: 'rushed' },
          { stageId: 'atlas-weave-finish', choiceId: 'rushed' },
        ],
      },
      content,
    );
    const flawed = latestAtlasSilk(state)!;
    const defect = flawed.defects?.find((entry) => entry.id === 'atlas-muddy-dye');

    expect(flawed.originSubregionId).toBe('xiyu-atlas-loom');
    expect(defect).toMatchObject({
      id: 'atlas-muddy-dye',
      sourceStageId: 'atlas-prepare-warp',
      sourceStageName: '缫丝牵经备染',
    });

    state = gameReducer(
      state,
      {
        type: 'REPAIR_ITEM',
        itemId: flawed.id,
        defectId: 'atlas-muddy-dye',
        repairOptionId: 'atlas-rinse-redye',
      },
      content,
    );
    const repaired = state.itemInstances.find((item) => item.id === flawed.id)!;
    expect(repaired.defects?.some((entry) => entry.id === 'atlas-muddy-dye')).toBe(false);
    expect(repaired.repairHistory?.[0]).toMatchObject({
      defectId: 'atlas-muddy-dye',
      optionId: 'atlas-rinse-redye',
    });
  });

  it('plans focus checks only for active stages and falls back unknown choices to observe', () => {
    const swordSpec = CRAFT_INTERACTIONS.find((spec) => spec.craftId === 'longquan-sword')!;
    const plan = craftFocusCheckPlan(
      swordSpec,
      [
        { stageId: 'sword-select-iron', choiceId: 'align' },
        { stageId: 'sword-fold-forge', choiceId: 'missing' as never },
        { stageId: 'sword-quench-polish', choiceId: 'press' },
      ],
      ['longquan-sword-prep', 'longquan-sword-a'],
    );

    expect(plan.records.map((record) => record.stageId)).toEqual([
      'sword-select-iron',
      'sword-fold-forge',
    ]);
    expect(plan.records.map((record) => record.choiceId)).toEqual(['align', 'observe']);
    expect(plan.dimensionDelta.purity).toBeCloseTo(0.035);
    expect(plan.dimensionDelta.resilience).toBeCloseTo(0.015);
    expect(plan.metricDelta).toMatchObject({ heritage: 2, spirit: 1 });
    expect(plan.records.some((record) => record.stageId === 'sword-quench-polish')).toBe(false);
  });

  it('records focus checks on crafted items and adjusts stage diagnostics', () => {
    const base = gameReducer(
      readyLongquanState(),
      {
        type: 'RUN_PROCESS',
        craftId: 'longquan-sword',
        skipStepIds: [],
        techniqueChoices: [
          { stageId: 'sword-fold-forge', choiceId: 'balanced' },
          { stageId: 'sword-quench-polish', choiceId: 'rushed' },
        ],
      },
      content,
    );
    const focused = gameReducer(
      readyLongquanState(),
      {
        type: 'RUN_PROCESS',
        craftId: 'longquan-sword',
        skipStepIds: [],
        techniqueChoices: [
          { stageId: 'sword-fold-forge', choiceId: 'balanced' },
          { stageId: 'sword-quench-polish', choiceId: 'rushed' },
        ],
        focusChecks: [
          { stageId: 'sword-fold-forge', choiceId: 'align' },
          { stageId: 'sword-quench-polish', choiceId: 'press' },
        ],
      },
      content,
    );
    const baseSword = latestSword(base)!;
    const focusedSword = latestSword(focused)!;
    const foldOutcome = focusedSword.craftStageOutcomes?.find((outcome) => outcome.stageId === 'sword-fold-forge');
    const quenchOutcome = focusedSword.craftStageOutcomes?.find((outcome) => outcome.stageId === 'sword-quench-polish');

    expect(focusedSword.quality).toBeGreaterThan(baseSword.quality);
    expect(focusedSword.qualityDimensions?.sharpness ?? 0).toBeGreaterThan(
      baseSword.qualityDimensions?.sharpness ?? 0,
    );
    expect(focusedSword.craftFocusCheckRecords?.map((record) => record.choiceId)).toEqual(['align', 'press']);
    expect(foldOutcome).toMatchObject({
      stageId: 'sword-fold-forge',
      focusCheck: { choiceId: 'align' },
      controlScore: 0.72,
      riskScore: 0.32,
      result: 'standard',
    });
    expect(quenchOutcome?.focusCheck?.choiceId).toBe('press');
    expect(quenchOutcome?.riskScore).toBeGreaterThan(quenchOutcome?.controlScore ?? 1);
    expect(focusedSword.descriptors).toContain('专注校准');
    expect(focusedSword.appraisal).toContain('专注校准');
    expect(focused.flags).toContain('craft-focus-check-used:longquan-sword');
    expect(focused.flags).toContain('craft-focus-check:press:sword-quench-polish');
  });

  it('keeps defect source stage diagnostics through repair history', () => {
    let s = gameReducer(
      {
        ...readyLongquanState(),
        resources: { ...readyLongquanState().resources, ironIngot: 3, coal: 4, labor: 20 },
      },
      {
        type: 'RUN_PROCESS',
        craftId: 'longquan-sword',
        skipStepIds: ['longquan-sword-prep'],
        techniqueChoices: [
          { stageId: 'sword-fold-forge', choiceId: 'rushed' },
          { stageId: 'sword-quench-polish', choiceId: 'rushed' },
        ],
      },
      content,
    );
    const flawed = latestSword(s)!;
    const defect = flawed.defects?.find((entry) => entry.id === 'sword-brittle-core');

    expect(flawed.craftStageOutcomes?.map((outcome) => outcome.stageId)).toEqual([
      'sword-fold-forge',
      'sword-quench-polish',
    ]);
    expect(defect).toMatchObject({
      id: 'sword-brittle-core',
      sourceStageId: 'sword-select-iron',
      sourceStageName: '选铁定剑形',
    });
    expect(defect?.sourceReason).toContain('省略');

    s = gameReducer(
      s,
      {
        type: 'REPAIR_ITEM',
        itemId: flawed.id,
        defectId: 'sword-brittle-core',
        repairOptionId: 'sword-temper-again',
      },
      content,
    );
    const repaired = s.itemInstances.find((item) => item.id === flawed.id)!;
    expect(repaired.defects?.some((entry) => entry.id === 'sword-brittle-core')).toBe(false);
    expect(repaired.repairHistory?.[0]).toMatchObject({
      defectId: 'sword-brittle-core',
      sourceStageId: 'sword-select-iron',
      sourceStageName: '选铁定剑形',
    });
  });
});
