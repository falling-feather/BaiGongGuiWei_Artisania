import { useGameStore } from '../store/gameStore';

/**
 * 全局设置面板：Esc 或左上角齿轮按钮唤出。
 * 目前提供「返回主页」（回到主菜单，存档已自动保留，可在主菜单续局）。
 */
export function SettingsModal({
  open,
  onClose,
  onReturnHome,
}: {
  open: boolean;
  onClose: () => void;
  onReturnHome: () => void;
}) {
  const playerName = useGameStore((s) => s.state.playerName);
  if (!open) return null;

  return (
    <div className="modal__backdrop" onClick={onClose}>
      <div className="modal modal--settings" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal__title">设置</h2>
        <p className="modal__desc">
          当前匠人：{playerName || '无名匠人'}
          <br />
          进度会自动留存，返回主页后可在主菜单「继续游历」续局。
        </p>
        <div className="modal__choices">
          <button className="btn" onClick={onClose}>
            继续游历
          </button>
          <button className="btn btn--ghost" onClick={onReturnHome}>
            返回主页
          </button>
        </div>
        <p className="settings__hint">
          快捷键：Esc 开关设置 · WASD/方向键 移动 · E 交互 · +/- 或 Shift+滚轮 缩放
        </p>
      </div>
    </div>
  );
}
