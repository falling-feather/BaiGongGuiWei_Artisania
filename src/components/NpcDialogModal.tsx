import { useGameStore } from '../store/gameStore';
import { NPC_INDEX, questsForNpc } from '../data';

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
  const greeting = npc.greetings[0] ?? '……';

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
          <span>关系：{runtime?.stage ?? 'stranger'}</span>
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
