#Requires -Version 5.1
<#
.SYNOPSIS
    Installer for the Product-Live Data Factory AI skills and agents.

.DESCRIPTION
    Copies the skills and agents of https://github.com/Product-Live/ai-agents
    into the directories read by Claude Code, OpenAI Codex, Gemini CLI
    (and Antigravity CLI) and Mistral Vibe. It never edits platform settings.
    Files are written as UTF-8 without BOM. Compatible with PowerShell 5.1 and 7.

.EXAMPLE
    irm https://raw.githubusercontent.com/Product-Live/ai-agents/main/install.ps1 | iex

.EXAMPLE
    $s = irm https://raw.githubusercontent.com/Product-Live/ai-agents/main/install.ps1
    & ([scriptblock]::Create($s)) -All -Local
#>
[CmdletBinding(PositionalBinding = $false)]
param(
    [switch]$Claude,
    [switch]$Codex,
    [switch]$Gemini,
    [switch]$Vibe,
    [switch]$All,
    [switch]$Local,
    [string]$Ref = "",
    [switch]$Check,
    [switch]$Uninstall,
    [switch]$DryRun,
    [switch]$Help,
    # Captures unknown arguments so that they are reported as usage errors (exit 2).
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$UnknownArguments
)

$ErrorActionPreference = "Stop"

$Repo = if ($env:AI_AGENTS_REPO) { $env:AI_AGENTS_REPO } else { "Product-Live/ai-agents" }
$HomeDir = if ($env:AI_AGENTS_HOME) { $env:AI_AGENTS_HOME } else { $HOME }
$ManifestName = ".product-live-ai-agents.manifest"
$StateDirName = ".product-live-ai-agents"
$StateFileName = "install.json"
$LocalStateName = ".product-live-ai-agents.json"
$Utf8NoBom = [System.Text.UTF8Encoding]::new($false)

function Write-Info    { param($m) Write-Host "[INFO] $m"  -ForegroundColor Blue }
function Write-Ok      { param($m) Write-Host "[OK] $m"    -ForegroundColor Green }
function Write-WarnMsg { param($m) Write-Host "[WARN] $m"  -ForegroundColor Yellow }
function Write-ErrMsg  { param($m) Write-Host "[ERROR] $m" -ForegroundColor Red }

