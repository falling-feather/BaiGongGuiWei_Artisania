# M1.28 江南章节多入口 SmokeBindings 记录

日期：2026-06-16

## 节点目标

M1.27 已关闭江南蓝染 / 竹编专属工艺深度，本节点继续关闭江南剩余程序缺口中的“章节多入口 smokeBindings”。

本轮不新增美术资源、不改地图点位、不改变正式移动路线。江南六个小地区仍通过街景 gate / 区内通道到达，`smokeSubregion` 只作为 DEV 浏览器 QA 起点；总览地图仍只提供调试与路线提示，不作为正式迁移方式。

## 协作口径

- `doc/完整版设计/程序大型化协作指引.md` 的 M1 口径要求固定 6 团队。
- 但用户在本轮前明确指出侧栏子智能体过多，并要求关闭不用的智能体；当前工具无法按昵称批量关闭 UI 清单，只能按内部 id 关闭。
- 为避免继续制造空转会话，本轮不新增子智能体，改由主线程完成结构实现、交叉测试与文档同步；文档不虚构“已启动 6 团队”。
- 本轮把协作风险转为更严格的自动化覆盖：数据结构校验、DEV smoke 状态驱动、章节审计计数、full-scope 缺口回归和内置浏览器 smoke。

## 程序落点

新增章节 smoke 绑定结构：

- `RegionChapterSmokeRouteLandingCase`：记录章节内正式 route 的本区落点。
- `RegionChapterSmokeBinding`：记录 `entrySubregionId`、`activityIds`、`craftIds`、`npcIds`、`routeIds`、`requiresRuntimeLayout`、`missingLayoutSubregionIds`、`routeLandingCases` 与备注。
- `RegionChapterSpec.smokeBindings`：作为章节数据契约的一部分，不放在测试夹具中。
- `buildRegionChapterAudit` 增加 `counts.smokeBindings`，并把 smoke binding 的活动、工艺、NPC、路线和落点纳入未知引用审计。

江南六入口已落入 `chapter-jiangnan-baigong-homecoming.smokeBindings`：

| 入口 | 覆盖内容 |
| --- | --- |
| `jiangnan-suhang` | 蓝染、竹编、阿蓝、周伯、江南纸墨路 / 江南窑柴河路落点。 |
| `jiangnan-jinling` | 秦淮灯市、金箔作、兰溪竹林、宁辞秋、顾薄金、乔照夜、运河北上路落点。 |
| `jiangnan-linan` | 湖畔茶肆、油纸伞铺、油纸伞、苏小茶、林雨桥、方季衡。 |
| `jiangnan-longquan` | 龙泉剑炉、青瓷窑、龙泉剑、青瓷、陆寒泉、叶青盏。 |
| `jiangnan-taihu` | 云锦局、缂丝、油纸伞协作、沈云梭。 |
| `jiangnan-baigongyuan` | 百工院田圃、蓝染 / 竹编家园入口、小满。 |

同步章节口径：

- 江南章节工艺柱补入 `jn-gold-leaf-shop`，生活柱补入 `jn-lanxi-orchid`，避免 smoke binding 引用已存在但未入章节柱的金陵活动。
- `REGION_CHAPTERS` 江南 `nextActions` 移除“补江南章节多入口 smokeBindings”。
- `FULL_SCOPE_REGION_REQUIREMENTS.jiangnan.m1Actions` 移除同一旧缺口。
- 江南当前程序剩余项收敛为“灯市后续单关系读数”和最终美术摆位；黔滇本地蓝染 / 蜡染语境仍单列后续内容端缺口。

## 测试守卫

扩展 `src/data/__tests__/regionChapters.test.ts`：

- 所有 `smokeBindings` 的 `entrySubregionId` 必须属于章节入口小地区。
- `requiresRuntimeLayout` 为真时必须有运行时地图。
- 活动必须属于同地区且落在绑定小地区。
- 工艺必须存在、属于章节工艺柱，并出现在绑定小地区的 `SUBREGION_CONTENT`。
- NPC 必须存在、属于同地区且落在绑定小地区。
- route 必须存在、属于章节路线柱，route landing case 必须等于正式 `REGION_ROUTES.landingSubregionIds`。
- 江南 M1.28 冻结为 6 条绑定，并防止旧 `补江南章节多入口 smokeBindings` 待办回流。

扩展 `src/dev/__tests__/regionChapterSmokeScenarios.test.ts`：

- 对江南六条 `smokeBindings` 逐条调用 `buildRegionChapterSmokeState(content, chapterId, { subregionId })`。
- 逐条确认 `trackedLoreEntryId`、`buildRegionSpec`、活动、工艺、NPC 和 route gate 可见。
- 每条绑定至少尝试执行首个工艺、首个活动和首个 NPC 对话，证明不是静态字段。

扩展 `src/engine/__tests__/regionChapterAudit.test.ts`：

- 江南章节审计行 `counts.smokeBindings` 固定为 6。
- 所有 smoke binding 未知引用必须为空。

已通过聚焦验证：

- `npm test -- --run src/data/__tests__/regionChapters.test.ts src/dev/__tests__/regionChapterSmokeScenarios.test.ts src/engine/__tests__/regionChapterAudit.test.ts src/engine/__tests__/fullScopeAudit.test.ts`：4 个测试文件、76 项用例通过。
- `npm test -- --run src/data/__tests__/regionChapters.test.ts src/dev/__tests__/regionChapterSmokeScenarios.test.ts src/engine/__tests__/regionChapterAudit.test.ts src/engine/__tests__/fullScopeAudit.test.ts src/data/__tests__/regionChapterMapEntrypoints.test.ts src/game/__tests__/regionChapterNavigation.test.ts src/game/__tests__/navigationEntrypoints.test.ts src/game/__tests__/regionSpec.test.ts`：8 个测试文件、139 项用例通过。
- `npm test`：36 个测试文件、503 项用例通过。
- `npm run typecheck`：通过。
- `npm run build`：通过，保留既有 Vite 大 chunk 提醒。

内置浏览器 smoke 已通过：

- 依次打开 `?chapterSmoke=chapter-jiangnan-baigong-homecoming&smokeSubregion=jiangnan-suhang / jiangnan-jinling / jiangnan-linan / jiangnan-longquan / jiangnan-taihu / jiangnan-baigongyuan&qaSeason=spring&qaWeather=clear`。
- 六入口镇务面板均显示对应核心内容：苏杭蓝染 / 竹编，金陵秦淮灯市 / 金箔作 / 兰溪竹林，临安湖畔茶肆 / 油纸伞铺，龙泉剑炉 / 青瓷窑，太湖云锦局 / 缂丝，百工院田圃 / 蓝染 / 竹编。
- 控制台 error/warn 为空。
- 大地图红线验证通过：从城郊百工院打开大地图并点击 `徽州`，当前位置仍为 `江南 · 城郊百工院`，界面提示正式迁移需回到场景出入口或商路节点按 E。

## 后续缺口

- 秦淮灯市：后续单还可继续强化作品状态与 NPC 关系读数。
- 黔滇：苗寨 `indigo-dyeing` 暂不误用江南规则，后续应单独补黔滇扎染 / 蜡染人物回访或将苗寨蓝染规格转入本地语境。
- 最终美术：江南六入口的建筑、NPC 站位、道具陈设和精确点位仍留美术 / 地图精修阶段。
