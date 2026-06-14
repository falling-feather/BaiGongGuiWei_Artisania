import { useGameStore } from '../store/gameStore';
import { NPC_INDEX, RESOURCE_INDEX, questsForNpc } from '../data';
import {
  NPC_FUNCTION_LABELS,
  itemDefectSummary,
  itemEffectiveQuality,
  npcFunctionNeedsItem,
  npcFunctionRequirement,
  orderDeliveryIssue,
  routeRiskLabel,
} from '../engine';
import type {
  ActiveOrder,
  CollabRecipeDef,
  CollabRecipeChoiceDef,
  GameContent,
  GameState,
  HomeVisitChoiceDef,
  HomeVisitDef,
  ItemInstance,
  NpcDef,
  NpcFunctionKind,
  NpcGiftPreference,
  ResourcePool,
} from '../engine';

const ITEM_STATUS_LABEL = {
  held: '持有',
  displayed: '陈列',
  gifted: '已赠',
  sold: '已售',
} as const;

const STAGE_LABEL = {
  stranger: '初识',
  familiar: '熟络',
  trusted: '信任',
  confidant: '知己',
} as const;

function preferenceMatches(
  preference: NpcGiftPreference,
  item: ItemInstance,
): boolean {
  if (preference.minQuality !== undefined && itemEffectiveQuality(item) < preference.minQuality) return false;
  if (preference.resourceIds && !preference.resourceIds.includes(item.resourceId)) return false;
  if (preference.craftIds && (!item.sourceCraftId || !preference.craftIds.includes(item.sourceCraftId))) return false;
  if (preference.originRegionIds && !preference.originRegionIds.includes(item.originRegionId)) return false;
  if (
    preference.descriptorIncludes &&
    !preference.descriptorIncludes.some((word) =>
      item.descriptors.some((descriptor) => descriptor.includes(word)) ||
      item.appraisal.includes(word) ||
      item.inscription?.includes(word),
    )
  ) {
    return false;
  }
  return true;
}

function orderResourceName(order: ActiveOrder): string {
  return RESOURCE_INDEX[order.resourceId]?.name ?? order.resourceId;
}

function orderIssue(order: ActiveOrder, state: GameState, content: GameContent): string {
  return orderDeliveryIssue(state, order, content) ?? '';
}

function orderDeadlineLabel(order: ActiveOrder, state: GameState): string {
  if (order.expiresDay === undefined) return '';
  const daysLeft = order.expiresDay - state.calendar.day;
  if (daysLeft < 0) return '已过交期';
  if (daysLeft === 0) return '今日到期';
  return `余 ${daysLeft} 日`;
}

function orderKindLabel(order: ActiveOrder): string {
  if (order.orderKind === 'consignment') return '寄售';
  if (order.orderKind === 'credit') return '信用';
  if (order.orderKind === 'festival') return '节令';
  if (order.orderKind === 'route') return '路线';
  if (order.orderKind === 'palace') return '宫造';
  if (order.orderKind === 'repair') return '修复';
  if (order.orderKind === 'referral') return '荐藏';
  return '';
}

function orderTermsLabel(order: ActiveOrder): string {
  const terms = [];
  const kind = orderKindLabel(order);
  if (kind) terms.push(kind);
  if ((order.depositCoin ?? 0) > 0) terms.push(`押金 ${order.depositCoin} 文`);
  if (order.creditTrustScore !== undefined) terms.push(`信用 ${order.creditTrustScore}`);
  return terms.join(' · ');
}

function craftName(content: GameContent, craftId: string): string {
  return content.crafts.find((craft) => craft.id === craftId)?.name ?? craftId;
}

function mentorCraftHint(content: GameContent, npc: NpcDef): string {
  const specs = (content.craftInteractions ?? []).filter(
    (spec) => spec.mentorNpcIds?.includes(npc.id) || npc.anchorCraftId === spec.craftId,
  );
  if (specs.length === 0) return '';
  return specs
    .map((spec) => {
      const stage = spec.stages[0];
      const defect = [...spec.defects].sort((a, b) => b.severity - a.severity)[0];
      const repair = defect
        ? spec.repairOptions.find((option) => defect.repairOptionIds.includes(option.id))
        : undefined;
      return [
        craftName(content, spec.craftId),
        stage?.name,
        defect ? `防「${defect.label}」` : '',
        repair ? `返修「${repair.label}」` : '',
      ].filter(Boolean).join(' · ');
    })
    .join(' / ');
}

