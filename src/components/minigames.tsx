/**
 * 六种基础产业小游戏机制（对应 MiniGameType），输入模态各不相同。
 * 每个组件统一约定：内部完成一次交互后调用 onResult(quality:0..1)。
 * 由 MiniGameModal 按 industry.miniGame 选用对应组件。
 */
import { useEffect, useRef, useState } from 'react';
import type { MiniGameType } from '../engine';

export interface MiniGameProps {
  /** 完成一次操作，回传品质 0..1 */
  onResult: (quality: number) => void;
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/** rhythm · 节奏落锤：指针往复，连击 3 次取平均命中度 */
function RhythmGame({ onResult }: MiniGameProps) {
  const NEEDED = 3;
  const [pos, setPos] = useState(0);
  const [hits, setHits] = useState<number[]>([]);
  const posRef = useRef(0);
  const dirRef = useRef(1);
  const rafRef = useRef<number | null>(null);
  const doneRef = useRef(false);

  useEffect(() => {
    let last = performance.now();
    const speed = 110;
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      let p = posRef.current + dirRef.current * speed * dt;
      if (p >= 100) ((p = 100), (dirRef.current = -1));
      else if (p <= 0) ((p = 0), (dirRef.current = 1));
      posRef.current = p;
      setPos(p);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const tap = () => {
    if (doneRef.current) return;
    const acc = clamp01(1 - Math.abs(posRef.current - 50) / 50);
    const next = [...hits, acc];
    setHits(next);
    if (next.length >= NEEDED) {
      doneRef.current = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      onResult(next.reduce((a, b) => a + b, 0) / next.length);
    }
  };

  return (
    <div>
      <div className="mg-track">
        <div className="mg-target" />
        <div className="mg-needle" style={{ left: `${pos}%` }} />
      </div>
      <p className="mg-tip">节拍掠过中线时落锤 · 还需 {NEEDED - hits.length} 锤</p>
      <button className="btn btn--bamboo" onClick={tap}>
        落锤
      </button>
    </div>
  );
}

/** timing_hold · 火候时机：长按蓄势，火候涨到目标区放手 */
function TimingHoldGame({ onResult }: MiniGameProps) {
  const [val, setVal] = useState(0);
  const valRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const holdingRef = useRef(false);
  // 目标火候区 [65,85]，中心 75
  const start = () => {
    if (holdingRef.current) return;
    holdingRef.current = true;
    let last = performance.now();
    const speed = 70;
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      const v = Math.min(100, valRef.current + speed * dt);
      valRef.current = v;
      setVal(v);
      if (v >= 100) {
        release();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  };
  const release = () => {
    if (!holdingRef.current) return;
    holdingRef.current = false;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const q = clamp01(1 - Math.abs(valRef.current - 75) / 35);
    onResult(q);
  };

  return (
    <div>
      <div className="mg-gauge">
        <div className="mg-gauge__band" />
        <div className="mg-gauge__fill" style={{ width: `${val}%` }} />
      </div>
      <p className="mg-tip">按住蓄火，火候升到绿区松手（升满即焦）</p>
      <button
        className="btn btn--bamboo"
        onMouseDown={start}
        onMouseUp={release}
        onMouseLeave={release}
        onTouchStart={start}
        onTouchEnd={release}
      >
        按住控火
      </button>
    </div>
  );
}

/** aim_place · 定位摆放：靶心随机出现，点得越准越好 */
function AimPlaceGame({ onResult }: MiniGameProps) {
  const W = 260;
  const H = 150;
  const R = 16;
  const [target] = useState(() => ({
    x: R + Math.random() * (W - 2 * R),
    y: R + Math.random() * (H - 2 * R),
  }));
  const maxDist = Math.hypot(W, H) / 2;
  const onClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const d = Math.hypot(cx - target.x, cy - target.y);
    onResult(clamp01(1 - d / maxDist));
  };
  return (
    <div>
      <div className="mg-aim" style={{ width: W, height: H }} onClick={onClick}>
        <div
          className="mg-aim__target"
          style={{ left: target.x, top: target.y, width: R * 2, height: R * 2 }}
        />
      </div>
      <p className="mg-tip">对准靶心落手（掐丝 / 镶嵌 / 扎结）</p>
    </div>
  );
}

/** ratio_mix · 配比调和：调滑杆逼近目标配比 */
function RatioMixGame({ onResult }: MiniGameProps) {
  const [target] = useState(() => 25 + Math.round(Math.random() * 50));
  const [val, setVal] = useState(50);
  return (
    <div>
      <div className="mg-ratio">
        <div className="mg-ratio__target" style={{ left: `${target}%` }} />
        <input
          type="range"
          min={0}
          max={100}
          value={val}
          onChange={(e) => setVal(Number(e.target.value))}
          className="mg-ratio__slider"
        />
      </div>
      <p className="mg-tip">滑到目标配比刻度（染液 / 釉料 / 配色）</p>
      <button
        className="btn btn--bamboo"
        onClick={() => onResult(clamp01(1 - Math.abs(val - target) / 50))}
      >
        倾倒入料
      </button>
    </div>
  );
}

/** drag_path · 描线运笔：目标缓慢漂移，拖动笔锋贴住后收手 */
function DragPathGame({ onResult }: MiniGameProps) {
  const [target, setTarget] = useState(50);
  const [val, setVal] = useState(0);
  const tRef = useRef(0);
  useEffect(() => {
    let raf = 0;
    const tick = (now: number) => {
      tRef.current = now / 1000;
      setTarget(50 + 30 * Math.sin(tRef.current * 1.3));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div>
      <div className="mg-ratio">
        <div className="mg-ratio__target" style={{ left: `${target}%` }} />
        <input
          type="range"
          min={0}
          max={100}
          value={val}
          onChange={(e) => setVal(Number(e.target.value))}
          className="mg-ratio__slider"
        />
      </div>
      <p className="mg-tip">笔锋跟住漂移的标线，对齐时收手</p>
      <button
        className="btn btn--bamboo"
        onClick={() => onResult(clamp01(1 - Math.abs(val - target) / 40))}
      >
        收手
      </button>
    </div>
  );
}

/** repeat_endure · 重复耐心：稳定节奏连点，过快过慢都失准 */
function RepeatEndureGame({ onResult }: MiniGameProps) {
  const DURATION = 3000;
  const TARGET = 9; // 目标点击数（稳住节奏）
  const [count, setCount] = useState(0);
  const [left, setLeft] = useState(DURATION);
  const startRef = useRef<number | null>(null);
  const doneRef = useRef(false);

  useEffect(() => {
    let raf = 0;
    const tick = (now: number) => {
      if (startRef.current === null) startRef.current = now;
      const elapsed = now - startRef.current;
      const rem = Math.max(0, DURATION - elapsed);
      setLeft(rem);
      if (rem <= 0) {
        if (!doneRef.current) {
          doneRef.current = true;
          setCount((c) => {
            onResult(clamp01(1 - Math.abs(c - TARGET) / TARGET));
            return c;
          });
        }
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [onResult]);

  return (
    <div>
      <div className="mg-gauge">
        <div className="mg-gauge__fill" style={{ width: `${(left / DURATION) * 100}%` }} />
      </div>
      <p className="mg-tip">
        匀速捞 {TARGET} 下最佳 · 已 {count} 下 · 剩 {(left / 1000).toFixed(1)}s
      </p>
      <button className="btn btn--bamboo" disabled={doneRef.current} onClick={() => setCount((c) => c + 1)}>
        起帘
      </button>
    </div>
  );
}

/** 机制注册表：MiniGameType → 组件 */
export const MINIGAME_REGISTRY: Record<MiniGameType, (p: MiniGameProps) => JSX.Element> = {
  rhythm: RhythmGame,
  timing_hold: TimingHoldGame,
  aim_place: AimPlaceGame,
  ratio_mix: RatioMixGame,
  drag_path: DragPathGame,
  repeat_endure: RepeatEndureGame,
};
