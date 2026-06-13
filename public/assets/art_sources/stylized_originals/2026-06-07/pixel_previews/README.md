# Jiangnan Pixel Preview Manifest

Generated on 2026-06-07 from the stylized source PNGs in the sibling `maps`,
`buildings`, and `characters` folders.

## Tool call assessment

- `@gua/cli` dist exists at `D:/代码玩具测试/codex专用学术垃圾区/game_UI/game-ui-asset-forge/packages/cli/dist/index.js`.
- Direct `node packages/cli/dist/index.js ...` failed on Node 22 because `@gua/core/dist/index.js` uses extensionless ESM exports such as `./types`.
- The working local invocation was the existing toolchain's `tsx` entrypoint, with no network install:
  `node D:/代码玩具测试/codex专用学术垃圾区/game_UI/game-ui-asset-forge/node_modules/tsx/dist/cli.mjs D:/代码玩具测试/codex专用学术垃圾区/game_UI/game-ui-asset-forge/packages/cli/src/index.ts --json clean <input> --recipe <recipe> --out <png>`
- The CLI successfully routed through `@gua/core.applyRecipe` with `pixelizeResize` followed by `palette`.

## Recipes

- Full map: `384x256`, `cropMode=none`, `sampler=dominant`, palette max `48`, merge threshold `28`.
- Building sheet: `256x256`, `cropMode=fit`, `sampler=dominant`, palette max `40`, merge threshold `24`.
- Character lineup: `320x192`, `cropMode=fit`, `sampler=dominant`, palette max `48`, merge threshold `22`.

## Aesthetic conclusion

- Full map is acceptable as a high-density pixel overview. It preserves the Jiangnan water-town composition, but should be manually clarified before becoming tile gameplay art.
- Building preview is the strongest acceptance candidate: silhouettes, roofs, and value groups survive the reduction well.
- Character preview is usable for direction and proportion checks; final sprites still need hand cleanup around faces, hands, and fabric edges.
- QA result: building and character previews pass. The full map has one warning because it has no alpha channel, which is expected for a full-frame map preview.
