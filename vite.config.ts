import fs from 'node:fs/promises';
import type { IncomingMessage, ServerResponse } from 'node:http';
import path from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

const mapLayoutDir = fileURLToPath(new URL('./src/data/mapLayouts', import.meta.url));
const githubPagesBase = process.env.GITHUB_PAGES === 'true' ? '/BaiGongGuiWei_Artisania/' : '/';
const publicAssetsBase = `${githubPagesBase}assets/`;

function sendJson(res: ServerResponse, statusCode: number, body: unknown) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

function readRequestBody(req: IncomingMessage) {
  return new Promise<string>((resolve, reject) => {
    let body = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 2_000_000) reject(new Error('Request body is too large.'));
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function normalizeEditorSnapshot(snapshot: any, subregionId: string) {
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
    throw new Error('Map snapshot must be an object.');
  }
  if (snapshot.subregionId !== subregionId) {
    throw new Error('Snapshot subregionId does not match the target file.');
  }
  if (typeof snapshot.regionId !== 'string' || !snapshot.regionId) {
    throw new Error('Snapshot regionId is required.');
  }
  if (!snapshot.size || typeof snapshot.size.w !== 'number' || typeof snapshot.size.h !== 'number') {
    throw new Error('Snapshot size.w and size.h are required numbers.');
  }
  if (snapshot.tiles !== undefined && !Array.isArray(snapshot.tiles)) {
    throw new Error('Snapshot tiles must be an array.');
  }
  if (snapshot.objects !== undefined && !Array.isArray(snapshot.objects)) {
    throw new Error('Snapshot objects must be an array.');
  }
  if (snapshot.roads !== undefined && !Array.isArray(snapshot.roads)) {
    throw new Error('Snapshot roads must be an array.');
  }
  if (snapshot.modelDefinitions !== undefined && !Array.isArray(snapshot.modelDefinitions)) {
    throw new Error('Snapshot modelDefinitions must be an array.');
  }

  return {
    schema: 'artisania-map-editor/v2',
    regionId: snapshot.regionId,
    subregionId,
    tileSize: snapshot.tileSize ?? 32,
    size: snapshot.size,
    ...(snapshot.modelDefinitions?.length ? { modelDefinitions: snapshot.modelDefinitions } : {}),
    ...(snapshot.roads?.length ? { roads: snapshot.roads } : {}),
    tiles: snapshot.tiles ?? [],
    objects: snapshot.objects ?? [],
  };
}

function devMapLayoutWriter(): Plugin {
  return {
    name: 'artisania-dev-map-layout-writer',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__artisania-dev/map-layouts', async (req, res) => {
        if (req.method !== 'POST') {
          sendJson(res, 405, { ok: false, error: 'Only POST is supported.' });
          return;
        }

        try {
          const requestUrl = new URL(req.url ?? '/', 'http://localhost');
          const subregionId = decodeURIComponent(requestUrl.pathname.replace(/^\/+/, '').replace(/\.json$/, ''));
          if (!/^[a-z0-9-]+$/.test(subregionId)) {
            sendJson(res, 400, { ok: false, error: 'Invalid subregion id.' });
            return;
          }

          const rawBody = await readRequestBody(req);
          const snapshot = normalizeEditorSnapshot(JSON.parse(rawBody), subregionId);
          const targetPath = path.resolve(mapLayoutDir, `${subregionId}.json`);
          const relativePath = path.relative(mapLayoutDir, targetPath);
          if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
            sendJson(res, 400, { ok: false, error: 'Refusing to write outside map layout directory.' });
            return;
          }

          await fs.writeFile(targetPath, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
          sendJson(res, 200, {
            ok: true,
            subregionId,
            filePath: path.relative(fileURLToPath(new URL('.', import.meta.url)), targetPath).replace(/\\/g, '/'),
          });
          setTimeout(() => server.ws.send({ type: 'full-reload' }), 80);
        } catch (error) {
          sendJson(res, 400, { ok: false, error: error instanceof Error ? error.message : 'Unknown map write error.' });
        }
      });
    },
  };
}

function githubPagesPublicAssetPaths(): Plugin {
  return {
    name: 'artisania-github-pages-public-asset-paths',
    apply: 'build',
    generateBundle(_, bundle) {
      if (githubPagesBase === '/') return;

      for (const item of Object.values(bundle)) {
        if (item.type === 'chunk') {
          item.code = item.code.replace(/(["'`(])\/assets\//g, `$1${publicAssetsBase}`);
        } else if (typeof item.source === 'string') {
          item.source = item.source.replace(/(["'`(])\/assets\//g, `$1${publicAssetsBase}`);
        }
      }
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  base: githubPagesBase,
  plugins: [react(), devMapLayoutWriter(), githubPagesPublicAssetPaths()],
  resolve: {
    alias: {
      '@engine': fileURLToPath(new URL('./src/engine', import.meta.url)),
      '@data': fileURLToPath(new URL('./src/data', import.meta.url)),
      '@store': fileURLToPath(new URL('./src/store', import.meta.url)),
    },
  },
});
