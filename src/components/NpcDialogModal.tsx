import { useGameStore } from '../store/gameStore';
import { NPC_INDEX, RESOURCE_INDEX, questsForNpc } from '../data';
import type { ItemInstance, NpcGiftPreference } from '../engine';

const ITEM_STATUS_LABEL = {
  held: '持有',
  displayed: '陈列',
  gifted: '已赠',
} as const;

const STAGE_LABEL = {
  stranger: '初识',
  familiar: '熟络',
  trusted: '信任',
  confidant: '知己',
} as const;

const FUNCTION_LABEL = {
  mentor: '授艺',
  quest: '委托',
  route: '路线',
  order: '订单',
  collab: '联作',
  appraisal: '鉴评',
  homeVisit: '来访',
} as const;

function preferenceMatches(
  preference: NpcGiftPreference,
  item: ItemInstance,
): boolean {
  if (preference.minQuality !== undefined && item.quality < preference.minQuality) return false;
  if (preference.resourceIds && !preference.resourceIds.includes(item.resourceId)) return false;
  if (preference.craftIds && (!item.sourceCraftId || !preference.craftIds.includes(item.sourceCraftId))) return false;
  if (preference.originRegionIds && !preference.originRegionIds.includes(item.originRegionId)) return false;
  if (
    preference.descriptorIncludes &&
    !preference.descriptorIncludes.some((word) =>
      item.descriptors.some((descriptor) => descriptor.includes(word)) ||
      item.appraisal.includes(word) ||
      item.inscription?.includes(word),
    )
  ) {
    return false;
  }
  return true;
}

/**
 * NPC 对话面板：玩家在街上靠近 NPC 按 E 后弹出。
 * - 攀谈：提升好感度（TALK_NPC）；
 * - 任务：展示该 NPC 发布的任务，满足好感门槛+条件可交付（COMPLETE_QUEST）。
 */
