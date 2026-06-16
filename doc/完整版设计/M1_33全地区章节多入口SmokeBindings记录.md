# M1.33 全地区章节多入口 SmokeBindings 记录

日期：2026-06-16

## 节点目标

本节点按 M1 固定 6 团队配置推进，目标是把江南 M1.28 的 `smokeBindings` 模式推广到其余 10 个地区，并把覆盖要求提升为程序守卫。

本节点不处理美术资源替换，不新增正式移动捷径；`smokeSubregion` 仍只作为 DEV / QA 起点。

## 六团队分工

| 团队 | 范围 | 结果 |
| --- | --- | --- |
| 1 集成与结构 | 审计 `RegionChapterSmokeBinding`、章节测试和 `buildRegionChapterAudit` | 确认原守卫能抓坏绑定，但不能抓缺绑定；建议新增覆盖 gap。 |
| 2 江南 / 巴蜀 | 江南参考与巴蜀绑定 | 江南无需改动；巴蜀 4 入口绑定草案通过。 |
| 3 岭南 / 黔滇 | 岭南、黔滇绑定 | 岭南 4 入口、黔滇 3 入口绑定草案通过。 |
| 4 荆楚 / 赣鄱 / 徽州 | 中线三地绑定 | 荆楚 4 入口、赣鄱 3 入口、徽州 4 入口绑定草案通过。 |
| 5 京畿 / 三晋 / 雪域 / 西域 | 北线四地绑定 | 京畿 3 入口、三晋 4 入口、雪域 4 入口、西域 4 入口绑定草案通过。 |
| 6 QA 与浏览器 | 测试矩阵与浏览器风险 | 建议聚焦 `regionChapters`、DEV smoke、章节审计、full-scope、地图入口和导航测试；浏览器抽测留到全量收尾。 |

## 程序落点

### 数据覆盖

- `REGION_CHAPTERS` 现在共有 43 条 `smokeBindings`，覆盖 43/43 个章节入口小地区。
- 江南保留原 6 条绑定。
- 非江南新增 37 条绑定：
  - 巴蜀 4 条。
  - 岭南 4 条。
  - 黔滇 3 条。
  - 荆楚 4 条。
  - 赣鄱 3 条。
  - 徽州 4 条。
  - 京畿 3 条。
  - 三晋 4 条。
  - 雪域 4 条。
  - 西域 4 条。

所有新增绑定均记录：

- `entrySubregionId`
- `activityIds`
- `craftIds`
- `npcIds`
- `routeIds`
- `requiresRuntimeLayout`
- 对应正式路线的 `routeLandingCases`

绑定中的工艺只允许同时满足两层条件：属于章节 `playPillars.craftIds`，且属于该入口 `SUBREGION_CONTENT.craftIds`。因此本轮刻意不把 `xiabu`、`hui-carving`、`jianshui-pottery`、`canton-embroidery` 等“本地有但章节未声明”的工艺塞入章节 smoke 绑定。

### 审计守卫

- `buildRegionChapterAudit` 新增 `smokeBindingCoverageGaps`。
- 审计现在能暴露：
  - 缺少 `smokeBindings`。
  - 入口小地区未被绑定。
  - 重复绑定同一入口。
  - 绑定缺活动 / 工艺 / NPC。
  - 绑定活动、工艺、NPC 与入口小地区不一致。
  - 绑定路线不属于章节路线。
  - 章节正式路线缺少 binding 级 route landing case。
- `readiness` 现在会在覆盖 gap 存在时转为 `invalid`，不再允许“引用都存在但入口覆盖缺失”的章节静默通过。

### 测试守卫

- `regionChapters.test.ts` 固定 43/43 入口覆盖，并逐章校验 route landing case。
- `regionChapterAudit.test.ts` 固定 43 条审计计数，并新增缺绑定 fixture。
- `regionChapterSmokeScenarios.test.ts` 从江南 6 入口扩展为全地区 43 入口驱动。
- `regionChapterNavigation.test.ts` 从 `smokeBindings.routeLandingCases` 生成绑定级正式 gate 落点用例。
- `fullScopeAudit.test.ts` 移除 `smokeBindings` 作为 M1 待办动作的口径。

## 当前结论

M1/F3 “非江南多入口 `smokeBindings`”已关闭。后续 M1 剩余工作不再包含多入口绑定本身，而是继续推进：

- 6 个 `needs-expansion` 章节的人物回访、订单差异、材料反馈和经济统计。
- ready 地区的内容密度补线。
- M3 长局经济压力测试。
- 最终浏览器 QA 与美术资源接入后的程序复验。

## 验证

已通过：

- `npm test -- --run src/data/__tests__/regionChapters.test.ts src/dev/__tests__/regionChapterSmokeScenarios.test.ts src/engine/__tests__/regionChapterAudit.test.ts src/engine/__tests__/fullScopeAudit.test.ts src/data/__tests__/regionChapterMapEntrypoints.test.ts src/data/__tests__/priorityMapLayoutEntrypoints.test.ts src/game/__tests__/regionSpec.test.ts src/game/__tests__/regionChapterNavigation.test.ts src/game/__tests__/navigationEntrypoints.test.ts`
  - 9 个测试文件。
  - 212 项用例。

全量收口已通过：

- `npm run typecheck`。
- `npm test`：37 个测试文件、535 项用例通过。
- `npm run build`：通过，保留既有 Vite 大 chunk 提醒。

浏览器 smoke 已通过：

- 本轮 Vite 因 5173 已被旧进程占用，自动使用 `http://127.0.0.1:5174/`。
- `?chapterSmoke=chapter-bashu-tea-horse-brocade&smokeSubregion=bashu-tea-horse`：页面挂载、canvas 存在，`巴蜀 · 茶马驿` 可见，控制台 error/warn 为 0。
- `?chapterSmoke=chapter-huizhou-paper-merchant&smokeSubregion=huizhou-merchant-hall`：页面挂载、canvas 存在，`徽州 · 徽商会馆` 可见，控制台 error/warn 为 0。
- `?chapterSmoke=chapter-xiyu-bazaar-caravan&smokeSubregion=xiyu-caravan-post`：页面挂载、canvas 存在，`西域 · 驼队驿站` 可见，控制台 error/warn 为 0。