function Show-Usage {
    @"
Usage: install.ps1 [platforms] [options]

Platforms (default: auto-detect, fallback -Claude):
  -Claude      Claude Code: ~/.claude/skills and ~/.claude/agents
  -Codex       OpenAI Codex: ~/.agents/skills and ~/.codex/agents
  -Gemini      Gemini CLI and Antigravity CLI: ~/.agents/skills, ~/.gemini/agents,
               ~/.gemini/antigravity-cli/skills (global scope only)
  -Vibe        Mistral Vibe: ~/.agents/skills and ~/.vibe/agents
  -All         All four platforms

Options:
  -Local       Install into the current project (.claude/, .agents/, .codex/, .gemini/, .vibe/)
  -Ref <ref>   Branch, tag or commit to install (default: main)
  -Check       Compare the installed version with the VERSION file of main and exit
  -Uninstall   Remove what a previous run installed (manifest-tracked entries only)
  -DryRun      Print what would happen without writing anything
  -Help        Show this help

Environment:
  AI_AGENTS_SOURCE_DIR   Install from a local checkout instead of downloading
  AI_AGENTS_HOME         Override the home directory (default: `$HOME)
  AI_AGENTS_REPO         GitHub repository (default: Product-Live/ai-agents)

Exit codes: 0 success, 1 failure, 2 usage error.
"@ | Write-Host
}

# ---------------------------------------------------------------------------
# State shared by the functions
# ---------------------------------------------------------------------------
$script:WantClaude = [bool]$Claude
$script:WantCodex = [bool]$Codex
$script:WantGemini = [bool]$Gemini
$script:WantVibe = [bool]$Vibe
if ($All) { $script:WantClaude = $true; $script:WantCodex = $true; $script:WantGemini = $true; $script:WantVibe = $true }
$script:PlatformSelected = ($script:WantClaude -or $script:WantCodex -or $script:WantGemini -or $script:WantVibe)
$script:Scope = if ($Local) { "local" } else { "global" }
$script:Ref = $Ref
$script:Detection = "flags"
$script:SourceRoot = $null
$script:TempDir = $null
$script:Version = ""
$script:Remaining = @()

# Usage errors (exit 2), mirroring install.sh.
$script:UsageError = $null
if ($UnknownArguments -and @($UnknownArguments).Count -gt 0) {
    $script:UsageError = "Unknown argument(s): $($UnknownArguments -join ' ')"
} elseif ($Check -and $Uninstall) {
    $script:UsageError = "-Check and -Uninstall cannot be combined."
} elseif ($PSBoundParameters.ContainsKey("Ref") -and [string]::IsNullOrWhiteSpace($Ref)) {
    $script:UsageError = "-Ref requires a value (a branch or a tag)."
}

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

function Test-Command {
    param([string]$Name)
    return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

function Write-TextFile {
    param([string]$Path, [string]$Content)
    [System.IO.File]::WriteAllText($Path, $Content, $Utf8NoBom)
}

function Read-TextFile {
    # ReadAllText detects and strips a BOM.
    param([string]$Path)
    return [System.IO.File]::ReadAllText($Path)
}

function ConvertTo-JsonEscaped {
    # Escapes a string for a JSON string literal (backslash and double quote;
    # control characters are dropped).
    param([string]$Value)
    return (($Value -replace '[\x00-\x1F]', '').Replace('\', '\\').Replace('"', '\"'))
}

function Get-Entry {
    # Returns the item at $Path (including a dangling link), or $null.
    param([string]$Path)
    return (Get-Item -LiteralPath $Path -Force -ErrorAction SilentlyContinue)
}

function Test-ReparsePoint {
    param($Item)
    return [bool]($Item.Attributes -band [System.IO.FileAttributes]::ReparsePoint)
}

function Remove-Entry {
    # Removes one installed entry without ever following a junction or a
    # symbolic link: a link is deleted as a link, and a real directory is
    # emptied depth-first with the same rule for every child.
    param([string]$Path)
    $item = Get-Entry $Path
    if (-not $item) { return }
    if (Test-ReparsePoint $item) {
        if ($item.PSIsContainer) { [System.IO.Directory]::Delete($item.FullName) } else { [System.IO.File]::Delete($item.FullName) }
        return
    }
    if ($item.PSIsContainer) {
        foreach ($child in @(Get-ChildItem -LiteralPath $item.FullName -Force)) { Remove-Entry $child.FullName }
        Remove-Item -LiteralPath $item.FullName -Force
    } else {
        Remove-Item -LiteralPath $item.FullName -Force
    }
}

function Test-VersionGreater {
    # Returns $true when $A is a newer semantic version than $B.
    param([string]$A, [string]$B)
    $a = ($A -replace '^v', '') -replace '-.*$', ''
    $b = ($B -replace '^v', '') -replace '-.*$', ''
    $pa = $a -split '\.'
    $pb = $b -split '\.'
    for ($i = 0; $i -lt 3; $i++) {
        $x = 0; $y = 0
        if ($i -lt $pa.Count) { [int]::TryParse($pa[$i], [ref]$x) | Out-Null }
        if ($i -lt $pb.Count) { [int]::TryParse($pb[$i], [ref]$y) | Out-Null }
        if ($x -gt $y) { return $true }
        if ($x -lt $y) { return $false }
    }
    return $false
}

function Get-StateFilePath {
    if ($script:Scope -eq "local") {
        return (Join-Path (Get-Location).Path $LocalStateName)
    }
    return (Join-Path (Join-Path $HomeDir $StateDirName) $StateFileName)
}

function Read-State {
    param([string]$Path)
    if (-not (Test-Path -LiteralPath $Path)) { return $null }
    try {
        return (Read-TextFile $Path | ConvertFrom-Json)
    } catch {
        Write-WarnMsg "Could not parse the state file ${Path}: $($_.Exception.Message)"
        return $null
    }
}

function Enable-Tls12 {
    try {
        [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor [System.Net.SecurityProtocolType]::Tls12
    } catch { }
}

function Resolve-LatestVersion {
    # Returns the version in the VERSION file of the main branch, or $null.
    Enable-Tls12
    try {
        $response = Invoke-WebRequest -Uri "https://raw.githubusercontent.com/$Repo/main/VERSION" -UseBasicParsing -TimeoutSec 10
        $version = (([string]$response.Content) -split "`r?`n")[0].TrimStart([char]0xFEFF).Trim()
        if ($version -match '^[0-9]+\.[0-9]+\.[0-9]+$') { return $version }
    } catch { }
    return $null
}

# ---------------------------------------------------------------------------
# Platform detection
# ---------------------------------------------------------------------------

function Find-Platforms {
    $found = $false
    if ((Test-Command claude) -or (Test-Path -LiteralPath (Join-Path $HomeDir ".claude"))) { $script:WantClaude = $true; $found = $true }
    if ((Test-Command codex) -or (Test-Path -LiteralPath (Join-Path $HomeDir ".codex"))) { $script:WantCodex = $true; $found = $true }
    if ((Test-Command gemini) -or (Test-Command agy) -or (Test-Path -LiteralPath (Join-Path $HomeDir ".gemini"))) { $script:WantGemini = $true; $found = $true }
    if ((Test-Command vibe) -or (Test-Path -LiteralPath (Join-Path $HomeDir ".vibe"))) { $script:WantVibe = $true; $found = $true }
    if ($found) {
        $script:Detection = "auto-detected"
    } else {
        $script:Detection = "fallback"
        $script:WantClaude = $true
        Write-WarnMsg "No platform detected (no CLI on PATH, no config directory in $HomeDir); defaulting to Claude Code."
    }
}

function Set-PlatformsFromState {
    $file = Get-StateFilePath
    $state = Read-State $file
    if (-not $state -or -not $state.platforms) { return $false }
    $any = $false
    foreach ($name in @($state.platforms)) {
        switch ($name) {
            "claude" { $script:WantClaude = $true; $any = $true }
            "codex" { $script:WantCodex = $true; $any = $true }
            "gemini" { $script:WantGemini = $true; $any = $true }
            "vibe" { $script:WantVibe = $true; $any = $true }
        }
    }
    if ($any) { $script:Detection = "from the state file $file" }
    return $any
}

function Get-PlatformList {
    $list = @()
    if ($script:WantClaude) { $list += "claude" }
    if ($script:WantCodex) { $list += "codex" }
    if ($script:WantGemini) { $list += "gemini" }
    if ($script:WantVibe) { $list += "vibe" }
    return $list
}

function Get-EquivalentFlags {
    # Flags equivalent to a platform list (default: the selected platforms).
    param([string]$Style = "ps", [string[]]$Platforms = $null)
    if ($null -eq $Platforms) { $Platforms = Get-PlatformList }
    $flags = @()
    $prefix = if ($Style -eq "sh") { "--" } else { "-" }
    $names = @($Platforms) + @(if ($script:Scope -eq "local") { "local" })
    foreach ($name in $names) {
        if (-not $name) { continue }
        $flag = if ($Style -eq "sh") { $name } else { $name.Substring(0, 1).ToUpperInvariant() + $name.Substring(1) }
        $flags += "$prefix$flag"
    }
    return $flags
}

function Get-CanonicalPlatforms {
    # Keeps the known platform names of $Names, in the canonical order.
    param([string[]]$Names)
    $known = @("claude", "codex", "gemini", "vibe")
    return @($known | Where-Object { @($Names) -contains $_ })
}

function Get-RecordedPlatforms {
    # Platforms recorded in the state file of the current scope.
    $state = Read-State (Get-StateFilePath)
    if (-not $state -or -not $state.platforms) { return @() }
    return @(Get-CanonicalPlatforms @($state.platforms | ForEach-Object { [string]$_ }))
}

# ---------------------------------------------------------------------------
# Source resolution
# ---------------------------------------------------------------------------

function Resolve-Source {
    if ($env:AI_AGENTS_SOURCE_DIR) {
        $dir = $env:AI_AGENTS_SOURCE_DIR
        if (-not (Test-Path -LiteralPath $dir)) { throw "AI_AGENTS_SOURCE_DIR does not exist: $dir" }
        if (-not (Test-Path -LiteralPath (Join-Path $dir "skills"))) { throw "AI_AGENTS_SOURCE_DIR has no skills/ directory: $dir" }
        $script:SourceRoot = (Resolve-Path -LiteralPath $dir).Path
        if (-not $script:Ref) { $script:Ref = "checkout" }
        Write-Info "Installing from the local checkout $($script:SourceRoot)"
        return
    }

    if (-not (Get-Command Expand-Archive -ErrorAction SilentlyContinue)) {
        throw "Expand-Archive is required (PowerShell 5.1 or later), or set AI_AGENTS_SOURCE_DIR."
    }

    if (-not $script:Ref) { $script:Ref = "main" }

    $script:TempDir = Join-Path ([System.IO.Path]::GetTempPath()) ("product-live-ai-agents-" + [System.Guid]::NewGuid().ToString("N"))
    New-Item -ItemType Directory -Path $script:TempDir -Force | Out-Null
    $zipPath = Join-Path $script:TempDir "source.zip"
    $extractDir = Join-Path $script:TempDir "src"

    $archiveUrl = "https://github.com/$Repo/archive/$($script:Ref).zip"
    Write-Info "Downloading $Repo@$($script:Ref) ..."
    Enable-Tls12
    try {
        Invoke-WebRequest -Uri $archiveUrl -OutFile $zipPath -UseBasicParsing -TimeoutSec 120
    } catch {
        throw "Could not download $archiveUrl (check the ref, your network and proxy settings): $($_.Exception.Message)"
    }
    Expand-Archive -LiteralPath $zipPath -DestinationPath $extractDir -Force

    # Archives extract to a single top-level directory (<repo>-<ref>).
    $tops = @(Get-ChildItem -LiteralPath $extractDir -Directory)
    if ($tops.Count -eq 0) { throw "The archive is empty." }
    if ($tops.Count -gt 1) { throw "The archive contains more than one top-level directory." }
    $script:SourceRoot = $tops[0].FullName
    if (-not (Test-Path -LiteralPath (Join-Path $script:SourceRoot "skills"))) {
        throw "Invalid archive: no skills/ directory in $($tops[0].Name)."
    }
}

function Read-SourceVersion {
    $versionFile = Join-Path $script:SourceRoot "VERSION"
    if (Test-Path -LiteralPath $versionFile) {
        $first = (Read-TextFile $versionFile) -split "`r?`n" | Select-Object -First 1
        $script:Version = ($first -replace '\s', '')
    }
    if (-not $script:Version) {
        $script:Version = "0.0.0"
        Write-WarnMsg "No VERSION file in the source tree; recording version 0.0.0."
    } elseif ($script:Version -notmatch '^[0-9]+\.[0-9]+\.[0-9]+$') {
        $shown = if ($script:Version.Length -gt 40) { $script:Version.Substring(0, 40) } else { $script:Version }
        Write-WarnMsg "Invalid VERSION in the source tree ($shown); recording version 0.0.0."
        $script:Version = "0.0.0"
    }
}

function Get-ClaudeAgentsSource {
    # Claude Code agents.
    return (Join-Path $script:SourceRoot "platforms/claude/agents")
}

# ---------------------------------------------------------------------------
# Sync: copy top-level entries of a source directory into a target directory
# and track them in a manifest. Kind = dirs | md | toml
# ---------------------------------------------------------------------------

function Sync-Directory {
    param([string]$SourceDir, [string]$TargetDir, [string]$Label, [string]$Kind)

    $manifest = Join-Path $TargetDir $ManifestName
    if (-not (Test-Path -LiteralPath $SourceDir)) {
        Write-WarnMsg "${Label}: source directory $SourceDir is missing, skipped."
        return
    }

    $names = New-Object System.Collections.Generic.List[string]
    foreach ($item in (Get-ChildItem -LiteralPath $SourceDir -Force)) {
        if ($item.Name -like ".*") { continue }
        if ($Kind -eq "dirs") {
            if (-not $item.PSIsContainer) { continue }
        } else {
            if ($item.PSIsContainer) { continue }
            if ($item.Extension -ne ".$Kind") { continue }
        }
        $names.Add($item.Name)
        # First install in this directory: an entry we do not track is overwritten.
        if (-not (Test-Path -LiteralPath $manifest) -and (Get-Entry (Join-Path $TargetDir $item.Name))) {
            Write-WarnMsg "${Label}: $(Join-Path $TargetDir $item.Name) already exists and is not tracked by this installer; it will be overwritten."
        }
    }

    if ($DryRun) {
        Write-Info "(dry-run) ${Label}: would install $($names.Count) item(s) into $TargetDir"
        foreach ($n in $names) { Write-Host "    $n" }
        return
    }

    New-Item -ItemType Directory -Path $TargetDir -Force | Out-Null

    # Remove entries we installed previously that no longer exist in the source.
    if (Test-Path -LiteralPath $manifest) {
        foreach ($old in [System.IO.File]::ReadAllLines($manifest)) {
            $old = $old.Trim()
            if ([string]::IsNullOrWhiteSpace($old)) { continue }
            if ($old -match '[\\/]' -or $old -eq "." -or $old -eq "..") { continue }
            $dstItem = Join-Path $TargetDir $old
            if ((-not $names.Contains($old)) -and (Get-Entry $dstItem)) {
                Remove-Entry $dstItem
                Write-WarnMsg "${Label}: removed obsolete entry $old"
            }
        }
    }

    $count = 0
    try {
        foreach ($name in $names) {
            $srcItem = Join-Path $SourceDir $name
            $dstItem = Join-Path $TargetDir $name
            Remove-Entry $dstItem
            Copy-Item -LiteralPath $srcItem -Destination $dstItem -Recurse -Force
            $count++
        }
    } catch {
        # Record every shipped entry present in the target (complete or partial)
        # so that -Uninstall can clean up after a failed copy.
        $present = @()
        foreach ($name in $names) {
            if (Test-Path -LiteralPath (Join-Path $TargetDir $name)) { $present += $name }
        }
        $partial = if ($present.Count -gt 0) { ($present -join "`n") + "`n" } else { "" }
        try { Write-TextFile -Path $manifest -Content $partial } catch { }
        throw "${Label}: copy failed after $count item(s) in ${TargetDir}: $($_.Exception.Message)"
    }

    $content = if ($names.Count -gt 0) { ($names -join "`n") + "`n" } else { "" }
    Write-TextFile -Path $manifest -Content $content
    Write-Ok "${Label}: $count item(s) installed into $TargetDir"
}

function Get-LongestRelativePath {
    # Length of the longest path of a file or directory under $Root, relative to $Root.
    param([string]$Root)
    if (-not (Test-Path -LiteralPath $Root)) { return 0 }
    $rootFull = (Resolve-Path -LiteralPath $Root).Path.TrimEnd('\', '/')
    $max = 0
    foreach ($item in (Get-ChildItem -LiteralPath $rootFull -Recurse -Force -ErrorAction SilentlyContinue)) {
        $len = $item.FullName.Length - $rootFull.Length - 1
        if ($len -gt $max) { $max = $len }
    }
    return $max
}

function Test-LongPathSupport {
    # Windows PowerShell 5.1 (Desktop edition) is limited to 260-character paths
    # unless Windows long paths are enabled. PowerShell 7 is not limited.
    if ($PSVersionTable.PSEdition -ne "Desktop") { return $true }
    try {
        $value = Get-ItemPropertyValue -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name "LongPathsEnabled" -ErrorAction Stop
        return ([int]$value -eq 1)
    } catch {
        return $false
    }
}

function Assert-PathLengths {
    # Fails before copying anything when a destination path would exceed the
    # Windows PowerShell 5.1 limit, instead of leaving a partial tree behind.
    $t = Get-Targets
    $skillTargets = @()
    if ($script:WantClaude) { $skillTargets += (Join-Path $t.Claude "skills") }
    if ($script:WantCodex -or $script:WantGemini -or $script:WantVibe) { $skillTargets += (Join-Path $t.Agents "skills") }
    if ($script:WantGemini -and $script:Scope -eq "global") { $skillTargets += (Join-Path (Join-Path $t.Gemini "antigravity-cli") "skills") }
    if ($skillTargets.Count -eq 0) { return }

    $relative = Get-LongestRelativePath (Join-Path $script:SourceRoot "skills")
    $longestTarget = ($skillTargets | Sort-Object { $_.Length } -Descending | Select-Object -First 1)
    $longest = $longestTarget.Length + 1 + $relative
    if ($longest -le 259) { return }
    if (Test-LongPathSupport) { return }

    $message = "The longest destination path would be $longest characters (under $longestTarget), above the 260-character limit of Windows PowerShell 5.1. " +
        "Nothing was copied. Run the installer with PowerShell 7 (pwsh), enable Windows long paths (LongPathsEnabled), or install into a shorter folder (-Local from a project with a short path)."
    if ($DryRun) {
        Write-WarnMsg $message
        return
    }
    throw $message
}

function Remove-EmptyDirectory {
    # Removes a directory only when it is empty; never fails.
    param([string]$Path)
    if (-not (Test-Path -LiteralPath $Path -PathType Container)) { return }
    if (Get-ChildItem -LiteralPath $Path -Force) { return }
    try {
        Remove-Item -LiteralPath $Path -Force -ErrorAction Stop
        Write-Info "Removed the empty directory $Path"
    } catch { }
}

function Invoke-PruneParents {
    # After an uninstall, removes the parent directories the installer creates
    # when they ended up empty: .agents and .gemini/antigravity-cli (both scopes),
    # and in project scope also .claude, .codex, .gemini and .vibe. Global
    # assistant directories such as ~/.claude are never removed.
    if ($DryRun) { return }
    $t = Get-Targets
    Remove-EmptyDirectory $t.Agents
    Remove-EmptyDirectory (Join-Path $t.Gemini "antigravity-cli")
    if ($script:Scope -eq "local") {
        Remove-EmptyDirectory $t.Claude
        Remove-EmptyDirectory $t.Codex
        Remove-EmptyDirectory $t.Gemini
        Remove-EmptyDirectory $t.Vibe
    }
}

function Remove-Installed {
    param([string]$TargetDir, [string]$Label)

    $manifest = Join-Path $TargetDir $ManifestName
    if (-not (Test-Path -LiteralPath $manifest)) {
        Write-Info "${Label}: nothing to remove in $TargetDir"
        return
    }

    $lines = [System.IO.File]::ReadAllLines($manifest)
    if ($DryRun) {
        Write-Info "(dry-run) ${Label}: would remove the entries listed in $manifest"
        foreach ($n in $lines) { if ($n.Trim()) { Write-Host "    $($n.Trim())" } }
        return
    }

    $count = 0
    foreach ($name in $lines) {
        $name = $name.Trim()
        if ([string]::IsNullOrWhiteSpace($name)) { continue }
        if ($name -match '[\\/]' -or $name -eq "." -or $name -eq "..") { continue }
        $dstItem = Join-Path $TargetDir $name
        if (Get-Entry $dstItem) {
            Remove-Entry $dstItem
            $count++
        }
    }
    Remove-Item -LiteralPath $manifest -Force
    if (-not (Get-ChildItem -LiteralPath $TargetDir -Force)) {
        Remove-Item -LiteralPath $TargetDir -Force -ErrorAction SilentlyContinue
    }
    Write-Ok "${Label}: removed $count item(s) from $TargetDir"
}

# ---------------------------------------------------------------------------
# Targets
# ---------------------------------------------------------------------------

function Get-Targets {
    if ($script:Scope -eq "local") {
        $cwd = (Get-Location).Path
        return @{
            Claude = Join-Path $cwd ".claude"
            Agents = Join-Path $cwd ".agents"
            Codex = Join-Path $cwd ".codex"
            Gemini = Join-Path $cwd ".gemini"
            Vibe = Join-Path $cwd ".vibe"
        }
    }
    return @{
        Claude = Join-Path $HomeDir ".claude"
        Agents = Join-Path $HomeDir ".agents"
        Codex = Join-Path $HomeDir ".codex"
        Gemini = Join-Path $HomeDir ".gemini"
        Vibe = Join-Path $HomeDir ".vibe"
    }
}

function Invoke-Apply {
    param([string]$Op)
    $t = Get-Targets
    $install = ($Op -eq "install")
    $skillsSrc = if ($install) { Join-Path $script:SourceRoot "skills" } else { $null }

    if ($script:WantClaude) {
        if ($install) {
            Sync-Directory $skillsSrc (Join-Path $t.Claude "skills") "Claude Code skills" "dirs"
            Sync-Directory (Get-ClaudeAgentsSource) (Join-Path $t.Claude "agents") "Claude Code agents" "md"
        } else {
            Remove-Installed (Join-Path $t.Claude "skills") "Claude Code skills"
            Remove-Installed (Join-Path $t.Claude "agents") "Claude Code agents"
        }
    }

    if ($script:WantCodex -or $script:WantGemini -or $script:WantVibe) {
        if ($install) {
            Sync-Directory $skillsSrc (Join-Path $t.Agents "skills") "Shared skills (Codex, Gemini CLI, Vibe)" "dirs"
        } else {
            # Keep the shared skills while another installed platform still reads them.
            $users = @($script:Remaining | Where-Object { @("codex", "gemini", "vibe") -contains $_ })
            if ($users.Count -gt 0) {
                Write-Info "Shared skills (Codex, Gemini CLI, Vibe): kept in $(Join-Path $t.Agents 'skills'), still used by: $($users -join ' ')"
            } else {
                Remove-Installed (Join-Path $t.Agents "skills") "Shared skills (Codex, Gemini CLI, Vibe)"
            }
        }
    }

    if ($script:WantCodex) {
        if ($install) {
            Sync-Directory (Join-Path $script:SourceRoot "platforms/codex/agents") (Join-Path $t.Codex "agents") "Codex agents" "toml"
        } else {
            Remove-Installed (Join-Path $t.Codex "agents") "Codex agents"
        }
    }

    if ($script:WantGemini) {
        $antigravity = Join-Path (Join-Path $t.Gemini "antigravity-cli") "skills"
        if ($install) {
            Sync-Directory (Join-Path $script:SourceRoot "platforms/gemini/agents") (Join-Path $t.Gemini "agents") "Gemini CLI agents" "md"
            if ($script:Scope -eq "global") {
                Sync-Directory $skillsSrc $antigravity "Antigravity CLI skills" "dirs"
            }
        } else {
            Remove-Installed (Join-Path $t.Gemini "agents") "Gemini CLI agents"
            if ($script:Scope -eq "global") {
                Remove-Installed $antigravity "Antigravity CLI skills"
            }
        }
    }

    if ($script:WantVibe) {
        if ($install) {
            Sync-Directory (Join-Path $script:SourceRoot "platforms/vibe/agents") (Join-Path $t.Vibe "agents") "Vibe agents" "toml"
        } else {
            Remove-Installed (Join-Path $t.Vibe "agents") "Vibe agents"
        }
    }
}

function ConvertTo-JsonStringList {
    param([string[]]$Values)
    $parts = @()
    foreach ($v in $Values) {
        $escaped = $v.Replace('\', '\\').Replace('"', '\"')
        $parts += "`"$escaped`""
    }
    return ($parts -join ", ")
}

