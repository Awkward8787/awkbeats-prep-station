import { createServer } from 'vite';
import { spawn } from 'node:child_process';
import esbuild from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const external = ['electron', 'music-metadata'];

const main = await esbuild.context({
  entryPoints: [path.join(root, 'electron/main.ts')],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  outfile: path.join(root, 'dist/main/index.js'),
  external,
  sourcemap: true,
});
const preload = await esbuild.context({
  entryPoints: [path.join(root, 'electron/preload.ts')],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  outfile: path.join(root, 'dist/preload/index.js'),
  external: ['electron'],
  sourcemap: true,
});
await main.rebuild();
await preload.rebuild();
await main.watch();
await preload.watch();

const server = await createServer({ configFile: path.join(root, 'vite.config.ts') });
await server.listen();
const url = server.resolvedUrls?.local?.[0] || 'http://localhost:5173';
const electron = spawn(path.join(root, 'node_modules/.bin/electron'), ['.'], {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, VITE_DEV_SERVER_URL: url },
});
electron.on('exit', async () => {
  await server.close();
  await main.dispose();
  await preload.dispose();
  process.exit(0);
});
