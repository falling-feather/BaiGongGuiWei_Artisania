import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const forgeRoot =
  process.env.GAME_UI_ASSET_FORGE ??
  'D:/代码玩具测试/codex专用学术垃圾区/game_UI/game-ui-asset-forge';

const tsxCli = path.join(forgeRoot, 'node_modules/tsx/dist/cli.mjs');
const forgeCliSource = path.join(forgeRoot, 'packages/cli/src/index.ts');
const sourceRoot = path.join(projectRoot, 'public/assets/art_sources/stylized_originals/2026-06-07');
const outputRoot = path.join(sourceRoot, 'pixel_previews');

const jobs = [
  {
    id: 'jiangnan.full_map.pixel_preview.v01',
    source: 'maps/jiangnan_full_map_concept_v01.png',
    recipe: 'jiangnan_full_map_pixel_preview.recipe.json',
    output: 'jiangnan_full_map_pixel_preview_v01.png',
    operations: [
      {
        op: 'pixelizeResize',
        targetWidth: 384,
        targetHeight: 256,
        cropMode: 'none',
        sampler: 'dominant',
        alphaMode: 'weighted',
        maxSize: 512,
      },
      { op: 'palette', maxColors: 48, distance: 'rgb', mergeThreshold: 28 },
    ],
  },
  {
    id: 'jiangnan.building.pixel_preview.v01',
    source: 'buildings/jiangnan_building_reference_v01.png',
    recipe: 'jiangnan_building_pixel_preview.recipe.json',
    output: 'jiangnan_building_pixel_preview_v01.png',
    operations: [
      {
        op: 'pixelizeResize',
        targetWidth: 256,
        targetHeight: 256,
        cropMode: 'fit',
        sampler: 'dominant',
        alphaMode: 'weighted',
        maxSize: 512,
      },
      { op: 'palette', maxColors: 40, distance: 'rgb', mergeThreshold: 24 },
    ],
  },
  {
    id: 'jiangnan.core_character_lineup.pixel_preview.v01',
    source: 'characters/core_character_lineup_v01.png',
    recipe: 'core_character_lineup_pixel_preview.recipe.json',
    output: 'core_character_lineup_pixel_preview_v01.png',
    operations: [
      {
        op: 'pixelizeResize',
        targetWidth: 320,
        targetHeight: 192,
        cropMode: 'fit',
        sampler: 'dominant',
        alphaMode: 'weighted',
        maxSize: 512,
      },
      { op: 'palette', maxColors: 48, distance: 'rgb', mergeThreshold: 22 },
    ],
  },
];

await mkdir(outputRoot, { recursive: true });

if (!existsSync(tsxCli) || !existsSync(forgeCliSource)) {
  throw new Error(`Game UI Asset Forge CLI source entry was not found under ${forgeRoot}`);
}

const outputs = [];
for (const job of jobs) {
  const inputPath = path.join(sourceRoot, job.source);
  const recipePath = path.join(outputRoot, job.recipe);
  const outputPath = path.join(outputRoot, job.output);

  if (!existsSync(recipePath)) {
    await writeFile(
      recipePath,
      JSON.stringify({ schemaVersion: '0.1.0', id: job.id, operations: job.operations }, null, 2),
    );
  }

  const result = spawnSync(
    process.execPath,
    [tsxCli, forgeCliSource, '--json', 'clean', inputPath, '--recipe', recipePath, '--out', outputPath],
    { cwd: forgeRoot, encoding: 'utf8' },
  );

  if (result.status !== 0) {
    throw new Error(
      [
        `Pixelize job failed: ${job.id}`,
        result.error?.message,
        result.stdout?.trim(),
        result.stderr?.trim(),
      ].filter(Boolean).join('\n'),
    );
  }

  outputs.push({
    id: job.id,
    source: path.relative(sourceRoot, inputPath).replaceAll('\\', '/'),
    recipe: job.recipe,
    output: `pixel_previews/${job.output}`,
  });
}

await writeFile(
  path.join(outputRoot, 'tool-run.json'),
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      tool: 'game-ui-asset-forge CLI source via tsx',
      forgeRoot,
      outputs,
      note: 'Uses the external local toolchain without modifying it. Source art remains untouched.',
    },
    null,
    2,
  ),
);

console.log(JSON.stringify({ outputRoot, outputs }, null, 2));
