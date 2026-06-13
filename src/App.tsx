import { useEffect, useRef, useState } from 'react';
import { useGameStore } from './store/gameStore';
import { onBus, emitCommand, type MiniMapPoint, type RegionNavigationTarget } from './game/EventBus';
import { buildRegionSpec } from './game/regionSpec';
import { currentStreetRegionGate, isCurrentStreetSubregionGate } from './game/navigationGuards';
import { ACHIEVEMENT_INDEX } from './data';
import { PhaserGame } from './game/PhaserGame';
import { Hud } from './components/Hud';
import { CraftExperienceModal } from './components/CraftExperienceModal';
import { CraftPage } from './components/CraftPage';
import { hasCraftPage } from './components/craftPageThemes';
import { NpcDialogModal } from './components/NpcDialogModal';
import { IndustryPage } from './components/IndustryPage';
import { RegionPanel } from './components/RegionPanel';
import { WorldMapModal } from './components/WorldMapModal';
import { InventoryModal } from './components/InventoryModal';
import { LoreModal } from './components/LoreModal';
import { ActivityModal } from './components/ActivityModal';
import { AchievementsModal } from './components/AchievementsModal';
import { MainMenu } from './components/MainMenu';
import { Tutorial } from './components/Tutorial';
import { StoryModal } from './components/StoryModal';
import { EventModal } from './components/EventModal';
import { EscortCrisisModal } from './components/EscortCrisisModal';
import { SupplyCrisisModal } from './components/SupplyCrisisModal';
import { ActivityStallClosingModal } from './components/ActivityStallClosingModal';
import { GameOverReport } from './components/GameOverReport';
import { SettingsModal } from './components/SettingsModal';
import { Minimap, type PlayerPos } from './components/Minimap';
import { MapEditor } from './components/MapEditor';

const TUTORIAL_SEEN_KEY = 'artisania:tutorial-seen';

function navigationTargetSignature(target: RegionNavigationTarget | undefined) {
  return target ? `${target.kind}:${target.payload}:${target.label}:${target.detail}` : '';
}

export function App() {
  const editorMode = new URLSearchParams(window.location.search).get('editor') === '1';
  return editorMode ? <MapEditor /> : <GameApp />;
}

