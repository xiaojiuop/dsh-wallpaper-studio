window.__ModuleLoader__.load({ id: "dsh-wallpaper-studio", factory: (require) => {
var module = { exports: {} }; var exports = module.exports;
/**
 * dsh-wallpaper-studio — 浏览器半（client bundle 源文件）
 * -------------------------------------------------------------------------
 * 这个文件不是 ESM 模块，也不会被 tsc 编译：`scripts/build-client.mjs` 会把它
 * 原样包进 DSH 的「惰性 CJS 闭包工厂」外壳里（banner + intro + footer），产物是
 * `lib/client.js`。因此这里使用 `require('react')`，由外壳注入的 require 解析
 * 平台共享模块（react 是 platform.ts 白名单里的一员）。
 *
 * 设计边界（遵循 DSH 插件前端三条硬限制）：
 *  - 只用增量槽位：`plugins.bundle.config`（包详情页配置区，0.2.x）/ `settings.plugin.item`
 *    （旧版设置页，按 boot graph 自动二选一）、
 *    `sidebar.panellist`（左侧栏面板入口）与 `main`（keyed，仅 key=wallpaper-studio）；
 *  - 不替换 root / sidebar / rightbar / conversation 等父级 single 槽位；
 *  - 不 import 任何 `@deepseek-ai/*` 的值（只 require('react')）。
 */

'use strict';

const React = require('react');
const h = React.createElement;

const PLUGIN_ID = 'dsh-wallpaper-studio';
const NS = 'dsh-wallpaper-studio';
const PANEL_ID = 'wallpaper-studio';
const STYLE_ID = 'dws-base-style';
const TOKENS_STYLE_ID = 'dws-tokens';
const LAYER_ID = 'dws-bg';
const STORAGE_KEY = 'dsh-wallpaper-studio:v1';
const DB_NAME = 'dsh-wallpaper-studio-db';
const DB_STORE = 'media';
const HAS_DOM = typeof document !== 'undefined' && typeof window !== 'undefined';

/* ======================================================================
 * 文案
 * ==================================================================== */

const zh = {
  nav: '壁纸工作室',
  wallpaperStudio: '壁纸工作室',
  subtitle: '动态壁纸 · 主题色 · 透明度',
  toggle: '启用',
  offHint: '已关闭，界面恢复原生外观。',
  openPanel: '在左侧栏打开壁纸工作室',
  panelShort: '面板',
  closePanel: '返回对话',
  enableWallpaper: '启用壁纸',
  panelHint: '在左侧栏点「壁纸工作室」随时回来；所有改动即时生效，配置只保存在这台电脑的浏览器里。',
  save: '保存',
  saveConfig: '保存配置',
  saveHint: '立即写入本机浏览器；平时改动也会自动保存',
  saved: '已保存',
  saveFailed: '保存失败',
  saveFailedDetail: '保存失败：改动只在本次会话生效，请检查浏览器存储权限或可用空间。',
  autoSaveOn: '自动保存已开启',
  savedAt: '已保存',
  imported: '已导入',
  uploadFailed: '壁纸读取失败',
  shareMediaHint: '上传的图片 / 视频不会写进 JSON，换电脑后需要重新上传。',
  secWallpaper: '动态壁纸',
  uploadImage: '上传图片',
  uploadVideo: '上传视频',
  urlPlaceholder: '或粘贴图片 / 视频直链',
  load: '加载',
  clear: '移除',
  current: '当前',
  none: '无壁纸',
  builtin: '内置动态',
  loading: '载入中…',
  uploadHint: '图片 JPG / PNG / WebP / GIF，视频 MP4 / WebM（静音循环播放）。文件只留在这台电脑的浏览器里，不会上传到任何服务器。',
  resetAll: '恢复默认',
  secEffect: '背景效果',
  wallOpacity: '壁纸可见度',
  blur: '背景模糊',
  uiBlur: '界面磨砂',
  scrim: '遮罩暗度',
  baseAlpha: '主背景遮底',
  fit: '缩放方式',
  cover: '填充',
  contain: '适应',
  tile: '平铺',
  secColor: '主题色',
  accent: '主色',
  base: '底色',
  panel: '面板色',
  followDefault: '跟随默认',
  secAlpha: '界面通透',
  surfaceAlpha: '面板不透明度',
  inputAlpha: '输入框不透明度',
  menuAlpha: '弹层不透明度',
  secPreset: '配色预设',
  presetDefault: '默认',
  presetMidnight: '午夜',
  presetOcean: '海洋',
  presetForest: '森林',
  presetRose: '樱粉',
  presetIce: '冰川',
  secShare: '配置保存与导入导出',
  exportBtn: '复制配置',
  importBtn: '导入配置',
  importPlaceholder: '粘贴导出的 JSON…',
  apply: '应用',
  copied: '已复制',
  invalid: '配置无效',
  hint: '壁纸铺在界面最底层，面板 / 输入框 / 弹层的不透明度可分别调。壁纸偏亮时把「遮罩暗度」调高一点，正文更清楚。想让正文压在图上也清楚、又不想把壁纸糊成一片，就调「界面磨砂」——它只模糊面板背后那一层。',
  wp_aurora: '极光流动',
  wp_midnight: '午夜星尘',
  wp_forest: '森林晨雾',
  wp_ember: '熔岩余烬',
  wp_rose: '樱粉暮色',
  wp_ice: '冰川微光',
};

const en = {
  nav: 'Wallpaper Studio',
  wallpaperStudio: 'Wallpaper Studio',
  subtitle: 'Dynamic wallpaper · theme colour · transparency',
  toggle: 'Enabled',
  offHint: 'Off — the native look is restored.',
  openPanel: 'Open Wallpaper Studio in the left sidebar',
  panelShort: 'Panel',
  closePanel: 'Back to conversation',
  enableWallpaper: 'Turn wallpaper on',
  panelHint: 'Reopen it from the left sidebar at any time. Changes apply instantly and stay in this browser.',
  save: 'Save',
  saveConfig: 'Save config',
  saveHint: 'Write the current config to this browser now; changes also auto-save',
  saved: 'Saved',
  saveFailed: 'Save failed',
  saveFailedDetail: 'Save failed: changes last only for this session. Check browser storage permission or free space.',
  autoSaveOn: 'Auto-save is on',
  savedAt: 'Saved',
  imported: 'Imported',
  uploadFailed: 'Could not read the wallpaper',
  shareMediaHint: 'Uploaded images / videos are not written into the JSON; upload them again on another computer.',
  secWallpaper: 'Wallpaper',
  uploadImage: 'Upload image',
  uploadVideo: 'Upload video',
  urlPlaceholder: 'or paste a direct image / video URL',
  load: 'Load',
  clear: 'Remove',
  current: 'Current',
  none: 'None',
  builtin: 'Built in',
  loading: 'Loading…',
  uploadHint: 'Images: JPG / PNG / WebP / GIF. Video: MP4 / WebM (muted loop). Files stay in this browser — nothing is uploaded anywhere.',
  resetAll: 'Reset everything',
  secEffect: 'Background effects',
  wallOpacity: 'Wallpaper visibility',
  blur: 'Background blur',
  uiBlur: 'Interface frost',
  scrim: 'Readability scrim',
  baseAlpha: 'Base canvas veil',
  fit: 'Scaling',
  cover: 'Fill',
  contain: 'Fit',
  tile: 'Tile',
  secColor: 'Theme colours',
  accent: 'Accent',
  base: 'Base',
  panel: 'Panel',
  followDefault: 'Follow default',
  secAlpha: 'Transparency',
  surfaceAlpha: 'Panel opacity',
  inputAlpha: 'Input opacity',
  menuAlpha: 'Menu opacity',
  secPreset: 'Colour presets',
  presetDefault: 'Default',
  presetMidnight: 'Midnight',
  presetOcean: 'Ocean',
  presetForest: 'Forest',
  presetRose: 'Rose',
  presetIce: 'Ice',
  secShare: 'Save / export / import',
  exportBtn: 'Copy config',
  importBtn: 'Import config',
  importPlaceholder: 'Paste the exported JSON…',
  apply: 'Apply',
  copied: 'Copied',
  invalid: 'Invalid config',
  hint: 'The wallpaper sits behind the whole UI; panel, input and menu opacities are independent. Raise the scrim when the wallpaper is bright. Interface frost blurs only the layer behind panels, so the wallpaper itself stays sharp; 12-24px is a good start.',
  wp_aurora: 'Aurora',
  wp_midnight: 'Midnight dust',
  wp_forest: 'Forest mist',
  wp_ember: 'Ember',
  wp_rose: 'Rose dusk',
  wp_ice: 'Ice glow',
};

/* ======================================================================
 * 默认值 / 内置壁纸 / 配色预设
 * ==================================================================== */

const DEFAULT_SETTINGS = {
  enabled: true,
  colors: { accent: '', base: '', panel: '' },
  wallOpacity: 100,
  blurPx: 0,
  uiBlurPx: 18,
  scrim: 18,
  baseAlpha: 0,
  surfaceAlpha: 78,
  inputAlpha: 88,
  menuAlpha: 92,
  fit: 'cover',
  media: { kind: 'preset', preset: 'aurora' },
};

/** 内置动态壁纸：CSS 渐变 + 位移动画，零素材、零网络请求。 */
const BUILTIN = [
  {
    id: 'aurora',
    swatch: 'linear-gradient(125deg,#061726 0%,#0a4a5e 30%,#1f97a8 52%,#5b3f9e 76%,#061726 100%)',
  },
  {
    id: 'midnight',
    swatch: 'linear-gradient(140deg,#070a14 0%,#141b30 38%,#2b3350 62%,#070a14 100%)',
  },
  {
    id: 'forest',
    swatch: 'linear-gradient(135deg,#08180f 0%,#14402a 40%,#4f7d4a 64%,#08180f 100%)',
  },
  {
    id: 'ember',
    swatch: 'linear-gradient(130deg,#1b0a0c 0%,#5e1a16 38%,#c2552e 64%,#1b0a0c 100%)',
  },
  {
    id: 'rose',
    swatch: 'linear-gradient(135deg,#fff1f6 0%,#ffd6e5 42%,#f3b3cb 66%,#fff1f6 100%)',
  },
  {
    id: 'ice',
    swatch: 'linear-gradient(135deg,#eef5ff 0%,#d9e8ff 42%,#b9d3f0 66%,#eef5ff 100%)',
  },
];

/** 配色预设：一次把主色 / 底色 / 面板色 / 透明度 / 内置壁纸配好。 */
const PRESETS = {
  default: { key: 'presetDefault' },
  midnight: {
    key: 'presetMidnight',
    colors: { accent: '#679EFE', base: '#0D0F14', panel: '#1B1C1E' },
    wallOpacity: 100,
    blurPx: 2,
    uiBlurPx: 20,
    scrim: 42,
    baseAlpha: 6,
    surfaceAlpha: 72,
    inputAlpha: 84,
    menuAlpha: 90,
    media: { kind: 'preset', preset: 'midnight' },
  },
  ocean: {
    key: 'presetOcean',
    colors: { accent: '#2EA3B0', base: '#061A22', panel: '#0E2A33' },
    wallOpacity: 94,
    blurPx: 3,
    uiBlurPx: 20,
    scrim: 34,
    baseAlpha: 4,
    surfaceAlpha: 68,
    inputAlpha: 82,
    menuAlpha: 88,
    media: { kind: 'preset', preset: 'aurora' },
  },
  forest: {
    key: 'presetForest',
    colors: { accent: '#4F9E6A', base: '#08170F', panel: '#132A1D' },
    wallOpacity: 96,
    blurPx: 1,
    uiBlurPx: 18,
    scrim: 36,
    baseAlpha: 4,
    surfaceAlpha: 74,
    inputAlpha: 86,
    menuAlpha: 90,
    media: { kind: 'preset', preset: 'forest' },
  },
  rose: {
    key: 'presetRose',
    colors: { accent: '#D96A96', base: '#FFF7FA', panel: '#FFFFFF' },
    wallOpacity: 100,
    blurPx: 1,
    uiBlurPx: 14,
    scrim: 26,
    baseAlpha: 0,
    surfaceAlpha: 80,
    inputAlpha: 88,
    menuAlpha: 92,
    media: { kind: 'preset', preset: 'rose' },
  },
  ice: {
    key: 'presetIce',
    colors: { accent: '#4A86C8', base: '#F4F8FF', panel: '#FFFFFF' },
    wallOpacity: 100,
    blurPx: 2,
    uiBlurPx: 14,
    scrim: 22,
    baseAlpha: 0,
    surfaceAlpha: 78,
    inputAlpha: 88,
    menuAlpha: 92,
    media: { kind: 'preset', preset: 'ice' },
  },
};

/* ======================================================================
 * 小工具
 * ==================================================================== */

function clamp(n, min, max) {
  return n < min ? min : n > max ? max : n;
}

function num(v, fallback) {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function hexToRgb(hex) {
  if (typeof hex !== 'string') return null;
  let v = hex.trim().replace(/^#/, '');
  if (v.length === 3) v = v[0] + v[0] + v[1] + v[1] + v[2] + v[2];
  if (v.length === 8) v = v.slice(0, 6);
  if (!/^[0-9a-fA-F]{6}$/.test(v)) return null;
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
}

function isHex(v) {
  return hexToRgb(v) !== null;
}

function rgba(hex, alpha) {
  const rgb = hexToRgb(hex) || [255, 255, 255];
  const a = clamp(num(alpha, 1), 0, 1);
  return 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',' + (Math.round(a * 1000) / 1000) + ')';
}

function mixHex(a, b, t) {
  const ca = hexToRgb(a) || [255, 255, 255];
  const cb = hexToRgb(b) || [255, 255, 255];
  const k = clamp(num(t, 0), 0, 1);
  const out = [0, 1, 2].map(function (i) {
    return Math.round(ca[i] * (1 - k) + cb[i] * k);
  });
  return (
    '#' +
    out
      .map(function (v) {
        return ('0' + v.toString(16)).slice(-2);
      })
      .join('')
  );
}

function escapeUrl(url) {
  return String(url).replace(/"/g, '%22').replace(/\\/g, '%5C');
}

function isVideoUrl(url) {
  return /\.(mp4|webm|mov|m4v)([?#]|$)/i.test(String(url));
}

/* ======================================================================
 * 设置规范化 / 持久化
 * ==================================================================== */

function normMedia(raw) {
  if (!raw || typeof raw !== 'object') return { kind: 'none' };
  const kind = raw.kind;
  if (kind === 'preset') {
    const id = BUILTIN.some((w) => w.id === raw.preset) ? raw.preset : 'aurora';
    return { kind: 'preset', preset: id };
  }
  if (kind === 'upload') {
    if (typeof raw.blobId !== 'string' || raw.blobId === '') return { kind: 'none' };
    return {
      kind: 'upload',
      blobId: raw.blobId,
      mediaType: raw.mediaType === 'video' ? 'video' : 'image',
      name: typeof raw.name === 'string' ? raw.name.slice(0, 120) : '',
    };
  }
  if (kind === 'url') {
    if (typeof raw.url !== 'string' || raw.url === '') return { kind: 'none' };
    return {
      kind: 'url',
      url: raw.url.slice(0, 2000),
      mediaType: raw.mediaType === 'video' || isVideoUrl(raw.url) ? 'video' : 'image',
    };
  }
  return { kind: 'none' };
}

function normSettings(raw) {
  const src = raw && typeof raw === 'object' ? raw : {};
  const colors = src.colors && typeof src.colors === 'object' ? src.colors : {};
  const pick = (v) => (isHex(v) ? '#' + String(v).replace(/^#/, '').toUpperCase() : '');
  const fit = ['cover', 'contain', 'tile'].indexOf(src.fit) >= 0 ? src.fit : 'cover';
  return {
    enabled: src.enabled === undefined ? DEFAULT_SETTINGS.enabled : src.enabled !== false,
    colors: { accent: pick(colors.accent), base: pick(colors.base), panel: pick(colors.panel) },
    wallOpacity: clamp(num(src.wallOpacity, DEFAULT_SETTINGS.wallOpacity), 0, 100),
    blurPx: clamp(num(src.blurPx, DEFAULT_SETTINGS.blurPx), 0, 40),
    uiBlurPx: clamp(num(src.uiBlurPx, DEFAULT_SETTINGS.uiBlurPx), 0, 40),
    scrim: clamp(num(src.scrim, DEFAULT_SETTINGS.scrim), 0, 100),
    baseAlpha: clamp(num(src.baseAlpha, DEFAULT_SETTINGS.baseAlpha), 0, 100),
    surfaceAlpha: clamp(num(src.surfaceAlpha, DEFAULT_SETTINGS.surfaceAlpha), 0, 100),
    inputAlpha: clamp(num(src.inputAlpha, DEFAULT_SETTINGS.inputAlpha), 0, 100),
    menuAlpha: clamp(num(src.menuAlpha, DEFAULT_SETTINGS.menuAlpha), 0, 100),
    fit: fit,
    media: normMedia(src.media),
  };
}

function loadSettings() {
  if (!HAS_DOM) return normSettings(DEFAULT_SETTINGS);
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return normSettings(DEFAULT_SETTINGS);
    return normSettings(JSON.parse(raw));
  } catch (err) {
    return normSettings(DEFAULT_SETTINGS);
  }
}

function saveSettings(settings) {
  if (!HAS_DOM) return false;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    return true;
  } catch (err) {
    /* 隐私模式 / 配额满：内存态仍然生效，但要把失败告诉界面 */
    return false;
  }
}

/* ======================================================================
 * IndexedDB：壁纸 Blob 的原图存储（不占 localStorage 配额）
 * ==================================================================== */

function openDb() {
  return new Promise(function (resolve, reject) {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = function () {
      const db = req.result;
      if (!db.objectStoreNames.contains(DB_STORE)) db.createObjectStore(DB_STORE);
    };
    req.onsuccess = function () {
      resolve(req.result);
    };
    req.onerror = function () {
      reject(req.error || new Error('IndexedDB open failed'));
    };
  });
}

function idbPut(key, blob) {
  return openDb().then(function (db) {
    return new Promise(function (resolve, reject) {
      const tx = db.transaction(DB_STORE, 'readwrite');
      tx.objectStore(DB_STORE).put(blob, key);
      tx.oncomplete = function () {
        db.close();
        resolve(true);
      };
      tx.onerror = function () {
        db.close();
        reject(tx.error);
      };
    });
  });
}

function idbGet(key) {
  return openDb().then(function (db) {
    return new Promise(function (resolve, reject) {
      const tx = db.transaction(DB_STORE, 'readonly');
      const req = tx.objectStore(DB_STORE).get(key);
      req.onsuccess = function () {
        db.close();
        resolve(req.result || null);
      };
      req.onerror = function () {
        db.close();
        reject(req.error);
      };
    });
  });
}

function idbDelete(key) {
  return openDb()
    .then(function (db) {
      return new Promise(function (resolve) {
        const tx = db.transaction(DB_STORE, 'readwrite');
        tx.objectStore(DB_STORE).delete(key);
        tx.oncomplete = function () {
          db.close();
          resolve(true);
        };
        tx.onerror = function () {
          db.close();
          resolve(false);
        };
      });
    })
    .catch(function () {
      return false;
    });
}

/* ======================================================================
 * 静态样式表（插件自己的命名空间 dws-*，不写裸选择器覆盖宿主）
 * ==================================================================== */

const SHEET = `
#${LAYER_ID}{position:fixed;inset:-48px;z-index:-1;pointer-events:none;overflow:hidden;background-color:var(--dws-base-color,#111318);}
#${LAYER_ID}::before{content:"";position:absolute;inset:0;background-image:var(--dws-bg-image,none);background-position:center;background-repeat:var(--dws-repeat,no-repeat);background-size:var(--dws-fit,cover);opacity:var(--dws-wall-opacity,1);filter:blur(var(--dws-blur,0px));transition:opacity .22s ease,filter .22s ease,background-size .22s ease;}
#${LAYER_ID}>video{display:none;}
#${LAYER_ID}[data-video]>video{display:block;position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:var(--dws-wall-opacity,1);filter:blur(var(--dws-blur,0px));transition:opacity .22s ease,filter .22s ease;}
#${LAYER_ID}[data-video]::before{display:none;}
#${LAYER_ID}::after{content:"";position:absolute;inset:0;pointer-events:none;background:rgba(255,255,255,var(--dws-scrim,0));}
body[data-ds-dark-theme] #${LAYER_ID}::after,body[data-theme="dark"] #${LAYER_ID}::after,html[data-theme="dark"] #${LAYER_ID}::after{background:rgba(6,8,14,var(--dws-scrim,0));}

/* 内置动态壁纸：渐变 + 缓慢位移 */
#${LAYER_ID}[data-preset="aurora"]::before{background-image:linear-gradient(125deg,#061726 0%,#0a4a5e 30%,#1f97a8 52%,#5b3f9e 76%,#061726 100%);background-size:280% 280%;animation:dws-drift 34s ease-in-out infinite;}
#${LAYER_ID}[data-preset="midnight"]::before{background-image:linear-gradient(140deg,#070a14 0%,#141b30 38%,#2b3350 62%,#070a14 100%);background-size:300% 300%;animation:dws-drift 44s ease-in-out infinite reverse;}
#${LAYER_ID}[data-preset="forest"]::before{background-image:linear-gradient(135deg,#08180f 0%,#14402a 40%,#4f7d4a 64%,#08180f 100%);background-size:280% 280%;animation:dws-drift 38s ease-in-out infinite;}
#${LAYER_ID}[data-preset="ember"]::before{background-image:linear-gradient(130deg,#1b0a0c 0%,#5e1a16 38%,#c2552e 64%,#1b0a0c 100%);background-size:260% 260%;animation:dws-drift 26s ease-in-out infinite reverse;}
#${LAYER_ID}[data-preset="rose"]::before{background-image:linear-gradient(135deg,#fff1f6 0%,#ffd6e5 42%,#f3b3cb 66%,#fff1f6 100%);background-size:240% 240%;animation:dws-drift 40s ease-in-out infinite;}
#${LAYER_ID}[data-preset="ice"]::before{background-image:linear-gradient(135deg,#eef5ff 0%,#d9e8ff 42%,#b9d3f0 66%,#eef5ff 100%);background-size:240% 240%;animation:dws-drift 46s ease-in-out infinite reverse;}
@keyframes dws-drift{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
@media (prefers-reduced-motion:reduce){#${LAYER_ID}::before{animation:none!important}}

/* 壁纸生效时把宿主的整页底挖空，让最底层壁纸透出来 */
html[data-dws-active] #root{background-color:transparent!important;}
html[data-dws-active][data-windows-titlebar] [class*="_frame"]{background:transparent!important;}
html[data-dws-active][data-windows-titlebar] [class*="_frame"]::before{background:transparent!important;}
/* 界面磨砂：只模糊「面板背后」那一层壁纸，壁纸本身保持清晰。宿主（DockKit /
   dsh-client-ui-layout）把面板画在 [class*="_tabHost_"] / [class*="_sidebarCol"] /
   [class*="_rightbarCol"] / [class*="_bottomRow"] 上，类名形态是 _tabHost_<hash>_<line>，
   取语义片段即可命中，不依赖 hash，宿主升级后依然有效。 */
html[data-dws-active] :is([class*="_tabHost_"],[class*="_sidebarCol"],[class*="_rightbarCol"],[class*="_bottomRow"],[class*="_float_"]){-webkit-backdrop-filter:blur(var(--dws-ui-blur,0px));backdrop-filter:blur(var(--dws-ui-blur,0px));}
/* backdrop-filter 会让元素变成 position:fixed 后代的包含块，而浮窗面板（_float_）正是
   fixed 定位：只要某列/某面板里存在浮窗（_floatingCell_），就摘掉它的磨砂，
   免得浮窗被推到偏移位置。 */
html[data-dws-active] :is([class*="_tabHost_"],[class*="_sidebarCol"],[class*="_rightbarCol"],[class*="_bottomRow"]):has([class*="_floatingCell_"]){-webkit-backdrop-filter:none;backdrop-filter:none;}

/* 设置卡片 */
.dws-card{margin:0 0 10px;padding:0;border-radius:14px;border:1px solid var(--dsw-alias-border-l2,rgba(127,127,127,.22));background:var(--dsw-alias-bg-layer-2,#fff);overflow:hidden;}
.dws-head{display:flex;align-items:center;gap:10px;padding:12px 14px;cursor:pointer;user-select:none;}
.dws-head__mark{width:30px;height:30px;border-radius:9px;flex:0 0 auto;background:linear-gradient(130deg,#1f97a8,#5b3f9e);}
.dws-head__tt{display:flex;flex-direction:column;gap:2px;min-width:0;}
.dws-head__title{font-size:14px;font-weight:600;color:var(--dsw-alias-label-primary,inherit);}
.dws-head__sub{font-size:11px;color:var(--dsw-alias-label-tertiary,#8b909a);}
.dws-head__right{margin-left:auto;display:flex;align-items:center;gap:8px;}
.dws-switch{position:relative;width:38px;height:22px;border-radius:11px;border:1px solid var(--dsw-alias-border-l2,rgba(127,127,127,.3));background:var(--dsw-alias-bg-layer-3,#e9ebef);cursor:pointer;transition:background .18s ease;}
.dws-switch.is-on{background:var(--dsw-alias-brand-primary,#4176e6);border-color:transparent;}
.dws-switch__knob{position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:#fff;transition:left .18s ease;box-shadow:0 1px 2px rgba(0,0,0,.18);}
.dws-switch.is-on .dws-switch__knob{left:18px;}
.dws-body{padding:0 14px 14px;display:flex;flex-direction:column;gap:14px;}
.dws-off{padding:0 14px 14px;font-size:12px;color:var(--dsw-alias-label-tertiary,#8b909a);}
.dws-sec{display:flex;flex-direction:column;gap:8px;}
.dws-sec__title{font-size:12px;font-weight:600;color:var(--dsw-alias-label-secondary,#5a6070);letter-spacing:.2px;}
.dws-row{display:flex;align-items:center;gap:10px;}
.dws-label{font-size:12px;color:var(--dsw-alias-label-secondary,#5a6070);min-width:92px;}
.dws-slider{flex:1;-webkit-appearance:none;appearance:none;height:4px;border-radius:2px;background:var(--dsw-alias-bg-layer-3,#e6e8ee);outline:none;accent-color:var(--dsw-alias-brand-primary,#4176e6);}
.dws-slider::-webkit-slider-thumb{-webkit-appearance:none;width:14px;height:14px;border-radius:50%;background:var(--dsw-alias-brand-primary,#4176e6);cursor:pointer;box-shadow:0 1px 3px rgba(0,0,0,.25);}
.dws-val{font-variant-numeric:tabular-nums;font-size:11px;color:var(--dsw-alias-label-tertiary,#8b909a);min-width:40px;text-align:right;}
.dws-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:28px;padding:0 11px;border-radius:8px;border:1px solid var(--dsw-alias-border-l2,rgba(127,127,127,.28));background:var(--dsw-alias-bg-layer-1,#fff);color:var(--dsw-alias-label-primary,inherit);font-size:12px;cursor:pointer;transition:background .16s ease,border-color .16s ease;}
.dws-btn:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.12));}
.dws-btn--ghost{background:transparent;}
.dws-btn--primary{background:var(--dsw-alias-button-info-fill,#4176e6);color:#fff;border-color:transparent;}
.dws-btn--primary:hover{background:var(--dsw-alias-button-info-fill,#4176e6);filter:brightness(1.1);}
.dws-btn--danger{color:var(--dsw-alias-state-error-primary,#d34a4a);}
.dws-btn[disabled]{opacity:.55;cursor:default;}
.dws-tiles{display:grid;grid-template-columns:repeat(auto-fill,minmax(78px,1fr));gap:8px;}
.dws-tile{position:relative;height:50px;border-radius:9px;border:1px solid var(--dsw-alias-border-l2,rgba(127,127,127,.22));background-size:cover;background-position:center;cursor:pointer;overflow:hidden;padding:0;display:flex;align-items:flex-end;}
.dws-tile span{width:100%;padding:2px 6px;font-size:10px;text-align:left;color:#fff;text-shadow:0 1px 3px rgba(0,0,0,.6);background:linear-gradient(transparent,rgba(0,0,0,.42));}
.dws-tile.is-on{outline:2px solid var(--dsw-alias-brand-primary,#4176e6);outline-offset:-2px;}
.dws-tile__none{height:50px;border-radius:9px;border:1px dashed var(--dsw-alias-border-l2,rgba(127,127,127,.3));background:transparent;color:var(--dsw-alias-label-tertiary,#8b909a);font-size:11px;cursor:pointer;display:flex;align-items:center;justify-content:center;}
.dws-tile__none.is-on{outline:2px solid var(--dsw-alias-brand-primary,#4176e6);outline-offset:-2px;color:var(--dsw-alias-label-primary,inherit);}
.dws-input{flex:1;height:28px;padding:0 9px;border-radius:8px;border:1px solid var(--dsw-alias-border-l2,rgba(127,127,127,.28));background:var(--dsw-alias-bg-layer-1,#fff);color:var(--dsw-alias-label-primary,inherit);font-size:12px;outline:none;min-width:0;}
.dws-input:focus{border-color:var(--dsw-alias-brand-primary,#4176e6);}
.dws-color{width:34px;height:28px;padding:0;border:1px solid var(--dsw-alias-border-l2,rgba(127,127,127,.28));border-radius:8px;background:transparent;cursor:pointer;}
.dws-hex{width:96px;height:28px;padding:0 8px;border-radius:8px;border:1px solid var(--dsw-alias-border-l2,rgba(127,127,127,.28));background:var(--dsw-alias-bg-layer-1,#fff);color:var(--dsw-alias-label-secondary,#5a6070);font-size:11px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;outline:none;}
.dws-chips{display:flex;flex-wrap:wrap;gap:7px;}
.dws-chip{height:26px;padding:0 10px;border-radius:7px;border:1px solid var(--dsw-alias-border-l2,rgba(127,127,127,.26));background:var(--dsw-alias-bg-layer-1,#fff);color:var(--dsw-alias-label-secondary,#5a6070);font-size:11px;cursor:pointer;}
.dws-chip:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.12));}
.dws-note{font-size:11px;line-height:1.6;color:var(--dsw-alias-label-tertiary,#8b909a);}
.dws-note--warn{color:var(--dsw-alias-state-error-primary,#d34a4a);}
.dws-files{display:flex;flex-wrap:wrap;gap:7px;}

/* 左侧栏面板页：壁纸工作室 */
.dws-page{display:flex;flex-direction:column;height:100%;min-height:0;overflow:auto;background:var(--dsw-alias-bg-base,#f6f7f9);color:var(--dsw-alias-label-primary,inherit);-webkit-backdrop-filter:blur(16px) saturate(1.04);backdrop-filter:blur(16px) saturate(1.04);}
.dws-page__inner{display:flex;flex-direction:column;gap:18px;width:100%;max-width:1040px;margin:0 auto;box-sizing:border-box;padding:28px clamp(20px,4vw,48px) 56px;}
.dws-hero{display:flex;align-items:center;gap:14px;flex-wrap:wrap;}
.dws-hero__mark{display:flex;align-items:center;justify-content:center;width:44px;height:44px;flex:0 0 auto;border-radius:13px;color:#fff;background:linear-gradient(130deg,#1f97a8,#5b3f9e);box-shadow:0 8px 20px rgba(31,151,168,.22);}
.dws-hero__tt{display:flex;flex-direction:column;gap:2px;min-width:0;}
.dws-hero__title{margin:0;font-size:20px;line-height:1.3;font-weight:650;letter-spacing:.2px;color:var(--dsw-alias-label-primary,inherit);}
.dws-hero__sub{margin:0;font-size:12px;color:var(--dsw-alias-label-tertiary,#8b909a);}
.dws-hero__actions{display:flex;align-items:center;gap:10px;margin-left:auto;}
.dws-hero__switch{display:flex;align-items:center;gap:8px;padding:4px 6px 4px 11px;border-radius:999px;border:1px solid var(--dsw-alias-border-l2,rgba(127,127,127,.22));background:var(--dsw-alias-bg-layer-1,#fff);}
.dws-hero__switch>span{font-size:12px;color:var(--dsw-alias-label-secondary,#5a6070);}
.dws-banner{display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:12px;border:1px solid var(--dsw-alias-border-l2,rgba(127,127,127,.22));background:var(--dsw-alias-bg-layer-2,#fff);}
.dws-banner .dws-note{margin-right:auto;font-size:12px;}
.dws-openbtn{display:inline-flex;align-items:center;justify-content:center;gap:5px;height:28px;padding:0 9px;border-radius:8px;border:1px solid transparent;background:transparent;color:var(--dsw-alias-label-secondary,#5a6070);font-size:11px;cursor:pointer;}
.dws-openbtn:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.12));color:var(--dsw-alias-label-primary,inherit);}

/* 面板里把原卡片的六个分区摊成卡片网格：壁纸与导入导出通栏，中间两列 */
.dws-card--bare{margin:0;background:transparent;border:0;border-radius:0;overflow:visible;}
.dws-card--bare .dws-body{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;padding:0;align-items:start;}
.dws-card--bare .dws-body>.dws-sec{display:flex;flex-direction:column;gap:10px;padding:16px;border-radius:16px;border:1px solid var(--dsw-alias-border-l2,rgba(127,127,127,.2));background:var(--dsw-alias-bg-layer-1,#fff);box-shadow:0 1px 2px rgba(16,24,40,.04);}
.dws-card--bare .dws-body>.dws-sec:first-child,.dws-card--bare .dws-body>.dws-sec:last-child,.dws-card--bare .dws-body>.dws-note{grid-column:1/-1;}
.dws-card--bare .dws-sec__title{font-size:13px;font-weight:650;}
@media (max-width:900px){.dws-card--bare .dws-body{grid-template-columns:1fr;}.dws-hero__actions{width:100%;margin-left:0;justify-content:flex-end;}}
`;

/* ======================================================================
 * 应用层：壁纸元素 / token 覆盖 / 主题色
 * ==================================================================== */

let layerEl = null;
let videoEl = null;
let objectUrl = null;
let objectKey = null;
let mediaSeq = 0;
let mediaCache = Object.create(null);
let baseColor = '#111318';

function ensureBaseStyle() {
  if (!HAS_DOM) return;
  const existing = document.getElementById(STYLE_ID);
  if (existing) {
    /* HMR / 热更新时旧 <style> 会留着；sheet 变了就刷新，否则新 CSS 永不生效 */
    if (existing.textContent !== SHEET) existing.textContent = SHEET;
    return;
  }
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.dataset.plugin = PLUGIN_ID;
  el.textContent = SHEET;
  document.head.append(el);
}

function ensureLayer() {
  if (!HAS_DOM) return null;
  if (layerEl && layerEl.isConnected) return layerEl;
  const el = document.createElement('div');
  el.id = LAYER_ID;
  el.dataset.plugin = PLUGIN_ID;
  el.setAttribute('aria-hidden', 'true');
  document.body.insertBefore(el, document.body.firstChild);
  layerEl = el;
  videoEl = null;
  return el;
}

function themeModeColor(settings, role, mode) {
  const picked = settings.colors && settings.colors[role];
  if (picked) return picked;
  if (role === 'accent') return mode === 'dark' ? '#679EFE' : '#4176E6';
  if (role === 'base') return mode === 'dark' ? '#151517' : '#FFFFFF';
  return mode === 'dark' ? '#1B1C1E' : '#FFFFFF';
}

/**
 * 把设置投影成一组 CSS 自定义属性（宿主的设计令牌 alias 层）。
 * 一切与主题相关的属性都走 alias 层，深色模式单独一组声明，`!important`
 * 只作用在这些变量上，避免和宿主自己的主题表打架。
 */
function modeTokens(settings, mode) {
  const base = themeModeColor(settings, 'base', mode);
  const panel = themeModeColor(settings, 'panel', mode);
  const accent = themeModeColor(settings, 'accent', mode);
  /* 主背景蒙层：0% = 不遮底（壁纸从主背景透出来），100% = 完全盖住壁纸。
     注意别写成 1 - x/100，那样默认值 0 会让底板全不透明，壁纸等于白装。 */
  const baseAlpha = clamp(settings.baseAlpha, 0, 100) / 100;
  const sA = clamp(settings.surfaceAlpha, 0, 100) / 100;
  const iA = clamp(settings.inputAlpha, 0, 100) / 100;
  const mA = clamp(settings.menuAlpha, 0, 100) / 100;

  const l2 = mixHex(panel, base, 0.08);
  const l3 = mixHex(panel, base, 0.14);
  const mod = mixHex(panel, base, 0.06);
  const side = mixHex(panel, base, 0.04);

  const tokens = {
    '--dsw-alias-bg-base': rgba(base, baseAlpha),
    '--dsw-alias-bg-layer-1': rgba(panel, sA),
    '--dsw-alias-bg-layer-2': rgba(l2, sA),
    '--dsw-alias-bg-layer-3': rgba(l3, sA),
    '--dsw-alias-bg-overlay': rgba(mixHex(panel, base, 0.1), sA),
    '--dsw-alias-bg-module-platform': rgba(mod, sA),
    '--dsw-specific-sidebar-fill': rgba(side, sA),
    '--dsw-specific-bubble': rgba(panel, Math.min(1, sA + 0.06)),
    '--dsw-alias-fill-l1': rgba(mod, sA),
    '--dsw-alias-fill-l2': rgba(mixHex(panel, base, 0.1), sA),
    '--dsw-specific-menu': rgba(l3, mA),
    '--dsw-menu-surface-fill': rgba(l3, mA),
    '--dsw-specific-input-major': rgba(panel, iA),
    '--dsw-alias-brand-primary': accent,
    '--dsw-alias-state-business-primary': accent,
    '--dsw-alias-button-info-fill': accent,
  };

  return { base: base, tokens: tokens };
}

function decl(obj) {
  return Object.keys(obj)
    .map(function (k) {
      return k + ':' + obj[k] + '!important';
    })
    .join(';');
}

function writeTokens(settings) {
  if (!HAS_DOM) return;
  let el = document.getElementById(TOKENS_STYLE_ID);
  if (!el) {
    el = document.createElement('style');
    el.id = TOKENS_STYLE_ID;
    el.dataset.plugin = PLUGIN_ID;
    document.head.append(el);
  }
  const light = modeTokens(settings, 'light');
  const dark = modeTokens(settings, 'dark');
  baseColor = light.base;
  el.textContent =
    'body{' +
    decl(light.tokens) +
    '}\n' +
    'body[data-ds-dark-theme],body[data-theme="dark"],html[data-theme="dark"] body{' +
    decl(dark.tokens) +
    '}\n' +
    'body[data-ds-dark-theme]{--dws-base-color:' +
    dark.base +
    '}\n';
}

function stopVideo() {
  if (videoEl) {
    try {
      videoEl.pause();
      videoEl.removeAttribute('src');
      videoEl.load();
      videoEl.remove();
    } catch (err) {
      /* ignore */
    }
    videoEl = null;
  }
}

function revokeOne(key) {
  const url = mediaCache[key];
  if (!url) return;
  try {
    URL.revokeObjectURL(url);
  } catch (err) {
    /* ignore */
  }
  delete mediaCache[key];
}

function revokeAll() {
  Object.keys(mediaCache).forEach(revokeOne);
  mediaCache = Object.create(null);
  objectUrl = null;
  objectKey = null;
}

function mediaUrlFor(settings) {
  const media = settings.media;
  if (!media || media.kind !== 'upload') return Promise.resolve(null);
  if (mediaCache[media.blobId]) return Promise.resolve(mediaCache[media.blobId]);
  return idbGet(media.blobId)
    .then(function (blob) {
      if (!blob) return null;
      const url = URL.createObjectURL(blob);
      mediaCache[media.blobId] = url;
      return url;
    })
    .catch(function () {
      return null;
    });
}

function syncMedia(settings) {
  if (!HAS_DOM) return;
  const layer = ensureLayer();
  if (!layer) return;
  const seq = (mediaSeq += 1);
  const media = settings.media;

  if (!media || media.kind === 'none') {
    layer.removeAttribute('data-video');
    layer.removeAttribute('data-preset');
    layer.style.setProperty('--dws-bg-image', 'none');
    stopVideo();
    return;
  }

  if (media.kind === 'preset') {
    layer.removeAttribute('data-video');
    layer.setAttribute('data-preset', media.preset || 'aurora');
    layer.style.setProperty('--dws-bg-image', 'none');
    stopVideo();
    return;
  }

  const settle = function (url, mediaType) {
    if (seq !== mediaSeq) return;
    if (!url) {
      layer.removeAttribute('data-preset');
      layer.removeAttribute('data-video');
      layer.style.setProperty('--dws-bg-image', 'none');
      return;
    }
    layer.removeAttribute('data-preset');
    if (mediaType === 'video') {
      layer.style.setProperty('--dws-bg-image', 'none');
      if (!videoEl) {
        videoEl = document.createElement('video');
        videoEl.muted = true;
        videoEl.loop = true;
        videoEl.autoplay = true;
        videoEl.playsInline = true;
        videoEl.setAttribute('playsinline', '');
        videoEl.setAttribute('muted', '');
        videoEl.setAttribute('aria-hidden', 'true');
        layer.append(videoEl);
      }
      if (videoEl.getAttribute('src') !== url) {
        videoEl.setAttribute('src', url);
        const p = videoEl.play();
        if (p && typeof p.catch === 'function') p.catch(function () {});
      }
      layer.setAttribute('data-video', '');
    } else {
      layer.removeAttribute('data-video');
      stopVideo();
      layer.style.setProperty('--dws-bg-image', 'url("' + escapeUrl(url) + '")');
    }
  };

  if (media.kind === 'url') {
    settle(media.url, media.mediaType);
    return;
  }

  mediaUrlFor(settings).then(function (url) {
    if (seq !== mediaSeq) return;
    objectUrl = url;
    objectKey = media.blobId;
    settle(url, media.mediaType);
  });
}

function applyFit(settings) {
  if (!HAS_DOM) return;
  const layer = layerEl;
  if (!layer) return;
  if (settings.fit === 'contain') {
    layer.style.setProperty('--dws-fit', 'contain');
    layer.style.setProperty('--dws-repeat', 'no-repeat');
  } else if (settings.fit === 'tile') {
    layer.style.setProperty('--dws-fit', 'auto');
    layer.style.setProperty('--dws-repeat', 'repeat');
  } else {
    layer.style.setProperty('--dws-fit', 'cover');
    layer.style.setProperty('--dws-repeat', 'no-repeat');
  }
}

function applyAll(settings) {
  if (!HAS_DOM) return;
  ensureBaseStyle();
  if (!settings.enabled) {
    teardown();
    return;
  }
  const layer = ensureLayer();
  if (!layer) return;
  document.documentElement.setAttribute('data-dws-active', '');
  const body = document.body;
  body.style.setProperty('--dws-wall-opacity', String(clamp(settings.wallOpacity, 0, 100) / 100));
  body.style.setProperty('--dws-blur', clamp(settings.blurPx, 0, 40) + 'px');
  body.style.setProperty('--dws-ui-blur', clamp(settings.uiBlurPx, 0, 40) + 'px');
  body.style.setProperty('--dws-scrim', String(clamp(settings.scrim, 0, 100) / 100));
  writeTokens(settings);
  body.style.setProperty('--dws-base-color', baseColor);
  applyFit(settings);
  syncMedia(settings);
}

function teardown() {
  if (!HAS_DOM) return;
  stopVideo();
  revokeAll();
  const prev = layerEl;
  layerEl = null;
  mediaSeq += 1;
  if (prev && prev.parentNode) prev.parentNode.removeChild(prev);
  const tokens = document.getElementById(TOKENS_STYLE_ID);
  if (tokens) tokens.remove();
  document.documentElement.removeAttribute('data-dws-active');
  const body = document.body;
  if (body) {
    body.style.removeProperty('--dws-wall-opacity');
    body.style.removeProperty('--dws-blur');
    body.style.removeProperty('--dws-ui-blur');
    body.style.removeProperty('--dws-scrim');
    body.style.removeProperty('--dws-base-color');
  }
}

/* ======================================================================
 * 状态仓库 + 控制器
 * ==================================================================== */

function createStore(initial) {
  let snap = Object.freeze(initial);
  const listeners = new Set();
  return {
    get: function () {
      return snap;
    },
    set: function (next) {
      snap = Object.freeze(next);
      listeners.forEach(function (fn) {
        try {
          fn();
        } catch (err) {
          /* ignore */
        }
      });
    },
    subscribe: function (fn) {
      listeners.add(fn);
      return function () {
        listeners.delete(fn);
      };
    },
  };
}

function createController(store, opts) {
  const options = opts || {};
  const saveStore = createStore({ ok: true, at: 0 });
  const markSave = function (ok) {
    saveStore.set({ ok: ok === true, at: Date.now() });
  };
  const commit = function (next) {
    const normalized = normSettings(next);
    const previous = store.get();
    store.set(normalized);
    markSave(saveSettings(normalized));
    try {
      applyAll(normalized);
    } catch (err) {
      if (options.warn) options.warn('[dsh-wallpaper-studio] apply failed', err);
    }
    /* 切走某个上传壁纸时把它从 IndexedDB 里清掉，避免素材越积越多 */
    if (
      previous &&
      previous.media &&
      previous.media.kind === 'upload' &&
      previous.media.blobId &&
      !(normalized.media.kind === 'upload' && normalized.media.blobId === previous.media.blobId)
    ) {
      revokeOne(previous.media.blobId);
      idbDelete(previous.media.blobId);
    }
    return normalized;
  };

  return {
    getSnapshot: store.get,
    subscribe: store.subscribe,
    saveState: {
      getSnapshot: saveStore.get,
      subscribe: saveStore.subscribe,
    },
    save: function () {
      const ok = saveSettings(store.get());
      markSave(ok);
      return ok;
    },
    patch: function (patch) {
      const current = store.get();
      const next = Object.assign({}, current, patch);
      if (patch && patch.colors) next.colors = Object.assign({}, current.colors, patch.colors);
      return commit(next);
    },
    setMedia: function (media) {
      return this.patch({ media: media });
    },
    upload: function (file) {
      const self = this;
      if (!file) return Promise.resolve(false);
      const mediaType = String(file.type || '').indexOf('video/') === 0 ? 'video' : 'image';
      const blobId = 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
      return idbPut(blobId, file)
        .then(function () {
          self.setMedia({ kind: 'upload', blobId: blobId, mediaType: mediaType, name: file.name || '' });
          return true;
        })
        .catch(function (err) {
          if (options.warn) options.warn('[dsh-wallpaper-studio] storing wallpaper failed', err);
          return false;
        });
    },
    clearMedia: function () {
      const current = store.get();
      if (current.media && current.media.kind === 'upload' && current.media.blobId) {
        revokeOne(current.media.blobId);
        idbDelete(current.media.blobId);
      }
      return this.patch({ media: { kind: 'none' } });
    },
    applyPreset: function (id) {
      const preset = PRESETS[id];
      if (!preset || id === 'default') {
        return commit(Object.assign({}, DEFAULT_SETTINGS, { enabled: store.get().enabled, media: { kind: 'none' } }));
      }
      const current = store.get();
      return commit(
        Object.assign({}, current, {
          colors: Object.assign({}, preset.colors),
          wallOpacity: preset.wallOpacity,
          blurPx: preset.blurPx,
          uiBlurPx: preset.uiBlurPx,
          scrim: preset.scrim,
          baseAlpha: preset.baseAlpha,
          surfaceAlpha: preset.surfaceAlpha,
          inputAlpha: preset.inputAlpha,
          menuAlpha: preset.menuAlpha,
          media: preset.media,
        })
      );
    },
    reset: function () {
      return commit(Object.assign({}, DEFAULT_SETTINGS));
    },
    exportText: function () {
      return JSON.stringify(store.get(), null, 2);
    },
    importText: function (text) {
      try {
        const parsed = JSON.parse(text);
        return commit(parsed);
      } catch (err) {
        return null;
      }
    },
  };
}

/* ======================================================================
 * 界面：设置卡片
 * ==================================================================== */

function Slider(props) {
  const pct = clamp(Math.round(props.value), props.min, props.max);
  return h(
    'div',
    { className: 'dws-row' },
    h('span', { className: 'dws-label' }, props.label),
    h('input', {
      className: 'dws-slider',
      type: 'range',
      min: props.min,
      max: props.max,
      step: props.step || 1,
      value: props.value,
      onChange: function (e) {
        props.onChange(Number(e.target.value));
      },
    }),
    h('span', { className: 'dws-val' }, pct + (props.unit || '%'))
  );
}

function ColorRow(props) {
  const value = props.value || '';
  const fallback = props.fallback;
  const shown = isHex(value) ? value : fallback;
  const [draft, setDraft] = React.useState(shown);
  React.useEffect(
    function () {
      setDraft(shown);
    },
    [shown]
  );
  return h(
    'div',
    { className: 'dws-row' },
    h('span', { className: 'dws-label' }, props.label),
    h('input', {
      className: 'dws-color',
      type: 'color',
      value: shown,
      onChange: function (e) {
        props.onChange(e.target.value.toUpperCase());
      },
    }),
    h('input', {
      className: 'dws-hex',
      type: 'text',
      spellCheck: false,
      value: draft,
      placeholder: props.followDefault,
      onChange: function (e) {
        const v = e.target.value;
        setDraft(v);
        if (isHex(v)) props.onChange('#' + v.replace(/^#/, '').toUpperCase());
      },
      onBlur: function () {
        setDraft(isHex(value) ? value : '');
      },
    }),
    h(
      'button',
      {
        type: 'button',
        className: 'dws-btn dws-btn--ghost',
        title: props.followDefault,
        onClick: function () {
          props.onChange('');
        },
      },
      props.followDefault
    )
  );
}

function formatClock(ts) {
  try {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch (err) {
    return '';
  }
}

/* 显式保存：把当前配置立刻写进 localStorage，并把成败告诉用户。
   平时每次改动仍会自动保存；这个按钮用于确认 / 重试，也是「保存失败」的唯一出口。 */
function SaveButton(props) {
  const t = props.t;
  const controller = props.controller;
  const [result, setResult] = React.useState('');
  const timer = React.useRef(null);
  const onClick = function (e) {
    if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
    let ok = false;
    try {
      ok = controller.save();
    } catch (err) {
      ok = false;
    }
    setResult(ok ? t('saved') : t('saveFailed'));
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(function () {
      setResult('');
    }, 2200);
  };
  React.useEffect(function () {
    return function () {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, []);
  return h(
    'button',
    {
      type: 'button',
      className: props.compact ? 'dws-btn dws-btn--ghost' : props.primary ? 'dws-btn dws-btn--primary' : 'dws-btn',
      title: t('saveHint'),
      onClick: onClick,
    },
    result || (props.compact ? t('save') : t('saveConfig'))
  );
}

/* 自动保存状态：顶部卡片与面板里都能看到，保存失败时红字提示。 */
function SaveStatus(props) {
  const t = props.t;
  const controller = props.controller;
  const save = React.useSyncExternalStore(controller.saveState.subscribe, controller.saveState.getSnapshot);
  if (save && save.ok === false) {
    return h('span', { className: 'dws-note dws-note--warn' }, t('saveFailedDetail'));
  }
  if (!save || !save.at) return h('span', { className: 'dws-note' }, t('autoSaveOn'));
  return h('span', { className: 'dws-note' }, t('savedAt') + ' · ' + formatClock(save.at));
}

function WallpaperNone(props) {
  return h(
    'button',
    {
      type: 'button',
      className: 'dws-tile__none' + (props.on ? ' is-on' : ''),
      onClick: props.onClick,
    },
    props.t('none')
  );
}

/* 壁纸图标：圆角画框 + 山脊 + 太阳。侧栏入口、卡片按钮、面板标题共用。 */
function StudioGlyph(props) {
  const size = props.size || 18;
  return h(
    'svg',
    {
      width: size,
      height: size,
      viewBox: '0 0 24 24',
      fill: 'none',
      'aria-hidden': 'true',
      focusable: 'false',
    },
    h('rect', {
      x: 3.6,
      y: 4.6,
      width: 16.8,
      height: 14.8,
      rx: 3,
      stroke: 'currentColor',
      strokeWidth: 1.6,
    }),
    h('circle', { cx: 8.9, cy: 9.7, r: 1.55, fill: 'currentColor' }),
    h('path', {
      d: 'M4.8 17.5l3.8-4.2a1.3 1.3 0 0 1 1.9 0l2.3 2.6 1.5-1.6a1.3 1.3 0 0 1 1.9 0l3.7 3.8',
      stroke: 'currentColor',
      strokeWidth: 1.6,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    })
  );
}

function SettingsCard(props) {
  const t = props.t;
  const controller = props.controller;
  const state = React.useSyncExternalStore(controller.subscribe, controller.getSnapshot);
  const [open, setOpen] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [url, setUrl] = React.useState('');
  const [importText, setImportText] = React.useState('');
  const [flash, setFlash] = React.useState(null);
  const flashTimer = React.useRef(null);

  const patch = function (p) {
    controller.patch(p);
  };

  const flashMsg = function (msg, bad, where) {
    setFlash({ text: msg, bad: bad === true, where: where || 'share' });
    if (flashTimer.current) window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(function () {
      setFlash(null);
    }, 2200);
  };

  React.useEffect(function () {
    return function () {
      if (flashTimer.current) window.clearTimeout(flashTimer.current);
    };
  }, []);

  const pick = function (accept) {
    return new Promise(function (resolve) {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = accept;
      input.onchange = function () {
        resolve(input.files && input.files[0] ? input.files[0] : null);
      };
      input.click();
    });
  };

  const upload = function (accept) {
    pick(accept).then(function (file) {
      if (!file) return;
      setBusy(true);
      controller.upload(file).then(function (ok) {
        setBusy(false);
        if (!ok) flashMsg(t('uploadFailed'), true, 'wallpaper');
      });
    });
  };

  const media = state.media || { kind: 'none' };
  const isPreset = media.kind === 'preset';
  const currentName =
    media.kind === 'preset'
      ? t('wp_' + media.preset)
      : media.kind === 'upload'
      ? media.name || t('current')
      : media.kind === 'url'
      ? media.url
      : t('none');
  const bare = props.bare === true;

  return h(
    'div',
    { className: 'dws-card' + (bare ? ' dws-card--bare' : '') },
    bare
      ? null
      : h(
      'div',
      {
        className: 'dws-head',
        onClick: function () {
          setOpen(!open);
        },
      },
      h('span', { className: 'dws-head__mark' }),
      h(
        'div',
        { className: 'dws-head__tt' },
        h('span', { className: 'dws-head__title' }, t('nav')),
        h('span', { className: 'dws-head__sub' }, t('subtitle'))
      ),
      h(
        'div',
        { className: 'dws-head__right' },
        h(SaveButton, { t: t, controller: controller, compact: true }),
        props.canOpenPanel && typeof props.openPanel === 'function'
          ? h(
              'button',
              {
                type: 'button',
                className: 'dws-openbtn',
                title: t('openPanel'),
                'aria-label': t('openPanel'),
                onClick: function (e) {
                  e.stopPropagation();
                  props.openPanel();
                },
              },
              h(StudioGlyph, { size: 14 }),
              h('span', null, t('panelShort'))
            )
          : null,
        h(
          'button',
          {
            type: 'button',
            className: 'dws-switch' + (state.enabled ? ' is-on' : ''),
            'aria-label': t('toggle'),
            onClick: function (e) {
              e.stopPropagation();
              patch({ enabled: !state.enabled });
            },
          },
          h('span', { className: 'dws-switch__knob' })
        )
      )
    ),
    !state.enabled && !bare
      ? h('div', { className: 'dws-off' }, t('offHint'))
      : open || bare
      ? h(
          'div',
          { className: 'dws-body' },

          /* ---- 壁纸 ---- */
          h(
            'div',
            { className: 'dws-sec' },
            h(
              'div',
              { className: 'dws-row' },
              h('span', { className: 'dws-sec__title' }, t('secWallpaper')),
              h(
                'span',
                { className: 'dws-val', style: { marginLeft: 'auto', minWidth: 0 } },
                (busy ? t('loading') : t('current') + '：' + currentName).slice(0, 60)
              )
            ),
            h(
              'div',
              { className: 'dws-tiles' },
              h(WallpaperNone, {
                t: t,
                on: media.kind === 'none',
                onClick: function () {
                  controller.clearMedia();
                },
              }),
              BUILTIN.map(function (w) {
                return h(
                  'button',
                  {
                    type: 'button',
                    key: w.id,
                    className: 'dws-tile' + (isPreset && media.preset === w.id ? ' is-on' : ''),
                    style: { backgroundImage: w.swatch },
                    onClick: function () {
                      patch({ media: { kind: 'preset', preset: w.id } });
                    },
                  },
                  h('span', null, t('wp_' + w.id))
                );
              })
            ),
            h(
              'div',
              { className: 'dws-files' },
              h(
                'button',
                { type: 'button', className: 'dws-btn', onClick: function () { upload('image/*'); } },
                t('uploadImage')
              ),
              h(
                'button',
                { type: 'button', className: 'dws-btn', onClick: function () { upload('video/*'); } },
                t('uploadVideo')
              ),
              media.kind !== 'none'
                ? h(
                    'button',
                    {
                      type: 'button',
                      className: 'dws-btn dws-btn--danger',
                      onClick: function () {
                        controller.clearMedia();
                      },
                    },
                    t('clear')
                  )
                : null
            ),
            flash && flash.where === 'wallpaper'
              ? h(
                  'span',
                  { className: 'dws-note' + (flash.bad ? ' dws-note--warn' : '') },
                  flash.text
                )
              : null,
            h(
              'div',
              { className: 'dws-row' },
              h('input', {
                className: 'dws-input',
                type: 'text',
                spellCheck: false,
                placeholder: t('urlPlaceholder'),
                value: url,
                onChange: function (e) {
                  setUrl(e.target.value);
                },
              }),
              h(
                'button',
                {
                  type: 'button',
                  className: 'dws-btn',
                  disabled: url.trim() === '',
                  onClick: function () {
                    const v = url.trim();
                    if (v === '') return;
                    patch({ media: { kind: 'url', url: v, mediaType: isVideoUrl(v) ? 'video' : 'image' } });
                  },
                },
                t('load')
              )
            ),
            h('span', { className: 'dws-note' }, t('uploadHint'))
          ),

          /* ---- 背景效果 ---- */
          h(
            'div',
            { className: 'dws-sec' },
            h('span', { className: 'dws-sec__title' }, t('secEffect')),
            h(Slider, {
              label: t('wallOpacity'),
              value: state.wallOpacity,
              min: 0,
              max: 100,
              onChange: function (v) { patch({ wallOpacity: v }); },
            }),
            h(Slider, {
              label: t('blur'),
              value: state.blurPx,
              min: 0,
              max: 40,
              unit: 'px',
              onChange: function (v) { patch({ blurPx: v }); },
            }),
            h(Slider, {
              label: t('uiBlur'),
              value: state.uiBlurPx,
              min: 0,
              max: 40,
              unit: 'px',
              onChange: function (v) { patch({ uiBlurPx: v }); },
            }),
            h(Slider, {
              label: t('scrim'),
              value: state.scrim,
              min: 0,
              max: 100,
              onChange: function (v) { patch({ scrim: v }); },
            }),
            h(Slider, {
              label: t('baseAlpha'),
              value: state.baseAlpha,
              min: 0,
              max: 100,
              onChange: function (v) { patch({ baseAlpha: v }); },
            }),
            h(
              'div',
              { className: 'dws-row' },
              h('span', { className: 'dws-label' }, t('fit')),
              h(
                'div',
                { className: 'dws-chips' },
                ['cover', 'contain', 'tile'].map(function (id) {
                  return h(
                    'button',
                    {
                      type: 'button',
                      key: id,
                      className: 'dws-chip',
                      style:
                        state.fit === id
                          ? { borderColor: 'var(--dsw-alias-brand-primary,#4176e6)', color: 'var(--dsw-alias-brand-primary,#4176e6)' }
                          : null,
                      onClick: function () { patch({ fit: id }); },
                    },
                    t(id)
                  );
                })
              )
            )
          ),

          /* ---- 主题色 ---- */
          h(
            'div',
            { className: 'dws-sec' },
            h('span', { className: 'dws-sec__title' }, t('secColor')),
            h(ColorRow, {
              label: t('accent'),
              value: state.colors.accent,
              fallback: '#4176E6',
              followDefault: t('followDefault'),
              onChange: function (v) { patch({ colors: { accent: v } }); },
            }),
            h(ColorRow, {
              label: t('base'),
              value: state.colors.base,
              fallback: '#FFFFFF',
              followDefault: t('followDefault'),
              onChange: function (v) { patch({ colors: { base: v } }); },
            }),
            h(ColorRow, {
              label: t('panel'),
              value: state.colors.panel,
              fallback: '#FFFFFF',
              followDefault: t('followDefault'),
              onChange: function (v) { patch({ colors: { panel: v } }); },
            })
          ),

          /* ---- 透明度 ---- */
          h(
            'div',
            { className: 'dws-sec' },
            h('span', { className: 'dws-sec__title' }, t('secAlpha')),
            h(Slider, {
              label: t('surfaceAlpha'),
              value: state.surfaceAlpha,
              min: 0,
              max: 100,
              onChange: function (v) { patch({ surfaceAlpha: v }); },
            }),
            h(Slider, {
              label: t('inputAlpha'),
              value: state.inputAlpha,
              min: 0,
              max: 100,
              onChange: function (v) { patch({ inputAlpha: v }); },
            }),
            h(Slider, {
              label: t('menuAlpha'),
              value: state.menuAlpha,
              min: 0,
              max: 100,
              onChange: function (v) { patch({ menuAlpha: v }); },
            })
          ),

          /* ---- 预设 ---- */
          h(
            'div',
            { className: 'dws-sec' },
            h('span', { className: 'dws-sec__title' }, t('secPreset')),
            h(
              'div',
              { className: 'dws-chips' },
              Object.keys(PRESETS).map(function (id) {
                return h(
                  'button',
                  {
                    type: 'button',
                    key: id,
                    className: 'dws-chip',
                    onClick: function () {
                      controller.applyPreset(id);
                    },
                  },
                  t(PRESETS[id].key)
                );
              })
            )
          ),

          /* ---- 导入导出 ---- */
          h(
            'div',
            { className: 'dws-sec' },
            h('span', { className: 'dws-sec__title' }, t('secShare')),
            h(
              'div',
              { className: 'dws-files' },
              h(SaveButton, { t: t, controller: controller, primary: true }),
              h(
                'button',
                {
                  type: 'button',
                  className: 'dws-btn',
                  onClick: function () {
                    const text = controller.exportText();
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                      navigator.clipboard.writeText(text).then(
                        function () { flashMsg(t('copied'), false, 'share'); },
                        function () { setImportText(text); }
                      );
                    } else {
                      setImportText(text);
                    }
                  },
                },
                t('exportBtn')
              ),
              h(
                'button',
                {
                  type: 'button',
                  className: 'dws-btn dws-btn--ghost',
                  onClick: function () { controller.reset(); },
                },
                t('resetAll')
              )
            ),
            h(SaveStatus, { t: t, controller: controller }),
            h('input', {
              className: 'dws-input',
              type: 'text',
              spellCheck: false,
              placeholder: t('importPlaceholder'),
              value: importText,
              onChange: function (e) { setImportText(e.target.value); },
            }),
            h('span', { className: 'dws-note' }, t('shareMediaHint')),
            h(
              'div',
              { className: 'dws-files' },
              h(
                'button',
                {
                  type: 'button',
                  className: 'dws-btn',
                  disabled: importText.trim() === '',
                  onClick: function () {
                    const res = controller.importText(importText);
                    if (res) {
                      setImportText('');
                      flashMsg(t('imported'), false, 'share');
                    } else {
                      flashMsg(t('invalid'), true, 'share');
                    }
                  },
                },
                t('apply')
              ),
              flash && flash.where === 'share'
                ? h(
                    'span',
                    { className: 'dws-note' + (flash.bad ? ' dws-note--warn' : '') },
                    flash.text
                  )
                : null
            ),
            h('span', { className: 'dws-note' }, t('hint'))
          )
        )
      : null
  );
}

/* 左侧栏面板页：同一个控制器、同一份设置，摊成一张全宽控制面板。 */
function StudioPanel(props) {
  const t = props.t;
  const controller = props.controller;
  const state = React.useSyncExternalStore(controller.subscribe, controller.getSnapshot);
  const close = typeof props.close === 'function' ? props.close : function () {};
  return h(
    'div',
    { className: 'dws-page' },
    h(
      'div',
      { className: 'dws-page__inner' },
      h(
        'div',
        { className: 'dws-hero' },
        h('div', { className: 'dws-hero__mark' }, h(StudioGlyph, { size: 22 })),
        h(
          'div',
          { className: 'dws-hero__tt' },
          h('h1', { className: 'dws-hero__title' }, t('nav')),
          h('p', { className: 'dws-hero__sub' }, t('subtitle'))
        ),
        h(
          'div',
          { className: 'dws-hero__actions' },
          h(SaveButton, { t: t, controller: controller, compact: true }),
          h(
            'button',
            { type: 'button', className: 'dws-btn dws-btn--ghost', onClick: close },
            t('closePanel')
          ),
          h(
            'div',
            { className: 'dws-hero__switch' },
            h('span', null, t('toggle')),
            h(
              'button',
              {
                type: 'button',
                className: 'dws-switch' + (state.enabled ? ' is-on' : ''),
                role: 'switch',
                'aria-checked': state.enabled ? 'true' : 'false',
                'aria-label': t('toggle'),
                title: t('toggle'),
                onClick: function () {
                  controller.patch({ enabled: !state.enabled });
                },
              },
              h('span', { className: 'dws-switch__knob' })
            )
          )
        )
      ),
      state.enabled
        ? null
        : h(
            'div',
            { className: 'dws-banner' },
            h('span', { className: 'dws-note' }, t('offHint')),
            h(
              'button',
              {
                type: 'button',
                className: 'dws-btn dws-btn--primary',
                onClick: function () {
                  controller.patch({ enabled: true });
                },
              },
              t('enableWallpaper')
            )
          ),
      h(SettingsCard, { t: t, controller: controller, bare: true }),
      h('p', { className: 'dws-note' }, t('panelHint'))
    )
  );
}

/* 左侧栏面板行的图标：侧栏按 size 给出图标边长，用 currentColor 跟随主题。 */
function WallpaperPanelIcon(props) {
  return h(StudioGlyph, { size: props.size || 18 });
}

/* ======================================================================
 * 插件导出（闭包工厂的返回值 = 浏览器 fiber 的插件模块表）
 * ==================================================================== */

exports.name = PLUGIN_ID;
exports.inject = ['slots', 'locale'];

exports.apply = function apply(ctx) {
  ensureBaseStyle();

  const store = createStore(loadSettings());
  const controller = createController(store, {
    warn: function () {
      if (ctx && ctx.logger && typeof ctx.logger.warn === 'function') {
        ctx.logger.warn.apply(ctx.logger, arguments);
      }
    },
  });

  /* 文案：左侧栏面板行、面板页与卡片按钮共用同一份词典 */
  var t = typeof ctx.locale.bind === 'function' ? ctx.locale.bind(NS) : function (key) { return key; };

  /* 布局服务负责「主区面板」；旧宿主没有它时只保留设置卡片，退化不报错。 */
  function layoutService() {
    try {
      return typeof ctx.get === 'function' ? ctx.get('layout') : null;
    } catch (err) {
      return null;
    }
  }

  function openPanel() {
    try {
      var layout = layoutService();
      if (layout && typeof layout.selectPanel === 'function') layout.selectPanel(PANEL_ID);
    } catch (err) {
      /* 主区面板还没注册时保持原状 */
    }
  }

  /* 首次投影 + 卸载时还原原生外观 */
  ctx.effect(
    function () {
      applyAll(store.get());
      return function () {
        teardown();
      };
    },
    'dsh-wallpaper-studio:apply'
  );

  /* 词典：设置卡片靠它拿文案（locale 必需） */
  ctx.effect(
    function () {
      return ctx.locale.register(NS, { zh: zh, en: en });
    },
    'dsh-wallpaper-studio:locale'
  );

  /* 主卡片：插件 → 已安装插件 → 本插件
   *
   * 槽位名要跟着宿主版本走（0.2.x 换过一次名，写死任意一代都会静默不显示）：
   *  - 有 `dsh-client-ui-plugin-manager` 的宿主：走 `plugins.item`，它是插件详情页里
   *    每个包自己的配置页（宿主按 `only: 包 id` 过滤，所以 options.id 必须等于包名）；
   *  - 更早的宿主（前端指南里的写法）：走 `settings.plugin.item`（keyed，key=命名空间）；
   *  - 读不到 boot graph 时两个都注册 —— `slots.inject` 对未声明的槽位只是静默等待，
   *    没被声明的那个永远不会渲染，不会出现两张卡片。
   */
  function hostHasPluginManager() {
    try {
      var boot = typeof window !== 'undefined' && window.__DSH_BOOT__;
      if (!boot || !boot.entries || typeof boot.entries.some !== 'function') return null;
      return boot.entries.some(function (e) {
        return e && e.id === '@deepseek-ai/dsh-client-ui-plugin-manager';
      });
    } catch (err) {
      return null;
    }
  }

  function registerCardSlot(name, identity, order) {
    ctx.slots.inject(name, function () {
      var options = {
        name: name,
        locale: NS,
        label: 'wallpaperStudio', /* locale 键：插件页标签文案 */
        order: order,
        inject: function () {
          var layout = layoutService();
          return {
            controller: controller,
            /* 只有宿主提供布局服务时才显示「在左侧栏打开」按钮 */
            canOpenPanel: !!(layout && typeof layout.selectPanel === 'function'),
            openPanel: openPanel,
          };
        },
      };
      options[identity] = NS;
      return ctx.slots.register(options, SettingsCard);
    });
  }

  var HAS_PLUGIN_MANAGER = hostHasPluginManager();
  /* 0.2.x：`plugins.bundle.config` 是「已安装插件 → 本包详情页」里该包自己的配置区，
     按包名 keyed（宿主用 entryKey: pkg.name 取）。注意别用 plugins.item —— 那是
     「内置插件」卡片列表的槽位，会把整张卡片塞进列表里。 */
  if (HAS_PLUGIN_MANAGER !== false) registerCardSlot('plugins.bundle.config', 'key', 0);
  if (HAS_PLUGIN_MANAGER !== true) registerCardSlot('settings.plugin.item', 'key', 100);

  /* 左侧栏面板入口 + 对应的主区页面：同一个 controller、同一份 localStorage 设置。
     槽位没被当前宿主声明时 inject 只等待，不会报错，也不会影响已有卡片。 */
  ctx.slots.inject('sidebar.panellist', function () {
    return ctx.slots.register(
      {
        name: 'sidebar.panellist',
        id: PANEL_ID,
        order: 15,
        label: function () {
          return t('nav');
        },
        locale: NS,
      },
      WallpaperPanelIcon
    );
  });

  ctx.slots.inject('main', function () {
    return ctx.slots.register(
      {
        name: 'main',
        key: PANEL_ID,
        locale: NS,
        inject: function () {
          return {
            controller: controller,
            close: function () {
              try {
                var layout = layoutService();
                if (layout && typeof layout.selectPanel === 'function') layout.selectPanel(null);
              } catch (err) {
                /* 无布局服务时保持面板打开 */
              }
            },
          };
        },
      },
      StudioPanel
    );
  });
};

return module.exports; } });
