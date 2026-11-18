<#
  release/publish-github.ps1 — 把本地仓库变成线上仓库，并发出 GitHub Release（含 tarball 附件）。

  做的事，按顺序：
    1. 把 <owner> 占位符替成真实用户名（README + package.json 的 repository/homepage/bugs）
       顺带生成插件市场要的两个文件：release\<owner>__dsh-wallpaper-studio.yml、release\PR-BODY.filled.md
    2. 打包与验收（构建 → 契约 → 冒烟 → pack → 核对包内文件）
    3. 本地 git：init / 设仓库内身份 / 提交
    4. 远端仓库：不存在则建（-CreateRepo），补 dsh-plugin topic，push
    5. 建 Release v<版本>，把 tarball 以固定名字 dsh-wallpaper-studio.tgz 传上去，并回读校验

  用法：
    powershell -ExecutionPolicy Bypass -File release\publish-github.ps1 -Owner <用户名>
        # 只看本地准备（元数据 + 打包 + 提交），不联网。第一次可以先跑这个。
    $env:GITHUB_TOKEN = '<token>'
    powershell -ExecutionPolicy Bypass -File release\publish-github.ps1 -Owner <用户名> -CreateRepo
        # 建仓库 + 推送 + 发 Release

  退出码：0 = 成功，1 = 任一步失败。
#>
[CmdletBinding()]
param(
  [string]$Owner,
  [string]$Repo = 'dsh-wallpaper-studio',
  [string]$Tag,
  [switch]$CreateRepo,
  [switch]$Private,
  [switch]$LocalOnly,
  [switch]$SkipChecks,
  [string]$GitName,
  [string]$GitEmail,
  [string]$Description = '把图片、视频或内置渐变铺成 DSH 整个界面的背景，并可调主题色与面板透明度。'
)

. (Join-Path $PSScriptRoot '_lib.ps1')

$AssetName = 'dsh-wallpaper-studio.tgz'   # 故意不带版本号：latest/download/<名字> 是按文件名取的，带版本号下次就 404
$Topics = @('dsh-plugin', 'deepseek-harness', 'dsh', 'wallpaper', 'theme')

