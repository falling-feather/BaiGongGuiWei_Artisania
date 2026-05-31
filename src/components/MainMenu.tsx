/** 主菜单 / 开局页：标题幕布 + 命名 + 开始/继续入口。 */
import { useState } from 'react';
import { DEV_NAME } from '../engine';

export function MainMenu({
  hasSave,
  onNew,
  onContinue,
}: {
  hasSave: boolean;
  onNew: (playerName: string) => void;
  onContinue: () => void;
}) {
  const [name, setName] = useState('');
  const isDev = name.trim().toLowerCase() === DEV_NAME;

  function start() {
    onNew(name.trim());
  }

  return (
    <div className="menu">
      <div className="menu__panel">
        <div className="menu__seal">百工</div>
        <h1 className="menu__title">百工归位</h1>
        <p className="menu__subtitle">Artisania · 一座非遗百工镇的经营手记</p>
        <p className="menu__blurb">
          行脚九州，打通商路，采料、开工、守艺。<br />
          在市场与传承之间，写下属于你的一种回答。
        </p>
        <div className="menu__field">
          <label className="menu__label" htmlFor="player-name">
            为自己取一个名号
          </label>
          <input
            id="player-name"
            className="menu__input"
            type="text"
            value={name}
            maxLength={16}
            placeholder="无名匠人"
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') start();
            }}
          />
          {isDev && <p className="menu__dev-hint">★ 开发者印记已识别——资源无虞，全境通行</p>}
        </div>
        <div className="menu__actions">
          <button className="btn btn--bamboo menu__btn" onClick={start}>
            开启新局
          </button>
          <button
            className="btn menu__btn"
            disabled={!hasSave}
            onClick={onContinue}
            title={hasSave ? '' : '暂无存档'}
          >
            继续上局
          </button>
        </div>
        <p className="menu__hint">WASD / 方向键 移动 · E 进入体验点</p>
      </div>
    </div>
  );
}
