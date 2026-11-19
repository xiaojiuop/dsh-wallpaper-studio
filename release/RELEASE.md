# 发布手册 — dsh-wallpaper-studio 0.1.2

三个产物，四步命令，全部能在**没有 pwsh 7、没有 npm、没有 gh** 的机器上跑完（这台机器就是）。

| 产物 | 落在哪 | 谁需要它 |
| --- | --- | --- |
| npm 公共包 | `dsh-wallpaper-studio@0.1.2` → https://www.npmjs.com/package/dsh-wallpaper-studio | 用户 `dsh plugin add dsh-wallpaper-studio` |
| GitHub Release 附件 | `v0.1.2` 的 `dsh-wallpaper-studio.tgz` | 离线安装；插件市场的 `tarball:` 字段指向它 |
| 插件市场条目 | `awesome-dsh-plugin` 的 `data/plugins/<owner>__dsh-wallpaper-studio.yml` | 出现在市场列表里 |

npm 和 Release 互相独立，市场条目依赖后两者。下面按「先 npm、再 GitHub、最后市场」的顺序。

---

## 1. 一次性准备

1. **npm 账号** + **GitHub 账号**。GitHub 用户名后面到处要用，本文写作 `<owner>`。
2. **两个令牌**，只放在当前终端的环境变量里，不会写进仓库：

   ```powershell
   $env:NPM_TOKEN    = 'npm_xxx'
   $env:GITHUB_TOKEN = 'ghp_xxx'
   ```

   - `NPM_TOKEN`：npmjs → Access Tokens → Generate New Token → 选 **Automation**（Automation 能绕过 2FA，否则发布会报 `EOTP`）。
   - `GITHUB_TOKEN`：
     - 经典令牌勾 **repo** 就够（建仓库 / 推代码 / 传附件 / 提 PR 都在里面）；
     - 细粒度令牌需要 `Administration: Read and write`（建仓库）、`Contents: Read and write`（推代码、传附件）、`Pull requests: Read and write`（开 PR）。
3. **不用装任何东西**。脚本自己会找这台机器上 DSH 自带的 node 与 pnpm；git 用系统自带的。
4. 这台机器只有 Windows PowerShell 5.1（没有 `pwsh` 7），所以命令一律是：

   ```powershell
   powershell -ExecutionPolicy Bypass -File release\<脚本>.ps1
   ```

`-ExecutionPolicy Bypass` 不能省：脚本被浏览器/下载工具写过标记时，默认策略会拒绝执行。

---

## 2. 四步发布

### 第 0 步（可跳过）把用户名填进去

```powershell
powershell -ExecutionPolicy Bypass -File release\set-metadata.ps1 -Owner <owner>
```

把 README 里的 `<owner>` 换成真实用户名，并给 `package.json` 补 `repository` / `homepage` / `bugs`，
同时生成市场要的 `release\<owner>__dsh-wallpaper-studio.yml` 与 `release\PR-BODY.filled.md`。
幂等，重复跑没事；后面两个发布脚本也会自动调用它。

**这一步没做就发布，npm 页面和市场条目不会被认为是同一个项目。**

### 第 1 步 打包验收（不联网）

```powershell
powershell -ExecutionPolicy Bypass -File release\publish-npm.ps1
```

构建 → 21 项契约校验 → 16 项冒烟 → `pnpm pack` → 逐条核对包内文件。产物在 `dist\`。
先用它确认包里没有漏 `locale/`、`LICENSE`，`icon.png` 也没超过宿主 256 KiB 的上限。

### 第 2 步 发 npm

```powershell
powershell -ExecutionPolicy Bypass -File release\publish-npm.ps1 -Publish
```

重新走一遍第 1 步的验收，然后上传，最后回读 `registry.npmjs.org` 确认版本已上线。

### 第 3 步 建仓库 + 发 Release

```powershell
powershell -ExecutionPolicy Bypass -File release\publish-github.ps1 -Owner <owner> -CreateRepo
```

填元数据 → 打包验收 → `git init` / 设**本仓库**提交身份 / 提交 → 建公开仓库（`-CreateRepo`）
→ 补 `dsh-plugin` 等 topic → push → 建 `v0.1.2` Release → 把 tarball 以固定名
`dsh-wallpaper-studio.tgz` 传成附件（不带版本号，`releases/latest/download/` 才不会在下次发版后 404）。

只想先看本地部分、不联网：

```powershell
powershell -ExecutionPolicy Bypass -File release\publish-github.ps1 -Owner <owner> -LocalOnly -GitName "你的名字" -GitEmail "you@example.com"
```

### 第 4 步 提插件市场

```powershell
powershell -ExecutionPolicy Bypass -File release\submit-market.ps1 -Owner <owner> -DryRun
powershell -ExecutionPolicy Bypass -File release\submit-market.ps1 -Owner <owner>
```

先 `-DryRun` 只做前置检查（仓库存在？满 1 天？有 topic？声明了 `dsh.bundle`？附件在？上游没同名条目？）。
全过了再去掉 `-DryRun`：fork 上游 → 从上游最新提交拉分支 → 只提交那一个 yml → 开 PR。

### 第 5 步（只做一次）给旧包名挂上 deprecated

npm 上曾经用 `dsh-wallpaperu@1.2.0` 这个名字发过同一个插件，它指向的 GitHub 仓库已经没了。
新包上线后跑一次，让装到旧包的人看到指引：

```powershell
powershell -ExecutionPolicy Bypass -File release\deprecate-old.ps1
```

幂等，重复跑只会覆盖同一条说明。不跑也不影响新包和上架，只是旧包的 npm 页会一直挂着一个 404 链接。

---

## 3. 验收清单

- [ ] `https://www.npmjs.com/package/dsh-wallpaper-studio` 能打开，版本是 `0.1.2`
- [ ] `dsh plugin --profile web add dsh-wallpaper-studio` 装得上，插件页显示「壁纸工作室」
- [ ] Release 页有附件 `dsh-wallpaper-studio.tgz`；`https://github.com/<owner>/dsh-wallpaper-studio/releases/latest/download/dsh-wallpaper-studio.tgz` 能下载
- [ ] PR 里**只有一个文件** `data/plugins/<owner>__dsh-wallpaper-studio.yml`，没有动 `README.md` / `.github/`
- [ ] PR 的检查里 `entries-live-in-data-plugins`、`pr-check`、`awesome-lint` 都是绿的

