# 美术组对话 HUD 与 NPC 半身像包记录

更新日期：2026-06-17

## 节点

- 对应《美术极速协作指引》A3/A4：NPC 半身像、对话前置模式、HUD/任务栏/按钮图像化封装。
- 本批 UI 与半身像均由内置 `image_gen` 生成；脚本只负责抠绿、切片、尺寸归一、运行时落盘、manifest 与 QA 预览。
- 运行时已预留 NPC 对话左侧半身像槽位，顶栏/侧栏/底部提示改用这批图像组件作为背景。
- 2026-06-17 二次优化：近身 NPC 交互优先于大体积工坊点位，确保前置对白不会被工坊抢走；前置层选择只进入二级菜单，不提前结算好感/赠礼/委托；NPC 性格标签已做中文显示层映射。

## 源文件

- UI 源图：`public/assets/art_sources/priority_art/2026-06-14/01_generated_sources/dialogue_ui/priority_dialogue_ui_atlas_v01_chroma.png`
- NPC 半身像源图：`public/assets/art_sources/priority_art/2026-06-14/01_generated_sources/npc_busts/main_axis_npc_busts_v01_chroma.png`
- UI 切片：`public/assets/art_sources/priority_art/2026-06-14/02_cutouts/dialogue_ui`
- NPC 切片：`public/assets/art_sources/priority_art/2026-06-14/02_cutouts/npc_busts`
- Manifest：`public/assets/art_sources/priority_art/2026-06-14/05_manifests/priority_dialogue_ui_bust_manifest.json`
- QA 预览：`public/assets/art_sources/priority_art/2026-06-14/05_manifests/priority_dialogue_ui_busts_preview.png`

## UI 组件

| key | 用途 | 运行时文件 | 尺寸 |
|---|---|---|---|
| `ui.hudV2.top_bar` | top HUD navigation and status backing | `public/assets/game/ui/hud_v2_top_bar.png` | 728x196 |
| `ui.hudV2.plaque` | location, weather and compact readout plaque | `public/assets/game/ui/hud_v2_plaque.png` | 424x175 |
| `ui.hudV2.icon_button` | square icon button frame | `public/assets/game/ui/hud_v2_icon_button.png` | 220x217 |
| `ui.hudV2.action_button` | gold action button frame | `public/assets/game/ui/hud_v2_action_button.png` | 531x151 |
| `ui.hudV2.hint_panel` | bottom interaction hint backing | `public/assets/game/ui/hud_v2_hint_panel.png` | 722x88 |
| `ui.hudV2.dialogue_panel` | NPC pre-dialogue frame with portrait slot | `public/assets/game/ui/hud_v2_dialogue_panel.png` | 735x480 |
| `ui.hudV2.side_task_panel` | side quest/task guide panel | `public/assets/game/ui/hud_v2_side_task_panel.png` | 388x438 |
| `ui.hudV2.choice_button` | dialogue/menu choice button frame | `public/assets/game/ui/hud_v2_choice_button.png` | 452x145 |

## NPC 半身像

| 地区 | npcId | 名称 | 运行时文件 |
|---|---|---|---|
| 江南 `jiangnan` | `jn-ning-ciqiu` | 宁辞秋 | `public/assets/game/characters/jn-ning-ciqiu/bust.png` |
| 江南 `jiangnan` | `jn-ye-qingzhan` | 叶青盏 | `public/assets/game/characters/jn-ye-qingzhan/bust.png` |
| 江南 `jiangnan` | `jn-qiao-zhaoye` | 乔照夜 | `public/assets/game/characters/jn-qiao-zhaoye/bust.png` |
| 巴蜀 `bashu` | `bs-zhuo-jinniang` | 卓锦娘 | `public/assets/game/characters/bs-zhuo-jinniang/bust.png` |
| 巴蜀 `bashu` | `bs-mabang-ayue` | 马帮阿越 | `public/assets/game/characters/bs-mabang-ayue/bust.png` |
| 岭南 `lingnan` | `ln-he-yunsha` | 何云纱 | `public/assets/game/characters/ln-he-yunsha/bust.png` |
| 岭南 `lingnan` | `ln-wu-haichao` | 伍海潮 | `public/assets/game/characters/ln-wu-haichao/bust.png` |
| 赣鄱 `ganpo` | `gp-wen-yaotou` | 窑头老温 | `public/assets/game/characters/gp-wen-yaotou/bust.png` |
| 赣鄱 `ganpo` | `gp-lan-yousheng` | 蓝釉生 | `public/assets/game/characters/gp-lan-yousheng/bust.png` |
| 西域 `xiyu` | `xu-a-yue` | 玉师阿月 | `public/assets/game/characters/xu-a-yue/bust.png` |
| 西域 `xiyu` | `xu-tuoling-shu` | 驼铃叔 | `public/assets/game/characters/xu-tuoling-shu/bust.png` |

## 剩余缺口

- 本批完成主轴 11 名 NPC 的对话半身像；骨架六区 NPC 半身像尚未进入正式包。
- UI 图像组件已接入 HUD 与对话前置层；背包、百工志、成就等大弹窗仍可继续升级为同一套图像边框。
- 地图装饰物的编辑器资产已存在，但运行时 `decoration` 仍需要继续按真实 asset 渲染，避免只显示石头占位。
- 已将主轴五区 NPC `bust.png` 纳入优先资源 manifest；骨架六区暂不登记半身像，避免资源清单误报已完成。
