# M1.3 独立章节 Smoke 入口记录

日期：2026-06-14

## 节点目标

M1.3 关闭 M1 后续动作中的“独立章节 smoke 入口”项。目标是让完整版 11 区章节拥有自己的开发态 smoke registry、状态构造器和浏览器入口，不再继续把完整版章节验证塞进当前优先版 `prioritySmokeScenarios`。

执行依据：[程序大型化协作指引.md](程序大型化协作指引.md)、[M1全地区核心章节入库记录.md](M1全地区核心章节入库记录.md) 与 [M1_2路线落点与章节导航守卫记录.md](M1_2路线落点与章节导航守卫记录.md)。

## 协作团队

按 M1 固定团队数继续启用 6 个只读审计团队。

| 团队 | 代号 | 范围 | 关键结论 |
| --- | --- | --- | --- |
| 1 集成与结构 | Ptolemy | smoke registry、store、App | 新增 dev-only 章节 smoke 入口，保持旧 `?smoke=` 兼容。 |
| 2 江南 / 巴蜀 | Popper | 江南、巴蜀章节入口 | 单入口 MVP 可先覆盖金陵/茶马驿；多入口绑定后续补百工院、龙泉、竹海、锦里。 |
| 3 岭南 / 黔滇 | Bernoulli | 岭南、黔滇章节入口 | 岭南需同时表达香云纱与骑楼夜市；黔滇需拆苗银和茶马路线入口。 |
| 4 荆楚 / 赣鄱 / 徽州 | Einstein | 水路、窑火、文房入口 | 三地应把工艺入口和商路入口分开记录；当前先验证主活动/路线落点。 |
| 5 京畿 / 三晋 / 雪域 / 西域 | Averroes | 宫造、票号、高原、丝路入口 | 多段绑定是后续正确形态；本轮先把单入口章节 smoke 跑通。 |
| 6 QA 与浏览器 | Gauss | 测试、构建、浏览器 smoke | 需要独立 Vitest、全量回归、typecheck、build 和内置浏览器短 smoke。 |

## 本轮程序落点

1. `src/dev/regionChapterSmokeScenarios.ts`
   - 新增 `RegionChapterSmokeScenario`。
   - 新增 `REGION_CHAPTER_SMOKE_SCENARIOS`，11 个章节各 1 个独立 smoke ID。
   - 新增 `buildRegionChapterSmokeState`，构造 DEV 内存态：全地区解锁、资源充足、章节起点、路线 flag、章节 lore target、NPC 好感与路线稳定度。
2. `src/data/regionChapters.ts`
   - `smokeScenarioIds` 从旧 priority smoke ID 切到独立章节 smoke ID。
3. `src/store/gameStore.ts`
   - 新增 `loadRegionChapterSmokeScenario`，继续使用 `smokeMode=true`，不写真实存档。
4. `src/App.tsx`
   - 新增 DEV 查询参数 `?chapterSmoke=<scenarioId>`。
   - 同时兼容 `?smoke=chapter-...`，旧 `?smoke=jiangnan` 等 priority smoke 保持可用。
   - 当 `chapterSmoke` 与 `smoke` 同时存在时，章节 smoke 优先。
5. 测试
   - `src/dev/__tests__/regionChapterSmokeScenarios.test.ts` 新增 45 项用例。
   - `regionChapters.test.ts` 和 `regionChapterAudit.test.ts` 改用独立章节 smoke registry。

## 场景矩阵