export function NpcDialogModal({ npcId, onClose }: { npcId: string | null; onClose: () => void }) {
  const dispatch = useGameStore((s) => s.dispatch);
  const affinityMap = useGameStore((s) => s.state.npcAffinity);
  const npcStates = useGameStore((s) => s.state.npcStates);
  const completed = useGameStore((s) => s.state.completedQuests);
  const state = useGameStore((s) => s.state);

  if (!npcId) return null;
  const npc = NPC_INDEX[npcId];
  if (!npc) return null;

  const affinity = affinityMap[npcId] ?? 0;
  const runtime = npcStates[npcId];
  const quests = questsForNpc(npcId);
  const stage = runtime?.stage ?? 'stranger';
  const greeting = npc.relationshipLines?.[stage]?.[0] ?? npc.greetings[0] ?? '……';
  const giftCandidates = state.itemInstances
    .filter((item) => item.status !== 'gifted' && (state.resources[item.resourceId] ?? 0) > 0)
    .slice(0, 3);
  const functions = npc.functions ?? [];
  const preferences = npc.preferences ?? [];
  const visibleIntel = npc.intel ?? [];
  const revealedIntel = new Set(runtime?.revealedIntelIds ?? []);
  const bestPreferenceFor = (item: (typeof giftCandidates)[number]) =>
    preferences
      .filter((preference) => preferenceMatches(preference, item))
      .sort((a, b) => b.affinityBonus - a.affinityBonus)[0] ?? null;

  return (
    <div className="modal__backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal__title">
          {npc.name}{' '}
          <small style={{ fontSize: 12, color: 'var(--indigo-soft)' }}>
            {npc.profession ?? (npc.role === 'vendor' ? '关联人物' : '游客')}
          </small>
        </h3>
        <p className="modal__desc">“{greeting}”</p>
        <div className="npc-profile-strip">
          <span>关系：{STAGE_LABEL[stage]}</span>
          <span>交谈：{runtime?.talks ?? 0} 次</span>
          {npc.personality && <span>性格：{npc.personality}</span>}
        </div>

        <div className="npc-affinity">
          <span className="npc-affinity__label">好感度</span>
          <div className="npc-affinity__bar">
            <div className="npc-affinity__fill" style={{ width: `${affinity}%` }} />
          </div>
          <span className="npc-affinity__num">{affinity}/100</span>
        </div>

        {(functions.length > 0 || preferences.length > 0 || npc.personalDilemma) && (
          <div className="npc-quests npc-profile-card">
            <h4 className="npc-quests__title">人物线</h4>
            {functions.length > 0 && (
              <div className="npc-tag-row">
                {functions.map((fn) => (
                  <span className="npc-tag" key={fn}>{FUNCTION_LABEL[fn]}</span>
                ))}
              </div>
            )}
            {npc.personalDilemma && <p className="npc-quest__desc">{npc.personalDilemma}</p>}
            {preferences.length > 0 && (
              <p className="npc-quest__req">
                偏好：{preferences.map((preference) => preference.label).join(' / ')}
              </p>
            )}
          </div>
        )}

        {visibleIntel.length > 0 && (
          <div className="npc-quests npc-intel">
            <h4 className="npc-quests__title">地方见闻</h4>
            {visibleIntel.map((intel) => {
              const unlocked = revealedIntel.has(intel.id) || affinity >= intel.unlockAffinity;
              return (
                <div className={`npc-quest ${unlocked ? '' : 'npc-quest--locked'}`} key={intel.id}>
                  <div className="npc-quest__head">
                    <span className="npc-quest__name">{unlocked ? intel.title : '未熟络的线索'}</span>
                    <span className="npc-quest__done">好感 {intel.unlockAffinity}</span>
                  </div>
                  <p className="npc-quest__desc">
                    {unlocked ? intel.body : '继续攀谈、赠予合适作品后，他/她才会细说。'}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {quests.length > 0 && (
          <div className="npc-quests">
            <h4 className="npc-quests__title">委托</h4>
            {quests.map((q) => {
              const done = completed.includes(q.id);
              const affinityOk = affinity >= q.requireAffinity;
              const condOk = q.condition(state);
              const canDeliver = !done && affinityOk && condOk;
              return (
                <div className="npc-quest" key={q.id}>
                  <div className="npc-quest__head">
                    <span className="npc-quest__name">{q.title}</span>
                    {done && <span className="npc-quest__done">已完成</span>}
                  </div>
                  <p className="npc-quest__desc">{q.desc}</p>
                  <div className="npc-quest__foot">
                    <span className="npc-quest__req">
                      需好感 {q.requireAffinity}
                      {q.reward.coin ? ` · 赏 ${q.reward.coin} 文` : ''}
                    </span>
                    {!done && (
                      <button
                        className="btn btn--bamboo btn--sm"
                        disabled={!canDeliver}
                        title={
                          !affinityOk
                            ? `好感不足（${affinity}/${q.requireAffinity}）`
                            : !condOk
                              ? '交付条件尚未达成'
                              : '交付领赏'
                        }
                        onClick={() => dispatch({ type: 'COMPLETE_QUEST', questId: q.id })}
                      >
                        交付
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {giftCandidates.length > 0 && (
          <div className="npc-quests npc-gifts">
            <h4 className="npc-quests__title">赠礼</h4>
            {giftCandidates.map((item) => {
              const preference = bestPreferenceFor(item);
              return (
                <div className="npc-quest" key={item.id}>
                  <div className="npc-quest__head">
                    <span className="npc-quest__name">
                      {item.displayName ?? RESOURCE_INDEX[item.resourceId]?.name ?? item.resourceId}
                    </span>
                    <span className="npc-quest__done">{preference?.label ?? ITEM_STATUS_LABEL[item.status ?? 'held']}</span>
                  </div>
                  <p className="npc-quest__desc">
                    品相 {Math.round(item.quality * 100)}
                    {item.inscription ? ` · 题跋：${item.inscription}` : ` · ${item.appraisal}`}
                  </p>
                  <div className="npc-quest__foot">
                    <span className="npc-quest__req">
                      {RESOURCE_INDEX[item.resourceId]?.name ?? item.resourceId}
                      {item.authorName ? ` · 作者 ${item.authorName}` : ''}
                    </span>
                    <button
                      className="btn btn--bamboo btn--sm"
                      onClick={() => dispatch({ type: 'GIFT_ITEM', itemId: item.id, npcId })}
                    >
                      赠予
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="btn-row">
          <button
            className="btn btn--bamboo"
            disabled={affinity >= 100}
            onClick={() => dispatch({ type: 'TALK_NPC', npcId })}
          >
            攀谈{affinity >= 100 ? '（已至交）' : ' +好感'}
          </button>
          <button className="btn btn--ghost" onClick={onClose}>
            告辞
          </button>
        </div>
      </div>
    </div>
  );
}
