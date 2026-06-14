# 美术组主轴五区 NPC 站姿包记录

更新日期：2026-06-14

## 节点

- 对应《美术极速协作指引》：A3 NPC 与工艺补齐。
- 本节点补主轴五区冻结 NPC 的站姿/半身运行包，承接 24 号头像包的身份和职业道具。
- 主体图像由 `image_gen` 生成；脚本只做抠绿、切片、底部锚点归一、manifest 和 QA 预览。

## 源文件

- 源表：`public/assets/art_sources/priority_art/2026-06-14/01_generated_sources/npc_stands/main_axis_npc_stands_v01_chroma.png`
- 切片目录：`public/assets/art_sources/priority_art/2026-06-14/02_cutouts/npc_stands`
- QA 预览：`public/assets/art_sources/priority_art/2026-06-14/05_manifests/main_axis_npc_stands_preview.png`
- Manifest：`public/assets/art_sources/priority_art/2026-06-14/05_manifests/priority_npc_stand_manifest.json`

## 站姿清单

| 地区 | npcId | 名称 | 职能 | 美术 key | 运行文件 |
|---|---|---|---|---|---|
| 江南 `jiangnan` | `jn-ning-ciqiu` | 宁辞秋 | 文人书法家 | `npc.jn-ning-ciqiu.stand` | `public/assets/game/characters/jn-ning-ciqiu/stand.png` |
| 江南 `jiangnan` | `jn-ye-qingzhan` | 叶青盏 | 青瓷窑师 | `npc.jn-ye-qingzhan.stand` | `public/assets/game/characters/jn-ye-qingzhan/stand.png` |
| 江南 `jiangnan` | `jn-qiao-zhaoye` | 乔照夜 | 灯彩匠 | `npc.jn-qiao-zhaoye.stand` | `public/assets/game/characters/jn-qiao-zhaoye/stand.png` |
| 巴蜀 `bashu` | `bs-zhuo-jinniang` | 卓锦娘 | 蜀锦织造师 | `npc.bs-zhuo-jinniang.stand` | `public/assets/game/characters/bs-zhuo-jinniang/stand.png` |
| 巴蜀 `bashu` | `bs-mabang-ayue` | 马帮阿越 | 茶马驿领路人 | `npc.bs-mabang-ayue.stand` | `public/assets/game/characters/bs-mabang-ayue/stand.png` |
| 岭南 `lingnan` | `ln-he-yunsha` | 何云纱 | 香云纱染整师 | `npc.ln-he-yunsha.stand` | `public/assets/game/characters/ln-he-yunsha/stand.png` |
| 岭南 `lingnan` | `ln-wu-haichao` | 伍海潮 | 海商 | `npc.ln-wu-haichao.stand` | `public/assets/game/characters/ln-wu-haichao/stand.png` |
| 赣鄱 `ganpo` | `gp-wen-yaotou` | 窑头老温 | 窑师 | `npc.gp-wen-yaotou.stand` | `public/assets/game/characters/gp-wen-yaotou/stand.png` |
| 赣鄱 `ganpo` | `gp-lan-yousheng` | 蓝釉生 | 画坯师 | `npc.gp-lan-yousheng.stand` | `public/assets/game/characters/gp-lan-yousheng/stand.png` |
| 西域 `xiyu` | `xu-a-yue` | 玉师阿月 | 玉雕师 | `npc.xu-a-yue.stand` | `public/assets/game/characters/xu-a-yue/stand.png` |
| 西域 `xiyu` | `xu-tuoling-shu` | 驼铃叔 | 驼队首领 | `npc.xu-tuoling-shu.stand` | `public/assets/game/characters/xu-tuoling-shu/stand.png` |

## 剩余缺口

- 主轴五区仍需正式地区包内的 `characters.png` 汇总大图，用于地区包总览和编辑器快速预览。
- 本包是静态站姿，不替代 4x4 行走表；后续如需每名冻结 NPC 的独立行走帧，需要另开动作帧包。
- 六区骨架 NPC 站姿暂未进入本包，按 A2 节点处理。