function collabRecipeMatchesItem(recipe: CollabRecipeDef, item: ItemInstance): boolean {
  const hasResourceScope = (recipe.resourceIds?.length ?? 0) > 0;
  const hasCraftScope = (recipe.craftIds?.length ?? 0) > 0;
  if (!hasResourceScope && !hasCraftScope) return true;
  if (hasResourceScope && recipe.resourceIds?.includes(item.resourceId)) return true;
  if (hasCraftScope && item.sourceCraftId && recipe.craftIds?.includes(item.sourceCraftId)) return true;
  return false;
}

function collabRecipeForItem(
  recipes: CollabRecipeDef[] | undefined,
  npcId: string,
  item: ItemInstance,
) {
  return recipes?.find((recipe) => recipe.npcId === npcId && collabRecipeMatchesItem(recipe, item)) ?? null;
}

function resourceCostLabel(cost: ResourcePool | undefined): string {
  return Object.entries(cost ?? {})
    .filter(([, amount]) => amount > 0)
    .map(([resourceId, amount]) => `${RESOURCE_INDEX[resourceId]?.name ?? resourceId}×${amount}`)
    .join('、');
}

function missingResourceLabel(cost: ResourcePool | undefined, state: GameState): string {
  return Object.entries(cost ?? {})
    .filter(([, amount]) => amount > 0)
    .filter(([resourceId, amount]) => (state.resources[resourceId] ?? 0) < amount)
    .map(([resourceId, amount]) => `${RESOURCE_INDEX[resourceId]?.name ?? resourceId}×${amount}`)
    .join('、');
}

function mergeResourceCosts(...costs: Array<ResourcePool | undefined>): ResourcePool | undefined {
  const merged: ResourcePool = {};
  for (const cost of costs) {
    for (const [resourceId, amount] of Object.entries(cost ?? {})) {
      if (amount > 0) merged[resourceId] = (merged[resourceId] ?? 0) + amount;
    }
  }
  return Object.keys(merged).length > 0 ? merged : undefined;
}

function collabChoiceLabel(choice: CollabRecipeChoiceDef | null | undefined): string {
  return choice ? ` · ${choice.label}` : '';
}

function collabRecipeHint(recipe: CollabRecipeDef | null, choice?: CollabRecipeChoiceDef): string {
  if (!recipe) return '';
  const parts = [`${recipe.title}${collabChoiceLabel(choice)}`];
  const minQuality = choice?.minQuality ?? recipe.minQuality;
  if (minQuality !== undefined) parts.push(`品相 ${Math.round(minQuality * 100)}+`);
  const cost = resourceCostLabel(mergeResourceCosts(recipe.requiredResources, choice?.requiredResources));
  if (cost) parts.push(`需 ${cost}`);
  const partnerNames = choice?.partnerNpcIds?.map((npcId) => NPC_INDEX[npcId]?.name ?? npcId).filter(Boolean) ?? [];
  if (partnerNames.length > 0) parts.push(`协同 ${partnerNames.join('、')}`);
  if (choice?.failure) parts.push(`试手 ${Math.round(choice.failure.trialThreshold * 100)}+`);
  if (choice?.desc) parts.push(choice.desc);
  return parts.join(' · ');
}

function homeVisitMatchesItem(visit: HomeVisitDef, item: ItemInstance): boolean {
  if (visit.minQuality !== undefined && itemEffectiveQuality(item) < visit.minQuality) return false;
  if (visit.focusResourceIds?.includes(item.resourceId)) return true;
  if (visit.focusCraftIds && item.sourceCraftId && visit.focusCraftIds.includes(item.sourceCraftId)) return true;
  if (
    visit.descriptorIncludes?.some((word) =>
      item.descriptors.some((descriptor) => descriptor.includes(word)) ||
      item.appraisal.includes(word) ||
      item.inscription?.includes(word) ||
      item.displayName?.includes(word),
    )
  ) {
    return true;
  }
  return !visit.focusResourceIds?.length && !visit.focusCraftIds?.length && !visit.descriptorIncludes?.length;
}

