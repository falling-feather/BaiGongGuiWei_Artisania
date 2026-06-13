import { useGameStore } from '../store/gameStore';
import { nextStoryBeat } from '../engine';
import { renderStoryLine } from '../data';

/**
 * 剧情叙事弹窗：呈现「当前应当出现的下一个剧情节点」。
 * 节点由状态条件触发、只出现一次；点击「继续」后标记已读，自动接续下一节点（若有）。
 */
export function StoryModal() {
  const state = useGameStore((s) => s.state);
  const content = useGameStore((s) => s.content);
  const dispatch = useGameStore((s) => s.dispatch);

  const beat = nextStoryBeat(state, content);
  if (!beat) return null;
  // 有待处理的随机事件时，先让位给事件抉择
  if (
    state.pendingEvent ||
    state.pendingEscortCrisis ||
    state.pendingSupplyCrisis ||
    state.pendingActivityStallClosing
  ) return null;

  return (
    <div className="modal__backdrop">
      <div className="modal story">
        <h3 className="modal__title story__title">{beat.title}</h3>
        <div className="story__body">
          {beat.lines.map((line, i) => (
            <p key={i} className="story__line">
              {renderStoryLine(line, state.playerName)}
            </p>
          ))}
        </div>
        <div className="modal__choices">
          {beat.choices && beat.choices.length > 0 ? (
            beat.choices.map((choice) => (
              <button
                key={choice.id}
                className="btn"
                onClick={() =>
                  dispatch({ type: 'SEEN_STORY', storyId: beat.id, choiceId: choice.id })
                }
              >
                {choice.label}
              </button>
            ))
          ) : (
            <button
              className="btn btn--bamboo"
              onClick={() => dispatch({ type: 'SEEN_STORY', storyId: beat.id })}
            >
              继续
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
