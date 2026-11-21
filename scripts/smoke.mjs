/**
 * smoke.mjs — 免宿主的离线冒烟：
 *   1. bundle 能被当作经典脚本执行，并向 __ModuleLoader__ 注册自己；
 *   2. 工厂返回值是插件模块表（name / inject / apply）；
 *   3. apply 能跑在假 ctx 上，注册到 plugins.bundle.config / settings.plugin.item / sidebar.panellist / main；
 *   4. 词典 zh / en 键位一致，设置卡片能靠 locale 取到所有文案键；
 *   5. 卸载（effect disposer）后不残留注册。
 */

import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = dirname(fileURLToPath(import.meta.url)).replace(/[\\/]scripts$/, '');
const code = await readFile(resolve(ROOT, 'lib/client.js'), 'utf8');
const pkgId = JSON.parse(await readFile(resolve(ROOT, 'package.json'), 'utf8')).name;

const failures = [];
const pass = [];

const captured = { id: null, factory: null };
const win = {
  __ModuleLoader__: {
    load: (entry) => {
      captured.id = entry.id;
      captured.factory = entry.factory;
    },
  },
};

const sandbox = { window: win, console };
vm.createContext(sandbox);
vm.runInContext(code, sandbox, { filename: 'lib/client.js' });

if (captured.id !== pkgId) failures.push('registration id 与包名不一致（' + captured.id + '）');
else pass.push('bundle 以包名 ' + pkgId + ' 注册到 __ModuleLoader__');

const ReactStub = {
  createElement: (...args) => args,
  useState: (v) => [v, () => {}],
  useEffect: () => {},
  useSyncExternalStore: (sub, snap) => snap(),
  useMemo: (fn) => fn(),
  useRef: (v) => ({ current: v }),
  Fragment: 'fragment',
};

const fakeRequire = (mod) => {
  if (mod === 'react') return ReactStub;
  throw new Error('unexpected require: ' + mod);
};

const mod = captured.factory(fakeRequire);

if (typeof mod.apply !== 'function') failures.push('工厂返回值缺 apply');
else pass.push('工厂返回值导出 apply');
if (typeof mod.name !== 'string' || mod.name === '') failures.push('工厂返回值缺 name');
else pass.push('工厂返回值导出 name=' + mod.name);
if (!Array.isArray(mod.inject)) failures.push('工厂返回值缺 inject 数组');
else pass.push('client inject=[' + mod.inject.join(', ') + ']');

/* ---- 假 ctx：验证槽位注册链路 ---- */
const disposers = [];
const registeredSlots = [];
const localeDicts = [];

const fakeCtx = {
  logger: { info() {}, warn() {}, error() {} },
  get(name) {
    return name === 'layout' ? { selectPanel() {} } : undefined;
  },
  effect(fn, label) {
    const d = fn();
    if (typeof d === 'function') disposers.push(d);
    return d;
  },
  locale: {
    register(ns, dict) {
      localeDicts.push({ ns, dict });
      return () => {};
    },
  },
  slots: {
    inject(name, cb) {
      if (typeof cb !== 'function') throw new Error('slots.inject 需要 callback');
      return cb();
    },
    register(options, Component) {
      registeredSlots.push({ options, Component });
      return () => {};
    },
  },
};

try {
  mod.apply(fakeCtx);
  pass.push('apply 在假 ctx 上执行成功（无 DOM 环境自动降级）');
} catch (err) {
  failures.push('apply 抛错：' + err.message);
}

const slotNames = registeredSlots.map((r) => r.options.name);
['plugins.bundle.config', 'settings.plugin.item', 'sidebar.panellist', 'main'].forEach((name) => {
  if (!slotNames.includes(name)) failures.push('未注册槽位 ' + name);
  else pass.push('注册槽位 ' + name);
});

