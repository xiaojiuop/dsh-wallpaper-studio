# release/_lib.ps1 — 发布脚本共用的最小工具集（被其它脚本 dot-source，不单独执行）
#
# 兼容 Windows PowerShell 5.1（这台机器上没有 pwsh 7）与 PowerShell 7。
# 只用系统自带能力（Invoke-RestMethod / git / tar），不依赖 npm、gh、jq。
# 所有令牌只从环境变量读，从不写进仓库里的文件。

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

# 5.1 默认还会协商 SSL3/TLS1.0，GitHub 与 npm 都会直接失败
try {
  [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
} catch {
  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
}

$script:RepoRoot = Split-Path -Parent $PSScriptRoot
$script:GhApi = 'https://api.github.com'
$script:Utf8NoBom = New-Object System.Text.UTF8Encoding($false)

function Write-Step([string]$Text) { Write-Host "`n> $Text" -ForegroundColor Cyan }
function Write-Ok([string]$Text) { Write-Host "  [ok] $Text" -ForegroundColor Green }
function Write-Warn2([string]$Text) { Write-Host "  [warn] $Text" -ForegroundColor Yellow }
function Write-Info([string]$Text) { Write-Host "        $Text" -ForegroundColor DarkGray }

function Get-RepoRoot { $script:RepoRoot }

# ── 文本读写：一律 UTF-8 无 BOM（5.1 的 Set-Content -Encoding utf8 会加 BOM，
#    而带 BOM 的 package.json 会让部分工具链的 JSON.parse 失败） ───────────────
function Read-Text([string]$Path) {
  return [System.IO.File]::ReadAllText($Path, [System.Text.Encoding]::UTF8)
}
function Write-Text([string]$Path, [string]$Text) {
  [System.IO.File]::WriteAllText($Path, $Text, $script:Utf8NoBom)
}

function Get-Pkg {
  Read-Text (Join-Path $script:RepoRoot 'package.json') | ConvertFrom-Json
}

function Get-PkgVersion { (Get-Pkg).version }

# Windows 上 dsh 桌面版自带的 node / pnpm 不在 PATH 里，按「PATH → DSH 运行时 → 常见安装位置」找。
function Resolve-Node {
  $cmd = Get-Command node -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }

  $patterns = @(
    (Join-Path $env:USERPROFILE '.dsh\dsh-runtimes\*\dependencies\node\bin\node.exe'),
    (Join-Path $env:LOCALAPPDATA 'Programs\nodejs\node.exe'),
    'C:\Program Files\nodejs\node.exe'
  )
  foreach ($p in $patterns) {
    $hit = Get-ChildItem -Path $p -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($hit) { return $hit.FullName }
  }
  throw '找不到 node。装一个 Node.js >= 22 并加进 PATH，或把 node.exe 放到 PATH 上。'
}

function Resolve-PnpmCjs {
  $patterns = @(
    (Join-Path $env:USERPROFILE '.dsh\dsh-runtimes\*\dependencies\pnpm\bin\pnpm.cjs'),
    (Join-Path $env:APPDATA 'npm\node_modules\pnpm\bin\pnpm.cjs'),
    (Join-Path $env:LOCALAPPDATA 'pnpm\pnpm.cjs')
  )
  foreach ($p in $patterns) {
    $hit = Get-ChildItem -Path $p -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($hit) { return $hit.FullName }
  }
  throw '找不到 pnpm。用 `npm i -g pnpm` 装一个即可（脚本只用它打包和发布）。'
}

