# 安装包构建

本项目输出 Android Release APK 与 iPhone arm64 未签名 IPA。APKM 是拆分 APK 的容器；这里优先使用可直接安装、不依赖容器安装器的 APK。

当前已完成并校验 `releases/TJMuse-0.1.0-arm64-v8a.apk` 与 `releases/TJMuse-0.1.0-unsigned.ipa`。Android 使用本地独立发行签名；iOS 是真实 iPhoneOS ARM64、无加密、无签名的 Release 归档，需用户自签后安装，最低 iOS 16.4。

每个产物附带 SHA-256 文件；`releases/build-info.json` 记录实际构建与校验结果。

## Android · 本机 Windows

项目目录里的 `.build-tools/` 保存独立 JDK、Android SDK / NDK / CMake、Gradle 缓存和本地发行签名，不修改系统 Java 或 Android SDK 的全局配置。

Windows 必须保留 `pnpm-workspace.yaml` 的 `nodeLinker: hoisted`。`scripts/android-signing.gradle` 会为本机原生生成代码启用短路径，防止 CMake / Ninja 的 Windows 路径长度限制。

```powershell
node scripts/bootstrap-android.mjs --sdk
node node_modules/expo/bin/cli prebuild --no-install --platform android
./scripts/build-android.ps1
```

默认编译 `arm64-v8a`，适用于采用 ARM64 处理器的 Android 手机。可以用 `-Architecture 'arm64-v8a,armeabi-v7a,x86,x86_64'` 生成包含多个架构的安装包，但编译时间和体积更大。

脚本输出：`releases/TJMuse-0.1.0-arm64-v8a.apk` 和 SHA-256 文件。输出前会检查 Gradle 构建退出码。发行签名和密码保存在忽略上传的 `.build-tools/signing/`；后续版本沿用这一目录，保持升级签名一致。请单独备份，不要发送到聊天中。

如果 Gradle 官方下载站无法连接，可下载官方 9.4.1 分发包并校验 SHA-256，再解压到 `.build-tools/gradle/gradle-9.4.1/`。本地脚本会优先使用它。官方分发包 SHA-256 为 `2ab2958f2a1e51120c326cad6f385153bb11ee93b3c216c5fccebfdfbb7ec6cb`，可在 [Gradle 官方校验文件](https://services.gradle.org/distributions/gradle-9.4.1-bin.zip.sha256)核对。

## iOS · 未签名 IPA

这是 iPhone 真机 arm64 构建，供用户使用自己的自签工具重新签名。未签名文件不能直接安装。生成二进制仍需要 macOS 和 Xcode；Windows 使用 EAS 的 macOS 云构建。

### EAS 云构建

在本机登录自己的 Expo 账户并关联项目后运行：

```sh
eas login --device
eas init
eas build --platform ios --profile ios-unsigned
```

当前 Windows 工程也提供独立的 EAS 包装脚本：`./scripts/eas.ps1 login --device`、`./scripts/eas.ps1 init`、`./scripts/eas.ps1 build --platform ios --profile ios-unsigned`。它使用项目目录的 CLI 与缓存。

项目没有 Git 仓库时，可以设置 `EAS_NO_VCS=1` 与 `EAS_PROJECT_ROOT` 指向工程目录。上传文件使用 `.easignore` 排除工具、缓存、签名、环境文件和构建产物。

`ios-unsigned` 配置不需要 Apple 签名凭据；使用 `.eas/build/ios-unsigned.yml` 调用 `scripts/build-ios-unsigned.sh`，执行 Release 真机 archive 并用标准 `Payload/TJMuse.app` 结构生成 IPA。脚本验证可执行文件包含 arm64，检查 ZIP 完整性并计算 SHA-256。

EAS 使用账户可用的云构建配额，无法登录或配额不可用时不能提交任务；不会自动购买额度或升级套餐。

### 自己的 Mac

```sh
pnpm install
pnpm exec expo prebuild --platform ios --no-install
cd ios
pod install
cd ..
bash scripts/build-ios-unsigned.sh
```

输出：`releases/TJMuse-0.1.0-unsigned.ipa`。

## 构建后验证

- APK：用 Android SDK `apksigner verify --verbose --print-certs` 验证签名，用 `aapt dump badging` 核对包名 `com.tjmuse.app`、版本 `0.1.0`、SDK 与处理器架构。
- IPA：校验压缩包完整性、`Payload/TJMuse.app/Info.plist`、真实 arm64 Mach-O 程序和嵌入 JS 资源；自签和安装后再验证通知、照片权限与 Liquid Glass。

可以运行 `python scripts/verify-ipa.py releases/TJMuse-0.1.0-unsigned.ipa` 重做 IPA 校验。该脚本直接检查压缩包，不执行其中的程序。

相关文档：[EAS 自定义构建](https://docs.expo.dev/custom-builds/schema/)、[EAS 构建配置](https://docs.expo.dev/eas/json/)。
