import { useGameStore } from '../store/gameStore';
import { ACHIEVEMENTS } from '../data';

/** 成就册：展示全部成就及解锁进度。 */
export function AchievementsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const achievements = useGameStore((s) => s.state.achievements);
  if (!open) return null;

  const unlocked = new Set(achievements);
  const done = ACHIEVEMENTS.filter((a) => unlocked.has(a.id)).length;

  return (
    <div className="modal__backdrop" onClick={onClose}>
      <div className="modal modal--wide" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal__title">成就册</h3>
        <p className="modal__desc">
          已解锁 {done} / {ACHIEVEMENTS.length}
        </p>
        <div className="ach-list">
          {ACHIEVEMENTS.map((a) => {
            const got = unlocked.has(a.id);
            return (
              <div className={got ? 'ach-item ach-item--got' : 'ach-item'} key={a.id}>
                <span className="ach-item__icon">{got ? '★' : '☆'}</span>
                <span className="ach-item__text">
                  <b className="ach-item__name">{got ? a.name : '？？？'}</b>
                  <span className="ach-item__desc">{a.desc}</span>
                </span>
              </div>
            );
          })}
        </div>
        <div className="btn-row">
          <button className="btn btn--ghost" onClick={onClose}>关闭</button>
        </div>
      </div>
    </div>
  );
}
