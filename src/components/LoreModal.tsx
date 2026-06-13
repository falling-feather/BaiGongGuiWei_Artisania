import { useDeferredValue, useMemo, useState } from 'react';
import {
  buildLoreTravelGuide,
  filteredLoreEntries,
  loreProgress,
  uniqueRoutesFromRegions,
  unlockedLoreEntries,
} from '../engine';
import type { LoreEntryCategory } from '../engine';
import { useGameStore } from '../store/gameStore';

const CATEGORY_LABEL: Record<LoreEntryCategory, string> = {
  world: '世界',
  region: '地区',
  craft: '工艺',
  npc: '人物',
  route: '商路',
  life: '生活',
  system: '系统',
};

const CATEGORY_ORDER: LoreEntryCategory[] = ['world', 'region', 'craft', 'npc', 'route', 'life', 'system'];

export function LoreModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const state = useGameStore((s) => s.state);
  const content = useGameStore((s) => s.content);
  const dispatch = useGameStore((s) => s.dispatch);
  const entries = content.loreEntries ?? [];
  const [activeCategory, setActiveCategory] = useState<LoreEntryCategory | 'all'>('all');
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);

  const routeSpecs = useMemo(() => uniqueRoutesFromRegions(content.regionContent), [content.regionContent]);
  const unlocked = useMemo(() => unlockedLoreEntries(entries, state), [entries, state]);
  const progress = useMemo(() => loreProgress(entries, state), [entries, state]);
  const locked = entries.length - unlocked.length;
  const shown = useMemo(
    () => filteredLoreEntries(entries, state, { category: activeCategory, query: deferredQuery }),
    [activeCategory, deferredQuery, entries, state],
  );
  const unlockedIds = useMemo(() => new Set(unlocked.map((entry) => entry.id)), [unlocked]);
  const trackedEntry = entries.find((entry) => entry.id === state.trackedLoreEntryId);
  const trackedGuide = useMemo(
    () => buildLoreTravelGuide(state, trackedEntry, content.regions ?? [], routeSpecs),
    [content.regions, routeSpecs, state, trackedEntry],
  );

  if (!open) return null;

  return (
    <div className="modal__backdrop" onClick={onClose}>
      <div className="modal modal--wide lore-modal" onClick={(event) => event.stopPropagation()}>
        <h3 className="modal__title">百工志</h3>
        <p className="modal__desc">
          已收录 {progress.unlocked} / {progress.total} 条见闻
          {locked > 0 ? `，仍有 ${locked} 条待游历、攀谈或实践后解锁。` : '，当前词条已全部解锁。'}
        </p>

        {trackedGuide && (
          <div className="lore-target-strip">
            <div>
              <b>当前行脚目标</b>
              <span>{trackedGuide.headline}</span>
              <small>{trackedGuide.instruction}</small>
            </div>
            <button className="btn btn--ghost btn--sm" type="button" onClick={() => dispatch({ type: 'CLEAR_LORE_TRACKING' })}>
              取消追踪
            </button>
          </div>
        )}

        <div className="lore-tabs" role="tablist" aria-label="百工志分类">
          <button
            className={activeCategory === 'all' ? 'is-active' : ''}
            type="button"
            onClick={() => setActiveCategory('all')}
          >
            全部
          </button>
          {CATEGORY_ORDER.map((category) => (
            <button
              className={activeCategory === category ? 'is-active' : ''}
              key={category}
              type="button"
              onClick={() => setActiveCategory(category)}
            >
              {CATEGORY_LABEL[category]}
            </button>
          ))}
        </div>

        <div className="lore-controls">
          <label className="lore-search">
            <span>检索</span>
            <input
              aria-label="检索百工志"
              onChange={(event) => setQuery(event.currentTarget.value)}
              placeholder="地区、工艺、人物、线索"
              type="search"
              value={query}
            />
          </label>
          {query ? (
            <button className="btn btn--ghost lore-search__clear" type="button" onClick={() => setQuery('')}>
              清空
            </button>
          ) : null}
        </div>

        {shown.length === 0 ? (
          <p className="modal__desc">
            {query ? '没有匹配的已收录见闻。' : '这一类还没有可读见闻，去街景里攀谈、活动、授艺或护商试试。'}
          </p>
        ) : (
          <div className="lore-list">
            {shown.map((entry) => {
              const guide = buildLoreTravelGuide(state, entry, content.regions ?? [], routeSpecs);
              const isTracked = state.trackedLoreEntryId === entry.id;
              return (
                <article className={`lore-entry ${isTracked ? 'is-tracked' : ''}`} key={entry.id}>
                  <div className="lore-entry__head">
                    <span>{CATEGORY_LABEL[entry.category]}</span>
                    <h4>{entry.title}</h4>
                  </div>
                  <p className="lore-entry__summary">{entry.summary}</p>
                  {entry.body.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                  {guide && (
                    <div className="lore-entry__guide">
                      <b>行脚线索</b>
                      <span>{guide.instruction}</span>
                      <small>{guide.detail}</small>
                    </div>
                  )}
                  {guide && (
                    <div className="lore-entry__actions">
                      <button
                        className={`btn btn--sm ${isTracked ? 'btn--ghost' : 'btn--bamboo'}`}
                        type="button"
                        onClick={() =>
                          dispatch(
                            isTracked
                              ? { type: 'CLEAR_LORE_TRACKING' }
                              : { type: 'TRACK_LORE_ENTRY', loreEntryId: entry.id },
                          )
                        }
                      >
                        {isTracked ? '取消追踪' : '设为行脚目标'}
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}

        <details className="lore-locked">
          <summary>未解锁线索</summary>
          <ul>
            {entries
              .filter((entry) => !unlockedIds.has(entry.id))
              .map((entry) => (
                <li key={entry.id}>{entry.revealHint ?? '继续探索世界、与人物往来或完成工艺实践。'}</li>
              ))}
          </ul>
        </details>

        <div className="btn-row">
          <button className="btn btn--ghost" type="button" onClick={onClose}>
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
