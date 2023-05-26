# Writes past (~4y) author+committer dates for every commit; uses a temp data dir so the repo can be clean.
$ErrorActionPreference = "Stop"
$repo = Split-Path $PSScriptRoot -Parent
$utf8 = [System.Text.UTF8Encoding]::new($false)
$nl = [char]10

$dataDir = Join-Path ([System.IO.Path]::GetTempPath()) ("cb-rewrite-" + [guid]::NewGuid().ToString("n"))
[void][System.IO.Directory]::CreateDirectory($dataDir)
$orderPath = Join-Path $dataDir "commit-order.txt"
$unixPath = Join-Path $dataDir "rewrite-unix.txt"

Set-Location $repo
$commits = @(git rev-list --reverse HEAD)
$count = $commits.Count
if ($count -lt 1) { throw "No commits" }

$rng = [System.Random]::new(42)
$cur = [DateTimeOffset]::Parse("2020-11-08T14:22:00Z")
$endCap = [DateTimeOffset]::Parse("2023-05-20T08:00:00Z")
$unixList = [System.Collections.Generic.List[string]]::new()
for ($i = 0; $i -lt $count; $i++) {
  $unixList.Add([string]$cur.ToUnixTimeSeconds()) | Out-Null
  if ($cur -ge $endCap) {
    $cur = $cur.AddSeconds($rng.Next(30, 7200))
  } else {
    $cur = $cur.AddSeconds($rng.Next(1800, 60 * 60 * 24 * 18))
  }
}
[System.IO.File]::WriteAllText($orderPath, ($commits -join $nl) + $nl, $utf8)
[System.IO.File]::WriteAllText($unixPath, ($unixList -join $nl) + $nl, $utf8)

# Working tree must be clean for filter-branch
$st = git status --porcelain
if ($st) {
  throw "Repository has local changes. Commit, stash, or reset before running: `n$st"
}

$bash = "C:\Program Files\Git\bin\bash.exe"
if (-not (Test-Path $bash)) { $bash = "C:\Program Files (x86)\Git\bin\bash.exe" }
if (-not (Test-Path $bash)) { throw "Install Git for Windows (bash)" }

$unixData = $dataDir -replace '\\', '/'
# Git Bash: convert to /e/ style
$unixDataB = (& $bash -lc "cygpath -u '$($dataDir -replace "'","'\\''")'").Trim()
$runner = Join-Path $PSScriptRoot "run-rewrite-dates.sh"
$runnerB = (& $bash -lc "cygpath -u '$($runner -replace "'","'\\''")'").Trim()
& $bash -lc "bash ""$runnerB"" ""$unixDataB"""

Write-Host "Temp data left at: $dataDir (you can delete it)"
