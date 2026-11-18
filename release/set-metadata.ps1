<#
  release/set-metadata.ps1 — 把仓库里唯一一处占位符 <owner> 换成真实 GitHub 用户名，
  并补齐 package.json 的 repository / homepage / bugs（npm 包靠 repository 指回仓库，
  市场才会把「npm 包」和「插件条目」认成同一个项目）。

  幂等：重复执行不会重复插入字段。可以单独跑，也会被 publish-github.ps1 自动调用。

  用法：
    powershell -ExecutionPolicy Bypass -File release\set-metadata.ps1 -Owner 你的GitHub用户名
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true, HelpMessage = '你的 GitHub 用户名，例如 Ada-Lovelace')][string]$Owner,
  [string]$Repo = 'dsh-wallpaper-studio'
)

. (Join-Path $PSScriptRoot '_lib.ps1')
$root = Get-RepoRoot
$changed = New-Object System.Collections.ArrayList

Write-Step "写入发布元数据（owner=$Owner / repo=$Repo）"

$readme = Join-Path $root 'README.md'
$pkgPath = Join-Path $root 'package.json'

# ── 0. 之前已经填过别的用户名时，先整体改过来 ────────────────────────────────
# （填错用户名很常见；改用户名时不能只找 <owner> 占位符，那已经没了）
$prevOwner = $null
$repoPattern = 'github\.com/([^/"]+)/' + [regex]::Escape($Repo)
if ((Read-Text $pkgPath) -match $repoPattern) { $prevOwner = $Matches[1] }
elseif ((Read-Text $readme) -match $repoPattern) { $prevOwner = $Matches[1] }

if ($prevOwner -eq '<owner>') { $prevOwner = $null }   # 还没填过，走下面的占位符替换

if ($prevOwner -and $prevOwner -ne $Owner) {
  Write-Info "之前填的是 $prevOwner，改成 $Owner"
  foreach ($f in @($readme, $pkgPath)) {
    $t = Read-Text $f
    $t2 = $t.Replace("github.com/$prevOwner/", "github.com/$Owner/")
    if ($t2 -ne $t) { Write-Text $f $t2; [void]$changed.Add([System.IO.Path]::GetFileName($f)) }
  }
}

# ── 1. README.md：Release 附件的下载地址 ─────────────────────────────────────
if (Set-Placeholder -Path $readme -Map @{ owner = $Owner }) { [void]$changed.Add('README.md') }

# ── 2. package.json：repository / homepage / bugs ────────────────────────────
$raw = Read-Text $pkgPath
if ($raw -match '"repository"') {
  Write-Info 'package.json 已有 repository，跳过'
} else {
  if ($raw -match "`r`n") { $nl = "`r`n" } else { $nl = "`n" }
  $block = @(
    '  "repository": {'
    '    "type": "git",'
    "    `"url`": `"git+https://github.com/$Owner/$Repo.git`""
    '  },'
    "  `"homepage`": `"https://github.com/$Owner/$Repo#readme`","
    '  "bugs": {'
    "    `"url`": `"https://github.com/$Owner/$Repo/issues`""
    '  },'
  ) -join $nl
  # 纯字符串拼接（不走 -replace），避免替换串里的 $ 被当成捕获组
  $m = [regex]::Match($raw, '"version"\s*:\s*"[^"]+",')
  if (-not $m.Success) { throw '没能定位 package.json 的 version 行，插入 repository 失败。' }
  $cut = $m.Index + $m.Length
  $raw2 = $raw.Substring(0, $cut) + $nl + $block + $raw.Substring($cut)
  Write-Text $pkgPath $raw2
  [void]$changed.Add('package.json')
}

# JSON 必须仍然能解析，否则后面打包会炸得莫名其妙
try {
  $null = Read-Text $pkgPath | ConvertFrom-Json
  Write-Ok 'package.json 仍是合法 JSON'
} catch {
  throw "package.json 被改坏了：$($_.Exception.Message)"
}

# ── 3. 市场条目：<owner>__dsh-wallpaper-studio.yml ───────────────────────────
$tmpl = Join-Path $PSScriptRoot 'market-entry.template.yml'
$entryName = "${Owner}__${Repo}.yml"
$entry = Join-Path $PSScriptRoot $entryName
Get-ChildItem $PSScriptRoot -Filter '*__*.yml' -ErrorAction SilentlyContinue | Remove-Item -Force
Copy-Item $tmpl $entry -Force
$null = Set-Placeholder -Path $entry -Map @{ owner = $Owner }
[void]$changed.Add("release/$entryName")

# ── 4. PR 正文 ───────────────────────────────────────────────────────────────
$bodySrc = Join-Path $PSScriptRoot 'PR-BODY.md'
$bodyOut = Join-Path $PSScriptRoot 'PR-BODY.filled.md'
Copy-Item $bodySrc $bodyOut -Force
$null = Set-Placeholder -Path $bodyOut -Map @{ owner = $Owner; version = (Get-PkgVersion) }
[void]$changed.Add('release/PR-BODY.filled.md')

if ($changed.Count -eq 0) { Write-Warn2 '没有任何文件发生变化（可能已经写过了）。' }
else { foreach ($c in $changed) { Write-Ok $c } }

# ── 5. 自检：三处必须都是同一个 owner ───────────────────────────────────────
$need = [regex]::Escape("github.com/$Owner/$Repo")
$bad = @()
if ((Read-Text $pkgPath) -notmatch $need) { $bad += 'package.json' }
if ((Read-Text $readme) -notmatch $need) { $bad += 'README.md' }
if ($bad.Count -gt 0) { throw "自检失败：$($bad -join '、') 里没有写成 $Owner（重跑一次通常就好，脚本是幂等的）" }
Write-Ok "自检通过：README / package.json / 市场条目 都是 $Owner/$Repo"

Write-Host "`n下一步：`n  powershell -ExecutionPolicy Bypass -File release\publish-npm.ps1 -Publish        # 发 npm`n  powershell -ExecutionPolicy Bypass -File release\publish-github.ps1 -Owner $Owner -CreateRepo   # 发 GitHub Release`n  powershell -ExecutionPolicy Bypass -File release\submit-market.ps1 -Owner $Owner              # 提插件市场" -ForegroundColor Gray
