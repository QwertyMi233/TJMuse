param([string]$Architecture = 'arm64-v8a')
$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $taskRoot
$taskTools = Get-Content -LiteralPath '.build-tools/toolchain.json' -Raw | ConvertFrom-Json
$env:JAVA_HOME = $taskTools.javaHome
$env:ANDROID_HOME = $taskTools.sdkRoot
$env:ANDROID_SDK_ROOT = $taskTools.sdkRoot
$env:ANDROID_USER_HOME = Join-Path $taskRoot '.build-tools/android-user'
New-Item -ItemType Directory -Force -Path $env:ANDROID_USER_HOME | Out-Null
$env:GRADLE_USER_HOME = Join-Path $taskRoot '.build-tools/gradle-home'
$env:Path = (Join-Path $taskTools.javaHome 'bin') + [IO.Path]::PathSeparator + $env:Path
$env:EXPO_NO_TELEMETRY = '1'
$env:CI = '1'
$env:JAVA_TOOL_OPTIONS = '-Djava.net.preferIPv4Stack=true'
$taskSignDir = Join-Path $taskRoot '.build-tools/signing'
New-Item -ItemType Directory -Force -Path $taskSignDir | Out-Null
$taskCredentialFile = Join-Path $taskSignDir 'credentials.json'
if (Test-Path -LiteralPath $taskCredentialFile) {
    $taskCredentials = Get-Content -LiteralPath $taskCredentialFile -Raw | ConvertFrom-Json
} else {
    $taskCredentials = @{ storeFile = Join-Path $taskSignDir 'tjmuse-release.p12'; alias = 'tjmuse'; password = [Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(24)) }
    $taskCredentials | ConvertTo-Json | Set-Content -LiteralPath $taskCredentialFile -Encoding utf8
}
$env:TJMUSE_RELEASE_STORE_FILE = $taskCredentials.storeFile
$env:TJMUSE_RELEASE_STORE_PASSWORD = $taskCredentials.password
$env:TJMUSE_RELEASE_KEY_PASSWORD = $taskCredentials.password
$env:TJMUSE_RELEASE_KEY_ALIAS = $taskCredentials.alias
if (-not (Test-Path -LiteralPath $taskCredentials.storeFile)) {
    & (Join-Path $taskTools.javaHome 'bin/keytool.exe') -genkeypair -storetype PKCS12 -keystore $taskCredentials.storeFile -storepass:env TJMUSE_RELEASE_STORE_PASSWORD -keypass:env TJMUSE_RELEASE_KEY_PASSWORD -alias $taskCredentials.alias -keyalg RSA -keysize 2048 -validity 10000 -dname 'CN=TJMuse Local Build,O=TJMuse,C=CN'
    if ($LASTEXITCODE -ne 0) { throw 'Android signing key generation failed.' }
}
if (-not (Test-Path -LiteralPath 'android/gradlew.bat')) {
    & node 'node_modules/expo/bin/cli' prebuild --no-install --platform android
    if ($LASTEXITCODE -ne 0) { throw 'Android prebuild failed.' }
}
"sdk.dir=$($taskTools.sdkRoot.Replace('\', '/'))" | Set-Content -LiteralPath 'android/local.properties' -Encoding utf8
Push-Location -LiteralPath (Join-Path $taskRoot 'android')
try {
    $taskGradle = Join-Path $taskRoot '.build-tools/gradle/gradle-9.4.1/bin/gradle.bat'
    if (-not (Test-Path -LiteralPath $taskGradle)) { $taskGradle = '.\gradlew.bat' }
    & $taskGradle ':app:assembleRelease' "-PreactNativeArchitectures=$Architecture" --no-daemon --console=plain --max-workers=4
    if ($LASTEXITCODE -ne 0) { throw 'Android release build failed.' }
} finally {
    Pop-Location
    Remove-Item Env:TJMUSE_RELEASE_STORE_PASSWORD -ErrorAction SilentlyContinue
    Remove-Item Env:TJMUSE_RELEASE_KEY_PASSWORD -ErrorAction SilentlyContinue
    Remove-Item Env:TJMUSE_RELEASE_STORE_FILE -ErrorAction SilentlyContinue
    Remove-Item Env:TJMUSE_RELEASE_KEY_ALIAS -ErrorAction SilentlyContinue
}
New-Item -ItemType Directory -Force -Path 'releases' | Out-Null
$taskApkName = "TJMuse-0.1.0-$Architecture.apk"
Copy-Item -LiteralPath 'android/app/build/outputs/apk/release/app-release.apk' -Destination (Join-Path 'releases' $taskApkName) -Force
$taskHash = (Get-FileHash -LiteralPath (Join-Path 'releases' $taskApkName) -Algorithm SHA256).Hash.ToLowerInvariant()
"$taskHash  $taskApkName" | Set-Content -LiteralPath (Join-Path 'releases' "$taskApkName.sha256") -Encoding utf8
Write-Output "APK ready: $(Join-Path $taskRoot "releases/$taskApkName")"
