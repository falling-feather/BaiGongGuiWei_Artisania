# 主轴全地区街景 HUD 浏览器烟测记录

更新日期：2026-06-17

## 结论

- 当前浏览器展示的是“子区街景/地块场景”，不是一个完整大区全景地图。
- 已按章节 smoke 入口补测 11 个地区的街景加载、HUD 区域主题、顶栏布局、画布尺寸、横向溢出和控制台错误。
- 11 个地区桌面视口 `1365x900` 全部通过。
- 额外抽测江南与西域移动视口 `390x820`，均通过。

## 桌面全地区烟测

| 地区 | 子区 | HUD 主题 | 结果 |
|---|---|---|---|
| 江南 | `jiangnan-jinling` 金陵城 | `hud--region-jiangnan` | 通过 |
| 巴蜀 | `bashu-tea-horse` 茶马驿 | `hud--region-bashu` | 通过 |
| 岭南 | `lingnan-harbor` 珠江商港 | `hud--region-lingnan` | 通过 |
| 黔滇 | `qiandian-tea-road` 茶马驿道 | `hud--region-bashu` | 通过 |
| 荆楚 | `jingchu-lake-market` 江湖渡市 | `hud--region-lingnan` | 通过 |
| 赣鄱 | `ganpo-kiln-town` 窑火瓷镇 | `hud--region-ganpo` | 通过 |
| 徽州 | `huizhou-merchant-hall` 徽商会馆 | `hud--region-jiangnan` | 通过 |
| 京畿 | `jingji-official-gate` 官署门房 | `hud--region-ganpo` | 通过 |
| 三晋 | `sanjin-piaohao` 票号古街 | `hud--region-xiyu` | 通过 |
| 雪域 | `xueyu-snow-pass` 雪山驿口 | `hud--region-xiyu` | 通过 |
| 西域 | `xiyu-caravan-post` 驼队驿站 | `hud--region-xiyu` | 通过 |

## 检查项

- 页面标题：`百工归位 · Artisania`
- 每区 `canvas` 可见，桌面尺寸为 `1365x900`。
- 顶栏尺寸稳定，桌面约 `1180x70`，无横向溢出。
- 顶栏地区名与 smoke 子区一致。
- HUD 图像素材加载完成。
- 顶栏工具按钮数量不低于 6 个。
- 控制台 `error/warn` 为 0。

## 移动抽测

| 地区 | 视口 | 结果 |
|---|---|---|
| 江南 · 金陵城 | `390x820` | 通过，无横向溢出，顶栏约 `374x135` |
| 西域 · 驼队驿站 | `390x820` | 通过，无横向溢出，顶栏约 `374x135` |

## 截图证据

- 江南桌面：`C:/Users/niu-h/AppData/Local/Temp/baigong-region-jiangnan-desktop.png`
- 西域桌面：`C:/Users/niu-h/AppData/Local/Temp/baigong-region-xiyu-desktop.png`

## 后续风险

- 当前验证的是“街景地块级页面”的加载与 HUD 适配，不代表完整大区全景地图已经拼接完成。
- 视觉上不同地区仍共享一部分基础地表/道路图块；后续如果要做真正的地区差异，需要继续推进各地貌专属 terrain atlas 与地图编辑器重绘。
