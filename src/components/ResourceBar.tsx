import { useGameStore } from '../store/gameStore';

const RESOURCE_LABELS: Record<string, string> = {
  coin: '文钱',
  labor: '人力',
  plantDye: '蓝靛',
  water: '清水',
  cloth: '布料',
  bamboo: '竹材',
  tools: '工具',
};

/** 资源池一览 */
export function ResourceBar() {
  const resources = useGameStore((s) => s.state.resources);
  return (
    <div className="panel">
      <h2 className="panel__title">镇库</h2>
      <div className="resources">
        {Object.entries(resources).map(([key, amount]) => (
          <span className="resource" key={key}>
            {RESOURCE_LABELS[key] ?? key} · {amount}
          </span>
        ))}
      </div>
    </div>
  );
}
