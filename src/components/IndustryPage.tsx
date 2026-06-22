import { useState, type CSSProperties } from 'react';
import { useGameStore } from '../store/gameStore';
import { RESOURCE_INDEX } from '../data';
import {
  formatRealTimeRemaining,
  realTimeCooldownKey,
  realTimeRemainingMs,
} from '../engine';
import { MINIGAME_REGISTRY } from './minigames';
import { getIndustryPageTheme } from './industryPageThemes';
import { minigameRegionTheme, workshopIconFor, workshopRegionFrame } from './minigameUiTheme';
import { useRealTimeNow } from './useRealTimeNow';

/**
 * 产业整页工坊 —— 全屏整页（替代 MiniGameModal 小弹窗）。
 * 左栏主题立绘/叙事/要诀，右栏嵌入对应 miniGame 机制；完成后评定并以 quality 派发 GATHER_RESOURCE。
 * 与手艺整页（CraftPage）布局一致，复用 `.craft-page` 样式，保证全地区交互统一为网页。
 */
function resName(key: string): string {
  return RESOURCE_INDEX[key]?.name ?? key;
}

export function IndustryPage({
  industryId,
  onClose,
}: {
  industryId: string;
  onClose: () => void;
}) {
  const content = useGameStore((s) => s.content);
  const resources = useGameStore((s) => s.state.resources);
  const currentRegion = useGameStore((s) => s.state.currentRegion);
  const realTime = useGameStore((s) => s.state.realTime);
  const playing = useGameStore((s) => s.state.status === 'playing');
  const dispatch = useGameStore((s) => s.dispatch);
  const now = useRealTimeNow();
  const [quality, setQuality] = useState<number | null>(null);

  const industry = (content.industries ?? []).find((i) => i.id === industryId);
  const theme = getIndustryPageTheme(industryId);
  if (!industry || !theme) return null;

  const miniTheme = minigameRegionTheme(currentRegion);
  const workshopFrame = workshopRegionFrame(currentRegion);
  const heroImage = theme.heroImage ?? workshopFrame;
  const heroHasCustomArt = Boolean(theme.heroImage);
  const pageStyle = {
    '--page-accent': theme.accent,
    '--minigame-accent': miniTheme.accent,
    '--minigame-accent-soft': miniTheme.accentSoft,
  } as CSSProperties;
  const Mechanic = MINIGAME_REGISTRY[industry.miniGame];
  const inputEntries = Object.entries(industry.input);
  const isHarvest = inputEntries.length === 0;
  const materialShort = inputEntries.some(([k, v]) => (resources[k] ?? 0) < v);
  const laborShort = (resources.labor ?? 0) < industry.laborCost;
  const cooldownKey = realTimeCooldownKey('industry', industryId);
  const cooldownRemaining = realTimeRemainingMs({ realTime }, cooldownKey, now);
  const cooldownBlocked = cooldownRemaining > 0;
  const cooldownText = cooldownBlocked ? formatRealTimeRemaining(cooldownRemaining) : '';
  const grade = quality === null ? '' : quality >= 0.85 ? '上品' : quality >= 0.5 ? '良品' : '次品';
  const produced =
    quality === null ? 0 : Math.max(1, Math.round(industry.yield * (1 + quality)));

  const close = () => {
    setQuality(null);
    onClose();
  };
  const settle = () => {
    if (quality === null) return;
    dispatch({ type: 'GATHER_RESOURCE', industryId: industry.id, quality });
    close();
  };

  return (
    <div className={`craft-page craft-page--workshop minigame-shell--${miniTheme.regionId}`} style={pageStyle}>
      <header className="craft-page__bar">
        <button className="btn btn--ghost" onClick={close}>
          ← 返回街市
        </button>
        <h2 className="craft-page__title">
          {industry.name}
          <small> · {theme.tierLabel}</small>
        </h2>
        <div className="craft-page__metrics">
          {cooldownBlocked && <span className="craft-page__timer">整备 {cooldownText}</span>}
          <span>产出 {resName(industry.output)}</span>
          <span>工时 {industry.laborCost}</span>
        </div>
      </header>

      <div className="craft-page__body">
        <section className="craft-page__story">
          <div
            className={`craft-page__hero${heroHasCustomArt ? ' craft-page__hero--art' : ''}`}
            role="img"
            aria-label={theme.heroAlt}
          >
            <img aria-hidden="true" className="craft-page__hero-frame" src={heroImage} alt="" />
          </div>
          <p className="craft-page__tagline">{theme.tagline}</p>
          {theme.story.map((p, i) => (
            <p key={i} className="craft-page__para">
              {p}
            </p>
          ))}
          <ul className="craft-page__tips">
            {theme.tips.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </section>

        <section className="craft-page__work">
          <h3>工坊台 · {industry.name}</h3>
          <p className="craft-page__work-desc">{industry.blurb}</p>
          <div className="craft-page__minigame-strip">
            <img className="minigame-icon" src={workshopIconFor(industry.miniGame)} alt="" />
            <span>{miniTheme.label}</span>
            <b>{isHarvest ? '采集冷却 10 分钟' : '加工冷却 3 分钟'}</b>
          </div>

          <div className="craft-supply">
            <div className="craft-supply__row">
              <span className="craft-supply__label">耗料</span>
              {inputEntries.length === 0 ? (
                <span className="craft-supply__none">仅耗工时</span>
              ) : (
                inputEntries.map(([key, amount]) => {
                  const short = (resources[key] ?? 0) < amount;
                  return (
                    <span
                      key={key}
                      className={`craft-supply__chip${short ? ' craft-supply__chip--short' : ''}`}
                    >
                      {resName(key)} {resources[key] ?? 0}/{amount}
                    </span>
                  );
                })
              )}
              <span className={`craft-supply__chip${laborShort ? ' craft-supply__chip--short' : ''}`}>
                工时 {resources.labor ?? 0}/{industry.laborCost}
              </span>
              {cooldownBlocked && (
                <span className="craft-supply__chip craft-supply__chip--time">
                  整备 {cooldownText}
                </span>
              )}
            </div>
            <div className="craft-supply__row">
              <span className="craft-supply__label">产出</span>
              <span className="craft-supply__chip craft-supply__chip--out">
                {resName(industry.output)} ×{industry.yield}+
              </span>
            </div>
            {materialShort && playing && (
              <p className="craft-supply__warn">物料不足，先去采料／精炼补足上游材料。</p>
            )}
            {laborShort && playing && (
              <p className="craft-supply__warn">人力不足，结束本季或处理待办后再开工。</p>
            )}
            {cooldownBlocked && playing && (
              <p className="craft-supply__warn">
                {isHarvest ? '资源点正在恢复' : '工坊台正在清理整备'}，还需等待 {cooldownText}。
              </p>
            )}
          </div>

          {!playing ? (
            <p className="craft-supply__warn">游戏结束，无法操作。</p>
          ) : materialShort || laborShort || cooldownBlocked ? (
            <div className="btn-row">
              <button className="btn btn--ghost" onClick={close}>
                离开
              </button>
            </div>
          ) : quality === null ? (
            <div className="industry-page__game">
              <Mechanic onResult={setQuality} />
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
                <button className="btn btn--ghost" onClick={close}>
                  离开
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
