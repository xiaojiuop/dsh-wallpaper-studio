<#
  release/submit-market.ps1 — 把插件提交到 DSH 插件市场列表（awesome-dsh-plugin）。

  市场是一份 GitHub 目录：提交 = 在 data/plugins/ 下加一个 <owner>__<repo>.yml，然后开 PR。
  README.md / README.zh.md 由 CI/maintainer 生成，绝对不能手改；也不要碰 .github/。

  脚本做的事：
    1. 确保条目文件存在（release\<owner>__dsh-wallpaper-studio.yml，由 set-metadata.ps1 生成）并自查格式
    2. 逐条过市场的硬性前置检查（仓库存在 / 满 1 天 / 有 dsh-plugin topic / package.json 声明 dsh.bundle / Release 附件在）
    3. fork 上游仓库 → 从上游默认分支拉新分支 → 用 Contents API 只提交那一个 yml
    4. 开 PR，打印 PR 链接与要看的那几个 CI

  用法：
    powershell -ExecutionPolicy Bypass -File release\submit-market.ps1 -Owner <用户名> -DryRun   # 只做前置检查
    $env:GITHUB_TOKEN = '<token>'
    powershell -ExecutionPolicy Bypass -File release\submit-market.ps1 -Owner <用户名>           # 真的提 PR

  退出码：0 = 成功（含 DryRun 通过），1 = 前置检查没过或任一步失败。
#>
[CmdletBinding()]
param(
  [string]$Owner,
  [string]$Repo = 'dsh-wallpaper-studio',
  [string]$Upstream = 'awesome-dsh-plugin/awesome-dsh-plugin',
  [string]$Title,
  [switch]$DryRun,
  [switch]$AllowYoungRepo
)

. (Join-Path $PSScriptRoot '_lib.ps1')

$AssetName = 'dsh-wallpaper-studio.tgz'
$Categories = @('agi', 'ui', 'usage', 'theme', 'model', 'identity', 'session', 'memory', 'tools', 'wsl',
  'browser', 'vision', 'voice', 'docs', 'skill', 'workflow', 'git', 'notify', 'dev', 'security',
  'remote', 'market', 'fun')