try {
  $pkg = Get-Pkg
  $version = $pkg.version
  if (-not $Tag) { $Tag = "v$version" }
  $repoRoot = Get-RepoRoot

  # ── 0/5 环境 ───────────────────────────────────────────────────────────────
  Write-Step '0/5 环境'
  Write-Info "包        : $($pkg.name)@$version"
  Write-Info "目标仓库  : $(if ($Owner) { "$Owner/$Repo" } else { "<待定>/$Repo" })"
  Write-Info "标签      : $Tag"
  Write-Info "node      : $(Resolve-Node)"
  Write-Info "git       : $(Get-GitPath)"
  Write-Info "模式      : $(if ($LocalOnly) { '仅本地准备（不联网、不建仓库、不发布）' } else { '线上发布（建仓库 / 推送 / 发 Release）' })"

  $ghUser = $null
  if ($LocalOnly) {
    if (-not $Owner) { throw '本地模式也必须给 -Owner（它会被写进 README 和 package.json）。' }
  } else {
    $null = Get-GitHubToken
    # 顺手验一次令牌：错令牌在这里就停，别等元数据和提交都做完了才发现
    $ghUser = Get-GitHubUser
    if (-not $Owner) { $Owner = $ghUser.login; Write-Info "用令牌对应账号：$Owner" }
  }

  # ── 1/5 填元数据 ──────────────────────────────────────────────────────────
  Write-Step '1/5 填元数据（<owner> → 真实用户名）'
  & (Join-Path $PSScriptRoot 'set-metadata.ps1') -Owner $Owner -Repo $Repo
  $pkg = Get-Pkg
  if (-not $pkg.repository) { throw 'package.json 里没有 repository，元数据没写进去。' }
  $readme = Read-Text (Join-Path $repoRoot 'README.md')
  if ($readme -match '<owner>') { throw 'README.md 里还有没替换的 <owner>。' }
  Write-Ok "repository = $($pkg.repository.url)"

  # ── 2/5 打包与验收 ────────────────────────────────────────────────────────
  Write-Step '2/5 打包与验收'
  $tgz = Invoke-PackageBuild -SkipChecks:$SkipChecks

  # ── 3/5 本地 git ──────────────────────────────────────────────────────────
  Write-Step '3/5 本地 git（init / 身份 / 提交）'
  if (-not (Test-Path (Join-Path $repoRoot '.git'))) {
    Invoke-Git @('init', '-b', 'main') | Out-Null
    Write-Ok '已 git init（分支 main）'
  } else {
    Write-Info '已有 .git，跳过 init'
  }

  # 身份只写进本仓库（git config，不带 --global），不碰你其它项目
  $curEmail = Git-Output @('config', 'user.email')
  if (-not $curEmail) {
    if ($ghUser) {
      if (-not $GitName) { $GitName = if ($ghUser.name) { $ghUser.name } else { $ghUser.login } }
      if (-not $GitEmail) { $GitEmail = "$($ghUser.id)+$($ghUser.login)@users.noreply.github.com" }
    }
    if (-not $GitEmail -or -not $GitName) {
      throw '这个仓库还没有提交身份。本机没有全局 git 身份，本地模式请显式传 -GitName "你的名字" -GitEmail "you@example.com"；带令牌运行时会自动用 GitHub 账号的身份。'
    }
    Invoke-Git @('config', 'user.name', $GitName) | Out-Null
    Invoke-Git @('config', 'user.email', $GitEmail) | Out-Null
    Write-Ok "已设置本仓库身份：$GitName <$GitEmail>"
  } else {
    Write-Info "身份已存在：$(Git-Output @('config', 'user.name')) <$curEmail>"
  }

  Invoke-Git @('add', '-A') | Out-Null
  $staged = Git-Output @('diff', '--cached', '--name-only')
  $hasHead = [bool](Git-Output @('rev-parse', '--verify', 'HEAD'))
  if (-not $hasHead) {
    Invoke-Git @('commit', '-m', "init: $($pkg.name) v$version") | Out-Null
    Write-Ok "首次提交：init: $($pkg.name) v$version"
  } elseif ($staged) {
    $n = ($staged -split "`n").Count
    Invoke-Git @('commit', '-m', "release: v$version") | Out-Null
    Write-Ok "已提交 $n 个文件：release: v$version"
  } else {
    Write-Info '工作区干净，没有新提交'
  }
  $branch = Git-Output @('rev-parse', '--abbrev-ref', 'HEAD')
  if ($branch -ne 'main') {
    if ($hasHead) { Invoke-Git @('branch', '-M', 'main') | Out-Null }
    $branch = 'main'
    Write-Ok '当前分支已改名为 main'
  }
  Write-Ok "HEAD = $(Git-Output @('log', '-1', '--oneline'))"

  if ($LocalOnly) {
    Write-Host "`n仅本地模式：元数据、提交、包都准备好了，什么都没上传。" -ForegroundColor Yellow
    Write-Info "包    : $($tgz.FullName)"
    Write-Info "条目  : $((Join-Path $PSScriptRoot "$Owner`__$Repo.yml"))"
    Write-Host "`n联网发布：`n  `$env:GITHUB_TOKEN = '<token>'`n  powershell -ExecutionPolicy Bypass -File release\publish-github.ps1 -Owner $Owner -CreateRepo`n" -ForegroundColor Yellow
    exit 0
  }

  # ── 4/5 远端仓库 ──────────────────────────────────────────────────────────
  Write-Step "4/5 远端仓库 $Owner/$Repo"
  $remote = Invoke-GitHub -Method GET -Path "/repos/$Owner/$Repo" -Allow404
  if (-not $remote) {
    if (-not $CreateRepo) {
      throw "GitHub 上还没有 $Owner/$Repo。加 -CreateRepo 让我建（公开仓库），或先在网页上手动建好再跑一次。"
    }
    $body = @{
      name         = $Repo
      description  = $Description
      homepage     = "https://www.npmjs.com/package/$($pkg.name)"
      private      = [bool]$Private
      has_issues   = $true
      has_wiki     = $false
      has_projects = $false
      auto_init    = $false
    }
    $remote = Invoke-GitHub -Method POST -Path '/user/repos' -Body $body
    Write-Ok "已建仓库：$($remote.html_url)（$(if ($Private) { '私有' } else { '公开' })）"
  } else {
    Write-Ok "仓库已存在：$($remote.html_url)"
  }

  $existingTopics = @($remote.topics)
  $wantTopics = @($existingTopics + $Topics | Select-Object -Unique)
  if (($wantTopics -join ',') -ne ($existingTopics -join ',')) {
    $null = Invoke-GitHub -Method PUT -Path "/repos/$Owner/$Repo/topics" -Body @{ names = $wantTopics }
    Write-Ok "topic 已补齐：$($wantTopics -join ' ')"
  } else {
    Write-Info "topic 已就绪：$($wantTopics -join ' ')"
  }

  $originUrl = Git-Output @('remote', 'get-url', 'origin')
  $wantUrl = "https://github.com/$Owner/$Repo.git"
  if (-not $originUrl) {
    Invoke-Git @('remote', 'add', 'origin', $wantUrl) | Out-Null
    Write-Ok "origin → $wantUrl"
  } elseif ($originUrl -ne $wantUrl) {
    Invoke-Git @('remote', 'set-url', 'origin', $wantUrl) | Out-Null
    Write-Ok "origin 已改指向 $wantUrl（原来是 $originUrl）"
  } else {
    Write-Info "origin 已是 $wantUrl"
  }

  Write-Info '推送中…'
  $pushed = $false
  try {
    Invoke-GitAuth @('push', '--set-upstream', 'origin', 'main') -Quiet | Out-Null
    $pushed = $true
  } catch {
    $why = ($_.Exception.Message -split "`n")[0].Trim()
    Write-Info "git push 走不通（$why）"
    Write-Info '改用 GitHub API 推送（api.github.com 与 git 走的不是同一条路）…'
    $msg = Git-Output @('log', '-1', '--pretty=%s')
    $null = Push-RepoViaApi -Owner $Owner -Repo $Repo -Message $msg -Branch 'main'
    try {
      Invoke-GitAuth @('fetch', 'origin') -Quiet | Out-Null
      Invoke-Git @('reset', '--hard', 'origin/main') | Out-Null
      Invoke-Git @('branch', '--set-upstream-to=origin/main', 'main') | Out-Null
      Write-Ok "本地 main 已与远端对齐（$(Git-Output @('log', '-1', '--oneline')))"
    } catch {
      Write-Warn2 "本地与远端对齐失败（不影响发布）：$($_.Exception.Message)"
    }
    $pushed = $true
  }
  Write-Ok "已推送 main → $($remote.html_url)"

  # ── 5/5 Release + 附件 ────────────────────────────────────────────────────
  Write-Step "5/5 GitHub Release $Tag + 附件 $AssetName"
  $releaseBody = @"
给整个界面换底：图片 / 视频文件 / 直链 / 6 套内置渐变，配合主题色与面板透明度。

### 安装

- npm：``dsh plugin --profile web add $($pkg.name)``
- 离线：下载本页附件 ``$AssetName``，然后 ``dsh plugin --profile web add ./$AssetName``
- 开发：``dsh plugin --profile web add link:<本仓库绝对路径>``

### 本版变更

- 补上 ``locale/zh.json``、``locale/en.json``，插件页终于显示中文名与简介
- 补上 ``LICENSE``（MIT）
- ``exports`` / ``files`` 增加 locale，其余与 0.1.1 一致，``lib/client.js`` 字节未变

完整变更记录见 README 的「变更记录」。
"@
  $rel = Invoke-GitHub -Method GET -Path "/repos/$Owner/$Repo/releases/tags/$Tag" -Allow404
  if ($rel) {
    Write-Info "Release $Tag 已存在，复用它（id=$($rel.id)）"
    $rel = Invoke-GitHub -Method PATCH -Path "/repos/$Owner/$Repo/releases/$($rel.id)" -Body @{ name = $Tag; body = $releaseBody }
  } else {
    $rel = Invoke-GitHub -Method POST -Path "/repos/$Owner/$Repo/releases" -Body @{
      tag_name         = $Tag
      target_commitish = 'main'
      name             = $Tag
      body             = $releaseBody
      draft            = $false
      prerelease       = $false
    }
    Write-Ok "已建 Release：$($rel.html_url)"
  }

  # 同名附件先删掉，upload 不允许重名
  $assets = @(Invoke-GitHub -Method GET -Path "/repos/$Owner/$Repo/releases/$($rel.id)/assets").assets
  foreach ($a in $assets) {
    if ($a.name -eq $AssetName) {
      $null = Invoke-GitHub -Method DELETE -Path "/repos/$Owner/$Repo/releases/assets/$($a.id)"
      Write-Info "删掉旧附件 $($a.name)（id=$($a.id)）"
    }
  }

  $headers = @{
    'Authorization'        = "Bearer $(Get-GitHubToken)"
    'User-Agent'           = 'dsh-wallpaper-studio-release'
    'Accept'               = 'application/vnd.github+json'
    'X-GitHub-Api-Version' = '2022-11-28'
  }
  $uploadUri = "https://uploads.github.com/repos/$Owner/$Repo/releases/$($rel.id)/assets?name=$AssetName"
  Write-Info "上传 $([math]::Round($tgz.Length / 1024, 1)) KB…"
  $resp = Invoke-WebRequest -Uri $uploadUri -Method Post -InFile $tgz.FullName -ContentType 'application/gzip' `
    -Headers $headers -UseBasicParsing -TimeoutSec 300
  $asset = $resp.Content | ConvertFrom-Json
  Write-Ok "已上传：$($asset.name)（$([math]::Round($asset.size / 1024, 1)) KB, state=$($asset.state)）"

  # 回读确认
  $latest = Invoke-GitHub -Method GET -Path "/repos/$Owner/$Repo/releases/latest" -Allow404
  if ($latest -and $latest.tag_name -eq $Tag) {
    $found = @($latest.assets) | Where-Object { $_.name -eq $AssetName }
    if ($found) { Write-Ok "releases/latest 指向 $Tag，附件就位（$($found.size) 字节）" }
    else { Write-Warn2 "releases/latest 是 $Tag，但没看到 $AssetName 附件" }
  } else {
    Write-Warn2 "releases/latest 还是 $(if ($latest) { $latest.tag_name } else { '空' })（标签排序原因，属正常）"
  }
  $dlUrl = "https://github.com/$Owner/$Repo/releases/latest/download/$AssetName"
  try {
    $head = Invoke-WebRequest -Uri $dlUrl -Method Head -UseBasicParsing -MaximumRedirection 5 -TimeoutSec 40
    Write-Ok "下载链接可用（HTTP $($head.StatusCode)）：$dlUrl"
  } catch {
    Write-Warn2 "下载链接本机没探通（$($_.Exception.Message)）。附件确实传上去了，浏览器打开确认：$dlUrl"
  }

  Write-Host "`n仓库   : $($remote.html_url)" -ForegroundColor Green
  Write-Host "Release: $($rel.html_url)" -ForegroundColor Green
  Write-Host "附件   : $dlUrl" -ForegroundColor Green

  # 市场 CI 会查仓库年龄，刚建的今天提必挂
  try {
    $ageHours = [math]::Round(((Get-Date).ToUniversalTime() - ([datetime]$remote.created_at).ToUniversalTime()).TotalHours, 1)
    if ($ageHours -lt 24) {
      Write-Host "`n注意：仓库现在只有 $ageHours 小时。插件市场要求「至少 1 天」，今天提 PR 会被 CI 拒，约 $([math]::Round(24 - $ageHours, 1)) 小时后再跑 submit-market.ps1。" -ForegroundColor Yellow
    } else {
      Write-Host "`n仓库已满 $ageHours 小时，可以提市场了。" -ForegroundColor Green
    }
  } catch { }
  Write-Host "`n下一步：powershell -ExecutionPolicy Bypass -File release\submit-market.ps1 -Owner $Owner`n" -ForegroundColor Gray
  exit 0
}
catch {
  Write-Host "`n[失败] $($_.Exception.Message)`n" -ForegroundColor Red
  exit 1
}
