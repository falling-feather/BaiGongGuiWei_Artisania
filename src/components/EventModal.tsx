import { useGameStore } from '../store/gameStore';

/** 随机事件抉择弹窗：有待处理事件时强制玩家选择 */
export function EventModal() {
  const event = useGameStore((s) => s.state.pendingEvent);
  const dispatch = useGameStore((s) => s.dispatch);
  if (!event) return null;

  return (
    <div className="modal__backdrop">
      <div className="modal">
        <h3 className="modal__title">{event.title}</h3>
        <p className="modal__desc">{event.description}</p>
        <div className="modal__choices">
          {event.choices.map((choice) => (
            <button
              key={choice.id}
              className="btn"
              onClick={() => dispatch({ type: 'RESOLVE_EVENT', choiceId: choice.id })}
            >
              {choice.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
