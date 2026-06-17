/** 主菜单 / 开局页：封面图 + 多存档入口。 */
import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { DEV_NAME } from '../engine';
import { REGION_INDEX } from '../data';
import type { SaveSlotSummary } from '../storage/StorageAdapter';

const MAX_SAVE_SLOTS = 5;

const MENU_COVERS = [
  {
    src: '/assets/game/ui/cover_jiangnan_dawn_v02.png',
    position: 'center center',
  },
  {
    src: '/assets/game/ui/cover_xueyu_mountain_v01.png',
    position: 'center center',
  },
  {
    src: '/assets/game/ui/cover_jiangnan_riverfront_v01.png',
    position: 'center center',
  },
  {
    src: '/assets/game/ui/cover_jiangnan_cinematic_v01.png',
    position: '65% center',
  },
];

function formatSaveTime(value: number) {
  if (!value) return '未知时间';
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(value);
}

function createMenuSlotId() {
  return `slot-${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 6)}`;
}

export function MainMenu({
  saveSlots,
  activeSaveSlotId,
  onNew,
  onContinue,
  onDeleteSave,
}: {
  saveSlots: SaveSlotSummary[];
  activeSaveSlotId: string | null;
  onNew: (playerName: string, slotId?: string) => void | Promise<void>;
  onContinue: (slotId?: string) => void | Promise<void>;
  onDeleteSave: (slotId: string) => void | Promise<void>;
}) {
  const [name, setName] = useState('');
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(activeSaveSlotId ?? saveSlots[0]?.slotId ?? null);
  const [phase, setPhase] = useState<'splash' | 'menu'>('splash');
  const [menuMode, setMenuMode] = useState<'home' | 'new' | 'saves'>(saveSlots.length > 0 ? 'home' : 'new');
  const isDev = name.trim().toLowerCase() === DEV_NAME;
  const [coverIndex, setCoverIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const selectedSlot = useMemo(
    () => saveSlots.find((slot) => slot.slotId === selectedSlotId) ?? null,
    [saveSlots, selectedSlotId],
  );
  const canCreateSlot = saveSlots.length < MAX_SAVE_SLOTS;
  const [parallax, setParallax] = useState({ x: 0, y: 0 });

  const menuStyle = {
    '--menu-pan-x': `${parallax.x}px`,
    '--menu-pan-y': `${parallax.y}px`,
    '--menu-cover-x': `${-parallax.x}px`,
    '--menu-cover-y': `${-parallax.y * 0.65}px`,
    '--menu-depth-x': `${parallax.x * 0.5}px`,
    '--menu-depth-y': `${parallax.y * 0.35}px`,
  } as CSSProperties;

  function locationLabel(slot: SaveSlotSummary) {
    const region = REGION_INDEX[slot.currentRegion];
    const subregion = region?.subregions.find((item) => item.id === slot.currentSubregion);
    return `${region?.name ?? slot.currentRegion} / ${subregion?.name ?? slot.currentSubregion}`;
  }

  useEffect(() => {
    if (selectedSlotId && saveSlots.some((slot) => slot.slotId === selectedSlotId)) return;
    setSelectedSlotId(activeSaveSlotId ?? saveSlots[0]?.slotId ?? null);
  }, [activeSaveSlotId, saveSlots, selectedSlotId]);

  useEffect(() => {
    if (phase === 'menu' && saveSlots.length === 0) setMenuMode('new');
  }, [phase, saveSlots.length]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCoverIndex((current) => (current + 1) % MENU_COVERS.length);
    }, 9000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const root = menuRef.current;
    if (!root || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    let frame = 0;
    const startedAt = window.performance.now();

    const tick = (now: number) => {
      const seconds = (now - startedAt) / 1000;
      root.style.setProperty('--menu-scene-x', `${Math.sin(seconds * 0.11) * 8}px`);
      root.style.setProperty('--menu-scene-y', `${Math.cos(seconds * 0.08) * 4}px`);
      root.style.setProperty('--menu-cover-scale', `${1.038 + Math.sin(seconds * 0.07) * 0.006}`);
      root.style.setProperty('--menu-water-x', `${Math.sin(seconds * 0.42) * 10}px`);
      root.style.setProperty('--menu-water-y', `${Math.cos(seconds * 0.36) * 5}px`);
      frame = window.requestAnimationFrame(tick);
    };

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, []);

  function revealMenu() {
    setPhase('menu');
    setMenuMode(saveSlots.length > 0 ? 'home' : 'new');
  }

  function startNew(overwrite = false) {
    const targetSlotId = overwrite ? selectedSlotId ?? undefined : createMenuSlotId();
    if (overwrite && targetSlotId && selectedSlot && !window.confirm(`覆盖「${selectedSlot.name}」并开启新局？`)) return;
    void onNew(name.trim(), targetSlotId);
  }

  function removeSelected() {
    if (!selectedSlot) return;
    if (!window.confirm(`删除「${selectedSlot.name}」？此操作无法撤销。`)) return;
    void onDeleteSave(selectedSlot.slotId);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width - 0.5) * 18;
    const y = ((event.clientY - rect.top) / rect.height - 0.5) * 12;
    setParallax({ x, y });
  }

  return (
    <div
      ref={menuRef}
      className={`menu ${phase === 'splash' ? 'is-splash' : 'is-menu'}`}
      style={menuStyle}
      onPointerMove={handlePointerMove}
      onPointerLeave={() => setParallax({ x: 0, y: 0 })}
      onKeyDown={(event) => {
        if (phase !== 'splash') return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          revealMenu();
        }
      }}
      tabIndex={0}
    >
      <div className="menu__cover-stack" aria-hidden="true">
        {MENU_COVERS.map((cover, index) => (
          <div
            key={cover.src}
            className={`menu__cover ${index === coverIndex ? 'is-active' : ''}`}
            style={{
              backgroundImage: `url('${cover.src}')`,
              backgroundPosition: cover.position,
            }}
          />
        ))}
      </div>
      <div className="menu__cover-focus" aria-hidden="true" />
      <div className="menu__mist menu__mist--far" aria-hidden="true" />
      <div className="menu__mist menu__mist--near" aria-hidden="true" />
      <div className="menu__rain-layer" aria-hidden="true" />
      <div className="menu__waterlight" aria-hidden="true" />
      <div className="menu__embers" aria-hidden="true" />
      <div className="menu__scrim" />
      {phase === 'splash' ? (
        <button className="menu__splash" type="button" onClick={revealMenu} aria-label="点击以开始游戏">
          <span className="menu__splash-title" aria-hidden="true">
            <span className="menu__splash-kicker">ARTISANIA</span>
            <strong>百工归位</strong>
            <span className="menu__splash-subtitle">非遗百工镇经营手记</span>
          </span>
          <span className="menu__splash-prompt">点击以开始游戏</span>
        </button>
      ) : (
        <main className="menu__dock">
          <header className="menu__dock-head">
            <span className="menu__seal">百工</span>
            <div>
              <h1 className="menu__title">百工归位</h1>
              <p className="menu__subtitle">Artisania · 非遗百工镇经营手记</p>
            </div>
          </header>

          <nav className="menu__modebar" aria-label="主菜单">
            <button className={menuMode === 'home' ? 'is-active' : ''} type="button" onClick={() => setMenuMode('home')}>
              旅程
            </button>
            <button className={menuMode === 'new' ? 'is-active' : ''} type="button" onClick={() => setMenuMode('new')}>
              新局
            </button>
            <button className={menuMode === 'saves' ? 'is-active' : ''} type="button" onClick={() => setMenuMode('saves')}>
              存档
            </button>
          </nav>

          {menuMode === 'home' && (
            <section className="menu__view" aria-label="旅程入口">
              {selectedSlot ? (
                <button className="menu__featured-save" type="button" onClick={() => void onContinue(selectedSlot.slotId)}>
                  <span>继续旅程</span>
                  <b>{selectedSlot.name}</b>
                  <small>
                    {locationLabel(selectedSlot)} · 第 {selectedSlot.turn} 季 · {formatSaveTime(selectedSlot.savedAt)}
                  </small>
                </button>
              ) : (
                <p className="menu__quiet-note">还没有存档。取个名号，从江南第一条街巷开始。</p>
              )}
              <div className="menu__compact-actions">
                <button className="menu__ink-btn menu__ink-btn--primary" type="button" onClick={() => setMenuMode('new')}>
                  新开一局
                </button>
                <button className="menu__ink-btn" type="button" onClick={() => setMenuMode('saves')}>
                  管理存档
                </button>
              </div>
            </section>
          )}

          {menuMode === 'new' && (
            <section className="menu__view" aria-label="新开一局">
              <label className="menu__label" htmlFor="player-name">
                新局名号
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
                  if (e.key === 'Enter' && canCreateSlot) startNew(false);
                }}
              />
              {isDev && <p className="menu__dev-hint">开发者印记已识别：资源无虞，全境通行。</p>}
              <button className="menu__ink-btn menu__ink-btn--primary menu__wide-btn" disabled={!canCreateSlot} type="button" onClick={() => startNew(false)}>
                以此名号启程
              </button>
              {!canCreateSlot && <p className="menu__quiet-note">存档槽已满，请先在存档页覆盖或删除旧档。</p>}
            </section>
          )}

          {menuMode === 'saves' && (
            <section className="menu__view" aria-label="存档管理">
              <div className="menu__section-head">
                <span>存档</span>
                <small>{saveSlots.length} / {MAX_SAVE_SLOTS}</small>
              </div>
              {saveSlots.length > 0 ? (
                <div className="menu__save-list">
                  {saveSlots.map((slot) => (
                    <button
                      key={slot.slotId}
                      type="button"
                      className={`menu__save ${slot.slotId === selectedSlotId ? 'is-selected' : ''}`}
                      onClick={() => setSelectedSlotId(slot.slotId)}
                    >
                      <span>
                        <b>{slot.name}</b>
                        <small>
                          {locationLabel(slot)} · 第 {slot.turn} 季
                        </small>
                      </span>
                      <em>{formatSaveTime(slot.savedAt)}</em>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="menu__quiet-note">暂无存档。</p>
              )}
              <div className="menu__compact-actions">
                <button className="menu__ink-btn menu__ink-btn--primary" disabled={!selectedSlot} type="button" onClick={() => void onContinue(selectedSlot?.slotId)}>
                  继续
                </button>
                <button className="menu__ink-btn" disabled={!selectedSlot} type="button" onClick={() => startNew(true)}>
                  覆盖
                </button>
                <button className="menu__ink-btn" disabled={!selectedSlot} type="button" onClick={removeSelected}>
                  删除
                </button>
              </div>
            </section>
          )}
        </main>
      )}
    </div>
  );
}