function bestDisplayedItemForVisit(items: ItemInstance[], visit: HomeVisitDef | null): ItemInstance | null {
  return items
    .filter((item) => item.status === 'displayed')
    .filter((item) => !visit || homeVisitMatchesItem(visit, item))
    .sort((a, b) => itemEffectiveQuality(b) - itemEffectiveQuality(a) || b.quality - a.quality || a.createdTurn - b.createdTurn)[0] ?? null;
}

function homeVisitAvailable(state: GameState, visit: HomeVisitDef): boolean {
  const flags = new Set(state.flags);
  if (visit.requiredFlags?.some((flag) => !flags.has(flag))) return false;
  if (visit.blockedFlags?.some((flag) => flags.has(flag))) return false;
  return true;
}

function homeVisitPriority(visit: HomeVisitDef): number {
  return (visit.requiredFlags?.length ?? 0) * 10 + (visit.blockedFlags?.length ?? 0);
}

function homeVisitCandidate(
  visits: HomeVisitDef[] | undefined,
  state: GameState,
  npcId: string,
): { visit: HomeVisitDef | null; item: ItemInstance | null } {
  const displayedItems = state.itemInstances.filter((item) => item.status === 'displayed');
  const candidates = (visits ?? [])
    .filter((visit) => visit.npcId === npcId && homeVisitAvailable(state, visit))
    .map((visit) => ({ visit, item: bestDisplayedItemForVisit(displayedItems, visit) }))
    .filter((candidate): candidate is { visit: HomeVisitDef; item: ItemInstance } => Boolean(candidate.item))
    .sort((a, b) => homeVisitPriority(b.visit) - homeVisitPriority(a.visit) || a.visit.id.localeCompare(b.visit.id));
  if (candidates[0]) return candidates[0];
  return { visit: null, item: bestDisplayedItemForVisit(displayedItems, null) };
}

function homeVisitChoiceHint(
  visit: HomeVisitDef,
  choice: HomeVisitChoiceDef,
  item: ItemInstance,
): string {
  const itemLabel = item.displayName ?? RESOURCE_INDEX[item.resourceId]?.name ?? item.resourceId;
  return `${visit.title} · ${choice.label} · ${itemLabel} · ${choice.desc}`;
}

/**
 * NPC 对话面板：玩家在街上靠近 NPC 按 E 后弹出。
 * - 攀谈：提升好感度（TALK_NPC）；
 * - 任务：展示该 NPC 发布的任务，满足好感门槛+条件可交付（COMPLETE_QUEST）。
 */
