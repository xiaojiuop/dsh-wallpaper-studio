<#
  release/deprecate-old.ps1 — 把旧包名标记 deprecated，指向新包。

  背景：同一个插件在 npm 上曾经用 dsh-wallpaperu 这个名字发布过（1.2.0），
  它的 repository 指向的 GitHub 仓库已经不在了。改名发布 dsh-wallpaper-studio 之后，
  给旧包挂一行 deprecated，用户装到旧包时能看到指引，不会停在 404 链接上。

  只跑一次；重复跑是幂等的（覆盖同一条说明）。

  用法：
    $env:NPM_TOKEN = '<automation token>'
    powershell -ExecutionPolicy Bypass -File release\deprecate-old.ps1
    powershell -ExecutionPolicy Bypass -File release\deprecate-old.ps1 -OldName dsh-wallpaperu -OldVersion 1.2.0

  退出码：0 = 成功，1 = 失败。
#>
[CmdletBinding()]
param(
  [string]$OldName = 'dsh-wallpaperu',
  [string]$OldVersion = '',
  [string]$NewName = '',
  [string]$Message = ''
)

. (Join-Path $PSScriptRoot '_lib.ps1')

try {
  $pkg = Get-Pkg
  if (-not $NewName) { $NewName = $pkg.name }
  $target = if ($OldVersion) { "$OldName@$OldVersion" } else { $OldName }
  $msg = if ($Message) { $Message } else { "已改名为 $NewName，安装：dsh plugin --profile web add $NewName" }

  Write-Step '0/2 环境'
  Write-Info "旧包 : $target"
  Write-Info "新包 : $NewName@$($pkg.version)"
  Write-Info "说明 : $msg"

  Write-Step '1/2 确认旧包存在'
  $regUrl = "https://registry.npmjs.org/$OldName"
  try {
    $doc = Invoke-RestMethod -Uri $regUrl -TimeoutSec 40 -Headers @{ 'User-Agent' = 'dsh-release' }
  } catch {
    throw "npm 上没有 $OldName（HTTP $([int]$_.Exception.Response.StatusCode)），不用处理。"
  }
  Write-Ok "找到 $OldName，最新版 $($doc.'dist-tags'.latest)"
  if ($OldVersion -and -not $doc.versions.$OldVersion) {
    throw "$OldName 没有 $OldVersion 这个版本（现有：$($doc.versions.PSObject.Properties.Name -join ', ')）"
  }

  Write-Step '2/2 写入 deprecated 标记'
  $token = Get-NpmToken
  $cfg = Join-Path $env:TEMP ("dsh-npmrc-" + [guid]::NewGuid().ToString('N'))
  Write-Text $cfg ((@('registry=https://registry.npmjs.org/', "//registry.npmjs.org/:_authToken=$token")) -join "`r`n")
  try {
    $env:NPM_CONFIG_USERCONFIG = $cfg
    Push-Location (Get-RepoRoot)
    try {
      Invoke-Pnpm @('deprecate', $target, $msg) | Out-Null
    } finally {
      Pop-Location
    }
  } finally {
    Remove-Item Env:NPM_CONFIG_USERCONFIG -ErrorAction SilentlyContinue
    Remove-Item $cfg -Force -ErrorAction SilentlyContinue
  }
  Write-Ok "已提交 deprecated：$target"

  # 回读确认（registry 可能有几秒延迟，失败只警告）
  Start-Sleep -Seconds 2
  try {
    $doc2 = Invoke-RestMethod -Uri $regUrl -TimeoutSec 40 -Headers @{ 'User-Agent' = 'dsh-release'; 'Cache-Control' = 'no-cache' }
    $ver = if ($OldVersion) { $OldVersion } else { $doc2.'dist-tags'.latest }
    $d = $doc2.versions.$ver.deprecated
    if ($d) { Write-Ok "回读确认：$OldName@$ver 的 deprecated = $d" }
    else { Write-Warn2 "回读还没看到 deprecated 字段（registry 缓存），稍后确认：https://www.npmjs.com/package/$OldName" }
  } catch {
    Write-Warn2 "回读失败：$($_.Exception.Message)"
  }

  Write-Host "`n旧包页：https://www.npmjs.com/package/$OldName" -ForegroundColor Green
  Write-Host "新包页：https://www.npmjs.com/package/$NewName`n" -ForegroundColor Green
  exit 0
}
catch {
  Write-Host "`n[失败] $($_.Exception.Message)`n" -ForegroundColor Red
  exit 1
}
