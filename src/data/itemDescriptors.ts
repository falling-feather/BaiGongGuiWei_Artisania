import type { ItemDescriptorRule } from '../engine/types';

export const ITEM_DESCRIPTOR_RULES: ItemDescriptorRule[] = [
  {
    id: 'ore-material',
    label: '矿料',
    resourceIds: ['ironOre', 'copperOre', 'silverOre', 'goldOre', 'mineralPigment', 'jadeRough'],
    tags: ['resource'],
    dimensions: {
      purity: ['浊', '净', '莹', '澄明'],
      grain: ['散纹', '细纹', '霜纹', '星纹'],
      hardness: ['松脆', '沉实', '坚劲', '铁骨'],
      spirit: ['凡料', '含光', '寒意', '异彩'],
    },
    templates: [
      '这份{item}质地尚粗，{descriptors}，只宜先作试手。',
      '这份{item}{descriptors}，入炉前仍需细辨火性。',
      '这份{item}{descriptors}，已有可成器的根骨。',
      '这份{item}{descriptors}，难得一见，足可留作名品底料。',
    ],
  },
  {
    id: 'sword-appraisal',
    label: '剑器',
    resourceIds: ['treasureSword'],
    craftIds: ['longquan-sword'],
    tags: ['weapon', 'metal'],
    dimensions: {
      form: ['粗朴', '清正', '霜纹', '仙逸'],
      handling: ['坠手', '生涩', '趁手', '如臂使指'],
      sharpness: ['钝涩', '开锋', '寒光', '吹毛断发'],
      resilience: ['脆心', '可用', '百折', '刚柔并济'],
    },
    templates: [
      '此剑{descriptors}，锋意未足，仍像一块醒来的铁。',
      '此剑{descriptors}，可佩可用，已有龙泉山坊的清气。',
      '此剑{descriptors}，出鞘有寒声，足见锻打不虚。',
      '此剑{descriptors}，形神俱正，能让老剑匠多看一眼。',
    ],
  },
  {
    id: 'paper-ink-stone',
    label: '文房',
    resourceIds: ['xuanPaper', 'tibetanPaper', 'huiInk', 'inkStick', 'sheInkstone', 'duanInkstone', 'paperSheet'],
    tags: ['paper', 'ink', 'stationery', 'literati'],
    dimensions: {
      purity: ['略涩', '匀净', '润墨', '纸寿'],
      grain: ['帘纹粗', '帘纹匀', '罗纹清', '眉子细'],
      spirit: ['气弱', '有书气', '香幽', '古意存'],
    },
    templates: [
      '这件{item}{descriptors}，可供日用，尚称平稳。',
      '这件{item}{descriptors}，已能入书案。',
      '这件{item}{descriptors}，文气渐显，可赠识货人。',
      '这件{item}{descriptors}，案头一放便有清声。',
    ],
  },
  {
    id: 'textile-dye',
    label: '织染',
    resourceIds: ['indigoCloth', 'batikCloth', 'brocade', 'kesiSilk', 'shuEmbroidery', 'cantonEmbroidery', 'atlasSilk', 'carpet'],
    tags: ['textile', 'dye', 'weaving', 'brocade'],
    dimensions: {
      form: ['纹散', '纹齐', '花活', '云霞'],
      finish: ['色浅', '色正', '光润', '锦厚'],
      spirit: ['素淡', '清韵', '华明', '一幅有声'],
    },
    templates: [
      '这匹{item}{descriptors}，仍有新手气。',
      '这匹{item}{descriptors}，已够上架待客。',
      '这匹{item}{descriptors}，纹色有来路，能讲地方故事。',
      '这匹{item}{descriptors}，市上少见，宜留作样品。',
    ],
  },
  {
    id: 'lacquer-ceramic-metal',
    label: '器物',
    tags: ['lacquer', 'ceramic', 'metal', 'ornament', 'home', 'luxury'],
    dimensions: {
      form: ['形偏', '器正', '端雅', '宫气'],
      finish: ['火欠', '光藏', '釉稳', '宝光'],
      resilience: ['易损', '可用', '耐久', '传世骨'],
    },
    templates: [
      '这件{item}{descriptors}，尚需再磨一程。',
      '这件{item}{descriptors}，已能见客。',
      '这件{item}{descriptors}，手艺和用处都站得住。',
      '这件{item}{descriptors}，有压得住场面的气象。',
    ],
  },
  {
    id: 'trade-route',
    label: '商路',
    tags: ['trade', 'route'],
    dimensions: {
      merchantTrust: ['账散', '价平', '信义', '远客信'],
      spirit: ['路生', '路熟', '货稳', '人情厚'],
    },
    templates: [
      '这一趟{item}{descriptors}，先把路认清了。',
      '这一趟{item}{descriptors}，货能平安到手。',
      '这一趟{item}{descriptors}，已能给后续订单铺路。',
      '这一趟{item}{descriptors}，商路上有人开始记你的名。',
    ],
  },
  {
    id: 'generic-product',
    label: '通用成品',
    dimensions: {
      form: ['粗朴', '端正', '雅致', '成格'],
      finish: ['毛涩', '可用', '细润', '光气足'],
      spirit: ['平常', '有味', '有来历', '可传家'],
    },
    templates: [
      '这件{item}{descriptors}，是初成的手上功夫。',
      '这件{item}{descriptors}，已可交给识货人。',
      '这件{item}{descriptors}，能看出产地与手法。',
      '这件{item}{descriptors}，已有名品的影子。',
    ],
  },
];

export const ITEM_DESCRIPTOR_INDEX: Record<string, ItemDescriptorRule> = Object.fromEntries(
  ITEM_DESCRIPTOR_RULES.map((rule) => [rule.id, rule]),
);
