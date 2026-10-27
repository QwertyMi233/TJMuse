$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $taskRoot
$env:APPDATA = Join-Path $taskRoot '.build-tools/eas-user'
$env:LOCALAPPDATA = Join-Path $taskRoot '.build-tools/eas-local'
$env:EAS_NO_VCS = '1'
$env:EAS_PROJECT_ROOT = $taskRoot
$taskNode = Get-Command node -ErrorAction SilentlyContinue
if ($taskNode) { $taskNodePath = $taskNode.Source }
else { $taskNodePath = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' }
$taskEasPath = Join-Path $taskRoot '.build-tools/eas/node_modules/eas-cli/bin/run'
if (-not (Test-Path -LiteralPath $taskEasPath)) { throw 'Local EAS CLI is not installed in .build-tools/eas.' }
& $taskNodePath $taskEasPath @args
exit $LASTEXITCODE
