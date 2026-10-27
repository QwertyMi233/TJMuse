param([ValidateSet('web', 'mobile', 'android', 'ios')][string]$Platform = 'web')
$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $taskRoot
$taskNode = Get-Command node -ErrorAction SilentlyContinue
if ($taskNode) { $taskNodePath = $taskNode.Source }
else { $taskNodePath = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' }
if (-not (Test-Path -LiteralPath $taskNodePath)) { throw '请安装 Node.js 24 LTS，再运行此脚本。' }
if (-not (Test-Path -LiteralPath (Join-Path $taskRoot 'node_modules\expo\bin\cli'))) { throw '请先在项目目录执行 pnpm install。' }
switch ($Platform) {
  'web' { & $taskNodePath 'node_modules/expo/bin/cli' start --web }
  'mobile' { & $taskNodePath 'node_modules/expo/bin/cli' start --go }
  'android' { & $taskNodePath 'node_modules/expo/bin/cli' run:android }
  'ios' { & $taskNodePath 'node_modules/expo/bin/cli' run:ios }
}
