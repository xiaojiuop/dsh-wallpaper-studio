# dsh-wallpaper-studio · 壁纸工作室

DeepSeek Harness（DSH）的**动态壁纸 + 主题色 + 透明度**插件。装进 Web GUI / DSH 桌面版之后，在
「插件 → 已安装插件 → dsh-wallpaper-studio」里的「壁纸工作室」卡片上，把自己喜欢的图片或视频铺成整个界面的背景，顺手把主色、底色、
面板色和各层不透度一起调掉。

纯客户端实现：不改宿主源码、不依赖原生模块、不需要 Steam / Wallpaper Engine 运行时。

---

## 1. 它参考的是什么

DSH 插件市场里「主题与外观」分类最热的壁纸插件是
[`elysia395/dsh-wallpaper-engine`](https://github.com/elysia395/dsh-wallpaper-engine)（★ 6921、月下载 13 万+）：
把本机 Wallpaper Engine 的视频 / Web / Scene 壁纸铺到 `dsh web` 的聊天背后，配一个 iOS 液态玻璃
风格的设置窗，滑条调模糊、亮度、边框、遮罩和面板不透明度。

这个插件沿用了它被验证过的**产品结构**：

| 参考实现的做法 | 本项目 |
| --- | --- |
| 全屏背景层 + 遮罩 + 模糊，压在界面最底层 | 同样：`#dws-bg` 固定定位、`z-index:-1`、`inset:-48px` 给模糊留边 |
| 液态玻璃设置窗、滑条即时生效 | 同一套交互心智：卡片折叠 + 滑杆 + 取色器，改一下立刻生效、无需保存按钮 |
| 通过设计令牌把面板调成半透明 | 只覆盖 alias 层令牌，不写宿主私有类名 |
| 壁纸素材存本地，重启不丢 | Blob 存 IndexedDB，设置存 localStorage |

换掉的两件事，也是本项目的取舍：

1. **不依赖 Wallpaper Engine / Steam / 本机壁纸库。** 壁纸来源是：自己上传的图片或视频、直链 URL、
   以及 6 套内置渐变动效。装完即用，Windows / macOS / Linux / 纯浏览器都一致。
2. **不绑定宿主的内部 DOM。** 参考实现要按 DSH 版本逐个维护 `[data-composer-card]`、
   `[class*="_sidebarCol"]` 这类选择器，宿主一改版就得跟着改。本项目只动 alias 设计令牌
   （`--dsw-alias-*`），版本漂移时最坏情况是局部不跟着透，不会白屏、不会吃掉别的插件。

---

## 2. 功能一览

### 动态壁纸
- **上传图片**：JPG / PNG / WebP / **GIF（保留动效**）；**上传视频**：MP4 / WebM，静音循环播放。
- **直链 URL**：按扩展名自动分流图片/视频（需 CORS 友好直链）。
- **6 套内置动态壁纸**：极光流动、午夜星尘、森林晨雾、熔岩余烬、樱粉暮色、冰川微光。
  纯 CSS 渐变 + 缓慢位移动画，零素材、零网络请求，`prefers-reduced-motion` 下自动静止。
- **缩放方式**：填充 / 适应 / 平铺。
- **效果**：壁纸可见度、背景模糊（0–40px）、遮罩暗度（可读性面纱）、主背景遮底。
- 素材只存在本机浏览器：图片/视频走 **IndexedDB**（不占 localStorage 配额，大文件更安全），
  配置走 localStorage。**不会上传到任何服务器**。

### 主题色
- 三个角色、原生取色器 + HEX 输入双通道：**主色**（品牌色 / 选中态 / 焦点环跟随）、
  **底色**（整页画布）、**面板色**（卡片 / 侧栏 / 气泡）。
- 面板色的浅阶（layer-2 / layer-3 / module / sidebar-fill）由底色按比例混出来，
  自动保持同色系的层次感，不需要手调五个颜色。
- 深浅模式**各一组**值：切到深色主题时自动用对应的一套，不会出现「深色下白底刺眼」。
- 每个角色都可「跟随默认」，一键回到 DSH 原生配色。

### 透明度
- 面板 / 输入框 / 弹层三档独立不透明度（0–100%），互不干扰：
  主面板全透时输入框仍能看清字，下拉菜单也不会变成水泥块。
- 令牌层面生效，因此卡片、侧栏、气泡、菜单、输入条一起跟随，不用逐个写选择器。

### 其他
- **6 套配色预设**：默认 / 午夜 / 海洋 / 森林 / 樱粉 / 冰川（一次配好主色 + 底色 + 面板色 +
  透明度 + 内置壁纸）。
- **配置导入导出**：一串 JSON 就能把整套外观发给别人。
- **侧栏底部快速开关**：临时关掉壁纸恢复原生界面，不用进设置页。

---

## 3. 安装

三种通道任选一种（`--profile web` 指 Web GUI；桌面版按桌面版自己的 profile 名替换）。

```bash
# ① npm 公共包
dsh plugin --profile web add dsh-wallpaper-studio

# ② GitHub Release 附件（不经过 npm 也行；文件名不带版本号，所以地址长期有效）
#    curl -L -O https://github.com/xiaojiuop/dsh-wallpaper-studio/releases/latest/download/dsh-wallpaper-studio.tgz
dsh plugin --profile web add ./dsh-wallpaper-studio.tgz

# ③ 本地目录（开发用，link: 是活链，改完 rebuild 刷新页面即生效）
dsh plugin --profile web add link:/abs/path/to/dsh-wallpaper-studio
```

装完**重启宿主**（`dsh web` 或桌面版应用），因为客户端 bundle 只会在启动时组成启动图。
package.json 的 `files` 已经包含构建产物 `lib/`，从 git / tarball 安装不需要现场跑构建。

### 装完怎么确认

```bash
# 1. bundle 真的被服务出来了。注意宿主用的是「合并端点」，不是 /plugins/<id>/client.js
#    （后者是 404）。每个启动项自己带 URL，直接从页面里取最稳：
#    F12 → Console → window.__DSH_BOOT__.entries.find(e => e.id === "dsh-wallpaper-studio").url
#    形如 plugins/??dsh-wallpaper-studio/client.js&rev=b1fe5fd8b3dc
TOKEN=…  # dsh web 启动日志里那条带 token 的地址
curl -c /tmp/cj -b /tmp/cj -L "http://127.0.0.1:3080/?token=$TOKEN" -o /dev/null
curl -b /tmp/cj "http://127.0.0.1:3080/plugins/??dsh-wallpaper-studio/client.js&rev=b1fe5fd8b3dc" | head -c 120
# 应看到 window.__ModuleLoader__.load({ id: "dsh-wallpaper-studio", factory: (require) => {

# 2. 页面里插件在启动图中
#    F12 → Console →  window.__DSH_BOOT__.entries.map(e => e.id)
```

**已在真实宿主上验证**（`@deepseek-ai/dsh@0.2.2-rc.1`，Linux + Node 22）：
`dsh plugin --profile web add ./dsh-wallpaper-studio-0.1.0.tgz` 成功（0.1.2 起同一通道改用下面的
`dsh-wallpaper-studio.tgz`）→ `--dump-config` 里出现本插件行 →
启动图 74 项含 `dsh-wallpaper-studio` → bundle 200/54KB → 浏览器里壁纸层注入、`--dws-wall-opacity`
生效、侧栏「壁纸工作室」按钮渲染、插件页「已安装插件」显示「运行中」，卡片里 7 个滑条 / 3 个取色器 /
6 个预设 / 9 个 chip 全部到位，上传图片后壁纸层立刻变成 `blob:`，刷新后从 IndexedDB 自动恢复。

页面若卡在 loading：DSH 的 boot 是 all-or-nothing，`assertEntriesActive()` 会把「哪个 entry、
为什么没 ACTIVE」直接列在页面上。本插件只依赖 `slots` 与 `locale` 两个核心服务，
正常组合下不会因此挂掉。

---

## 4. 用起来

**插件 → 已安装插件 → dsh-wallpaper-studio**，点开「查看」就是这张卡片（旧版宿主里位置是
「设置 → 插件 → 壁纸工作室」）。侧栏底部还有一个「壁纸工作室」快速开关。

| 区块 | 控件 | 说明 |
| --- | --- | --- |
| 动态壁纸 | 缩略图网格 | 「无壁纸」+ 6 套内置动态壁纸，点一下立即切换 |
| | 上传图片 / 上传视频 | 本机文件直接入库，页面上立刻生效 |
| | 直链输入 + 加载 | 粘贴图片/视频地址；视频自动识别 |
| | 移除 | 清掉当前壁纸（上传的文件同时从 IndexedDB 删掉） |
| 背景效果 | 壁纸可见度 | 0–100%，低值等于把壁纸淡进底色里 |
| | 背景模糊 | 0–40px，只作用于壁纸本身，不会糊到界面 |
| | 遮罩暗度 | 壁纸上的可读性面纱；浅色模式是白纱、深色模式是暗纱 |
| | 主背景遮底 | 整页画布的遮盖度；0% = 壁纸完全露出来 |
| | 缩放方式 | 填充 / 适应 / 平铺 |
| 主题色 | 主色 / 底色 / 面板色 | 取色器或直接输 HEX；「跟随默认」清空该角色 |
| 界面通透 | 面板 / 输入框 / 弹层 | 三档独立不透明度 |
| 配色预设 | 6 个 chip | 一次覆盖颜色 + 透明度 + 内置壁纸，之后还能继续微调 |
| 导入导出 | 复制配置 / 粘贴应用 / 恢复默认 | 配置就是一段 JSON |

所有改动**即时生效并自动保存**，没有「保存」按钮；关掉插件（或卸载）会把界面完整还原成原生外观。

---

## 5. 实现原理（给要改代码的人）

### 5.1 前端插件契约
- 宿主扫描 `package.json` 里的 `dsh.client.platform: "web"`，把 `exports["./client"]` 指向的
  `lib/client.js` 组成启动图，页面按 `/plugins/<id>/client.js?rev=…` 拉取并激活。
- `lib/client.js` 必须是「惰性 CJS 闭包工厂」：

  ```js
  window.__ModuleLoader__.load({ id: "dsh-wallpaper-studio", factory: (require) => {
    var module = { exports: {} }; var exports = module.exports;
    /* …插件代码，最后 return module.exports… */
  } });
  ```

  外置的平台模块（本项目只用 `react`）通过注入的 `require` 解析；缺了这层外壳，
  构建和下载都正常，**只有启动会失败**（`loaded without registering …`）。
- 工厂返回值就是浏览器 fiber 的插件模块表：`{ name, inject: ['slots','locale'], apply }`。
- 槽位只用**增量**槽位：`plugins.bundle.config`（0.2.x 插件页里本包的配置区，key = 包名；旧版宿主自动
  换成 `settings.plugin.item`，按启动图里有没有 `dsh-client-ui-plugin-manager` 决定，靠 `locale` 取文案）、
  `sidebar.footer.action`（快速开关）。不注册 `root` / `sidebar` / `conversation`，
  所以永远不会把别人的界面顶掉。

### 5.2 壁纸怎么铺到「最底层」
```
body
 ├─ #dws-bg          position:fixed; inset:-48px; z-index:-1; pointer-events:none
 │   ├─ ::before     壁纸（图片 / 渐变），opacity = --dws-wall-opacity，filter = blur(--dws-blur)
 │   ├─ <video>      视频壁纸（muted / loop / playsinline / object-fit:cover）
 │   └─ ::after      可读性面纱 rgba(… , --dws-scrim)
 └─ #root            宿主界面（背景被令牌调成半透明，于是壁纸透上来）
```
`z-index:-1` 让它画在 body 背景之上、所有内容之下；`inset:-48px` 给模糊滤镜留出出血边，
避免边缘出现透明缝。`html[data-dws-active]` 时把 `#root` 的实底挖空
（并对 Windows 桌面版的 `[data-windows-titlebar]` 外框做同样的 punch-out），
否则桌面端会有一层不透明外框挡住壁纸。

### 5.3 透明度走设计令牌，不走私有类名
写入两张表，都只针对 alias 令牌，带 `!important` 以免和宿主主题表互相打架：

```css
body { --dsw-alias-bg-base: rgba(…); --dsw-alias-bg-layer-1: rgba(…); … }
body[data-ds-dark-theme], body[data-theme="dark"], html[data-theme="dark"] body { … 深色一套 … }
```

覆盖的令牌：`bg-base`、`bg-layer-1/2/3`、`bg-overlay`、`bg-module-platform`、
`specific-sidebar-fill`、`specific-bubble`、`fill-l1/l2`、`specific-menu`、
`menu-surface-fill`、`specific-input-major`、以及主色 `brand-primary` / `state-business-primary` /
`button-info-fill`。面板色的浅阶用 `mixHex(panel, base, 0.08/0.14/0.06/0.04)` 派生，
所以换底色时整套层次自动重算。

### 5.4 存储
| 内容 | 位置 | 原因 |
| --- | --- | --- |
| 配置（开关/颜色/透明度/当前壁纸元信息） | `localStorage["dsh-wallpaper-studio:v1"]` | 小、同步读、首帧就能投影 |
| 壁纸 Blob（图片/视频原图） | IndexedDB `dsh-wallpaper-studio-db / media` | 不占 localStorage 5MB 配额，大文件安全 |

### 5.5 卸载即还原
`apply` 里的所有 DOM 副作用都包在 `ctx.effect` 里；disposer 会移除壁纸层、令牌表、
`data-dws-active` 属性，暂停并释放视频、`URL.revokeObjectURL` 掉所有对象 URL。
停用开关走的是同一条 `teardown()`，所以「临时关掉」和「卸载插件」都不会留残留样式。

---

## 6. 已知限制（诚实版）

- **局部不透**：令牌能覆盖绝大多数表面，但宿主仍有少量硬编码的 static 色（例如改动卡片的
  `--changes-fill` / `--deliverable-fill`）。这些位置保持不透明——比反过来「整块变透明看不清字」安全。
- **令牌名以当前 alias 层为准**：主色/底色/面板/透明度全部集中在 `modeTokens()` 一个函数里。
  DSH 后续大版本若重命名令牌，只改这一处即可。
- **视频编码**：能不能播取决于浏览器（H.264/WebM 一般没问题，HEVC 大概率不行）；播不了会静默不显示，
  建议先用 MP4 试。
- **配额**：IndexedDB 单次上传建议 ≤100MB，超了可能被浏览器拒绝（会给出错误提示，不会崩）。
- **同类插件冲突**：`dsh-ui-appearance`、`dsh-any-background`、`dsh-wallpaper-bg` 这类外观插件
  也在写同一批令牌，同时启用会互相覆盖 —— **同类只留一个**。
- **深色模式取值**：三档不透明度对两种模式共用一套数值，颜色则分模式各一份；
  如果某套配色在深色下偏灰，用「配色预设 → 午夜」这类深色向预设起步更省事。

---

## 7. 目录结构

```
dsh-wallpaper-studio/
├─ package.json            # name / exports / dsh.client / dsh.bundle
├─ cordis.patch.yml        # bundle 层：把本包插入宿主插件树
├─ icon.png                # 512×512，238 KB（宿主上限 256 KiB，已在限内）
├─ locale/
│  ├─ en.json              # meta.title / meta.description（插件管理页那一行）
│  └─ zh.json
├─ lib/
│  ├─ index.js             # Host 半（导出 name / apply，故意保持最小）
│  └─ client.js            # 浏览器半（构建产物：banner + 闭包工厂 + footer）
├─ src/client.js           # 浏览器半源码（改这个）
├─ scripts/
│  ├─ build-client.mjs     # 零依赖：banner/intro/footer 拼装
│  ├─ check-client-bundle.mjs  # 发布前静态校验（21 项）
│  └─ smoke.mjs            # 免宿主冒烟（16 项）
├─ release/                # 发布用物料：npm / GitHub Release / 市场 PR 脚本
├─ assets/icon-180.png     # 180×180，市场列表卡片用（市场只收 GitHub 上的位图）
└─ LICENSE                 # MIT
```

`test/render-test.mjs`（jsdom + React 18 渲染级验证）是开发机上的临时脚本，**不随包、也不在本仓库**
—— `scripts/smoke.mjs` 用 `node:vm` 加一个 React 桩覆盖了同一批断言，且零依赖。

## 8. 开发

```bash
npm run build    # src/client.js → lib/client.js
npm run check    # 契约/产物静态校验（21 项）
npm run smoke    # 工厂注册、模块表、槽位注册、词典键位、卸载清理（16 项）

# 没有 npm 的机器（比如只装了 DSH 桌面版）直接让 node 跑同一批脚本：
node scripts/build-client.mjs && node scripts/check-client-bundle.mjs && node scripts/smoke.mjs
```

`build-client.mjs` 是幂等的：同一份 `src/client.js` 反复构建，产出的 `lib/client.js` 字节完全一致，
所以 `lib/client.js` 直接进版本库、不需要在安装时现场构建。

### 发布

发布流程（npm 公共包 + GitHub Release 附件 + 插件市场 PR）见 [`release/RELEASE.md`](release/RELEASE.md)，
三个脚本都在 `release/` 下，全部可重复执行、失败可重试。

改完 `src/client.js` 后 `npm run build` → 刷新页面即可（本地 link 安装时不需要重新 `plugin add`；
改了 `dsh.client.inject` / `immediately` 这类清单字段才要重启宿主）。

---

## 9. 隐私

- 不上传任何文件，不请求任何外部接口；
- 不读取系统壁纸、不扫描 Steam / Wallpaper Engine 目录；
- 壁纸素材、配置全部留在本机浏览器；卸载插件时对象 URL 与 IndexedDB 记录可自行清理
  （卡片里的「移除」会同时删除 IndexedDB 记录）。

## 10. 参考与致谢

- 产品参考：[`elysia395/dsh-wallpaper-engine`](https://github.com/elysia395/dsh-wallpaper-engine)（DSH 市场最热壁纸插件）
- 令牌与分层方式参考：`dsh-ui-appearance`、`dsh-any-background`、`dsh-wallpaper-bg` 的公开实现
- 插件前端契约依据：DSH 前端插件开发指南（`dsh.client` / 闭包工厂 / 槽位目录 / 设计令牌分层）

MIT License.

## 变更记录

- **0.1.2** — 上架包：补 `locale/en.json` + `locale/zh.json`（插件管理页那一行标题/描述，此前只能回退到
  `package.json` 里那段中英混合的长 description）、补 `LICENSE`、`exports` 增加 `./locale/*.json`、
  `files` 增加 `locale/*.json`。功能与 0.1.1 一致，`lib/client.js` 字节未变。
  此前的实验版本曾以 `dsh-wallpaperu` 这个名字发在 npm，现已标记 deprecated 并指向本包。
- **0.1.1** — 在 0.1.0 基础上新增「界面磨砂 / Interface frost」：只对面板背后那一层壁纸做
  `backdrop-filter`，壁纸本身仍然清晰，正文压在图上也看得清。
