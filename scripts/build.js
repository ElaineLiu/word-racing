/**
 * Build script - 打包为可离线运行的静态文件
 *
 * 输出 dist/word-racing/ 目录：
 *   index.html         - 无 importmap，非 module script
 *   js/bundle.js       - 所有 JS + Three.js + JSON 数据（IIFE 格式）
 *   css/               - 样式表
 *   scripts/           - 调试脚本（可选）
 *
 * 用法: node scripts/build.js
 */

import * as esbuild from 'esbuild';
import { readFileSync, writeFileSync, cpSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { join, dirname, resolve, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DIST = join(ROOT, 'dist', 'word-racing');

// ─── 1. Clean + create dist ───────────────────────────────────────────
if (existsSync(DIST)) rmSync(DIST, { recursive: true });
mkdirSync(DIST, { recursive: true });
mkdirSync(join(DIST, 'js'));
mkdirSync(join(DIST, 'css'));
mkdirSync(join(DIST, 'data'));
mkdirSync(join(DIST, 'scripts'));

// ─── 2. Read data files (只捆绑存在的文件) ───────────────────────────
const DATA_DIR = join(ROOT, 'data');
const dataFiles = {};
const dataFileList = [
  'wordsets-config.json',
  'words-shanghai-zhongkao.json',
  'words-shanghai-g6.json',
  'words-f1.json',
  'words-raz-h.json',
  'words-raz-i.json',
  'tracks.json',
];

for (const filename of dataFileList) {
  const filePath = join(DATA_DIR, filename);
  if (existsSync(filePath)) {
    dataFiles[filename] = JSON.parse(readFileSync(filePath, 'utf-8'));
    console.log(`  [data] Inlined: ${filename} (${(JSON.stringify(dataFiles[filename]).length / 1024).toFixed(0)} KB)`);
  } else {
    console.log(`  [data] Skipped (missing): ${filename}`);
  }
}

// ─── 3. Generate fetch shim + inline data ─────────────────────────────
const shimCode = `
// ═══════════════════════════════════════════════════════════
// Offline data shim - injected at build time
// Intercepts fetch() for data/*.json to work with file:// protocol
// ═══════════════════════════════════════════════════════════
(function() {
  var __DATA__ = ${JSON.stringify(dataFiles)};

  if (typeof window === 'undefined') return;

  var _fetch = window.fetch;
  window.fetch = function(url, options) {
    if (typeof url === 'string') {
      var match = url.match(/data\\/([^/]+\.json)$/);
      if (match && __DATA__[match[1]]) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: function() { return Promise.resolve(__DATA__[match[1]]); },
          text: function() { return Promise.resolve(JSON.stringify(__DATA__[match[1]])); }
        });
      }
    }
    if (_fetch) return _fetch.call(window, url, options);
    return Promise.reject(new Error('fetch not available for: ' + url));
  };
})();
`;

// ─── 4. Bundle JS with esbuild ────────────────────────────────────────
console.log('\n[esbuild] Bundling...');

const result = await esbuild.build({
  entryPoints: [join(ROOT, 'js', 'main-v2.js')],
  bundle: true,
  format: 'iife',
  outfile: join(DIST, 'js', 'bundle.js'),
  absWorkingDir: ROOT,
  banner: { js: shimCode },
  minify: false,  // 保留可读性，方便调试
  target: 'es2020',
  plugins: [{
    name: 'strip-query-strings',
    setup(build) {
      // 去除动态 import 的 query string（如 ?v=epic5-fixed-right-chevron）
      build.onResolve({ filter: /\?/ }, (args) => {
        const cleanPath = args.path.replace(/\?.*$/, '');
        // 转为绝对路径（esbuild 要求文件路径必须是绝对路径）
        const absolutePath = isAbsolute(cleanPath) ? cleanPath : resolve(args.resolveDir, cleanPath);
        return { path: absolutePath };
      });
    },
  }],
  logLevel: 'info',
});

// 打印构建统计
if (result.outputFiles) {
  for (const f of result.outputFiles) {
    console.log(`  Output: ${f.path} (${(f.text.length / 1024).toFixed(0)} KB)`);
  }
}

// ─── 5. Copy static assets ────────────────────────────────────────────
console.log('\n[copy] Static assets...');

// CSS
for (const cssFile of ['style.css', 'hud-3d.css']) {
  const src = join(ROOT, 'css', cssFile);
  if (existsSync(src)) {
    cpSync(src, join(DIST, 'css', cssFile));
    console.log(`  css/${cssFile}`);
  }
}

// Debug commands
const debugSrc = join(ROOT, 'scripts', 'debug-commands.js');
if (existsSync(debugSrc)) {
  cpSync(debugSrc, join(DIST, 'scripts', 'debug-commands.js'));
  console.log('  scripts/debug-commands.js');
}

// ─── 6. Generate index.html (非 module 版本) ──────────────────────────
console.log('\n[html] Generating index.html...');

let html = readFileSync(join(ROOT, 'index.html'), 'utf-8');

// 移除 importmap（Three.js 已打包进 bundle）
html = html.replace(
  /<script type="importmap">[\s\S]*?<\/script>\n*/,
  ''
);

// 替换 module script 为普通 script
html = html.replace(
  /<script type="module" src="js\/main-v2\.js"><\/script>/,
  '<script src="js/bundle.js"></script>'
);

// 更新注释（不再使用 ES6 Module）
html = html.replace(
  '<!-- Scripts (ES6 Module) -->',
  '<!-- Scripts (Bundled) -->'
);

// 添加 HUD CSS（如果源 HTML 中未包含）
if (!html.includes('hud-3d.css')) {
  html = html.replace(
    '<link rel="stylesheet" href="css/style.css">',
    '<link rel="stylesheet" href="css/style.css">\n    <link rel="stylesheet" href="css/hud-3d.css">'
  );
}

// 写文件
writeFileSync(join(DIST, 'index.html'), html);
console.log('  index.html (importmap removed, bundle.js injected)');

// ─── 7. Size summary ──────────────────────────────────────────────────
const bundleSize = readFileSync(join(DIST, 'js', 'bundle.js')).length;
console.log(`\n✅ Build complete: ${DIST}`);
console.log(`   bundle.js: ${(bundleSize / 1024).toFixed(0)} KB`);