export function NpcDialogModal({ npcId, onClose }: { npcId: string | null; onClose: () => void }) {
  const dispatch = useGameStore((s) => s.dispatch);
  const affinityMap = useGameStore((s) => s.state.npcAffinity);
  const npcStates = useGameStore((s) => s.state.npcStates);
  const completed = useGameStore((s) => s.state.completedQuests);
  const state = useGameStore((s) => s.state);
  const content = useGameStore((s) => s.content);

  if (!npcId) return null;
  const npc = NPC_INDEX[npcId];
  if (!npc) return null;

  const affinity = affinityMap[npcId] ?? 0;
  const runtime = npcStates[npcId];
  const quests = questsForNpc(npcId);
  const activeOrders = (state.activeOrders ?? []).filter((order) => order.npcId === npcId && order.status === 'active');
  const stage = runtime?.stage ?? 'stranger';
  const greeting = npc.relationshipLines?.[stage]?.[0] ?? npc.greetings[0] ?? '……';
  const giftCandidates = state.itemInstances
    .filter((item) => item.status !== 'gifted' && item.status !== 'sold' && (state.resources[item.resourceId] ?? 0) > 0)
    .slice(0, 3);
  const functions = npc.functions ?? [];
  const directFunctions = functions.filter((fn) => fn !== 'quest' && !npcFunctionNeedsItem(fn));
  const itemFunctions = functions.filter((fn) => npcFunctionNeedsItem(fn));
  const functionItemCandidates = state.itemInstances.filter((item) => item.status !== 'gifted' && item.status !== 'sold').slice(0, 3);
  const preferences = npc.preferences ?? [];
  const visibleIntel = npc.intel ?? [];
  const revealedIntel = new Set(runtime?.revealedIntelIds ?? []);
  const bestPreferenceFor = (item: (typeof giftCandidates)[number]) =>
    preferences
      .filter((preference) => preferenceMatches(preference, item))
      .sort((a, b) => b.affinityBonus - a.affinityBonus)[0] ?? null;
  const functionDisabledReason = (
    fn: NpcFunctionKind,
    item?: ItemInstance,
    collabChoice?: CollabRecipeChoiceDef,
  ) => {
    const required = npcFunctionRequirement(fn);
    if (affinity < required) return `好感不足：${affinity}/${required}`;
    if (runtime?.usedFunctionDays?.[fn] === state.calendar.day) return '今日已使用';
    if (fn === 'escort' && state.pendingEscortCrisis) return '护商危机待决';
    if (fn === 'escort' && (state.resources.labor ?? 0) < 2) return '工时不足：2';
    if (fn === 'spar' && (state.resources.labor ?? 0) < 1) return '工时不足：1';
    if (npcFunctionNeedsItem(fn) && !item) return '需要选择作品';
    if (fn === 'collab' && item) {
      const recipe = collabRecipeForItem(content.collabRecipes, npcId, item);
      const minQuality = collabChoice?.minQuality ?? recipe?.minQuality;
      if (minQuality !== undefined && itemEffectiveQuality(item) < minQuality) {
        return `有效品相不足：${Math.round(itemEffectiveQuality(item) * 100)}/${Math.round(minQuality * 100)}`;
      }
      const missing = missingResourceLabel(
        recipe ? mergeResourceCosts(recipe.requiredResources, collabChoice?.requiredResources) : undefined,
        state,
      );
      if (missing) return `缺少材料：${missing}`;
    }
    return '';
  };

  return (
    <div className="modal__backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal__title">
          {npc.name}{' '}
          <small style={{ fontSize: 12, color: 'var(--indigo-soft)' }}>
            {npc.profession ?? (npc.role === 'vendor' ? '关联人物' : '游客')}
          </small>
        </h3>
        <p className="modal__desc">“{greeting}”</p>
        <div className="npc-profile-strip">
          <span>关系：{STAGE_LABEL[stage]}</span>
          <span>交谈：{runtime?.talks ?? 0} 次</span>
          {npc.personality && <span>性格：{npc.personality}</span>}
        </div>

        <div className="npc-affinity">
          <span className="npc-affinity__label">好感度</span>
          <div className="npc-affinity__bar">
            <div className="npc-affinity__fill" style={{ width: `${affinity}%` }} />
          </div>
          <span className="npc-affinity__num">{affinity}/100</span>
        </div>

        {(functions.length > 0 || preferences.length > 0 || npc.personalDilemma) && (
          <div className="npc-quests npc-profile-card">
            <h4 className="npc-quests__title">人物线</h4>
            {functions.length > 0 && (
              <div className="npc-tag-row">
                {functions.map((fn) => (
                  <span className="npc-tag" key={fn}>{NPC_FUNCTION_LABELS[fn]}</span>
                ))}
              </div>
            )}
            {npc.personalDilemma && <p className="npc-quest__desc">{npc.personalDilemma}</p>}
            {preferences.length > 0 && (
              <p className="npc-quest__req">
                偏好：{preferences.map((preference) => preference.label).join(' / ')}
              </p>
            )}
          </div>
        )}

        {visibleIntel.length > 0 && (
          <div className="npc-quests npc-intel">
            <h4 className="npc-quests__title">地方见闻</h4>
            {visibleIntel.map((intel) => {
              const unlocked = revealedIntel.has(intel.id) || affinity >= intel.unlockAffinity;
              return (
                <div className={`npc-quest ${unlocked ? '' : 'npc-quest--locked'}`} key={intel.id}>
                  <div className="npc-quest__head">
                    <span className="npc-quest__name">{unlocked ? intel.title : '未熟络的线索'}</span>
                    <span className="npc-quest__done">好感 {intel.unlockAffinity}</span>
                  </div>
                  <p className="npc-quest__desc">
                    {unlocked ? intel.body : '继续攀谈、赠予合适作品后，他/她才会细说。'}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {(directFunctions.length > 0 || itemFunctions.length > 0) && (
          <div className="npc-quests npc-actions">
            <h4 className="npc-quests__title">功能行动</h4>
            {directFunctions.length > 0 && (
              <div className="npc-action-row">
                {directFunctions.map((fn) => {
                  if (fn === 'homeVisit') {
                    const candidate = homeVisitCandidate(content.homeVisits, state, npcId);
                    if (candidate.visit?.choices?.length && candidate.item) {
                      return candidate.visit.choices.map((choice) => {
                        const disabledReason = functionDisabledReason(fn);
                        return (
                          <button
                            className="btn btn--bamboo btn--sm"
                            disabled={!!disabledReason}
                            key={`${fn}-${choice.id}`}
                            title={disabledReason || homeVisitChoiceHint(candidate.visit!, choice, candidate.item!)}
                            onClick={() =>
                              dispatch({
                                type: 'USE_NPC_FUNCTION',
                                npcId,
                                functionKind: fn,
                                homeVisitChoiceId: choice.id,
                              })
                            }
                          >
                            {choice.label}
                          </button>
                        );
                      });
                    }
                  }
                  const disabledReason = functionDisabledReason(fn);
                  const mentorHint = fn === 'mentor' ? mentorCraftHint(content, npc) : '';
                  return (
                    <button
                      className="btn btn--bamboo btn--sm"
                      disabled={!!disabledReason}
                      key={fn}
                      title={disabledReason || mentorHint || `请「${npc.name}」${NPC_FUNCTION_LABELS[fn]}`}
                      onClick={() => dispatch({ type: 'USE_NPC_FUNCTION', npcId, functionKind: fn })}
                    >
                      {NPC_FUNCTION_LABELS[fn]}
                    </button>
                  );
                })}
              </div>
            )}
            {itemFunctions.map((fn) => (
              <div className="npc-action-targets" key={fn}>
                <div className="npc-quest__head">
                  <span className="npc-quest__name">{NPC_FUNCTION_LABELS[fn]}</span>
                  <span className="npc-quest__done">好感 {npcFunctionRequirement(fn)}</span>
                </div>
                {functionItemCandidates.length === 0 ? (
                  <p className="npc-quest__desc">暂无可交给对方查看的作品。</p>
                ) : (
                  <div className="npc-action-row">
                    {functionItemCandidates.map((item) => {
                      const recipe = fn === 'collab' ? collabRecipeForItem(content.collabRecipes, npcId, item) : null;
                      const itemLabel = item.displayName ?? RESOURCE_INDEX[item.resourceId]?.name ?? item.resourceId;
                      if (fn === 'collab' && recipe?.choices?.length) {
                        return recipe.choices.map((choice) => {
                          const disabledReason = functionDisabledReason(fn, item, choice);
                          const recipeHint = collabRecipeHint(recipe, choice);
                          return (
                            <button
                              className="btn btn--ghost btn--sm"
                              disabled={!!disabledReason}
                              key={`${fn}-${item.id}-${choice.id}`}
                              title={disabledReason || recipeHint || item.appraisal}
                              onClick={() =>
                                dispatch({
                                  type: 'USE_NPC_FUNCTION',
                                  npcId,
                                  functionKind: fn,
                                  itemId: item.id,
                                  collabChoiceId: choice.id,
                                })
                              }
                            >
                              {`${itemLabel.slice(0, 6)} · ${choice.label}`}
                            </button>
                          );
                        });
                      }
                      const disabledReason = functionDisabledReason(fn, item);
                      const recipeHint = collabRecipeHint(recipe);
                      return (
                        <button
                          className="btn btn--ghost btn--sm"
                          disabled={!!disabledReason}
                          key={`${fn}-${item.id}`}
                          title={disabledReason || recipeHint || item.appraisal}
                          onClick={() =>
                            dispatch({ type: 'USE_NPC_FUNCTION', npcId, functionKind: fn, itemId: item.id })
                          }
                        >
                          {itemLabel.slice(0, 8)}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {activeOrders.length > 0 && (
          <div className="npc-quests npc-orders">
            <h4 className="npc-quests__title">接单</h4>
            {activeOrders.map((order) => {
              const issue = orderIssue(order, state, content);
              const canDeliver = !issue;
              const stock = state.resources[order.resourceId] ?? 0;
              const deadline = orderDeadlineLabel(order, state);
              const terms = orderTermsLabel(order);
              return (
                <div className="npc-quest" key={order.id}>
                  <div className="npc-quest__head">
                    <span className="npc-quest__name">{order.title}</span>
                    <span className="npc-quest__done">{order.rewardCoin} 文</span>
                  </div>
                  <p className="npc-quest__desc">{order.desc}</p>
                  {issue && (
                    <p className="npc-quest__issue" data-smoke={`npc-order-issue:${order.id}`}>
                      {issue}
                    </p>
                  )}
                  <div className="npc-quest__foot">
                    <span className="npc-quest__req">
                      需 {orderResourceName(order)} {stock}/{order.quantity}
                      {` · 品相 ${Math.round(order.minQuality * 100)}+`}
                      {order.routeRisk !== undefined ? ` · 路险 ${routeRiskLabel(order.routeRisk)}` : ''}
                      {deadline ? ` · ${deadline}` : ''}
                      {terms ? ` · ${terms}` : ''}
                    </span>
                    <button
                      className="btn btn--bamboo btn--sm"
                      disabled={!canDeliver}
                      title={canDeliver ? '交付订单' : issue}
                      onClick={() => dispatch({ type: 'FULFILL_ORDER', orderId: order.id })}
                    >
                      交付
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {quests.length > 0 && (
          <div className="npc-quests">
            <h4 className="npc-quests__title">委托</h4>
            {quests.map((q) => {
              const done = completed.includes(q.id);
              const affinityOk = affinity >= q.requireAffinity;
              const condOk = q.condition(state);
              const canDeliver = !done && affinityOk && condOk;
              return (
                <div className="npc-quest" key={q.id}>
                  <div className="npc-quest__head">
                    <span className="npc-quest__name">{q.title}</span>
                    {done && <span className="npc-quest__done">已完成</span>}
                  </div>
                  <p className="npc-quest__desc">{q.desc}</p>
                  <div className="npc-quest__foot">
                    <span className="npc-quest__req">
                      需好感 {q.requireAffinity}
                      {q.reward.coin ? ` · 赏 ${q.reward.coin} 文` : ''}
                    </span>
                    {!done && (
                      <button
                        className="btn btn--bamboo btn--sm"
                        disabled={!canDeliver}
                        title={
                          !affinityOk
                            ? `好感不足（${affinity}/${q.requireAffinity}）`
                            : !condOk
                              ? '交付条件尚未达成'
                              : '交付领赏'
                        }
                        onClick={() => dispatch({ type: 'COMPLETE_QUEST', questId: q.id })}
                      >
                        交付
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {giftCandidates.length > 0 && (
          <div className="npc-quests npc-gifts">
            <h4 className="npc-quests__title">赠礼</h4>
            {giftCandidates.map((item) => {
              const preference = bestPreferenceFor(item);
              return (
                <div className="npc-quest" key={item.id}>
                  <div className="npc-quest__head">
                    <span className="npc-quest__name">
                      {item.displayName ?? RESOURCE_INDEX[item.resourceId]?.name ?? item.resourceId}
                    </span>
                    <span className="npc-quest__done">{preference?.label ?? ITEM_STATUS_LABEL[item.status ?? 'held']}</span>
                  </div>
                  <p className="npc-quest__desc">
                    品相 {Math.round(item.quality * 100)}
                    {item.defects?.length ? ` · 有效 ${Math.round(itemEffectiveQuality(item) * 100)} · ${itemDefectSummary(item)}` : ''}
                    {item.inscription ? ` · 题跋：${item.inscription}` : ` · ${item.appraisal}`}
                  </p>
                  <div className="npc-quest__foot">
                    <span className="npc-quest__req">
                      {RESOURCE_INDEX[item.resourceId]?.name ?? item.resourceId}
                      {item.authorName ? ` · 作者 ${item.authorName}` : ''}
                    </span>
                    <button
                      className="btn btn--bamboo btn--sm"
                      onClick={() => dispatch({ type: 'GIFT_ITEM', itemId: item.id, npcId })}
                    >
                      赠予
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="btn-row">
          <button
            className="btn btn--bamboo"
            disabled={affinity >= 100}
            onClick={() => dispatch({ type: 'TALK_NPC', npcId })}
          >
            攀谈{affinity >= 100 ? '（已至交）' : ' +好感'}
          </button>
          <button className="btn btn--ghost" onClick={onClose}>
            告辞
          </button>
        </div>
      </div>
    </div>
  );
}