# 跑外部命令：stdout 正常打印，stderr 走灰色提示（不当成报错），exit!=0 才算失败。
# 不用 & 直接调，是因为 5.1 会把子进程写到 stderr 的每一行包成 ErrorRecord，
# 控制台一片红，看不出到底哪里错了。
# 注意：Start-Process 的工作目录跟 PowerShell 的当前位置不完全是一回事，
# 凡是要在包根目录跑的，必须显式传 -WorkingDirectory，别依赖用户当时在哪个目录。
function Invoke-Native {
  param(
    [Parameter(Mandatory)][string]$FilePath,
    [string[]]$Arguments = @(),
    [string]$WorkingDirectory,
    [switch]$Quiet,
    [switch]$SuppressStderr
  )
  $quoted = @()
  foreach ($a in $Arguments) {
    if ($a -match '[\s"]') { $quoted += ('"' + ($a -replace '"', '\"') + '"') } else { $quoted += $a }
  }
  $stamp = [guid]::NewGuid().ToString('N')
  $outFile = Join-Path $env:TEMP "dws-out-$stamp"
  $errFile = Join-Path $env:TEMP "dws-err-$stamp"
  $sp = @{
    FilePath               = $FilePath
    ArgumentList           = ($quoted -join ' ')
    NoNewWindow            = $true
    Wait                   = $true
    PassThru               = $true
    RedirectStandardOutput = $outFile
    RedirectStandardError  = $errFile
  }
  if ($WorkingDirectory) { $sp.WorkingDirectory = $WorkingDirectory }
  try {
    $proc = Start-Process @sp
    $stdout = if (Test-Path $outFile) { [System.IO.File]::ReadAllText($outFile) } else { '' }
    $stderr = if (Test-Path $errFile) { [System.IO.File]::ReadAllText($errFile) } else { '' }
    if (-not $SuppressStderr) {
      foreach ($line in ($stderr -split '[\r\n]+')) { if ($line.Trim()) { Write-Info $line } }
    }
    if (-not $Quiet) {
      foreach ($line in ($stdout -split '[\r\n]+')) { if ($line.Trim()) { Write-Host $line } }
    }
    if ($proc.ExitCode -ne 0) {
      throw "$([System.IO.Path]::GetFileName($FilePath)) $($Arguments -join ' ') 失败（exit $($proc.ExitCode)）"
    }
    return $stdout
  } finally {
    Remove-Item $outFile, $errFile -Force -ErrorAction SilentlyContinue
  }
}

function Invoke-Pnpm {
  param([string[]]$Arguments, [string]$WorkingDirectory)
  Invoke-Native -FilePath (Resolve-Node) -Arguments (@((Resolve-PnpmCjs)) + $Arguments) -WorkingDirectory $WorkingDirectory
}

function Get-NpmToken {
  foreach ($name in @('NPM_TOKEN', 'NODE_AUTH_TOKEN')) {
    $v = [Environment]::GetEnvironmentVariable($name)
    if ($v) { return $v }
  }
  throw @'
没有 npm 令牌。发布前在当前会话设置（只影响这一次）：

  $env:NPM_TOKEN = '<npm automation token>'

令牌在 https://www.npmjs.com/settings/~/tokens 生成，选 Automation 类型（可绕过 2FA）。
'@
}

function Get-GitHubToken {
  foreach ($name in @('GITHUB_TOKEN', 'GH_TOKEN')) {
    $v = [Environment]::GetEnvironmentVariable($name)
    if ($v) { return $v }
  }
  throw @'
没有 GitHub 令牌。发布前在当前会话设置（只影响这一次）：

  $env:GITHUB_TOKEN = '<personal access token>'

经典令牌勾 repo（建仓库 / 推代码 / 提 PR 都要）；
细粒度令牌需要 Contents: Read and write、Administration: Read and write、Pull requests: Read and write。
'@
}

function Get-HttpErrorDetail {
  param($ErrorRecord)
  if ($ErrorRecord.ErrorDetails -and $ErrorRecord.ErrorDetails.Message) {
    return $ErrorRecord.ErrorDetails.Message
  }
  try {
    $resp = $ErrorRecord.Exception.Response
    if ($resp -and $resp.GetResponseStream) {
      $reader = New-Object System.IO.StreamReader($resp.GetResponseStream())
      $detail = $reader.ReadToEnd()
      $reader.Close()
      if ($detail) { return $detail }
    }
  } catch { }
  return $ErrorRecord.Exception.Message
}

function Get-HttpStatus {
  param($ErrorRecord)
  try { return [int]$ErrorRecord.Exception.Response.StatusCode } catch { return $null }
}

