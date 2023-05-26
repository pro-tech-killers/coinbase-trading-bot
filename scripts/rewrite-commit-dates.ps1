# Rewrites all commits' author+committer dates (~4y in the past) via git filter-branch.
# Puts map files under .git/rewrite-temp-data/ so paths work in Git Bash.
$ErrorActionPreference = "Stop"
$repo = (Resolve-Path (Split-Path $PSScriptRoot -Parent)).Path
$gitDir = Join-Path $repo ".git"
$dataDir = Join-Path $gitDir "rewrite-temp-data"
$utf8 = [System.Text.UTF8Encoding]::new($false)
$nl = [char]10

if (-not (Test-Path $gitDir)) { throw "Not a git repository: $repo" }
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

$st = git status --porcelain
if ($st) { throw "Repository has local changes. Commit, stash, or reset first: `n$st" }

$bash = "C:\Program Files\Git\bin\bash.exe"
if (-not (Test-Path $bash)) { $bash = "C:\Program Files (x86)\Git\bin\bash.exe" }
if (-not (Test-Path $bash)) { throw "Install Git for Windows (bash)" }

$q = $dataDir -replace "'", "'\''"
$unixDataB = (& $bash -lc "cygpath -u '$q'").Trim()
$runner = Join-Path $repo "scripts\run-rewrite-dates.sh"
& $bash $runner $unixDataB
Remove-Item -Recurse -Force $dataDir -ErrorAction SilentlyContinue
Write-Host "Removed $dataDir"
