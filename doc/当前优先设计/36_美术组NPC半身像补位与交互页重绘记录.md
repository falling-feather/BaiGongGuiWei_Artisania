# 美术组 NPC 半身像补位与交互页重绘记录

日期：2026-06-17

## 本轮目标

- 修正游客与部分江南 NPC 打开对话时左侧半身像为空的问题。
- 将 `交流 / 送礼 / 互动 / 委托` 等二级交互页从白色弹窗改为与前置对白一致的图像卷轴框。

## 半身像补位

- Manifest：`public/assets/art_sources/priority_art/2026-06-14/05_manifests/npc_bust_fallback_manifest.json`
- 输出路径：`public/assets/game/characters/<npcId>/bust.png`、`portrait.png`
- 覆盖 NPC：`jn-bamboo-master`、`jn-indigo-keeper`、`jn-shen-yunsuo`、`jn-gu-bojin`、`jn-fang-jiheng`、`jn-xiaoman`、`tourist-scholar`、`tourist-merchant`、`tourist-lady`

本轮曾调用 image 功能生成三名游客的专属半身像母图，但工具没有将结果持久化到可读生成目录。为避免把不可追踪素材接入运行时，本轮先用已落盘的高质量 imagegen 半身像做同画风 fallback，并在 manifest 中记录 source/target 映射。后续可继续替换为每名游客的专属图。

同时在 `NpcDialogModal` 中加入图片 fallback 链：优先加载当前 NPC 的 `bust.png`，失败后加载 `portrait.png`，再落到映射的同画风替身，避免新增 NPC 再出现空框。

## 二级交互页重绘

- 接入文件：`src/components/NpcDialogModal.tsx`
- 样式文件：`src/index.css`
- 结果：二级页复用 `hud_v2_dialogue_panel.png` 图像框，左侧保留 NPC 半身像，右侧显示人物信息、关系/好感、页签与当前模式内容。
- 覆盖范围：所有 NPC 二级页签，包括 `交流`、`送礼`、`互动`、`委托`。

## QA

- 游客前置对白截图：`public/assets/art_sources/priority_art/2026-06-14/05_manifests/qa_npc_tourist_intro_bust_v03.png`
- 二级页重绘截图：`public/assets/art_sources/priority_art/2026-06-14/05_manifests/qa_npc_menu_reframe_v03.png`
- 构建：`npm run build` 通过。
- 测试：`npm test` 40 个测试文件 / 548 项测试通过。