function GameApp() {
  const loadFromStorage = useGameStore((s) => s.loadFromStorage);
  const newGame = useGameStore((s) => s.newGame);
  const refreshSaveSlots = useGameStore((s) => s.refreshSaveSlots);
  const deleteSaveSlot = useGameStore((s) => s.deleteSaveSlot);
  const saveSlots = useGameStore((s) => s.saveSlots);
  const activeSaveSlotId = useGameStore((s) => s.activeSaveSlotId);
  const [view, setView] = useState<'menu' | 'playing'>('menu');
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [activeCraftId, setActiveCraftId] = useState<string | null>(null);
  const [activeCraftPageId, setActiveCraftPageId] = useState<string | null>(null);
  const [activeNpcId, setActiveNpcId] = useState<string | null>(null);
  const [activeIndustryId, setActiveIndustryId] = useState<string | null>(null);
  const [activeActivityId, setActiveActivityId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [bagOpen, setBagOpen] = useState(false);
  const [achOpen, setAchOpen] = useState(false);
  const [loreOpen, setLoreOpen] = useState(false);
  const [achToast, setAchToast] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [playerPos, setPlayerPos] = useState<PlayerPos | null>(null);
  const [mapPoints, setMapPoints] = useState<MiniMapPoint[]>([]);
  const [zoom, setZoom] = useState(2);
  const sceneReadyRef = useRef(false);
  const lastSigRef = useRef('');
  const lastTargetSigRef = useRef('');
  const knownAchRef = useRef<Set<string>>(new Set());
  const toastTimerRef = useRef<number | null>(null);

  // 首次挂载：恢复存档并探测是否有可续的存档
  useEffect(() => {
    void loadFromStorage();
  }, [loadFromStorage]);

  // 主菜单入口
  async function startNew(playerName: string, slotId?: string) {
    await newGame(undefined, playerName, slotId);
    setView('playing');
    lastSigRef.current = '';
    lastTargetSigRef.current = '';
    syncRegion();
    if (localStorage.getItem(TUTORIAL_SEEN_KEY) !== '1') {
      setTutorialOpen(true);
      localStorage.setItem(TUTORIAL_SEEN_KEY, '1');
    }
  }
  async function continueGame(slotId?: string) {
    const loaded = await loadFromStorage(slotId);
    if (!loaded) {
      await refreshSaveSlots();
      return;
    }
    setView('playing');
    lastSigRef.current = '';
    lastTargetSigRef.current = '';
    syncRegion();
  }

  async function deleteSave(slotId: string) {
    await deleteSaveSlot(slotId);
  }

  // 把当前地区规格下发给 Phaser 场景；signature 变化（换区/解锁）才重建
  function syncRegion() {
    if (!sceneReadyRef.current) return;
    const state = useGameStore.getState().state;
    const sig = `${state.currentRegion}:${state.currentSubregion}:${state.turn}:${state.calendar.day}:${state.calendar.phase}:${state.calendar.weather}:${[...state.unlockedRegions].sort().join(',')}`;
    if (sig === lastSigRef.current) return;
    const spec = buildRegionSpec(state.currentRegion, state);
    if (!spec) return;
    lastSigRef.current = sig;
    lastTargetSigRef.current = navigationTargetSignature(spec.navigationTarget);
    emitCommand({ type: 'enter-region', spec });
  }

  function syncNavigationTarget() {
    if (!sceneReadyRef.current) return;
    const state = useGameStore.getState().state;
    const spec = buildRegionSpec(state.currentRegion, state);
    if (!spec) return;
    const sig = navigationTargetSignature(spec.navigationTarget);
    if (sig === lastTargetSigRef.current) return;
    lastTargetSigRef.current = sig;
    emitCommand({ type: 'set-navigation-target', target: spec.navigationTarget });
  }

  // 监听游戏世界发来的事件
  useEffect(() => {
    return onBus((payload) => {
      if (payload.type === 'hint') setHint(payload.text);
      else if (payload.type === 'interact-craft') {
        // 已登记独立页的手艺走整页工坊，其余回退到通用弹窗
        if (hasCraftPage(payload.craftId)) setActiveCraftPageId(payload.craftId);
        else setActiveCraftId(payload.craftId);
      } else if (payload.type === 'interact-industry') setActiveIndustryId(payload.industryId);
      else if (payload.type === 'interact-activity') setActiveActivityId(payload.activityId);
      else if (payload.type === 'interact-npc') setActiveNpcId(payload.npcId);
      else if (payload.type === 'interact-subregion-gate') {
        if (!isCurrentStreetSubregionGate(useGameStore.getState().state, payload.subregionId)) return;
        setHint(null);
        useGameStore.getState().dispatch({ type: 'TRAVEL_SUBREGION', subregionId: payload.subregionId });
      } else if (payload.type === 'player-pos')
        setPlayerPos({ tx: payload.tx, ty: payload.ty, mapW: payload.mapW, mapH: payload.mapH });
      else if (payload.type === 'region-points') setMapPoints(payload.points);
      else if (payload.type === 'zoom-changed') setZoom(payload.zoom);
      else if (payload.type === 'interact-gate') {
        const dispatch = useGameStore.getState().dispatch;
        const gate = currentStreetRegionGate(useGameStore.getState().state, payload.regionId);
        if (!gate) return;
        setHint(null);
        if (gate.unlocked) {
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
        lastTargetSigRef.current = '';
        syncRegion();
      }
    });
  }, []);

  // Esc 唤出/收起全局设置（仅在游戏中）
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Escape') return;
      if (useGameStore.getState().state.status !== 'playing') return;
      setSettingsOpen((v) => !v);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // 状态变化时尝试同步地图（仅在地区/解锁集变化时真正重建），并探测新成就
  useEffect(() => {
    // 初始化已知成就集，避免加载存档时补弹
    knownAchRef.current = new Set(useGameStore.getState().state.achievements);
    return useGameStore.subscribe(() => {
      syncRegion();
      syncNavigationTarget();
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
        <MainMenu
          saveSlots={saveSlots}
          activeSaveSlotId={activeSaveSlotId}
          onNew={startNew}
          onContinue={continueGame}
          onDeleteSave={deleteSave}
        />
      ) : (
        <>
          <Hud
            hint={hint}
            onOpenPanel={() => setPanelOpen(true)}
            onOpenMap={() => setMapOpen(true)}
            onOpenBag={() => setBagOpen(true)}
            onOpenAchievements={() => setAchOpen(true)}
            onOpenLore={() => setLoreOpen(true)}
            onOpenSettings={() => setSettingsOpen(true)}
            onInteractNearby={() => emitCommand({ type: 'interact-nearby' })}
          />
          <CraftExperienceModal craftId={activeCraftId} onClose={() => setActiveCraftId(null)} />
          <NpcDialogModal npcId={activeNpcId} onClose={() => setActiveNpcId(null)} />
          <RegionPanel open={panelOpen} onClose={() => setPanelOpen(false)} />
          <WorldMapModal open={mapOpen} onClose={() => setMapOpen(false)} />
          <InventoryModal open={bagOpen} onClose={() => setBagOpen(false)} />
          <LoreModal open={loreOpen} onClose={() => setLoreOpen(false)} />
          <ActivityModal activityId={activeActivityId} onClose={() => setActiveActivityId(null)} />
          <AchievementsModal open={achOpen} onClose={() => setAchOpen(false)} />
          <Tutorial open={tutorialOpen} onClose={() => setTutorialOpen(false)} />
          {!tutorialOpen && <StoryModal />}
          {achToast && <div className="ach-toast">★ 解锁成就「{achToast}」</div>}
          <EventModal />
          <EscortCrisisModal />
          <SupplyCrisisModal />
          <ActivityStallClosingModal />
          <GameOverReport />
          <Minimap
            player={playerPos}
            points={mapPoints}
            zoom={zoom}
            onZoom={(delta) => emitCommand({ type: 'zoom', delta })}
          />
          <SettingsModal
            open={settingsOpen}
            onClose={() => setSettingsOpen(false)}
            onReturnHome={() => {
              setSettingsOpen(false);
              setView('menu');
            }}
          />
          {activeCraftPageId && (
            <CraftPage craftId={activeCraftPageId} onClose={() => setActiveCraftPageId(null)} />
          )}
          {activeIndustryId && (
            <IndustryPage industryId={activeIndustryId} onClose={() => setActiveIndustryId(null)} />
          )}
        </>
      )}
    </div>
  );
}
