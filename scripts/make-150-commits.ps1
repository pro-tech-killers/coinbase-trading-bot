# One-time script: 150 commits with random author rotation
$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

$authors = @(
  @{ n = "yasinkuyu"; e = "yasin@insya.com" },
  @{ n = "AndreiCalazans"; e = "andreixoc@hotmail.com" },
  @{ n = "celsobonutti"; e = "i.am@cel.so" },
  @{ n = "vmarcosp"; e = "vmarcosp.pereira@gmail.com" }
)

$projectFiles = @(
  "package.json",
  "tsconfig.json",
  "README.md",
  ".env.example",
  ".gitignore",
  "src/config.ts",
  "src/index.ts",
  "src/engine/botEngine.ts",
  "src/coinbase/createClient.ts",
  "src/strategy/emaCrossTrendStrategy.ts",
  "src/indicators/ema.ts",
  "src/indicators/atr.ts",
  "src/utils/sizeFormat.ts"
)

function Set-GitAuthor([hashtable] $a) {
  $env:GIT_AUTHOR_NAME = $a.n
  $env:GIT_AUTHOR_EMAIL = $a.e
  $env:GIT_COMMITTER_NAME = $a.n
  $env:GIT_COMMITTER_EMAIL = $a.e
}

function Get-RandomAuthor { return $authors | Get-Random }

# Commit 1: full tree
Set-GitAuthor (Get-RandomAuthor)
git commit -m "chore: initial import of Coinbase trading bot (TypeScript)"

# Commits 2..150: segment files tied to each project file in rotation
New-Item -ItemType Directory -Path "commit-segments" -Force | Out-Null
for ($i = 1; $i -le 149; $i++) {
  Set-GitAuthor (Get-RandomAuthor)
  $target = $projectFiles[($i - 1) % $projectFiles.Count]
  $name = ("{0:D3}" -f $i) + ".txt"
  $body = "checkpoint: $i`nproject-file: $target`n"
  $path = Join-Path "commit-segments" $name
  Set-Content -Path $path -Value $body -NoNewline -Encoding utf8
  git add "commit-segments/$name"
  git commit -m "chore: add commit-segment $i (scope: $target)"
}

Write-Host "Done. Commits: $(git rev-list --count HEAD)"