try {
  $pkg = Get-Pkg
  $version = $pkg.version
  $upstreamOwner = ($Upstream -split '/')[0]
  $upstreamRepo = ($Upstream -split '/')[1]
  $repoRoot = Get-RepoRoot

  # ── 0/5 环境 ───────────────────────────────────────────────────────────────
  Write-Step '0/5 环境'
  Write-Info "插件      : $($pkg.name)@$version"
  Write-Info "上游      : $Upstream"
  Write-Info "模式      : $(if ($DryRun) { '只做前置检查（不 fork、不提 PR）' } else { '真的提 PR' })"
  $null = Get-GitHubToken
  $me = Get-GitHubLogin
  if (-not $Owner) { $Owner = $me }
  if (-not $Title) { $Title = "Add ``$Owner/$Repo`` (theme)" }
  Write-Info "提交账号  : $me"
  Write-Info "PR 标题   : $Title"

  # ── 1/5 条目文件 ──────────────────────────────────────────────────────────
  Write-Step '1/5 条目文件'
  $entryPath = Join-Path $PSScriptRoot "$Owner`__$Repo.yml"
  if (-not (Test-Path $entryPath)) {
    Write-Info '还没有条目文件，先用 set-metadata.ps1 生成'
    & (Join-Path $PSScriptRoot 'set-metadata.ps1') -Owner $Owner -Repo $Repo
  }
  if (-not (Test-Path $entryPath)) { throw "没生成条目文件：$entryPath" }
  $entryText = Read-Text $entryPath
  Write-Ok "条目文件：$([System.IO.Path]::GetFileName($entryPath))"

  $problems = @()
  if (-not $entryText.Contains("url: https://github.com/$Owner/$Repo")) { $problems += "url 必须是 https://github.com/$Owner/$Repo" }
  if (-not $entryText.Contains("name: $Owner/$Repo")) { $problems += "name 必须是 $Owner/$Repo" }
  if ($entryText -match '(?m)^category:\s*(\S+)\s*$') {
    if ($Categories -notcontains $Matches[1]) { $problems += "category「$($Matches[1])」不在市场允许的列表里" }
  } else { $problems += '缺少顶层 category' }
  if (-not ($entryText -match '(?m)^\s+en:\s*\S')) { $problems += '缺少 description.en（市场要求必填）' }
  # 值里出现 ": " 又没加引号，YAML 会把它当成嵌套键
  foreach ($line in ($entryText -split '[\r\n]+')) {
    if ($line -match '^\s*[A-Za-z][\w-]*:\s+(.+)$') {
      $value = $Matches[1]
      if ($value -match ': ' -and -not ($value.StartsWith('"') -or $value.StartsWith("'"))) {
        $problems += "值里有「: 」但没加引号，YAML 会解析错：$($line.Trim())"
      }
    }
  }
  if ($problems) { throw ("条目文件有问题：`n  " + ($problems -join "`n  ")) }
  Write-Ok '条目字段自查通过（url / name / category / description.en）'

  # ── 2/5 市场硬性前置检查 ──────────────────────────────────────────────────
  Write-Step '2/5 市场硬性前置检查'
  $repoInfo = Invoke-GitHub -Method GET -Path "/repos/$Owner/$Repo" -Allow404
  if (-not $repoInfo) { throw "GitHub 上找不到 $Owner/$Repo —— 先跑 release/publish-github.ps1 -Owner $Owner -CreateRepo。" }
  Write-Ok "仓库存在：$($repoInfo.html_url)"

  $ageHours = [math]::Round(((Get-Date).ToUniversalTime() - ([datetime]$repoInfo.created_at).ToUniversalTime()).TotalHours, 1)
  if ($ageHours -lt 24) {
    if (-not $AllowYoungRepo) {
      throw "仓库只有 $ageHours 小时。市场 CI 会拒绝不满 1 天的仓库（约 $([math]::Round(24 - $ageHours, 1)) 小时后再来）。确认要试可以加 -AllowYoungRepo。"
    }
    Write-Warn2 "仓库只有 $ageHours 小时，CI 大概率拒（-AllowYoungRepo 已放行）"
  } else {
    Write-Ok "仓库已存在 $ageHours 小时（≥ 1 天）"
  }

  if (@($repoInfo.topics) -notcontains 'dsh-plugin') {
    throw "仓库没有 dsh-plugin topic。补上再提：publish-github.ps1 会自动补，或网页 Settings → Topics 手动加。"
  }
  Write-Ok '有 dsh-plugin topic'

  $branch = if ($repoInfo.default_branch) { $repoInfo.default_branch } else { 'main' }
  $remotePkg = Invoke-GitHub -Method GET -Path "/repos/$Owner/$Repo/contents/package.json?ref=$branch"
  $remotePkgText = [System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String(($remotePkg.content -replace '\s', '')))
  $remotePkgJson = $remotePkgText | ConvertFrom-Json
  if (-not $remotePkgJson.dsh.bundle) { throw "$Owner/$Repo 的 package.json 没有声明 dsh.bundle —— 市场会判为「只有 dsh.client」直接拒。" }
  Write-Ok "package.json 声明了 dsh.bundle（patch=$($remotePkgJson.dsh.bundle.patch)）"

  $latest = Invoke-GitHub -Method GET -Path "/repos/$Owner/$Repo/releases/latest" -Allow404
  $hasAsset = $latest -and (@($latest.assets) | Where-Object { $_.name -eq $AssetName })
  if (-not $hasAsset) { throw "最新 Release 里没有 $AssetName 附件（条目里的 tarball 会 404）。先跑 publish-github.ps1。" }
  Write-Ok "Release $($latest.tag_name) 有附件 $AssetName"

  $upstreamInfo = Invoke-GitHub -Method GET -Path "/repos/$Upstream"
  $base = if ($upstreamInfo.default_branch) { $upstreamInfo.default_branch } else { 'main' }
  $entryRel = "data/plugins/$Owner`__$Repo.yml"
  $already = Invoke-GitHub -Method GET -Path "/repos/$Upstream/contents/$entryRel" -Allow404
  if ($already) { throw "上游已经有 $entryRel 了（可能你已经提过，或同名的被收录）。别再提第二个。" }
  Write-Ok "上游还没有 $entryRel，可以新增"

  if ($DryRun) {
    Write-Host "`n前置检查全过（DryRun，没有 fork、没有提 PR）。" -ForegroundColor Green
    Write-Info "真正提交：`$env:GITHUB_TOKEN = '<token>'; powershell -ExecutionPolicy Bypass -File release\submit-market.ps1 -Owner $Owner"
    exit 0
  }

  # ── 3/5 fork + 分支 + 提交那一个文件 ──────────────────────────────────────
  Write-Step '3/5 fork 上游并提交条目'
  $fork = Invoke-GitHub -Method GET -Path "/repos/$me/$upstreamRepo" -Allow404
  if (-not $fork) {
    Write-Info "fork $Upstream …"
    $null = Invoke-GitHub -Method POST -Path "/repos/$Upstream/forks" -Body @{}
  } else {
    Write-Info "fork 已存在：$($fork.full_name)"
  }
  # fork 不是瞬间就绪，等它出现
  $ready = $false
  for ($i = 0; $i -lt 20; $i++) {
    $fork = Invoke-GitHub -Method GET -Path "/repos/$me/$upstreamRepo" -Allow404
    if ($fork -and $fork.default_branch) { $ready = $true; break }
    Start-Sleep -Milliseconds 1500
  }
  if (-not $ready) { throw "fork $me/$upstreamRepo 还没就绪，等几十秒再跑一次这个脚本。" }
  Write-Ok "fork 就绪：$($fork.full_name)（默认分支 $($fork.default_branch)）"

  $baseRef = Invoke-GitHub -Method GET -Path "/repos/$Upstream/git/ref/heads/$base"
  $baseSha = $baseRef.object.sha
  Write-Info "上游 $base 最新提交：$($baseSha.Substring(0, 7))"

  $slug = ($Repo -replace '[^A-Za-z0-9._-]', '-')
  $newBranch = "add-$slug"
  $refPath = "/repos/$me/$upstreamRepo/git/refs/heads/$newBranch"
  $null = Invoke-GitHub -Method DELETE -Path $refPath -Allow404
  $null = Invoke-GitHub -Method POST -Path "/repos/$me/$upstreamRepo/git/refs" -Body @{ ref = "refs/heads/$newBranch"; sha = $baseSha }
  Write-Ok "分支 $newBranch 已从上游最新提交拉出"

  $encoded = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($entryText))
  $null = Invoke-GitHub -Method PUT -Path "/repos/$me/$upstreamRepo/contents/$entryRel" -Body @{
    message = "Add $Owner/$Repo"
    content = $encoded
    branch  = $newBranch
  }
  Write-Ok "已提交 $entryRel（只这一个文件）"

  # ── 4/5 开 PR ─────────────────────────────────────────────────────────────
  Write-Step '4/5 开 PR'
  $bodyFile = Join-Path $PSScriptRoot 'PR-BODY.filled.md'
  if (-not (Test-Path $bodyFile)) { $bodyFile = Join-Path $PSScriptRoot 'PR-BODY.md' }
  $prBody = Read-Text $bodyFile
  $prBody = $prBody.Replace('<owner>', $Owner)
  $pr = $null
  try {
    $pr = Invoke-GitHub -Method POST -Path "/repos/$Upstream/pulls" -Body @{
      title                 = $Title
      head                  = "$me`:$newBranch"
      base                  = $base
      body                  = $prBody
      maintainer_can_modify = $true
    }
  } catch {
    if ($_.Exception.Message -match 'already exists') {
      $existing = @(Invoke-GitHub -Method GET -Path "/repos/$Upstream/pulls?state=open&head=$me`:$newBranch")
      if ($existing.Count -gt 0 -and $existing[0]) { $pr = $existing[0] }
    }
    if (-not $pr) { throw }
  }
  Write-Ok "PR 已创建：$($pr.html_url)"

  # ── 5/5 收尾 ──────────────────────────────────────────────────────────────
  Write-Step '5/5 收尾'
  Write-Host "`nPR      : $($pr.html_url)" -ForegroundColor Green
  Write-Host "改动    : $entryRel（一个文件，没有动 README，也没有动 .github/）" -ForegroundColor Green
  Write-Host "`n去 PR 页看这几个检查项：" -ForegroundColor Gray
  Write-Info '1. entries-live-in-data-plugins   —— 条目是不是正好在 data/plugins/ 一层'
  Write-Info '2. pr-check / awesome-lint        —— 生成 README 与 lint'
  Write-Info '3. 仓库年龄 / dsh.bundle 探测      —— 已经在本地验过'
  Write-Host "`n过了之后 maintainer 会合并，README 行由 main 上的 CI 生成，你不需要自己改。" -ForegroundColor Gray
  exit 0
}
catch {
  Write-Host "`n[失败] $($_.Exception.Message)`n" -ForegroundColor Red
  exit 1
}