---

## 4. 市场会卡人的几条（都是硬性）

| 要求 | 说明 |
| --- | --- |
| 仓库满 **1 天** | 自动检查；刚建的仓库当天提必被拒，等满 24 小时再跑第 4 步 |
| 仓库带 **`dsh-plugin`** topic | publish-github 会自动补 |
| `package.json` 声明 **`dsh.bundle`** | 只声明 `dsh.client` 会被判不合格；本包两个都有 |
| `category` 必须是固定列表里的一项 | 本包用 `theme`（主题/皮肤类） |
| 一个 PR ≤ 3 个条目 | 我们只有 1 个 |
| 不手改 README | 列表 README 由 CI 在合入后生成；只加 yml 就行 |
| 描述不写绝对化/营销词 | 条目里只写它做什么 |
| `tarball:` 用 `latest/download/<固定文件名>` 或钉死 tag | 本包用前者 + 无版本号文件名 |

仓库根目录**不要**动 `.github/`：上游有 `pr-guard` 会把「改了 `.github/`」判成过期 fork。

---

## 5. 失败怎么办

| 现象 | 原因 / 处理 |
| --- | --- |
| `'pwsh' 不是内部或外部命令` | 这台机器没有 PowerShell 7，用 `powershell`，不是 `pwsh` |
| `无法加载文件 … 未对文件进行数字签名` | 少了 `-ExecutionPolicy Bypass` |
| `没有 npm 令牌` / `没有 GitHub 令牌` | 令牌没设，或设在别的窗口里；重开窗口要重设 |
| HTTP `401 Bad credentials` | 令牌错、过期、或被复制进了空格 |
| HTTP `403 Resource not accessible by personal access token` | 令牌权限不够，对照第 1 节勾权限 |
| HTTP `404` 调 `/repos/<owner>/dsh-wallpaper-studio` | 仓库还没建：加 `-CreateRepo`，或先手动建 |
| npm `E409 版本已存在` | 这个版本发过了：改 `package.json` 版本号再发 |
| npm `EOTP` / 要求 2FA | 令牌类型不对，重建一个 **Automation** 令牌 |
| `push` 被拒（non-fast-forward / 远端已有提交） | 远端初始化过：`git pull --rebase` 后再跑，或删掉远端多出来的提交 |
| 市场提示仓库只有 N 小时 | 等满 24 小时；本地演练可加 `-AllowYoungRepo`，但 CI 仍会拒 |
| `422 Reference does not exist`（删分支） | fork 第一次跑时那个分支本来就不存在。脚本已把这种 422 当成「没有这个分支」处理，重跑即可，不会中断 |
| 市场提示上游已有同名条目 | 你之前提过或已被收录，别再提第二个 |
| `icon.png 超过 256 KiB` | 打包脚本会直接拦下，重新压一张 512×512 的图（当前 233 KB，余量 23 KB） |

---

## 6. 回滚

- **npm**：发布 72 小时内 `npm unpublish dsh-wallpaper-studio@0.1.2`；超过 72 小时改用
  `npm deprecate dsh-wallpaper-studio@0.1.2 "…"`，靠新版本顶掉。
- **GitHub**：删除那个 Release（tag 可留可删）；仓库本身删掉或转私有都行。
- **市场**：直接关掉 PR；已合入的话再提一个删除该 yml 的 PR。

---

## 7. 文件清单

```
release/
  RELEASE.md                  ← 本文件（发布手册）
  _lib.ps1                    ← 公共函数：跑命令 / 找 node+pnpm / GitHub API / 打包验收
  set-metadata.ps1            ← <owner> → 真实用户名；生成市场条目与 PR 正文
  publish-npm.ps1             ← 打包验收 + 发 npm + 回读注册表
  publish-github.ps1          ← 建仓库 / 提交 / 推送 / 发 Release + 上传 tarball
  submit-market.ps1           ← 前置检查 + fork + 提交 yml + 开 PR
  deprecate-old.ps1           ← 给旧包名 dsh-wallpaperu 挂 deprecated（只跑一次）
  market-entry.template.yml   ← 市场条目模板（含 <owner> 占位）
  PR-BODY.md                  ← PR 正文模板
```

脚本约定：

- 退出码 `0` = 成功（含 `-DryRun` / 仅验收），`1` = 任一步失败；失败会打印 `[失败] 原因`。
- 令牌只从环境变量读，用完即弃；`push` 用的令牌通过一次性 `http.extraheader` 注入，
  **不会写进 `.git/config`，也不进 remote URL**。
- `dist/` 与 `*.tgz` 已被 `.gitignore` 排除，不会进仓库、也不会进 npm 包。
