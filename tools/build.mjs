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

// --artifact <出力先>：共有ページ用（外側の html/head/body は公開時に付くので外し、
// 撮影はダウンロードではなく画面表示にする）
const ai = process.argv.indexOf('--artifact');
if (ai > 0){
  const out = html
    .replace(/<!DOCTYPE html>\s*<html[^>]*>\s*<head>\s*/i, '')
    .replace(/<meta charset="UTF-8">\s*<meta name="viewport"[^>]*>\s*/i, '')
    .replace(/<title>[^<]*<\/title>/, '<title>ストビュージェネレーター</title>\n<script>window.__MACHINAMI_PREVIEW_SAVE__ = true;</script>')
    .replace(/<\/head>\s*<body>/i, '')
    .replace(/<\/body>\s*<\/html>\s*$/i, '');
  writeFileSync(process.argv[ai + 1], out);
  console.log(`artifact: ${(out.length / 1024).toFixed(0)} KB -> ${process.argv[ai + 1]}`);
}
