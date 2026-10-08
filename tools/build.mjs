// src/ を 1 枚の index.html にまとめる（オフラインでもファイル単体で動くように Three.js も埋め込む）
//   node tools/build.mjs
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFileSync(join(root, p), 'utf8');

const jsDir = join(root, 'src', 'js');
const app = readdirSync(jsDir)
  .filter(f => f.endsWith('.js'))
  .sort()
  .map(f => `/* ---------- ${f} ---------- */\n` + readFileSync(join(jsDir, f), 'utf8'))
  .join('\n');

const html = read('src/template.html')
  .replace('/*@@CSS@@*/', () => read('src/style.css'))
  .replace('/*@@THREE@@*/', () => read('vendor/three.r128.min.js'))
  .replace('/*@@APP@@*/', () => app);

writeFileSync(join(root, 'index.html'), html);
console.log(`index.html: ${(html.length / 1024).toFixed(0)} KB`);