function Invoke-GitHub {
  <# 调 GitHub REST；失败时把 API 的 message 原样抛出来，别吞掉。 #>
  param(
    [Parameter(Mandatory)][ValidateSet('GET', 'POST', 'PUT', 'PATCH', 'DELETE')][string]$Method,
    [Parameter(Mandatory)][string]$Path,
    $Body,
    [switch]$Allow404
  )
  $headers = @{
    'Authorization'        = "Bearer $(Get-GitHubToken)"
    'User-Agent'           = 'dsh-wallpaper-studio-release'
    'Accept'               = 'application/vnd.github+json'
    'X-GitHub-Api-Version' = '2022-11-28'
  }
  $params = @{ Method = $Method; Uri = "$script:GhApi$Path"; Headers = $headers; ErrorAction = 'Stop' }
  if ($null -ne $Body) {
    $params.Body = ($Body | ConvertTo-Json -Depth 12 -Compress)
    $params.ContentType = 'application/json; charset=utf-8'
  }
  try {
    return Invoke-RestMethod @params
  } catch {
    $status = Get-HttpStatus $_
    # 409 也是「还没有」：全新空仓库读 git/ref 会回 409 Git Repository is empty.
    if ($Allow404 -and ($status -eq 404 -or $status -eq 409)) { return $null }
    $detail = Get-HttpErrorDetail $_
    throw "GitHub $Method $Path 失败（HTTP $status）：`n$detail"
  }
}

function Get-GitPath {
  $cmd = Get-Command git -ErrorAction SilentlyContinue
  if (-not $cmd) { throw '找不到 git。装 Git for Windows 后重开终端。' }
  return $cmd.Source
}

function Invoke-Git {
  param([string[]]$Arguments, [switch]$Quiet)
  Invoke-Native -FilePath (Get-GitPath) -Arguments (@('-C', (Get-RepoRoot)) + $Arguments) -Quiet:$Quiet
}

# 带令牌的 git（只用于 push）：令牌通过本次进程的 http extraheader 注入，
# 不写进 .git/config、也不进 remote URL，跑完就没有了。
function Invoke-GitAuth {
  # 令牌只走环境变量（GIT_CONFIG_*），不进命令行：否则 git 报错时会把整个 -c 参数
  # 连同 Authorization 原样打印出来，令牌等于被贴进终端和日志。
  param([string[]]$Arguments, [switch]$Quiet)
  $token = Get-GitHubToken
  $basic = [Convert]::ToBase64String([System.Text.Encoding]::ASCII.GetBytes("x-access-token:$token"))
  $env:GIT_TERMINAL_PROMPT = '0'
  $env:GIT_CONFIG_COUNT = '1'
  $env:GIT_CONFIG_KEY_0 = 'http.https://github.com/.extraheader'
  $env:GIT_CONFIG_VALUE_0 = "AUTHORIZATION: basic $basic"
  try {
    return Invoke-Native -FilePath (Get-GitPath) -Arguments (@('-C', (Get-RepoRoot)) + $Arguments) -Quiet:$Quiet
  } finally {
    foreach ($n in 'GIT_TERMINAL_PROMPT', 'GIT_CONFIG_COUNT', 'GIT_CONFIG_KEY_0', 'GIT_CONFIG_VALUE_0') {
      Remove-Item "Env:$n" -ErrorAction SilentlyContinue
    }
  }
}

