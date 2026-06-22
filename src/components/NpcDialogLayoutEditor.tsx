import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { NPC_INDEX } from '../data';
import {
  DEFAULT_NPC_DIALOG_LAYOUTS,
  npcDialogLayoutToCssVars,
  readNpcDialogLayouts,
  writeNpcDialogLayouts,
  type NpcDialogLayout,
  type NpcDialogLayoutConfig,
  type NpcDialogLayoutMode,
  type NpcDialogRect,
} from './npcDialogLayout';

type NpcDialogSlotKey = 'portrait' | 'profile' | 'conversation';
type NpcDialogNumberKey = Exclude<keyof NpcDialogLayout, NpcDialogSlotKey>;
type PreviewMode = NpcDialogLayoutMode;
type DragMode = 'move' | 'resize';

interface DragState {
  layoutMode: PreviewMode;
  slot: NpcDialogSlotKey;
  mode: DragMode;
  startX: number;
  startY: number;
  panelW: number;
  panelH: number;
  rect: NpcDialogRect;
}

const SLOT_META: Array<{ key: NpcDialogSlotKey; label: string; hint: string }> = [
  { key: 'portrait', label: '人物立绘区', hint: '控制头像/半身像在左侧绿底框里的位置和大小。' },
  { key: 'profile', label: '人物信息区', hint: '控制姓名、关系、好感和标签的主信息块。' },
  { key: 'conversation', label: '对话内容区', hint: '控制台词、分类页签、列表和底部按钮所在区域。' },
];

const SAMPLE_NPC_IDS = [
  'jn-qiao-zhaoye',
  'jn-su-xiaocha',
  'ln-he-yunsha',
  'bs-mabang-ayue',
  'gp-wen-yaotou',
  'tourist-scholar',
].filter((id) => NPC_INDEX[id]);

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function roundPct(value: number): number {
  return Math.round(value * 10) / 10;
}

function rectStyle(rect: NpcDialogRect) {
  return {
    left: `${rect.x}%`,
    top: `${rect.y}%`,
    width: `${rect.w}%`,
    height: `${rect.h}%`,
  };
}

function patchRect(rect: NpcDialogRect, patch: Partial<NpcDialogRect>): NpcDialogRect {
  const x = clamp(roundPct(patch.x ?? rect.x), 0, 95);
  const y = clamp(roundPct(patch.y ?? rect.y), 0, 95);
  const w = clamp(roundPct(patch.w ?? rect.w), 5, 100 - x);
  const h = clamp(roundPct(patch.h ?? rect.h), 5, 100 - y);
  return { x, y, w, h };
}