| smoke ID | 地区 | 起点小地区 | 主活动 | 工艺 | NPC | 路线 |
| --- | --- | --- | --- | --- | --- | --- |
| `chapter-jiangnan-baigong-homecoming` | 江南 | `jiangnan-jinling` | `jn-qinhuai-lantern` | `longquan-sword` | `jn-fang-jiheng` | `route-jiangnan-huizhou-paper` |
| `chapter-bashu-tea-horse-brocade` | 巴蜀 | `bashu-tea-horse` | `bs-tea-horse-post` | `shu-brocade` | `bs-mabang-ayue` | `route-bashu-qiandian-tea-horse` |
| `chapter-lingnan-harbor-gambiered` | 岭南 | `lingnan-harbor` | `ln-qilou-night-market` | `gambiered-silk` | `ln-wu-haichao` | `route-qiandian-lingnan-harbor` |
| `chapter-qiandian-silver-tea-road` | 黔滇 | `qiandian-tea-road` | `qd-tea-horse-road` | `miao-silver` | `qd-mu-luozi` | `route-bashu-qiandian-tea-horse` |
| `chapter-jingchu-ferry-lacquer` | 荆楚 | `jingchu-lake-market` | `jc-ferry-market` | `chu-lacquer` | `jc-qinglu` | `route-jingchu-ganpo-lake` |
| `chapter-ganpo-kiln-firewood` | 赣鄱 | `ganpo-kiln-town` | `gp-kiln-opening-fair` | `jingdezhen-porcelain` | `gp-wen-yaotou` | `route-jiangnan-ganpo-kiln` |
| `chapter-huizhou-paper-merchant` | 徽州 | `huizhou-merchant-hall` | `hz-merchant-hall` | `xuan-paper` | `hz-cheng-yuanzhou` | `route-ganpo-huizhou-merchant` |
| `chapter-jingji-palace-procurement` | 京畿 | `jingji-official-gate` | `jj-official-gate` | `cloisonne` | `jj-song-yasi` | `route-jiangnan-jingji-canal` |
| `chapter-sanjin-piaohao-lacquer` | 三晋 | `sanjin-piaohao` | `sj-piaohao` | `pingyao-lacquer` | `sj-lei-zhanggui` | `route-jingji-sanjin-official` |
| `chapter-xueyu-thangka-snowpass` | 雪域 | `xueyu-snow-pass` | `xy-snow-pass` | `thangka` | `xy-yak-captain` | `route-bashu-xueyu-snow-pass` |
| `chapter-xiyu-bazaar-caravan` | 西域 | `xiyu-caravan-post` | `xiyu-caravan-post` | `jade-carving` | `xu-sali` | `route-xueyu-xiyu-caravan` |

## 当前限制

本轮为单入口 MVP。它证明每章已有独立 smoke 状态和一条 activity/craft/NPC/route 可运行链，但还未表达同一章节内多个入口的完整覆盖。

后续 M1 加厚时应新增 `smokeBindings` 或同等结构，记录：

- `entrySubregionId`
- `activityIds`
- `craftIds`
- `npcIds`
- `routeIds`
- `requiresRuntimeLayout`
- `missingLayoutSubregionIds`
- `routeLandingCases`

这会让江南百工院/龙泉/金陵、巴蜀锦里/竹海/茶马、雪域唐卡院/雪口等多入口章节被同一 smoke 矩阵完整覆盖。

## 验证

已通过：

- `npm test -- --run src/dev/__tests__/regionChapterSmokeScenarios.test.ts src/data/__tests__/regionChapters.test.ts src/engine/__tests__/regionChapterAudit.test.ts src/game/__tests__/regionChapterNavigation.test.ts`：4 个测试文件、81 项用例通过。

- `npm run typecheck`：通过。
- `npm test`：30 个测试文件、396 项用例通过。
- `npm run build`：通过，保留既有 Vite 大 chunk 提醒。
- 内置浏览器短 smoke：
  - `?chapterSmoke=chapter-jiangnan-baigong-homecoming` 可进入 `江南 · 金陵城`，HUD/章节目标/Canvas 节点正常，控制台无 error/warn。
  - 江南镇务面板 `data-smoke="region-activity:jn-qinhuai-lantern"` 唯一且可用；完成三轮挑战与 `灯谜茶席` 策略选择后，`完成体验` 从禁用转为可用并结算成功。
  - `?chapterSmoke=chapter-qiandian-silver-tea-road` 可进入 `黔滇 · 茶马驿道`，`qd-tea-horse-road` 活动入口唯一且可用，控制台无 error/warn。
  - `?chapterSmoke=chapter-xiyu-bazaar-caravan` 可进入 `西域 · 驼队驿站`，`xiyu-caravan-post` 活动入口唯一且可用，控制台无 error/warn。

浏览器截图采集接口本轮两次 `Page.captureScreenshot` 超时，未留下截图制品；已改用 DOM、Canvas 尺寸、稳定 `data-smoke` 入口点击和控制台日志作为本轮功能 smoke 证据。

## 当前判断

M1 已关闭三个结构项：章节数据契约、路线落点/章节导航、独立章节 smoke。剩余 M1 主缺口转为内容加厚：`needs-expansion` 章节真实订单链、关键人工地图 JSON，以及多入口 smokeBindings。
