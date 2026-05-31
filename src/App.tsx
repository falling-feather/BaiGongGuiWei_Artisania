import { useEffect, useRef, useState } from 'react';
import { useGameStore } from './store/gameStore';
import { onBus, emitCommand } from './game/EventBus';
import { buildRegionSpec } from './game/regionSpec';
import { ACHIEVEMENT_INDEX } from './data';
import { PhaserGame } from './game/PhaserGame';
import { Hud } from './components/Hud';
import { CraftExperienceModal } from './components/CraftExperienceModal';
import { MiniGameModal } from './components/MiniGameModal';
import { RegionPanel } from './components/RegionPanel';
import { WorldMapModal } from './components/WorldMapModal';
import { InventoryModal } from './components/InventoryModal';
import { AchievementsModal } from './components/AchievementsModal';
import { MainMenu } from './components/MainMenu';
import { Tutorial } from './components/Tutorial';
import { EventModal } from './components/EventModal';
import { GameOverReport } from './components/GameOverReport';
import { localStorageAdapter } from './storage/localStorageAdapter';

const TUTORIAL_SEEN_KEY = 'artisania:tutorial-seen';

export function App() {
  const loadFromStorage = useGameStore((s) => s.loadFromStorage);
  const newGame = useGameStore((s) => s.newGame);
  const [view, setView] = useState<'menu' | 'playing'>('menu');
  const [hasSave, setHasSave] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [activeCraftId, setActiveCraftId] = useState<string | null>(null);
  const [activeIndustryId, setActiveIndustryId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [bagOpen, setBagOpen] = useState(false);
  const [achOpen, setAchOpen] = useState(false);
  const [achToast, setAchToast] = useState<string | null>(null);
  const sceneReadyRef = useRef(false);
  const lastSigRef = useRef('');
  const knownAchRef = useRef<Set<string>>(new Set());
  const toastTimerRef = useRef<number | null>(null);

  // 首次挂载：恢复存档并探测是否有可续的存档
  useEffect(() => {
    void loadFromStorage();
    void localStorageAdapter.hasSave().then(setHasSave);
  }, [loadFromStorage]);

  // 主菜单入口
  function startNew() {
    newGame();
    setView('playing');
    lastSigRef.current = '';
    syncRegion();
    if (localStorage.getItem(TUTORIAL_SEEN_KEY) !== '1') {
      setTutorialOpen(true);
      localStorage.setItem(TUTORIAL_SEEN_KEY, '1');
    }
  }
  function continueGame() {
    setView('playing');
    lastSigRef.current = '';
    syncRegion();
  }

  // 把当前地区规格下发给 Phaser 场景；signature 变化（换区/解锁）才重建
  function syncRegion() {
    if (!sceneReadyRef.current) return;
    const state = useGameStore.getState().state;
    const sig = `${state.currentRegion}:${[...state.unlockedRegions].sort().join(',')}`;
    if (sig === lastSigRef.current) return;
    const spec = buildRegionSpec(state.currentRegion, state);
    if (!spec) return;
    lastSigRef.current = sig;
    emitCommand({ type: 'enter-region', spec });
  }

  // 监听游戏世界发来的事件
  useEffect(() => {
    return onBus((payload) => {
      if (payload.type === 'hint') setHint(payload.text);
      else if (payload.type === 'interact-craft') setActiveCraftId(payload.craftId);
      else if (payload.type === 'interact-industry') setActiveIndustryId(payload.industryId);
      else if (payload.type === 'interact-gate') {
        const dispatch = useGameStore.getState().dispatch;
        if (payload.unlocked) {
          dispatch({ type: 'TRAVEL', regionId: payload.regionId });
        } else {
          dispatch({ type: 'UNLOCK_REGION', regionId: payload.regionId });
          if (useGameStore.getState().state.unlockedRegions.includes(payload.regionId)) {
            dispatch({ type: 'TRAVEL', regionId: payload.regionId });
          }
        }
      } else if (payload.type === 'scene-ready') {
        sceneReadyRef.current = true;
        lastSigRef.current = '';
        syncRegion();
      }
    });
  }, []);

  // 状态变化时尝试同步地图（仅在地区/解锁集变化时真正重建），并探测新成就
  useEffect(() => {
    // 初始化已知成就集，避免加载存档时补弹
    knownAchRef.current = new Set(useGameStore.getState().state.achievements);
    return useGameStore.subscribe(() => {
      syncRegion();
      const ach = useGameStore.getState().state.achievements;
      const fresh = ach.filter((id) => !knownAchRef.current.has(id));
      if (fresh.length > 0) {
        knownAchRef.current = new Set(ach);
        const name = ACHIEVEMENT_INDEX[fresh[fresh.length - 1]]?.name ?? '新成就';
        setAchToast(name);
        if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
        toastTimerRef.current = window.setTimeout(() => setAchToast(null), 3200);
      }
    });
  }, []);

  return (
    <div className="stage">
      <PhaserGame />
      {view === 'menu' ? (
        <MainMenu hasSave={hasSave} onNew={startNew} onContinue={continueGame} />
      ) : (
        <>
          <Hud
            hint={hint}
            onOpenPanel={() => setPanelOpen(true)}
            onOpenMap={() => setMapOpen(true)}
            onOpenBag={() => setBagOpen(true)}
            onOpenAchievements={() => setAchOpen(true)}
          />
          <CraftExperienceModal craftId={activeCraftId} onClose={() => setActiveCraftId(null)} />
          <MiniGameModal industryId={activeIndustryId} onClose={() => setActiveIndustryId(null)} />
          <RegionPanel open={panelOpen} onClose={() => setPanelOpen(false)} />
          <WorldMapModal open={mapOpen} onClose={() => setMapOpen(false)} />
          <InventoryModal open={bagOpen} onClose={() => setBagOpen(false)} />
          <AchievementsModal open={achOpen} onClose={() => setAchOpen(false)} />
          <Tutorial open={tutorialOpen} onClose={() => setTutorialOpen(false)} />
          {achToast && <div className="ach-toast">★ 解锁成就「{achToast}」</div>}
          <EventModal />
          <GameOverReport />
        </>
      )}
    </div>
  );
}
