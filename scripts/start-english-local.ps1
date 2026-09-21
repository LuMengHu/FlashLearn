$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$nextCommand = Join-Path $projectRoot 'node_modules\.bin\next.cmd'
$logDirectory = Join-Path $projectRoot '.local\logs'
New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null
Set-Location -LiteralPath $projectRoot
& $nextCommand start --hostname 127.0.0.1 *>> (Join-Path $logDirectory 'english-local.log')
