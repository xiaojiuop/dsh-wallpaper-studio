/**
 * check-client-bundle.mjs — 发布前静态校验（对应 DSH 前端插件检查清单）。
 * 只读文件，不联网、不装依赖。
 */

import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url)).replace(/[\\/]scripts$/, '');
const fail = [];
const ok = [];

const pkg = JSON.parse(await readFile(resolve(ROOT, 'package.json'), 'utf8'));
const id = pkg.name;

const assert = (cond, msg) => (cond ? ok.push(msg) : fail.push(msg));

assert(pkg.type === 'module', 'package.json type=module');
assert(pkg.main === 'lib/index.js', 'main → lib/index.js');
assert(existsSync(resolve(ROOT, 'lib/index.js')), 'lib/index.js 存在');
assert(
  pkg.exports && pkg.exports['./client'] && pkg.exports['./client'].default === './lib/client.js',
  'exports["./client"] → lib/client.js'
);
assert(pkg.exports && pkg.exports['./package.json'] === './package.json', 'exports["./package.json"] 必须声明');
assert(
  pkg.dsh && pkg.dsh.client && pkg.dsh.client.platform === 'web',
  'dsh.client.platform === "web"'
);
assert(
  Array.isArray(pkg.dsh?.client?.inject) && pkg.dsh.client.inject.length > 0,
  'dsh.client.inject 列出浏览器模块依赖'
);
assert(
  pkg.dsh && pkg.dsh.bundle && pkg.dsh.bundle.patch === './cordis.patch.yml',
  'dsh.bundle.patch → cordis.patch.yml'
);
assert(existsSync(resolve(ROOT, 'cordis.patch.yml')), 'cordis.patch.yml 存在');

const patch = await readFile(resolve(ROOT, 'cordis.patch.yml'), 'utf8');
const patchBody = patch
  .split('\n')
  .filter((line) => !line.trim().startsWith('#'))
  .join('\n')
  .trim();
assert(patchBody.startsWith('- insert:'), 'cordis.patch.yml 是顶层插入数组');
assert(new RegExp(`id: ${id}`).test(patch), 'cordis.patch.yml 含 id = 包名');
assert(new RegExp(`name: '?${id}'?`).test(patch), 'cordis.patch.yml 含 name = 包名');

const host = await readFile(resolve(ROOT, 'lib/index.js'), 'utf8');
assert(/export function apply/.test(host), 'lib/index.js 导出 apply');
assert(/export const name/.test(host), 'lib/index.js 导出 name');

const bundlePath = resolve(ROOT, 'lib/client.js');
assert(existsSync(bundlePath), 'lib/client.js 存在');
const bundle = await readFile(bundlePath, 'utf8');

assert(
  bundle.startsWith(`window.__ModuleLoader__.load({ id: ${JSON.stringify(id)}, factory: (require) => {`),
  'bundle 以 __ModuleLoader__.load({ id, factory }) banner 开头'
);
assert(/return module\.exports; \} \}\);/.test(bundle.trimEnd()), 'bundle 以 footer 结束');
assert(/var module = \{ exports: \{\} \}; var exports = module\.exports;/.test(bundle), 'bundle 含 intro（module/exports）');

const aiRequires = [...bundle.matchAll(/require\((['"])(@deepseek-ai\/[^'"]+)\1\)/g)].map((m) => m[2]);
assert(aiRequires.length === 0, 'bundle 内无 @deepseek-ai/* 值导入（纯 react 依赖）');

const requires = [...bundle.matchAll(/require\((['"])([^'"]+)\1\)/g)].map((m) => m[2]);
const platformAllowed = new Set([
  'react',
  'react/jsx-runtime',
  'react-dom',
  'react-dom/client',
  '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-client-runtime/client',
  '@deepseek-ai/dsh-client-ui-slots',
  '@deepseek-ai/dsh-client-web-react',
  '@deepseek-ai/dsh-client-ui-primitives',
  '@deepseek-ai/dsh-client-ui-attachment',
  '@deepseek-ai/dsh-client-schema-form',
]);
const outside = requires.filter((r) => !platformAllowed.has(r));
assert(outside.length === 0, 'bundle 只 require 平台白名单模块（实际：' + (requires.join(', ') || 'none') + '）');

const iconOk = existsSync(resolve(ROOT, 'icon.png'));
assert(iconOk, 'icon.png 存在');

console.log('✓ 通过：' + ok.length);
ok.forEach((m) => console.log('  · ' + m));
if (fail.length > 0) {
  console.log('✗ 未通过：' + fail.length);
  fail.forEach((m) => console.log('  · ' + m));
  process.exit(1);
}
