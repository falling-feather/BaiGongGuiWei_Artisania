import { useState } from 'react';

interface Step {
  title: string;
  body: string;
}

const STEPS: Step[] = [
  {
    title: '欢迎来到百工镇',
    body: '你将经营一座非遗百工小镇：行脚九州、采料开工、在市场与传承间权衡取舍。',
  },
  {
    title: '走动与交互',
    body: '用 WASD 或方向键在街上走动；靠近发光的体验点（手艺铺、产业、牌坊）按 E 进入。',
  },
  {
    title: '九州大地图',
    body: '点顶部「大地图」查看全国路线总览。真正迁移要回到场景，靠近出入口牌坊或商路节点按 E 开通、前往。',
  },
  {
    title: '采料与背包',
    body: '在产业点或「镇务行脚」里采集原料，做工的手感（小游戏）决定品质。成果都收进「背包」。',
  },
  {
    title: '成就与季节',
    body: '完成里程碑会解锁「成就」。每季工时有限，点「结束本季」推进时令，留意四维平衡，别让任何一维跌到谷底。',
  },
];

/** 新手引导：分步卡片，首次开新局时弹出，可随时跳过。 */
export function Tutorial({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep] = useState(0);
  if (!open) return null;

  const isLast = step === STEPS.length - 1;
  const cur = STEPS[step];
  const finish = () => {
    setStep(0);
    onClose();
  };

  return (
    <div className="modal__backdrop">
      <div className="modal tut" onClick={(e) => e.stopPropagation()}>
        <div className="tut__progress">
          {STEPS.map((_, i) => (
            <span key={i} className={i === step ? 'tut__dot tut__dot--on' : 'tut__dot'} />
          ))}
        </div>
        <h3 className="modal__title">{cur.title}</h3>
        <p className="tut__body">{cur.body}</p>
        <div className="btn-row tut__row">
          <button className="btn btn--ghost" onClick={finish}>
            跳过引导
          </button>
          <div className="tut__nav">
            {step > 0 && (
              <button className="btn" onClick={() => setStep((s) => s - 1)}>
                上一步
              </button>
            )}
            {isLast ? (
              <button className="btn btn--bamboo" onClick={finish}>
                开始游玩
              </button>
            ) : (
              <button className="btn btn--bamboo" onClick={() => setStep((s) => s + 1)}>
                下一步
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