export function NpcDialogLayoutEditor({ onBackToMap }: { onBackToMap: () => void }) {
  const [layouts, setLayouts] = useState<NpcDialogLayoutConfig>(() => readNpcDialogLayouts());
  const [activeSlot, setActiveSlot] = useState<NpcDialogSlotKey>('profile');
  const [previewMode, setPreviewMode] = useState<PreviewMode>('intro');
  const [sampleNpcId, setSampleNpcId] = useState(SAMPLE_NPC_IDS[0] ?? 'jn-qiao-zhaoye');
  const [status, setStatus] = useState('拖拽预览框上的热区即可同步到全部 NPC 对话页面。');
  const panelRef = useRef<HTMLElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const fallbackNpcId = SAMPLE_NPC_IDS[0] ?? 'jn-qiao-zhaoye';
  const sampleNpc = NPC_INDEX[sampleNpcId] ?? NPC_INDEX[fallbackNpcId];
  const layout = layouts[previewMode];
  const cssVars = useMemo(() => npcDialogLayoutToCssVars(layout), [layout]);
  const activeMeta = SLOT_META.find((slot) => slot.key === activeSlot) ?? SLOT_META[0];
  const activeRect = layout[activeSlot];

  function commitLayout(next: NpcDialogLayout, nextStatus?: string) {
    const saved = writeNpcDialogLayouts({ ...layouts, [previewMode]: next });
    setLayouts(saved);
    if (nextStatus) setStatus(nextStatus);
  }

  function updateSlot(slot: NpcDialogSlotKey, patch: Partial<NpcDialogRect>) {
    commitLayout(
      {
        ...layout,
        [slot]: patchRect(layout[slot], patch),
      },
      `${SLOT_META.find((item) => item.key === slot)?.label ?? slot} 已同步。`,
    );
  }

  function updateLayoutNumber(key: NpcDialogNumberKey, value: number) {
    commitLayout({ ...layout, [key]: value }, '全局尺寸参数已同步。');
  }

  function startDrag(slot: NpcDialogSlotKey, mode: DragMode, event: ReactPointerEvent) {
    const panel = panelRef.current;
    if (!panel) return;
    const rect = panel.getBoundingClientRect();
    event.preventDefault();
    event.stopPropagation();
    setActiveSlot(slot);
    dragRef.current = {
      layoutMode: previewMode,
      slot,
      mode,
      startX: event.clientX,
      startY: event.clientY,
      panelW: rect.width,
      panelH: rect.height,
      rect: layout[slot],
    };
  }

  useEffect(() => {
    function handleMove(event: PointerEvent) {
      const drag = dragRef.current;
      if (!drag) return;
      const dx = ((event.clientX - drag.startX) / drag.panelW) * 100;
      const dy = ((event.clientY - drag.startY) / drag.panelH) * 100;
      const nextRect =
        drag.mode === 'move'
          ? patchRect(drag.rect, { x: drag.rect.x + dx, y: drag.rect.y + dy })
          : patchRect(drag.rect, { w: drag.rect.w + dx, h: drag.rect.h + dy });
      setLayouts((current) => {
        const nextLayouts = {
          ...current,
          [drag.layoutMode]: {
            ...current[drag.layoutMode],
            [drag.slot]: nextRect,
          },
        };
        return writeNpcDialogLayouts(nextLayouts);
      });
    }

    function handleUp() {
      dragRef.current = null;
    }

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  }, []);

  async function copyLayoutJson() {
    await navigator.clipboard.writeText(JSON.stringify(layouts, null, 2));
    setStatus('NPC 对话双页布局 JSON 已复制。');
  }

  function resetLayout() {
    const saved = writeNpcDialogLayouts(DEFAULT_NPC_DIALOG_LAYOUTS);
    setLayouts(saved);
    setStatus('已恢复默认 NPC 对话双页布局，并同步到全部 NPC。');
  }

  function renderPreviewContent() {
    const name = sampleNpc?.name ?? '乔照夜';
    const profession = sampleNpc?.profession ?? '灯彩匠';
    const bustSrc = `/assets/game/characters/${sampleNpcId}/bust.png`;
    const portraitSrc = `/assets/game/characters/${sampleNpcId}/portrait.png`;

    return (
      <>
        <img className="npc-dialog-intro__frame" src="/assets/game/ui/hud_v2_dialogue_panel.png" alt="" draggable={false} />
        <div className="npc-dialog-slot npc-dialog-slot--portrait npc-dialog-intro__portrait">
          <img
            src={bustSrc}
            alt=""
            draggable={false}
            onError={(event) => {
              if (event.currentTarget.dataset.fallback === 'portrait') {
                event.currentTarget.style.display = 'none';
                return;
              }
              event.currentTarget.dataset.fallback = 'portrait';
              event.currentTarget.src = portraitSrc;
            }}
          />
        </div>
        <section className="npc-dialog-slot npc-dialog-slot--profile npc-dialog-intro__copy">
          <header className="npc-menu-header">
            <div>
              <p className="npc-menu-header__eyebrow">
                {previewMode === 'intro' ? profession : `交流 · ${profession}`}
              </p>
              <h3 className="modal__title">{name}</h3>
            </div>
            {previewMode === 'menu' && <button className="npc-menu-back" type="button">返回对白</button>}
          </header>
          <div className="npc-profile-strip">
            <span>关系：初识</span>
            <span>好感 0/100</span>
            <span>交谈：0 次</span>
            <span>性格：热络</span>
          </div>
          {previewMode === 'menu' && (
            <div className="npc-affinity">
              <span className="npc-affinity__label">好感度</span>
              <div className="npc-affinity__bar"><div className="npc-affinity__fill" style={{ width: '32%' }} /></div>
              <span className="npc-affinity__num">32/100</span>
            </div>
          )}
        </section>
        <section className="npc-dialog-slot npc-dialog-slot--conversation npc-dialog-intro__conversation">
          {previewMode === 'intro' ? (
            <>
              <p className="npc-dialog-intro__line">“工坊里有些物件，摆得顺眼了，说话做事都能省下半口气。”</p>
              <div className="npc-dialog-intro__choices" aria-label="对话选择预览">
                {['交流', '送礼', '互动', '委托', '离开'].map((label) => (
                  <button key={label} type="button">
                    <img src="/assets/game/ui/hud_v2_choice_button.png" alt="" draggable={false} />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="npc-menu-dialogue-row">
                <p className="npc-menu-dialogue-line">“这里会同步呈现所有 NPC 共用的对话界面效果。”</p>
              </div>
              <div className="npc-menu-tabs">
                {['交流', '送礼', '互动', '委托'].map((label, index) => (
                  <button className={`npc-menu-tab ${index === 0 ? 'npc-menu-tab--active' : ''}`} key={label} type="button">
                    <span>{label}</span>
                  </button>
                ))}
              </div>
              <div className="npc-menu-content">
                <div className="npc-talk-card">
                  <div>
                    <h4>寒暄近况</h4>
                    <p>这里展示菜单正文、关系变化与行动反馈的实际排版效果。</p>
                  </div>
                  <button className="btn btn--bamboo" type="button">攀谈 +好感</button>
                </div>
                <div className="npc-quest">
                  <div className="npc-quest__head">
                    <span className="npc-quest__name">人物线样例</span>
                    <span className="npc-quest__done">可触发</span>
                  </div>
                  <p className="npc-quest__desc">用于预览列表、说明文字和操作按钮在同一套布局中的呈现效果。</p>
                </div>
              </div>
              <div className="btn-row npc-menu-footer">
                <button className="btn btn--ghost" type="button">告辞</button>
              </div>
            </>
          )}
        </section>
      </>
    );
  }

  return (
    <main className="map-editor npc-layout-editor">
      <aside className="map-editor__palette npc-layout-editor__side">
        <div className="map-editor__brand">
          <span>NPC 对话调校</span>
          <b>Layout</b>
        </div>
        <button className="map-editor__wide-action" type="button" onClick={onBackToMap}>返回地图编辑器</button>
        <div className="map-editor__panel">
          <h2>预览</h2>
          <label>
            预览页面
            <select value={previewMode} onChange={(event) => setPreviewMode(event.target.value as PreviewMode)}>
              <option value="intro">初始对白</option>
              <option value="menu">交互菜单</option>
            </select>
          </label>
          <label>
            示例人物
            <select value={sampleNpcId} onChange={(event) => setSampleNpcId(event.target.value)}>
              {SAMPLE_NPC_IDS.map((id) => (
                <option key={id} value={id}>{NPC_INDEX[id]?.name ?? id}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="map-editor__panel">
          <h2>热区</h2>
          <div className="map-editor__seed-list npc-layout-editor__slot-list">
            {SLOT_META.map((slot) => (
              <button
                className={`map-editor__seed ${activeSlot === slot.key ? 'is-selected' : ''}`}
                key={slot.key}
                type="button"
                onClick={() => setActiveSlot(slot.key)}
              >
                <span>
                  {slot.label}
                  <small>{slot.hint}</small>
                </span>
              </button>
            ))}
          </div>
        </div>
      </aside>

      <section className="map-editor__stage npc-layout-editor__stage">
        <header className="map-editor__toolbar">
          <div className="map-editor__tool-group" aria-label="NPC 布局操作">
            <button type="button" className="is-on">拖拽移动</button>
            <button type="button">右下角缩放</button>
          </div>
          <div className="map-editor__status">{status}</div>
          <button type="button" onClick={resetLayout}>恢复默认</button>
          <button type="button" onClick={copyLayoutJson}>复制 JSON</button>
        </header>
        <div className="npc-layout-editor__scroll">
          <section
            ref={panelRef}
            className={`npc-dialog-panel npc-dialog-intro npc-layout-editor__preview ${previewMode === 'menu' ? 'npc-layout-editor__preview--menu' : ''}`}
            style={cssVars}
          >
            {renderPreviewContent()}
            <div className="npc-layout-editor__hotspots" aria-label="NPC 布局热区">
              {SLOT_META.map((slot) => (
                <button
                  className={`npc-layout-editor__hotspot ${activeSlot === slot.key ? 'is-active' : ''}`}
                  key={slot.key}
                  style={rectStyle(layout[slot.key])}
                  type="button"
                  onPointerDown={(event) => startDrag(slot.key, 'move', event)}
                >
                  <span>{slot.label}</span>
                  <i
                    aria-hidden="true"
                    onPointerDown={(event) => startDrag(slot.key, 'resize', event)}
                  />
                </button>
              ))}
            </div>
          </section>
        </div>
      </section>

      <aside className="map-editor__inspector">
        <section className="map-editor__panel">
          <h2>{activeMeta.label}</h2>
          <p className="map-editor__panel-copy">{activeMeta.hint}</p>
          <div className="map-editor__fields map-editor__fields--two">
            <label>
              X %
              <input type="number" step="0.1" value={activeRect.x} onChange={(event) => updateSlot(activeSlot, { x: Number(event.target.value) })} />
            </label>
            <label>
              Y %
              <input type="number" step="0.1" value={activeRect.y} onChange={(event) => updateSlot(activeSlot, { y: Number(event.target.value) })} />
            </label>
            <label>
              宽 %
              <input type="number" step="0.1" value={activeRect.w} onChange={(event) => updateSlot(activeSlot, { w: Number(event.target.value) })} />
            </label>
            <label>
              高 %
              <input type="number" step="0.1" value={activeRect.h} onChange={(event) => updateSlot(activeSlot, { h: Number(event.target.value) })} />
            </label>
          </div>
        </section>

        <section className="map-editor__panel">
          <h2>全局尺寸</h2>
          <div className="map-editor__fields map-editor__fields--two">
            <label>
              面板最大宽
              <input type="number" min={640} max={1500} value={layout.panelMaxWidth} onChange={(event) => updateLayoutNumber('panelMaxWidth', Number(event.target.value))} />
            </label>
            <label>
              屏幕留边
              <input type="number" min={8} max={96} value={layout.viewportPadding} onChange={(event) => updateLayoutNumber('viewportPadding', Number(event.target.value))} />
            </label>
            <label>
              人物缩放
              <input type="number" min={0.6} max={1.6} step="0.01" value={layout.portraitScale} onChange={(event) => updateLayoutNumber('portraitScale', Number(event.target.value))} />
            </label>
            <label>
              按钮高度
              <input type="number" min={24} max={72} value={layout.choiceHeight} onChange={(event) => updateLayoutNumber('choiceHeight', Number(event.target.value))} />
            </label>
            <label>
              按钮间距
              <input type="number" min={2} max={24} value={layout.choiceGap} onChange={(event) => updateLayoutNumber('choiceGap', Number(event.target.value))} />
            </label>
          </div>
        </section>

        <section className="map-editor__panel">
          <h2>内边距</h2>
          <div className="map-editor__fields map-editor__fields--two">
            <label>
              信息横向
              <input type="number" min={0} max={40} value={layout.profilePadX} onChange={(event) => updateLayoutNumber('profilePadX', Number(event.target.value))} />
            </label>
            <label>
              信息纵向
              <input type="number" min={0} max={32} value={layout.profilePadY} onChange={(event) => updateLayoutNumber('profilePadY', Number(event.target.value))} />
            </label>
            <label>
              对话横向
              <input type="number" min={0} max={44} value={layout.conversationPadX} onChange={(event) => updateLayoutNumber('conversationPadX', Number(event.target.value))} />
            </label>
            <label>
              对话纵向
              <input type="number" min={0} max={36} value={layout.conversationPadY} onChange={(event) => updateLayoutNumber('conversationPadY', Number(event.target.value))} />
            </label>
          </div>
        </section>
      </aside>
    </main>
  );
}