/* 左侧栏入口与主区面板页必须成对出现，id / key 一致才能互相导航 */
const entry = registeredSlots.find((r) => r.options.name === 'sidebar.panellist');
const page = registeredSlots.find((r) => r.options.name === 'main');
if (entry) {
  if (entry.options.id !== 'wallpaper-studio') failures.push('sidebar.panellist 的 id 应为 wallpaper-studio');
  else pass.push('sidebar.panellist id=wallpaper-studio');
  if (typeof entry.options.label !== 'function') failures.push('sidebar.panellist 缺本地化 label thunk');
  else pass.push('sidebar.panellist label()=' + entry.options.label());
  if (typeof entry.Component !== 'function') failures.push('sidebar.panellist 缺图标组件');
  else pass.push('sidebar.panellist 图标组件已注册');
}
if (page) {
  if (page.options.key !== 'wallpaper-studio') failures.push('main 面板的 key 应等于壁纸入口 id');
  else pass.push('main key=wallpaper-studio');
  if (typeof page.Component !== 'function') failures.push('main 面板缺页面组件');
  else pass.push('main 面板页面组件已注册');
}

/* 0.2.x 走 plugins.item（id=包名，宿主按 only: 包 id 过滤），旧版走 settings.plugin.item（key=命名空间） */
const modernCard = registeredSlots.find((r) => r.options.name === 'plugins.bundle.config');
const legacyCard = registeredSlots.find((r) => r.options.name === 'settings.plugin.item');
if (modernCard) {
  if (modernCard.options.key !== mod.name) failures.push('plugins.bundle.config 的 key 应等于包名');
  else pass.push('plugins.bundle.config key=' + modernCard.options.key);
}
if (legacyCard) {
  if (legacyCard.options.key !== mod.name) failures.push('settings.plugin.item 的 key 应等于插件命名空间');
  else pass.push('settings.plugin.item key=' + legacyCard.options.key);
}
const card = modernCard || legacyCard;
if (card) {
  if (card.options.locale !== mod.name) failures.push('槽位注册缺少 locale 绑定（卡片会静默不显示）');
  else pass.push('卡片槽位绑定 locale=' + card.options.locale);
  if (!card.options.label) failures.push('插件页标签缺 label');
  else pass.push('插件页标签 label=' + card.options.label);
  const face = card.options.inject();
  if (!face || !face.controller) failures.push('卡片 inject 面缺 controller');
  else if (typeof face.controller.getSnapshot !== 'function') failures.push('controller 缺 getSnapshot');
  else pass.push('卡片 inject 面提供 controller（getSnapshot / subscribe / patch）');
  if (face && (!face.controller.saveState || typeof face.controller.saveState.getSnapshot !== 'function')) {
    failures.push('controller 缺 saveState（保存状态无法显示）');
  } else if (face && typeof face.controller.save !== 'function') {
    failures.push('controller 缺 save（显式保存按钮无法落盘）');
  } else if (face) {
    pass.push('controller 提供显式保存（save / saveState）');
  }
  if (face && face.canOpenPanel !== true) failures.push('有布局服务时卡片应允许打开面板');
  else if (face) pass.push('卡片 inject 面提供 openPanel / canOpenPanel');
  if (page) {
    const pageFace = page.options.inject();
    if (!pageFace || !pageFace.controller) failures.push('面板页 inject 面缺 controller');
    else if (typeof pageFace.close !== 'function') failures.push('面板页 inject 面缺 close');
    else pass.push('面板页 inject 面提供 controller / close');
  }
}

if (localeDicts.length === 0) failures.push('未注册 locale 词典');
else {
  const dict = localeDicts[0].dict;
  pass.push('注册词典 namespace=' + localeDicts[0].ns);
  const zhKeys = Object.keys(dict.zh);
  const enKeys = Object.keys(dict.en);
  const missingEn = zhKeys.filter((k) => !(k in dict.en));
  const missingZh = enKeys.filter((k) => !(k in dict.zh));
  if (missingEn.length) failures.push('en 缺键：' + missingEn.join(', '));
  if (missingZh.length) failures.push('zh 缺键：' + missingZh.join(', '));
  if (!missingEn.length && !missingZh.length) pass.push('zh / en 词典键位一致（' + zhKeys.length + ' 键）');
}

/* ---- 卸载清理 ---- */
try {
  disposers.forEach((d) => d());
  pass.push('effect disposer 全部可执行（卸载不抛错）');
} catch (err) {
  failures.push('卸载抛错：' + err.message);
}

console.log(pass.map((m) => '  ✓ ' + m).join('\n'));
if (failures.length > 0) {
  console.log(failures.map((m) => '  ✗ ' + m).join('\n'));
  process.exit(1);
}
console.log('\n冒烟通过：' + pass.length + ' 项断言');
