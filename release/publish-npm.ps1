<#
  release/publish-npm.ps1 — 出正式线上包，并按需发布到 npm 公共注册表。

  默认（不带 -Publish）只做「打包 + 验收」，不联网上传 —— 先跑一遍确认包内容，
  再加 -Publish 真正发布。

  用法：
    powershell -ExecutionPolicy Bypass -File release\publish-npm.ps1              # 只打包 + 验收
    $env:NPM_TOKEN = '<automation token>'
    powershell -ExecutionPolicy Bypass -File release\publish-npm.ps1 -Publish     # 真正发布

  退出码：0 = 成功（含仅验收），1 = 任一步失败。
#>
[CmdletBinding()]
param(
  [switch]$Publish,
  [switch]$SkipChecks,
  [string]$Tag = 'latest'
)

. (Join-Path $PSScriptRoot '_lib.ps1')

try {
  $pkg = Get-Pkg
  $version = $pkg.version

  Write-Step '0/3 环境'
  Write-Info "包名 : $($pkg.name)"
  Write-Info "版本 : $version"
  Write-Info "node : $(Resolve-Node)"
  Write-Info "模式 : $(if ($Publish) { '发布（会联网上传到 registry.npmjs.org）' } else { '仅打包验收（不上传，加 -Publish 才发布）' })"

  # 市场会把「只声明 dsh.client」的包判为不合格，这两条先自查，别等 CI 才报
  if ($pkg.dsh.bundle.patch -ne './cordis.patch.yml') {
    throw 'package.json 的 dsh.bundle.patch 不是 ./cordis.patch.yml，市场会判为「只有 dsh.client」而拒绝。'
  }
  if (-not $pkg.dsh.client.platform) { throw 'package.json 缺少 dsh.client.platform。' }

  # ── 打包与验收（构建 → 21 项契约 → 16 项冒烟 → pack → 核对包内文件）────────
  Write-Step '1/3 打包与验收'
  $tgz = Invoke-PackageBuild -SkipChecks:$SkipChecks

  # ── 发布 ──────────────────────────────────────────────────────────────────
  Write-Step '2/3 发布到 npm'
  if (-not $Publish) {
    Write-Host "`n未加 -Publish：到此为止，包在 $($tgz.FullName)" -ForegroundColor Yellow
    Write-Host "确认无误后：`n  `$env:NPM_TOKEN = '<token>'`n  powershell -ExecutionPolicy Bypass -File release\publish-npm.ps1 -Publish`n" -ForegroundColor Yellow
    exit 0
  }

  $token = Get-NpmToken
  $cfg = Join-Path $env:TEMP ("dsh-npmrc-" + [guid]::NewGuid().ToString('N'))
  # 令牌只落在这个临时 userconfig 里，publish 结束立刻删掉
  Write-Text $cfg ((@('registry=https://registry.npmjs.org/', "//registry.npmjs.org/:_authToken=$token")) -join "`r`n")
  try {
    $env:NPM_CONFIG_USERCONFIG = $cfg
    Push-Location (Get-RepoRoot)
    try {
      Invoke-Pnpm @('publish', '--no-git-checks', '--access', 'public', '--tag', $Tag) | Out-Null
    } finally {
      Pop-Location
    }
  } finally {
    Remove-Item Env:NPM_CONFIG_USERCONFIG -ErrorAction SilentlyContinue
    Remove-Item $cfg -Force -ErrorAction SilentlyContinue
  }
  Write-Ok "已上传 $($pkg.name)@$version（tag: $Tag）"

  # ── 回读注册表 ────────────────────────────────────────────────────────────
  Write-Step '3/3 回读注册表确认已上线'
  $url = "https://registry.npmjs.org/$($pkg.name)/$version"
  try {
    $r = Invoke-RestMethod -Uri $url -TimeoutSec 40 -Headers @{ 'User-Agent' = 'dsh-release' }
    Write-Ok "已上线：$($r.name)@$($r.version)"
    Write-Ok "dist.tarball  : $($r.dist.tarball)"
    Write-Ok "dist.integrity: $($r.dist.integrity)"
  } catch {
    Write-Warn2 "注册表回读失败（可能刚发布还没刷新）：$($_.Exception.Message)"
    Write-Info "稍后手动确认：$url"
  }

  Write-Host "`n包页：https://www.npmjs.com/package/$($pkg.name)" -ForegroundColor Green
  Write-Host "安装：dsh plugin --profile web add $($pkg.name)`n" -ForegroundColor Green
  Write-Host "下一步：powershell -ExecutionPolicy Bypass -File release\publish-github.ps1 -Owner <用户名> -CreateRepo" -ForegroundColor Gray
  exit 0
}
catch {
  Write-Host "`n[失败] $($_.Exception.Message)`n" -ForegroundColor Red
  exit 1
}
