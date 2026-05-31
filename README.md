# 百工归位 · Artisania

> 以中国非物质文化遗产「手艺工序」为核心玩法的策略经营 + 模拟 Web 游戏。
> 一回合一季，经营一座手艺小镇，在「传承 / 市场 / 生活 / 精神」四维间求平衡，走向各自的命运结局。

## 技术栈

React 18 · TypeScript 5 · Vite 5 · Zustand · Vitest · 纯 CSS

## 快速开始

```bash
npm install
npm run dev      # 本地开发
npm test         # 运行测试
npm run build    # 生产构建
```

## 文档

- 设计稿 / 玩法蓝图 / 路线图 → [doc/项目规划.md](doc/项目规划.md)
- 代码结构 / 架构 / 扩展指南 → [doc/开发者文档.md](doc/开发者文档.md)

## 架构一句话

纯函数引擎（`src/engine`）+ 注入式内容（`src/data`）+ Zustand 桥接（`src/store`）+ 只读渲染 UI（`src/components`）+ 可替换存档（`src/storage`）。游戏规则只存在于 `src/engine/reducer.ts`。

当前进度：**M0 可玩内核原型**（引擎 + 2 门手艺 + 3 个事件 + 四维结算 + 结局报告 + 单机存档）。