function Write-State {
    # Without -Platforms (install): records the selected platforms merged with
    # the platforms already recorded for this scope, with the version and ref
    # of this run. With -Platforms (partial uninstall): records exactly the
    # given platforms with the given version, ref and installation date.
    param([string[]]$Platforms = $null, [string]$Version = $script:Version, [string]$Ref = $script:Ref, [string]$InstalledAt = "")
    $file = Get-StateFilePath
    if ($DryRun) {
        Write-Info "(dry-run) would write the state file $file"
        return
    }
    if ($null -eq $Platforms) {
        $Platforms = @(Get-CanonicalPlatforms (@(Get-RecordedPlatforms) + @(Get-PlatformList)))
    }
    $dir = Split-Path -Parent $file
    New-Item -ItemType Directory -Path $dir -Force | Out-Null
    $platformsJson = ConvertTo-JsonStringList $Platforms
    $flags = ConvertTo-JsonStringList (Get-EquivalentFlags -Style "sh" -Platforms $Platforms)
    $now = if ($InstalledAt) { $InstalledAt } else { [DateTime]::UtcNow.ToString("yyyy-MM-ddTHH:mm:ssZ") }
    $json = @"
{
  "version": "$(ConvertTo-JsonEscaped $Version)",
  "ref": "$(ConvertTo-JsonEscaped $Ref)",
  "platforms": [$platformsJson],
  "scope": "$($script:Scope)",
  "installedAt": "$(ConvertTo-JsonEscaped $now)",
  "flags": [$flags]
}
"@
    Write-TextFile -Path $file -Content ($json -replace "`r`n", "`n")
    Write-Ok "State written to $file"
}

