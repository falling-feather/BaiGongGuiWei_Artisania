/**
 * 学徒初始数据。M0 提供两名性格各异的学徒种子。
 * 性格特质（trait）会在后续里程碑影响成长与事件，M0 仅作展示与留存计算。
 */
import type { Apprentice } from '../engine/types';

export const STARTING_APPRENTICES: Apprentice[] = [
  {
    id: 'apprentice-azu',
    name: '阿竺',
    trait: 'steady',
    craftId: 'indigo-dyeing',
    skill: 30,
    morale: 70,
  },
  {
    id: 'apprentice-lin',
    name: '阿林',
    trait: 'clever',
    craftId: 'bamboo-weaving',
    skill: 25,
    morale: 65,
  },
];

export const TRAIT_LABELS: Record<Apprentice['trait'], string> = {
  steady: '沉稳',
  clever: '灵巧',
  restless: '躁动',
  devout: '虔敬',
};
