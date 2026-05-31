/** 主菜单 / 开局页：标题幕布 + 开始/继续入口。 */
export function MainMenu({
  hasSave,
  onNew,
  onContinue,
}: {
  hasSave: boolean;
  onNew: () => void;
  onContinue: () => void;
}) {
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
        <div className="menu__actions">
          <button className="btn btn--bamboo menu__btn" onClick={onNew}>
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
