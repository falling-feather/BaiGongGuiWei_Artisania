import { useEffect, useState } from 'react';
import { useGameStore } from './store/gameStore';
import { onBus } from './game/EventBus';
import { PhaserGame } from './game/PhaserGame';
import { Hud } from './components/Hud';
import { CraftExperienceModal } from './components/CraftExperienceModal';
import { RegionPanel } from './components/RegionPanel';
import { EventModal } from './components/EventModal';
import { GameOverReport } from './components/GameOverReport';

export function App() {
  const loadFromStorage = useGameStore((s) => s.loadFromStorage);
  const [hint, setHint] = useState<string | null>(null);
  const [activeCraftId, setActiveCraftId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  // 首次挂载：恢复存档
  useEffect(() => {
    void loadFromStorage();
  }, [loadFromStorage]);

  // 监听游戏世界发来的事件
  useEffect(() => {
    return onBus((payload) => {
      if (payload.type === 'hint') setHint(payload.text);
      else if (payload.type === 'interact-craft') setActiveCraftId(payload.craftId);
    });
  }, []);

  return (
    <div className="stage">
      <PhaserGame />
      <Hud hint={hint} onOpenPanel={() => setPanelOpen(true)} />
      <CraftExperienceModal craftId={activeCraftId} onClose={() => setActiveCraftId(null)} />
      <RegionPanel open={panelOpen} onClose={() => setPanelOpen(false)} />
      <EventModal />
      <GameOverReport />
    </div>
  );
}
