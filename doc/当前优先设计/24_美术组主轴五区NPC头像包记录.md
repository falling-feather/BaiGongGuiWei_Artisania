# 美术组主轴五区 NPC 头像包记录

更新日期：2026-06-14

## 节点

- 对应《美术极速协作指引》：A3 NPC 与工艺补齐。
- 本节点先补主轴五区冻结 NPC 的对话/关系头像，服务当前优先版，不扩张到全 NPC 长篇立绘。
- 主体图像由 `image_gen` 生成；脚本只做抠绿、切片、尺寸归一、manifest 和 QA 预览。

## 源文件

- 源表：`public/assets/art_sources/priority_art/2026-06-14/01_generated_sources/npc_portraits/main_axis_npc_portraits_v01_chroma.png`
- 切片目录：`public/assets/art_sources/priority_art/2026-06-14/02_cutouts/npc_portraits`
- QA 预览：`public/assets/art_sources/priority_art/2026-06-14/05_manifests/main_axis_npc_portraits_preview.png`
- Manifest：`public/assets/art_sources/priority_art/2026-06-14/05_manifests/priority_npc_portrait_manifest.json`

## 头像清单

| 地区 | npcId | 名称 | 职能 | 美术 key | 运行文件 |
|---|---|---|---|---|---|
| 江南 `jiangnan` | `jn-ning-ciqiu` | 宁辞秋 | 文人书法家 | `npc.jn-ning-ciqiu.portrait` | `public/assets/game/characters/jn-ning-ciqiu/portrait.png` |
| 江南 `jiangnan` | `jn-ye-qingzhan` | 叶青盏 | 青瓷窑师 | `npc.jn-ye-qingzhan.portrait` | `public/assets/game/characters/jn-ye-qingzhan/portrait.png` |
| 江南 `jiangnan` | `jn-qiao-zhaoye` | 乔照夜 | 灯彩匠 | `npc.jn-qiao-zhaoye.portrait` | `public/assets/game/characters/jn-qiao-zhaoye/portrait.png` |
| 巴蜀 `bashu` | `bs-zhuo-jinniang` | 卓锦娘 | 蜀锦织造师 | `npc.bs-zhuo-jinniang.portrait` | `public/assets/game/characters/bs-zhuo-jinniang/portrait.png` |
| 巴蜀 `bashu` | `bs-mabang-ayue` | 马帮阿越 | 茶马驿领路人 | `npc.bs-mabang-ayue.portrait` | `public/assets/game/characters/bs-mabang-ayue/portrait.png` |
| 岭南 `lingnan` | `ln-he-yunsha` | 何云纱 | 香云纱染整师 | `npc.ln-he-yunsha.portrait` | `public/assets/game/characters/ln-he-yunsha/portrait.png` |
| 岭南 `lingnan` | `ln-wu-haichao` | 伍海潮 | 海商 | `npc.ln-wu-haichao.portrait` | `public/assets/game/characters/ln-wu-haichao/portrait.png` |
| 赣鄱 `ganpo` | `gp-wen-yaotou` | 窑头老温 | 窑师 | `npc.gp-wen-yaotou.portrait` | `public/assets/game/characters/gp-wen-yaotou/portrait.png` |
| 赣鄱 `ganpo` | `gp-lan-yousheng` | 蓝釉生 | 画坯师 | `npc.gp-lan-yousheng.portrait` | `public/assets/game/characters/gp-lan-yousheng/portrait.png` |
| 西域 `xiyu` | `xu-a-yue` | 玉师阿月 | 玉雕师 | `npc.xu-a-yue.portrait` | `public/assets/game/characters/xu-a-yue/portrait.png` |
| 西域 `xiyu` | `xu-tuoling-shu` | 驼铃叔 | 驼队首领 | `npc.xu-tuoling-shu.portrait` | `public/assets/game/characters/xu-tuoling-shu/portrait.png` |

## 剩余缺口

- 主轴五区冻结 NPC 仍需 `stand.png` 站姿/半身包。
- 主轴五区街景 `street_tiles.png` 与工艺 `craft_tools.png` 仍需按同一命名口径继续补。
- 六区骨架 NPC 头像暂未进入本包，按 A2 节点处理。