function Remove-State {
    $file = Get-StateFilePath
    if ($DryRun) {
        Write-Info "(dry-run) would remove the state file $file"
        return
    }
    if (Test-Path -LiteralPath $file) {
        Remove-Item -LiteralPath $file -Force
        if ($script:Scope -eq "global") {
            $stateDir = Join-Path $HomeDir $StateDirName
            $cache = Join-Path $stateDir "latest.json"
            if (Test-Path -LiteralPath $cache) { Remove-Item -LiteralPath $cache -Force }
            if ((Test-Path -LiteralPath $stateDir) -and -not (Get-ChildItem -LiteralPath $stateDir -Force)) {
                Remove-Item -LiteralPath $stateDir -Force -ErrorAction SilentlyContinue
            }
        }
        Write-Ok "State file removed: $file"
    }
}

function Show-Hints {
    Write-Host ""
    Write-Info "Platforms: $((Get-PlatformList) -join ' ') ($($script:Detection))"
    Write-Info "Equivalent command: install.ps1 $((Get-EquivalentFlags) -join ' ')"
    if ($script:WantClaude) { Write-Info "Claude Code: start a new session or run /reload-skills to load the skills." }
    if ($script:WantCodex) { Write-Info "Codex: start a new session to load the skills and agents." }
    if ($script:WantGemini) { Write-Info "Gemini CLI: run /skills reload (Antigravity CLI: /skills reload as well)." }
    if ($script:WantVibe) { Write-Info "Mistral Vibe: run /reload if the skills do not appear." }
    if ($script:Scope -eq "local") {
        Write-Info "Project-level skills and agents are loaded only when the folder is trusted (Codex, Gemini CLI, Vibe)."
    }
}

