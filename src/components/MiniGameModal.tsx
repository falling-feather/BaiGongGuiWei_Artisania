import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { RESOURCE_INDEX } from '../data';
import type { MiniGameType } from '../engine';

/** 不同小游戏类型的文案皮肤（机制统一为「时机命中」，以皮肤区分手感） */
const SKIN: Record<MiniGameType, { verb: string; tip: string }> = {
  rhythm: { verb: '落锤', tip: '在节拍点落锤，越准越好' },
  drag_path: { verb: '运笔', tip: '笔锋走到正中再收手' },
  ratio_mix: { verb: '入料', tip: '比例对准中线再倾倒' },
  timing_hold: { verb: '起锅', tip: '火候到位的一瞬起锅' },
  aim_place: { verb: '落位', tip: '对准靶心再落手' },
  repeat_endure: { verb: '收工', tip: '稳住节奏，正中收工' },
};

function resName(key: string): string {
  return RESOURCE_INDEX[key]?.name ?? key;
}

/**
 * 采料小游戏弹窗：一个左右往复的指针，玩家在中线附近「出手」，
 * 命中越准 quality 越高，最终以该 quality 派发 GATHER_RESOURCE。
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

  const [pos, setPos] = useState(0); // 0..100 指针位置
  const [quality, setQuality] = useState<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const dirRef = useRef(1);
  const posRef = useRef(0);

  const industry = (content.industries ?? []).find((i) => i.id === industryId);

  // 指针往复运动
  useEffect(() => {
    if (!industryId || quality !== null) return;
    let last = performance.now();
    const speed = 80; // 单位/秒
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      let p = posRef.current + dirRef.current * speed * dt;
      if (p >= 100) {
        p = 100;
        dirRef.current = -1;
      } else if (p <= 0) {
        p = 0;
        dirRef.current = 1;
      }
      posRef.current = p;
      setPos(p);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [industryId, quality]);

  // 切换产业时重置
  useEffect(() => {
    setQuality(null);
    setPos(0);
    posRef.current = 0;
    dirRef.current = 1;
  }, [industryId]);

  if (!industryId || !industry) return null;

  const skin = SKIN[industry.miniGame];
  const inputDesc = Object.entries(industry.input)
    .map(([k, v]) => `${resName(k)}×${v}`)
    .join(' ');

  const strike = () => {
    const dist = Math.abs(posRef.current - 50) / 50; // 0(正中)..1(边缘)
    const q = Math.max(0, 1 - dist);
    setQuality(q);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  };

  const settle = () => {
    if (quality === null) return;
    dispatch({ type: 'GATHER_RESOURCE', industryId: industry.id, quality });
    onClose();
  };

  const grade = quality === null ? '' : quality >= 0.85 ? '上品' : quality >= 0.5 ? '良品' : '次品';
  const produced =
    quality === null ? 0 : Math.max(1, Math.round(industry.yield * (1 + quality)));

  return (
    <div className="modal__backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal__title">{industry.name}</h3>
        <p className="modal__desc">{industry.blurb}</p>
        <p style={{ fontSize: 12, color: 'var(--indigo-soft)', marginTop: -8 }}>
          {inputDesc ? `耗：${inputDesc} · ` : '仅耗工时 · '}产出：{resName(industry.output)}
        </p>

        <div className="mg-track">
          <div className="mg-target" />
          <div className="mg-needle" style={{ left: `${pos}%` }} />
        </div>
        <p className="mg-tip">{skin.tip}</p>

        {quality === null ? (
          <div className="btn-row">
            <button className="btn btn--bamboo" onClick={strike}>
              {skin.verb}
            </button>
            <button className="btn btn--ghost" onClick={onClose}>
              放弃
            </button>
          </div>
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
              <button className="btn btn--ghost" onClick={onClose}>
                离开
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