function Push-RepoViaApi {
  <#
    git push 走 github.com:443 在部分网络下会被 reset（api.github.com 却是通的）。
    这里用 Git Data API 把工作区原样推成一个提交：blob → tree → commit → ref。
    只在 push 失败后调用，产出的提交内容与本地工作区一致。
  #>
  param(
    [Parameter(Mandatory)][string]$Owner,
    [Parameter(Mandatory)][string]$Repo,
    [Parameter(Mandatory)][string]$Message,
    [string]$Branch = 'main'
  )
  $root = Get-RepoRoot
  $files = @(& (Get-GitPath) -C $root ls-files)
  if ($files.Count -eq 0) { throw 'git ls-files 是空的，没有可推送的文件。' }

  # 全新空仓库（0 提交）不能建 blob，GitHub 会回 409 "Git Repository is empty."；
  # 先用 Contents API 落一个文件把分支建出来，再走 blob → tree → commit。
  $head = Invoke-GitHub -Method GET -Path "/repos/$Owner/$Repo/git/ref/heads/$Branch" -Allow404
  $seeded = $null
  if (-not $head) {
    $seeded = if ($files -contains '.gitignore') { '.gitignore' } else { $files[0] }
    $seedFull = Join-Path $root ($seeded -replace '/', '\')
    $seedB64 = [Convert]::ToBase64String([System.IO.File]::ReadAllBytes($seedFull))
    $null = Invoke-GitHub -Method PUT -Path "/repos/$Owner/$Repo/contents/$seeded" -Body @{ message = $Message; content = $seedB64; branch = $Branch }
    Write-Info "空仓库：先用 Contents API 落地 $seeded，把 $Branch 建出来"
    $head = Invoke-GitHub -Method GET -Path "/repos/$Owner/$Repo/git/ref/heads/$Branch"
  }

  $entries = New-Object System.Collections.ArrayList
  $i = 0
  foreach ($rel in $files) {
    $i++
    $full = Join-Path $root ($rel -replace '/', '\')
    if (-not (Test-Path -LiteralPath $full)) { throw "工作区缺文件：$rel" }
    $b64 = [Convert]::ToBase64String([System.IO.File]::ReadAllBytes($full))
    $blob = Invoke-GitHub -Method POST -Path "/repos/$Owner/$Repo/git/blobs" -Body @{ content = $b64; encoding = 'base64' }
    $null = $entries.Add(@{ path = $rel; mode = '100644'; type = 'blob'; sha = $blob.sha })
    Write-Info ("blob {0,2}/{1}  {2}" -f $i, $files.Count, $rel)
  }

  $tree = Invoke-GitHub -Method POST -Path "/repos/$Owner/$Repo/git/trees" -Body @{ tree = @($entries) }
  $commit = Invoke-GitHub -Method POST -Path "/repos/$Owner/$Repo/git/commits" -Body @{ message = $Message; tree = $tree.sha; parents = @($head.object.sha) }
  $null = Invoke-GitHub -Method PATCH -Path "/repos/$Owner/$Repo/git/refs/heads/$Branch" -Body @{ sha = $commit.sha; force = $true }
  Write-Ok ("已用 GitHub API 推送 {0} 个文件 → {1} @ {2}" -f $files.Count, $Branch, $commit.sha.Substring(0, 7))
  return $commit.sha
}

function Get-GitHubUser { Invoke-GitHub -Method GET -Path '/user' }
function Get-GitHubLogin { (Get-GitHubUser).login }

function Git-Output {
  param([string[]]$Arguments)
  try {
    return (Invoke-Native -FilePath (Get-GitPath) -Arguments (@('-C', (Get-RepoRoot)) + $Arguments) -Quiet -SuppressStderr).Trim()
  } catch { return $null }
}

function Assert-Command([string]$Name) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) { throw "缺少命令：$Name" }
}

