/**
 * build-client.mjs — 把 src/client.js 包成 DSH 的「惰性 CJS 闭包工厂」bundle。
 *
 * DSH 的 ClientModuleRegistry 只认这一种形状：脚本执行时调用
 *   window.__ModuleLoader__.load({ id, factory: (require) => { … } })
 * 注册工厂，所有副作用都推迟到工厂物化时发生。外置的平台模块（react 等）
 * 正是通过注入的那个 `require` 解析的 —— 缺了这层外壳，构建、类型、下载都正常，
 * 启动时才报 `loaded without registering "<pkg>" via __ModuleLoader__.load`。
 *
 * 本脚本零依赖，只做 banner / intro / footer 三段拼接（等价于官方
 * packages/client/tsdown.client.ts 的 clientBundle 封装部分）。
 */

import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url)).replace(/[\\/]scripts$/, '');
const pkg = JSON.parse(await readFile(resolve(ROOT, 'package.json'), 'utf8'));
const PLUGIN_ID = pkg.name;

const source = await readFile(resolve(ROOT, 'src/client.js'), 'utf8');

const banner =
  'window.__ModuleLoader__.load({ id: ' +
  JSON.stringify(PLUGIN_ID) +
  ', factory: (require) => {\n' +
  'var module = { exports: {} }; var exports = module.exports;\n';
const footer = '\nreturn module.exports; } });\n';

const bundle = banner + source + footer;

await writeFile(resolve(ROOT, 'lib/client.js'), bundle, 'utf8');

const bytes = Buffer.byteLength(bundle, 'utf8');
console.log('[build-client] lib/client.js ' + bytes + ' bytes — id=' + PLUGIN_ID);