# ---------------------------------------------------------------------------
# Modes
# ---------------------------------------------------------------------------

function Invoke-Check {
    $localFile = Join-Path (Get-Location).Path $LocalStateName
    $globalFile = Join-Path (Join-Path $HomeDir $StateDirName) $StateFileName
    $file = if (Test-Path -LiteralPath $localFile) { $localFile } else { $globalFile }
    $state = Read-State $file
    $installed = if ($state) { [string]$state.version } else { "" }
    if (-not $installed) {
        Write-WarnMsg "No installation state found (looked for $localFile and $globalFile)."
        Write-Info "Install the skills with this script first (see -Help)."
    } else {
        Write-Info "Installed version: $installed (state file: $file)"
    }
    $latest = Resolve-LatestVersion
    if (-not $latest) {
        Write-WarnMsg "Could not read the VERSION file of $Repo on main (network or proxy)."
        return
    }
    Write-Info "Latest version: $latest"
    if ($installed -and (Test-VersionGreater $latest $installed)) {
        Write-WarnMsg "An update is available: $installed -> $latest. Rerun this installer to update."
    } elseif ($installed) {
        Write-Ok "The installed version is up to date."
    }
}

function Invoke-Uninstall {
    if (-not $script:PlatformSelected) {
        if (-not (Set-PlatformsFromState)) { Find-Platforms }
    }
    # Platforms recorded in the state file that this run does not uninstall.
    $state = Read-State (Get-StateFilePath)
    $selected = @(Get-PlatformList)
    $script:Remaining = @(Get-RecordedPlatforms | Where-Object { $selected -notcontains $_ })
    Write-Info "Uninstalling ($($script:Scope) scope) for: $($selected -join ' ')"
    Invoke-Apply "remove"
    Invoke-PruneParents
    if ($script:Remaining.Count -gt 0) {
        Write-Info "Still installed ($($script:Scope) scope): $($script:Remaining -join ' ')"
        # PowerShell 7 turns ISO dates into DateTime values when parsing JSON.
        $installedAt = $state.installedAt
        if ($installedAt -is [DateTime]) { $installedAt = $installedAt.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ") }
        Write-State -Platforms $script:Remaining -Version ([string]$state.version) -Ref ([string]$state.ref) -InstalledAt ([string]$installedAt)
    } else {
        Remove-State
    }
    Write-Host ""
    Write-Ok "Uninstall complete."
}

function Invoke-Install {
    if (-not $script:PlatformSelected) { Find-Platforms }
    if ($script:Scope -eq "local" -and -not (Test-Path -LiteralPath (Join-Path (Get-Location).Path ".git"))) {
        Write-WarnMsg "No .git in the current directory: -Local installs into the current directory, run it from the project root."
    }
    Resolve-Source
    Read-SourceVersion
    Write-Info "Installing version $($script:Version) ($($script:Scope) scope) for: $((Get-PlatformList) -join ' ')"
    Assert-PathLengths
    try {
        Invoke-Apply "install"
    } catch {
        # Record the state so that -Uninstall finds the platforms of the partial install.
        if (-not $DryRun) { try { Write-State } catch { } }
        throw "$($_.Exception.Message) Run the installer again with -Uninstall to remove the partial install."
    }
    Write-State
    Write-Host ""
    if ($DryRun) {
        Write-Ok "Dry run complete: nothing was written."
    } else {
        Write-Ok "Installation complete (version $($script:Version), ref $($script:Ref), $($script:Scope) scope)."
    }
    Show-Hints
}

# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

$exitCode = 0
try {
    if ($script:UsageError) {
        Write-ErrMsg $script:UsageError
        Show-Usage
        $exitCode = 2
    } elseif ($Help) {
        Show-Usage
    } elseif ($Check) {
        Invoke-Check
    } elseif ($Uninstall) {
        Invoke-Uninstall
    } else {
        Invoke-Install
    }
} catch {
    Write-ErrMsg $_.Exception.Message
    $exitCode = 1
} finally {
    if ($script:TempDir -and (Test-Path -LiteralPath $script:TempDir)) {
        Remove-Item -LiteralPath $script:TempDir -Recurse -Force -ErrorAction SilentlyContinue
    }
}

if ($exitCode -ne 0) {
    if ($PSCommandPath) { exit $exitCode }
    if ($exitCode -eq 2) { throw "Usage error (see the [ERROR] line above)." }
    throw "Installation failed (see the [ERROR] line above)."
}
