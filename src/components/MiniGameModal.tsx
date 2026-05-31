import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { RESOURCE_INDEX } from '../data';
import { MINIGAME_REGISTRY } from './minigames';

function resName(key: string): string {
  return RESOURCE_INDEX[key]?.name ?? key;
}

/**
 * 采料小游戏弹窗外壳：按 industry.miniGame 选用对应机制组件，
 * 拿到 quality 后展示评定并以该 quality 派发 GATHER_RESOURCE。
 */
export function MiniGameModal({
  industryId,
  onClose,
}: {
  industryId: string | null;
  onClose: () => void;
}) {
  const content = useGameStore((s) => s.content);
  const dispatch = useGameStore((s) => s.dispatch);
  const [quality, setQuality] = useState<number | null>(null);

  const industry = (content.industries ?? []).find((i) => i.id === industryId);
  if (!industryId || !industry) return null;

  const Mechanic = MINIGAME_REGISTRY[industry.miniGame];
  const inputDesc = Object.entries(industry.input)
    .map(([k, v]) => `${resName(k)}×${v}`)
    .join(' ');
  const grade = quality === null ? '' : quality >= 0.85 ? '上品' : quality >= 0.5 ? '良品' : '次品';
  const produced =
    quality === null ? 0 : Math.max(1, Math.round(industry.yield * (1 + quality)));

  const close = () => {
    setQuality(null);
    onClose();
  };
  const settle = () => {
    if (quality === null) return;
    dispatch({ type: 'GATHER_RESOURCE', industryId: industry.id, quality });
    close();
  };

  return (
    <div className="modal__backdrop" onClick={close}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal__title">{industry.name}</h3>
        <p className="modal__desc">{industry.blurb}</p>
        <p style={{ fontSize: 12, color: 'var(--indigo-soft)', marginTop: -8 }}>
          {inputDesc ? `耗：${inputDesc} · ` : '仅耗工时 · '}产出：{resName(industry.output)}
        </p>

        {quality === null ? (
          <Mechanic onResult={setQuality} />
        ) : (
          <>
            <div className="mg-result">
              手法评定：<b className={quality >= 0.5 ? 'zone-good' : 'zone-bad'}>{grade}</b>
              <span style={{ marginLeft: 12 }}>
                预计产出 {resName(industry.output)}×{produced}
              </span>
            </div>
            <div className="btn-row">
              <button className="btn btn--bamboo" onClick={settle}>
                收下成果
              </button>
              <button className="btn btn--ghost" onClick={close}>
                离开
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
