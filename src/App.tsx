import { useEffect, useRef, useState } from 'react';
import { useGameStore } from './store/gameStore';
import { onBus, emitCommand } from './game/EventBus';
import { buildRegionSpec } from './game/regionSpec';
import { PhaserGame } from './game/PhaserGame';
import { Hud } from './components/Hud';
import { CraftExperienceModal } from './components/CraftExperienceModal';
import { MiniGameModal } from './components/MiniGameModal';
import { RegionPanel } from './components/RegionPanel';
import { EventModal } from './components/EventModal';
import { GameOverReport } from './components/GameOverReport';

export function App() {
  const loadFromStorage = useGameStore((s) => s.loadFromStorage);
  const [hint, setHint] = useState<string | null>(null);
  const [activeCraftId, setActiveCraftId] = useState<string | null>(null);
  const [activeIndustryId, setActiveIndustryId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const sceneReadyRef = useRef(false);
  const lastSigRef = useRef('');

  // 首次挂载：恢复存档
  useEffect(() => {
    void loadFromStorage();
  }, [loadFromStorage]);

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

  // 状态变化时尝试同步地图（仅在地区/解锁集变化时真正重建）
  useEffect(() => {
    return useGameStore.subscribe(() => syncRegion());
  }, []);

  return (
    <div className="stage">
      <PhaserGame />
      <Hud hint={hint} onOpenPanel={() => setPanelOpen(true)} />
      <CraftExperienceModal craftId={activeCraftId} onClose={() => setActiveCraftId(null)} />
      <MiniGameModal industryId={activeIndustryId} onClose={() => setActiveIndustryId(null)} />
      <RegionPanel open={panelOpen} onClose={() => setPanelOpen(false)} />
      <EventModal />
      <GameOverReport />
    </div>
  );
}
