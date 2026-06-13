# 主轴 NPC 订单反馈链记录

更新时间：2026-06-14

## 本轮目标

把当前优先版验收中的“主轴五区每区至少一条 NPC/订单反馈链”落成程序端自动化烟测，避免只停留在 NPC 数据存在、任务文本存在的层面。

## 已实现

新增 `src/engine/__tests__/priorityNpcOrderFlow.test.ts`。

测试覆盖五个主轴锚点地区：

| 地区 | 订单 NPC | 覆盖内容 |
| --- | --- | --- |
| 江南 | `jn-qiao-zhaoye` | 灯市人物订单反馈 |
| 巴蜀 | `bs-zhuo-jinniang` | 蜀锦主轴人物订单反馈 |
| 岭南 | `ln-wu-haichao` | 海贸/船期人物订单反馈 |
| 赣鄱 | `gp-wen-yaotou` | 窑镇主轴人物订单反馈 |
| 西域 | `xu-a-yue` | 玉作主轴人物订单反馈 |

每个用例都会真实执行：

1. 校验该 NPC 属于当前优先版主轴地区，并在 `PRIORITY_SCOPE_REQUIREMENTS.requiredNpcIds` 中登记。
2. 校验该 NPC 具备 `order` 功能入口。
3. 调用 `USE_NPC_FUNCTION` 生成真实 `ActiveOrder`。
4. 补齐订单所需资源后调用 `FULFILL_ORDER`。
5. 校验订单完成、资源消耗、赏钱到账、NPC 好感提升、地区声望提升。
6. 校验写入 `npc-order:<npcId>`、`order-completed:<orderId>`、`npc-order-completed:<npcId>`。
7. 若订单携带路线信息，校验交付后写入 `route-known:<routeId>`。

## 设计结论

- 主轴五区现在都有可跑通的 NPC 订单反馈链，满足“完成工艺或活动后产生作品/订单/关系变化”的程序验收基础。
- 本轮不追加新的长篇人物线文本，避免扩大内容端审核范围；先把订单行为、关系反馈和数据守卫稳定下来。
- 后续若更换主轴 NPC 或调整 `requiredNpcIds`，必须同步更新该测试，确保每个锚点地区仍然至少保留一条真实可交付订单链。

## 当前验证

已通过：

- `npm test -- priorityNpcOrderFlow priorityScope`

提交前继续执行：

- `npm run typecheck`
- `npm test`
- `npm run build`