# ── 打包流水线（publish-npm / publish-github 共用）───────────────────────────
# 构建 → 21 项契约校验 → 16 项冒烟 → pnpm pack → 核对包内文件。
# 成功时返回 tarball 的 FileInfo，别的什么都不返回（方便 $tgz = Invoke-PackageBuild）。
function Invoke-PackageBuild {
  param([switch]$SkipChecks)

  $root = Get-RepoRoot
  $pkg = Get-Pkg
  $version = $pkg.version
  $node = Resolve-Node

  # 全部在包根目录下跑：脚本里的 scripts/xxx.mjs 是相对路径，
  # 用户从别的目录调用时必须显式指定工作目录。
  if (-not $SkipChecks) {
    Write-Step '构建（src/client.js → lib/client.js）'
    Invoke-Native -FilePath $node -Arguments @('scripts/build-client.mjs') -WorkingDirectory $root | Out-Null

    Write-Step '契约校验 + 冒烟'
    Invoke-Native -FilePath $node -Arguments @('scripts/check-client-bundle.mjs') -WorkingDirectory $root | Out-Null
    Invoke-Native -FilePath $node -Arguments @('scripts/smoke.mjs') -WorkingDirectory $root | Out-Null
  } else {
    Write-Warn2 '已跳过构建与校验（-SkipChecks）'
  }

  Write-Step '打包（pnpm pack，会跑 prepack）'
  $dist = Join-Path $root 'dist'
  if (Test-Path $dist) { Remove-Item $dist -Recurse -Force }
  New-Item -ItemType Directory -Path $dist | Out-Null
  Invoke-Pnpm -Arguments @('pack', '--pack-destination', $dist) -WorkingDirectory $root | Out-Null
  $tgz = Get-ChildItem $dist -Filter '*.tgz' | Select-Object -First 1
  if (-not $tgz) { throw 'pack 没有产出 .tgz' }
  Write-Ok "$($tgz.Name)（$([math]::Round($tgz.Length / 1024, 1)) KB）"

  Write-Step '核对包内文件'
  $rawEntries = Invoke-Native 'tar' @('-tzf', $tgz.FullName) -Quiet
  $entries = @($rawEntries -split '[\r\n]+' | ForEach-Object { $_.Trim() } | Where-Object { $_ -and -not $_.EndsWith('/') })
  $entries | ForEach-Object { Write-Info $_ }

  $must = @(
    'package/package.json'
    'package/cordis.patch.yml'
    'package/lib/index.js'
    'package/lib/client.js'
    'package/src/client.js'
    'package/icon.png'
    'package/README.md'
    'package/LICENSE'
    'package/locale/en.json'
    'package/locale/zh.json'
    'package/scripts/build-client.mjs'
    'package/scripts/check-client-bundle.mjs'
    'package/scripts/smoke.mjs'
  )
  $missing = $must | Where-Object { $entries -notcontains $_ }
  if ($missing) { throw ("包内缺少必需文件：`n  " + ($missing -join "`n  ")) }
  Write-Ok "必需文件齐全（$($must.Count) 项）"

  $leak = $entries | Where-Object { $_ -match '^package/(release/|\.git|node_modules|dist)' }
  if ($leak) { throw ("包内混进了不该发布的东西：`n  " + ($leak -join "`n  ")) }
  Write-Ok '没有混入 release/ / .git / node_modules / dist'

  # 包里那份 package.json 必须是改过元数据的版本
  $tmp = Join-Path $dist '_inspect'
  if (Test-Path $tmp) { Remove-Item $tmp -Recurse -Force }
  New-Item -ItemType Directory -Path $tmp | Out-Null
  Invoke-Native 'tar' @('-xzf', $tgz.FullName, '-C', $tmp, 'package/package.json') | Out-Null
  $inner = Read-Text (Join-Path $tmp 'package\package.json') | ConvertFrom-Json
  Remove-Item $tmp -Recurse -Force
  Write-Ok "包内 name/version = $($inner.name)@$($inner.version)"
  if ($inner.version -ne $version) { throw "包内版本 $($inner.version) 与仓库版本 $version 不一致" }
  if (-not $inner.repository) {
    Write-Warn2 '包内 package.json 没有 repository —— 先跑 release/set-metadata.ps1 -Owner <用户名>，否则 npm 页和插件条目不会被认成同一个项目。'
  } else {
    Write-Ok "包内 repository = $($inner.repository.url)"
  }

  # icon 硬上限：宿主只接受 ≤ 256 KiB
  $iconBytes = (Get-Item (Join-Path $root 'icon.png')).Length
  Write-Ok "icon.png $([math]::Round($iconBytes / 1024, 1)) KB（宿主上限 256 KiB，余量 $([math]::Round((262144 - $iconBytes) / 1024, 1)) KB）"
  if ($iconBytes -gt 262144) { throw 'icon.png 超过 256 KiB，安装时会报图片无效' }

  return $tgz
}

# 把 "<owner>" 这类占位符替成真实值；返回是否真的改过。
function Set-Placeholder {
  param([string]$Path, [hashtable]$Map)
  $text = Read-Text $Path
  $before = $text
  foreach ($k in $Map.Keys) { $text = $text.Replace("<$k>", [string]$Map[$k]) }
  if ($text -ne $before) {
    Write-Text $Path $text
    return $true
  }
  return $false
}
