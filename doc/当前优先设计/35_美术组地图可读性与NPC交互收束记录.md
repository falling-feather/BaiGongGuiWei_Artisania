# 美术组地图可读性与 NPC 交互收束记录

日期：2026-06-17

## 本轮目标

- 优先处理地图直接显示效果，地图编辑器同步暂缓。
- 修正主轴地区地貌瓦片过碎、过噪、误剪元素混入的问题。
- 拆分 NPC 前置对白后的二级交互页，避免交流、送礼、互动、委托混成一个长弹窗。

## 地貌瓦片处理

- 处理脚本：`tools/package_region_terrain_tiles.py`
- 输出目录：`public/assets/game/terrain/regions/<region>/`
- Manifest：`public/assets/art_sources/priority_art/2026-06-14/05_manifests/region_terrain_tiles_manifest.json`
- 瓦片预览：`public/assets/art_sources/priority_art/2026-06-14/05_manifests/region_terrain_tiles_preview.png`

本轮没有继续从旧碎石裁片硬铺。脚本改为对 imagegen 街景条进行保守后处理：中值降噪、低对比归一、目标亮度校正、重新量化为运行瓦片。江南地面从湿蓝灰碎石切换为浅铺面，岭南道路避开水面误裁，江南植被裁片移除了木桶/杂物误剪。

运行时铺设同步收束：地区地貌不再随机把植被瓦片当作底面，路边边界改用院落/少量植被组合，降低满屏噪声。

## NPC 交互页

- 接入文件：`src/components/NpcDialogModal.tsx`
- 样式文件：`src/index.css`
- 前置对白：保留 NPC 精细半身像、关系/好感/性格与五个选择入口。
- 二级页面：拆为 `交流`、`送礼`、`互动`、`委托` 四个页签。
- 交流页新增内容：寒暄近况、人物线、地方见闻、攀谈按钮、中文知识标签。
- 送礼/互动/委托页只显示对应内容，并补充空态提示。

## QA

- 江南地图可读性截图：`public/assets/art_sources/priority_art/2026-06-14/05_manifests/qa_jiangnan_map_readability_v02.png`
- NPC 交流页截图：`public/assets/art_sources/priority_art/2026-06-14/05_manifests/qa_npc_talk_layout_v02.png`
- 构建：`npm run build` 通过。
- 测试：`npm test` 40 个测试文件 / 548 项测试通过。

## 备注

本轮曾重新调用 image 功能尝试生成 5 地区 x 10 类型地貌瓦片母图，但该次输出未持久化到可读生成目录。为避免误接错误母图，最终未将不可追踪输出纳入 manifest；当前运行瓦片均来自已落盘的 imagegen 像素街景条，并通过脚本裁切和降噪处理。
